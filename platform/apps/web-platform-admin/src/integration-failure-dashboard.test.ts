// E8-S6-T3: Platform-admin integration failure dashboard view tests.
// Validates display helpers, state management, and security assertions.

import { describe, it, expect } from "vitest";
import type {
	OperationalAlertSummary,
	OperationalAlertDetail,
	OperationalAlertDashboardMetrics,
} from "@platform/types";
import {
	createDefaultDashboardFilters,
	describeFailureDashboardState,
	describeAlertDetailState,
	getCategoryLabel,
	getSeverityLabel,
	getSeverityColorClass,
	getCategoryIconClass,
	buildAlertEventRow,
	buildAlertDetailView,
	buildDashboardMetricsView,
	assertNoSecretsInFailureDashboard,
	type FailureDashboardViewState,
	type AlertDetailViewState,
} from "./integration-failure-dashboard";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function sampleAlertSummary(
	overrides?: Partial<OperationalAlertSummary>,
): OperationalAlertSummary {
	return {
		id: "alert-1",
		category: "payment-connection-failure",
		severity: "warning",
		tenantId: "tenant-1",
		summary: "Payment credential verification failed for Stripe",
		occurrenceCount: 1,
		acknowledged: false,
		timestamp: "2026-03-22T12:00:00.000Z",
		...overrides,
	};
}

