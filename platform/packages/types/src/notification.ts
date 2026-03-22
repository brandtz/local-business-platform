// ---------------------------------------------------------------------------
// E8-S4-T1: Notification domain models
// ---------------------------------------------------------------------------

/**
 * Delivery channels supported by the notification delivery framework.
 * Note: customer.ts defines NotificationChannel for preference settings;
 * this enum covers the delivery-layer channels including in-app.
 */
export const deliveryChannels = ["email", "sms", "in-app"] as const;
export type DeliveryChannel = (typeof deliveryChannels)[number];

/**
 * Notification event types that trigger notifications.
 * Maps to domain events from order, booking, and payment flows.
 */
export const notificationEventTypes = [
	"order.confirmed",
	"order.ready",
	"order.cancelled",
	"booking.confirmed",
	"booking.cancelled",
	"booking.reminder",
	"payment.received",
	"payment.refunded",
] as const;
export type NotificationEventType =
	(typeof notificationEventTypes)[number];

/**
 * Delivery status for a notification delivery attempt.
 */
export const deliveryStatuses = [
	"pending",
	"queued",
	"sending",
	"delivered",
	"failed",
	"bounced",
	"dead-letter",
] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

/**
 * Common failure categories mapped from provider-specific errors.
 */
export const failureCategories = [
	"transient",
	"invalid-recipient",
	"provider-error",
	"rate-limited",
	"content-rejected",
	"configuration-error",
	"unknown",
] as const;
export type FailureCategory = (typeof failureCategories)[number];

// ---------------------------------------------------------------------------
// Notification event — the trigger input
// ---------------------------------------------------------------------------

/**
 * A notification event represents a domain event that should trigger
 * notifications through one or more channels.
 */
export type NotificationEvent = {
	/** Unique identifier for this notification event. */
	id: string;
	/** Tenant that owns this event. */
	tenantId: string;
	/** The type of event (e.g., "order.confirmed"). */
	eventType: NotificationEventType;
	/** Entity type referenced (e.g., "order", "booking"). */
	entityType: string;
	/** Entity ID referenced. */
	entityId: string;
	/** Recipient identifier (e.g., customer email or ID). */
	recipientId: string;
	/** Template variable payload for rendering. */
	payload: Record<string, unknown>;
	/** ISO 8601 timestamp when event occurred. */
	occurredAt: string;
	/** Idempotency key to prevent duplicate sends. */
	idempotencyKey: string;
};

// ---------------------------------------------------------------------------
// Notification template — rendering definition
// ---------------------------------------------------------------------------

/**
 * A notification template defines how a notification is rendered for a
 * specific event type and channel.
 */
export type NotificationTemplate = {
	/** Unique template identifier. */
	id: string;
	/** Tenant ID, or null for shared/default templates. */
	tenantId: string | null;
	/** Event type this template handles. */
	eventType: NotificationEventType;
	/** Channel this template targets. */
	channel: DeliveryChannel;
	/** Subject line (email) or title (push). */
	subjectTemplate: string;
	/** Body template with {{variable}} placeholders. */
	bodyTemplate: string;
	/** Whether this template can be customized per-tenant. */
	isCustomizable: boolean;
	/** Whether this template is currently active. */
	isActive: boolean;
	/** ISO 8601 timestamps. */
	createdAt: string;
	updatedAt: string;
};

// ---------------------------------------------------------------------------
// Template variable substitution
// ---------------------------------------------------------------------------

/**
 * Renders a template string by substituting {{variableName}} placeholders
 * with values from the provided variables map.
 * Unknown variables are left as-is.
 */
export function renderTemplate(
	template: string,
	variables: Record<string, unknown>,
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
		const value = variables[key];
		if (value === undefined || value === null) {
			return `{{${key}}}`;
		}
		return String(value);
	});
}

// ---------------------------------------------------------------------------
// Delivery record — persisted delivery attempt
// ---------------------------------------------------------------------------

/**
 * A notification delivery record tracks a single delivery attempt
 * through a specific channel.
 */
export type NotificationDeliveryRecord = {
	/** Unique delivery ID. */
	id: string;
	/** Tenant ID. */
	tenantId: string;
	/** Reference to the notification event. */
	notificationEventId: string;
	/** Channel used for this delivery. */
	channel: DeliveryChannel;
	/** Recipient address (email, phone, or user ID). */
	recipientAddress: string;
	/** Rendered subject. */
	renderedSubject: string;
	/** Rendered body. */
	renderedBody: string;
	/** Current delivery status. */
	status: DeliveryStatus;
	/** Number of delivery attempts so far. */
	attemptCount: number;
	/** Maximum allowed attempts. */
	maxAttempts: number;
	/** Failure category if delivery failed. */
	failureCategory?: FailureCategory;
	/** Provider-specific error message (sanitized, no PII). */
	failureReason?: string;
	/** Provider name (e.g., "sendgrid", "twilio", "internal"). */
	providerName?: string;
	/** Provider-specific message ID for tracking. */
	providerMessageId?: string;
	/** Idempotency key to prevent duplicate sends. */
	idempotencyKey: string;
	/** ISO 8601 timestamps. */
	createdAt: string;
	updatedAt: string;
	/** Timestamp of last delivery attempt. */
	lastAttemptAt?: string;
	/** Timestamp when delivery was confirmed. */
	deliveredAt?: string;
};

