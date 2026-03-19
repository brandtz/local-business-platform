// E4-S3-T2: Route-aware region composition for the customer storefront.
// Maps each storefront route to the correct layout region configuration
// based on the tenant's template. Provides placeholder page components for
// catalog, services, and content surfaces.
// Security: region composition is driven by the resolved tenant's template.

import { defineComponent, h, type Component } from "vue";
import type { RouteRecordRaw } from "vue-router";

import type { TenantVerticalTemplateKey } from "@platform/types";

import {
	getStorefrontLayoutSchema,
	getStorefrontNavigationSchema,
	getVisibleRegions,
	type StorefrontLayoutSchema,
	type StorefrontNavigationItem,
	type StorefrontRegion
} from "./storefront-layout";

// ── Route Region Config ──────────────────────────────────────────────────────

export type RouteRegionConfig = {
	readonly routePath: string;
	readonly activeRegions: readonly StorefrontRegion[];
	readonly heroVisible: boolean;
};

// ── Route → Region Mapping ───────────────────────────────────────────────────

/**
 * Resolves the region config for a route path based on the layout schema.
 * - Home (/) gets all visible regions including hero
 * - Order/book pages suppress the sidebar (full-width flow)
 * - All other pages get visible regions minus hero
 */
export function resolveRouteRegionConfig(
	path: string,
	layout: StorefrontLayoutSchema
): RouteRegionConfig {
	const visible = getVisibleRegions(layout);
	const withoutHero = visible.filter((r) => r !== "hero");

	if (path === "/") {
		return {
			routePath: path,
			activeRegions: visible,
			heroVisible: layout.heroEnabled
		};
	}

	// Checkout-flow routes suppress the sidebar for full-width
	if (path === "/order" || path === "/book") {
		return {
			routePath: path,
			activeRegions: withoutHero.filter((r) => r !== "sidebar"),
			heroVisible: false
		};
	}

	return {
		routePath: path,
		activeRegions: withoutHero,
		heroVisible: false
	};
}

// ── Default Region Config ────────────────────────────────────────────────────

const fallbackRegionConfig: RouteRegionConfig = {
	routePath: "*",
	activeRegions: ["header", "main-content", "footer"],
	heroVisible: false
};

export function getRouteRegionConfig(
	path: string,
	templateKey: TenantVerticalTemplateKey
): RouteRegionConfig {
	const layout = getStorefrontLayoutSchema(templateKey);
	return resolveRouteRegionConfig(path, layout);
}

export function getFallbackRegionConfig(): RouteRegionConfig {
	return fallbackRegionConfig;
}

// ── Placeholder Page Components ──────────────────────────────────────────────
// Thin placeholder components for each storefront surface. Replaced with real
// implementations in E6.

function createPlaceholderPage(
	pageName: string,
	description: string,
	regionConfig: RouteRegionConfig
): Component {
	return defineComponent({
		name: `${pageName.replace(/\s+/g, "")}Page`,
		setup() {
			return () =>
				h("section", { "data-page": pageName.toLowerCase().replace(/\s+/g, "-") }, [
					h("h2", pageName),
					h("p", description),
					h("p", { class: "region-info" }, `Active regions: ${regionConfig.activeRegions.join(", ")}`)
				]);
		}
	});
}

// ── Storefront Route Builder ─────────────────────────────────────────────────

export type StorefrontRouteEntry = {
	readonly route: RouteRecordRaw;
	readonly regionConfig: RouteRegionConfig;
	readonly navItem: StorefrontNavigationItem | null;
};

/**
 * Builds the full storefront route table from the template's navigation schema
 * and layout schema. Each route carries its region config as route meta.
 *
 * Module-aware filtering is NOT applied here (that's E4-S3-T3).
 */
export function buildStorefrontRoutes(
	templateKey: TenantVerticalTemplateKey
): readonly StorefrontRouteEntry[] {
	const layout = getStorefrontLayoutSchema(templateKey);
	const nav = getStorefrontNavigationSchema(templateKey);

	const entries: StorefrontRouteEntry[] = [];

	for (const navItem of nav.items) {
		const regionConfig = resolveRouteRegionConfig(navItem.path, layout);

		const route: RouteRecordRaw = {
			path: navItem.path,
			component: createPlaceholderPage(
				navItem.label,
				`${navItem.label} surface for ${templateKey}`,
				regionConfig
			),
			meta: {
				regionConfig,
				requiredModule: navItem.requiredModule
			}
		};

		entries.push({ route, regionConfig, navItem });
	}

	// Add a catch-all 404 route
	const notFoundRegion = resolveRouteRegionConfig("/*", layout);
	entries.push({
		route: {
			path: "/:pathMatch(.*)*",
			component: createPlaceholderPage(
				"Not Found",
				"The page you are looking for does not exist.",
				notFoundRegion
			),
			meta: {
				regionConfig: fallbackRegionConfig
			}
		},
		regionConfig: fallbackRegionConfig,
		navItem: null
	});

	return entries;
}

/**
 * Extracts just the RouteRecordRaw array from built storefront routes.
 * Convenience for passing to vue-router.
 */
export function buildStorefrontRouteRecords(
	templateKey: TenantVerticalTemplateKey
): RouteRecordRaw[] {
	return buildStorefrontRoutes(templateKey).map((entry) => entry.route);
}
