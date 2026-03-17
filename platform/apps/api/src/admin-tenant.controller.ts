import { Controller, Get, Req } from "@nestjs/common";

import type { TenantRequestContextCarrier } from "./auth/request-context.service";

import { RequestContextService } from "./auth/request-context.service";
import { TenantDirectoryQueryService } from "./tenant-directory-query.service";

@Controller("admin/tenant")
export class AdminTenantController {
	constructor(
		private readonly requestContextService: RequestContextService,
		private readonly tenantDirectoryQueryService: TenantDirectoryQueryService
	) {}

	@Get()
	getTenant(@Req() request: TenantRequestContextCarrier) {
		const context = this.requestContextService.requireContext(request);

		return this.tenantDirectoryQueryService.getCurrentTenant(context);
	}
}