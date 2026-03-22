import { describe, expect, it } from "vitest";

import {
	activationDenialMessages,
	activationDenialReasons,
	activationRollbackTriggers,
	buildActivationGuidance,
	buildPlatformActivationStatusView,
	getDenialMessage,
	isActivationAllowed,
	isActivationDenied,
	isRollbackSuccessful,
	publishReadinessCheckIds,
	publishedReleaseStatuses,
	type DomainActivationGateResult,
	type DomainActivationRollbackResult,
	type PlatformDomainActivationStatusEntry,
	type PublishReadinessReport,
	type PublishedReleaseSnapshot,
	type TenantDomainActivationReadinessView
} from "./domain-activation";

function createReadinessReport(
	overrides: Partial<PublishReadinessReport> = {}
): PublishReadinessReport {
	return {
		checks: [
			{ checkId: "tenant-active", passed: true, reason: null },
			{ checkId: "domain-verified", passed: true, reason: null },
			{ checkId: "valid-routing-config", passed: true, reason: null },
			{ checkId: "has-published-release", passed: true, reason: null },
			{ checkId: "release-health-green", passed: true, reason: null }
		],
		ready: true,
		tenantId: "t-1",
		evaluatedAt: "2026-03-22T00:00:00Z",
		...overrides
	};
}

function createFailingReadinessReport(): PublishReadinessReport {
	return {
		checks: [
			{ checkId: "tenant-active", passed: true, reason: null },
			{ checkId: "domain-verified", passed: true, reason: null },
			{ checkId: "valid-routing-config", passed: true, reason: null },
			{ checkId: "has-published-release", passed: false, reason: "No published release found" },
			{ checkId: "release-health-green", passed: false, reason: "Release health check failed" }
		],
		ready: false,
		tenantId: "t-1",
		evaluatedAt: "2026-03-22T00:00:00Z"
	};
}

