import { describe, expect, it } from "vitest";

import { PlatformAccessDeniedError, PlatformAccessService } from "./platform-access.service";
import { TenantProvisioningTemplateService } from "./tenant-provisioning-template.service";
import { TenantProvisioningService } from "./tenant-provisioning.service";

const service = new TenantProvisioningService(
	new PlatformAccessService(),
	new TenantProvisioningTemplateService()
);

describe("tenant provisioning service", () => {
	it("creates a draft tenant, primary owner membership, and default seed bundle in one result", () => {
		const result = service.createTenant(
			{
				actorType: "platform",
				platformRole: "admin",
				userId: "platform-user-1"
			},
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
				verticalTemplate: "hybrid-local-business"
			},
			{
				now: new Date("2026-03-16T23:15:00.000Z"),
				previewEnvironment: {
					managedPreviewAdminDomain: "admin.preview.local",
					managedPreviewStorefrontDomain: "preview.local"
				},
				tenantIdFactory: () => "tenant-1"
			}
		);

		expect(result).toEqual({
			defaultConfiguration: {
				brandPreset: "starter-brand",
				currency: "USD",
				navigationPreset: "service-default",
				operatingMode: "hybrid",
				taxMode: "exclusive",
				themePreset: "starter-light",
				timezone: "UTC"
			},
			enabledModules: ["catalog", "ordering", "bookings", "content", "operations"],
			ownerMembership: {
				isPrimary: true,
				joinedAt: "2026-03-16T23:15:00.000Z",
				role: "owner",
				tenant: {
					displayName: "Alpha Fitness",
					id: "tenant-1",
					slug: "alpha-fitness",
					status: "draft"
				},
				userId: "tenant-user-1"
			},
			previewMetadata: {
				environmentStatus: "configured",
				previewSubdomain: "alpha",
				surfaces: [
					{
						available: true,
						previewUrl: "alpha.preview.local",
						surface: "storefront"
					},
					{
						available: true,
						previewUrl: "alpha.admin.preview.local",
						surface: "admin"
					}
				],
				tenantId: "tenant-1"
			},
			tenant: {
				displayName: "Alpha Fitness",
				id: "tenant-1",
				previewSubdomain: "alpha",
				slug: "alpha-fitness",
				status: "draft"
			},
			verticalTemplate: "hybrid-local-business"
		});
	});

	it("allows seeded default overrides without changing the draft lifecycle start state", () => {
		const result = service.createTenant(
			{
				actorType: "platform",
				platformRole: "owner",
				userId: "platform-user-2"
			},
			{
				displayName: "Bravo Cafe",
				owner: {
					actorType: "tenant",
					email: "owner@bravo.example.com",
					id: "tenant-user-2",
					status: "active"
				},
				previewSubdomain: "bravo",
				slug: "bravo-cafe",
				verticalTemplate: "services-core"
			},
			{
				defaults: {
					currency: "CAD",
					timezone: "America/Toronto"
				},
				previewEnvironment: {
					managedPreviewStorefrontDomain: "preview.local"
				},
				tenantIdFactory: () => "tenant-2"
			}
		);

		expect(result.defaultConfiguration.currency).toBe("CAD");
		expect(result.defaultConfiguration.timezone).toBe("America/Toronto");
		expect(result.defaultConfiguration.operatingMode).toBe("booking");
		expect(result.enabledModules).toEqual([
			"catalog",
			"bookings",
			"content",
			"operations"
		]);
		expect(result.tenant.status).toBe("draft");
		expect(result.previewMetadata.environmentStatus).toBe("configured");
		expect(result.previewMetadata.previewSubdomain).toBe("bravo");
	});

	it("denies provisioning for actors without platform tenant-write authority", () => {
		expect(() =>
			service.createTenant(
				{
					actorType: "platform",
					platformRole: "support",
					userId: "platform-user-3"
				},
				{
					displayName: "Charlie Spa",
					owner: {
						actorType: "tenant",
						email: "owner@charlie.example.com",
						id: "tenant-user-3",
						status: "invited"
					},
					previewSubdomain: "charlie",
					slug: "charlie-spa",
					verticalTemplate: "restaurant-core"
				}
			)
		).toThrow(PlatformAccessDeniedError);
	});
});