import { describe, expect, it } from "vitest";

import type { TenantModuleKey } from "@platform/types";

import {
	resolveTenantOperatingMode,
	isTenantFlowAvailable,
	getTenantBlockedFlows,
	isRouteBlockedByOperatingMode,
	getOperatingModeDescription
} from "./operating-mode-gating";
import type { TenantFrontendContext } from "./tenant-bootstrap";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createContext(
	enabledModules: readonly TenantModuleKey[],
	templateKey: TenantFrontendContext["templateKey"] = "restaurant-core"
): TenantFrontendContext {
	return {
		tenantId: "test-tenant",
		displayName: "Test Tenant",
		slug: "test-tenant",
		status: "active",
		previewSubdomain: "test-tenant",
		templateKey,
		enabledModules
	};
}

// ── Mode Resolution ──────────────────────────────────────────────────────────

describe("resolveTenantOperatingMode", () => {
	it("resolves ordering mode for ordering-only tenant", () => {
		expect(resolveTenantOperatingMode(createContext(["catalog", "ordering", "content"]))).toBe("ordering");
	});

	it("resolves booking mode for booking-only tenant", () => {
		expect(resolveTenantOperatingMode(createContext(["catalog", "bookings", "content"]))).toBe("booking");
	});

	it("resolves hybrid mode for hybrid tenant", () => {
		expect(resolveTenantOperatingMode(createContext(["catalog", "ordering", "bookings", "content"]))).toBe("hybrid");
	});
});

// ── Flow Availability ────────────────────────────────────────────────────────

describe("isTenantFlowAvailable", () => {
	it("cart is available for ordering-only tenant", () => {
		const ctx = createContext(["catalog", "ordering"]);
		expect(isTenantFlowAvailable(ctx, "cart")).toBe(true);
		expect(isTenantFlowAvailable(ctx, "order")).toBe(true);
		expect(isTenantFlowAvailable(ctx, "booking")).toBe(false);
	});

	it("booking is available for booking-only tenant", () => {
		const ctx = createContext(["catalog", "bookings"]);
		expect(isTenantFlowAvailable(ctx, "booking")).toBe(true);
		expect(isTenantFlowAvailable(ctx, "cart")).toBe(false);
		expect(isTenantFlowAvailable(ctx, "order")).toBe(false);
	});

	it("all flows available for hybrid tenant", () => {
		const ctx = createContext(["catalog", "ordering", "bookings"]);
		expect(isTenantFlowAvailable(ctx, "cart")).toBe(true);
		expect(isTenantFlowAvailable(ctx, "order")).toBe(true);
		expect(isTenantFlowAvailable(ctx, "booking")).toBe(true);
	});
});

// ── Blocked Flows ────────────────────────────────────────────────────────────

describe("getTenantBlockedFlows", () => {
	it("returns booking as blocked for ordering-only tenant", () => {
		const ctx = createContext(["catalog", "ordering"]);
		expect(getTenantBlockedFlows(ctx)).toEqual(["booking"]);
	});

	it("returns cart and order as blocked for booking-only tenant", () => {
		const ctx = createContext(["catalog", "bookings"]);
		expect(getTenantBlockedFlows(ctx)).toEqual(["cart", "order"]);
	});

	it("returns empty for hybrid tenant", () => {
		const ctx = createContext(["catalog", "ordering", "bookings"]);
		expect(getTenantBlockedFlows(ctx)).toEqual([]);
	});
});

// ── Route Blocking ───────────────────────────────────────────────────────────

describe("isRouteBlockedByOperatingMode", () => {
	it("blocks /book for ordering-only tenant", () => {
		const ctx = createContext(["catalog", "ordering"]);
		expect(isRouteBlockedByOperatingMode(ctx, "/book")).toBe(true);
	});

	it("blocks /account/bookings for ordering-only tenant", () => {
		const ctx = createContext(["catalog", "ordering"]);
		expect(isRouteBlockedByOperatingMode(ctx, "/account/bookings")).toBe(true);
	});

	it("allows /order for ordering-only tenant", () => {
		const ctx = createContext(["catalog", "ordering"]);
		expect(isRouteBlockedByOperatingMode(ctx, "/order")).toBe(false);
	});

	it("blocks /order for booking-only tenant", () => {
		const ctx = createContext(["catalog", "bookings"]);
		expect(isRouteBlockedByOperatingMode(ctx, "/order")).toBe(true);
	});

	it("blocks /cart for booking-only tenant", () => {
		const ctx = createContext(["catalog", "bookings"]);
		expect(isRouteBlockedByOperatingMode(ctx, "/cart")).toBe(true);
	});

	it("blocks /checkout for booking-only tenant", () => {
		const ctx = createContext(["catalog", "bookings"]);
		expect(isRouteBlockedByOperatingMode(ctx, "/checkout")).toBe(true);
	});

	it("allows /book for booking-only tenant", () => {
		const ctx = createContext(["catalog", "bookings"]);
		expect(isRouteBlockedByOperatingMode(ctx, "/book")).toBe(false);
	});

	it("allows all routes for hybrid tenant", () => {
		const ctx = createContext(["catalog", "ordering", "bookings"]);
		expect(isRouteBlockedByOperatingMode(ctx, "/order")).toBe(false);
		expect(isRouteBlockedByOperatingMode(ctx, "/book")).toBe(false);
		expect(isRouteBlockedByOperatingMode(ctx, "/cart")).toBe(false);
		expect(isRouteBlockedByOperatingMode(ctx, "/account/orders")).toBe(false);
		expect(isRouteBlockedByOperatingMode(ctx, "/account/bookings")).toBe(false);
	});

	it("allows unrelated routes in any mode", () => {
		const orderingCtx = createContext(["catalog", "ordering"]);
		const bookingCtx = createContext(["catalog", "bookings"]);
		expect(isRouteBlockedByOperatingMode(orderingCtx, "/")).toBe(false);
		expect(isRouteBlockedByOperatingMode(orderingCtx, "/menu")).toBe(false);
		expect(isRouteBlockedByOperatingMode(bookingCtx, "/")).toBe(false);
		expect(isRouteBlockedByOperatingMode(bookingCtx, "/about")).toBe(false);
	});

	it("blocks nested booking routes for ordering-only", () => {
		const ctx = createContext(["catalog", "ordering"]);
		expect(isRouteBlockedByOperatingMode(ctx, "/account/bookings/123")).toBe(true);
	});
});

// ── Mode Description ─────────────────────────────────────────────────────────

describe("getOperatingModeDescription", () => {
	it("returns ordering mode description", () => {
		const ctx = createContext(["catalog", "ordering"]);
		expect(getOperatingModeDescription(ctx)).toContain("Ordering-only");
	});

	it("returns booking mode description", () => {
		const ctx = createContext(["catalog", "bookings"]);
		expect(getOperatingModeDescription(ctx)).toContain("Booking-only");
	});

	it("returns hybrid mode description", () => {
		const ctx = createContext(["catalog", "ordering", "bookings"]);
		expect(getOperatingModeDescription(ctx)).toContain("Hybrid");
	});
});
