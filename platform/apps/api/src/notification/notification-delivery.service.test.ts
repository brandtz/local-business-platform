import { describe, it, expect, beforeEach } from "vitest";
import type {
	DeliveryChannel,
	NotificationEvent,
	NotificationTemplate,
	NotificationDeliveryJob,
	DeliveryAdapter,
} from "@platform/types";
import {
	NotificationDeliveryService,
	NotificationDeliveryStore,
	InMemoryNotificationQueue,
	EmailDeliveryAdapter,
	SmsDeliveryAdapter,
	InAppDeliveryAdapter,
	getDeliveryAdapter,
	resolveTemplate,
	mapProviderErrorToFailureCategory,
	isTransientFailure,
	buildAdminDeliveryLog,
	buildCustomerNotifications,
	buildPlatformDeliveryMetrics,
	resetDeliveryIdCounter,
} from "./notification-delivery.service";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function createTestTemplates(): NotificationTemplate[] {
	const now = new Date().toISOString();
	return [
		{
			id: "tmpl-1",
			tenantId: null,
			eventType: "order.confirmed",
			channel: "email",
			subjectTemplate: "Order #{{orderNumber}} Confirmed",
			bodyTemplate:
				"Hi {{customerName}}, your order #{{orderNumber}} has been confirmed.",
			isCustomizable: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "tmpl-2",
			tenantId: null,
			eventType: "order.confirmed",
			channel: "sms",
			subjectTemplate: "Order Confirmed",
			bodyTemplate: "Order #{{orderNumber}} confirmed. Total: {{orderTotal}}.",
			isCustomizable: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "tmpl-3",
			tenantId: null,
			eventType: "order.confirmed",
			channel: "in-app",
			subjectTemplate: "Order Confirmed",
			bodyTemplate: "Your order #{{orderNumber}} has been confirmed.",
			isCustomizable: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "tmpl-4",
			tenantId: null,
			eventType: "booking.confirmed",
			channel: "email",
			subjectTemplate: "Booking Confirmed — {{serviceName}}",
			bodyTemplate:
				"Your booking for {{serviceName}} on {{bookingDate}} is confirmed.",
			isCustomizable: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "tmpl-5",
			tenantId: TENANT_A,
			eventType: "order.confirmed",
			channel: "email",
			subjectTemplate: "Your {{businessName}} Order #{{orderNumber}}",
			bodyTemplate:
				"Thanks {{customerName}}! Order #{{orderNumber}} from {{businessName}} is confirmed.",
			isCustomizable: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	];
}

function createTestEvent(
	overrides?: Partial<NotificationEvent>,
): NotificationEvent {
	return {
		id: "ne-1",
		tenantId: TENANT_A,
		eventType: "order.confirmed",
		entityType: "order",
		entityId: "ord-1",
		recipientId: "test@example.com",
		payload: {
			orderNumber: "1001",
			customerName: "Alice",
			orderTotal: "$25.00",
			businessName: "Acme Shop",
		},
		occurredAt: new Date().toISOString(),
		idempotencyKey: "notif:ne-1:email",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Template resolution
// ---------------------------------------------------------------------------

describe("resolveTemplate", () => {
	const templates = createTestTemplates();

	it("returns tenant-specific template when available", () => {
		const result = resolveTemplate(
			templates,
			"order.confirmed",
			"email",
			TENANT_A,
		);
		expect(result).toBeDefined();
		expect(result!.id).toBe("tmpl-5");
		expect(result!.tenantId).toBe(TENANT_A);
	});

	it("falls back to shared template when no tenant override exists", () => {
		const result = resolveTemplate(
			templates,
			"order.confirmed",
			"email",
			TENANT_B,
		);
		expect(result).toBeDefined();
		expect(result!.id).toBe("tmpl-1");
		expect(result!.tenantId).toBeNull();
	});

	it("returns undefined when no matching template exists", () => {
		const result = resolveTemplate(
			templates,
			"payment.received",
			"email",
			TENANT_A,
		);
		expect(result).toBeUndefined();
	});

	it("skips inactive templates", () => {
		const withInactive: NotificationTemplate[] = [
			{
				...templates[0],
				tenantId: TENANT_B,
				id: "tmpl-inactive",
				isActive: false,
			},
		];
		const result = resolveTemplate(
			withInactive,
			"order.confirmed",
			"email",
			TENANT_B,
		);
		expect(result).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Provider error mapping
// ---------------------------------------------------------------------------

describe("mapProviderErrorToFailureCategory", () => {
	it("maps timeout errors to transient", () => {
		expect(mapProviderErrorToFailureCategory("Connection timeout")).toBe(
			"transient",
		);
		expect(mapProviderErrorToFailureCategory("ECONNRESET")).toBe("transient");
		expect(mapProviderErrorToFailureCategory("503 Service Unavailable")).toBe(
			"transient",
		);
	});

	it("maps rate limit errors to rate-limited", () => {
		expect(mapProviderErrorToFailureCategory("Rate limit exceeded")).toBe(
			"rate-limited",
		);
		expect(mapProviderErrorToFailureCategory("429 Too Many Requests")).toBe(
			"rate-limited",
		);
	});

	it("maps invalid recipient errors", () => {
		expect(mapProviderErrorToFailureCategory("Invalid email address")).toBe(
			"invalid-recipient",
		);
		expect(
			mapProviderErrorToFailureCategory("Invalid recipient phone"),
		).toBe("invalid-recipient");
	});

	it("maps content rejection errors", () => {
		expect(mapProviderErrorToFailureCategory("Content blocked by spam filter")).toBe(
			"content-rejected",
		);
	});

	it("maps auth/config errors to configuration-error", () => {
		expect(mapProviderErrorToFailureCategory("Invalid API key")).toBe(
			"configuration-error",
		);
		expect(mapProviderErrorToFailureCategory("401 Unauthorized")).toBe(
			"configuration-error",
		);
	});

	it("maps provider errors", () => {
		expect(
			mapProviderErrorToFailureCategory("Provider internal server error"),
		).toBe("provider-error");
	});

	it("returns unknown for unrecognized errors", () => {
		expect(mapProviderErrorToFailureCategory("Something went wrong")).toBe(
			"unknown",
		);
	});
});

describe("isTransientFailure", () => {
	it("identifies transient and rate-limited as retryable", () => {
		expect(isTransientFailure("transient")).toBe(true);
		expect(isTransientFailure("rate-limited")).toBe(true);
	});

	it("identifies non-transient failures as not retryable", () => {
		expect(isTransientFailure("invalid-recipient")).toBe(false);
		expect(isTransientFailure("configuration-error")).toBe(false);
		expect(isTransientFailure("unknown")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// E8-S4-T3: Provider adapter tests
// ---------------------------------------------------------------------------

describe("EmailDeliveryAdapter", () => {
	const adapter = new EmailDeliveryAdapter();

	it("has correct channel and provider name", () => {
		expect(adapter.channel).toBe("email");
		expect(adapter.providerName).toBe("stub-email");
	});

	it("sends successfully for valid email address", async () => {
		const job: NotificationDeliveryJob = {
			deliveryId: "del-1",
			notificationEventId: "ne-1",
			eventType: "order.confirmed",
			tenantId: TENANT_A,
			channel: "email",
			recipientAddress: "test@example.com",
			renderedSubject: "Subject",
			renderedBody: "Body",
			attemptNumber: 1,
			idempotencyKey: "notif:ne-1:email",
		};
		const result = await adapter.send(job);
		expect(result.success).toBe(true);
		expect(result.providerMessageId).toBeDefined();
	});

	it("fails for invalid email address", async () => {
		const job: NotificationDeliveryJob = {
			deliveryId: "del-2",
			notificationEventId: "ne-2",
			eventType: "order.confirmed",
			tenantId: TENANT_A,
			channel: "email",
			recipientAddress: "not-an-email",
			renderedSubject: "Subject",
			renderedBody: "Body",
			attemptNumber: 1,
			idempotencyKey: "notif:ne-2:email",
		};
		const result = await adapter.send(job);
		expect(result.success).toBe(false);
		expect(result.failureCategory).toBe("invalid-recipient");
	});

	it("reports available status", async () => {
		const status = await adapter.checkStatus();
		expect(status.available).toBe(true);
		expect(status.providerName).toBe("stub-email");
	});
});

describe("SmsDeliveryAdapter", () => {
	const adapter = new SmsDeliveryAdapter();

	it("has correct channel and provider name", () => {
		expect(adapter.channel).toBe("sms");
		expect(adapter.providerName).toBe("stub-sms");
	});

	it("sends successfully for valid phone number", async () => {
		const job: NotificationDeliveryJob = {
			deliveryId: "del-3",
			notificationEventId: "ne-3",
			eventType: "order.confirmed",
			tenantId: TENANT_A,
			channel: "sms",
			recipientAddress: "+15551234567",
			renderedSubject: "Subject",
			renderedBody: "Body",
			attemptNumber: 1,
			idempotencyKey: "notif:ne-3:sms",
		};
		const result = await adapter.send(job);
		expect(result.success).toBe(true);
	});

	it("fails for invalid phone number", async () => {
		const job: NotificationDeliveryJob = {
			deliveryId: "del-4",
			notificationEventId: "ne-4",
			eventType: "order.confirmed",
			tenantId: TENANT_A,
			channel: "sms",
			recipientAddress: "123",
			renderedSubject: "Subject",
			renderedBody: "Body",
			attemptNumber: 1,
			idempotencyKey: "notif:ne-4:sms",
		};
		const result = await adapter.send(job);
		expect(result.success).toBe(false);
		expect(result.failureCategory).toBe("invalid-recipient");
	});
});

describe("InAppDeliveryAdapter", () => {
	let store: NotificationDeliveryStore;
	let adapter: InAppDeliveryAdapter;

	beforeEach(() => {
		store = new NotificationDeliveryStore();
		adapter = new InAppDeliveryAdapter(store);
	});

	it("has correct channel and provider name", () => {
		expect(adapter.channel).toBe("in-app");
		expect(adapter.providerName).toBe("internal");
	});

	it("persists notification to in-app store on send", async () => {
		const job: NotificationDeliveryJob = {
			deliveryId: "del-5",
			notificationEventId: "ne-5",
			eventType: "order.confirmed",
			tenantId: TENANT_A,
			channel: "in-app",
			recipientAddress: "cust-1",
			renderedSubject: "Order Confirmed",
			renderedBody: "Your order is confirmed.",
			attemptNumber: 1,
			idempotencyKey: "notif:ne-5:in-app",
		};
		const result = await adapter.send(job);
		expect(result.success).toBe(true);

		// Verify notification was persisted
		const { notifications } = store.listInApp(TENANT_A, "cust-1");
		expect(notifications).toHaveLength(1);
		expect(notifications[0].title).toBe("Order Confirmed");
		expect(notifications[0].body).toBe("Your order is confirmed.");
		expect(notifications[0].isRead).toBe(false);
	});
});

describe("getDeliveryAdapter", () => {
	it("returns email adapter for email channel", () => {
		const store = new NotificationDeliveryStore();
		const adapter = getDeliveryAdapter("email", store);
		expect(adapter.channel).toBe("email");
	});

	it("returns sms adapter for sms channel", () => {
		const store = new NotificationDeliveryStore();
		const adapter = getDeliveryAdapter("sms", store);
		expect(adapter.channel).toBe("sms");
	});

	it("returns in-app adapter for in-app channel", () => {
		const store = new NotificationDeliveryStore();
		const adapter = getDeliveryAdapter("in-app", store);
		expect(adapter.channel).toBe("in-app");
	});
});

// ---------------------------------------------------------------------------
// E8-S4-T2: Delivery orchestration tests
// ---------------------------------------------------------------------------

describe("NotificationDeliveryService", () => {
	let store: NotificationDeliveryStore;
	let queue: InMemoryNotificationQueue;
	let service: NotificationDeliveryService;

	beforeEach(() => {
		store = new NotificationDeliveryStore();
		queue = new InMemoryNotificationQueue();
		resetDeliveryIdCounter();
		service = new NotificationDeliveryService(
			store,
			queue,
			createTestTemplates(),
		);
	});

	// -----------------------------------------------------------------------
	// Event processing
	// -----------------------------------------------------------------------

	describe("processEvent", () => {
		it("creates delivery records for all channels with templates", async () => {
			const event = createTestEvent();
			const records = await service.processEvent(event);

			// Should have 3 records (email, sms, in-app — all have templates)
			expect(records).toHaveLength(3);
			expect(records.map((r) => r.channel)).toEqual(
				expect.arrayContaining(["email", "sms", "in-app"]),
			);
		});

		it("renders templates with event payload variables", async () => {
			const event = createTestEvent();
			const records = await service.processEvent(event, ["email"]);

			expect(records).toHaveLength(1);
			// Tenant-A has a custom email template
			expect(records[0].renderedSubject).toContain("Acme Shop");
			expect(records[0].renderedSubject).toContain("1001");
			expect(records[0].renderedBody).toContain("Alice");
		});

		it("enqueues delivery jobs to the queue", async () => {
			const event = createTestEvent();
			await service.processEvent(event, ["email"]);

			const jobs = queue.getQueuedJobs();
			expect(jobs).toHaveLength(1);
			expect(jobs[0].data.channel).toBe("email");
			expect(jobs[0].data.tenantId).toBe(TENANT_A);
		});

		it("skips channels without templates", async () => {
			// booking.confirmed only has email template in test fixtures
			const event = createTestEvent({
				id: "ne-2",
				eventType: "booking.confirmed",
			});
			const records = await service.processEvent(event);

			expect(records).toHaveLength(1);
			expect(records[0].channel).toBe("email");
		});

		it("is idempotent — skips already-delivered channels", async () => {
			const event = createTestEvent();
			const [first] = await service.processEvent(event, ["email"]);

			// Manually mark as delivered
			store.upsert({ ...first, status: "delivered" });

			// Process again
			const records = await service.processEvent(event, ["email"]);
			expect(records).toHaveLength(1);
			expect(records[0].status).toBe("delivered");

			// Should not have enqueued a second job
			const jobs = queue.getQueuedJobs();
			expect(jobs).toHaveLength(1); // only original job
		});

		it("creates multi-channel jobs in a single processEvent call", async () => {
			const event = createTestEvent();
			await service.processEvent(event, ["email", "sms", "in-app"]);

			const jobs = queue.getQueuedJobs();
			expect(jobs).toHaveLength(3);
			const channels = jobs.map((j) => j.data.channel);
			expect(channels).toContain("email");
			expect(channels).toContain("sms");
			expect(channels).toContain("in-app");
		});
	});

	// -----------------------------------------------------------------------
	// Delivery job processing
	// -----------------------------------------------------------------------

	describe("processDeliveryJob", () => {
		it("delivers successfully through adapter", async () => {
			const event = createTestEvent();
			await service.processEvent(event, ["email"]);

			const job = queue.getQueuedJobs()[0].data;
			const adapter = new EmailDeliveryAdapter();
			const result = await service.processDeliveryJob(job, adapter);

			expect(result.status).toBe("delivered");
			expect(result.providerMessageId).toBeDefined();
			expect(result.deliveredAt).toBeDefined();
		});

		it("retries transient failures with backoff", async () => {
			const event = createTestEvent();
			await service.processEvent(event, ["email"]);

			const job = queue.getQueuedJobs()[0].data;

			// Create a failing adapter
			const failingAdapter: DeliveryAdapter = {
				channel: "email",
				providerName: "failing-provider",
				send: async () => ({
					success: false,
					failureCategory: "transient",
					errorMessage: "Connection timeout",
				}),
				checkStatus: async () => ({
					available: false,
					providerName: "failing-provider",
				}),
			};

			const result = await service.processDeliveryJob(job, failingAdapter);
			expect(result.status).toBe("pending"); // retryable
			expect(result.failureCategory).toBe("transient");

			// Should have enqueued a retry job with delay
			const allJobs = queue.getQueuedJobs();
			expect(allJobs.length).toBe(2); // original + retry
			expect(allJobs[1].delayMs).toBeGreaterThan(0);
			expect(allJobs[1].data.attemptNumber).toBe(2);
		});

		it("dead-letters after max retries exhausted", async () => {
			const event = createTestEvent();
			const retryPolicy = {
				maxAttempts: 2,
				baseDelayMs: 100,
				maxDelayMs: 1000,
			};
			const svc = new NotificationDeliveryService(
				store,
				queue,
				createTestTemplates(),
				retryPolicy,
			);
			await svc.processEvent(event, ["email"]);

			const failingAdapter: DeliveryAdapter = {
				channel: "email",
				providerName: "failing-provider",
				send: async () => ({
					success: false,
					failureCategory: "transient",
					errorMessage: "Service unavailable",
				}),
				checkStatus: async () => ({
					available: false,
					providerName: "failing-provider",
				}),
			};

			// Attempt 1
			const job1 = queue.getQueuedJobs()[0].data;
			await svc.processDeliveryJob(job1, failingAdapter);

			// Attempt 2 (last)
			const job2 = queue.getQueuedJobs()[1].data;
			const result = await svc.processDeliveryJob(job2, failingAdapter);

			expect(result.status).toBe("dead-letter");
			expect(result.failureCategory).toBe("transient");
		});

		it("bounces for invalid-recipient errors", async () => {
			const event = createTestEvent();
			await service.processEvent(event, ["email"]);

			const job = queue.getQueuedJobs()[0].data;
			const bouncingAdapter: DeliveryAdapter = {
				channel: "email",
				providerName: "bouncing-provider",
				send: async () => ({
					success: false,
					failureCategory: "invalid-recipient",
					errorMessage: "Invalid email address",
				}),
				checkStatus: async () => ({
					available: true,
					providerName: "bouncing-provider",
				}),
			};

			const result = await service.processDeliveryJob(job, bouncingAdapter);
			expect(result.status).toBe("bounced");
		});

		it("handles adapter exceptions gracefully", async () => {
			const event = createTestEvent();
			await service.processEvent(event, ["email"]);

			const job = queue.getQueuedJobs()[0].data;
			const throwingAdapter: DeliveryAdapter = {
				channel: "email",
				providerName: "throwing-provider",
				send: async () => {
					throw new Error("Connection timeout to provider");
				},
				checkStatus: async () => ({
					available: false,
					providerName: "throwing-provider",
				}),
			};

			const result = await service.processDeliveryJob(
				job,
				throwingAdapter,
			);
			// Timeout is transient, should retry
			expect(result.status).toBe("pending");
			expect(result.failureCategory).toBe("transient");
		});

		it("is idempotent — skips already-delivered records", async () => {
			const event = createTestEvent();
			const [record] = await service.processEvent(event, ["email"]);

			// Mark as delivered
			store.upsert({
				...record,
				status: "delivered",
				deliveredAt: new Date().toISOString(),
			});

			const job = queue.getQueuedJobs()[0].data;
			const adapter = new EmailDeliveryAdapter();
			const result = await service.processDeliveryJob(job, adapter);

			expect(result.status).toBe("delivered");
		});
	});
});

// ---------------------------------------------------------------------------
// E8-S4-T4: View tests
// ---------------------------------------------------------------------------

describe("NotificationDeliveryStore", () => {
	let store: NotificationDeliveryStore;

	beforeEach(() => {
		store = new NotificationDeliveryStore();
	});

	describe("delivery records", () => {
		it("stores and retrieves by ID", () => {
			const record = createDeliveryRecord("del-1", TENANT_A, "email");
			store.upsert(record);
			expect(store.findById("del-1")).toEqual(record);
		});

		it("finds by idempotency key", () => {
			const record = createDeliveryRecord("del-1", TENANT_A, "email");
			store.upsert(record);
			expect(store.findByIdempotencyKey(record.idempotencyKey)).toEqual(
				record,
			);
		});

		it("lists records scoped to tenant", () => {
			store.upsert(createDeliveryRecord("del-1", TENANT_A, "email"));
			store.upsert(createDeliveryRecord("del-2", TENANT_B, "email"));
			store.upsert(createDeliveryRecord("del-3", TENANT_A, "sms"));

			const { records, total } = store.listByTenant(TENANT_A);
			expect(total).toBe(2);
			expect(records.every((r) => r.tenantId === TENANT_A)).toBe(true);
		});

		it("filters by channel", () => {
			store.upsert(createDeliveryRecord("del-1", TENANT_A, "email"));
			store.upsert(createDeliveryRecord("del-2", TENANT_A, "sms"));

			const { records } = store.listByTenant(TENANT_A, { channel: "sms" });
			expect(records).toHaveLength(1);
			expect(records[0].channel).toBe("sms");
		});

		it("filters by status", () => {
			store.upsert(
				createDeliveryRecord("del-1", TENANT_A, "email", "delivered"),
			);
			store.upsert(
				createDeliveryRecord("del-2", TENANT_A, "email", "failed"),
			);

			const { records } = store.listByTenant(TENANT_A, {
				status: "delivered",
			});
			expect(records).toHaveLength(1);
			expect(records[0].status).toBe("delivered");
		});

		it("paginates results", () => {
			for (let i = 0; i < 10; i++) {
				store.upsert(createDeliveryRecord(`del-${i}`, TENANT_A, "email"));
			}
			const { records, total } = store.listByTenant(
				TENANT_A,
				undefined,
				3,
				0,
			);
			expect(records).toHaveLength(3);
			expect(total).toBe(10);
		});
	});

	describe("in-app notifications", () => {
		it("stores and retrieves in-app notifications", () => {
			const notification = createInAppNotification(
				"inapp-1",
				TENANT_A,
				"cust-1",
			);
			store.storeInApp(notification);
			const { notifications } = store.listInApp(TENANT_A, "cust-1");
			expect(notifications).toHaveLength(1);
		});

		it("scopes notifications to tenant and recipient", () => {
			store.storeInApp(
				createInAppNotification("inapp-1", TENANT_A, "cust-1"),
			);
			store.storeInApp(
				createInAppNotification("inapp-2", TENANT_B, "cust-1"),
			);
			store.storeInApp(
				createInAppNotification("inapp-3", TENANT_A, "cust-2"),
			);

			const { notifications } = store.listInApp(TENANT_A, "cust-1");
			expect(notifications).toHaveLength(1);
			expect(notifications[0].id).toBe("inapp-1");
		});

		it("counts unread notifications", () => {
			store.storeInApp(
				createInAppNotification("inapp-1", TENANT_A, "cust-1"),
			);
			store.storeInApp(
				createInAppNotification("inapp-2", TENANT_A, "cust-1"),
			);
			store.storeInApp({
				...createInAppNotification("inapp-3", TENANT_A, "cust-1"),
				isRead: true,
				readAt: new Date().toISOString(),
			});

			const { unreadCount } = store.listInApp(TENANT_A, "cust-1");
			expect(unreadCount).toBe(2);
		});

		it("filters to unread only", () => {
			store.storeInApp(
				createInAppNotification("inapp-1", TENANT_A, "cust-1"),
			);
			store.storeInApp({
				...createInAppNotification("inapp-2", TENANT_A, "cust-1"),
				isRead: true,
				readAt: new Date().toISOString(),
			});

			const { notifications } = store.listInApp(
				TENANT_A,
				"cust-1",
				true,
			);
			expect(notifications).toHaveLength(1);
			expect(notifications[0].id).toBe("inapp-1");
		});

		it("marks notification as read", () => {
			store.storeInApp(
				createInAppNotification("inapp-1", TENANT_A, "cust-1"),
			);

			const result = store.markAsRead("inapp-1", TENANT_A, "cust-1");
			expect(result).toBe(true);

			const { notifications } = store.listInApp(TENANT_A, "cust-1");
			expect(notifications[0].isRead).toBe(true);
			expect(notifications[0].readAt).toBeDefined();
		});

		it("refuses to mark notification for wrong tenant", () => {
			store.storeInApp(
				createInAppNotification("inapp-1", TENANT_A, "cust-1"),
			);
			const result = store.markAsRead("inapp-1", TENANT_B, "cust-1");
			expect(result).toBe(false);
		});

		it("refuses to mark notification for wrong recipient", () => {
			store.storeInApp(
				createInAppNotification("inapp-1", TENANT_A, "cust-1"),
			);
			const result = store.markAsRead("inapp-1", TENANT_A, "cust-2");
			expect(result).toBe(false);
		});

		it("returns true for already-read notification", () => {
			store.storeInApp({
				...createInAppNotification("inapp-1", TENANT_A, "cust-1"),
				isRead: true,
				readAt: new Date().toISOString(),
			});
			const result = store.markAsRead("inapp-1", TENANT_A, "cust-1");
			expect(result).toBe(true);
		});
	});
});

// ---------------------------------------------------------------------------
// View builders
// ---------------------------------------------------------------------------

describe("buildAdminDeliveryLog", () => {
	let store: NotificationDeliveryStore;

	beforeEach(() => {
		store = new NotificationDeliveryStore();
	});

	it("returns tenant-scoped delivery log entries", () => {
		store.upsert(createDeliveryRecord("del-1", TENANT_A, "email"));
		store.upsert(createDeliveryRecord("del-2", TENANT_B, "email"));

		const log = buildAdminDeliveryLog(store, TENANT_A);
		expect(log.entries).toHaveLength(1);
		expect(log.total).toBe(1);
		expect(log.entries[0].id).toBe("del-1");
	});

	it("includes pagination metadata", () => {
		for (let i = 0; i < 5; i++) {
			store.upsert(createDeliveryRecord(`del-${i}`, TENANT_A, "email"));
		}
		const log = buildAdminDeliveryLog(store, TENANT_A, undefined, 2, 0);
		expect(log.entries).toHaveLength(2);
		expect(log.total).toBe(5);
		expect(log.limit).toBe(2);
		expect(log.offset).toBe(0);
	});
});

describe("buildCustomerNotifications", () => {
	let store: NotificationDeliveryStore;

	beforeEach(() => {
		store = new NotificationDeliveryStore();
	});

	it("returns customer-scoped notifications", () => {
		store.storeInApp(createInAppNotification("n-1", TENANT_A, "cust-1"));
		store.storeInApp(createInAppNotification("n-2", TENANT_A, "cust-2"));

		const result = buildCustomerNotifications(store, TENANT_A, "cust-1");
		expect(result.notifications).toHaveLength(1);
		expect(result.total).toBe(1);
	});
});

describe("buildPlatformDeliveryMetrics", () => {
	let store: NotificationDeliveryStore;

	beforeEach(() => {
		store = new NotificationDeliveryStore();
	});

	it("aggregates delivery metrics across all tenants", () => {
		store.upsert(
			createDeliveryRecord("del-1", TENANT_A, "email", "delivered"),
		);
		store.upsert(
			createDeliveryRecord("del-2", TENANT_A, "sms", "delivered"),
		);
		store.upsert(
			createDeliveryRecord("del-3", TENANT_B, "email", "failed"),
		);
		store.upsert(
			createDeliveryRecord("del-4", TENANT_A, "email", "bounced"),
		);

		const metrics = buildPlatformDeliveryMetrics(store);
		expect(metrics.totalDeliveries).toBe(4);
		expect(metrics.deliveredCount).toBe(2);
		expect(metrics.failedCount).toBe(1);
		expect(metrics.bouncedCount).toBe(1);
		expect(metrics.deliveryRate).toBe(0.5);
	});

	it("returns zero delivery rate when no deliveries exist", () => {
		const metrics = buildPlatformDeliveryMetrics(store);
		expect(metrics.deliveryRate).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDeliveryRecord(
	id: string,
	tenantId: string,
	channel: DeliveryChannel,
	status: import("@platform/types").DeliveryStatus = "queued",
): import("@platform/types").NotificationDeliveryRecord {
	const now = new Date().toISOString();
	return {
		id,
		tenantId,
		notificationEventId: `ne-${id}`,
		eventType: "order.confirmed",
		channel,
		recipientAddress:
			channel === "email"
				? "test@example.com"
				: channel === "sms"
					? "+15551234567"
					: "cust-1",
		renderedSubject: "Test Subject",
		renderedBody: "Test Body",
		status,
		attemptCount: 1,
		maxAttempts: 3,
		idempotencyKey: `notif:${id}:${channel}`,
		createdAt: now,
		updatedAt: now,
	};
}

function createInAppNotification(
	id: string,
	tenantId: string,
	recipientId: string,
): import("@platform/types").InAppNotification {
	return {
		id,
		tenantId,
		recipientId,
		eventType: "order.confirmed",
		title: "Order Confirmed",
		body: "Your order has been confirmed.",
		entityType: "order",
		entityId: "ord-1",
		isRead: false,
		createdAt: new Date().toISOString(),
	};
}
