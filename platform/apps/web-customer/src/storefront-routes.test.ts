import { describe, expect, it } from "vitest";
import { tenantVerticalTemplateKeys } from "@platform/types";

import {
	buildStorefrontRouteRecords,
	buildStorefrontRoutes,
	getFallbackRegionConfig,
	getRouteRegionConfig,
	resolveRouteRegionConfig,
	type RouteRegionConfig
} from "./storefront-routes";
import { getStorefrontLayoutSchema, getStorefrontNavigationSchema } from "./storefront-layout";

// ── Route-Region Mapping ─────────────────────────────────────────────────────

describe("resolveRouteRegionConfig", () => {
	it("home route gets all visible regions including hero", () => {
		const layout = getStorefrontLayoutSchema("restaurant-core");
		const config = resolveRouteRegionConfig("/", layout);
		expect(config.routePath).toBe("/");
		expect(config.heroVisible).toBe(true);
		expect(config.activeRegions).toContain("header");
		expect(config.activeRegions).toContain("hero");
		expect(config.activeRegions).toContain("main-content");
		expect(config.activeRegions).toContain("footer");
	});

	it("catalog route gets visible regions minus hero", () => {
		const layout = getStorefrontLayoutSchema("restaurant-core");
		const config = resolveRouteRegionConfig("/menu", layout);
		expect(config.heroVisible).toBe(false);
		expect(config.activeRegions).not.toContain("hero");
		expect(config.activeRegions).toContain("header");
		expect(config.activeRegions).toContain("main-content");
	});

	it("order route suppresses sidebar for full-width flow", () => {
		const layout = getStorefrontLayoutSchema("hybrid-local-business");
		const config = resolveRouteRegionConfig("/order", layout);
		expect(config.activeRegions).not.toContain("sidebar");
		expect(config.activeRegions).not.toContain("hero");
		expect(config.activeRegions).toContain("header");
		expect(config.activeRegions).toContain("main-content");
	});

	it("book route suppresses sidebar for full-width flow", () => {
		const layout = getStorefrontLayoutSchema("hybrid-local-business");
		const config = resolveRouteRegionConfig("/book", layout);
		expect(config.activeRegions).not.toContain("sidebar");
		expect(config.activeRegions).not.toContain("hero");
	});

	it("content route keeps sidebar when template has one", () => {
		const layout = getStorefrontLayoutSchema("hybrid-local-business");
		const config = resolveRouteRegionConfig("/about", layout);
		expect(config.activeRegions).toContain("sidebar");
		expect(config.activeRegions).toContain("main-content");
	});

	it("content route has no sidebar when template hides it", () => {
		const layout = getStorefrontLayoutSchema("restaurant-core");
		const config = resolveRouteRegionConfig("/about", layout);
		expect(config.activeRegions).not.toContain("sidebar");
	});
});

describe("getRouteRegionConfig", () => {
	it("returns the correct config for a known route", () => {
		const config = getRouteRegionConfig("/", "restaurant-core");
		expect(config.heroVisible).toBe(true);
	});

	it("returns a valid config for an unknown route", () => {
		const config = getRouteRegionConfig("/nonexistent", "restaurant-core");
		expect(config.activeRegions).toContain("header");
		expect(config.activeRegions).toContain("main-content");
		expect(config.heroVisible).toBe(false);
	});
});

describe("getFallbackRegionConfig", () => {
	it("returns safe defaults", () => {
		const config = getFallbackRegionConfig();
		expect(config.activeRegions).toEqual(["header", "main-content", "footer"]);
		expect(config.heroVisible).toBe(false);
	});
});

// ── Storefront Route Builder ─────────────────────────────────────────────────

describe("buildStorefrontRoutes", () => {
	for (const templateKey of tenantVerticalTemplateKeys) {
		describe(`template: ${templateKey}`, () => {
			it("builds a route entry for every navigation item plus catch-all", () => {
				const nav = getStorefrontNavigationSchema(templateKey);
				const entries = buildStorefrontRoutes(templateKey);
				// Nav items + 1 catch-all
				expect(entries).toHaveLength(nav.items.length + 1);
			});

			it("every route has a region config in meta", () => {
				const entries = buildStorefrontRoutes(templateKey);
				for (const entry of entries) {
					expect(entry.route.meta).toBeDefined();
					const meta = entry.route.meta as { regionConfig: RouteRegionConfig };
					expect(meta.regionConfig).toBeDefined();
					expect(meta.regionConfig.activeRegions.length).toBeGreaterThan(0);
				}
			});

			it("every route has a component", () => {
				const entries = buildStorefrontRoutes(templateKey);
				for (const entry of entries) {
					expect(entry.route.component).toBeDefined();
				}
			});

			it("navigation-linked routes carry navItem reference", () => {
				const entries = buildStorefrontRoutes(templateKey);
				const navEntries = entries.filter((e) => e.navItem !== null);
				expect(navEntries.length).toBeGreaterThan(0);
				for (const entry of navEntries) {
					expect(entry.route.path).toBe(entry.navItem!.path);
				}
			});

			it("includes a catch-all route with null navItem", () => {
				const entries = buildStorefrontRoutes(templateKey);
				const catchAll = entries.find((e) => e.navItem === null);
				expect(catchAll).toBeDefined();
				expect(catchAll!.route.path).toBe("/:pathMatch(.*)*");
			});

			it("module-dependent routes carry requiredModule in meta", () => {
				const entries = buildStorefrontRoutes(templateKey);
				for (const entry of entries) {
					if (entry.navItem?.requiredModule) {
						const meta = entry.route.meta as { requiredModule?: string };
						expect(meta.requiredModule).toBe(entry.navItem.requiredModule);
					}
				}
			});
		});
	}
});

describe("buildStorefrontRouteRecords", () => {
	it("returns plain RouteRecordRaw array", () => {
		const records = buildStorefrontRouteRecords("restaurant-core");
		expect(Array.isArray(records)).toBe(true);
		expect(records.length).toBeGreaterThan(0);
		for (const record of records) {
			expect(record.path).toBeDefined();
			expect(record.component).toBeDefined();
		}
	});
});

// ── Composition: Region Changes per Route ────────────────────────────────────

describe("region composition varies by route", () => {
	it("home has more active regions than inner pages for hero-enabled templates", () => {
		const layout = getStorefrontLayoutSchema("restaurant-core");
		const home = resolveRouteRegionConfig("/", layout);
		const menu = resolveRouteRegionConfig("/menu", layout);
		expect(home.activeRegions.length).toBeGreaterThan(menu.activeRegions.length);
	});

	it("fallback route uses safe default regions", () => {
		const entries = buildStorefrontRoutes("restaurant-core");
		const catchAll = entries.find((e) => e.navItem === null)!;
		expect(catchAll.regionConfig.activeRegions).toEqual(["header", "main-content", "footer"]);
	});
});
