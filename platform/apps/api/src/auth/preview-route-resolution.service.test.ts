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
		displayName: "Delta Spa",
		id: "tenant-4",
		previewSubdomain: "delta",
		slug: "delta-spa",
		status: "archived"
	}
];

const service = new PreviewRouteResolutionService({
	managedStorefrontPreviewDomains: ["preview.local"],
	managedAdminPreviewDomains: ["admin-preview.local"]
});

describe("preview route resolution service", () => {
	it("resolves storefront preview hosts to the correct tenant and surface", () => {
		const result = service.resolve("alpha.preview.local", tenants);

		expect(result).toEqual({
			kind: "resolved",
			normalizedHost: "alpha.preview.local",
			surface: "storefront",
			tenant: tenants[0]
		});
	});

	it("resolves admin preview hosts to the correct tenant and surface", () => {
		const result = service.resolve("alpha.admin-preview.local", tenants);

		expect(result).toEqual({
			kind: "resolved",
			normalizedHost: "alpha.admin-preview.local",
			surface: "admin",
			tenant: tenants[0]
		});
	});

	it("resolves draft tenants on storefront preview domains", () => {
		const result = service.resolve("bravo.preview.local", tenants);

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("storefront");
		expect(result.tenant.id).toBe("tenant-2");
	});

	it("resolves draft tenants on admin preview domains", () => {
		const result = service.resolve("bravo.admin-preview.local", tenants);

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("admin");
		expect(result.tenant.id).toBe("tenant-2");
	});

	it("denies preview access to suspended tenants", () => {
		const result = service.resolve("charlie.preview.local", tenants);

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "charlie.preview.local",
			reason: "tenant-lifecycle-denied"
		});
	});

	it("denies preview access to archived tenants", () => {
		const result = service.resolve("delta.admin-preview.local", tenants);

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "delta.admin-preview.local",
			reason: "tenant-lifecycle-denied"
		});
	});

	it("fails closed when the subdomain does not match any tenant", () => {
		const result = service.resolve("unknown.preview.local", tenants);

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "unknown.preview.local",
			reason: "tenant-not-found"
		});
	});

	it("fails closed when the host does not match any managed domain", () => {
		const result = service.resolve("alpha.other.local", tenants);

		expect(result).toEqual({
			kind: "unresolved",
			normalizedHost: "alpha.other.local",
			reason: "no-matching-domain"
		});
	});

	it("fails closed when the host is null or undefined", () => {
		expect(service.resolve(null, tenants)).toEqual({
			kind: "unresolved",
			normalizedHost: null,
			reason: "unknown-host"
		});

		expect(service.resolve(undefined, tenants)).toEqual({
			kind: "unresolved",
			normalizedHost: null,
			reason: "unknown-host"
		});
	});

	it("fails closed when the host is an empty string", () => {
		expect(service.resolve("", tenants)).toEqual({
			kind: "unresolved",
			normalizedHost: null,
			reason: "unknown-host"
		});
	});

	it("rejects bare managed domains without a subdomain prefix", () => {
		expect(service.resolve("preview.local", tenants)).toEqual({
			kind: "unresolved",
			normalizedHost: "preview.local",
			reason: "no-matching-domain"
		});

		expect(service.resolve("admin-preview.local", tenants)).toEqual({
			kind: "unresolved",
			normalizedHost: "admin-preview.local",
			reason: "no-matching-domain"
		});
	});

	it("rejects nested subdomain chains as unresolved", () => {
		expect(service.resolve("deep.alpha.preview.local", tenants)).toEqual({
			kind: "unresolved",
			normalizedHost: "deep.alpha.preview.local",
			reason: "no-matching-domain"
		});
	});

	it("normalizes host case and port before resolution", () => {
		const result = service.resolve("Alpha.Preview.Local:3000", tenants);

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.normalizedHost).toBe("alpha.preview.local");
		expect(result.surface).toBe("storefront");
		expect(result.tenant.id).toBe("tenant-1");
	});

	it("prefers storefront domain match over admin domain match for the same host", () => {
		const dualService = new PreviewRouteResolutionService({
			managedStorefrontPreviewDomains: ["preview.local"],
			managedAdminPreviewDomains: ["preview.local"]
		});

		const result = dualService.resolve("alpha.preview.local", tenants);

		expect(result.kind).toBe("resolved");
		if (result.kind !== "resolved") {
			throw new Error("Expected resolved result.");
		}

		expect(result.surface).toBe("storefront");
	});
});
