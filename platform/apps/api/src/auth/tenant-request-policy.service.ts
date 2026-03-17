import { Injectable } from "@nestjs/common";

import type {
	TenantLifecycleAccessMode,
	TenantRequestFailureReason,
	TenantResolutionTenantRecord
} from "@platform/types";

import { getTenantRequestFailureReasonForAccessMode } from "@platform/types";

import type { TenantRequestContext } from "./request-context.service";

import { RequestContextService } from "./request-context.service";

const tenantRequestFailureMessages: Record<TenantRequestFailureReason, string> = {
	"tenant-archived": "Tenant request denied because the tenant is archived.",
	"tenant-inactive": "Tenant request denied because the tenant is not active for this lifecycle access path.",
	"tenant-suspended": "Tenant request denied because the tenant is suspended.",
	"tenant-unresolved": "Tenant request denied because the tenant could not be resolved."
};

export class TenantRequestPolicyError extends Error {
	constructor(readonly reason: TenantRequestFailureReason) {
		super(tenantRequestFailureMessages[reason]);
	}
}

@Injectable()
export class TenantRequestPolicyService {
	constructor(private readonly requestContextService: RequestContextService) {}

	requireOperationalTenant(
		context: TenantRequestContext
	): TenantResolutionTenantRecord {
		return this.requireLifecycleAccess(context, this.resolveDefaultAccessMode(context));
	}

	requireLifecycleAccess(
		context: TenantRequestContext,
		mode: TenantLifecycleAccessMode
	): TenantResolutionTenantRecord {
		const resolution = context.tenantResolution;

		if (resolution.kind !== "tenant") {
			throw new TenantRequestPolicyError("tenant-unresolved");
		}

		const failureReason = getTenantRequestFailureReasonForAccessMode(
			resolution.tenant.status,
			mode
		);

		if (failureReason) {
			throw new TenantRequestPolicyError(failureReason);
		}

		return this.requestContextService.requireTenant(context);
	}

	private resolveDefaultAccessMode(
		context: TenantRequestContext
	): TenantLifecycleAccessMode {
		return context.routeSpace === "tenant-admin"
			? "tenant-admin"
			: "preview-routing";
	}
}