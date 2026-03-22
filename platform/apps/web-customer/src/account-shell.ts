// E4-S4-T2: Authenticated account shell with session-aware guards and empty states.
// Provides auth guards for account routes, session expiry detection, and empty
// state rendering for account sections with no data.
// Security: unauthenticated users are redirected to sign-in; account shell must
// display data only for the authenticated customer within the tenant context.

import { defineComponent, h, type Component } from "vue";
import type { NavigationGuard, RouteRecordRaw } from "vue-router";

import { shouldTransitionAuthState, type ApiError } from "@platform/sdk";
import type { AuthViewerState } from "@platform/types";

import {
	accountRoutePaths,
	getAccountNavigationItems,
	getAccountRoutes,
	type AccountRouteMetadata
} from "./account-routes";
import { isTenantModuleEnabled } from "./tenant-context-consumer";
import type { TenantFrontendContext } from "./tenant-bootstrap";

// ── Auth Guard ───────────────────────────────────────────────────────────────

export type AccountAuthGuardOptions = {
	readonly signInPath?: string;
};

/**
 * Creates a navigation guard that checks authentication state.
 * Redirects unauthenticated users to the sign-in path.
 */
export function createAccountAuthGuard(
	authState: AuthViewerState,
	options: AccountAuthGuardOptions = {}
): NavigationGuard {
	const signInPath = options.signInPath ?? accountRoutePaths.signIn;

	return () => {
		if (!authState.isAuthenticated) {
			return signInPath;
		}
		return true;
	};
}

/**
 * Creates a combined guard that checks both authentication and module enablement.
 */
export function createAccountModuleGuard(
	authState: AuthViewerState,
	context: TenantFrontendContext,
	routeMeta: AccountRouteMetadata,
	options: AccountAuthGuardOptions = {}
): NavigationGuard {
	const signInPath = options.signInPath ?? accountRoutePaths.signIn;

	return () => {
		if (!authState.isAuthenticated) {
			return signInPath;
		}
		if (routeMeta.requiredModule && !isTenantModuleEnabled(context, routeMeta.requiredModule)) {
			return accountRoutePaths.root;
		}
		return true;
	};
}

// ── Session Expiry Detection ─────────────────────────────────────────────────

export type SessionExpiryResult =
	| { expired: false }
	| { expired: true; transition: "sign-in" | "access-denied" };

/**
 * Checks whether an API error indicates session expiry or access denial
 * using the canonical shouldTransitionAuthState() convention from @platform/sdk.
 */
export function detectSessionExpiry(error: ApiError): SessionExpiryResult {
	const transition = shouldTransitionAuthState(error);
	if (transition) {
		return { expired: true, transition };
	}
	return { expired: false };
}

// ── Empty State Descriptors ──────────────────────────────────────────────────

export type AccountEmptyStateDescriptor = {
	readonly section: string;
	readonly title: string;
	readonly message: string;
	readonly actionLabel?: string;
	readonly actionPath?: string;
};

const accountEmptyStates: Record<string, AccountEmptyStateDescriptor> = {
	orders: {
		section: "orders",
		title: "No Orders Yet",
		message: "You haven't placed any orders. Browse the menu to get started.",
		actionLabel: "Browse Menu",
		actionPath: "/menu"
	},
	bookings: {
		section: "bookings",
		title: "No Bookings Yet",
		message: "You haven't made any bookings. Check available times to schedule.",
		actionLabel: "Book Now",
		actionPath: "/book"
	},
	addresses: {
		section: "addresses",
		title: "No Saved Addresses",
		message: "Add a delivery address to speed up checkout.",
	},
	"payment-methods": {
		section: "payment-methods",
		title: "No Payment Methods",
		message: "Add a payment method for faster checkout.",
	},
	loyalty: {
		section: "loyalty",
		title: "Loyalty Program",
		message: "Start earning rewards with your purchases.",
	},
	notifications: {
		section: "notifications",
		title: "Notification Preferences",
		message: "Manage how you receive updates about orders, bookings, and promotions.",
	},
	preferences: {
		section: "preferences",
		title: "Preferences",
		message: "Manage your notification and communication preferences.",
	}
};

export function getAccountEmptyState(section: string): AccountEmptyStateDescriptor | undefined {
	return accountEmptyStates[section];
}

export function getAllAccountEmptyStates(): Record<string, AccountEmptyStateDescriptor> {
	return { ...accountEmptyStates };
}

// ── Account Shell Route Builder ──────────────────────────────────────────────

function createAccountPlaceholder(meta: AccountRouteMetadata): Component {
	return defineComponent({
		name: `Account${meta.key.replace(/(^|-)(\w)/g, (_, _p, c: string) => c.toUpperCase())}Page`,
		setup() {
			const emptyState = getAccountEmptyState(meta.key);
			return () =>
				h("section", { "data-account-page": meta.key }, [
					h("h2", meta.label),
					emptyState
						? h("div", { class: "empty-state" }, [
								h("p", { class: "empty-state-title" }, emptyState.title),
								h("p", { class: "empty-state-message" }, emptyState.message)
							])
						: h("p", `${meta.label} content will appear here.`)
				]);
		}
	});
}

/**
 * Builds the full account route tree with auth guards and module gates.
 * Uses the canonical route map from E4-S4-T1.
 */
export function buildAccountRoutes(
	authState: AuthViewerState,
	context: TenantFrontendContext
): RouteRecordRaw {
	const children: RouteRecordRaw[] = [];

	for (const meta of getAccountRoutes()) {
		if (meta.key === "sign-in") continue; // sign-in is handled separately

		const guard = meta.requiredModule
			? createAccountModuleGuard(authState, context, meta)
			: createAccountAuthGuard(authState);

		children.push({
			path: meta.path.replace("/account/", ""),
			component: createAccountPlaceholder(meta),
			beforeEnter: guard,
			meta: { requiresAuth: meta.requiresAuth, requiredModule: meta.requiredModule }
		});
	}

	// Account root redirects to profile
	children.unshift({
		path: "",
		redirect: "profile"
	});

	return {
		path: accountRoutePaths.root,
		children,
		component: defineComponent({
			name: "AccountShell",
			setup() {
				const navItems = getAccountNavigationItems();
				return () =>
					h("div", { class: "account-shell" }, [
						h("nav", { class: "account-nav" },
							navItems.map((item) =>
								h("a", { href: item.path, "data-nav-key": item.key }, item.label)
							)
						),
						h("main", { class: "account-content" }, [
							// RouterView placeholder — actual RouterView wired in app integration
							h("div", { "data-outlet": "account" })
						])
					]);
			}
		})
	};
}
