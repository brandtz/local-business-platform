import { describe, it, expect } from "vitest";

import type { AuthViewerState } from "@platform/types";
import type { ApiError } from "@platform/sdk";

import type { TenantFrontendContext } from "./tenant-bootstrap";
import {
	createAccountAuthGuard,
	createAccountModuleGuard,
	detectSessionExpiry,
	getAccountEmptyState,
	getAllAccountEmptyStates,
	buildAccountRoutes,
	type AccountAuthGuardOptions,
	type SessionExpiryResult
} from "./account-shell";
import { accountRoutePaths } from "./account-routes";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function createAnonymousAuthState(): AuthViewerState {
	return {
		isAuthenticated: false,
		actorType: "customer",
		userId: null,
		displayName: null,
		sessionScope: "customer",
		status: "anonymous",
		impersonationSession: undefined
	};
}

function createAuthenticatedAuthState(): AuthViewerState {
	return {
		isAuthenticated: true,
		actorType: "customer",
		userId: "user-1",
		displayName: "Test User",
		sessionScope: "customer",
		status: "authenticated",
		impersonationSession: undefined
	};
}

function createTenantContext(
	modules: readonly string[] = ["catalog", "ordering", "bookings", "content"]
): TenantFrontendContext {
	return {
		tenantId: "tenant-1",
		displayName: "Test Business",
		slug: "test-biz",
		status: "active",
		previewSubdomain: "test-biz",
		templateKey: "restaurant-core",
		enabledModules: modules as TenantFrontendContext["enabledModules"]
	};
}

// ── Auth Guard ───────────────────────────────────────────────────────────────

describe("createAccountAuthGuard", () => {
	it("returns true for authenticated users", () => {
		const guard = createAccountAuthGuard(createAuthenticatedAuthState());
		const result = (guard as Function)();
		expect(result).toBe(true);
	});

	it("redirects anonymous users to default sign-in path", () => {
		const guard = createAccountAuthGuard(createAnonymousAuthState());
		const result = (guard as Function)();
		expect(result).toBe(accountRoutePaths.signIn);
	});

	it("redirects anonymous users to custom sign-in path", () => {
		const options: AccountAuthGuardOptions = { signInPath: "/login" };
		const guard = createAccountAuthGuard(createAnonymousAuthState(), options);
		const result = (guard as Function)();
		expect(result).toBe("/login");
	});
});

// ── Module Guard ─────────────────────────────────────────────────────────────

describe("createAccountModuleGuard", () => {
	it("returns true for authenticated user with enabled module", () => {
		const context = createTenantContext(["ordering"]);
		const meta = {
			key: "orders",
			path: "/account/orders",
			requiresAuth: true,
			requiredModule: "ordering" as const,
			label: "Orders",
			showInNavigation: true
		};
		const guard = createAccountModuleGuard(
			createAuthenticatedAuthState(),
			context,
			meta
		);
		const result = (guard as Function)();
		expect(result).toBe(true);
	});

	it("redirects unauthenticated user to sign-in", () => {
		const context = createTenantContext(["ordering"]);
		const meta = {
			key: "orders",
			path: "/account/orders",
			requiresAuth: true,
			requiredModule: "ordering" as const,
			label: "Orders",
			showInNavigation: true
		};
		const guard = createAccountModuleGuard(
			createAnonymousAuthState(),
			context,
			meta
		);
		const result = (guard as Function)();
		expect(result).toBe(accountRoutePaths.signIn);
	});

	it("redirects to account root when module is disabled", () => {
		const context = createTenantContext(["catalog"]); // no ordering
		const meta = {
			key: "orders",
			path: "/account/orders",
			requiresAuth: true,
			requiredModule: "ordering" as const,
			label: "Orders",
			showInNavigation: true
		};
		const guard = createAccountModuleGuard(
			createAuthenticatedAuthState(),
			context,
			meta
		);
		const result = (guard as Function)();
		expect(result).toBe(accountRoutePaths.root);
	});

	it("allows route without required module for authenticated user", () => {
		const context = createTenantContext();
		const meta = {
			key: "profile",
			path: "/account/profile",
			requiresAuth: true,
			label: "Profile",
			showInNavigation: true
		};
		const guard = createAccountModuleGuard(
			createAuthenticatedAuthState(),
			context,
			meta
		);
		const result = (guard as Function)();
		expect(result).toBe(true);
	});
});

// ── Session Expiry Detection ─────────────────────────────────────────────────

describe("detectSessionExpiry", () => {
	it("detects 401 as sign-in transition", () => {
		const error: ApiError = {
			kind: "unauthorized",
			status: 401,
			message: "Auth required",
			retryable: false
		};
		const result: SessionExpiryResult = detectSessionExpiry(error);
		expect(result).toEqual({ expired: true, transition: "sign-in" });
	});

	it("detects 403 as access-denied transition", () => {
		const error: ApiError = {
			kind: "forbidden",
			status: 403,
			message: "Access denied",
			retryable: false
		};
		const result: SessionExpiryResult = detectSessionExpiry(error);
		expect(result).toEqual({ expired: true, transition: "access-denied" });
	});

	it("returns not expired for network errors", () => {
		const error: ApiError = {
			kind: "network",
			status: null,
			message: "Network error",
			retryable: true
		};
		const result = detectSessionExpiry(error);
		expect(result).toEqual({ expired: false });
	});

	it("returns not expired for server errors", () => {
		const error: ApiError = {
			kind: "server-error",
			status: 500,
			message: "Server error",
			retryable: true
		};
		const result = detectSessionExpiry(error);
		expect(result).toEqual({ expired: false });
	});

	it("returns not expired for not-found errors", () => {
		const error: ApiError = {
			kind: "not-found",
			status: 404,
			message: "Not found",
			retryable: false
		};
		const result = detectSessionExpiry(error);
		expect(result).toEqual({ expired: false });
	});
});

