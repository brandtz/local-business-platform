// ---------------------------------------------------------------------------
// E8-S6-T1: Integration failure alert taxonomy tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
	alertCategories,
	alertSeverities,
	integrationFailureTypes,
	failureClassification,
	defaultEscalationRules,
	defaultResolutionHints,
	isAlertCategory,
	isAlertSeverity,
	classifyFailure,
	shouldEscalate,
	applyEscalation,
	type AlertCategory,
	type OperationalAlertEvent,
	type EscalationRule,
} from "./integration-alerts";

// ---------------------------------------------------------------------------
// Classification tests
// ---------------------------------------------------------------------------

describe("classifyFailure", () => {
	it("classifies payment-credential-verification-failed as payment-connection-failure / warning", () => {
		const result = classifyFailure("payment-credential-verification-failed");
		expect(result.category).toBe("payment-connection-failure");
		expect(result.severity).toBe("warning");
	});

	it("classifies payment-connection-suspended as payment-connection-failure / critical", () => {
		const result = classifyFailure("payment-connection-suspended");
		expect(result.category).toBe("payment-connection-failure");
		expect(result.severity).toBe("critical");
	});

	it("classifies webhook-dead-letter as webhook-processing-failure / critical", () => {
		const result = classifyFailure("webhook-dead-letter");
		expect(result.category).toBe("webhook-processing-failure");
		expect(result.severity).toBe("critical");
	});

	it("classifies notification-delivery-dead-letter as notification-delivery-failure / critical", () => {
		const result = classifyFailure("notification-delivery-dead-letter");
		expect(result.category).toBe("notification-delivery-failure");
		expect(result.severity).toBe("critical");
	});

	it("classifies provider-api-timeout as provider-api-outage / warning", () => {
		const result = classifyFailure("provider-api-timeout");
		expect(result.category).toBe("provider-api-outage");
		expect(result.severity).toBe("warning");
	});

	it("classifies provider-rate-limited as provider-api-outage / info", () => {
		const result = classifyFailure("provider-rate-limited");
		expect(result.category).toBe("provider-api-outage");
		expect(result.severity).toBe("info");
	});
});

// ---------------------------------------------------------------------------
// Completeness tests
// ---------------------------------------------------------------------------

