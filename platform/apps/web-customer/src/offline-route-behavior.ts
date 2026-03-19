// E4-S5-T4: Offline-safe versus online-required route behavior classification.
// Provides route metadata annotations and a classification registry so that
// the service worker and app shell can decide whether to serve a cached page
// or require a live network connection.
// Security: offline-safe routes must not serve stale data that belongs to a
// different tenant context. Tenant-scoped cache keys (from E4-S5-T2) ensure
// cache isolation.

// ── Route Offline Behavior ───────────────────────────────────────────────────

export type OfflineBehavior = "offline-safe" | "online-required";

export type RouteOfflineClassification = {
	readonly routePath: string;
	readonly behavior: OfflineBehavior;
	readonly rationale: string;
};

// ── Route Classification Registry ────────────────────────────────────────────
// Classifies all known storefront and account routes. Routes not listed
// default to online-required.

export const routeOfflineClassifications: readonly RouteOfflineClassification[] = [
	// Storefront routes
	{
		routePath: "/",
		behavior: "offline-safe",
		rationale: "Home page shell can render from cached HTML and static assets"
	},
	{
		routePath: "/menu",
		behavior: "online-required",
		rationale: "Menu data requires live API to show current prices and availability"
	},
	{
		routePath: "/order",
		behavior: "online-required",
		rationale: "Ordering requires live API for cart, pricing, and payment"
	},
	{
		routePath: "/book",
		behavior: "online-required",
		rationale: "Booking requires live API for real-time availability"
	},
	{
		routePath: "/about",
		behavior: "offline-safe",
		rationale: "About page is static tenant content, safe to serve from cache"
	},
	{
		routePath: "/contact",
		behavior: "offline-safe",
		rationale: "Contact page is static tenant content, safe to serve from cache"
	},
	{
		routePath: "/status",
		behavior: "online-required",
		rationale: "Status page shows live runtime information"
	},

	// Account routes
	{
		routePath: "/account",
		behavior: "online-required",
		rationale: "Account shell requires authenticated session validation"
	},
	{
		routePath: "/account/profile",
		behavior: "online-required",
		rationale: "Profile data must be fresh from the API"
	},
	{
		routePath: "/account/orders",
		behavior: "online-required",
		rationale: "Order history requires live data"
	},
	{
		routePath: "/account/orders/:orderId",
		behavior: "online-required",
		rationale: "Order detail requires live data for status tracking"
	},
	{
		routePath: "/account/bookings",
		behavior: "online-required",
		rationale: "Booking history requires live data"
	},
	{
		routePath: "/account/bookings/:bookingId",
		behavior: "online-required",
		rationale: "Booking detail requires live data for status tracking"
	},
	{
		routePath: "/account/loyalty",
		behavior: "online-required",
		rationale: "Loyalty points and rewards require fresh API data"
	},
	{
		routePath: "/account/preferences",
		behavior: "online-required",
		rationale: "Preferences must be loaded from and saved to the API"
	},
	{
		routePath: "/account/sign-in",
		behavior: "online-required",
		rationale: "Sign-in requires live authentication API"
	}
];

// ── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Returns the offline classification for a given route path.
 * Defaults to online-required for unclassified routes.
 */
export function getRouteOfflineBehavior(routePath: string): RouteOfflineClassification {
	const match = routeOfflineClassifications.find((c) => c.routePath === routePath);
	if (match) return match;

	return {
		routePath,
		behavior: "online-required",
		rationale: "Unclassified route defaults to online-required"
	};
}

/**
 * Returns all routes classified as offline-safe.
 */
export function getOfflineSafeRoutes(): readonly RouteOfflineClassification[] {
	return routeOfflineClassifications.filter((c) => c.behavior === "offline-safe");
}

/**
 * Returns all routes classified as online-required.
 */
export function getOnlineRequiredRoutes(): readonly RouteOfflineClassification[] {
	return routeOfflineClassifications.filter((c) => c.behavior === "online-required");
}

/**
 * Checks whether a route is safe to serve from cache.
 */
export function isRouteOfflineSafe(routePath: string): boolean {
	return getRouteOfflineBehavior(routePath).behavior === "offline-safe";
}

// ── Route Meta Annotation ────────────────────────────────────────────────────
// Convention for annotating vue-router route records with offline behavior:
//
//   {
//     path: "/about",
//     component: AboutPage,
//     meta: { offlineBehavior: "offline-safe" }
//   }
//
// The service worker should check route.meta.offlineBehavior when deciding
// whether to serve a cached navigation response.

export type OfflineRouteMetadata = {
	readonly offlineBehavior: OfflineBehavior;
};

/**
 * Creates route metadata with the offline behavior annotation.
 */
export function createOfflineRouteMeta(routePath: string): OfflineRouteMetadata {
	return {
		offlineBehavior: getRouteOfflineBehavior(routePath).behavior
	};
}

// ── Classification Completeness ──────────────────────────────────────────────

/**
 * Validates that a list of known route paths are all covered by the
 * classification registry. Returns paths that are missing.
 */
export function findUnclassifiedRoutes(knownPaths: readonly string[]): string[] {
	const classifiedPaths = new Set(routeOfflineClassifications.map((c) => c.routePath));
	return knownPaths.filter((p) => !classifiedPaths.has(p));
}
