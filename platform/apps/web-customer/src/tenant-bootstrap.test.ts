import { describe, expect, it } from "vitest";

import type { TenantResolutionTenantRecord } from "@platform/types";

import {
	bootstrapFailureReasons,
	bootstrapPhases,
	createFailedResult,
	createInitializingResult,
	createResolvedResult,
	describeBootstrapResult,
	isBootstrapFailed,
	isBootstrapResolved,
	resolveBootstrap,
	type TenantBootstrapConfig,
	type TenantConfigPayload,
	type TenantFrontendContext
} from "./tenant-bootstrap";

// ── Test Fixtures ────────────────────────────────────────────────────────────

const managedDomains = ["preview.example.com"] as const;

const config: TenantBootstrapConfig = {
	managedPreviewDomains: managedDomains
};

const tenantConfig: TenantConfigPayload = {
	templateKey: "restaurant-core",
	enabledModules: ["catalog", "ordering"]
};

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

const activeTenants: TenantResolutionTenantRecord[] = [
	createTenant(),
	createTenant({
		id: "t-002",
		displayName: "Pizza Place",
		slug: "pizza-place",
		previewSubdomain: "pizza-place",
		customDomains: ["www.pizzaplace.com"]
	})
];

// ── Bootstrap Constants ──────────────────────────────────────────────────────

describe("bootstrap constants", () => {
	it("defines expected phases", () => {
		expect(bootstrapPhases).toContain("initializing");
		expect(bootstrapPhases).toContain("resolved");
		expect(bootstrapPhases).toContain("failed");
	});

	it("defines expected failure reasons", () => {
		expect(bootstrapFailureReasons).toContain("no-host");
		expect(bootstrapFailureReasons).toContain("tenant-not-found");
		expect(bootstrapFailureReasons).toContain("tenant-suspended");
		expect(bootstrapFailureReasons).toContain("tenant-archived");
		expect(bootstrapFailureReasons).toContain("api-unreachable");
	});
});

// ── resolveBootstrap — Host Resolution ───────────────────────────────────────

describe("resolveBootstrap — managed subdomain", () => {
	it("resolves tenant from managed subdomain host", () => {
		const result = resolveBootstrap(
			"joes-diner.preview.example.com",
			activeTenants,
			config,
			tenantConfig
		);

		expect(result.phase).toBe("resolved");

		if (result.phase === "resolved") {
			expect(result.context.tenantId).toBe("t-001");
			expect(result.context.slug).toBe("joes-diner");
			expect(result.context.templateKey).toBe("restaurant-core");
			expect(result.context.enabledModules).toEqual(["catalog", "ordering"]);
		}
	});

	it("resolves case-insensitively", () => {
		const result = resolveBootstrap(
			"JOES-DINER.Preview.Example.Com",
			activeTenants,
			config,
			tenantConfig
		);

		expect(result.phase).toBe("resolved");
	});

	it("strips port from host before resolution", () => {
		const result = resolveBootstrap(
			"joes-diner.preview.example.com:3000",
			activeTenants,
			config,
			tenantConfig
		);

		expect(result.phase).toBe("resolved");
	});
});

describe("resolveBootstrap — custom domain", () => {
	it("resolves tenant from custom domain", () => {
		const result = resolveBootstrap(
			"www.pizzaplace.com",
			activeTenants,
			config,
			tenantConfig
		);

		expect(result.phase).toBe("resolved");

		if (result.phase === "resolved") {
			expect(result.context.tenantId).toBe("t-002");
			expect(result.context.slug).toBe("pizza-place");
		}
	});
});

// ── resolveBootstrap — Failure Cases ─────────────────────────────────────────

