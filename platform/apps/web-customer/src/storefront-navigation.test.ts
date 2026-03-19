import { describe, expect, it } from "vitest";

import type { TenantModuleKey } from "@platform/types";

import { getStorefrontNavigationSchema } from "./storefront-layout";
import { buildStorefrontRoutes } from "./storefront-routes";
import {
	applyModuleGuards,
	filterNavigationByModules,
	filterStorefrontRouteRecords,
	filterStorefrontRoutes
} from "./storefront-navigation";
import type { TenantFrontendContext } from "./tenant-bootstrap";

// ── Test Helpers ─────────────────────────────────────────────────────────────

function createTestContext(
	enabledModules: readonly TenantModuleKey[]
): TenantFrontendContext {
	return {
		tenantId: "test-tenant-id",
		displayName: "Test Tenant",
		slug: "test-tenant",
		status: "active",
		previewSubdomain: "test-tenant",
		templateKey: "restaurant-core",
		enabledModules
	};
}

// ── Navigation Filtering ─────────────────────────────────────────────────────

describe("filterNavigationByModules", () => {
	const restaurantNav = getStorefrontNavigationSchema("restaurant-core");

	it("shows all items when all modules enabled", () => {
		const context = createTestContext(["catalog", "ordering", "content", "operations"]);
		const filtered = filterNavigationByModules(restaurantNav.items, context);
		expect(filtered).toHaveLength(restaurantNav.items.length);
	});

	it("shows only home when no modules enabled", () => {
		const context = createTestContext([]);
		const filtered = filterNavigationByModules(restaurantNav.items, context);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].key).toBe("home");
	});

	it("shows catalog nav but not ordering when only catalog enabled", () => {
		const context = createTestContext(["catalog"]);
		const filtered = filterNavigationByModules(restaurantNav.items, context);

		const keys = filtered.map((i) => i.key);
		expect(keys).toContain("home");
		expect(keys).toContain("menu");
		expect(keys).not.toContain("order");
		expect(keys).not.toContain("about");
	});

	it("hides bookings nav for restaurant-core even if bookings enabled", () => {
		// restaurant-core has no "book" nav item at all
		const context = createTestContext(["catalog", "ordering", "bookings", "content"]);
		const filtered = filterNavigationByModules(restaurantNav.items, context);
		expect(filtered.find((i) => i.key === "book")).toBeUndefined();
	});

	it("hybrid template shows all nav types when all modules enabled", () => {
		const hybridNav = getStorefrontNavigationSchema("hybrid-local-business");
		const context: TenantFrontendContext = {
			...createTestContext(["catalog", "ordering", "bookings", "content", "operations"]),
			templateKey: "hybrid-local-business"
		};
		const filtered = filterNavigationByModules(hybridNav.items, context);
		expect(filtered).toHaveLength(hybridNav.items.length);
	});

	it("hybrid template hides booking when only ordering enabled", () => {
		const hybridNav = getStorefrontNavigationSchema("hybrid-local-business");
		const context: TenantFrontendContext = {
			...createTestContext(["catalog", "ordering"]),
			templateKey: "hybrid-local-business"
		};
		const filtered = filterNavigationByModules(hybridNav.items, context);
		const keys = filtered.map((i) => i.key);
		expect(keys).toContain("order");
		expect(keys).not.toContain("book");
		expect(keys).not.toContain("about");
	});

	it("services template shows book but not order", () => {
		const servicesNav = getStorefrontNavigationSchema("services-core");
		const context: TenantFrontendContext = {
			...createTestContext(["catalog", "bookings", "content", "operations"]),
			templateKey: "services-core"
		};
		const filtered = filterNavigationByModules(servicesNav.items, context);
		const keys = filtered.map((i) => i.key);
		expect(keys).toContain("book");
		expect(keys).not.toContain("order");
	});
});

// ── Route Guard Application ──────────────────────────────────────────────────

