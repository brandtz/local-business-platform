import { describe, expect, it } from "vitest";

import {
	accountRoutePaths,
	getAccountNavigationItems,
	getAccountRoute,
	getAccountRoutes,
	getAuthRequiredAccountRoutes,
	getModuleDependentAccountRoutes
} from "./account-routes";

describe("account route map", () => {
	it("defines all expected account route paths", () => {
		expect(accountRoutePaths.root).toBe("/account");
		expect(accountRoutePaths.profile).toBe("/account/profile");
		expect(accountRoutePaths.orders).toBe("/account/orders");
		expect(accountRoutePaths.orderDetail).toBe("/account/orders/:orderId");
		expect(accountRoutePaths.bookings).toBe("/account/bookings");
		expect(accountRoutePaths.bookingDetail).toBe("/account/bookings/:bookingId");
		expect(accountRoutePaths.loyalty).toBe("/account/loyalty");
		expect(accountRoutePaths.preferences).toBe("/account/preferences");
		expect(accountRoutePaths.signIn).toBe("/account/sign-in");
	});

	it("has routes for all planned account sections", () => {
		const routes = getAccountRoutes();
		const keys = routes.map((r) => r.key);
		expect(keys).toContain("profile");
		expect(keys).toContain("orders");
		expect(keys).toContain("bookings");
		expect(keys).toContain("loyalty");
		expect(keys).toContain("preferences");
		expect(keys).toContain("sign-in");
	});

	it("every route has a valid path starting with /account", () => {
		for (const route of getAccountRoutes()) {
			expect(route.path).toMatch(/^\/account/);
		}
	});

	it("every route has a label", () => {
		for (const route of getAccountRoutes()) {
			expect(route.label).toBeTruthy();
		}
	});
});

describe("account navigation items", () => {
	it("returns only navigable items", () => {
		const navItems = getAccountNavigationItems();
		expect(navItems.length).toBeGreaterThan(0);
		for (const item of navItems) {
			expect(item.showInNavigation).toBe(true);
		}
	});

	it("includes profile, orders, bookings, loyalty, preferences", () => {
		const keys = getAccountNavigationItems().map((r) => r.key);
		expect(keys).toContain("profile");
		expect(keys).toContain("orders");
		expect(keys).toContain("bookings");
		expect(keys).toContain("loyalty");
		expect(keys).toContain("preferences");
	});

	it("excludes sign-in and detail pages", () => {
		const keys = getAccountNavigationItems().map((r) => r.key);
		expect(keys).not.toContain("sign-in");
		expect(keys).not.toContain("order-detail");
		expect(keys).not.toContain("booking-detail");
	});
});

describe("auth requirements", () => {
	it("sign-in does not require auth", () => {
		const signIn = getAccountRoute("sign-in");
		expect(signIn?.requiresAuth).toBe(false);
	});

	it("all other routes require auth", () => {
		const authRoutes = getAuthRequiredAccountRoutes();
		expect(authRoutes.length).toBeGreaterThan(0);
		for (const route of authRoutes) {
			expect(route.key).not.toBe("sign-in");
			expect(route.requiresAuth).toBe(true);
		}
	});
});

describe("module dependencies", () => {
	it("orders routes depend on ordering module", () => {
		const orders = getAccountRoute("orders");
		expect(orders?.requiredModule).toBe("ordering");
		const orderDetail = getAccountRoute("order-detail");
		expect(orderDetail?.requiredModule).toBe("ordering");
	});

	it("bookings routes depend on bookings module", () => {
		const bookings = getAccountRoute("bookings");
		expect(bookings?.requiredModule).toBe("bookings");
		const bookingDetail = getAccountRoute("booking-detail");
		expect(bookingDetail?.requiredModule).toBe("bookings");
	});

	it("profile, loyalty, preferences have no module dependency", () => {
		for (const key of ["profile", "loyalty", "preferences"]) {
			const route = getAccountRoute(key);
			expect(route?.requiredModule).toBeUndefined();
		}
	});

	it("getModuleDependentAccountRoutes returns only module-gated routes", () => {
		const moduleDeps = getModuleDependentAccountRoutes();
		expect(moduleDeps.length).toBeGreaterThan(0);
		for (const route of moduleDeps) {
			expect(route.requiredModule).toBeTruthy();
		}
	});
});

describe("getAccountRoute", () => {
	it("returns the correct route by key", () => {
		const profile = getAccountRoute("profile");
		expect(profile?.path).toBe("/account/profile");
	});

	it("returns undefined for unknown key", () => {
		expect(getAccountRoute("nonexistent")).toBeUndefined();
	});
});
