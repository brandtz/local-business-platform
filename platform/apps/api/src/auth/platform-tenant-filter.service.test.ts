import { describe, expect, it } from "vitest";

import type { PlatformTenantOperationalSummary } from "@platform/types";

import { PlatformAccessDeniedError, PlatformAccessService } from "./platform-access.service";
import { PlatformTenantFilterService } from "./platform-tenant-filter.service";

const service = new PlatformTenantFilterService(new PlatformAccessService());

const platformActor = { actorType: "platform" as const, platformRole: "support" as const, userId: "user-1" };

function buildSummary(
	overrides: Partial<PlatformTenantOperationalSummary> = {}
): PlatformTenantOperationalSummary {
	return {
		customDomainCount: 0,
		healthReasons: [],
		healthStatus: "healthy",
		lastLifecycleAuditAt: null,
		lifecycleStatus: "active",
		liveRoutingStatus: "managed-subdomain-only",
		previewStatus: "configured",
		previewSubdomain: "alpha.preview.example.com",
		publishBlockedReason: null,
		publishStatus: "ready",
		tenantDisplayName: "Alpha Restaurant",
		tenantId: "tenant-1",
		tenantSlug: "alpha-restaurant",
		...overrides
	};
}

const tenants: PlatformTenantOperationalSummary[] = [
	buildSummary(),
	buildSummary({
		tenantDisplayName: "Bravo Cafe",
		tenantId: "tenant-2",
		tenantSlug: "bravo-cafe",
		lifecycleStatus: "draft",
		publishStatus: "blocked",
		publishBlockedReason: "tenant-inactive",
		healthStatus: "attention-required",
		healthReasons: ["tenant-inactive"],
		previewSubdomain: "bravo.preview.example.com"
	}),
	buildSummary({
		tenantDisplayName: "Charlie Bistro",
		tenantId: "tenant-3",
		tenantSlug: "charlie-bistro",
		liveRoutingStatus: "custom-domain-configured",
		customDomainCount: 2,
		previewSubdomain: "charlie.preview.example.com"
	}),
	buildSummary({
		tenantDisplayName: "Delta Grill",
		tenantId: "tenant-4",
		tenantSlug: "delta-grill",
		lifecycleStatus: "suspended",
		publishStatus: "blocked",
		publishBlockedReason: "tenant-suspended",
		healthStatus: "attention-required",
		healthReasons: ["tenant-suspended"],
		previewSubdomain: null,
		previewStatus: "missing"
	})
];

describe("platform tenant filter service", () => {
	it("denies non-platform actors", () => {
		expect(() =>
			service.filterSummaries(
				{ actorType: "tenant", platformRole: null, userId: "user-1" },
				tenants,
				{}
			)
		).toThrow(PlatformAccessDeniedError);
	});

	it("returns all tenants when no filter criteria are applied", () => {
		const result = service.filterSummaries(platformActor, tenants, {});

		expect(result).toHaveLength(4);
	});

	it("filters by lifecycle status", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			lifecycleStatus: "active"
		});

		expect(result).toHaveLength(2);
		expect(result.every((s) => s.lifecycleStatus === "active")).toBe(true);
	});

	it("filters by publish status", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			publishStatus: "blocked"
		});

		expect(result).toHaveLength(2);
		expect(result.map((s) => s.tenantId)).toEqual(["tenant-2", "tenant-4"]);
	});

	it("filters by health status", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			healthStatus: "attention-required"
		});

		expect(result).toHaveLength(2);
		expect(result.map((s) => s.tenantId)).toEqual(["tenant-2", "tenant-4"]);
	});

	it("filters by live routing status", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			liveRoutingStatus: "custom-domain-configured"
		});

		expect(result).toHaveLength(1);
		expect(result[0].tenantId).toBe("tenant-3");
	});

	it("searches by tenant display name (case-insensitive)", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			searchText: "bravo"
		});

		expect(result).toHaveLength(1);
		expect(result[0].tenantId).toBe("tenant-2");
	});

	it("searches by tenant slug", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			searchText: "charlie-bistro"
		});

		expect(result).toHaveLength(1);
		expect(result[0].tenantId).toBe("tenant-3");
	});

	it("searches by preview subdomain", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			searchText: "alpha.preview"
		});

		expect(result).toHaveLength(1);
		expect(result[0].tenantId).toBe("tenant-1");
	});

	it("applies compound filters (lifecycle + publish)", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			lifecycleStatus: "draft",
			publishStatus: "blocked"
		});

		expect(result).toHaveLength(1);
		expect(result[0].tenantId).toBe("tenant-2");
	});

	it("applies compound filters (health + search)", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			healthStatus: "attention-required",
			searchText: "delta"
		});

		expect(result).toHaveLength(1);
		expect(result[0].tenantId).toBe("tenant-4");
	});

	it("returns empty set when filters match nothing", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			lifecycleStatus: "archived"
		});

		expect(result).toHaveLength(0);
	});

	it("returns empty set when search matches nothing", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			searchText: "nonexistent"
		});

		expect(result).toHaveLength(0);
	});

	it("handles null preview subdomain gracefully in search", () => {
		const result = service.filterSummaries(platformActor, tenants, {
			searchText: "delta"
		});

		expect(result).toHaveLength(1);
		expect(result[0].tenantId).toBe("tenant-4");
		expect(result[0].previewSubdomain).toBeNull();
	});
});
