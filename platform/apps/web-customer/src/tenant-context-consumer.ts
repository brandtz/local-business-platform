// E4-S2-T4: Standardized tenant context access for downstream consumers.
// Provides composables, route guards, and module-gating helpers so that all
// routes, components, and stores can reliably access resolved tenant identity,
// configuration, and module enablement.
// Security: tenant context is immutable after bootstrap — components must not
// mutate tenant identity or configuration at runtime.

import { inject } from "vue";
import type { NavigationGuard } from "vue-router";
import type { TenantModuleKey } from "@platform/types";
import type {
	FrontendEntitlementState,
	NavigationGatingResult,
	UpgradePromptPayload,
} from "@platform/types";
import { evaluateNavigationGating } from "@platform/types";

import type { BootstrapResult, TenantFrontendContext } from "./tenant-bootstrap";
import {
	TENANT_BOOTSTRAP_RESULT_KEY,
	TENANT_CONTEXT_KEY
} from "./tenant-context";

// ── Composables ──────────────────────────────────────────────────────────────

/**
 * Injects the resolved tenant context. Must only be called inside a component
 * that renders after successful bootstrap (i.e., when TENANT_CONTEXT_KEY has
 * been provided).
 *
 * @throws Error if called outside a bootstrapped component tree.
 */
export function useTenantContext(): TenantFrontendContext {
	const context = inject(TENANT_CONTEXT_KEY);

	if (!context) {
		throw new Error(
			"useTenantContext() was called outside a bootstrapped component tree. " +
				"Tenant context is only available after successful tenant bootstrap. " +
				"Ensure this composable is used in components rendered by the resolved app shell."
		);
	}

	return context;
}

/**
 * Injects the full bootstrap result (resolved, failed, or initializing).
 * Always available in both the resolved app and the shell state mount.
 *
 * @throws Error if called outside the app component tree.
 */
export function useTenantBootstrapResult(): BootstrapResult {
	const result = inject(TENANT_BOOTSTRAP_RESULT_KEY);

	if (!result) {
		throw new Error(
			"useTenantBootstrapResult() was called outside the app component tree. " +
				"The bootstrap result is always provided after bootstrap completes. " +
				"Ensure this composable is used inside a mounted Vue application."
		);
	}

	return result;
}

// ── Module Gating ────────────────────────────────────────────────────────────

/**
 * Returns true if the given module is enabled in the resolved tenant context.
 * Accepts the context explicitly so it can be used both inside and outside
 * Vue's injection system (e.g., in route meta evaluation or setup scripts).
 */
export function isTenantModuleEnabled(
	context: TenantFrontendContext,
	key: TenantModuleKey
): boolean {
	return context.enabledModules.includes(key);
}

/**
 * Returns true if all specified modules are enabled in the resolved tenant context.
 */
export function areAllTenantModulesEnabled(
	context: TenantFrontendContext,
	keys: readonly TenantModuleKey[]
): boolean {
	return keys.every((key) => context.enabledModules.includes(key));
}

/**
 * Returns true if at least one of the specified modules is enabled.
 */
export function isAnyTenantModuleEnabled(
	context: TenantFrontendContext,
	keys: readonly TenantModuleKey[]
): boolean {
	return keys.some((key) => context.enabledModules.includes(key));
}

// ── Route Guard ──────────────────────────────────────────────────────────────

/** Options for the tenant context route guard. */
export type RequireTenantContextOptions = {
	/**
	 * Path to redirect to when tenant context is missing.
	 * Defaults to "/" (root).
	 */
	redirectTo?: string;
};

/**
 * Creates a Vue Router navigation guard that blocks navigation when tenant
 * context is missing. Use this on routes that require resolved tenant identity.
 *
 * When context is missing the guard redirects to the configured path (default: "/").
 *
 * Usage:
 * ```ts
 * {
 *   path: "/catalog",
 *   component: CatalogPage,
 *   beforeEnter: requireTenantContext(tenantContext)
 * }
 * ```
 */
export function requireTenantContext(
	context: TenantFrontendContext | undefined,
	options: RequireTenantContextOptions = {}
): NavigationGuard {
	const redirectTo = options.redirectTo ?? "/";

	return () => {
		if (!context) {
			return redirectTo;
		}

		return true;
	};
}

