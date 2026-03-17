import { Injectable } from "@nestjs/common";

import type {
	PlatformActorRole,
	TenantLifecycleEvent,
	TenantSummary,
	TenantStatus
} from "@platform/types";

import { PlatformAccessService } from "./platform-access.service";
import { TenantLifecyclePolicyService } from "./tenant-lifecycle-policy.service";

export type TenantLifecycleTransitionRequest = {
	actorType: "platform" | "tenant" | "customer" | null;
	platformRole: PlatformActorRole | null;
	targetStatus: TenantStatus;
	tenant: TenantSummary;
	userId: string | null;
};

export type TenantLifecycleTransitionResult = {
	event: TenantLifecycleEvent;
	performedByRole: PlatformActorRole;
	previousStatus: TenantStatus;
	tenant: TenantSummary;
};

@Injectable()
export class TenantLifecycleService {
	constructor(
		private readonly platformAccessService: PlatformAccessService,
		private readonly tenantLifecyclePolicyService: TenantLifecyclePolicyService
	) {}

	transitionTenant(
		request: TenantLifecycleTransitionRequest
	): TenantLifecycleTransitionResult {
		const performedByRole = this.platformAccessService.requirePlatformCapability({
			actorType: request.actorType,
			capability: "tenants:write",
			platformRole: request.platformRole,
			userId: request.userId
		});
		const decision = this.tenantLifecyclePolicyService.requireTransition(
			request.tenant.status,
			request.targetStatus
		);

		return {
			event: decision.event,
			performedByRole,
			previousStatus: request.tenant.status,
			tenant: {
				...request.tenant,
				status: decision.to
			}
		};
	}
}