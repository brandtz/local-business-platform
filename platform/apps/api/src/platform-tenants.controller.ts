import { Body, Controller, Post, Req } from "@nestjs/common";

import { assertValidTenantProvisioningRequest } from "./auth/api-contracts";
import { TenantProvisioningService } from "./auth/tenant-provisioning.service";
import { TenantProvisioningSummaryService } from "./auth/tenant-provisioning-summary.service";

export type PlatformRequestViewer = {
	actorType: "platform" | "tenant" | "customer" | null;
	platformRole: "owner" | "admin" | "support" | "analyst" | null;
	userId: string | null;
};

export type PlatformRequestCarrier = {
	platformViewer?: PlatformRequestViewer;
};

@Controller("platform/tenants")
export class PlatformTenantsController {
	constructor(
		private readonly tenantProvisioningService: TenantProvisioningService,
		private readonly tenantProvisioningSummaryService: TenantProvisioningSummaryService
	) {}

	@Post()
	createTenant(@Body() payload: unknown, @Req() request: PlatformRequestCarrier) {
		assertValidTenantProvisioningRequest(payload);

		const result = this.tenantProvisioningService.createTenant(
			request.platformViewer || {
				actorType: null,
				platformRole: null,
				userId: null
			},
			payload
		);

		return this.tenantProvisioningSummaryService.createSummary(result);
	}
}