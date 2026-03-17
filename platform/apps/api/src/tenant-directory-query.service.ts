import { Injectable } from "@nestjs/common";

import type { TenantRequestContext } from "./auth/request-context.service";
import { TenantAccessService } from "./auth/tenant-access.service";
import { TenantRequestPolicyService } from "./auth/tenant-request-policy.service";

type TenantScopedRecord = {
	tenantId: string;
};

@Injectable()
export class TenantDirectoryQueryService {
	constructor(
		private readonly tenantRequestPolicyService: TenantRequestPolicyService,
		private readonly tenantAccessService: TenantAccessService = new TenantAccessService()
	) {}

	filterRecordsForTenant<TRecord extends TenantScopedRecord>(
		records: readonly TRecord[],
		context: TenantRequestContext
	): TRecord[] {
		const tenant = this.tenantRequestPolicyService.requireOperationalTenant(context);

		return records.filter((record) => record.tenantId === tenant.id);
	}

	getCurrentTenant(context: TenantRequestContext) {
		const tenant = this.tenantRequestPolicyService.requireOperationalTenant(context);

		this.tenantAccessService.requireTenantMembership({
			actorType: context.viewer.actorType,
			memberships: context.memberships,
			tenantId: tenant.id,
			userId: context.viewer.userId
		});

		return {
			displayName: tenant.displayName,
			id: tenant.id,
			slug: tenant.slug,
			status: tenant.status
		};
	}
}