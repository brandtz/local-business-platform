import { describe, expect, it } from "vitest";

import { AuthApiContractError } from "./auth/api-contracts";
import { PlatformAccessDeniedError, PlatformAccessService } from "./auth/platform-access.service";
import { TenantProvisioningService } from "./auth/tenant-provisioning.service";
import { TenantProvisioningSummaryService } from "./auth/tenant-provisioning-summary.service";
import { TenantProvisioningTemplateService } from "./auth/tenant-provisioning-template.service";
import { PlatformTenantsController } from "./platform-tenants.controller";

function createController(): PlatformTenantsController {
	return new PlatformTenantsController(
		new TenantProvisioningService(
			new PlatformAccessService(),
			new TenantProvisioningTemplateService()
		),
		new TenantProvisioningSummaryService()
	);
}

describe("PlatformTenantsController", () => {
	it("creates a tenant provisioning summary for authorized platform actors", () => {
		const controller = createController();

		expect(
			controller.createTenant(
				{
					displayName: "Alpha Fitness",
					owner: {
						actorType: "tenant",
						email: "owner@alpha.example.com",
						id: "tenant-user-1",
						status: "invited"
					},
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					verticalTemplate: "restaurant-core"
				},
				{
					platformViewer: {
						actorType: "platform",
						platformRole: "admin",
						userId: "platform-user-1"
					}
				}
			)
		).toMatchObject({
			enabledModules: ["catalog", "ordering", "content", "operations"],
			ownerUserId: "tenant-user-1",
			previewSubdomain: "alpha",
			tenantDisplayName: "Alpha Fitness",
			tenantSlug: "alpha-fitness",
			tenantStatus: "draft",
			verticalTemplate: "restaurant-core"
		});
	});

	it("rejects invalid provisioning payloads before service execution", () => {
		const controller = createController();

		expect(() =>
			controller.createTenant(
				{
					displayName: "Alpha Fitness",
					owner: null,
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					verticalTemplate: "restaurant-core"
				},
				{}
			)
		).toThrow(AuthApiContractError);
	});

	it("rejects unauthorized platform provisioning requests", () => {
		const controller = createController();

		expect(() =>
			controller.createTenant(
				{
					displayName: "Alpha Fitness",
					owner: {
						actorType: "tenant",
						email: "owner@alpha.example.com",
						id: "tenant-user-1",
						status: "invited"
					},
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					verticalTemplate: "restaurant-core"
				},
				{
					platformViewer: {
						actorType: "platform",
						platformRole: "support",
						userId: "platform-user-2"
					}
				}
			)
		).toThrow(PlatformAccessDeniedError);
	});
});