describe("resolveBootstrap — failure cases", () => {
	it("fails with no-host when host is null", () => {
		const result = resolveBootstrap(null, activeTenants, config, tenantConfig);

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "no-host");
	});

	it("fails with no-host when host is empty string", () => {
		const result = resolveBootstrap("", activeTenants, config, tenantConfig);

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "no-host");
	});

	it("fails with no-host when host is undefined", () => {
		const result = resolveBootstrap(undefined, activeTenants, config, tenantConfig);

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "no-host");
	});

	it("fails with tenant-not-found for unknown host", () => {
		const result = resolveBootstrap(
			"unknown.preview.example.com",
			activeTenants,
			config,
			tenantConfig
		);

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "tenant-not-found");
	});

	it("fails with tenant-not-found for host not matching any domain", () => {
		const result = resolveBootstrap(
			"www.random-site.com",
			activeTenants,
			config,
			tenantConfig
		);

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "tenant-not-found");
	});

	it("fails with tenant-suspended for suspended tenant", () => {
		const suspendedTenants = [createTenant({ status: "suspended" })];
		const result = resolveBootstrap(
			"joes-diner.preview.example.com",
			suspendedTenants,
			config,
			tenantConfig
		);

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "tenant-suspended");
	});

	it("fails with tenant-archived for archived tenant", () => {
		const archivedTenants = [createTenant({ status: "archived" })];
		const result = resolveBootstrap(
			"joes-diner.preview.example.com",
			archivedTenants,
			config,
			tenantConfig
		);

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "tenant-archived");
	});

	it("fails with api-unreachable when tenant config is null", () => {
		const result = resolveBootstrap(
			"joes-diner.preview.example.com",
			activeTenants,
			config,
			null
		);

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "api-unreachable");
	});
});

// ── resolveBootstrap — Tenant Context Shape ──────────────────────────────────

describe("resolveBootstrap — tenant context shape", () => {
	it("includes all required fields in resolved context", () => {
		const result = resolveBootstrap(
			"joes-diner.preview.example.com",
			activeTenants,
			config,
			tenantConfig
		);

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

	it("allows draft tenants to resolve", () => {
		const draftTenants = [createTenant({ status: "draft" })];
		const result = resolveBootstrap(
			"joes-diner.preview.example.com",
			draftTenants,
			config,
			tenantConfig
		);

		expect(result.phase).toBe("resolved");
	});
});

// ── Factory Functions ────────────────────────────────────────────────────────

describe("factory functions", () => {
	it("createInitializingResult returns initializing phase", () => {
		const result = createInitializingResult();

		expect(result.phase).toBe("initializing");
	});

	it("createFailedResult returns failed phase with reason", () => {
		const result = createFailedResult("tenant-not-found");

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "tenant-not-found");
	});

	it("createResolvedResult returns resolved phase with context", () => {
		const context: TenantFrontendContext = {
			tenantId: "t-001",
			displayName: "Joe's Diner",
			slug: "joes-diner",
			status: "active",
			previewSubdomain: "joes-diner",
			templateKey: "restaurant-core",
			enabledModules: ["catalog", "ordering"]
		};
		const result = createResolvedResult(context);

		expect(result.phase).toBe("resolved");
		expect(result).toHaveProperty("context", context);
	});
});

// ── Phase Inspection ─────────────────────────────────────────────────────────

describe("phase inspection", () => {
	it("isBootstrapResolved returns true for resolved", () => {
		const resolved = resolveBootstrap(
			"joes-diner.preview.example.com",
			activeTenants,
			config,
			tenantConfig
		);

		expect(isBootstrapResolved(resolved)).toBe(true);
	});

	it("isBootstrapResolved returns false for failed", () => {
		const failed = createFailedResult("no-host");

		expect(isBootstrapResolved(failed)).toBe(false);
	});

	it("isBootstrapFailed returns true for failed", () => {
		const failed = createFailedResult("tenant-suspended");

		expect(isBootstrapFailed(failed)).toBe(true);
	});

	it("isBootstrapFailed returns false for resolved", () => {
		const resolved = resolveBootstrap(
			"joes-diner.preview.example.com",
			activeTenants,
			config,
			tenantConfig
		);

		expect(isBootstrapFailed(resolved)).toBe(false);
	});
});

// ── describeBootstrapResult ──────────────────────────────────────────────────

describe("describeBootstrapResult", () => {
	it("describes initializing state", () => {
		expect(describeBootstrapResult(createInitializingResult())).toBe(
			"Bootstrap in progress"
		);
	});

	it("describes resolved state with tenant slug", () => {
		const resolved = resolveBootstrap(
			"joes-diner.preview.example.com",
			activeTenants,
			config,
			tenantConfig
		);

		expect(describeBootstrapResult(resolved)).toContain("joes-diner");
	});

	it("describes failed state with reason", () => {
		const failed = createFailedResult("tenant-not-found");

		expect(describeBootstrapResult(failed)).toContain("tenant-not-found");
	});
});
