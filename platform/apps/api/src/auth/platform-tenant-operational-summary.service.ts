import { Injectable } from "@nestjs/common";

import type {
	PlatformTenantOperationalHealthReason,
	PlatformTenantOperationalSummary,
	PlatformTenantOperationalSummaryQueryTenant,
	TenantRequestFailureReason
} from "@platform/types";

import { PlatformAccessService } from "./platform-access.service";
import {
	TenantPublishPolicyError,
	TenantPublishPolicyService
} from "./tenant-publish-policy.service";

export type PlatformTenantOperationalSummaryActor = {
	actorType: "platform" | "tenant" | "customer" | null;
	platformRole: "owner" | "admin" | "support" | "analyst" | null;
	userId: string | null;
};

@Injectable()
export class PlatformTenantOperationalSummaryService {
	constructor(
		private readonly platformAccessService: PlatformAccessService,
		private readonly tenantPublishPolicyService: TenantPublishPolicyService
	) {}

	createSummaries(
		actor: PlatformTenantOperationalSummaryActor,
		tenants: readonly PlatformTenantOperationalSummaryQueryTenant[]
	): PlatformTenantOperationalSummary[] {
		this.platformAccessService.requirePlatformCapability({
			actorType: actor.actorType,
			capability: "tenants:read",
			platformRole: actor.platformRole,
			userId: actor.userId
		});

		return tenants.map((tenant) => this.createSummary(tenant));
	}

	private createSummary(
		tenant: PlatformTenantOperationalSummaryQueryTenant
	): PlatformTenantOperationalSummary {
		const previewSubdomain = tenant.previewSubdomain?.trim() || null;
		const customDomainCount = tenant.customDomains?.length || 0;
		const publishBlockedReason = this.getPublishBlockedReason(tenant);
		const healthReasons: PlatformTenantOperationalHealthReason[] = [];

		if (publishBlockedReason) {
			healthReasons.push(publishBlockedReason);
		}

		if (!previewSubdomain) {
			healthReasons.push("preview-route-missing");
		}

		return {
			customDomainCount,
			healthReasons,
			healthStatus:
				healthReasons.length > 0 ? "attention-required" : "healthy",
			lastLifecycleAuditAt: tenant.lastLifecycleAuditAt || null,
			lifecycleStatus: tenant.status,
			liveRoutingStatus:
				customDomainCount > 0
					? "custom-domain-configured"
					: "managed-subdomain-only",
			previewStatus: previewSubdomain ? "configured" : "missing",
			previewSubdomain,
			publishBlockedReason,
			publishStatus: publishBlockedReason ? "blocked" : "ready",
			tenantDisplayName: tenant.displayName,
			tenantId: tenant.id,
			tenantSlug: tenant.slug
		};
	}

	private getPublishBlockedReason(
		tenant: PlatformTenantOperationalSummaryQueryTenant
	): Exclude<TenantRequestFailureReason, "tenant-unresolved"> | null {
		try {
			this.tenantPublishPolicyService.requirePublishableTenant({
				displayName: tenant.displayName,
				id: tenant.id,
				slug: tenant.slug,
				status: tenant.status
			});

			return null;
		} catch (error) {
			if (error instanceof TenantPublishPolicyError) {
				return error.reason;
			}

			throw error;
		}
	}
}