/** Options for the module-gated route guard. */
export type RequireTenantModuleOptions = {
	/**
	 * Path to redirect to when the required module is not enabled.
	 * Defaults to "/" (root).
	 */
	redirectTo?: string;
};

/**
 * Creates a Vue Router navigation guard that blocks navigation when a specific
 * tenant module is not enabled. Use this to gate routes behind module enablement.
 *
 * Usage:
 * ```ts
 * {
 *   path: "/bookings",
 *   component: BookingsPage,
 *   beforeEnter: requireTenantModule(tenantContext, "bookings")
 * }
 * ```
 */
export function requireTenantModule(
	context: TenantFrontendContext | undefined,
	key: TenantModuleKey,
	options: RequireTenantModuleOptions = {}
): NavigationGuard {
	const redirectTo = options.redirectTo ?? "/";

	return () => {
		if (!context || !isTenantModuleEnabled(context, key)) {
			return redirectTo;
		}

		return true;
	};
}

// ── Immutability Helper ──────────────────────────────────────────────────────

/**
 * Deep-freezes a TenantFrontendContext so that downstream consumers cannot
 * mutate tenant identity or configuration at runtime.
 * Returns the same reference after freezing.
 */
export function freezeTenantContext(
	context: TenantFrontendContext
): Readonly<TenantFrontendContext> {
	// enabledModules is a readonly array, but Object.freeze ensures runtime immutability
	Object.freeze(context.enabledModules);

	return Object.freeze(context);
}

// ── E12-S2-T3: Subscription-Aware Feature Gating ────────────────────────────

/**
 * Options for the subscription-aware route guard.
 */
export type RequireEntitlementOptions = {
	/** Module key required for the route. */
	requiredModule?: string;
	/** Premium feature flag required for the route. */
	requiredPremiumFeature?: string;
	/** Path to redirect to when entitlement is denied. */
	redirectTo?: string;
	/** Path to redirect to for upgrade prompt. */
	upgradePath?: string;
};

/**
 * Creates a Vue Router navigation guard that checks subscription entitlements.
 * Blocks navigation to routes requiring modules or premium features that are
 * not included in the tenant's active subscription.
 *
 * When entitlement is denied, redirects to the upgrade path to show
 * an upgrade prompt instead of silently blocking.
 */
export function requireEntitlement(
	entitlementState: FrontendEntitlementState | undefined,
	options: RequireEntitlementOptions = {},
): NavigationGuard {
	const redirectTo = options.redirectTo ?? "/";
	const upgradePath = options.upgradePath ?? "/settings/billing/upgrade";

	return () => {
		if (!entitlementState) {
			return redirectTo;
		}

		const result = evaluateNavigationGating(
			entitlementState,
			options.requiredModule ?? null,
			options.requiredPremiumFeature ?? null,
		);

		if (!result.visible) {
			return redirectTo;
		}

		if (result.visible && !result.enabled) {
			return upgradePath;
		}

		return true;
	};
}

/**
 * Evaluates whether a navigation item should be shown, disabled, or hidden
 * based on the tenant's subscription entitlements.
 */
export function getNavigationGating(
	entitlementState: FrontendEntitlementState | undefined,
	requiredModule: string | null,
	requiredPremiumFeature: string | null,
): NavigationGatingResult {
	if (!entitlementState) {
		return { visible: false };
	}

	return evaluateNavigationGating(
		entitlementState,
		requiredModule,
		requiredPremiumFeature,
	);
}

/**
 * Returns true if the subscription is in grace period, meaning
 * the tenant has read-only access to previously entitled features.
 */
export function isInGracePeriod(
	entitlementState: FrontendEntitlementState | undefined,
): boolean {
	return entitlementState?.isInGracePeriod ?? false;
}

/**
 * Returns the upgrade prompt payload for a denied feature, or null
 * if the feature is entitled.
 */
export function getUpgradePromptForFeature(
	entitlementState: FrontendEntitlementState | undefined,
	requiredModule: string | null,
	requiredPremiumFeature: string | null,
): UpgradePromptPayload | null {
	if (!entitlementState) return null;

	const result = evaluateNavigationGating(
		entitlementState,
		requiredModule,
		requiredPremiumFeature,
	);

	if (result.visible && !result.enabled) {
		return result.upgradePrompt;
	}

	return null;
}
