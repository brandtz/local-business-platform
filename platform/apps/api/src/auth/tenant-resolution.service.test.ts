import { describe, expect, it } from "vitest";

import type { TenantResolutionTenantRecord } from "@platform/types";

import { TenantResolutionService } from "./tenant-resolution.service";

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

describe("tenant resolution service", () => {
	it("detects platform-admin domains without producing tenant context", () => {
		const service = new TenantResolutionService({
			managedPreviewDomains: ["preview.local"],
			platformAdminDomains: ["platform.local"]
		});

		expect(
			service.resolveTenant({
				host: "platform.local",
				routeSpace: "platform-admin",
				tenants
			})
		).toEqual({
			kind: "platform-admin",
			normalizedHost: "platform.local",
			source: "platform-admin-domain"
		});
	});

	it("prefers trusted tenant-admin context over host-derived tenant matches", () => {
		const service = new TenantResolutionService({
			managedPreviewDomains: ["preview.local"],
			platformAdminDomains: ["platform.local"]
		});

		const resolution = service.resolveTenant({
			adminTenantId: "tenant-2",
			host: "alpha.example.com",
			routeSpace: "tenant-admin",
			tenants
		});

		expect(resolution.kind).toBe("tenant");
		if (resolution.kind !== "tenant") {
			throw new Error("Expected tenant resolution.");
		}

		expect(resolution.source).toBe("tenant-admin-context");
		expect(resolution.tenant.id).toBe("tenant-2");
	});

	it("resolves tenant storefront requests by custom domain", () => {
		const service = new TenantResolutionService({
			managedPreviewDomains: ["preview.local"]
		});

		const resolution = service.resolveTenant({
			host: "alpha.example.com",
			routeSpace: "customer",
			tenants
		});

		expect(resolution.kind).toBe("tenant");
		if (resolution.kind !== "tenant") {
			throw new Error("Expected tenant resolution.");
		}

		expect(resolution.source).toBe("custom-domain");
		expect(resolution.tenant.slug).toBe("alpha-fitness");
	});

	it("resolves tenant storefront requests by managed preview subdomain", () => {
		const service = new TenantResolutionService({
			managedPreviewDomains: ["preview.local"]
		});

		const resolution = service.resolveTenant({
			host: "bravo.preview.local",
			routeSpace: "customer",
			tenants
		});

		expect(resolution.kind).toBe("tenant");
		if (resolution.kind !== "tenant") {
			throw new Error("Expected tenant resolution.");
		}

		expect(resolution.source).toBe("preview-subdomain");
		expect(resolution.tenant.id).toBe("tenant-2");
	});

	it("fails closed when platform-admin routes arrive on non-platform hosts", () => {
		const service = new TenantResolutionService({
			managedPreviewDomains: ["preview.local"],
			platformAdminDomains: ["platform.local"]
		});

		expect(
			service.resolveTenant({
				host: "alpha.example.com",
				routeSpace: "platform-admin",
				tenants
			})
		).toEqual({
			kind: "unresolved",
			normalizedHost: "alpha.example.com",
			source: "unresolved"
		});
	});
});