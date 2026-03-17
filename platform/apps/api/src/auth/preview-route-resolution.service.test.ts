import { describe, expect, it } from "vitest";

import type { TenantResolutionTenantRecord } from "@platform/types";

import { PreviewRouteResolutionService } from "./preview-route-resolution.service";

const tenants: TenantResolutionTenantRecord[] = [
	{
		customDomains: ["alpha.example.com"],
		displayName: "Alpha Fitness",
		id: "tenant-1",
		previewSubdomain: "alpha",
		slug: "alpha-fitness",
		status: "active"
	},
	{
		customDomains: [],
		displayName: "Bravo Cafe",
		id: "tenant-2",
		previewSubdomain: "bravo",
		slug: "bravo-cafe",
		status: "draft"
	}
];

const service = new PreviewRouteResolutionService({
	managedPreviewAdminDomains: ["admin-preview.local"],
	managedPreviewStorefrontDomains: ["preview.local"]
});

describe("preview route resolution service", () => {
	it("resolves storefront preview hosts to the correct tenant and surface", () => {
		const result = service.resolvePreviewRoute({
			host: "alpha.preview.local",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("storefront");
		expect(result.tenant.id).toBe("tenant-1");
		expect(result.previewSubdomain).toBe("alpha");
		expect(result.normalizedHost).toBe("alpha.preview.local");
	});

	it("resolves admin preview hosts to the correct tenant and surface", () => {
		const result = service.resolvePreviewRoute({
			host: "bravo.admin-preview.local",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("admin");
		expect(result.tenant.id).toBe("tenant-2");
		expect(result.previewSubdomain).toBe("bravo");
		expect(result.normalizedHost).toBe("bravo.admin-preview.local");
	});

	it("fails closed with missing-host when no host is provided", () => {
		expect(
			service.resolvePreviewRoute({ host: null, tenants })
		).toEqual({
			kind: "unresolved",
			normalizedHost: null,
			reason: "missing-host"
		});

		expect(
			service.resolvePreviewRoute({ host: undefined, tenants })
		).toEqual({
			kind: "unresolved",
			normalizedHost: null,
			reason: "missing-host"
		});

		expect(
			service.resolvePreviewRoute({ host: "", tenants })
		).toEqual({
			kind: "unresolved",
			normalizedHost: null,
			reason: "missing-host"
		});
	});

	it("fails closed when host does not match any managed preview domain", () => {
		const result = service.resolvePreviewRoute({
			host: "alpha.unknown-domain.local",
			tenants
		});

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "alpha.unknown-domain.local",
			reason: "no-matching-preview-domain"
		});
	});

	it("fails closed when preview subdomain does not match any tenant", () => {
		const storefrontResult = service.resolvePreviewRoute({
			host: "nonexistent.preview.local",
			tenants
		});

		expect(storefrontResult).toEqual({
			kind: "unresolved",
			normalizedHost: "nonexistent.preview.local",
			reason: "unknown-preview-subdomain"
		});

		const adminResult = service.resolvePreviewRoute({
			host: "nonexistent.admin-preview.local",
			tenants
		});

		expect(adminResult).toEqual({
			kind: "unresolved",
			normalizedHost: "nonexistent.admin-preview.local",
			reason: "unknown-preview-subdomain"
		});
	});

	it("never leaks one tenant into another tenant context across surfaces", () => {
		const storefrontAlpha = service.resolvePreviewRoute({
			host: "alpha.preview.local",
			tenants
		});
		const adminAlpha = service.resolvePreviewRoute({
			host: "alpha.admin-preview.local",
			tenants
		});

		expect(storefrontAlpha.kind).toBe("resolved");
		expect(adminAlpha.kind).toBe("resolved");

		if (storefrontAlpha.kind !== "resolved" || adminAlpha.kind !== "resolved") {
			throw new Error("Expected both to be resolved.");
		}

		expect(storefrontAlpha.tenant.id).toBe(adminAlpha.tenant.id);
		expect(storefrontAlpha.surface).toBe("storefront");
		expect(adminAlpha.surface).toBe("admin");
	});

	it("normalizes host headers before resolution", () => {
		const result = service.resolvePreviewRoute({
			host: " Alpha.Preview.Local:3000 ",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.tenant.id).toBe("tenant-1");
		expect(result.normalizedHost).toBe("alpha.preview.local");
	});

	it("rejects bare managed domains without a subdomain prefix", () => {
		expect(
			service.resolvePreviewRoute({
				host: "preview.local",
				tenants
			})
		).toEqual({
			kind: "unresolved",
			normalizedHost: "preview.local",
			reason: "no-matching-preview-domain"
		});

		expect(
			service.resolvePreviewRoute({
				host: "admin-preview.local",
				tenants
			})
		).toEqual({
			kind: "unresolved",
			normalizedHost: "admin-preview.local",
			reason: "no-matching-preview-domain"
		});
	});

	it("rejects nested subdomain chains as invalid preview hosts", () => {
		expect(
			service.resolvePreviewRoute({
				host: "deep.alpha.preview.local",
				tenants
			})
		).toEqual({
			kind: "unresolved",
			normalizedHost: "deep.alpha.preview.local",
			reason: "no-matching-preview-domain"
		});
	});
});
