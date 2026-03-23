// E5-S1-T3: Module-aware navigation filtering — hides admin sections for disabled modules
// and blocks direct navigation to disabled module routes.
// E12-S2-T3: Extended with subscription-aware feature gating — shows upgrade prompts
// for unentitled features instead of hiding them.

import type { TenantActorRole, TenantModuleKey } from "@platform/types";
import type {
	FrontendEntitlementState,
	NavigationGatingResult,
	UpgradePromptPayload,
} from "@platform/types";
import { evaluateNavigationGating } from "@platform/types";

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

// ── E12-S2-T3: Subscription-Aware Navigation ────────────────────────────────

/**
 * Extended context that includes subscription entitlement state
 * for upgrade prompt display.
 */
export type SubscriptionAwareNavigationContext = ModuleNavigationContext & {
	entitlementState?: FrontendEntitlementState;
};

/**
 * Extended route guard result that includes an upgrade prompt when
 * the feature is not entitled by the subscription.
 */
export type SubscriptionAwareRouteGuardResult =
	| { allowed: true }
	| { allowed: false; reason: "module-disabled" | "role-denied" }
	| { allowed: false; reason: "not-entitled"; upgradePrompt: UpgradePromptPayload };

/**
 * Evaluates whether a specific route path is accessible given the current context,
 * including subscription entitlements. Returns an upgrade prompt when the module
 * is available via upgrade.
 */
export function evaluateSubscriptionAwareRouteGuard(
	path: string,
	context: SubscriptionAwareNavigationContext,
): SubscriptionAwareRouteGuardResult {
	const entry = adminRouteMap.find((e) => e.path === path);

	if (!entry) {
		return { allowed: true };
	}

	if (!isRoleAllowedForRoute(entry, context.role)) {
		return { allowed: false, reason: "role-denied" };
	}

	// Check subscription entitlements if available
	if (context.entitlementState && entry.requiredModules.length > 0) {
		const gating = evaluateNavigationGating(
			context.entitlementState,
			entry.requiredModules[0] ?? null,
			null,
		);

		if (gating.visible && !gating.enabled) {
			return {
				allowed: false,
				reason: "not-entitled",
				upgradePrompt: gating.upgradePrompt,
			};
		}
	}

	if (!isRouteAccessibleForModules(entry, context.enabledModules)) {
		return { allowed: false, reason: "module-disabled" };
	}

	return { allowed: true };
}

/**
 * Returns navigation entries annotated with subscription gating results.
 * Items not entitled by subscription are included but marked with upgrade prompts.
 */
export function filterNavigationWithEntitlements(
	context: SubscriptionAwareNavigationContext,
): readonly (AdminRouteEntry & { gating: NavigationGatingResult })[] {
	const baseEntries = getVisibleNavigationEntries(context.role, context.enabledModules);

	if (!context.entitlementState) {
		return baseEntries.map((entry) => ({
			...entry,
			gating: { visible: true, enabled: true } as NavigationGatingResult,
		}));
	}

	return baseEntries.map((entry) => {
		const gating = evaluateNavigationGating(
			context.entitlementState!,
			entry.requiredModules[0] ?? null,
			null,
		);
		return { ...entry, gating };
	});
}