// ── Empty State Descriptors ──────────────────────────────────────────────────

describe("getAccountEmptyState", () => {
	it("returns orders empty state", () => {
		const state = getAccountEmptyState("orders");
		expect(state).toBeDefined();
		expect(state!.section).toBe("orders");
		expect(state!.title).toBe("No Orders Yet");
		expect(state!.actionLabel).toBe("Browse Menu");
		expect(state!.actionPath).toBe("/menu");
	});

	it("returns bookings empty state", () => {
		const state = getAccountEmptyState("bookings");
		expect(state).toBeDefined();
		expect(state!.section).toBe("bookings");
		expect(state!.title).toBe("No Bookings Yet");
		expect(state!.actionLabel).toBe("Book Now");
	});

	it("returns loyalty empty state without action", () => {
		const state = getAccountEmptyState("loyalty");
		expect(state).toBeDefined();
		expect(state!.section).toBe("loyalty");
		expect(state!.actionLabel).toBeUndefined();
	});

	it("returns preferences empty state without action", () => {
		const state = getAccountEmptyState("preferences");
		expect(state).toBeDefined();
		expect(state!.section).toBe("preferences");
	});

	it("returns undefined for unknown section", () => {
		expect(getAccountEmptyState("nonexistent")).toBeUndefined();
	});
});

describe("getAllAccountEmptyStates", () => {
	it("returns all 4 empty states", () => {
		const states = getAllAccountEmptyStates();
		expect(Object.keys(states)).toHaveLength(4);
		expect(Object.keys(states).sort()).toEqual([
			"bookings",
			"loyalty",
			"orders",
			"preferences"
		]);
	});

	it("returns a copy (not mutable reference)", () => {
		const a = getAllAccountEmptyStates();
		const b = getAllAccountEmptyStates();
		expect(a).not.toBe(b);
		expect(a).toEqual(b);
	});
});

// ── Build Account Routes ─────────────────────────────────────────────────────

describe("buildAccountRoutes", () => {
	it("returns a route record for /account", () => {
		const route = buildAccountRoutes(
			createAuthenticatedAuthState(),
			createTenantContext()
		);
		expect(route.path).toBe("/account");
	});

	it("has children routes for account sections", () => {
		const route = buildAccountRoutes(
			createAuthenticatedAuthState(),
			createTenantContext()
		);
		expect(route.children).toBeDefined();
		// root redirect + profile + orders + order-detail + bookings + booking-detail + loyalty + preferences = 8
		expect(route.children!.length).toBe(8);
	});

	it("first child is redirect to profile", () => {
		const route = buildAccountRoutes(
			createAuthenticatedAuthState(),
			createTenantContext()
		);
		const first = route.children![0];
		expect(first.path).toBe("");
		expect(first.redirect).toBe("profile");
	});

	it("children have beforeEnter guards", () => {
		const route = buildAccountRoutes(
			createAuthenticatedAuthState(),
			createTenantContext()
		);
		// Skip first child (redirect), check guards on the rest
		for (const child of route.children!.slice(1)) {
			expect(child.beforeEnter).toBeDefined();
			expect(typeof child.beforeEnter).toBe("function");
		}
	});

	it("auth guard on profile allows authenticated user", () => {
		const route = buildAccountRoutes(
			createAuthenticatedAuthState(),
			createTenantContext()
		);
		const profileRoute = route.children!.find((c) => c.path === "profile");
		expect(profileRoute).toBeDefined();
		const result = (profileRoute!.beforeEnter as Function)();
		expect(result).toBe(true);
	});

	it("auth guard on profile blocks anonymous user", () => {
		const route = buildAccountRoutes(
			createAnonymousAuthState(),
			createTenantContext()
		);
		const profileRoute = route.children!.find((c) => c.path === "profile");
		expect(profileRoute).toBeDefined();
		const result = (profileRoute!.beforeEnter as Function)();
		expect(result).toBe(accountRoutePaths.signIn);
	});

	it("module guard blocks orders when ordering module disabled", () => {
		const route = buildAccountRoutes(
			createAuthenticatedAuthState(),
			createTenantContext(["catalog"]) // no ordering
		);
		const ordersRoute = route.children!.find((c) => c.path === "orders");
		expect(ordersRoute).toBeDefined();
		const result = (ordersRoute!.beforeEnter as Function)();
		expect(result).toBe(accountRoutePaths.root);
	});

	it("module guard allows orders when ordering module enabled", () => {
		const route = buildAccountRoutes(
			createAuthenticatedAuthState(),
			createTenantContext(["ordering"])
		);
		const ordersRoute = route.children!.find((c) => c.path === "orders");
		expect(ordersRoute).toBeDefined();
		const result = (ordersRoute!.beforeEnter as Function)();
		expect(result).toBe(true);
	});

	it("excludes sign-in from children (handled separately)", () => {
		const route = buildAccountRoutes(
			createAuthenticatedAuthState(),
			createTenantContext()
		);
		const signInChild = route.children!.find((c) => c.path === "sign-in");
		expect(signInChild).toBeUndefined();
	});

	it("children meta includes requiresAuth and requiredModule", () => {
		const route = buildAccountRoutes(
			createAuthenticatedAuthState(),
			createTenantContext()
		);
		const ordersRoute = route.children!.find((c) => c.path === "orders");
		expect(ordersRoute).toBeDefined();
		expect(ordersRoute!.meta).toEqual({
			requiresAuth: true,
			requiredModule: "ordering"
		});
	});
});