// ---------------------------------------------------------------------------
// In-app notification — persisted for customer polling/push
// ---------------------------------------------------------------------------

/**
 * An in-app notification visible to the customer in their notification
 * center within the platform.
 */
export type InAppNotification = {
	/** Unique notification ID. */
	id: string;
	/** Tenant ID. */
	tenantId: string;
	/** Customer/user who receives this notification. */
	recipientId: string;
	/** Event type that triggered this notification. */
	eventType: NotificationEventType;
	/** Notification title. */
	title: string;
	/** Notification body content. */
	body: string;
	/** Entity type referenced (e.g., "order", "booking"). */
	entityType?: string;
	/** Entity ID for deep-linking. */
	entityId?: string;
	/** Whether the notification has been read. */
	isRead: boolean;
	/** Timestamp when read. */
	readAt?: string;
	/** ISO 8601 timestamps. */
	createdAt: string;
};

// ---------------------------------------------------------------------------
// Delivery job schema — queue payload
// ---------------------------------------------------------------------------

/**
 * The job payload enqueued to BullMQ for asynchronous delivery.
 */
export type NotificationDeliveryJob = {
	/** Delivery record ID. */
	deliveryId: string;
	/** Notification event ID. */
	notificationEventId: string;
	/** Tenant ID. */
	tenantId: string;
	/** Channel for delivery. */
	channel: DeliveryChannel;
	/** Recipient address. */
	recipientAddress: string;
	/** Rendered subject. */
	renderedSubject: string;
	/** Rendered body. */
	renderedBody: string;
	/** Current attempt number (1-based). */
	attemptNumber: number;
	/** Idempotency key. */
	idempotencyKey: string;
};

/**
 * Retry policy configuration for notification delivery.
 */
export type NotificationRetryPolicy = {
	/** Maximum number of delivery attempts. */
	maxAttempts: number;
	/** Base delay in milliseconds for exponential backoff. */
	baseDelayMs: number;
	/** Maximum delay in milliseconds. */
	maxDelayMs: number;
};

/** Default retry policy: 3 attempts, exponential backoff starting at 5s. */
export const DEFAULT_NOTIFICATION_RETRY_POLICY: NotificationRetryPolicy = {
	maxAttempts: 3,
	baseDelayMs: 5_000,
	maxDelayMs: 60_000,
};

/**
 * Computes the backoff delay for a given attempt number using exponential
 * backoff: delay = min(baseDelay * 2^(attempt-1), maxDelay).
 */
export function computeBackoffDelay(
	attemptNumber: number,
	policy: NotificationRetryPolicy = DEFAULT_NOTIFICATION_RETRY_POLICY,
): number {
	const delay = policy.baseDelayMs * Math.pow(2, attemptNumber - 1);
	return Math.min(delay, policy.maxDelayMs);
}

/**
 * Builds an idempotency key from event and channel.
 * Prevents duplicate sends when reprocessing the same event.
 */
export function buildNotificationIdempotencyKey(
	notificationEventId: string,
	channel: DeliveryChannel,
): string {
	return `notif:${notificationEventId}:${channel}`;
}

// ---------------------------------------------------------------------------
// Default templates — seeded for core event types
// ---------------------------------------------------------------------------

export type DefaultTemplateSeed = {
	eventType: NotificationEventType;
	channel: DeliveryChannel;
	subjectTemplate: string;
	bodyTemplate: string;
};

/**
 * Default templates for core event types.
 * These are seeded as shared templates (tenantId = null).
 */
export const defaultNotificationTemplates: readonly DefaultTemplateSeed[] = [
	// Order confirmation
	{
		eventType: "order.confirmed",
		channel: "email",
		subjectTemplate: "Order #{{orderNumber}} Confirmed",
		bodyTemplate:
			"Hi {{customerName}}, your order #{{orderNumber}} has been confirmed. Total: {{orderTotal}}.",
	},
	{
		eventType: "order.confirmed",
		channel: "sms",
		subjectTemplate: "Order Confirmed",
		bodyTemplate:
			"Your order #{{orderNumber}} is confirmed. Total: {{orderTotal}}.",
	},
	{
		eventType: "order.confirmed",
		channel: "in-app",
		subjectTemplate: "Order Confirmed",
		bodyTemplate:
			"Your order #{{orderNumber}} has been confirmed and is being processed.",
	},
	// Booking confirmation
	{
		eventType: "booking.confirmed",
		channel: "email",
		subjectTemplate: "Booking Confirmed — {{serviceName}}",
		bodyTemplate:
			"Hi {{customerName}}, your booking for {{serviceName}} on {{bookingDate}} at {{bookingTime}} with {{staffName}} is confirmed.",
	},
	{
		eventType: "booking.confirmed",
		channel: "sms",
		subjectTemplate: "Booking Confirmed",
		bodyTemplate:
			"Booking confirmed: {{serviceName}} on {{bookingDate}} at {{bookingTime}}.",
	},
	{
		eventType: "booking.confirmed",
		channel: "in-app",
		subjectTemplate: "Booking Confirmed",
		bodyTemplate:
			"Your booking for {{serviceName}} on {{bookingDate}} at {{bookingTime}} is confirmed.",
	},
	// Payment receipt
	{
		eventType: "payment.received",
		channel: "email",
		subjectTemplate: "Payment Receipt — {{paymentAmount}}",
		bodyTemplate:
			"Hi {{customerName}}, we received your payment of {{paymentAmount}}. Reference: {{paymentReference}}.",
	},
	{
		eventType: "payment.received",
		channel: "sms",
		subjectTemplate: "Payment Received",
		bodyTemplate:
			"Payment of {{paymentAmount}} received. Ref: {{paymentReference}}.",
	},
	{
		eventType: "payment.received",
		channel: "in-app",
		subjectTemplate: "Payment Received",
		bodyTemplate:
			"Your payment of {{paymentAmount}} has been received. Reference: {{paymentReference}}.",
	},
] as const;

