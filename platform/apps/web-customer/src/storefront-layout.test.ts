import { describe, expect, it } from "vitest";
import { tenantVerticalTemplateKeys } from "@platform/types";

import {
	getStorefrontLayoutSchema,
	getStorefrontNavigationSchema,
	getVisibleRegions,
	isRegionVisible,
	storefrontRegions
} from "./storefront-layout";

// ── Region Schema Completeness ───────────────────────────────────────────────

describe("storefront layout regions", () => {
	it("defines all expected storefront regions", () => {
		expect(storefrontRegions).toEqual([
			"header",
			"hero",
			"sidebar",
			"main-content",
			"footer"
		]);
	});

	for (const templateKey of tenantVerticalTemplateKeys) {
		describe(`template: ${templateKey}`, () => {
			it("produces a layout schema covering every storefront region", () => {
				const schema = getStorefrontLayoutSchema(templateKey);
				expect(schema.templateKey).toBe(templateKey);
				expect(schema.regions).toHaveLength(storefrontRegions.length);

				for (const region of storefrontRegions) {
					const entry = schema.regions.find((r) => r.region === region);
					expect(entry).toBeDefined();
					expect(typeof entry!.visible).toBe("boolean");
				}
			});

			it("always shows header, main-content, and footer", () => {
				const schema = getStorefrontLayoutSchema(templateKey);
				expect(isRegionVisible(schema, "header")).toBe(true);
				expect(isRegionVisible(schema, "main-content")).toBe(true);
				expect(isRegionVisible(schema, "footer")).toBe(true);
			});

			it("produces a navigation schema with at least one item", () => {
				const nav = getStorefrontNavigationSchema(templateKey);
				expect(nav.templateKey).toBe(templateKey);
				expect(nav.items.length).toBeGreaterThan(0);

				for (const item of nav.items) {
					expect(item.key).toBeTruthy();
					expect(item.label).toBeTruthy();
					expect(item.path).toMatch(/^\//);
					expect(typeof item.order).toBe("number");
				}
			});

			it("has navigation items sorted by order", () => {
				const nav = getStorefrontNavigationSchema(templateKey);
				for (let i = 1; i < nav.items.length; i++) {
					expect(nav.items[i].order).toBeGreaterThanOrEqual(
						nav.items[i - 1].order
					);
				}
			});

			it("includes a home navigation item without a required module", () => {
				const nav = getStorefrontNavigationSchema(templateKey);
				const home = nav.items.find((item) => item.key === "home");
				expect(home).toBeDefined();
				expect(home!.path).toBe("/");
				expect(home!.requiredModule).toBeUndefined();
			});
		});
	}
});

// ── Region Helpers ───────────────────────────────────────────────────────────

describe("getVisibleRegions", () => {
	it("returns only visible regions", () => {
		const schema = getStorefrontLayoutSchema("restaurant-core");
		const visible = getVisibleRegions(schema);
		expect(visible).toContain("header");
		expect(visible).toContain("hero");
		expect(visible).toContain("main-content");
		expect(visible).toContain("footer");
		expect(visible).not.toContain("sidebar");
	});
});

describe("isRegionVisible", () => {
	it("returns true for visible regions", () => {
		const schema = getStorefrontLayoutSchema("hybrid-local-business");
		expect(isRegionVisible(schema, "sidebar")).toBe(true);
	});

	it("returns false for hidden regions", () => {
		const schema = getStorefrontLayoutSchema("restaurant-core");
		expect(isRegionVisible(schema, "sidebar")).toBe(false);
	});

	it("returns false for unrecognized region names", () => {
		const schema = getStorefrontLayoutSchema("restaurant-core");
		expect(isRegionVisible(schema, "unknown-region" as never)).toBe(false);
	});
});

// ── Template-Specific Layout ─────────────────────────────────────────────────

describe("template-specific layouts", () => {
	it("restaurant-core has no sidebar", () => {
		const schema = getStorefrontLayoutSchema("restaurant-core");
		expect(schema.sidebarPosition).toBe("none");
		expect(isRegionVisible(schema, "sidebar")).toBe(false);
		expect(schema.heroEnabled).toBe(true);
	});

	it("services-core has no sidebar", () => {
		const schema = getStorefrontLayoutSchema("services-core");
		expect(schema.sidebarPosition).toBe("none");
		expect(isRegionVisible(schema, "sidebar")).toBe(false);
		expect(schema.heroEnabled).toBe(true);
	});

	it("hybrid-local-business has a left sidebar", () => {
		const schema = getStorefrontLayoutSchema("hybrid-local-business");
		expect(schema.sidebarPosition).toBe("left");
		expect(isRegionVisible(schema, "sidebar")).toBe(true);
		expect(schema.heroEnabled).toBe(true);
	});
});

// ── Template-Specific Navigation ─────────────────────────────────────────────

describe("template-specific navigation", () => {
	it("restaurant-core includes menu and order but not book", () => {
		const nav = getStorefrontNavigationSchema("restaurant-core");
		expect(nav.items.find((i) => i.key === "menu")).toBeDefined();
		expect(nav.items.find((i) => i.key === "order")).toBeDefined();
		expect(nav.items.find((i) => i.key === "book")).toBeUndefined();
	});

	it("services-core includes services and book but not order", () => {
		const nav = getStorefrontNavigationSchema("services-core");
		expect(nav.items.find((i) => i.key === "services")).toBeDefined();
		expect(nav.items.find((i) => i.key === "book")).toBeDefined();
		expect(nav.items.find((i) => i.key === "order")).toBeUndefined();
	});

	it("hybrid-local-business includes all navigation types", () => {
		const nav = getStorefrontNavigationSchema("hybrid-local-business");
		expect(nav.items.find((i) => i.key === "menu")).toBeDefined();
		expect(nav.items.find((i) => i.key === "services")).toBeDefined();
		expect(nav.items.find((i) => i.key === "order")).toBeDefined();
		expect(nav.items.find((i) => i.key === "book")).toBeDefined();
	});

	it("module-dependent items declare their requiredModule", () => {
		for (const templateKey of tenantVerticalTemplateKeys) {
			const nav = getStorefrontNavigationSchema(templateKey);
			for (const item of nav.items) {
				if (item.key !== "home") {
					expect(item.requiredModule).toBeTruthy();
				}
			}
		}
	});
});
