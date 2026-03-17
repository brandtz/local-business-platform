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
		customDomains: ["bravo.example.com"],
		displayName: "Bravo Cafe",
		id: "tenant-2",
		previewSubdomain: "bravo",
		slug: "bravo-cafe",
		status: "draft"
	}
];

describe("preview route resolution service", () => {
	it("resolves storefront preview hosts to the correct tenant and surface", () => {
		const service = new PreviewRouteResolutionService({
			managedAdminPreviewDomains: ["admin-preview.local"],
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		const result = service.resolve({
			host: "alpha.preview.local",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("storefront");
		expect(result.tenant.id).toBe("tenant-1");
		expect(result.normalizedHost).toBe("alpha.preview.local");
	});

	it("resolves admin preview hosts to the correct tenant and surface", () => {
		const service = new PreviewRouteResolutionService({
			managedAdminPreviewDomains: ["admin-preview.local"],
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		const result = service.resolve({
			host: "bravo.admin-preview.local",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("admin");
		expect(result.tenant.id).toBe("tenant-2");
		expect(result.normalizedHost).toBe("bravo.admin-preview.local");
	});

	it("fails closed with no-host when the host is missing", () => {
		const service = new PreviewRouteResolutionService({
			managedAdminPreviewDomains: ["admin-preview.local"],
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		expect(service.resolve({ host: null, tenants })).toEqual({
			kind: "unresolved",
			normalizedHost: null,
			reason: "no-host"
		});

		expect(service.resolve({ host: undefined, tenants })).toEqual({
			kind: "unresolved",
			normalizedHost: null,
			reason: "no-host"
		});

		expect(service.resolve({ host: "", tenants })).toEqual({
			kind: "unresolved",
			normalizedHost: null,
			reason: "no-host"
		});
	});

	it("fails closed with no-matching-domain for hosts outside managed domains", () => {
		const service = new PreviewRouteResolutionService({
			managedAdminPreviewDomains: ["admin-preview.local"],
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		expect(
			service.resolve({ host: "alpha.unmanaged.local", tenants })
		).toEqual({
			kind: "unresolved",
			normalizedHost: "alpha.unmanaged.local",
			reason: "no-matching-domain"
		});
	});

	it("fails closed with no-matching-tenant when the subdomain does not match any tenant", () => {
		const service = new PreviewRouteResolutionService({
			managedAdminPreviewDomains: ["admin-preview.local"],
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		expect(
			service.resolve({ host: "unknown.preview.local", tenants })
		).toEqual({
			kind: "unresolved",
			normalizedHost: "unknown.preview.local",
			reason: "no-matching-tenant"
		});
	});

	it("fails closed with no-matching-domain for bare managed domains without subdomains", () => {
		const service = new PreviewRouteResolutionService({
			managedAdminPreviewDomains: ["admin-preview.local"],
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		expect(service.resolve({ host: "preview.local", tenants })).toEqual({
			kind: "unresolved",
			normalizedHost: "preview.local",
			reason: "no-matching-domain"
		});

		expect(service.resolve({ host: "admin-preview.local", tenants })).toEqual({
			kind: "unresolved",
			normalizedHost: "admin-preview.local",
			reason: "no-matching-domain"
		});
	});

	it("never resolves a storefront host into the admin surface or vice versa", () => {
		const service = new PreviewRouteResolutionService({
			managedAdminPreviewDomains: ["admin-preview.local"],
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		const storefrontResult = service.resolve({
			host: "alpha.preview.local",
			tenants
		});

		expect(storefrontResult.kind).toBe("resolved");
		if (storefrontResult.kind === "resolved") {
			expect(storefrontResult.surface).toBe("storefront");
		}

		const adminResult = service.resolve({
			host: "alpha.admin-preview.local",
			tenants
		});

		expect(adminResult.kind).toBe("resolved");
		if (adminResult.kind === "resolved") {
			expect(adminResult.surface).toBe("admin");
		}
	});

	it("normalizes host casing and port before resolution", () => {
		const service = new PreviewRouteResolutionService({
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		const result = service.resolve({
			host: "Alpha.Preview.Local:3000",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("storefront");
		expect(result.tenant.id).toBe("tenant-1");
	});

	it("prevents cross-tenant resolution by matching only the exact preview subdomain", () => {
		const service = new PreviewRouteResolutionService({
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		const result = service.resolve({
			host: "bravo.preview.local",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.tenant.id).toBe("tenant-2");
		expect(result.tenant.id).not.toBe("tenant-1");
	});

	it("rejects nested subdomain chains on managed preview domains", () => {
		const service = new PreviewRouteResolutionService({
			managedStorefrontPreviewDomains: ["preview.local"]
		});

		expect(
			service.resolve({ host: "deep.alpha.preview.local", tenants })
		).toEqual({
			kind: "unresolved",
			normalizedHost: "deep.alpha.preview.local",
			reason: "no-matching-domain"
		});
	});

	it("returns unresolved when no managed domains are configured", () => {
		const service = new PreviewRouteResolutionService({});

		expect(
			service.resolve({ host: "alpha.preview.local", tenants })
		).toEqual({
			kind: "unresolved",
			normalizedHost: "alpha.preview.local",
			reason: "no-matching-domain"
		});
	});
});
