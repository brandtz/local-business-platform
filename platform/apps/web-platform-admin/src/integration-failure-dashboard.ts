// E8-S6-T3: Platform-admin integration failure dashboard views.
// Displays operational alert events with filtering, detail views, and
// severity distribution. SECURITY: Only platform-admin role can access.
// SECURITY: NEVER shows payment secrets or customer PII.

import type {
	OperationalAlertSummary,
	OperationalAlertDetail,
	AlertCategory,
	AlertSeverity,
	OperationalAlertDashboardMetrics,
} from "@platform/types";

// ---------------------------------------------------------------------------
// View state
// ---------------------------------------------------------------------------

export type FailureDashboardViewState =
	| { kind: "loading" }
	| {
			kind: "ready";
			alerts: AlertEventRow[];
			totalCount: number;
			filters: FailureDashboardFilters;
			metrics: DashboardMetricsView;
	  }
	| { kind: "error"; message: string };

export type AlertDetailViewState =
	| { kind: "loading" }
	| { kind: "ready"; detail: AlertDetailView }
	| { kind: "error"; message: string };

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type FailureDashboardFilters = {
	category: AlertCategory | null;
	severity: AlertSeverity | null;
	tenantId: string | null;
	acknowledged: boolean | null;
};

export function createDefaultDashboardFilters(): FailureDashboardFilters {
	return {
		category: null,
		severity: null,
		tenantId: null,
		acknowledged: null,
	};
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function describeFailureDashboardState(
	state: FailureDashboardViewState,
): string {
	switch (state.kind) {
		case "loading":
			return "Loading integration failure data…";
		case "ready":
			return `${state.totalCount} alert(s) found.`;
		case "error":
			return state.message;
	}
}

export function describeAlertDetailState(
	state: AlertDetailViewState,
): string {
	switch (state.kind) {
		case "loading":
			return "Loading alert detail…";
		case "ready":
			return `Alert ${state.detail.id} — ${state.detail.categoryLabel}`;
		case "error":
			return state.message;
	}
}

// ---------------------------------------------------------------------------
// Category and severity display
// ---------------------------------------------------------------------------

const categoryLabels: Record<AlertCategory, string> = {
	"payment-connection-failure": "Payment Connection Failure",
	"webhook-processing-failure": "Webhook Processing Failure",
	"notification-delivery-failure": "Notification Delivery Failure",
	"provider-api-outage": "Provider API Outage",
};

const severityLabels: Record<AlertSeverity, string> = {
	critical: "Critical",
	warning: "Warning",
	info: "Info",
};

const severityColorClasses: Record<AlertSeverity, string> = {
	critical: "text-danger",
	warning: "text-warning",
	info: "text-info",
};

const categoryIconClasses: Record<AlertCategory, string> = {
	"payment-connection-failure": "icon-credit-card",
	"webhook-processing-failure": "icon-webhook",
	"notification-delivery-failure": "icon-bell",
	"provider-api-outage": "icon-cloud-off",
};

export function getCategoryLabel(category: AlertCategory): string {
	return categoryLabels[category];
}

export function getSeverityLabel(severity: AlertSeverity): string {
	return severityLabels[severity];
}

export function getSeverityColorClass(severity: AlertSeverity): string {
	return severityColorClasses[severity];
}

export function getCategoryIconClass(category: AlertCategory): string {
	return categoryIconClasses[category];
}

// ---------------------------------------------------------------------------
// Alert event row (summary list)
// ---------------------------------------------------------------------------

export type AlertEventRow = {
	id: string;
	categoryLabel: string;
	categoryIconClass: string;
	severityLabel: string;
	severityColorClass: string;
	tenantId: string;
	summary: string;
	occurrenceCount: number;
	acknowledged: boolean;
	timestamp: string;
};

export function buildAlertEventRow(
	alert: OperationalAlertSummary,
): AlertEventRow {
	return {
		id: alert.id,
		categoryLabel: getCategoryLabel(alert.category),
		categoryIconClass: getCategoryIconClass(alert.category),
		severityLabel: getSeverityLabel(alert.severity),
		severityColorClass: getSeverityColorClass(alert.severity),
		tenantId: alert.tenantId ?? "—",
		summary: alert.summary,
		occurrenceCount: alert.occurrenceCount,
		acknowledged: alert.acknowledged,
		timestamp: alert.timestamp,
	};
}

// ---------------------------------------------------------------------------
// Alert detail view
// ---------------------------------------------------------------------------

export type AlertDetailView = {
	id: string;
	categoryLabel: string;
	categoryIconClass: string;
	severityLabel: string;
	severityColorClass: string;
	tenantId: string;
	summary: string;
	occurrenceCount: number;
	acknowledged: boolean;
	timestamp: string;
	sourceModule: string;
	entityId: string;
	entityType: string;
	provider: string;
	retryCount: string;
	maxRetries: string;
	lastAttemptAt: string;
	errorMessage: string;
	resolutionHint: string;
};

export function buildAlertDetailView(
	detail: OperationalAlertDetail,
): AlertDetailView {
	return {
		id: detail.id,
		categoryLabel: getCategoryLabel(detail.category),
		categoryIconClass: getCategoryIconClass(detail.category),
		severityLabel: getSeverityLabel(detail.severity),
		severityColorClass: getSeverityColorClass(detail.severity),
		tenantId: detail.tenantId ?? "—",
		summary: detail.summary,
		occurrenceCount: detail.occurrenceCount,
		acknowledged: detail.acknowledged,
		timestamp: detail.timestamp,
		sourceModule: detail.context.sourceModule,
		entityId: detail.context.entityId ?? "—",
		entityType: detail.context.entityType ?? "—",
		provider: detail.context.provider ?? "—",
		retryCount: detail.context.retryCount?.toString() ?? "—",
		maxRetries: detail.context.maxRetries?.toString() ?? "—",
		lastAttemptAt: detail.context.lastAttemptAt ?? "—",
		errorMessage: detail.context.errorMessage ?? "—",
		resolutionHint: detail.resolutionHint,
	};
}

// ---------------------------------------------------------------------------
// Dashboard metrics display
// ---------------------------------------------------------------------------

export type DashboardMetricsView = {
	totalAlerts: number;
	unacknowledgedCount: number;
	criticalCount: number;
	warningCount: number;
	infoCount: number;
	recentCriticalRows: AlertEventRow[];
};

export function buildDashboardMetricsView(
	metrics: OperationalAlertDashboardMetrics,
): DashboardMetricsView {
	return {
		totalAlerts: metrics.totalAlerts,
		unacknowledgedCount: metrics.unacknowledgedCount,
		criticalCount: metrics.bySeverity.critical,
		warningCount: metrics.bySeverity.warning,
		infoCount: metrics.bySeverity.info,
		recentCriticalRows: metrics.recentCritical.map(buildAlertEventRow),
	};
}

// ---------------------------------------------------------------------------
// SECURITY: Assert no secrets in view data
// ---------------------------------------------------------------------------

/**
 * Validates that alert view data does not contain any credential data.
 * Defensive check for platform admin views.
 */
export function assertNoSecretsInFailureDashboard(
	data: AlertEventRow | AlertDetailView | DashboardMetricsView,
): boolean {
	const str = JSON.stringify(data);
	const forbidden = [
		"encryptedCredentials",
		"credentialsIv",
		"credentialsTag",
		"secretKey",
		"accessToken",
		"publishableKey",
		"webhookSecret",
		"signatureKey",
		"cardNumber",
		"rawCardNumber",
		"pan",
	];
	return !forbidden.some((f) => str.includes(f));
}
