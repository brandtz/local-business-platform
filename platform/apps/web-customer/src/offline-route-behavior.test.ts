import { describe, it, expect } from "vitest";

import {
	routeOfflineClassifications,
	getRouteOfflineBehavior,
	getOfflineSafeRoutes,
	getOnlineRequiredRoutes,
	isRouteOfflineSafe,
	createOfflineRouteMeta,
	findUnclassifiedRoutes,
	type RouteOfflineClassification
} from "./offline-route-behavior";
import { accountRoutePaths } from "./account-routes";

// ── Classification Registry ──────────────────────────────────────────────────

describe("routeOfflineClassifications", () => {
	it("classifies at least 15 routes", () => {
		expect(routeOfflineClassifications.length).toBeGreaterThanOrEqual(15);
	});

	it("every classification has required fields", () => {
		for (const c of routeOfflineClassifications) {
			expect(c.routePath).toBeTruthy();
			expect(["offline-safe", "online-required"]).toContain(c.behavior);
			expect(c.rationale).toBeTruthy();
		}
	});

	it("has no duplicate route paths", () => {
		const paths = routeOfflineClassifications.map((c) => c.routePath);
		expect(new Set(paths).size).toBe(paths.length);
	});
});

// ── Offline-Safe Routes ──────────────────────────────────────────────────────

describe("getOfflineSafeRoutes", () => {
	it("includes the home page", () => {
		const safeRoutes = getOfflineSafeRoutes();
		expect(safeRoutes.find((r) => r.routePath === "/")).toBeDefined();
	});

	it("includes /about", () => {
		const safeRoutes = getOfflineSafeRoutes();
		expect(safeRoutes.find((r) => r.routePath === "/about")).toBeDefined();
	});

	it("includes /contact", () => {
		const safeRoutes = getOfflineSafeRoutes();
		expect(safeRoutes.find((r) => r.routePath === "/contact")).toBeDefined();
	});

	it("does not include any account routes", () => {
		const safeRoutes = getOfflineSafeRoutes();
		const accountRoutes = safeRoutes.filter((r) => r.routePath.startsWith("/account"));
		expect(accountRoutes).toHaveLength(0);
	});
});

// ── Online-Required Routes ───────────────────────────────────────────────────

describe("getOnlineRequiredRoutes", () => {
	it("includes all account routes", () => {
		const onlineRoutes = getOnlineRequiredRoutes();
		const accountPaths = Object.values(accountRoutePaths);
		for (const path of accountPaths) {
			expect(
				onlineRoutes.find((r) => r.routePath === path),
				`expected ${path} to be online-required`
			).toBeDefined();
		}
	});

	it("includes /menu", () => {
		const onlineRoutes = getOnlineRequiredRoutes();
		expect(onlineRoutes.find((r) => r.routePath === "/menu")).toBeDefined();
	});

	it("includes /order", () => {
		const onlineRoutes = getOnlineRequiredRoutes();
		expect(onlineRoutes.find((r) => r.routePath === "/order")).toBeDefined();
	});

	it("includes /book", () => {
		const onlineRoutes = getOnlineRequiredRoutes();
		expect(onlineRoutes.find((r) => r.routePath === "/book")).toBeDefined();
	});
});

// ── Lookup ───────────────────────────────────────────────────────────────────

describe("getRouteOfflineBehavior", () => {
	it("returns offline-safe for /", () => {
		const result = getRouteOfflineBehavior("/");
		expect(result.behavior).toBe("offline-safe");
	});

	it("returns online-required for /account/profile", () => {
		const result = getRouteOfflineBehavior("/account/profile");
		expect(result.behavior).toBe("online-required");
	});

	it("defaults to online-required for unclassified routes", () => {
		const result = getRouteOfflineBehavior("/unknown/page");
		expect(result.behavior).toBe("online-required");
		expect(result.rationale).toContain("Unclassified");
	});
});

describe("isRouteOfflineSafe", () => {
	it("returns true for /", () => {
		expect(isRouteOfflineSafe("/")).toBe(true);
	});

	it("returns false for /account/orders", () => {
		expect(isRouteOfflineSafe("/account/orders")).toBe(false);
	});

	it("returns false for unknown routes", () => {
		expect(isRouteOfflineSafe("/random")).toBe(false);
	});
});

// ── Route Meta Annotation ────────────────────────────────────────────────────

describe("createOfflineRouteMeta", () => {
	it("creates offline-safe meta for /", () => {
		const meta = createOfflineRouteMeta("/");
		expect(meta.offlineBehavior).toBe("offline-safe");
	});

	it("creates online-required meta for /account/profile", () => {
		const meta = createOfflineRouteMeta("/account/profile");
		expect(meta.offlineBehavior).toBe("online-required");
	});
});

// ── Classification Completeness ──────────────────────────────────────────────

describe("findUnclassifiedRoutes", () => {
	it("returns empty when all paths are classified", () => {
		const knownPaths = routeOfflineClassifications.map((c) => c.routePath);
		expect(findUnclassifiedRoutes(knownPaths)).toHaveLength(0);
	});

	it("returns unclassified paths", () => {
		const missing = findUnclassifiedRoutes(["/", "/account/profile", "/new-feature"]);
		expect(missing).toEqual(["/new-feature"]);
	});

	it("all account route paths from account-routes are classified", () => {
		const accountPaths = Object.values(accountRoutePaths);
		const unclassified = findUnclassifiedRoutes(accountPaths);
		expect(unclassified).toHaveLength(0);
	});
});

// ── Documentation Contract ───────────────────────────────────────────────────

describe("offline behavior documentation contract", () => {
	it("every classification includes a non-empty rationale", () => {
		for (const c of routeOfflineClassifications) {
			expect(c.rationale.length).toBeGreaterThan(10);
		}
	});

	it("offline-safe routes do not include data-dependent routes", () => {
		const dataPaths = ["/account", "/order", "/book", "/menu"];
		const safeRoutes = getOfflineSafeRoutes();
		for (const path of dataPaths) {
			expect(
				safeRoutes.find((r) => r.routePath === path),
				`${path} should not be offline-safe`
			).toBeUndefined();
		}
	});
});