describe("applyModuleGuards", () => {
	it("adds beforeEnter guard to routes with requiredModule meta", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const routes = entries.map((e) => e.route);
		const context = createTestContext(["catalog", "ordering", "content"]);
		const guarded = applyModuleGuards(routes, context);

		for (const route of guarded) {
			const meta = route.meta as { requiredModule?: string } | undefined;
			if (meta?.requiredModule) {
				expect(route.beforeEnter).toBeDefined();
			}
		}
	});

	it("does not add guards to routes without requiredModule", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const routes = entries.map((e) => e.route);
		const context = createTestContext(["catalog"]);
		const guarded = applyModuleGuards(routes, context);

		const homeRoute = guarded.find((r) => r.path === "/");
		expect(homeRoute!.beforeEnter).toBeUndefined();
	});

	it("guard allows navigation when module is enabled", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const routes = entries.map((e) => e.route);
		const context = createTestContext(["catalog", "ordering", "content"]);
		const guarded = applyModuleGuards(routes, context);

		const menuRoute = guarded.find((r) => r.path === "/menu");
		const guard = menuRoute!.beforeEnter as Function;
		expect(guard({}, {}, () => {})).toBe(true);
	});

	it("guard redirects when module is disabled", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const routes = entries.map((e) => e.route);
		const context = createTestContext([]); // no modules
		const guarded = applyModuleGuards(routes, context);

		const menuRoute = guarded.find((r) => r.path === "/menu");
		const guard = menuRoute!.beforeEnter as Function;
		expect(guard({}, {}, () => {})).toBe("/");
	});

	it("guard uses custom redirect path", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const routes = entries.map((e) => e.route);
		const context = createTestContext([]);
		const guarded = applyModuleGuards(routes, context, "/not-available");

		const menuRoute = guarded.find((r) => r.path === "/menu");
		const guard = menuRoute!.beforeEnter as Function;
		expect(guard({}, {}, () => {})).toBe("/not-available");
	});
});

// ── Filtered Route Builder ───────────────────────────────────────────────────

describe("filterStorefrontRoutes", () => {
	it("includes all routes when all modules enabled", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const context = createTestContext(["catalog", "ordering", "content", "operations"]);
		const filtered = filterStorefrontRoutes(entries, context);
		expect(filtered).toHaveLength(entries.length);
	});

	it("excludes routes for disabled modules", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const context = createTestContext(["catalog"]); // no ordering, no content
		const filtered = filterStorefrontRoutes(entries, context);
		const paths = filtered.map((e) => e.route.path);
		expect(paths).toContain("/");
		expect(paths).toContain("/menu");
		expect(paths).not.toContain("/order");
		expect(paths).not.toContain("/about");
	});

	it("always includes home and catch-all", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const context = createTestContext([]); // no modules at all
		const filtered = filterStorefrontRoutes(entries, context);
		const paths = filtered.map((e) => e.route.path);
		expect(paths).toContain("/");
		expect(paths).toContain("/:pathMatch(.*)*");
	});

	it("applies guards to retained module-gated routes", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const context = createTestContext(["catalog", "ordering", "content"]);
		const filtered = filterStorefrontRoutes(entries, context);
		const menuEntry = filtered.find((e) => e.route.path === "/menu");
		expect(menuEntry!.route.beforeEnter).toBeDefined();
	});

	it("hybrid template with partial modules filters correctly", () => {
		const entries = buildStorefrontRoutes("hybrid-local-business");
		const context: TenantFrontendContext = {
			...createTestContext(["catalog", "ordering"]),
			templateKey: "hybrid-local-business"
		};
		const filtered = filterStorefrontRoutes(entries, context);
		const paths = filtered.map((e) => e.route.path);
		expect(paths).toContain("/menu");
		expect(paths).toContain("/services"); // catalog-dependent
		expect(paths).toContain("/order");
		expect(paths).not.toContain("/book"); // bookings not enabled
		expect(paths).not.toContain("/about"); // content not enabled
	});
});

describe("filterStorefrontRouteRecords", () => {
	it("returns plain RouteRecordRaw array", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const context = createTestContext(["catalog", "ordering", "content"]);
		const records = filterStorefrontRouteRecords(entries, context);
		expect(Array.isArray(records)).toBe(true);
		for (const record of records) {
			expect(record.path).toBeDefined();
			expect(record.component).toBeDefined();
		}
	});
});