describe("domain-activation types", () => {
	describe("publish readiness check contract", () => {
		it("defines all required check IDs", () => {
			expect(publishReadinessCheckIds).toContain("tenant-active");
			expect(publishReadinessCheckIds).toContain("domain-verified");
			expect(publishReadinessCheckIds).toContain("valid-routing-config");
			expect(publishReadinessCheckIds).toContain("has-published-release");
			expect(publishReadinessCheckIds).toContain("release-health-green");
			expect(publishReadinessCheckIds).toHaveLength(5);
		});

		it("constructs a passing readiness report", () => {
			const report = createReadinessReport();
			expect(report.ready).toBe(true);
			expect(report.checks).toHaveLength(5);
			expect(report.checks.every((c) => c.passed)).toBe(true);
		});

		it("constructs a failing readiness report", () => {
			const report = createFailingReadinessReport();
			expect(report.ready).toBe(false);
			expect(report.checks.filter((c) => !c.passed)).toHaveLength(2);
		});
	});

	describe("published release snapshot stub", () => {
		it("defines all release statuses", () => {
			expect(publishedReleaseStatuses).toContain("healthy");
			expect(publishedReleaseStatuses).toContain("degraded");
			expect(publishedReleaseStatuses).toContain("failed");
			expect(publishedReleaseStatuses).toContain("missing");
			expect(publishedReleaseStatuses).toHaveLength(4);
		});

		it("creates a snapshot with correct shape", () => {
			const snapshot: PublishedReleaseSnapshot = {
				releaseId: null,
				status: "missing",
				publishedAt: null,
				version: null
			};

			expect(snapshot.status).toBe("missing");
			expect(snapshot.releaseId).toBeNull();
		});
	});

	describe("activation denial semantics", () => {
		it("defines all denial reasons", () => {
			expect(activationDenialReasons).toHaveLength(6);
			expect(activationDenialReasons).toContain("tenant-not-active");
			expect(activationDenialReasons).toContain("domain-not-verified");
			expect(activationDenialReasons).toContain("routing-config-invalid");
			expect(activationDenialReasons).toContain("no-published-release");
			expect(activationDenialReasons).toContain("release-health-not-green");
			expect(activationDenialReasons).toContain("publish-system-unavailable");
		});

		it("provides a human-readable message for every denial reason", () => {
			for (const reason of activationDenialReasons) {
				const message = activationDenialMessages[reason];
				expect(message).toBeDefined();
				expect(message.length).toBeGreaterThan(0);
			}
		});

		it("getDenialMessage returns the correct message", () => {
			expect(getDenialMessage("tenant-not-active")).toContain("active status");
			expect(getDenialMessage("no-published-release")).toContain("published release");
		});
	});

	describe("activation gate result", () => {
		it("isActivationAllowed returns true for allowed result", () => {
			const result: DomainActivationGateResult = {
				kind: "allowed",
				tenantId: "t-1",
				domainId: "dom-1",
				readinessReport: createReadinessReport()
			};

			expect(isActivationAllowed(result)).toBe(true);
			expect(isActivationDenied(result)).toBe(false);
		});

		it("isActivationDenied returns true for denied result", () => {
			const result: DomainActivationGateResult = {
				kind: "denied",
				tenantId: "t-1",
				domainId: "dom-1",
				denialReasons: ["no-published-release", "release-health-not-green"],
				readinessReport: createFailingReadinessReport()
			};

			expect(isActivationDenied(result)).toBe(true);
			expect(isActivationAllowed(result)).toBe(false);
			expect(result.denialReasons).toHaveLength(2);
		});
	});

	describe("rollback trigger contract", () => {
		it("defines all rollback triggers", () => {
			expect(activationRollbackTriggers).toHaveLength(3);
			expect(activationRollbackTriggers).toContain("post-promotion-route-validation-failed");
			expect(activationRollbackTriggers).toContain("post-promotion-health-check-failed");
			expect(activationRollbackTriggers).toContain("manual-rollback-requested");
		});

		it("isRollbackSuccessful returns true for rolled-back result", () => {
			const result: DomainActivationRollbackResult = {
				kind: "rolled-back",
				tenantId: "t-1",
				domainId: "dom-1",
				restoredState: "rolled-back",
				trigger: "post-promotion-route-validation-failed"
			};

			expect(isRollbackSuccessful(result)).toBe(true);
		});

		it("isRollbackSuccessful returns false for failed rollback", () => {
			const result: DomainActivationRollbackResult = {
				kind: "rollback-failed",
				tenantId: "t-1",
				domainId: "dom-1",
				trigger: "post-promotion-health-check-failed",
				failureReason: "CDN state could not be reverted"
			};

			expect(isRollbackSuccessful(result)).toBe(false);
		});
	});

	describe("readiness and denial view types", () => {
		it("constructs a tenant domain activation readiness view", () => {
			const view: TenantDomainActivationReadinessView = {
				tenantId: "t-1",
				domainHostname: "example.com",
				domainVerificationState: "verified",
				domainPromotionState: "not-requested",
				readinessReport: createFailingReadinessReport(),
				activationAllowed: false,
				denialReasons: ["no-published-release"],
				guidance: [
					{
						checkId: "has-published-release",
						passed: false,
						label: "Published release exists",
						actionRequired: "Publish a release before activating the domain."
					}
				]
			};

			expect(view.activationAllowed).toBe(false);
			expect(view.denialReasons).toHaveLength(1);
			expect(view.guidance[0].actionRequired).toBeTruthy();
		});

		it("constructs a tenant view with no domain configured", () => {
			const view: TenantDomainActivationReadinessView = {
				tenantId: "t-2",
				domainHostname: null,
				domainVerificationState: null,
				domainPromotionState: null,
				readinessReport: null,
				activationAllowed: false,
				denialReasons: [],
				guidance: []
			};

			expect(view.domainHostname).toBeNull();
			expect(view.readinessReport).toBeNull();
		});
	});

	describe("buildActivationGuidance", () => {
		it("returns guidance for all checks in a passing report", () => {
			const report = createReadinessReport();
			const guidance = buildActivationGuidance(report);

			expect(guidance).toHaveLength(5);
			for (const item of guidance) {
				expect(item.passed).toBe(true);
				expect(item.actionRequired).toBeNull();
				expect(item.label.length).toBeGreaterThan(0);
			}
		});

		it("returns actionable guidance for failing checks", () => {
			const report = createFailingReadinessReport();
			const guidance = buildActivationGuidance(report);

			const failing = guidance.filter((g) => !g.passed);
			expect(failing).toHaveLength(2);

			for (const item of failing) {
				expect(item.actionRequired).toBeTruthy();
				expect(item.actionRequired!.length).toBeGreaterThan(0);
			}
		});

		it("preserves check ordering from the report", () => {
			const report = createReadinessReport();
			const guidance = buildActivationGuidance(report);

			expect(guidance[0].checkId).toBe("tenant-active");
			expect(guidance[4].checkId).toBe("release-health-green");
		});
	});

	describe("buildPlatformActivationStatusView", () => {
		it("builds view with correct counts", () => {
			const entries: PlatformDomainActivationStatusEntry[] = [
				{
					tenantId: "t-1",
					tenantDisplayName: "Alpha",
					tenantStatus: "active",
					domainHostname: "alpha.com",
					domainPromotionState: "promoted",
					activationAllowed: true,
					denialReasons: [],
					lastRollbackAt: null,
					lastRollbackTrigger: null
				},
				{
					tenantId: "t-2",
					tenantDisplayName: "Bravo",
					tenantStatus: "active",
					domainHostname: "bravo.com",
					domainPromotionState: "not-requested",
					activationAllowed: false,
					denialReasons: ["no-published-release"],
					lastRollbackAt: null,
					lastRollbackTrigger: null
				},
				{
					tenantId: "t-3",
					tenantDisplayName: "Charlie",
					tenantStatus: "draft",
					domainHostname: null,
					domainPromotionState: null,
					activationAllowed: false,
					denialReasons: ["tenant-not-active"],
					lastRollbackAt: "2026-03-20T12:00:00Z",
					lastRollbackTrigger: "post-promotion-route-validation-failed"
				}
			];

			const view = buildPlatformActivationStatusView(entries);

			expect(view.totalCount).toBe(3);
			expect(view.activatedCount).toBe(1);
			expect(view.blockedCount).toBe(2);
			expect(view.entries).toHaveLength(3);
		});

		it("handles empty entries", () => {
			const view = buildPlatformActivationStatusView([]);

			expect(view.totalCount).toBe(0);
			expect(view.activatedCount).toBe(0);
			expect(view.blockedCount).toBe(0);
		});
	});
});
