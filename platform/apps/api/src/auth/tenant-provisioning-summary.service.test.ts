import { describe, expect, it } from "vitest";

import { TenantProvisioningSummaryService } from "./tenant-provisioning-summary.service";

const service = new TenantProvisioningSummaryService();

describe("tenant provisioning summary service", () => {
	it("creates a stable onboarding summary payload from the provisioning result", () => {
		expect(
			service.createSummary({
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
					joinedAt: "2026-03-16T23:30:00.000Z",
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
			})
		).toEqual({
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
			ownerUserId: "tenant-user-1",
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
			previewSubdomain: "alpha",
			tenantDisplayName: "Alpha Fitness",
			tenantId: "tenant-1",
			tenantSlug: "alpha-fitness",
			tenantStatus: "draft",
			verticalTemplate: "hybrid-local-business"
		});
	});
});