// ---------------------------------------------------------------------------
// Provider adapter interface (E8-S4-T3)
// ---------------------------------------------------------------------------

/**
 * Result from a delivery adapter send attempt.
 */
export type DeliveryAdapterResult = {
	/** Whether the send was successful. */
	success: boolean;
	/** Provider-assigned message ID for tracking. */
	providerMessageId?: string;
	/** Failure category if send failed. */
	failureCategory?: FailureCategory;
	/** Human-readable error message (no PII). */
	errorMessage?: string;
};

/**
 * Provider status check result.
 */
export type DeliveryAdapterStatus = {
	/** Whether the provider is reachable. */
	available: boolean;
	/** Provider name. */
	providerName: string;
	/** Error if unavailable. */
	error?: string;
};

/**
 * Common interface for notification delivery adapters.
 * Each channel (email, SMS, in-app) must implement this contract.
 * Adapters are swappable without changing domain logic.
 */
export interface DeliveryAdapter {
	/** The channel this adapter handles. */
	readonly channel: DeliveryChannel;

	/** The provider name (e.g., "sendgrid", "twilio", "internal"). */
	readonly providerName: string;

	/**
	 * Send a notification through this channel.
	 * Must map provider-specific errors to DeliveryAdapterResult.
	 */
	send(job: NotificationDeliveryJob): Promise<DeliveryAdapterResult>;

	/**
	 * Check the availability/health of this delivery provider.
	 */
	checkStatus(): Promise<DeliveryAdapterStatus>;
}

// ---------------------------------------------------------------------------
// Admin delivery log views (E8-S4-T4)
// ---------------------------------------------------------------------------

/**
 * Tenant admin delivery log entry.
 */
export type AdminDeliveryLogEntry = {
	id: string;
	eventType: NotificationEventType;
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
};

/**
 * Tenant admin delivery log query.
 */
export type AdminDeliveryLogQuery = {
	tenantId: string;
	eventType?: NotificationEventType;
	channel?: DeliveryChannel;
	status?: DeliveryStatus;
	limit?: number;
	offset?: number;
};

/**
 * Tenant admin delivery log response.
 */
export type AdminDeliveryLogResponse = {
	entries: AdminDeliveryLogEntry[];
	total: number;
	limit: number;
	offset: number;
};

/**
 * Customer in-app notification list query.
 */
export type CustomerNotificationQuery = {
	tenantId: string;
	recipientId: string;
	unreadOnly?: boolean;
	limit?: number;
	offset?: number;
};

/**
 * Customer in-app notification list response.
 */
export type CustomerNotificationResponse = {
	notifications: InAppNotification[];
	unreadCount: number;
	total: number;
};

/**
 * Platform admin aggregate delivery metrics.
 */
export type PlatformDeliveryMetrics = {
	totalDeliveries: number;
	deliveredCount: number;
	failedCount: number;
	bouncedCount: number;
	pendingCount: number;
	deliveryRate: number;
	byChannel: Record<
		DeliveryChannel,
		{ total: number; delivered: number; failed: number }
	>;
	byEventType: Record<
		string,
		{ total: number; delivered: number; failed: number }
	>;
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether a string is a valid delivery channel.
 */
export function isDeliveryChannel(
	value: string,
): value is DeliveryChannel {
	return (deliveryChannels as readonly string[]).includes(value);
}

/**
 * Checks whether a string is a valid notification event type.
 */
export function isNotificationEventType(
	value: string,
): value is NotificationEventType {
	return (notificationEventTypes as readonly string[]).includes(value);
}

/**
 * Checks whether a delivery status represents a terminal state.
 */
export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
	return status === "delivered" || status === "failed" || status === "bounced" || status === "dead-letter";
}

/**
 * Checks whether a delivery status represents a retryable state.
 */
export function isRetryableDeliveryStatus(status: DeliveryStatus): boolean {
	return status === "pending" || status === "failed";
}
