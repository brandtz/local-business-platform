// E7-S6-T3: Operating-mode-aware navigation and route gating for the admin portal.
// Extends module-based navigation filtering with operating-mode semantics so that
// admin users see only the sections relevant to their tenant's operating mode.

import type { TenantOperatingMode, TransactionFlow, TenantModuleKey } from "@platform/types";

import {
	resolveOperatingMode,
	isTransactionFlowAllowed,
	getBlockedFlows,
	getOperatingModeRules
} from "@platform/types";

import type { ModuleNavigationContext } from "./module-navigation";
import { evaluateModuleRouteGuard, filterNavigationForContext } from "./module-navigation";
import type { AdminRouteEntry } from "./admin-route-map";

// ── Operating Mode Resolution ────────────────────────────────────────────────

/**
 * Resolves the operating mode from the admin navigation context's enabled modules.
 */
export function resolveAdminOperatingMode(
	context: ModuleNavigationContext
): TenantOperatingMode {
	return resolveOperatingMode(context.enabledModules);
}

// ── Mode-Aware Navigation Filtering ──────────────────────────────────────────

/**
 * Returns admin navigation entries filtered by both module enablement and
 * operating mode. This is a higher-level wrapper over filterNavigationForContext
 * that ensures mode-consistency.
 */
export function filterNavigationForOperatingMode(
	context: ModuleNavigationContext
): readonly AdminRouteEntry[] {
	// Module-based filtering already handles the correct behavior since
	// operating mode is derived from modules. This wrapper provides explicit
	// operating-mode semantics for callers.
	return filterNavigationForContext(context);
}

// ── Flow Availability ────────────────────────────────────────────────────────

/**
 * Checks if a transaction flow is available for the admin context's tenant.
 */
export function isAdminFlowAvailable(
	context: ModuleNavigationContext,
	flow: TransactionFlow
): boolean {
	const mode = resolveOperatingMode(context.enabledModules);
	return isTransactionFlowAllowed(mode, flow);
}

/**
 * Returns the blocked flows for the admin context's tenant.
 */
export function getAdminBlockedFlows(
	context: ModuleNavigationContext
): readonly TransactionFlow[] {
	const mode = resolveOperatingMode(context.enabledModules);
	return getBlockedFlows(mode);
}

// ── Route Guard with Mode Context ────────────────────────────────────────────

export type AdminOperatingModeRouteGuardResult =
	| { allowed: true; mode: TenantOperatingMode }
	| { allowed: false; mode: TenantOperatingMode; reason: "module-disabled" | "role-denied" };

/**
 * Evaluates route access including operating mode context.
 * Returns the resolved mode alongside the access decision.
 */
export function evaluateAdminOperatingModeRouteGuard(
	path: string,
	context: ModuleNavigationContext
): AdminOperatingModeRouteGuardResult {
	const mode = resolveOperatingMode(context.enabledModules);
	const result = evaluateModuleRouteGuard(path, context);

	if (!result.allowed) {
		return { allowed: false, mode, reason: result.reason };
	}

	return { allowed: true, mode };
}

// ── Shared vs Mode-Specific Sections ─────────────────────────────────────────

/** Admin sections that are always available regardless of operating mode. */
export const sharedAdminSections = [
	"dashboard",
	"catalog",
	"content",
	"operations",
	"users",
	"settings",
	"audit"
] as const;

/** Admin sections specific to ordering mode. */
export const orderingAdminSections = ["ordering"] as const;

/** Admin sections specific to booking mode. */
export const bookingAdminSections = ["bookings"] as const;

/**
 * Returns the list of admin section IDs that are mode-specific (not shared)
 * and currently available for the given context.
 */
export function getModeSpecificSections(
	context: ModuleNavigationContext
): readonly string[] {
	const mode = resolveOperatingMode(context.enabledModules);
	const sections: string[] = [];

	if (mode === "ordering" || mode === "hybrid") {
		sections.push(...orderingAdminSections);
	}
	if (mode === "booking" || mode === "hybrid") {
		sections.push(...bookingAdminSections);
	}

	return sections;
}

/**
 * Returns the operating mode description for admin display.
 */
export function getAdminOperatingModeDescription(
	context: ModuleNavigationContext
): string {
	const mode = resolveOperatingMode(context.enabledModules);
	return getOperatingModeRules(mode).description;
}
