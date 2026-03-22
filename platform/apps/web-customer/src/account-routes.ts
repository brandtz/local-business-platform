// E4-S4-T1: Customer account route map and navigation model.
// Defines routes for all account sections (profile, orders, bookings, loyalty,
// preferences) and a navigation model for the account sidebar/tab bar.
// Security: account routes are customer-scoped within the tenant; route metadata
// enforces auth requirements and module dependencies.

import type { TenantModuleKey } from "@platform/types";

// ── Account Route Map ────────────────────────────────────────────────────────

export const accountRoutePaths = {
	root: "/account",
	profile: "/account/profile",
	orders: "/account/orders",
	orderDetail: "/account/orders/:orderId",
	bookings: "/account/bookings",
	bookingDetail: "/account/bookings/:bookingId",
	addresses: "/account/addresses",
	paymentMethods: "/account/payment-methods",
	loyalty: "/account/loyalty",
	notifications: "/account/notifications",
	preferences: "/account/preferences",
	signIn: "/account/sign-in"
} as const;

export type AccountRoutePath = (typeof accountRoutePaths)[keyof typeof accountRoutePaths];

// ── Account Route Metadata ───────────────────────────────────────────────────

export type AccountRouteMetadata = {
	readonly key: string;
	readonly path: string;
	readonly requiresAuth: boolean;
	readonly requiredModule?: TenantModuleKey;
	readonly label: string;
	readonly showInNavigation: boolean;
};

const accountRouteRegistry: readonly AccountRouteMetadata[] = [
	{
		key: "profile",
		path: accountRoutePaths.profile,
		requiresAuth: true,
		label: "Profile",
		showInNavigation: true
	},
	{
		key: "orders",
		path: accountRoutePaths.orders,
		requiresAuth: true,
		requiredModule: "ordering",
		label: "Orders",
		showInNavigation: true
	},
	{
		key: "order-detail",
		path: accountRoutePaths.orderDetail,
		requiresAuth: true,
		requiredModule: "ordering",
		label: "Order Details",
		showInNavigation: false
	},
	{
		key: "bookings",
		path: accountRoutePaths.bookings,
		requiresAuth: true,
		requiredModule: "bookings",
		label: "Bookings",
		showInNavigation: true
	},
	{
		key: "booking-detail",
		path: accountRoutePaths.bookingDetail,
		requiresAuth: true,
		requiredModule: "bookings",
		label: "Booking Details",
		showInNavigation: false
	},
	{
		key: "loyalty",
		path: accountRoutePaths.loyalty,
		requiresAuth: true,
		label: "Loyalty",
		showInNavigation: true
	},
	{
		key: "addresses",
		path: accountRoutePaths.addresses,
		requiresAuth: true,
		label: "Saved Addresses",
		showInNavigation: true
	},
	{
		key: "payment-methods",
		path: accountRoutePaths.paymentMethods,
		requiresAuth: true,
		label: "Payment Methods",
		showInNavigation: true
	},
	{
		key: "notifications",
		path: accountRoutePaths.notifications,
		requiresAuth: true,
		label: "Notifications",
		showInNavigation: true
	},
	{
		key: "preferences",
		path: accountRoutePaths.preferences,
		requiresAuth: true,
		label: "Preferences",
		showInNavigation: true
	},
	{
		key: "sign-in",
		path: accountRoutePaths.signIn,
		requiresAuth: false,
		label: "Sign In",
		showInNavigation: false
	}
];

// ── Public API ───────────────────────────────────────────────────────────────

export function getAccountRoutes(): readonly AccountRouteMetadata[] {
	return accountRouteRegistry;
}

export function getAccountNavigationItems(): readonly AccountRouteMetadata[] {
	return accountRouteRegistry.filter((r) => r.showInNavigation);
}

export function getAccountRoute(key: string): AccountRouteMetadata | undefined {
	return accountRouteRegistry.find((r) => r.key === key);
}

export function getAuthRequiredAccountRoutes(): readonly AccountRouteMetadata[] {
	return accountRouteRegistry.filter((r) => r.requiresAuth);
}

export function getModuleDependentAccountRoutes(): readonly AccountRouteMetadata[] {
	return accountRouteRegistry.filter((r) => r.requiredModule !== undefined);
}
