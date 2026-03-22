import { describe, expect, it } from "vitest";

import {
	OperatingModeEnforcementService,
	OperatingModeError,
	type OperatingModeContext
} from "./operating-mode-enforcement.service";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function orderingOnlyContext(): OperatingModeContext {
	return {
		tenantId: "tenant-ordering",
		enabledModules: ["catalog", "ordering", "content", "operations"]
	};
}

function bookingOnlyContext(): OperatingModeContext {
	return {
		tenantId: "tenant-booking",
		enabledModules: ["catalog", "bookings", "content", "operations"]
	};
}

function hybridContext(): OperatingModeContext {
	return {
		tenantId: "tenant-hybrid",
		enabledModules: ["catalog", "ordering", "bookings", "content", "operations"]
	};
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("OperatingModeEnforcementService", () => {
	const service = new OperatingModeEnforcementService();

	// ── Mode Resolution ──────────────────────────────────────────────────

	describe("resolveMode", () => {
		it("resolves ordering mode for ordering-only tenant", () => {
			expect(service.resolveMode(orderingOnlyContext())).toBe("ordering");
		});

		it("resolves booking mode for booking-only tenant", () => {
			expect(service.resolveMode(bookingOnlyContext())).toBe("booking");
		});

		it("resolves hybrid mode for hybrid tenant", () => {
			expect(service.resolveMode(hybridContext())).toBe("hybrid");
		});
	});

	// ── Flow Checking ────────────────────────────────────────────────────

	describe("checkFlow", () => {
		it("allows cart flow for ordering-only tenant", () => {
			const result = service.checkFlow(orderingOnlyContext(), "cart");
			expect(result.allowed).toBe(true);
		});

		it("allows order flow for ordering-only tenant", () => {
			const result = service.checkFlow(orderingOnlyContext(), "order");
			expect(result.allowed).toBe(true);
		});

		it("blocks booking flow for ordering-only tenant", () => {
			const result = service.checkFlow(orderingOnlyContext(), "booking");
			expect(result.allowed).toBe(false);
			if (!result.allowed) {
				expect(result.flow).toBe("booking");
				expect(result.mode).toBe("ordering");
				expect(result.message).toContain("Booking");
				expect(result.message).toContain("ordering");
			}
		});

		it("allows booking flow for booking-only tenant", () => {
			const result = service.checkFlow(bookingOnlyContext(), "booking");
			expect(result.allowed).toBe(true);
		});

		it("blocks cart flow for booking-only tenant", () => {
			const result = service.checkFlow(bookingOnlyContext(), "cart");
			expect(result.allowed).toBe(false);
			if (!result.allowed) {
				expect(result.flow).toBe("cart");
				expect(result.mode).toBe("booking");
				expect(result.message).toContain("Cart");
				expect(result.message).toContain("booking");
			}
		});

		it("blocks order flow for booking-only tenant", () => {
			const result = service.checkFlow(bookingOnlyContext(), "order");
			expect(result.allowed).toBe(false);
			if (!result.allowed) {
				expect(result.flow).toBe("order");
				expect(result.mode).toBe("booking");
			}
		});

		it("allows all flows for hybrid tenant", () => {
			const ctx = hybridContext();
			expect(service.checkFlow(ctx, "cart").allowed).toBe(true);
			expect(service.checkFlow(ctx, "order").allowed).toBe(true);
			expect(service.checkFlow(ctx, "booking").allowed).toBe(true);
		});
	});

	// ── Flow Enforcement ─────────────────────────────────────────────────

	describe("requireFlow", () => {
		it("does not throw for allowed flows", () => {
			expect(() => service.requireFlow(orderingOnlyContext(), "cart")).not.toThrow();
			expect(() => service.requireFlow(orderingOnlyContext(), "order")).not.toThrow();
			expect(() => service.requireFlow(bookingOnlyContext(), "booking")).not.toThrow();
			expect(() => service.requireFlow(hybridContext(), "cart")).not.toThrow();
			expect(() => service.requireFlow(hybridContext(), "booking")).not.toThrow();
		});

		it("throws OperatingModeError for blocked flows", () => {
			expect(() => service.requireFlow(orderingOnlyContext(), "booking")).toThrow(OperatingModeError);
			expect(() => service.requireFlow(bookingOnlyContext(), "cart")).toThrow(OperatingModeError);
			expect(() => service.requireFlow(bookingOnlyContext(), "order")).toThrow(OperatingModeError);
		});

		it("error includes descriptive message", () => {
			try {
				service.requireFlow(bookingOnlyContext(), "cart");
				expect.unreachable("should have thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(OperatingModeError);
				const e = err as OperatingModeError;
				expect(e.reason).toBe("flow-disabled");
				expect(e.flow).toBe("cart");
				expect(e.mode).toBe("booking");
				expect(e.message).toBe("Cart operations are not available in booking operating mode.");
			}
		});
	});

	// ── Rules & Blocked Flows ────────────────────────────────────────────

	describe("getRules", () => {
		it("returns correct rules for each mode", () => {
			const orderingRules = service.getRules(orderingOnlyContext());
			expect(orderingRules.mode).toBe("ordering");
			expect(orderingRules.allowedFlows).toContain("cart");
			expect(orderingRules.allowedFlows).toContain("order");

			const bookingRules = service.getRules(bookingOnlyContext());
			expect(bookingRules.mode).toBe("booking");
			expect(bookingRules.allowedFlows).toContain("booking");

			const hybridRules = service.getRules(hybridContext());
			expect(hybridRules.mode).toBe("hybrid");
			expect(hybridRules.allowedFlows).toHaveLength(3);
		});
	});

	describe("getBlockedFlows", () => {
		it("returns booking as blocked for ordering-only", () => {
			expect(service.getBlockedFlows(orderingOnlyContext())).toEqual(["booking"]);
		});

		it("returns cart and order as blocked for booking-only", () => {
			expect(service.getBlockedFlows(bookingOnlyContext())).toEqual(["cart", "order"]);
		});

		it("returns empty for hybrid", () => {
			expect(service.getBlockedFlows(hybridContext())).toEqual([]);
		});
	});

	// ── Mode Change ──────────────────────────────────────────────────────

	describe("mode change enforcement", () => {
		it("immediately reflects mode changes when modules change", () => {
			const ctx: OperatingModeContext = {
				tenantId: "tenant-dynamic",
				enabledModules: ["catalog", "ordering", "content"]
			};

			// Initially ordering-only
			expect(service.resolveMode(ctx)).toBe("ordering");
			expect(service.checkFlow(ctx, "booking").allowed).toBe(false);

			// After adding bookings module → hybrid
			const hybridCtx: OperatingModeContext = {
				...ctx,
				enabledModules: ["catalog", "ordering", "bookings", "content"]
			};
			expect(service.resolveMode(hybridCtx)).toBe("hybrid");
			expect(service.checkFlow(hybridCtx, "booking").allowed).toBe(true);

			// After removing ordering → booking-only
			const bookingCtx: OperatingModeContext = {
				...ctx,
				enabledModules: ["catalog", "bookings", "content"]
			};
			expect(service.resolveMode(bookingCtx)).toBe("booking");
			expect(service.checkFlow(bookingCtx, "cart").allowed).toBe(false);
			expect(service.checkFlow(bookingCtx, "order").allowed).toBe(false);
		});
	});
});
