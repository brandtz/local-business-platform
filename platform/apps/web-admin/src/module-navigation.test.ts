import { describe, expect, it } from "vitest";

import type { TenantModuleKey } from "@platform/types";
import { tenantModuleKeys } from "@platform/types";

import {
	computeNavigationDelta,
	evaluateModuleRouteGuard,
	filterNavigationForContext,
	type ModuleNavigationContext
} from "./module-navigation";

// ── filterNavigationForContext ────────────────────────────────────────────────

describe("filterNavigationForContext", () => {
	it("owner with all modules sees all sections", () => {
		const context: ModuleNavigationContext = {
			enabledModules: [...tenantModuleKeys],
			role: "owner"
		};

		const entries = filterNavigationForContext(context);

		expect(entries.length).toBe(9); // all 9 sections
	});

	it("catalog-only owner does not see ordering or bookings", () => {
		const context: ModuleNavigationContext = {
			enabledModules: ["catalog"],
			role: "owner"
		};

		const entries = filterNavigationForContext(context);
		const sections = entries.map((e) => e.section);

		expect(sections).toContain("catalog");
		expect(sections).not.toContain("ordering");
		expect(sections).not.toContain("bookings");
	});

	it("staff with operations-only sees dashboard and operations", () => {
		const context: ModuleNavigationContext = {
			enabledModules: ["operations"],
			role: "staff"
		};

		const entries = filterNavigationForContext(context);
		const sections = entries.map((e) => e.section);

		expect(sections).toContain("dashboard");
		expect(sections).toContain("operations");
		expect(sections).not.toContain("settings");
		expect(sections).not.toContain("users");
	});
});

// ── evaluateModuleRouteGuard ─────────────────────────────────────────────────

describe("evaluateModuleRouteGuard", () => {
	it("allows dashboard for any role and modules", () => {
		const result = evaluateModuleRouteGuard("/", {
			enabledModules: [],
			role: "staff"
		});

		expect(result).toEqual({ allowed: true });
	});

	it("blocks ordering route when ordering module is disabled", () => {
		const result = evaluateModuleRouteGuard("/ordering", {
			enabledModules: ["catalog"],
			role: "owner"
		});

		expect(result).toEqual({ allowed: false, reason: "module-disabled" });
	});

	it("allows ordering route when ordering module is enabled", () => {
		const result = evaluateModuleRouteGuard("/ordering", {
			enabledModules: ["catalog", "ordering"],
			role: "owner"
		});

		expect(result).toEqual({ allowed: true });
	});

	it("blocks settings route for manager role", () => {
		const result = evaluateModuleRouteGuard("/settings", {
			enabledModules: [...tenantModuleKeys],
			role: "manager"
		});

		expect(result).toEqual({ allowed: false, reason: "role-denied" });
	});

	it("blocks users route for staff role", () => {
		const result = evaluateModuleRouteGuard("/users", {
			enabledModules: [...tenantModuleKeys],
			role: "staff"
		});

		expect(result).toEqual({ allowed: false, reason: "role-denied" });
	});

	it("allows unknown routes through", () => {
		const result = evaluateModuleRouteGuard("/unknown-page", {
			enabledModules: [],
			role: "staff"
		});

		expect(result).toEqual({ allowed: true });
	});

	it("blocks settings/locations when operations module is disabled", () => {
		const result = evaluateModuleRouteGuard("/settings/locations", {
			enabledModules: ["catalog"],
			role: "owner"
		});

		expect(result).toEqual({ allowed: false, reason: "module-disabled" });
	});

	it("allows settings/locations when operations module is enabled", () => {
		const result = evaluateModuleRouteGuard("/settings/locations", {
			enabledModules: ["operations"],
			role: "owner"
		});

		expect(result).toEqual({ allowed: true });
	});
});

// ── computeNavigationDelta ───────────────────────────────────────────────────

describe("computeNavigationDelta", () => {
	it("detects added sections when modules are enabled", () => {
		const previous: TenantModuleKey[] = ["catalog"];
		const current: TenantModuleKey[] = ["catalog", "ordering"];
		const delta = computeNavigationDelta(previous, current, "owner");

		expect(delta.added).toContain("Ordering");
		expect(delta.removed).toEqual([]);
	});

	it("detects removed sections when modules are disabled", () => {
		const previous: TenantModuleKey[] = ["catalog", "ordering"];
		const current: TenantModuleKey[] = ["catalog"];
		const delta = computeNavigationDelta(previous, current, "owner");

		expect(delta.removed).toContain("Ordering");
		expect(delta.added).toEqual([]);
	});

	it("returns empty delta when modules are unchanged", () => {
		const modules: TenantModuleKey[] = ["catalog", "ordering"];
		const delta = computeNavigationDelta(modules, modules, "owner");

		expect(delta.added).toEqual([]);
		expect(delta.removed).toEqual([]);
	});

	it("handles full module set to empty", () => {
		const delta = computeNavigationDelta(
			[...tenantModuleKeys],
			[],
			"owner"
		);

		expect(delta.removed.length).toBeGreaterThan(0);
		expect(delta.removed).toContain("Catalog");
		expect(delta.removed).toContain("Ordering");
	});
});
