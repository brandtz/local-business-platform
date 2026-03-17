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
	},
	{
		customDomains: [],
		displayName: "Charlie Gym",
		id: "tenant-3",
		previewSubdomain: "charlie",
		slug: "charlie-gym",
		status: "suspended"
	},
	{
		customDomains: [],
		displayName: "Delta Shop",
		id: "tenant-4",
		previewSubdomain: "delta",
		slug: "delta-shop",
		status: "archived"
	}
];

const service = new PreviewRouteResolutionService({
	managedPreviewAdminDomains: ["admin.preview.local"],
	managedPreviewStorefrontDomains: ["preview.local"]
});

describe("preview route resolution service", () => {
	it("resolves storefront preview hosts to the correct tenant and surface", () => {
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
		expect(result.subdomain).toBe("alpha");
		expect(result.normalizedHost).toBe("alpha.preview.local");
	});

	it("resolves admin preview hosts to the correct tenant and surface", () => {
		const result = service.resolve({
			host: "alpha.admin.preview.local",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("admin");
		expect(result.tenant.id).toBe("tenant-1");
		expect(result.subdomain).toBe("alpha");
		expect(result.normalizedHost).toBe("alpha.admin.preview.local");
	});

	it("allows draft tenants through preview routing", () => {
		const result = service.resolve({
			host: "bravo.preview.local",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("storefront");
		expect(result.tenant.id).toBe("tenant-2");
		expect(result.tenant.status).toBe("draft");
	});

	it("fails closed when the host is missing or empty", () => {
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

	it("fails closed when the host does not match any managed preview domain", () => {
		const result = service.resolve({
			host: "alpha.unknown.local",
			tenants
		});

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "alpha.unknown.local",
			reason: "no-matching-domain"
		});
	});

	it("fails closed when the preview subdomain does not match any tenant", () => {
		const result = service.resolve({
			host: "nonexistent.preview.local",
			tenants
		});

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "nonexistent.preview.local",
			reason: "tenant-not-found"
		});
	});

	it("fails closed for suspended tenants on preview routes", () => {
		const result = service.resolve({
			host: "charlie.preview.local",
			tenants
		});

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "charlie.preview.local",
			reason: "tenant-not-accessible"
		});
	});

	it("fails closed for archived tenants on preview routes", () => {
		const result = service.resolve({
			host: "delta.preview.local",
			tenants
		});

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "delta.preview.local",
			reason: "tenant-not-accessible"
		});
	});

	it("never leaks one tenant context into another through preview resolution", () => {
		const alphaResult = service.resolve({
			host: "alpha.preview.local",
			tenants
		});
		const bravoResult = service.resolve({
			host: "bravo.preview.local",
			tenants
		});

		if (alphaResult.kind !== "resolved" || bravoResult.kind !== "resolved") {
			throw new Error("Expected both to resolve.");
		}

		expect(alphaResult.tenant.id).toBe("tenant-1");
		expect(bravoResult.tenant.id).toBe("tenant-2");
		expect(alphaResult.tenant.id).not.toBe(bravoResult.tenant.id);
	});

	it("resolves the same tenant to distinct surfaces based on host domain", () => {
		const storefrontResult = service.resolve({
			host: "alpha.preview.local",
			tenants
		});
		const adminResult = service.resolve({
			host: "alpha.admin.preview.local",
			tenants
		});

		if (storefrontResult.kind !== "resolved" || adminResult.kind !== "resolved") {
			throw new Error("Expected both to resolve.");
		}

		expect(storefrontResult.tenant.id).toBe(adminResult.tenant.id);
		expect(storefrontResult.surface).toBe("storefront");
		expect(adminResult.surface).toBe("admin");
	});

	it("normalizes host casing and port before resolution", () => {
		const result = service.resolve({
			host: "Alpha.Preview.Local:3000",
			tenants
		});

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.tenant.id).toBe("tenant-1");
		expect(result.normalizedHost).toBe("alpha.preview.local");
	});

	it("fails closed when no managed preview domains are configured", () => {
		const emptyService = new PreviewRouteResolutionService({});
		const result = emptyService.resolve({
			host: "alpha.preview.local",
			tenants
		});

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "alpha.preview.local",
			reason: "no-matching-domain"
		});
	});
});