describe("failure classification completeness", () => {
	it("every known failure type has a corresponding classification", () => {
		for (const failureType of integrationFailureTypes) {
			const classification = failureClassification[failureType];
			expect(classification).toBeDefined();
			expect(alertCategories).toContain(classification.category);
			expect(alertSeverities).toContain(classification.severity);
		}
	});

	it("every alert category has at least one failure type mapped to it", () => {
		for (const category of alertCategories) {
			const mapped = integrationFailureTypes.filter(
				(ft) => failureClassification[ft].category === category,
			);
			expect(mapped.length).toBeGreaterThan(0);
		}
	});

	it("every alert category has a default escalation rule", () => {
		for (const category of alertCategories) {
			const rule = defaultEscalationRules[category];
			expect(rule).toBeDefined();
			expect(rule.threshold).toBeGreaterThan(0);
			expect(rule.windowMs).toBeGreaterThan(0);
		}
	});

	it("every failure type has a default resolution hint", () => {
		for (const failureType of integrationFailureTypes) {
			const hint = defaultResolutionHints[failureType];
			expect(hint).toBeDefined();
			expect(hint.length).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

describe("isAlertCategory", () => {
	it("returns true for valid categories", () => {
		for (const category of alertCategories) {
			expect(isAlertCategory(category)).toBe(true);
		}
	});

	it("returns false for invalid categories", () => {
		expect(isAlertCategory("unknown")).toBe(false);
		expect(isAlertCategory("")).toBe(false);
		expect(isAlertCategory("Payment-Connection-Failure")).toBe(false);
	});
});

describe("isAlertSeverity", () => {
	it("returns true for valid severities", () => {
		for (const severity of alertSeverities) {
			expect(isAlertSeverity(severity)).toBe(true);
		}
	});

	it("returns false for invalid severities", () => {
		expect(isAlertSeverity("error")).toBe(false);
		expect(isAlertSeverity("")).toBe(false);
		expect(isAlertSeverity("CRITICAL")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Metadata tests
// ---------------------------------------------------------------------------

describe("OperationalAlertEvent metadata", () => {
	it("includes all required fields", () => {
		const alert: OperationalAlertEvent = {
			id: "alert-001",
			category: "payment-connection-failure",
			severity: "warning",
			tenantId: "tenant-1",
			timestamp: "2026-03-22T12:00:00.000Z",
			summary: "Payment credential verification failed for Stripe",
			context: {
				sourceModule: "payment",
				entityId: "conn-001",
				entityType: "payment-connection",
				provider: "stripe",
				retryCount: 0,
				maxRetries: 3,
				errorMessage: "Invalid API key",
			},
			resolutionHint:
				"Verify the payment provider credentials are correct and not expired.",
			acknowledged: false,
			occurrenceCount: 1,
		};

		expect(alert.id).toBeDefined();
		expect(alert.category).toBeDefined();
		expect(alert.severity).toBeDefined();
		expect(alert.tenantId).toBeDefined();
		expect(alert.timestamp).toBeDefined();
		expect(alert.summary).toBeDefined();
		expect(alert.context).toBeDefined();
		expect(alert.context.sourceModule).toBeDefined();
		expect(alert.resolutionHint).toBeDefined();
		expect(typeof alert.acknowledged).toBe("boolean");
		expect(typeof alert.occurrenceCount).toBe("number");
	});

	it("allows null tenantId for platform-wide alerts", () => {
		const alert: OperationalAlertEvent = {
			id: "alert-002",
			category: "provider-api-outage",
			severity: "critical",
			tenantId: null,
			timestamp: "2026-03-22T12:00:00.000Z",
			summary: "Stripe API is not responding",
			context: {
				sourceModule: "payment",
				provider: "stripe",
				errorMessage: "Connection timeout",
			},
			resolutionHint: "Check provider status page.",
			acknowledged: false,
			occurrenceCount: 5,
		};

		expect(alert.tenantId).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Escalation tests
// ---------------------------------------------------------------------------

describe("shouldEscalate", () => {
	it("does not escalate when count is below threshold", () => {
		expect(shouldEscalate("payment-connection-failure", 1)).toBe(false);
		expect(shouldEscalate("payment-connection-failure", 2)).toBe(false);
	});

	it("escalates when count reaches threshold", () => {
		expect(shouldEscalate("payment-connection-failure", 3)).toBe(true);
	});

	it("escalates when count exceeds threshold", () => {
		expect(shouldEscalate("payment-connection-failure", 10)).toBe(true);
	});

	it("uses different thresholds per category", () => {
		// payment-connection-failure threshold: 3
		expect(shouldEscalate("payment-connection-failure", 3)).toBe(true);
		// webhook-processing-failure threshold: 5
		expect(shouldEscalate("webhook-processing-failure", 3)).toBe(false);
		expect(shouldEscalate("webhook-processing-failure", 5)).toBe(true);
		// notification-delivery-failure threshold: 10
		expect(shouldEscalate("notification-delivery-failure", 5)).toBe(false);
		expect(shouldEscalate("notification-delivery-failure", 10)).toBe(true);
	});

	it("supports custom escalation rules", () => {
		const customRules: Record<AlertCategory, EscalationRule> = {
			"payment-connection-failure": { threshold: 1, windowMs: 60_000 },
			"webhook-processing-failure": { threshold: 1, windowMs: 60_000 },
			"notification-delivery-failure": { threshold: 1, windowMs: 60_000 },
			"provider-api-outage": { threshold: 1, windowMs: 60_000 },
		};
		expect(
			shouldEscalate("payment-connection-failure", 1, customRules),
		).toBe(true);
	});
});

describe("applyEscalation", () => {
	it("keeps critical severity unchanged", () => {
		expect(
			applyEscalation("payment-connection-failure", "critical", 1),
		).toBe("critical");
	});

	it("escalates warning to critical when threshold reached", () => {
		expect(
			applyEscalation("payment-connection-failure", "warning", 3),
		).toBe("critical");
	});

	it("does not escalate warning below threshold", () => {
		expect(
			applyEscalation("payment-connection-failure", "warning", 1),
		).toBe("warning");
	});

	it("escalates info to critical when threshold reached", () => {
		expect(
			applyEscalation("provider-api-outage", "info", 3),
		).toBe("critical");
	});

	it("does not escalate info below threshold", () => {
		expect(
			applyEscalation("provider-api-outage", "info", 1),
		).toBe("info");
	});
});
