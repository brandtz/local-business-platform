// ── Domain Activation Integrated with Publish State ──────────────────────────
//
// Design-only contracts for E8-S5. Epic 9 (publish state and release management)
// is NOT yet complete. These types define the integration contract that domain
// activation will consume once Epic 9 lands.
//
// Consumers: domain promotion workflow, platform-admin views, tenant-admin views.
// Providers: Epic 9 publish service (not yet implemented).

import type {
	CustomDomainPromotionState,
	CustomDomainVerificationState,
	TenantStatus
} from "./auth";

// ── Publish-Readiness Check Contract (E8-S5-T1) ─────────────────────────────

/**
 * Individual readiness check identifiers. Each check gates domain activation
 * on a specific precondition. Epic 9 will add checks for published-release
 * health once versioned publish is implemented.
 */
export const publishReadinessCheckIds = [
	"tenant-active",
	"domain-verified",
	"valid-routing-config",
	"has-published-release",
	"release-health-green"
] as const;

export type PublishReadinessCheckId =
	(typeof publishReadinessCheckIds)[number];

export type PublishReadinessCheckResult = {
	readonly checkId: PublishReadinessCheckId;
	readonly passed: boolean;
	readonly reason: string | null;
};

/**
 * Aggregated readiness report for a tenant's domain activation attempt.
 * `ready` is true only when ALL checks pass.
 */
export type PublishReadinessReport = {
	readonly checks: readonly PublishReadinessCheckResult[];
	readonly ready: boolean;
	readonly tenantId: string;
	readonly evaluatedAt: string;
};

// ── Publish State Stub (Epic 9 Contract) ─────────────────────────────────────

/**
 * Stub type representing the published release state that Epic 9 will provide.
 * This defines what E8-S5 expects to consume from the publish system.
 */
export const publishedReleaseStatuses = [
	"healthy",
	"degraded",
	"failed",
	"missing"
] as const;

export type PublishedReleaseStatus =
	(typeof publishedReleaseStatuses)[number];

export type PublishedReleaseSnapshot = {
	readonly releaseId: string | null;
	readonly status: PublishedReleaseStatus;
	readonly publishedAt: string | null;
	readonly version: number | null;
};

// ── Activation Denial Semantics (E8-S5-T2) ──────────────────────────────────

export const activationDenialReasons = [
	"tenant-not-active",
	"domain-not-verified",
	"routing-config-invalid",
	"no-published-release",
	"release-health-not-green",
	"publish-system-unavailable"
] as const;

export type ActivationDenialReason =
	(typeof activationDenialReasons)[number];

/**
 * Human-readable descriptions for each denial reason. Used in admin views
 * and API error responses to provide actionable guidance.
 */
export const activationDenialMessages: Record<ActivationDenialReason, string> = {
	"tenant-not-active":
		"Domain activation requires the tenant to be in active status.",
	"domain-not-verified":
		"The custom domain must be verified before activation.",
	"routing-config-invalid":
		"Valid routing configuration is required for domain activation.",
	"no-published-release":
		"A published release is required before domain activation.",
	"release-health-not-green":
		"The published release must have a healthy status for domain activation.",
	"publish-system-unavailable":
		"The publish system is temporarily unavailable. Domain activation cannot proceed."
};

/**
 * Discriminated union representing the result of the activation gate check.
 * Either activation is allowed, or it is denied with specific reasons.
 */
export type DomainActivationGateResult =
	| {
		readonly kind: "allowed";
		readonly tenantId: string;
		readonly domainId: string;
		readonly readinessReport: PublishReadinessReport;
	  }
	| {
		readonly kind: "denied";
		readonly tenantId: string;
		readonly domainId: string;
		readonly denialReasons: readonly ActivationDenialReason[];
		readonly readinessReport: PublishReadinessReport;
	  };

// ── Rollback Trigger Contract (E8-S5-T3) ─────────────────────────────────────

export const activationRollbackTriggers = [
	"post-promotion-route-validation-failed",
	"post-promotion-health-check-failed",
	"manual-rollback-requested"
] as const;

export type ActivationRollbackTrigger =
	(typeof activationRollbackTriggers)[number];

export type DomainActivationRollbackRequest = {
	readonly tenantId: string;
	readonly domainId: string;
	readonly trigger: ActivationRollbackTrigger;
	readonly reason: string;
};

/**
 * Discriminated union representing the result of a rollback attempt.
 * On success, the prior live configuration is restored. On failure,
 * the system enters a failed state that requires manual intervention.
 */
