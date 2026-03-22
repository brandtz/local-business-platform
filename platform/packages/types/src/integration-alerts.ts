// ---------------------------------------------------------------------------
// E8-S6-T1: Integration failure alert taxonomy
// ---------------------------------------------------------------------------

/**
 * Alert categories for integration failures.
 * Each category maps to a specific integration module and failure domain.
 */
export const alertCategories = [
	"payment-connection-failure",
	"webhook-processing-failure",
	"notification-delivery-failure",
	"provider-api-outage",
] as const;
export type AlertCategory = (typeof alertCategories)[number];

/**
 * Severity levels for operational alerts.
 * - critical: requires immediate operator attention
 * - warning: should be investigated within SLA
 * - info: informational, no immediate action required
 */
export const alertSeverities = ["critical", "warning", "info"] as const;
export type AlertSeverity = (typeof alertSeverities)[number];

/**
 * Checks whether a string is a valid alert category.
 */
export function isAlertCategory(value: string): value is AlertCategory {
	return (alertCategories as readonly string[]).includes(value);
}

/**
 * Checks whether a string is a valid alert severity.
 */
export function isAlertSeverity(value: string): value is AlertSeverity {
	return (alertSeverities as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Alert metadata structure
// ---------------------------------------------------------------------------

/**
 * Structured operational alert event emitted by integration modules.
 * Machine-parseable for downstream alerting integrations and platform views.
 */
export type OperationalAlertEvent = {
	/** Unique identifier for this alert event. */
	id: string;
	/** Alert category (maps to integration domain). */
	category: AlertCategory;
	/** Severity level. */
	severity: AlertSeverity;
	/** Tenant ID where the failure occurred, null for platform-wide alerts. */
	tenantId: string | null;
	/** ISO 8601 timestamp when the alert was created. */
	timestamp: string;
	/** Human-readable summary of what happened. */
	summary: string;
	/** Structured context payload with failure details. */
	context: AlertContext;
	/** Resolution hint for the operator. */
	resolutionHint: string;
	/** Whether this alert has been acknowledged by an operator. */
	acknowledged: boolean;
	/** Number of occurrences of this failure pattern within the escalation window. */
	occurrenceCount: number;
};

/**
 * Structured context payload for operational alerts.
 * Contains enough information for an operator to diagnose the failure.
 */
export type AlertContext = {
	/** Integration module that raised the alert (e.g. "payment", "webhook", "notification"). */
	sourceModule: string;
	/** Specific entity ID related to the failure (connection ID, event ID, delivery ID). */
	entityId?: string;
	/** Entity type (e.g. "payment-connection", "webhook-event", "notification-delivery"). */
	entityType?: string;
	/** Provider involved in the failure (e.g. "stripe", "square"). */
	provider?: string;
	/** Number of retry attempts so far. */
	retryCount?: number;
	/** Maximum retry attempts configured. */
	maxRetries?: number;
	/** ISO 8601 timestamp of the last retry attempt. */
	lastAttemptAt?: string;
	/** Error message from the most recent failure. */
	errorMessage?: string;
	/** Error code if available. */
	errorCode?: string;
	/** Additional metadata specific to the failure type. */
	metadata?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Failure type classification
// ---------------------------------------------------------------------------

/**
 * Known integration failure types that map to alert categories and severities.
 */
export const integrationFailureTypes = [
	"payment-credential-verification-failed",
	"payment-connection-suspended",
	"payment-health-check-failed",
	"payment-transaction-failed",
	"webhook-signature-verification-failed",
	"webhook-processing-failed",
	"webhook-replay-failed",
	"webhook-dead-letter",
	"notification-delivery-failed",
	"notification-delivery-bounced",
	"notification-delivery-dead-letter",
	"notification-provider-error",
	"provider-api-timeout",
	"provider-api-error",
	"provider-rate-limited",
] as const;
export type IntegrationFailureType =
	(typeof integrationFailureTypes)[number];

/**
 * Mapping from failure types to their default alert category and severity.
 */
export const failureClassification: Record<
	IntegrationFailureType,
	{ category: AlertCategory; severity: AlertSeverity }
> = {
	"payment-credential-verification-failed": {
		category: "payment-connection-failure",
		severity: "warning",
	},
	"payment-connection-suspended": {
		category: "payment-connection-failure",
		severity: "critical",
	},
	"payment-health-check-failed": {
		category: "payment-connection-failure",
		severity: "warning",
	},
	"payment-transaction-failed": {
		category: "payment-connection-failure",
		severity: "warning",
	},
	"webhook-signature-verification-failed": {
		category: "webhook-processing-failure",
		severity: "warning",
	},
	"webhook-processing-failed": {
		category: "webhook-processing-failure",
		severity: "warning",
	},
	"webhook-replay-failed": {
		category: "webhook-processing-failure",
		severity: "warning",
	},
	"webhook-dead-letter": {
		category: "webhook-processing-failure",
		severity: "critical",
	},
	"notification-delivery-failed": {
		category: "notification-delivery-failure",
		severity: "warning",
	},
	"notification-delivery-bounced": {
		category: "notification-delivery-failure",
		severity: "info",
	},
	"notification-delivery-dead-letter": {
		category: "notification-delivery-failure",
		severity: "critical",
	},
	"notification-provider-error": {
		category: "notification-delivery-failure",
		severity: "warning",
	},
	"provider-api-timeout": {
		category: "provider-api-outage",
		severity: "warning",
	},
	"provider-api-error": {
		category: "provider-api-outage",
		severity: "warning",
	},
	"provider-rate-limited": {
		category: "provider-api-outage",
		severity: "info",
	},
};

/**
 * Classifies a known failure type into its category and severity.
 */
export function classifyFailure(failureType: IntegrationFailureType): {
	category: AlertCategory;
	severity: AlertSeverity;
} {
	return failureClassification[failureType];
}

// ---------------------------------------------------------------------------
// Severity escalation
// ---------------------------------------------------------------------------

/**
 * Default escalation configuration.
 * When a warning-level failure occurs this many times within the time window,
 * the severity escalates to critical.
 */
export type EscalationRule = {
	/** Number of occurrences before escalation. */
	threshold: number;
	/** Time window in milliseconds. */
	windowMs: number;
};

/**
 * Default escalation rules per alert category.
 */
export const defaultEscalationRules: Record<AlertCategory, EscalationRule> = {
	"payment-connection-failure": { threshold: 3, windowMs: 3_600_000 },
	"webhook-processing-failure": { threshold: 5, windowMs: 3_600_000 },
	"notification-delivery-failure": { threshold: 10, windowMs: 3_600_000 },
	"provider-api-outage": { threshold: 3, windowMs: 1_800_000 },
};

/**
 * Determines whether an alert should be escalated to critical based on
 * occurrence count and escalation rules.
 */
export function shouldEscalate(
	category: AlertCategory,
	occurrenceCount: number,
	rules?: Record<AlertCategory, EscalationRule>,
): boolean {
	const effectiveRules = rules ?? defaultEscalationRules;
	const rule = effectiveRules[category];
	return occurrenceCount >= rule.threshold;
}

/**
 * Applies escalation logic to a severity level.
 * If the occurrence count exceeds the threshold and the current severity
 * is not already critical, escalates to critical.
 */
export function applyEscalation(
	category: AlertCategory,
	baseSeverity: AlertSeverity,
	occurrenceCount: number,
	rules?: Record<AlertCategory, EscalationRule>,
): AlertSeverity {
	if (baseSeverity === "critical") return "critical";
	if (shouldEscalate(category, occurrenceCount, rules)) return "critical";
	return baseSeverity;
}

// ---------------------------------------------------------------------------
// Resolution hints
// ---------------------------------------------------------------------------

/**
 * Default resolution hints for each failure type.
 * Provides operator guidance for the most common integration failures.
 */
export const defaultResolutionHints: Record<IntegrationFailureType, string> = {
	"payment-credential-verification-failed":
		"Verify the payment provider credentials are correct and not expired. Re-submit credentials through the tenant admin panel.",
	"payment-connection-suspended":
		"The payment connection has been suspended. Check the provider dashboard for account issues and re-verify credentials.",
	"payment-health-check-failed":
		"The payment connection health check failed. Check provider API status and network connectivity.",
	"payment-transaction-failed":
		"A payment transaction failed. Check the transaction details in the payment dashboard and verify the customer's payment method.",
	"webhook-signature-verification-failed":
		"Webhook signature verification failed. Verify the webhook secret is correctly configured for the provider.",
	"webhook-processing-failed":
		"Webhook event processing failed. Check the event payload and processing logs. Consider replaying the event.",
	"webhook-replay-failed":
		"Webhook replay attempt failed. Check the event details and retry manually if needed.",
	"webhook-dead-letter":
		"Webhook event has been dead-lettered after maximum retries. Manual intervention required to process or acknowledge.",
	"notification-delivery-failed":
		"Notification delivery failed. Check the delivery adapter configuration and recipient address validity.",
	"notification-delivery-bounced":
		"Notification bounced. The recipient address may be invalid. Review and update the customer contact information.",
	"notification-delivery-dead-letter":
		"Notification has been dead-lettered after maximum retries. Manual review required.",
	"notification-provider-error":
		"Notification provider returned an error. Check provider API status and configuration.",
	"provider-api-timeout":
		"Provider API timed out. Check provider status page and network connectivity. May be a transient issue.",
	"provider-api-error":
		"Provider API returned an error. Check provider status page and API documentation for the error code.",
	"provider-rate-limited":
		"Provider API rate limit reached. Reduce request frequency or contact the provider to increase limits.",
};

// ---------------------------------------------------------------------------
// Platform-admin query and view types (E8-S6-T3)
// ---------------------------------------------------------------------------

/**
 * Query parameters for listing operational alert events.
 * Platform-admin only — not exposed to tenants.
 */
export type OperationalAlertQuery = {
	category?: AlertCategory;
	severity?: AlertSeverity;
	tenantId?: string;
	acknowledged?: boolean;
	startDate?: string;
	endDate?: string;
	limit?: number;
	offset?: number;
};

/**
 * Summary row for operational alert event listing.
 * Platform-admin only.
 */
export type OperationalAlertSummary = {
	id: string;
	category: AlertCategory;
	severity: AlertSeverity;
	tenantId: string | null;
	summary: string;
	occurrenceCount: number;
	acknowledged: boolean;
	timestamp: string;
};

/**
 * Detailed view of an operational alert event.
 * Platform-admin only. Includes full context but NEVER includes
 * payment secrets or customer PII.
 */
export type OperationalAlertDetail = OperationalAlertSummary & {
	context: AlertContext;
	resolutionHint: string;
};

/**
 * Response for operational alert event listing.
 */
export type OperationalAlertListResponse = {
	alerts: OperationalAlertSummary[];
	total: number;
	limit: number;
	offset: number;
};

/**
 * Severity distribution for operational alerts dashboard.
 */
export type AlertSeverityDistribution = Record<AlertSeverity, number>;

/**
 * Category distribution for operational alerts dashboard.
 */
export type AlertCategoryDistribution = Record<AlertCategory, number>;

/**
 * Aggregated dashboard metrics for operational alerts.
 */
export type OperationalAlertDashboardMetrics = {
	totalAlerts: number;
	unacknowledgedCount: number;
	bySeverity: AlertSeverityDistribution;
	byCategory: AlertCategoryDistribution;
	recentCritical: OperationalAlertSummary[];
};
