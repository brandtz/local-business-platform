import { describe, it, expect } from "vitest";
import {
	deliveryChannels,
	notificationEventTypes,
	deliveryStatuses,
	failureCategories,
	renderTemplate,
	computeBackoffDelay,
	buildNotificationIdempotencyKey,
	defaultNotificationTemplates,
	isDeliveryChannel,
	isNotificationEventType,
	isTerminalDeliveryStatus,
	isRetryableDeliveryStatus,
	DEFAULT_NOTIFICATION_RETRY_POLICY,
} from "./notification";
import type {
	DeliveryChannel,
	NotificationEvent,
	NotificationTemplate,
	NotificationDeliveryRecord,
	InAppNotification,
	NotificationDeliveryJob,
	NotificationRetryPolicy,
	DeliveryAdapter,
	AdminDeliveryLogEntry,
	PlatformDeliveryMetrics,
} from "./notification";

// ---------------------------------------------------------------------------
// E8-S4-T1: Notification domain model tests
// ---------------------------------------------------------------------------

describe("DeliveryChannel enum", () => {
	it("contains email, sms, and in-app channels", () => {
		expect(deliveryChannels).toContain("email");
		expect(deliveryChannels).toContain("sms");
		expect(deliveryChannels).toContain("in-app");
		expect(deliveryChannels).toHaveLength(3);
	});

	it("validates channel strings", () => {
		expect(isDeliveryChannel("email")).toBe(true);
		expect(isDeliveryChannel("sms")).toBe(true);
		expect(isDeliveryChannel("in-app")).toBe(true);
		expect(isDeliveryChannel("push")).toBe(false);
		expect(isDeliveryChannel("")).toBe(false);
	});
});

describe("NotificationEventType enum", () => {
	it("contains all core event types", () => {
		expect(notificationEventTypes).toContain("order.confirmed");
		expect(notificationEventTypes).toContain("order.ready");
		expect(notificationEventTypes).toContain("order.cancelled");
		expect(notificationEventTypes).toContain("booking.confirmed");
		expect(notificationEventTypes).toContain("booking.cancelled");
		expect(notificationEventTypes).toContain("booking.reminder");
		expect(notificationEventTypes).toContain("payment.received");
		expect(notificationEventTypes).toContain("payment.refunded");
		expect(notificationEventTypes).toHaveLength(8);
	});

	it("validates event type strings", () => {
		expect(isNotificationEventType("order.confirmed")).toBe(true);
		expect(isNotificationEventType("booking.confirmed")).toBe(true);
		expect(isNotificationEventType("invalid.event")).toBe(false);
		expect(isNotificationEventType("")).toBe(false);
	});
});

describe("DeliveryStatus enum", () => {
	it("contains all delivery statuses", () => {
		expect(deliveryStatuses).toContain("pending");
		expect(deliveryStatuses).toContain("queued");
		expect(deliveryStatuses).toContain("sending");
		expect(deliveryStatuses).toContain("delivered");
		expect(deliveryStatuses).toContain("failed");
		expect(deliveryStatuses).toContain("bounced");
		expect(deliveryStatuses).toContain("dead-letter");
		expect(deliveryStatuses).toHaveLength(7);
	});

	it("identifies terminal delivery statuses", () => {
		expect(isTerminalDeliveryStatus("delivered")).toBe(true);
		expect(isTerminalDeliveryStatus("failed")).toBe(true);
		expect(isTerminalDeliveryStatus("bounced")).toBe(true);
		expect(isTerminalDeliveryStatus("dead-letter")).toBe(true);
		expect(isTerminalDeliveryStatus("pending")).toBe(false);
		expect(isTerminalDeliveryStatus("queued")).toBe(false);
		expect(isTerminalDeliveryStatus("sending")).toBe(false);
	});

	it("identifies retryable delivery statuses", () => {
		expect(isRetryableDeliveryStatus("pending")).toBe(true);
		expect(isRetryableDeliveryStatus("failed")).toBe(true);
		expect(isRetryableDeliveryStatus("delivered")).toBe(false);
		expect(isRetryableDeliveryStatus("bounced")).toBe(false);
		expect(isRetryableDeliveryStatus("dead-letter")).toBe(false);
	});
});

