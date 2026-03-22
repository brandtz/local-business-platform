import { Injectable } from "@nestjs/common";

import type {
	ActivationDenialReason,
	PlatformDomainActivationStatusEntry,
	PlatformDomainActivationStatusView,
	TenantCustomDomainRecord,
	TenantDomainActivationReadinessView,
	TenantSummary
} from "@platform/types";

import {
	buildActivationGuidance,
	buildPlatformActivationStatusView
} from "@platform/types";

import {
	DomainActivationGateService,
	type DomainActivationGateRequest
} from "./domain-activation-gate.service";

// ── Domain Activation Readiness View Service ─────────────────────────────────
//
// Design-only stub for E8-S5-T4. Builds readiness and denial views for
// both tenant-admin and platform-admin surfaces.
//
// Tenant admin: sees own domain activation readiness with actionable guidance.
// Platform admin: sees cross-tenant activation status overview.

export type TenantActivationViewRequest = {
	readonly tenant: TenantSummary;
	readonly domainRecord: TenantCustomDomainRecord | null;
	readonly hasValidRoutingConfig: boolean;
};

export type PlatformActivationViewRequest = {
	readonly tenants: readonly PlatformActivationViewTenant[];
};

export type PlatformActivationViewTenant = {
	readonly tenant: TenantSummary;
	readonly domainRecord: TenantCustomDomainRecord | null;
	readonly hasValidRoutingConfig: boolean;
	readonly lastRollbackAt: string | null;
	readonly lastRollbackTrigger: string | null;
};

@Injectable()
export class DomainActivationReadinessViewService {
	constructor(
		private readonly gateService: DomainActivationGateService
	) {}

	/**
	 * Builds the tenant-admin view showing domain activation readiness
	 * with check results and actionable guidance for each failing check.
	 */
	buildTenantView(
		request: TenantActivationViewRequest
	): TenantDomainActivationReadinessView {
		const { tenant, domainRecord, hasValidRoutingConfig } = request;

		if (!domainRecord) {
			return {
				tenantId: tenant.id,
				domainHostname: null,
				domainVerificationState: null,
				domainPromotionState: null,
				readinessReport: null,
				activationAllowed: false,
				denialReasons: [],
				guidance: []
			};
		}

		// Epic 9 not yet available — publish release is always null
		const gateRequest: DomainActivationGateRequest = {
			tenant,
			domainRecord,
			publishedRelease: null,
			hasValidRoutingConfig
		};

		const gateResult = this.gateService.evaluate(gateRequest);

		const denialReasons: readonly ActivationDenialReason[] =
			gateResult.kind === "denied" ? gateResult.denialReasons : [];

		const guidance = buildActivationGuidance(gateResult.readinessReport);

		return {
			tenantId: tenant.id,
			domainHostname: domainRecord.hostname,
			domainVerificationState: domainRecord.verificationState,
			domainPromotionState: domainRecord.promotionState,
			readinessReport: gateResult.readinessReport,
			activationAllowed: gateResult.kind === "allowed",
			denialReasons,
			guidance
		};
	}

	/**
	 * Builds the platform-admin view showing cross-tenant activation status.
	 */
	buildPlatformView(
		request: PlatformActivationViewRequest
	): PlatformDomainActivationStatusView {
		const entries: PlatformDomainActivationStatusEntry[] =
			request.tenants.map((t) => this.buildPlatformEntry(t));

		return buildPlatformActivationStatusView(entries);
	}

	private buildPlatformEntry(
		tenantData: PlatformActivationViewTenant
	): PlatformDomainActivationStatusEntry {
		const { tenant, domainRecord, hasValidRoutingConfig, lastRollbackAt, lastRollbackTrigger } =
			tenantData;

		if (!domainRecord) {
			return {
				tenantId: tenant.id,
				tenantDisplayName: tenant.displayName,
				tenantStatus: tenant.status,
				domainHostname: null,
				domainPromotionState: null,
				activationAllowed: false,
				denialReasons: [],
				lastRollbackAt,
				lastRollbackTrigger: lastRollbackTrigger as PlatformDomainActivationStatusEntry["lastRollbackTrigger"]
			};
		}

		// Epic 9 not yet available — publish release is always null
		const gateResult = this.gateService.evaluate({
			tenant,
			domainRecord,
			publishedRelease: null,
			hasValidRoutingConfig
		});

		const denialReasons: readonly ActivationDenialReason[] =
			gateResult.kind === "denied" ? gateResult.denialReasons : [];

		return {
			tenantId: tenant.id,
			tenantDisplayName: tenant.displayName,
			tenantStatus: tenant.status,
			domainHostname: domainRecord.hostname,
			domainPromotionState: domainRecord.promotionState,
			activationAllowed: gateResult.kind === "allowed",
			denialReasons,
			lastRollbackAt,
			lastRollbackTrigger: lastRollbackTrigger as PlatformDomainActivationStatusEntry["lastRollbackTrigger"]
		};
	}
}