function sampleAlertDetail(
	overrides?: Partial<OperationalAlertDetail>,
): OperationalAlertDetail {
	return {
		id: "alert-1",
		category: "payment-connection-failure",
		severity: "warning",
		tenantId: "tenant-1",
		summary: "Payment credential verification failed for Stripe",
		occurrenceCount: 1,
		acknowledged: false,
		timestamp: "2026-03-22T12:00:00.000Z",
		context: {
			sourceModule: "payment",
			entityId: "conn-1",
			entityType: "payment-connection",
			provider: "stripe",
			retryCount: 0,
			maxRetries: 3,
			errorMessage: "API returned 401",
		},
		resolutionHint: "Re-verify provider credentials.",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// View state descriptions
// ---------------------------------------------------------------------------

describe("describeFailureDashboardState", () => {
	it("returns loading message", () => {
		expect(describeFailureDashboardState({ kind: "loading" })).toBe(
			"Loading integration failure data…",
		);
	});

	it("returns alert count in ready state", () => {
		const state: FailureDashboardViewState = {
			kind: "ready",
			alerts: [buildAlertEventRow(sampleAlertSummary())],
			totalCount: 1,
			filters: createDefaultDashboardFilters(),
			metrics: buildDashboardMetricsView({
				totalAlerts: 1,
				unacknowledgedCount: 1,
				bySeverity: { critical: 0, warning: 1, info: 0 },
				byCategory: {
					"payment-connection-failure": 1,
					"webhook-processing-failure": 0,
					"notification-delivery-failure": 0,
					"provider-api-outage": 0,
				},
				recentCritical: [],
			}),
		};
		expect(describeFailureDashboardState(state)).toBe("1 alert(s) found.");
	});

	it("returns error message", () => {
		const state: FailureDashboardViewState = {
			kind: "error",
			message: "Failed to load alerts.",
		};
		expect(describeFailureDashboardState(state)).toBe(
			"Failed to load alerts.",
		);
	});
});

describe("describeAlertDetailState", () => {
	it("returns loading message", () => {
		expect(describeAlertDetailState({ kind: "loading" })).toBe(
			"Loading alert detail…",
		);
	});

	it("returns alert ID and category in ready state", () => {
		const state: AlertDetailViewState = {
			kind: "ready",
			detail: buildAlertDetailView(sampleAlertDetail()),
		};
		expect(describeAlertDetailState(state)).toBe(
			"Alert alert-1 — Payment Connection Failure",
		);
	});

	it("returns error message", () => {
		const state: AlertDetailViewState = {
			kind: "error",
			message: "Alert not found.",
		};
		expect(describeAlertDetailState(state)).toBe("Alert not found.");
	});
});

// ---------------------------------------------------------------------------
// Default filters
// ---------------------------------------------------------------------------

describe("createDefaultDashboardFilters", () => {
	it("returns all null filters", () => {
		const filters = createDefaultDashboardFilters();
		expect(filters.category).toBeNull();
		expect(filters.severity).toBeNull();
		expect(filters.tenantId).toBeNull();
		expect(filters.acknowledged).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Category / severity display
// ---------------------------------------------------------------------------

describe("getCategoryLabel", () => {
	it("returns correct label for each category", () => {
		expect(getCategoryLabel("payment-connection-failure")).toBe(
			"Payment Connection Failure",
		);
		expect(getCategoryLabel("webhook-processing-failure")).toBe(
			"Webhook Processing Failure",
		);
		expect(getCategoryLabel("notification-delivery-failure")).toBe(
			"Notification Delivery Failure",
		);
		expect(getCategoryLabel("provider-api-outage")).toBe(
			"Provider API Outage",
		);
	});
});

describe("getSeverityLabel", () => {
	it("returns correct label for each severity", () => {
		expect(getSeverityLabel("critical")).toBe("Critical");
		expect(getSeverityLabel("warning")).toBe("Warning");
		expect(getSeverityLabel("info")).toBe("Info");
	});
});

describe("getSeverityColorClass", () => {
	it("returns danger for critical", () => {
		expect(getSeverityColorClass("critical")).toBe("text-danger");
	});

	it("returns warning for warning", () => {
		expect(getSeverityColorClass("warning")).toBe("text-warning");
	});

	it("returns info for info", () => {
		expect(getSeverityColorClass("info")).toBe("text-info");
	});
});

describe("getCategoryIconClass", () => {
	it("returns icon class for each category", () => {
		expect(getCategoryIconClass("payment-connection-failure")).toBe(
			"icon-credit-card",
		);
		expect(getCategoryIconClass("webhook-processing-failure")).toBe(
			"icon-webhook",
		);
		expect(getCategoryIconClass("notification-delivery-failure")).toBe(
			"icon-bell",
		);
		expect(getCategoryIconClass("provider-api-outage")).toBe(
			"icon-cloud-off",
		);
	});
});

// ---------------------------------------------------------------------------
// Alert event row
// ---------------------------------------------------------------------------

describe("buildAlertEventRow", () => {
	it("builds display row from summary", () => {
		const row = buildAlertEventRow(sampleAlertSummary());
		expect(row.id).toBe("alert-1");
		expect(row.categoryLabel).toBe("Payment Connection Failure");
		expect(row.severityLabel).toBe("Warning");
		expect(row.severityColorClass).toBe("text-warning");
		expect(row.tenantId).toBe("tenant-1");
		expect(row.summary).toContain("Stripe");
		expect(row.occurrenceCount).toBe(1);
		expect(row.acknowledged).toBe(false);
	});

	it("shows dash for null tenantId", () => {
		const row = buildAlertEventRow(
			sampleAlertSummary({ tenantId: null }),
		);
		expect(row.tenantId).toBe("—");
	});
});

// ---------------------------------------------------------------------------
// Alert detail view
// ---------------------------------------------------------------------------

describe("buildAlertDetailView", () => {
	it("builds full detail view from alert detail", () => {
		const view = buildAlertDetailView(sampleAlertDetail());
		expect(view.id).toBe("alert-1");
		expect(view.sourceModule).toBe("payment");
		expect(view.entityId).toBe("conn-1");
		expect(view.entityType).toBe("payment-connection");
		expect(view.provider).toBe("stripe");
		expect(view.retryCount).toBe("0");
		expect(view.maxRetries).toBe("3");
		expect(view.errorMessage).toBe("API returned 401");
		expect(view.resolutionHint).toBe("Re-verify provider credentials.");
	});

	it("shows dash for missing optional context fields", () => {
		const view = buildAlertDetailView(
			sampleAlertDetail({
				context: {
					sourceModule: "webhook",
				},
			}),
		);
		expect(view.entityId).toBe("—");
		expect(view.entityType).toBe("—");
		expect(view.provider).toBe("—");
		expect(view.retryCount).toBe("—");
		expect(view.maxRetries).toBe("—");
		expect(view.lastAttemptAt).toBe("—");
		expect(view.errorMessage).toBe("—");
	});
});

// ---------------------------------------------------------------------------
// Dashboard metrics
// ---------------------------------------------------------------------------

describe("buildDashboardMetricsView", () => {
	it("builds metrics view from dashboard metrics", () => {
		const metrics: OperationalAlertDashboardMetrics = {
			totalAlerts: 15,
			unacknowledgedCount: 10,
			bySeverity: { critical: 3, warning: 7, info: 5 },
			byCategory: {
				"payment-connection-failure": 4,
				"webhook-processing-failure": 5,
				"notification-delivery-failure": 3,
				"provider-api-outage": 3,
			},
			recentCritical: [
				sampleAlertSummary({ severity: "critical" }),
			],
		};

		const view = buildDashboardMetricsView(metrics);
		expect(view.totalAlerts).toBe(15);
		expect(view.unacknowledgedCount).toBe(10);
		expect(view.criticalCount).toBe(3);
		expect(view.warningCount).toBe(7);
		expect(view.infoCount).toBe(5);
		expect(view.recentCriticalRows.length).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Security assertions
// ---------------------------------------------------------------------------

describe("assertNoSecretsInFailureDashboard", () => {
	it("passes for clean alert event row", () => {
		const row = buildAlertEventRow(sampleAlertSummary());
		expect(assertNoSecretsInFailureDashboard(row)).toBe(true);
	});

	it("passes for clean detail view", () => {
		const view = buildAlertDetailView(sampleAlertDetail());
		expect(assertNoSecretsInFailureDashboard(view)).toBe(true);
	});

	it("fails if encryptedCredentials appears", () => {
		const bad = {
			...buildAlertEventRow(sampleAlertSummary()),
			summary: "encryptedCredentials leaked",
		};
		expect(assertNoSecretsInFailureDashboard(bad)).toBe(false);
	});

	it("fails if secretKey appears", () => {
		const bad = {
			...buildAlertDetailView(sampleAlertDetail()),
			errorMessage: "secretKey: sk_test_xxx",
		};
		expect(assertNoSecretsInFailureDashboard(bad)).toBe(false);
	});

	it("fails if PII fields appear", () => {
		const bad = {
			...buildAlertEventRow(sampleAlertSummary()),
			summary: "Failure for cardNumber 4111...",
		};
		expect(assertNoSecretsInFailureDashboard(bad)).toBe(false);
	});
});
