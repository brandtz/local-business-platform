import { Injectable } from "@nestjs/common";

import type {
	ActivationDenialReason,
	DomainActivationGateResult,
	PublishReadinessCheckResult,
	PublishReadinessReport,
	PublishedReleaseSnapshot,
	TenantCustomDomainRecord,
	TenantSummary
} from "@platform/types";

// ── Domain Activation Gate Service ───────────────────────────────────────────
//
// Design-only stub for E8-S5-T1/T2. This service evaluates whether a tenant's
// custom domain can be promoted to production. It consumes:
//   - Tenant lifecycle state (from E3 domain infrastructure)
//   - Domain verification state (from E3 domain infrastructure)
//   - Published release state (from Epic 9 — NOT YET IMPLEMENTED)
//
// When Epic 9 lands, the `getPublishedReleaseSnapshot` dependency will be
// replaced with the actual publish service. Until then, the publish-related
// checks always return "missing" to block activation safely.

export type DomainActivationGateRequest = {
	readonly tenant: TenantSummary;
	readonly domainRecord: TenantCustomDomainRecord;
	readonly publishedRelease: PublishedReleaseSnapshot | null;
	readonly hasValidRoutingConfig: boolean;
};

@Injectable()
export class DomainActivationGateService {
	/**
	 * Evaluates activation readiness for a domain. Returns an allowed or denied
	 * result with a full readiness report. Domain promotion MUST NOT proceed
	 * if this returns "denied".
	 */
	evaluate(request: DomainActivationGateRequest): DomainActivationGateResult {
		const report = this.buildReadinessReport(request);
		const denialReasons = this.collectDenialReasons(report);

		if (denialReasons.length === 0) {
			return {
				kind: "allowed",
				tenantId: request.tenant.id,
				domainId: request.domainRecord.id,
				readinessReport: report
			};
		}

		return {
			kind: "denied",
			tenantId: request.tenant.id,
			domainId: request.domainRecord.id,
			denialReasons,
			readinessReport: report
		};
	}

	private buildReadinessReport(
		request: DomainActivationGateRequest
	): PublishReadinessReport {
		const checks: PublishReadinessCheckResult[] = [
			this.checkTenantActive(request.tenant),
			this.checkDomainVerified(request.domainRecord),
			this.checkValidRoutingConfig(request.hasValidRoutingConfig),
			this.checkHasPublishedRelease(request.publishedRelease),
			this.checkReleaseHealthGreen(request.publishedRelease)
		];

		return {
			checks,
			ready: checks.every((c) => c.passed),
			tenantId: request.tenant.id,
			evaluatedAt: new Date().toISOString()
		};
	}

	private checkTenantActive(
		tenant: TenantSummary
	): PublishReadinessCheckResult {
		const passed = tenant.status === "active";

		return {
			checkId: "tenant-active",
			passed,
			reason: passed ? null : `Tenant status is "${tenant.status}"; must be "active".`
		};
	}

	private checkDomainVerified(
		record: TenantCustomDomainRecord
	): PublishReadinessCheckResult {
		const passed = record.verificationState === "verified";

		return {
			checkId: "domain-verified",
			passed,
			reason: passed
				? null
				: `Domain verification state is "${record.verificationState}"; must be "verified".`
		};
	}

	private checkValidRoutingConfig(
		hasValidRouting: boolean
	): PublishReadinessCheckResult {
		return {
			checkId: "valid-routing-config",
			passed: hasValidRouting,
			reason: hasValidRouting ? null : "Routing configuration is missing or invalid."
		};
	}

	private checkHasPublishedRelease(
		release: PublishedReleaseSnapshot | null
	): PublishReadinessCheckResult {
		const passed =
			release !== null &&
			release.status !== "missing" &&
			release.releaseId !== null;

		return {
			checkId: "has-published-release",
			passed,
			reason: passed ? null : "No published release found for this tenant."
		};
	}

	private checkReleaseHealthGreen(
		release: PublishedReleaseSnapshot | null
	): PublishReadinessCheckResult {
		const passed = release !== null && release.status === "healthy";

		return {
			checkId: "release-health-green",
			passed,
			reason: passed
				? null
				: release === null
					? "No release available to check health."
					: `Release health is "${release.status}"; must be "healthy".`
		};
	}

	private collectDenialReasons(
		report: PublishReadinessReport
	): ActivationDenialReason[] {
		const reasons: ActivationDenialReason[] = [];

		for (const check of report.checks) {
			if (check.passed) continue;

			const mapping = checkIdToDenialReason[check.checkId];

			if (mapping) {
				reasons.push(mapping);
			}
		}

		return reasons;
	}
}

const checkIdToDenialReason: Record<
	string,
	ActivationDenialReason | undefined
> = {
	"tenant-active": "tenant-not-active",
	"domain-verified": "domain-not-verified",
	"valid-routing-config": "routing-config-invalid",
	"has-published-release": "no-published-release",
	"release-health-green": "release-health-not-green"
};
