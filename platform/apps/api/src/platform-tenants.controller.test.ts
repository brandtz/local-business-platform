import { describe, expect, it } from "vitest";

import { AuthApiContractError } from "./auth/api-contracts";
import { PlatformAccessDeniedError, PlatformAccessService } from "./auth/platform-access.service";
import { PlatformTenantOperationalSummaryService } from "./auth/platform-tenant-operational-summary.service";
import { TenantProvisioningService } from "./auth/tenant-provisioning.service";
import { TenantProvisioningSummaryService } from "./auth/tenant-provisioning-summary.service";
import { TenantProvisioningTemplateService } from "./auth/tenant-provisioning-template.service";
import { TenantPublishPolicyService } from "./auth/tenant-publish-policy.service";
import { PlatformTenantsController } from "./platform-tenants.controller";

function createController(): PlatformTenantsController {
	return new PlatformTenantsController(
		new TenantProvisioningService(
			new PlatformAccessService(),
			new TenantProvisioningTemplateService()
		),
		new TenantProvisioningSummaryService(),
		new PlatformTenantOperationalSummaryService(
			new PlatformAccessService(),
			new TenantPublishPolicyService()
		)
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

	it("returns cross-tenant operational summaries for authorized platform viewers", () => {
		const controller = createController();

		expect(
			controller.listOperationalSummaries(
				{
					tenants: [
						{
							customDomains: ["alpha.example.com"],
							displayName: "Alpha Fitness",
							id: "tenant-1",
							lastLifecycleAuditAt: "2026-03-17T05:00:00.000Z",
							previewSubdomain: "alpha",
							slug: "alpha-fitness",
							status: "active"
						}
					]
				},
				{
					platformViewer: {
						actorType: "platform",
						platformRole: "support",
						userId: "platform-user-1"
					}
				}
			)
		).toEqual([
			{
				customDomainCount: 1,
				healthReasons: [],
				healthStatus: "healthy",
				lastLifecycleAuditAt: "2026-03-17T05:00:00.000Z",
				lifecycleStatus: "active",
				liveRoutingStatus: "custom-domain-configured",
				previewStatus: "configured",
				previewSubdomain: "alpha",
				publishBlockedReason: null,
				publishStatus: "ready",
				tenantDisplayName: "Alpha Fitness",
				tenantId: "tenant-1",
				tenantSlug: "alpha-fitness"
			}
		]);
	});

	it("rejects invalid operational summary payloads before service execution", () => {
		const controller = createController();

		expect(() =>
			controller.listOperationalSummaries(
				{
					tenants: [
						{
							displayName: "Alpha Fitness",
							id: "tenant-1",
							previewSubdomain: "alpha",
							slug: "alpha-fitness",
							status: "unknown"
						}
					]
				},
				{}
			)
		).toThrow(AuthApiContractError);
	});

	it("rejects unauthorized operational summary queries", () => {
		const controller = createController();

		expect(() =>
			controller.listOperationalSummaries(
				{
					tenants: [
						{
							displayName: "Alpha Fitness",
							id: "tenant-1",
							previewSubdomain: "alpha",
							slug: "alpha-fitness",
							status: "active"
						}
					]
				},
				{
					platformViewer: {
						actorType: "tenant",
						platformRole: null,
						userId: "tenant-user-1"
					}
				}
			)
		).toThrow(PlatformAccessDeniedError);
	});
});