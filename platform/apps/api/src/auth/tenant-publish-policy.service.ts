import { Injectable } from "@nestjs/common";

import type {
	TenantRequestFailureReason,
	TenantSummary
} from "@platform/types";

import { getTenantRequestFailureReasonForAccessMode } from "@platform/types";

const tenantPublishPolicyMessages: Record<
	Exclude<TenantRequestFailureReason, "tenant-unresolved">,
	string
> = {
	"tenant-archived": "Tenant publish denied because the tenant is archived.",
	"tenant-inactive": "Tenant publish denied because the tenant is not active.",
	"tenant-suspended": "Tenant publish denied because the tenant is suspended."
};

export type TenantPublishPolicyErrorReason = Exclude<
	TenantRequestFailureReason,
	"tenant-unresolved"
>;

export class TenantPublishPolicyError extends Error {
	constructor(readonly reason: TenantPublishPolicyErrorReason) {
		super(tenantPublishPolicyMessages[reason]);
	}
}

@Injectable()
export class TenantPublishPolicyService {
	requirePublishableTenant(tenant: TenantSummary): TenantSummary {
		const failureReason = getTenantRequestFailureReasonForAccessMode(
			tenant.status,
			"publish-control"
		);

		if (failureReason && failureReason !== "tenant-unresolved") {
			throw new TenantPublishPolicyError(failureReason);
		}

		return tenant;
	}
}