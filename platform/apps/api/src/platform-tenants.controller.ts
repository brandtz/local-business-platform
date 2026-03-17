import { Body, Controller, Post, Req } from "@nestjs/common";

import {
	assertValidPlatformTenantOperationalSummaryQueryRequest,
	assertValidTenantModuleAssignmentRequest,
	assertValidTenantProvisioningRequest,
	assertValidTenantTemplateAssignmentRequest
} from "./auth/api-contracts";
import { ModuleTemplateAssignmentService } from "./auth/module-template-assignment.service";
import { PlatformTenantOperationalSummaryService } from "./auth/platform-tenant-operational-summary.service";
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
		private readonly tenantProvisioningSummaryService: TenantProvisioningSummaryService,
		private readonly platformTenantOperationalSummaryService: PlatformTenantOperationalSummaryService,
		private readonly moduleTemplateAssignmentService: ModuleTemplateAssignmentService
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

	@Post("operational-summaries")
	listOperationalSummaries(
		@Body() payload: unknown,
		@Req() request: PlatformRequestCarrier
	) {
		assertValidPlatformTenantOperationalSummaryQueryRequest(payload);

		return this.platformTenantOperationalSummaryService.createSummaries(
			request.platformViewer || {
				actorType: null,
				platformRole: null,
				userId: null
			},
			payload.tenants
		);
	}
}