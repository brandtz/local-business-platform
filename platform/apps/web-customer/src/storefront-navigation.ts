// E4-S3-T3: Module-aware navigation filtering.
// Filters storefront navigation items and guards routes based on the
// tenant's enabled module set. Disabled module routes are hidden from
// navigation and blocked by route guards.
// Security: do not expose disabled module routes or navigation items.

import type { RouteRecordRaw } from "vue-router";
import type { TenantModuleKey } from "@platform/types";

import type { StorefrontNavigationItem } from "./storefront-layout";
import type { StorefrontRouteEntry } from "./storefront-routes";
import { isTenantModuleEnabled, requireTenantModule } from "./tenant-context-consumer";
import type { TenantFrontendContext } from "./tenant-bootstrap";

// ── Navigation Filtering ─────────────────────────────────────────────────────

/**
 * Filters navigation items to only those whose required module is enabled
 * on the tenant (or items with no module requirement).
 */
export function filterNavigationByModules(
	items: readonly StorefrontNavigationItem[],
	context: TenantFrontendContext
): readonly StorefrontNavigationItem[] {
	return items.filter((item) => {
		if (!item.requiredModule) return true;
		return isTenantModuleEnabled(context, item.requiredModule);
	});
}

// ── Route Guard Application ──────────────────────────────────────────────────

/**
 * Applies module-based beforeEnter guards to route records that declare
 * a requiredModule in their meta. Routes for disabled modules will redirect
 * to the specified path (default: "/").
 */
export function applyModuleGuards(
	routes: RouteRecordRaw[],
	context: TenantFrontendContext,
	redirectTo = "/"
): RouteRecordRaw[] {
	return routes.map((route) => {
		const requiredModule = (route.meta as { requiredModule?: TenantModuleKey } | undefined)?.requiredModule;

		if (!requiredModule) return route;

		return {
			...route,
			beforeEnter: requireTenantModule(context, requiredModule, { redirectTo })
		};
	});
}

// ── Filtered Route Builder ───────────────────────────────────────────────────

/**
 * Filters storefront route entries to only those whose required module is
 * enabled, and applies route guards to the remaining module-gated routes.
 * Routes with no module requirement (home, catch-all) are always included.
 */
export function filterStorefrontRoutes(
	entries: readonly StorefrontRouteEntry[],
	context: TenantFrontendContext,
	redirectTo = "/"
): readonly StorefrontRouteEntry[] {
	return entries
		.filter((entry) => {
			if (!entry.navItem?.requiredModule) return true;
			return isTenantModuleEnabled(context, entry.navItem.requiredModule);
		})
		.map((entry) => {
			const requiredModule = entry.navItem?.requiredModule;
			if (!requiredModule) return entry;

			return {
				...entry,
				route: {
					...entry.route,
					beforeEnter: requireTenantModule(context, requiredModule, { redirectTo })
				}
			};
		});
}

/**
 * Extracts RouteRecordRaw array from filtered storefront route entries.
 */
export function filterStorefrontRouteRecords(
	entries: readonly StorefrontRouteEntry[],
	context: TenantFrontendContext,
	redirectTo = "/"
): RouteRecordRaw[] {
	return filterStorefrontRoutes(entries, context, redirectTo).map((e) => e.route);
}
