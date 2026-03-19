import { describe, expect, it } from "vitest";

import type { TenantResolutionTenantRecord } from "@platform/types";

import type { TenantBootstrapDataSource } from "./tenant-context";
import {
	executeTenantBootstrap,
	readBootstrapOverride,
	readManagedPreviewDomains
} from "./tenant-context";

// ── Test Fixtures ────────────────────────────────────────────────────────────

function createTenant(
	overrides: Partial<TenantResolutionTenantRecord> = {}
): TenantResolutionTenantRecord {
	return {
		id: "t-001",
		displayName: "Joe's Diner",
		slug: "joes-diner",
		status: "active",
		previewSubdomain: "joes-diner",
		...overrides
	};
}

const defaultTenants: readonly TenantResolutionTenantRecord[] = [
	createTenant(),
	createTenant({
		id: "t-002",
		displayName: "Pizza Place",
		slug: "pizza-place",
		previewSubdomain: "pizza-place",
		customDomains: ["www.pizzaplace.com"]
	})
];

const defaultTenantConfig = {
	templateKey: "restaurant-core" as const,
	enabledModules: ["catalog" as const, "ordering" as const]
};

function createDataSource(
	tenants: readonly TenantResolutionTenantRecord[] = defaultTenants,
	tenantConfig = defaultTenantConfig
): TenantBootstrapDataSource {
	return async () => ({ tenants, tenantConfig });
}

function createThrowingDataSource(): TenantBootstrapDataSource {
	return async () => {
		throw new Error("network failure");
	};
}

// ── executeTenantBootstrap ───────────────────────────────────────────────────

describe("executeTenantBootstrap", () => {
	it("resolves tenant from managed subdomain", async () => {
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: createDataSource()
		});

		expect(result.phase).toBe("resolved");

		if (result.phase === "resolved") {
			expect(result.context.tenantId).toBe("t-001");
			expect(result.context.slug).toBe("joes-diner");
			expect(result.context.templateKey).toBe("restaurant-core");
			expect(result.context.enabledModules).toEqual(["catalog", "ordering"]);
		}
	});

	it("resolves tenant from custom domain", async () => {
		const result = await executeTenantBootstrap({
			host: "www.pizzaplace.com",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: createDataSource()
		});

		expect(result.phase).toBe("resolved");

		if (result.phase === "resolved") {
			expect(result.context.tenantId).toBe("t-002");
			expect(result.context.slug).toBe("pizza-place");
		}
	});

	it("fails with tenant-not-found for unknown host", async () => {
		const result = await executeTenantBootstrap({
			host: "unknown.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: createDataSource()
		});

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "tenant-not-found");
	});

	it("fails with no-host when host is null", async () => {
		const result = await executeTenantBootstrap({
			host: null,
			managedPreviewDomains: ["preview.localhost"],
			fetchData: createDataSource()
		});

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "no-host");
	});

	it("fails with api-unreachable when data source throws", async () => {
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: createThrowingDataSource()
		});

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "api-unreachable");
	});

	it("fails with tenant-suspended for suspended tenant", async () => {
		const suspendedTenants = [createTenant({ status: "suspended" })];
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: createDataSource(suspendedTenants)
		});

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "tenant-suspended");
	});

	it("fails with tenant-archived for archived tenant", async () => {
		const archivedTenants = [createTenant({ status: "archived" })];
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: createDataSource(archivedTenants)
		});

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "tenant-archived");
	});

	it("resolved context includes all required fields", async () => {
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: createDataSource()
		});

		expect(result.phase).toBe("resolved");

		if (result.phase === "resolved") {
			const ctx = result.context;

			expect(ctx).toHaveProperty("tenantId");
			expect(ctx).toHaveProperty("displayName");
			expect(ctx).toHaveProperty("slug");
			expect(ctx).toHaveProperty("status");
			expect(ctx).toHaveProperty("previewSubdomain");
			expect(ctx).toHaveProperty("templateKey");
			expect(ctx).toHaveProperty("enabledModules");
		}
	});
});

// ── readBootstrapOverride ────────────────────────────────────────────────────

describe("readBootstrapOverride", () => {
	it("returns null for null input", () => {
		expect(readBootstrapOverride(null)).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(readBootstrapOverride("")).toBeNull();
	});

	it("returns null for invalid JSON", () => {
		expect(readBootstrapOverride("{invalid}")).toBeNull();
	});

	it("returns null when tenants is missing", () => {
		expect(readBootstrapOverride('{"tenantConfig": null}')).toBeNull();
	});

	it("returns null when tenants is not an array", () => {
		expect(readBootstrapOverride('{"tenants": "not-array"}')).toBeNull();
	});

	it("parses valid override data", () => {
		const data = {
			tenants: [
				{
					id: "t-001",
					displayName: "Test",
					slug: "test",
					status: "active",
					previewSubdomain: "test"
				}
			],
			tenantConfig: {
				templateKey: "restaurant-core",
				enabledModules: ["catalog"]
			}
		};
		const result = readBootstrapOverride(JSON.stringify(data));

		expect(result).not.toBeNull();
		expect(result!.tenants).toHaveLength(1);
		expect(result!.tenantConfig?.templateKey).toBe("restaurant-core");
	});
});

// ── readManagedPreviewDomains ────────────────────────────────────────────────

describe("readManagedPreviewDomains", () => {
	it("returns default when raw is undefined", () => {
		const result = readManagedPreviewDomains(undefined);

		expect(result).toEqual(["preview.localhost"]);
	});

	it("returns default when raw is empty string", () => {
		const result = readManagedPreviewDomains("");

		expect(result).toEqual(["preview.localhost"]);
	});

	it("parses single domain", () => {
		const result = readManagedPreviewDomains("preview.example.com");

		expect(result).toEqual(["preview.example.com"]);
	});

	it("parses comma-separated domains", () => {
		const result = readManagedPreviewDomains(
			"preview.example.com, staging.example.com"
		);

		expect(result).toEqual(["preview.example.com", "staging.example.com"]);
	});

	it("filters empty entries from trailing commas", () => {
		const result = readManagedPreviewDomains("preview.example.com,,");

		expect(result).toEqual(["preview.example.com"]);
	});
});
