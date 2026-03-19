// E5-S1-T3: Module-aware navigation filtering — hides admin sections for disabled modules
// and blocks direct navigation to disabled module routes.

import type { TenantActorRole, TenantModuleKey } from "@platform/types";

import type { AdminRouteEntry } from "./admin-route-map";
import {
	adminRouteMap,
	getVisibleNavigationEntries,
	isRoleAllowedForRoute,
	isRouteAccessibleForModules
} from "./admin-route-map";

// ── Module Navigation Context ────────────────────────────────────────────────

export type ModuleNavigationContext = {
	enabledModules: readonly TenantModuleKey[];
	role: TenantActorRole;
};

// ── Navigation Filtering ─────────────────────────────────────────────────────

/**
 * Returns the sidebar-level navigation entries visible to the given context.
 */
export function filterNavigationForContext(
	context: ModuleNavigationContext
): readonly AdminRouteEntry[] {
	return getVisibleNavigationEntries(context.role, context.enabledModules);
}

// ── Route Guard ──────────────────────────────────────────────────────────────

export type ModuleRouteGuardResult =
	| { allowed: true }
	| { allowed: false; reason: "module-disabled" | "role-denied" };

/**
 * Evaluates whether a specific route path is accessible given the current context.
 */
export function evaluateModuleRouteGuard(
	path: string,
	context: ModuleNavigationContext
): ModuleRouteGuardResult {
	const entry = adminRouteMap.find((e) => e.path === path);

	if (!entry) {
		// Unknown routes are allowed through (handled by router 404)
		return { allowed: true };
	}

	if (!isRoleAllowedForRoute(entry, context.role)) {
		return { allowed: false, reason: "role-denied" };
	}

	if (!isRouteAccessibleForModules(entry, context.enabledModules)) {
		return { allowed: false, reason: "module-disabled" };
	}

	return { allowed: true };
}

// ── Module Enablement Change Detection ───────────────────────────────────────

/**
 * Computes which navigation sections were added or removed when module enablement changes.
 * Returns section labels added and removed for UI transition handling.
 */
export function computeNavigationDelta(
	previousModules: readonly TenantModuleKey[],
	currentModules: readonly TenantModuleKey[],
	role: TenantActorRole
): { added: string[]; removed: string[] } {
	const previousEntries = getVisibleNavigationEntries(role, previousModules);
	const currentEntries = getVisibleNavigationEntries(role, currentModules);

	const previousPaths = new Set(previousEntries.map((e) => e.path));
	const currentPaths = new Set(currentEntries.map((e) => e.path));

	const added = currentEntries
		.filter((e) => !previousPaths.has(e.path))
		.map((e) => e.label);

	const removed = previousEntries
		.filter((e) => !currentPaths.has(e.path))
		.map((e) => e.label);

	return { added, removed };
}