describe("FailureCategory enum", () => {
	it("contains all failure categories", () => {
		expect(failureCategories).toContain("transient");
		expect(failureCategories).toContain("invalid-recipient");
		expect(failureCategories).toContain("provider-error");
		expect(failureCategories).toContain("rate-limited");
		expect(failureCategories).toContain("content-rejected");
		expect(failureCategories).toContain("configuration-error");
		expect(failureCategories).toContain("unknown");
		expect(failureCategories).toHaveLength(7);
	});
});

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

describe("renderTemplate", () => {
	it("substitutes known variables", () => {
		const result = renderTemplate("Hello {{name}}, order #{{orderId}}", {
			name: "Alice",
			orderId: "12345",
		});
		expect(result).toBe("Hello Alice, order #12345");
	});

	it("leaves unknown variables as-is", () => {
		const result = renderTemplate("Hello {{name}}, status: {{status}}", {
			name: "Bob",
		});
		expect(result).toBe("Hello Bob, status: {{status}}");
	});

	it("handles null and undefined values by leaving placeholder", () => {
		const result = renderTemplate("Value: {{val}}", { val: null });
		expect(result).toBe("Value: {{val}}");
	});

	it("converts non-string values to strings", () => {
		const result = renderTemplate("Count: {{count}}, Active: {{active}}", {
			count: 42,
			active: true,
		});
		expect(result).toBe("Count: 42, Active: true");
	});

	it("handles templates with no variables", () => {
		const result = renderTemplate("No variables here", { key: "value" });
		expect(result).toBe("No variables here");
	});

	it("handles empty template string", () => {
		const result = renderTemplate("", { key: "value" });
		expect(result).toBe("");
	});

	it("handles multiple occurrences of the same variable", () => {
		const result = renderTemplate("{{name}} says hi to {{name}}", {
			name: "Alice",
		});
		expect(result).toBe("Alice says hi to Alice");
	});
});

// ---------------------------------------------------------------------------
// Backoff computation
// ---------------------------------------------------------------------------

describe("computeBackoffDelay", () => {
	it("returns baseDelay for first attempt", () => {
		expect(computeBackoffDelay(1)).toBe(5_000);
	});

	it("doubles delay for each subsequent attempt", () => {
		expect(computeBackoffDelay(2)).toBe(10_000);
		expect(computeBackoffDelay(3)).toBe(20_000);
	});

	it("caps at maxDelay", () => {
		expect(computeBackoffDelay(10)).toBe(60_000);
	});

	it("uses custom policy if provided", () => {
		const policy: NotificationRetryPolicy = {
			maxAttempts: 5,
			baseDelayMs: 1_000,
			maxDelayMs: 10_000,
		};
		expect(computeBackoffDelay(1, policy)).toBe(1_000);
		expect(computeBackoffDelay(2, policy)).toBe(2_000);
		expect(computeBackoffDelay(3, policy)).toBe(4_000);
		expect(computeBackoffDelay(4, policy)).toBe(8_000);
		expect(computeBackoffDelay(5, policy)).toBe(10_000); // capped
	});
});

describe("DEFAULT_NOTIFICATION_RETRY_POLICY", () => {
	it("has expected defaults", () => {
		expect(DEFAULT_NOTIFICATION_RETRY_POLICY.maxAttempts).toBe(3);
		expect(DEFAULT_NOTIFICATION_RETRY_POLICY.baseDelayMs).toBe(5_000);
		expect(DEFAULT_NOTIFICATION_RETRY_POLICY.maxDelayMs).toBe(60_000);
	});
});

// ---------------------------------------------------------------------------
// Idempotency key
// ---------------------------------------------------------------------------