export type DomainActivationRollbackResult =
	| {
		readonly kind: "rolled-back";
		readonly tenantId: string;
		readonly domainId: string;
		readonly restoredState: CustomDomainPromotionState;
		readonly trigger: ActivationRollbackTrigger;
	  }
	| {
		readonly kind: "rollback-failed";
		readonly tenantId: string;
		readonly domainId: string;
		readonly trigger: ActivationRollbackTrigger;
		readonly failureReason: string;
	  };

// ── Readiness and Denial View Types (E8-S5-T4) ──────────────────────────────

/**
 * Tenant-admin view: shows the tenant's own domain activation readiness
 * with check results and actionable guidance for each failing check.
 */
export type TenantDomainActivationReadinessView = {
	readonly tenantId: string;
	readonly domainHostname: string | null;
	readonly domainVerificationState: CustomDomainVerificationState | null;
	readonly domainPromotionState: CustomDomainPromotionState | null;
	readonly readinessReport: PublishReadinessReport | null;
	readonly activationAllowed: boolean;
	readonly denialReasons: readonly ActivationDenialReason[];
	readonly guidance: readonly ActivationGuidanceItem[];
};

export type ActivationGuidanceItem = {
	readonly checkId: PublishReadinessCheckId;
	readonly passed: boolean;
	readonly label: string;
	readonly actionRequired: string | null;
};

/**
 * Platform-admin view: shows cross-tenant activation status for all
 * tenants with domains, including rollback history.
 */
export type PlatformDomainActivationStatusEntry = {
	readonly tenantId: string;
	readonly tenantDisplayName: string;
	readonly tenantStatus: TenantStatus;
	readonly domainHostname: string | null;
	readonly domainPromotionState: CustomDomainPromotionState | null;
	readonly activationAllowed: boolean;
	readonly denialReasons: readonly ActivationDenialReason[];
	readonly lastRollbackAt: string | null;
	readonly lastRollbackTrigger: ActivationRollbackTrigger | null;
};

export type PlatformDomainActivationStatusView = {
	readonly entries: readonly PlatformDomainActivationStatusEntry[];
	readonly totalCount: number;
	readonly activatedCount: number;
	readonly blockedCount: number;
};

// ── Helper Functions ─────────────────────────────────────────────────────────

export function isActivationAllowed(
	result: DomainActivationGateResult
): result is Extract<DomainActivationGateResult, { kind: "allowed" }> {
	return result.kind === "allowed";
}

export function isActivationDenied(
	result: DomainActivationGateResult
): result is Extract<DomainActivationGateResult, { kind: "denied" }> {
	return result.kind === "denied";
}

export function isRollbackSuccessful(
	result: DomainActivationRollbackResult
): result is Extract<DomainActivationRollbackResult, { kind: "rolled-back" }> {
	return result.kind === "rolled-back";
}

export function getDenialMessage(reason: ActivationDenialReason): string {
	return activationDenialMessages[reason];
}

/**
 * Builds activation guidance items from a readiness report.
 * Each check that failed includes actionable guidance text.
 */
export function buildActivationGuidance(
	report: PublishReadinessReport
): readonly ActivationGuidanceItem[] {
	return report.checks.map((check) => ({
		checkId: check.checkId,
		passed: check.passed,
		label: activationCheckLabels[check.checkId],
		actionRequired: check.passed ? null : activationCheckActionRequired[check.checkId]
	}));
}

const activationCheckLabels: Record<PublishReadinessCheckId, string> = {
	"tenant-active": "Tenant is active",
	"domain-verified": "Domain is verified",
	"valid-routing-config": "Routing configuration is valid",
	"has-published-release": "Published release exists",
	"release-health-green": "Release health is green"
};

const activationCheckActionRequired: Record<PublishReadinessCheckId, string> = {
	"tenant-active": "Activate the tenant before proceeding with domain activation.",
	"domain-verified": "Complete domain verification (DNS or HTTP token).",
	"valid-routing-config": "Configure valid routing rules for the custom domain.",
	"has-published-release": "Publish a release before activating the domain.",
	"release-health-green": "Resolve release health issues before domain activation."
};

/**
 * Builds a platform-level activation status view from individual entries.
 */
export function buildPlatformActivationStatusView(
	entries: readonly PlatformDomainActivationStatusEntry[]
): PlatformDomainActivationStatusView {
	let activatedCount = 0;
	let blockedCount = 0;

	for (const entry of entries) {
		if (entry.activationAllowed) {
			activatedCount += 1;
		} else {
			blockedCount += 1;
		}
	}

	return {
		entries,
		totalCount: entries.length,
		activatedCount,
		blockedCount
	};
}
