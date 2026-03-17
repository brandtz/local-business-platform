import { Injectable } from "@nestjs/common";

import type {
	TenantProvisioningResult,
	TenantProvisioningSummary
} from "@platform/types";

@Injectable()
export class TenantProvisioningSummaryService {
	createSummary(result: TenantProvisioningResult): TenantProvisioningSummary {
		return {
			defaultConfiguration: result.defaultConfiguration,
			enabledModules: result.enabledModules,
			ownerUserId: result.ownerMembership.userId,
			previewSubdomain: result.tenant.previewSubdomain,
			tenantDisplayName: result.tenant.displayName,
			tenantId: result.tenant.id,
			tenantSlug: result.tenant.slug,
			tenantStatus: result.tenant.status,
			verticalTemplate: result.verticalTemplate
		};
	}
}