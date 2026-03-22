// ---------------------------------------------------------------------------
// E8-S4-T2: Queue-backed notification delivery service
// E8-S4-T3: Provider adapter implementations
// ---------------------------------------------------------------------------

import type {
	DeliveryChannel,
	NotificationEvent,
	NotificationTemplate,
	NotificationDeliveryRecord,
	NotificationDeliveryJob,
	NotificationRetryPolicy,
	DeliveryStatus,
	FailureCategory,
	DeliveryAdapter,
	DeliveryAdapterResult,
	InAppNotification,
} from "@platform/types";
import {
	renderTemplate,
	computeBackoffDelay,
	buildNotificationIdempotencyKey,
	DEFAULT_NOTIFICATION_RETRY_POLICY,
	isTerminalDeliveryStatus,
	deliveryChannels,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Template repository (in-memory for now; Prisma integration deferred)
// ---------------------------------------------------------------------------

/**
 * Resolves the best-matching template for a given event type, channel,
 * and tenant. Tenant-specific templates override shared defaults.
 */
export function resolveTemplate(
	templates: readonly NotificationTemplate[],
	eventType: string,
	channel: DeliveryChannel,
	tenantId: string,
): NotificationTemplate | undefined {
	// Prefer tenant-specific template
	const tenantTemplate = templates.find(
		(t) =>
			t.eventType === eventType &&
			t.channel === channel &&
			t.tenantId === tenantId &&
			t.isActive,
	);
	if (tenantTemplate) return tenantTemplate;

	// Fall back to shared default (tenantId = null)
	return templates.find(
		(t) =>
			t.eventType === eventType &&
			t.channel === channel &&
			t.tenantId === null &&
			t.isActive,
	);
}

// ---------------------------------------------------------------------------
// Delivery record store (in-memory; Prisma integration deferred)
// ---------------------------------------------------------------------------

export class NotificationDeliveryStore {
	private readonly deliveries = new Map<string, NotificationDeliveryRecord>();
	private readonly idempotencyIndex = new Map<string, string>();
	private readonly inAppNotifications = new Map<string, InAppNotification>();

	/** Store or update a delivery record. */
	upsert(record: NotificationDeliveryRecord): void {
		this.deliveries.set(record.id, record);
		this.idempotencyIndex.set(record.idempotencyKey, record.id);
	}

	/** Find a delivery record by its idempotency key. */
	findByIdempotencyKey(key: string): NotificationDeliveryRecord | undefined {
		const id = this.idempotencyIndex.get(key);
		if (!id) return undefined;
		return this.deliveries.get(id);
	}

	/** Find a delivery record by ID. */
	findById(id: string): NotificationDeliveryRecord | undefined {
		return this.deliveries.get(id);
	}

	/** List delivery records for a tenant, optionally filtered. */
	listByTenant(
		tenantId: string,
		filters?: {
			eventType?: string;
			channel?: DeliveryChannel;
			status?: DeliveryStatus;
		},
		limit = 50,
		offset = 0,
	): { records: NotificationDeliveryRecord[]; total: number } {
		let records = Array.from(this.deliveries.values()).filter(
			(r) => r.tenantId === tenantId,
		);
		if (filters?.eventType) {
			records = records.filter((r) => r.eventType === filters.eventType);
		}
		if (filters?.channel) {
			records = records.filter((r) => r.channel === filters.channel);
		}
		if (filters?.status) {
			records = records.filter((r) => r.status === filters.status);
		}
		// Sort by createdAt descending
		records.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		const total = records.length;
		return { records: records.slice(offset, offset + limit), total };
	}

	/** Store an in-app notification. */
	storeInApp(notification: InAppNotification): void {
		this.inAppNotifications.set(notification.id, notification);
	}

	/** List in-app notifications for a customer in a tenant. */
	listInApp(
		tenantId: string,
		recipientId: string,
		unreadOnly = false,
		limit = 50,
		offset = 0,
	): { notifications: InAppNotification[]; unreadCount: number; total: number } {
		let notifications = Array.from(this.inAppNotifications.values()).filter(
			(n) => n.tenantId === tenantId && n.recipientId === recipientId,
		);
		const unreadCount = notifications.filter((n) => !n.isRead).length;
		if (unreadOnly) {
			notifications = notifications.filter((n) => !n.isRead);
		}
		// Sort by createdAt descending
		notifications.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		const total = notifications.length;
		return {
			notifications: notifications.slice(offset, offset + limit),
			unreadCount,
			total,
		};
	}

	/** Mark an in-app notification as read. Returns true if found and updated. */
	markAsRead(
		notificationId: string,
		tenantId: string,
		recipientId: string,
	): boolean {
		const notification = this.inAppNotifications.get(notificationId);
		if (
			!notification ||
			notification.tenantId !== tenantId ||
			notification.recipientId !== recipientId
		) {
			return false;
		}
		if (notification.isRead) return true; // already read
		this.inAppNotifications.set(notificationId, {
			...notification,
			isRead: true,
			readAt: new Date().toISOString(),
		});
		return true;
	}

	/** Get platform-wide delivery statistics. */
	getAggregateMetrics(): {
		totalDeliveries: number;
		deliveredCount: number;
		failedCount: number;
		bouncedCount: number;
		pendingCount: number;
		byChannel: Record<string, { total: number; delivered: number; failed: number }>;
		byEventType: Record<string, { total: number; delivered: number; failed: number }>;
	} {
		const records = Array.from(this.deliveries.values());
		const result = {
			totalDeliveries: records.length,
			deliveredCount: 0,
			failedCount: 0,
			bouncedCount: 0,
			pendingCount: 0,
			byChannel: {} as Record<string, { total: number; delivered: number; failed: number }>,
			byEventType: {} as Record<string, { total: number; delivered: number; failed: number }>,
		};

		for (const r of records) {
			if (r.status === "delivered") result.deliveredCount++;
			else if (r.status === "failed" || r.status === "dead-letter")
				result.failedCount++;
			else if (r.status === "bounced") result.bouncedCount++;
			else result.pendingCount++;

			// By channel
			if (!result.byChannel[r.channel]) {
				result.byChannel[r.channel] = { total: 0, delivered: 0, failed: 0 };
			}
			result.byChannel[r.channel].total++;
			if (r.status === "delivered") result.byChannel[r.channel].delivered++;
			if (r.status === "failed" || r.status === "dead-letter" || r.status === "bounced")
				result.byChannel[r.channel].failed++;

			// By event type
			const eventTypeKey = r.eventType;
			if (!result.byEventType[eventTypeKey]) {
				result.byEventType[eventTypeKey] = { total: 0, delivered: 0, failed: 0 };
			}
			result.byEventType[eventTypeKey].total++;
			if (r.status === "delivered") result.byEventType[eventTypeKey].delivered++;
			if (r.status === "failed" || r.status === "dead-letter" || r.status === "bounced")
				result.byEventType[eventTypeKey].failed++;
		}

		return result;
	}

	/** Clear all records (for testing). */
	clear(): void {
		this.deliveries.clear();
		this.idempotencyIndex.clear();
		this.inAppNotifications.clear();
	}
}

// ---------------------------------------------------------------------------
// Delivery queue (in-memory mock; real BullMQ integration in worker)
// ---------------------------------------------------------------------------

export type QueuedJob = {
	id: string;
	data: NotificationDeliveryJob;
	delayMs?: number;
};

/**
 * Queue interface for notification delivery jobs.
 * In production, this wraps BullMQ. For testing, use the in-memory mock.
 */
export interface NotificationQueue {
	enqueue(job: NotificationDeliveryJob, delayMs?: number): Promise<string>;
	getQueuedJobs(): QueuedJob[];
}

/**
 * In-memory queue implementation for testing and local development.
 * In production, replaced by BullMQ queue adapter.
 */
export class InMemoryNotificationQueue implements NotificationQueue {
	private readonly jobs: QueuedJob[] = [];
	private nextId = 1;

	async enqueue(
		data: NotificationDeliveryJob,
		delayMs?: number,
	): Promise<string> {
		const id = `job-${this.nextId++}`;
		this.jobs.push({ id, data, delayMs });
		return id;
	}

	getQueuedJobs(): QueuedJob[] {
		return [...this.jobs];
	}

	clear(): void {
		this.jobs.length = 0;
		this.nextId = 1;
	}
}

// ---------------------------------------------------------------------------
// E8-S4-T3: Provider adapters — stub implementations
// ---------------------------------------------------------------------------

/**
 * Maps provider-specific error patterns to a common failure category.
 * Used by all adapters to normalize error handling.
 */
export function mapProviderErrorToFailureCategory(
	errorMessage: string,
): FailureCategory {
	const lower = errorMessage.toLowerCase();
	if (
		lower.includes("timeout") ||
		lower.includes("connection refused") ||
		lower.includes("econnreset") ||
		lower.includes("service unavailable") ||
		lower.includes("503") ||
		lower.includes("502")
	) {
		return "transient";
	}
	if (
		lower.includes("rate limit") ||
		lower.includes("too many requests") ||
		lower.includes("429")
	) {
		return "rate-limited";
	}
	if (
		lower.includes("invalid") &&
		(lower.includes("email") ||
			lower.includes("phone") ||
			lower.includes("recipient") ||
			lower.includes("address"))
	) {
		return "invalid-recipient";
	}
	if (
		lower.includes("content") ||
		lower.includes("spam") ||
		lower.includes("blocked")
	) {
		return "content-rejected";
	}
	if (
		lower.includes("auth") ||
		lower.includes("api key") ||
		lower.includes("credential") ||
		lower.includes("forbidden") ||
		lower.includes("401") ||
		lower.includes("403")
	) {
		return "configuration-error";
	}
	if (
		lower.includes("provider") ||
		lower.includes("internal server") ||
		lower.includes("500")
	) {
		return "provider-error";
	}
	return "unknown";
}

/**
 * Determines if a failure is transient and thus retryable.
 */
export function isTransientFailure(category: FailureCategory): boolean {
	return category === "transient" || category === "rate-limited";
}

/**
 * Email delivery adapter stub.
 * Real integration (e.g., SendGrid, SES) is deferred.
 */
export class EmailDeliveryAdapter implements DeliveryAdapter {
	readonly channel: DeliveryChannel = "email";
	readonly providerName = "stub-email";

	async send(job: NotificationDeliveryJob): Promise<DeliveryAdapterResult> {
		// Stub: validate recipient address format
		if (!job.recipientAddress || !job.recipientAddress.includes("@")) {
			return {
				success: false,
				failureCategory: "invalid-recipient",
				errorMessage: "Invalid email address format.",
			};
		}
		// Stub: simulate successful delivery
		return {
			success: true,
			providerMessageId: `stub-email-${Date.now()}`,
		};
	}

	async checkStatus(): Promise<{ available: boolean; providerName: string; error?: string }> {
		return { available: true, providerName: this.providerName };
	}
}

/**
 * SMS delivery adapter stub.
 * Real integration (e.g., Twilio, Vonage) is deferred.
 */
export class SmsDeliveryAdapter implements DeliveryAdapter {
	readonly channel: DeliveryChannel = "sms";
	readonly providerName = "stub-sms";

	async send(job: NotificationDeliveryJob): Promise<DeliveryAdapterResult> {
		// Stub: validate phone number presence
		if (!job.recipientAddress || job.recipientAddress.length < 10) {
			return {
				success: false,
				failureCategory: "invalid-recipient",
				errorMessage: "Invalid phone number.",
			};
		}
		// Stub: simulate successful delivery
		return {
			success: true,
			providerMessageId: `stub-sms-${Date.now()}`,
		};
	}

	async checkStatus(): Promise<{ available: boolean; providerName: string; error?: string }> {
		return { available: true, providerName: this.providerName };
	}
}

/**
 * In-app delivery adapter.
 * Persists notification to the in-app notification store.
 * This is a real implementation — not a stub.
 */
export class InAppDeliveryAdapter implements DeliveryAdapter {
	readonly channel: DeliveryChannel = "in-app";
	readonly providerName = "internal";

	constructor(private readonly store: NotificationDeliveryStore) {}

	async send(job: NotificationDeliveryJob): Promise<DeliveryAdapterResult> {
		const notification: InAppNotification = {
			id: `inapp-${job.deliveryId}`,
			tenantId: job.tenantId,
			recipientId: job.recipientAddress,
			eventType: job.eventType,
			title: job.renderedSubject,
			body: job.renderedBody,
			isRead: false,
			createdAt: new Date().toISOString(),
		};
		this.store.storeInApp(notification);
		return {
			success: true,
			providerMessageId: notification.id,
		};
	}

	async checkStatus(): Promise<{ available: boolean; providerName: string; error?: string }> {
		return { available: true, providerName: this.providerName };
	}
}

// ---------------------------------------------------------------------------
// Adapter registry
// ---------------------------------------------------------------------------

/**
 * Returns the delivery adapter for a given channel.
 * Adapters are swappable without changing domain logic.
 */
export function getDeliveryAdapter(
	channel: DeliveryChannel,
	store: NotificationDeliveryStore,
): DeliveryAdapter {
	switch (channel) {
		case "email":
			return new EmailDeliveryAdapter();
		case "sms":
			return new SmsDeliveryAdapter();
		case "in-app":
			return new InAppDeliveryAdapter(store);
		default:
			throw new Error(
				`Unsupported notification channel: ${channel as string}`,
			);
	}
}

// ---------------------------------------------------------------------------
// E8-S4-T2: Notification delivery service
// ---------------------------------------------------------------------------

let deliveryIdCounter = 0;
function generateDeliveryId(): string {
	return `del-${++deliveryIdCounter}-${Date.now()}`;
}

/** Reset counter (for testing). */
export function resetDeliveryIdCounter(): void {
	deliveryIdCounter = 0;
}

/**
 * Core notification delivery orchestration service.
 * Accepts notification events, resolves templates, renders content,
 * creates delivery records, and enqueues jobs for asynchronous processing.
 */
export class NotificationDeliveryService {
	constructor(
		private readonly store: NotificationDeliveryStore,
		private readonly queue: NotificationQueue,
		private readonly templates: NotificationTemplate[],
		private readonly retryPolicy: NotificationRetryPolicy = DEFAULT_NOTIFICATION_RETRY_POLICY,
	) {}

	/**
	 * Process a notification event: resolve templates for all channels,
	 * render content, create delivery records, and enqueue jobs.
	 * Idempotent: skips channels that already have a terminal delivery.
	 */
	async processEvent(
		event: NotificationEvent,
		channels?: DeliveryChannel[],
	): Promise<NotificationDeliveryRecord[]> {
		const targetChannels = channels ?? [...deliveryChannels];
		const records: NotificationDeliveryRecord[] = [];

		for (const channel of targetChannels) {
			const idempotencyKey = buildNotificationIdempotencyKey(
				event.id,
				channel,
			);

			// Idempotency check — skip if already terminally delivered
			const existing = this.store.findByIdempotencyKey(idempotencyKey);
			if (existing && isTerminalDeliveryStatus(existing.status)) {
				records.push(existing);
				continue;
			}

			// Resolve template
			const template = resolveTemplate(
				this.templates,
				event.eventType,
				channel,
				event.tenantId,
			);
			if (!template) {
				// No template for this channel — skip silently
				continue;
			}

			// Render content
			const renderedSubject = renderTemplate(
				template.subjectTemplate,
				event.payload,
			);
			const renderedBody = renderTemplate(
				template.bodyTemplate,
				event.payload,
			);

			// Create or update delivery record
			const deliveryId = existing?.id ?? generateDeliveryId();
			const now = new Date().toISOString();
			const record: NotificationDeliveryRecord = {
				id: deliveryId,
				tenantId: event.tenantId,
				notificationEventId: event.id,
				eventType: event.eventType,
				channel,
				recipientAddress: event.recipientId,
				renderedSubject,
				renderedBody,
				status: "queued",
				attemptCount: existing?.attemptCount ?? 0,
				maxAttempts: this.retryPolicy.maxAttempts,
				idempotencyKey,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
			};

			this.store.upsert(record);

			// Enqueue delivery job
			const job: NotificationDeliveryJob = {
				deliveryId,
				notificationEventId: event.id,
				eventType: event.eventType,
				tenantId: event.tenantId,
				channel,
				recipientAddress: event.recipientId,
				renderedSubject,
				renderedBody,
				attemptNumber: record.attemptCount + 1,
				idempotencyKey,
			};

			await this.queue.enqueue(job);
			records.push(record);
		}

		return records;
	}

	/**
	 * Process a delivery job — called by the worker when a job is dequeued.
	 * Sends through the appropriate adapter and updates the delivery record.
	 */
	async processDeliveryJob(
		job: NotificationDeliveryJob,
		adapter: DeliveryAdapter,
	): Promise<NotificationDeliveryRecord> {
		const record = this.store.findById(job.deliveryId);
		if (!record) {
			throw new Error(`Delivery record not found: ${job.deliveryId}`);
		}

		// Idempotency: skip if already terminal
		if (isTerminalDeliveryStatus(record.status)) {
			return record;
		}

		// Update status to sending
		const now = new Date().toISOString();
		const sending: NotificationDeliveryRecord = {
			...record,
			status: "sending",
			attemptCount: job.attemptNumber,
			lastAttemptAt: now,
			updatedAt: now,
		};
		this.store.upsert(sending);

		// Attempt delivery through adapter
		let result: DeliveryAdapterResult;
		try {
			result = await adapter.send(job);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error";
			result = {
				success: false,
				failureCategory: mapProviderErrorToFailureCategory(errorMessage),
				errorMessage,
			};
		}

		// Update record based on result
		const updatedNow = new Date().toISOString();
		if (result.success) {
			const delivered: NotificationDeliveryRecord = {
				...sending,
				status: "delivered",
				providerMessageId: result.providerMessageId,
				providerName: adapter.providerName,
				updatedAt: updatedNow,
				deliveredAt: updatedNow,
			};
			this.store.upsert(delivered);
			return delivered;
		}

		// Failure — determine if retryable
		const failureCategory = result.failureCategory ?? "unknown";
		const isRetryable = isTransientFailure(failureCategory);
		const canRetry =
			isRetryable && job.attemptNumber < this.retryPolicy.maxAttempts;

		if (canRetry) {
			// Schedule retry with backoff
			const backoffDelay = computeBackoffDelay(
				job.attemptNumber,
				this.retryPolicy,
			);
			const retryRecord: NotificationDeliveryRecord = {
				...sending,
				status: "pending",
				failureCategory,
				failureReason: result.errorMessage,
				providerName: adapter.providerName,
				updatedAt: updatedNow,
			};
			this.store.upsert(retryRecord);

			// Re-enqueue with delay
			const retryJob: NotificationDeliveryJob = {
				...job,
				attemptNumber: job.attemptNumber + 1,
			};
			await this.queue.enqueue(retryJob, backoffDelay);
			return retryRecord;
		}

		// Non-retryable or max attempts exhausted — dead-letter
		const finalStatus: DeliveryStatus =
			failureCategory === "invalid-recipient" ? "bounced" : "dead-letter";
		const deadLetter: NotificationDeliveryRecord = {
			...sending,
			status: finalStatus,
			failureCategory,
			failureReason: result.errorMessage,
			providerName: adapter.providerName,
			updatedAt: updatedNow,
		};
		this.store.upsert(deadLetter);
		return deadLetter;
	}
}

// ---------------------------------------------------------------------------
// E8-S4-T4: View builders
// ---------------------------------------------------------------------------

/**
 * Builds the admin delivery log response from the store.
 */
export function buildAdminDeliveryLog(
	store: NotificationDeliveryStore,
	tenantId: string,
	filters?: {
		eventType?: string;
		channel?: DeliveryChannel;
		status?: DeliveryStatus;
	},
	limit = 50,
	offset = 0,
): {
	entries: Array<{
		id: string;
		eventType: string;
		channel: DeliveryChannel;
		recipientAddress: string;
		status: DeliveryStatus;
		attemptCount: number;
		failureCategory?: FailureCategory;
		failureReason?: string;
		providerName?: string;
		createdAt: string;
		lastAttemptAt?: string;
		deliveredAt?: string;
	}>;
	total: number;
	limit: number;
	offset: number;
} {
	const { records, total } = store.listByTenant(
		tenantId,
		filters,
		limit,
		offset,
	);
	return {
		entries: records.map((r) => ({
			id: r.id,
			eventType: r.eventType,
			channel: r.channel,
			recipientAddress: r.recipientAddress,
			status: r.status,
			attemptCount: r.attemptCount,
			failureCategory: r.failureCategory,
			failureReason: r.failureReason,
			providerName: r.providerName,
			createdAt: r.createdAt,
			lastAttemptAt: r.lastAttemptAt,
			deliveredAt: r.deliveredAt,
		})),
		total,
		limit,
		offset,
	};
}

/**
 * Builds the customer in-app notification response from the store.
 */
export function buildCustomerNotifications(
	store: NotificationDeliveryStore,
	tenantId: string,
	recipientId: string,
	unreadOnly = false,
	limit = 50,
	offset = 0,
): { notifications: InAppNotification[]; unreadCount: number; total: number } {
	return store.listInApp(tenantId, recipientId, unreadOnly, limit, offset);
}

/**
 * Builds platform-wide delivery metrics.
 */
export function buildPlatformDeliveryMetrics(
	store: NotificationDeliveryStore,
): {
	totalDeliveries: number;
	deliveredCount: number;
	failedCount: number;
	bouncedCount: number;
	pendingCount: number;
	deliveryRate: number;
	byChannel: Record<string, { total: number; delivered: number; failed: number }>;
	byEventType: Record<string, { total: number; delivered: number; failed: number }>;
} {
	const metrics = store.getAggregateMetrics();
	return {
		...metrics,
		deliveryRate:
			metrics.totalDeliveries > 0
				? metrics.deliveredCount / metrics.totalDeliveries
				: 0,
	};
}