describe("buildNotificationIdempotencyKey", () => {
	it("builds key from event ID and channel", () => {
		const key = buildNotificationIdempotencyKey("evt-123", "email");
		expect(key).toBe("notif:evt-123:email");
	});

	it("produces unique keys for different channels", () => {
		const emailKey = buildNotificationIdempotencyKey("evt-1", "email");
		const smsKey = buildNotificationIdempotencyKey("evt-1", "sms");
		const inAppKey = buildNotificationIdempotencyKey("evt-1", "in-app");
		expect(emailKey).not.toBe(smsKey);
		expect(emailKey).not.toBe(inAppKey);
		expect(smsKey).not.toBe(inAppKey);
	});
});

// ---------------------------------------------------------------------------
// Default templates
// ---------------------------------------------------------------------------

describe("defaultNotificationTemplates", () => {
	it("seeds templates for order confirmation across all channels", () => {
		const orderConfirmed = defaultNotificationTemplates.filter(
			(t) => t.eventType === "order.confirmed",
		);
		expect(orderConfirmed).toHaveLength(3);
		const channels = orderConfirmed.map((t) => t.channel);
		expect(channels).toContain("email");
		expect(channels).toContain("sms");
		expect(channels).toContain("in-app");
	});

	it("seeds templates for booking confirmation across all channels", () => {
		const bookingConfirmed = defaultNotificationTemplates.filter(
			(t) => t.eventType === "booking.confirmed",
		);
		expect(bookingConfirmed).toHaveLength(3);
	});

	it("seeds templates for payment receipt across all channels", () => {
		const paymentReceived = defaultNotificationTemplates.filter(
			(t) => t.eventType === "payment.received",
		);
		expect(paymentReceived).toHaveLength(3);
	});

	it("all templates have subject and body with variable placeholders", () => {
		for (const template of defaultNotificationTemplates) {
			expect(template.subjectTemplate.length).toBeGreaterThan(0);
			expect(template.bodyTemplate.length).toBeGreaterThan(0);
		}
	});

	it("order templates use orderNumber and customerName variables", () => {
		const emailTemplate = defaultNotificationTemplates.find(
			(t) => t.eventType === "order.confirmed" && t.channel === "email",
		);
		expect(emailTemplate).toBeDefined();
		expect(emailTemplate!.bodyTemplate).toContain("{{orderNumber}}");
		expect(emailTemplate!.bodyTemplate).toContain("{{customerName}}");
	});

	it("booking templates use serviceName, bookingDate, bookingTime variables", () => {
		const emailTemplate = defaultNotificationTemplates.find(
			(t) => t.eventType === "booking.confirmed" && t.channel === "email",
		);
		expect(emailTemplate).toBeDefined();
		expect(emailTemplate!.bodyTemplate).toContain("{{serviceName}}");
		expect(emailTemplate!.bodyTemplate).toContain("{{bookingDate}}");
		expect(emailTemplate!.bodyTemplate).toContain("{{bookingTime}}");
	});

	it("payment templates use paymentAmount and paymentReference variables", () => {
		const emailTemplate = defaultNotificationTemplates.find(
			(t) => t.eventType === "payment.received" && t.channel === "email",
		);
		expect(emailTemplate).toBeDefined();
		expect(emailTemplate!.bodyTemplate).toContain("{{paymentAmount}}");
		expect(emailTemplate!.bodyTemplate).toContain("{{paymentReference}}");
	});
});

// ---------------------------------------------------------------------------
// Type shape assertions (compile-time + runtime)
// ---------------------------------------------------------------------------

describe("NotificationEvent type shape", () => {
	it("accepts a valid notification event object", () => {
		const event: NotificationEvent = {
			id: "ne-1",
			tenantId: "t-1",
			eventType: "order.confirmed",
			entityType: "order",
			entityId: "ord-1",
			recipientId: "cust-1",
			payload: { orderNumber: "1001", customerName: "Alice" },
			occurredAt: new Date().toISOString(),
			idempotencyKey: "notif:ne-1:email",
		};
		expect(event.id).toBe("ne-1");
		expect(event.tenantId).toBe("t-1");
		expect(event.eventType).toBe("order.confirmed");
	});
});

