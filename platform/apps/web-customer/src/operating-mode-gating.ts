// E7-S6-T3: Operating-mode-aware route and navigation gating for the customer storefront.
// Resolves the tenant's operating mode from enabled modules and provides helpers
// to filter navigation items, guard routes, and check transaction flow availability
// based on the operating mode (ordering-only, booking-only, or hybrid).

import type { TenantOperatingMode, TransactionFlow } from "@platform/types";

import {
	resolveOperatingMode,
	isTransactionFlowAllowed,
	getBlockedFlows,
	getOperatingModeRules
} from "@platform/types";

import type { TenantFrontendContext } from "./tenant-bootstrap";

// ── Mode Resolution ──────────────────────────────────────────────────────────

/**
 * Resolves the operating mode from the tenant frontend context.
 */
export function resolveTenantOperatingMode(
	context: TenantFrontendContext
): TenantOperatingMode {
	return resolveOperatingMode(context.enabledModules);
}

// ── Flow Checks ──────────────────────────────────────────────────────────────

/**
 * Checks if a transaction flow is available for the given tenant context.
 */
export function isTenantFlowAvailable(
	context: TenantFrontendContext,
	flow: TransactionFlow
): boolean {
	const mode = resolveOperatingMode(context.enabledModules);
	return isTransactionFlowAllowed(mode, flow);
}

/**
 * Returns the list of blocked transaction flows for the tenant.
 */
export function getTenantBlockedFlows(
	context: TenantFrontendContext
): readonly TransactionFlow[] {
	const mode = resolveOperatingMode(context.enabledModules);
	return getBlockedFlows(mode);
}

// ── Navigation Helpers ───────────────────────────────────────────────────────

/**
 * Flow-to-route mapping for storefront navigation gating.
 * Routes that correspond to specific transaction flows.
 */
const flowRoutePatterns: Record<TransactionFlow, readonly string[]> = {
	cart: ["/cart", "/checkout"],
	order: ["/order", "/account/orders"],
	booking: ["/book", "/account/bookings"]
};

/**
 * Returns true if a route path is associated with a blocked transaction flow.
 * Used to determine if a route should be hidden or blocked in the current operating mode.
 */
export function isRouteBlockedByOperatingMode(
	context: TenantFrontendContext,
	routePath: string
): boolean {
	const mode = resolveOperatingMode(context.enabledModules);
	const blocked = getBlockedFlows(mode);

	for (const flow of blocked) {
		const patterns = flowRoutePatterns[flow];
		for (const pattern of patterns) {
			if (routePath === pattern || routePath.startsWith(pattern + "/")) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Returns the operating mode description for display purposes.
 */
export function getOperatingModeDescription(
	context: TenantFrontendContext
): string {
	const mode = resolveOperatingMode(context.enabledModules);
	return getOperatingModeRules(mode).description;
}
