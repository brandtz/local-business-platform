import { describe, expect, it } from "vitest";

import type {
	PreviewEnvironmentMetadata,
	PreviewEnvironmentMetadataOptions,
	TenantStatus
} from "@platform/types";

import {
	PreviewEnvironmentMetadataService,
	type PreviewEnvironmentMetadataRequest
} from "./preview-environment-metadata.service";

const defaultDomainConfig: PreviewEnvironmentMetadataOptions = {
	managedPreviewAdminDomain: "admin.preview.local",
	managedPreviewStorefrontDomain: "preview.local"
};

function createService(
	config: PreviewEnvironmentMetadataOptions = defaultDomainConfig
): PreviewEnvironmentMetadataService {
	return new PreviewEnvironmentMetadataService(config);
}

function makeRequest(
	overrides: Partial<PreviewEnvironmentMetadataRequest> = {}
): PreviewEnvironmentMetadataRequest {
	return {
		previewSubdomain: "alpha",
		tenantId: "tenant-1",
		tenantStatus: "active",
		...overrides
	};
}

describe("preview environment metadata service", () => {
	describe("environment status", () => {
		it("returns configured when tenant has subdomain and accessible status", () => {
			const service = createService();

			const result = service.derive(makeRequest());

			expect(result.environmentStatus).toBe("configured");
		});

		it("returns configured for draft tenants with subdomain", () => {
			const service = createService();

			const result = service.derive(makeRequest({ tenantStatus: "draft" }));

			expect(result.environmentStatus).toBe("configured");
		});

		it("returns not-configured when subdomain is empty", () => {
			const service = createService();

			const result = service.derive(makeRequest({ previewSubdomain: "" }));

			expect(result.environmentStatus).toBe("not-configured");
		});

		it.each<TenantStatus>(["suspended", "archived"])(
			"returns not-configured for %s tenant status",
			(status) => {
				const service = createService();

				const result = service.derive(makeRequest({ tenantStatus: status }));

				expect(result.environmentStatus).toBe("not-configured");
			}
		);
	});

	describe("surface entries", () => {
		it("returns both storefront and admin surfaces", () => {
			const service = createService();

			const result = service.derive(makeRequest());

			expect(result.surfaces).toHaveLength(2);
			expect(result.surfaces.map((s) => s.surface)).toEqual([
				"storefront",
				"admin"
			]);
		});

		it("derives correct storefront preview URL", () => {
			const service = createService();

			const result = service.derive(makeRequest());
			const storefront = result.surfaces.find(
				(s) => s.surface === "storefront"
			);

			expect(storefront?.previewUrl).toBe("alpha.preview.local");
			expect(storefront?.available).toBe(true);
		});

		it("derives correct admin preview URL", () => {
			const service = createService();

			const result = service.derive(makeRequest());
			const admin = result.surfaces.find((s) => s.surface === "admin");

			expect(admin?.previewUrl).toBe("alpha.admin.preview.local");
			expect(admin?.available).toBe(true);
		});

		it("marks surfaces unavailable for inaccessible tenant statuses", () => {
			const service = createService();

			const result = service.derive(
				makeRequest({ tenantStatus: "suspended" })
			);

			for (const entry of result.surfaces) {
				expect(entry.available).toBe(false);
			}
		});

		it("retains URLs even when tenant is inaccessible", () => {
			const service = createService();

			const result = service.derive(
				makeRequest({ tenantStatus: "suspended" })
			);

			const storefront = result.surfaces.find(
				(s) => s.surface === "storefront"
			);
			expect(storefront?.previewUrl).toBe("alpha.preview.local");
		});

		it("returns null URL when no subdomain", () => {
			const service = createService();

			const result = service.derive(
				makeRequest({ previewSubdomain: "" })
			);

			for (const entry of result.surfaces) {
				expect(entry.previewUrl).toBeNull();
				expect(entry.available).toBe(false);
			}
		});

		it("returns null URL when domain config is missing for surface", () => {
			const service = createService({
				managedPreviewAdminDomain: null,
				managedPreviewStorefrontDomain: null
			});

			const result = service.derive(makeRequest());
			const storefront = result.surfaces.find(
				(s) => s.surface === "storefront"
			);
			const admin = result.surfaces.find((s) => s.surface === "admin");

			expect(storefront?.previewUrl).toBeNull();
			expect(storefront?.available).toBe(false);
			expect(admin?.previewUrl).toBeNull();
			expect(admin?.available).toBe(false);
		});
	});

	describe("tenant context", () => {
		it("includes tenantId in result", () => {
			const service = createService();

			const result = service.derive(
				makeRequest({ tenantId: "tenant-42" })
			);

			expect(result.tenantId).toBe("tenant-42");
		});

		it("includes previewSubdomain in result", () => {
			const service = createService();

			const result = service.derive(
				makeRequest({ previewSubdomain: "beta" })
			);

			expect(result.previewSubdomain).toBe("beta");
		});
	});

	describe("contract shape stability", () => {
		it("returns all required fields in PreviewEnvironmentMetadata", () => {
			const service = createService();

			const result: PreviewEnvironmentMetadata = service.derive(
				makeRequest()
			);

			expect(result).toHaveProperty("environmentStatus");
			expect(result).toHaveProperty("previewSubdomain");
			expect(result).toHaveProperty("surfaces");
			expect(result).toHaveProperty("tenantId");
		});

		it("each surface entry has required fields", () => {
			const service = createService();

			const result = service.derive(makeRequest());

			for (const entry of result.surfaces) {
				expect(entry).toHaveProperty("surface");
				expect(entry).toHaveProperty("previewUrl");
				expect(entry).toHaveProperty("available");
			}
		});
	});

	describe("provisioning integration", () => {
		it("derives metadata consistent with freshly provisioned tenant", () => {
			const service = createService();

			const result = service.derive(
				makeRequest({
					previewSubdomain: "new-tenant",
					tenantId: "tenant-new",
					tenantStatus: "draft"
				})
			);

			expect(result.environmentStatus).toBe("configured");
			expect(result.previewSubdomain).toBe("new-tenant");
			expect(result.tenantId).toBe("tenant-new");
			expect(result.surfaces.every((s) =>
				s.previewUrl?.includes("new-tenant")
			)).toBe(true);
		});
	});
});