describe("NotificationTemplate type shape", () => {
	it("accepts a valid template object", () => {
		const template: NotificationTemplate = {
			id: "tmpl-1",
			tenantId: null,
			eventType: "order.confirmed",
			channel: "email",
			subjectTemplate: "Order #{{orderNumber}} Confirmed",
			bodyTemplate: "Hi {{customerName}}",
			isCustomizable: true,
			isActive: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		expect(template.tenantId).toBeNull();
		expect(template.isCustomizable).toBe(true);
	});
});

describe("NotificationDeliveryRecord type shape", () => {
	it("accepts a valid delivery record object", () => {
		const record: NotificationDeliveryRecord = {
			id: "del-1",
			tenantId: "t-1",
			notificationEventId: "ne-1",
			eventType: "order.confirmed",
			channel: "email",
			recipientAddress: "test@example.com",
			renderedSubject: "Order Confirmed",
			renderedBody: "Hi Alice",
			status: "delivered",
			attemptCount: 1,
			maxAttempts: 3,
			idempotencyKey: "notif:ne-1:email",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deliveredAt: new Date().toISOString(),
		};
		expect(record.status).toBe("delivered");
		expect(record.channel).toBe("email");
	});
});

describe("InAppNotification type shape", () => {
	it("accepts a valid in-app notification", () => {
		const notification: InAppNotification = {
			id: "inapp-1",
			tenantId: "t-1",
			recipientId: "cust-1",
			eventType: "order.confirmed",
			title: "Order Confirmed",
			body: "Your order is confirmed.",
			entityType: "order",
			entityId: "ord-1",
			isRead: false,
			createdAt: new Date().toISOString(),
		};
		expect(notification.isRead).toBe(false);
	});
});

describe("NotificationDeliveryJob type shape", () => {
	it("accepts a valid delivery job payload", () => {
		const job: NotificationDeliveryJob = {
			deliveryId: "del-1",
			notificationEventId: "ne-1",
			eventType: "order.confirmed",
			tenantId: "t-1",
			channel: "email",
			recipientAddress: "test@example.com",
			renderedSubject: "Subject",
			renderedBody: "Body",
			attemptNumber: 1,
			idempotencyKey: "notif:ne-1:email",
		};
		expect(job.attemptNumber).toBe(1);
	});
});

describe("DeliveryAdapter interface contract", () => {
	it("can be implemented by a stub class", () => {
		const adapter: DeliveryAdapter = {
			channel: "email" as DeliveryChannel,
			providerName: "test-provider",
			send: async () => ({ success: true, providerMessageId: "msg-1" }),
			checkStatus: async () => ({
				available: true,
				providerName: "test-provider",
			}),
		};
		expect(adapter.channel).toBe("email");
		expect(adapter.providerName).toBe("test-provider");
	});
});

// ---------------------------------------------------------------------------
// Admin/Customer view types
// ---------------------------------------------------------------------------

describe("AdminDeliveryLogEntry type shape", () => {
	it("accepts a valid admin log entry", () => {
		const entry: AdminDeliveryLogEntry = {
			id: "del-1",
			eventType: "order.confirmed",
			channel: "email",
			recipientAddress: "test@example.com",
			status: "delivered",
			attemptCount: 1,
			createdAt: new Date().toISOString(),
		};
		expect(entry.status).toBe("delivered");
	});
});

describe("PlatformDeliveryMetrics type shape", () => {
	it("accepts a valid metrics object", () => {
		const metrics: PlatformDeliveryMetrics = {
			totalDeliveries: 100,
			deliveredCount: 85,
			failedCount: 10,
			bouncedCount: 3,
			pendingCount: 2,
			deliveryRate: 0.85,
			byChannel: {
				email: { total: 50, delivered: 45, failed: 5 },
				sms: { total: 30, delivered: 25, failed: 3 },
				"in-app": { total: 20, delivered: 15, failed: 2 },
			},
			byEventType: {
				"order.confirmed": { total: 60, delivered: 55, failed: 3 },
			},
		};
		expect(metrics.deliveryRate).toBe(0.85);
	});
});
