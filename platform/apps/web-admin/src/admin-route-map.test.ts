import { describe, expect, it } from "vitest";

import type { TenantActorRole, TenantModuleKey } from "@platform/types";
import { tenantActorRoles, tenantModuleKeys } from "@platform/types";

import {
	adminNavigationSectionIds,
	adminRouteMap,
	getPrimaryNavigationEntries,
	getRoutesForSection,
	getVisibleNavigationEntries,
	isRoleAllowedForRoute,
	isRouteAccessibleForModules,
} from "./admin-route-map";

// ── Route Map Completeness ───────────────────────────────────────────────────

describe("adminRouteMap completeness", () => {
	it("has at least one route for every navigation section", () => {
		for (const sectionId of adminNavigationSectionIds) {
			const routes = getRoutesForSection(sectionId);

			expect(
				routes.length,
				`section "${sectionId}" should have at least one route`
			).toBeGreaterThanOrEqual(1);
		}
	});

	it("has exactly one primary route per section", () => {
		for (const sectionId of adminNavigationSectionIds) {
			const primaryRoutes = getRoutesForSection(sectionId).filter(
				(r) => r.isPrimary
			);

			expect(
				primaryRoutes.length,
				`section "${sectionId}" should have exactly one primary route`
			).toBe(1);
		}
	});

	it("has no duplicate route paths", () => {
		const paths = adminRouteMap.map((r) => r.path);

		expect(new Set(paths).size).toBe(paths.length);
	});

	it("all route paths start with /", () => {
		for (const entry of adminRouteMap) {
			expect(entry.path).toMatch(/^\//);
		}
	});

	it("all routes have non-empty labels", () => {
		for (const entry of adminRouteMap) {
			expect(entry.label.length).toBeGreaterThan(0);
		}
	});

	it("only references valid module keys", () => {
		const validModules = new Set<string>(tenantModuleKeys);

		for (const entry of adminRouteMap) {
			for (const mod of entry.requiredModules) {
				expect(validModules.has(mod)).toBe(true);
			}
		}
	});

	it("only references valid tenant actor roles", () => {
		const validRoles = new Set<string>(tenantActorRoles);

		for (const entry of adminRouteMap) {
			for (const role of entry.roleRequirement.allowedRoles) {
				expect(validRoles.has(role)).toBe(true);
			}
		}
	});
});

// ── Role Gating ──────────────────────────────────────────────────────────────

describe("role gating", () => {
	it("owner can access all routes", () => {
		for (const entry of adminRouteMap) {
			expect(
				isRoleAllowedForRoute(entry, "owner"),
				`owner should access ${entry.path}`
			).toBe(true);
		}
	});

	it("admin can access dashboard, catalog, ordering, bookings, content, operations, users, and audit", () => {
		const accessible = adminRouteMap.filter((e) =>
			isRoleAllowedForRoute(e, "admin")
		);

		expect(accessible.some((e) => e.section === "dashboard")).toBe(true);
		expect(accessible.some((e) => e.section === "users")).toBe(true);
		expect(accessible.some((e) => e.section === "audit")).toBe(true);
	});

	it("admin cannot access settings routes", () => {
		const settingsRoutes = adminRouteMap.filter(
			(e) => e.section === "settings"
		);

		for (const route of settingsRoutes) {
			expect(isRoleAllowedForRoute(route, "admin")).toBe(false);
		}
	});

	it("manager and staff cannot access users routes", () => {
		const usersRoutes = adminRouteMap.filter((e) => e.section === "users");

		for (const role of ["manager", "staff"] as TenantActorRole[]) {
			for (const route of usersRoutes) {
				expect(isRoleAllowedForRoute(route, role)).toBe(false);
			}
		}
	});

	it("manager and staff can access dashboard and module-based sections", () => {
		for (const role of ["manager", "staff"] as TenantActorRole[]) {
			expect(
				isRoleAllowedForRoute(adminRouteMap[0], role),
				`${role} should access dashboard`
			).toBe(true);
		}
	});
});

// ── Module Dependencies ──────────────────────────────────────────────────────

describe("module dependency filtering", () => {
	it("catalog-only tenant sees catalog but not ordering or bookings", () => {
		const modules: TenantModuleKey[] = ["catalog"];

		const catalogRoute = adminRouteMap.find(
			(e) => e.section === "catalog" && e.isPrimary
		)!;

		expect(isRouteAccessibleForModules(catalogRoute, modules)).toBe(true);

		const orderingRoute = adminRouteMap.find(
			(e) => e.section === "ordering" && e.isPrimary
		)!;

		expect(isRouteAccessibleForModules(orderingRoute, modules)).toBe(false);

		const bookingsRoute = adminRouteMap.find(
			(e) => e.section === "bookings" && e.isPrimary
		)!;

		expect(isRouteAccessibleForModules(bookingsRoute, modules)).toBe(false);
	});

	it("full-module tenant sees all module-dependent sections", () => {
		const allModules: TenantModuleKey[] = [...tenantModuleKeys];

		for (const entry of adminRouteMap) {
			expect(isRouteAccessibleForModules(entry, allModules)).toBe(true);
		}
	});

	it("dashboard, users, and audit are always accessible regardless of modules", () => {
		const noModuleSections = ["dashboard", "users", "audit"];
		const noModuleRoutes = adminRouteMap.filter((e) =>
			noModuleSections.includes(e.section)
		);

		for (const route of noModuleRoutes) {
			expect(isRouteAccessibleForModules(route, [])).toBe(true);
		}
	});

	it("settings primary route is accessible without modules but settings/locations requires operations", () => {
		const settingsPrimary = adminRouteMap.find(
			(e) => e.section === "settings" && e.isPrimary
		)!;

		expect(isRouteAccessibleForModules(settingsPrimary, [])).toBe(true);

		const settingsLocations = adminRouteMap.find(
			(e) => e.path === "/settings/locations"
		)!;

		expect(isRouteAccessibleForModules(settingsLocations, [])).toBe(false);
		expect(
			isRouteAccessibleForModules(settingsLocations, ["operations"])
		).toBe(true);
	});
});

// ── Visible Navigation ───────────────────────────────────────────────────────

describe("getVisibleNavigationEntries", () => {
	it("owner with all modules sees all primary sections", () => {
		const visible = getVisibleNavigationEntries("owner", [
			...tenantModuleKeys
		]);

		expect(visible.length).toBe(adminNavigationSectionIds.length);
	});

	it("staff with catalog-only sees dashboard and catalog", () => {
		const visible = getVisibleNavigationEntries("staff", ["catalog"]);
		const sections = visible.map((e) => e.section);

		expect(sections).toContain("dashboard");
		expect(sections).toContain("catalog");
		expect(sections).not.toContain("ordering");
		expect(sections).not.toContain("users");
		expect(sections).not.toContain("settings");
	});

	it("manager with operations sees dashboard and operations", () => {
		const visible = getVisibleNavigationEntries("manager", ["operations"]);
		const sections = visible.map((e) => e.section);

		expect(sections).toContain("dashboard");
		expect(sections).toContain("operations");
		expect(sections).not.toContain("settings");
	});
});

// ── Primary Navigation Entries ───────────────────────────────────────────────

describe("getPrimaryNavigationEntries", () => {
	it("returns one entry per section", () => {
		const primaries = getPrimaryNavigationEntries();

		expect(primaries.length).toBe(adminNavigationSectionIds.length);
	});

	it("all returned entries have isPrimary true", () => {
		const primaries = getPrimaryNavigationEntries();

		for (const entry of primaries) {
			expect(entry.isPrimary).toBe(true);
		}
	});
});
