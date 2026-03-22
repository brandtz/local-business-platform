// ---------------------------------------------------------------------------
// E8-S6-T2: Operational event service tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from "vitest";
import { OperationalEventService } from "./operational-event.service";
import { OperationalEventRepository } from "./operational-event.repository";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

describe("OperationalEventService", () => {
	let repository: OperationalEventRepository;
	let service: OperationalEventService;

	beforeEach(() => {
		repository = new OperationalEventRepository();
		service = new OperationalEventService(repository);
	});

	// -----------------------------------------------------------------------
	// Payment connection failure emission
	// -----------------------------------------------------------------------

	describe("emitPaymentConnectionFailure", () => {
		it("emits a payment-connection-failure alert with correct category", () => {
			const alert = service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
				connectionId: "conn-1",
				provider: "stripe",
				errorMessage: "Invalid API key",
			});

			expect(alert.category).toBe("payment-connection-failure");
			expect(alert.severity).toBe("warning");
			expect(alert.tenantId).toBe(TENANT_A);
			expect(alert.context.sourceModule).toBe("payment");
			expect(alert.context.entityId).toBe("conn-1");
			expect(alert.context.entityType).toBe("payment-connection");
			expect(alert.context.provider).toBe("stripe");
			expect(alert.context.errorMessage).toBe("Invalid API key");
			expect(alert.acknowledged).toBe(false);
		});

		it("emits critical for payment-connection-suspended", () => {
			const alert = service.emitPaymentConnectionFailure({
				failureType: "payment-connection-suspended",
				tenantId: TENANT_A,
				connectionId: "conn-1",
				provider: "square",
			});

			expect(alert.severity).toBe("critical");
		});

		it("stores event in repository", () => {
			service.emitPaymentConnectionFailure({
				failureType: "payment-health-check-failed",
				tenantId: TENANT_A,
			});

			expect(repository.getAll().length).toBe(1);
		});
	});

	// -----------------------------------------------------------------------
	// Webhook processing failure emission
	// -----------------------------------------------------------------------

	describe("emitWebhookProcessingFailure", () => {
		it("emits a webhook-processing-failure alert", () => {
			const alert = service.emitWebhookProcessingFailure({
				failureType: "webhook-signature-verification-failed",
				tenantId: TENANT_A,
				eventId: "whevt-1",
				provider: "stripe",
				errorMessage: "Signature mismatch",
			});

			expect(alert.category).toBe("webhook-processing-failure");
			expect(alert.severity).toBe("warning");
			expect(alert.context.sourceModule).toBe("webhook");
			expect(alert.context.entityId).toBe("whevt-1");
			expect(alert.context.entityType).toBe("webhook-event");
		});

		it("emits critical for webhook-dead-letter", () => {
			const alert = service.emitWebhookProcessingFailure({
				failureType: "webhook-dead-letter",
				tenantId: TENANT_A,
				eventId: "whevt-2",
				retryCount: 5,
				maxRetries: 5,
			});

			expect(alert.severity).toBe("critical");
			expect(alert.context.retryCount).toBe(5);
			expect(alert.context.maxRetries).toBe(5);
		});

		it("allows null tenantId for unresolved webhooks", () => {
			const alert = service.emitWebhookProcessingFailure({
				failureType: "webhook-processing-failed",
				tenantId: null,
				eventId: "whevt-3",
			});

			expect(alert.tenantId).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// Notification delivery failure emission
	// -----------------------------------------------------------------------

	describe("emitNotificationDeliveryFailure", () => {
		it("emits a notification-delivery-failure alert", () => {
			const alert = service.emitNotificationDeliveryFailure({
				failureType: "notification-delivery-failed",
				tenantId: TENANT_A,
				deliveryId: "del-1",
				channel: "email",
				retryCount: 2,
				maxRetries: 3,
				errorMessage: "SMTP connection refused",
			});

			expect(alert.category).toBe("notification-delivery-failure");
			expect(alert.severity).toBe("warning");
			expect(alert.context.sourceModule).toBe("notification");
			expect(alert.context.entityId).toBe("del-1");
			expect(alert.context.retryCount).toBe(2);
			expect(alert.context.maxRetries).toBe(3);
		});

		it("emits info for notification-delivery-bounced", () => {
			const alert = service.emitNotificationDeliveryFailure({
				failureType: "notification-delivery-bounced",
				tenantId: TENANT_A,
				deliveryId: "del-2",
			});

			expect(alert.severity).toBe("info");
		});

		it("emits critical for notification-delivery-dead-letter", () => {
			const alert = service.emitNotificationDeliveryFailure({
				failureType: "notification-delivery-dead-letter",
				tenantId: TENANT_A,
				deliveryId: "del-3",
			});

			expect(alert.severity).toBe("critical");
		});
	});

	// -----------------------------------------------------------------------
	// Provider outage emission
	// -----------------------------------------------------------------------

	describe("emitProviderOutage", () => {
		it("emits a provider-api-outage alert", () => {
			const alert = service.emitProviderOutage({
				failureType: "provider-api-timeout",
				tenantId: null,
				provider: "stripe",
				errorMessage: "Connection timeout after 30s",
			});

			expect(alert.category).toBe("provider-api-outage");
			expect(alert.severity).toBe("warning");
			expect(alert.context.provider).toBe("stripe");
		});

		it("emits info for rate limiting", () => {
			const alert = service.emitProviderOutage({
				failureType: "provider-rate-limited",
				tenantId: null,
				provider: "square",
				errorCode: "429",
			});

			expect(alert.severity).toBe("info");
			expect(alert.context.errorCode).toBe("429");
		});
	});

	// -----------------------------------------------------------------------
	// Storage tests
	// -----------------------------------------------------------------------

	describe("event storage", () => {
		it("persists events with full metadata", () => {
			service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
				connectionId: "conn-1",
				provider: "stripe",
				errorMessage: "Bad key",
			});

			const stored = repository.getAll();
			expect(stored.length).toBe(1);
			const event = stored[0];
			expect(event.id).toBeDefined();
			expect(event.category).toBe("payment-connection-failure");
			expect(event.severity).toBe("warning");
			expect(event.tenantId).toBe(TENANT_A);
			expect(event.timestamp).toBeDefined();
			expect(event.summary).toBeDefined();
			expect(event.context.sourceModule).toBe("payment");
			expect(event.resolutionHint.length).toBeGreaterThan(0);
			expect(event.acknowledged).toBe(false);
			expect(event.occurrenceCount).toBe(1);
		});

		it("increments occurrence count for repeated failures", () => {
			service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
			});
			const second = service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
			});

			expect(second.occurrenceCount).toBe(2);
		});

		it("tracks occurrences separately per tenant", () => {
			service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
			});
			const alertB = service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_B,
			});

			expect(alertB.occurrenceCount).toBe(1);
		});
	});

	// -----------------------------------------------------------------------
	// Escalation tests
	// -----------------------------------------------------------------------

	describe("severity escalation", () => {
		it("escalates warning to critical after threshold (payment: 3)", () => {
			// First 2 should be warning
			const first = service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
			});
			const second = service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
			});
			expect(first.severity).toBe("warning");
			expect(second.severity).toBe("warning");

			// Third should escalate to critical
			const third = service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
			});
			expect(third.severity).toBe("critical");
		});

		it("does not escalate already-critical alerts", () => {
			const alert = service.emitPaymentConnectionFailure({
				failureType: "payment-connection-suspended",
				tenantId: TENANT_A,
			});
			expect(alert.severity).toBe("critical");
		});
	});

	// -----------------------------------------------------------------------
	// Query methods (for platform-admin views)
	// -----------------------------------------------------------------------

	describe("listAlerts", () => {
		beforeEach(() => {
			service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
			});
			service.emitWebhookProcessingFailure({
				failureType: "webhook-processing-failed",
				tenantId: TENANT_A,
			});
			service.emitNotificationDeliveryFailure({
				failureType: "notification-delivery-failed",
				tenantId: TENANT_B,
			});
		});

		it("returns all alerts when no filters applied", () => {
			const result = service.listAlerts({});
			expect(result.alerts.length).toBe(3);
			expect(result.total).toBe(3);
		});

		it("filters by category", () => {
			const result = service.listAlerts({
				category: "payment-connection-failure",
			});
			expect(result.alerts.length).toBe(1);
			expect(result.alerts[0].category).toBe(
				"payment-connection-failure",
			);
		});

		it("filters by severity", () => {
			const result = service.listAlerts({ severity: "warning" });
			expect(result.alerts.length).toBe(3);
		});

		it("filters by tenantId", () => {
			const result = service.listAlerts({ tenantId: TENANT_B });
			expect(result.alerts.length).toBe(1);
			expect(result.alerts[0].tenantId).toBe(TENANT_B);
		});

		it("paginates results", () => {
			const page1 = service.listAlerts({ limit: 2, offset: 0 });
			expect(page1.alerts.length).toBe(2);
			expect(page1.total).toBe(3);

			const page2 = service.listAlerts({ limit: 2, offset: 2 });
			expect(page2.alerts.length).toBe(1);
		});

		it("returns summary fields only (no context or resolutionHint)", () => {
			const result = service.listAlerts({});
			const alert = result.alerts[0];
			expect(alert.id).toBeDefined();
			expect(alert.category).toBeDefined();
			expect(alert.severity).toBeDefined();
			expect(alert.summary).toBeDefined();
			expect(alert.timestamp).toBeDefined();
			expect((alert as Record<string, unknown>)["context"]).toBeUndefined();
			expect(
				(alert as Record<string, unknown>)["resolutionHint"],
			).toBeUndefined();
		});
	});

	describe("getAlertDetail", () => {
		it("returns full detail including context and resolution hint", () => {
			const emitted = service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
				connectionId: "conn-1",
				provider: "stripe",
				errorMessage: "Bad key",
			});

			const detail = service.getAlertDetail(emitted.id);
			expect(detail).not.toBeNull();
			expect(detail!.id).toBe(emitted.id);
			expect(detail!.context.sourceModule).toBe("payment");
			expect(detail!.context.entityId).toBe("conn-1");
			expect(detail!.resolutionHint.length).toBeGreaterThan(0);
		});

		it("returns null for unknown id", () => {
			expect(service.getAlertDetail("nonexistent")).toBeNull();
		});
	});

	describe("acknowledgeAlert", () => {
		it("marks an alert as acknowledged", () => {
			const alert = service.emitPaymentConnectionFailure({
				failureType: "payment-credential-verification-failed",
				tenantId: TENANT_A,
			});

			expect(service.acknowledgeAlert(alert.id)).toBe(true);
			const detail = service.getAlertDetail(alert.id);
			expect(detail!.acknowledged).toBe(true);
		});

		it("returns false for unknown id", () => {
			expect(service.acknowledgeAlert("nonexistent")).toBe(false);
		});
	});

	describe("getDashboardMetrics", () => {
		it("returns aggregated metrics", () => {
			service.emitPaymentConnectionFailure({
				failureType: "payment-connection-suspended",
				tenantId: TENANT_A,
			});
			service.emitWebhookProcessingFailure({
				failureType: "webhook-processing-failed",
				tenantId: TENANT_A,
			});
			service.emitNotificationDeliveryFailure({
				failureType: "notification-delivery-bounced",
				tenantId: TENANT_B,
			});

			const metrics = service.getDashboardMetrics();
			expect(metrics.totalAlerts).toBe(3);
			expect(metrics.unacknowledgedCount).toBe(3);
			expect(metrics.bySeverity.critical).toBe(1);
			expect(metrics.bySeverity.warning).toBe(1);
			expect(metrics.bySeverity.info).toBe(1);
			expect(metrics.byCategory["payment-connection-failure"]).toBe(1);
			expect(metrics.byCategory["webhook-processing-failure"]).toBe(1);
			expect(metrics.byCategory["notification-delivery-failure"]).toBe(1);
			expect(metrics.recentCritical.length).toBe(1);
		});
	});
});
