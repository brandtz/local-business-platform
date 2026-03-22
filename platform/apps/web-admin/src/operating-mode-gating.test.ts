import { describe, expect, it } from "vitest";

import { tenantModuleKeys } from "@platform/types";

import {
	resolveAdminOperatingMode,
	filterNavigationForOperatingMode,
	isAdminFlowAvailable,
	getAdminBlockedFlows,
	evaluateAdminOperatingModeRouteGuard,
	getModeSpecificSections,
	getAdminOperatingModeDescription,
	sharedAdminSections,
	orderingAdminSections,
	bookingAdminSections
} from "./operating-mode-gating";
import type { ModuleNavigationContext } from "./module-navigation";

// ── Helpers ──────────────────────────────────────────────────────────────────

function orderingContext(): ModuleNavigationContext {
	return {
		enabledModules: ["catalog", "ordering", "content", "operations"],
		role: "owner"
	};
}

function bookingContext(): ModuleNavigationContext {
	return {
		enabledModules: ["catalog", "bookings", "content", "operations"],
		role: "owner"
	};
}

function hybridContext(): ModuleNavigationContext {
	return {
		enabledModules: [...tenantModuleKeys],
		role: "owner"
	};
}

// ── Mode Resolution ──────────────────────────────────────────────────────────

describe("resolveAdminOperatingMode", () => {
	it("resolves ordering for ordering-only context", () => {
		expect(resolveAdminOperatingMode(orderingContext())).toBe("ordering");
	});

	it("resolves booking for booking-only context", () => {
		expect(resolveAdminOperatingMode(bookingContext())).toBe("booking");
	});

	it("resolves hybrid for hybrid context", () => {
		expect(resolveAdminOperatingMode(hybridContext())).toBe("hybrid");
	});
});

// ── Navigation Filtering ─────────────────────────────────────────────────────

describe("filterNavigationForOperatingMode", () => {
	it("ordering-only owner sees ordering but not bookings", () => {
		const entries = filterNavigationForOperatingMode(orderingContext());
		const sections = entries.map((e) => e.section);
		expect(sections).toContain("ordering");
		expect(sections).not.toContain("bookings");
	});

	it("booking-only owner sees bookings but not ordering", () => {
		const entries = filterNavigationForOperatingMode(bookingContext());
		const sections = entries.map((e) => e.section);
		expect(sections).toContain("bookings");
		expect(sections).not.toContain("ordering");
	});

	it("hybrid owner sees both ordering and bookings", () => {
		const entries = filterNavigationForOperatingMode(hybridContext());
		const sections = entries.map((e) => e.section);
		expect(sections).toContain("ordering");
		expect(sections).toContain("bookings");
	});

	it("shared sections are always present for owner", () => {
		for (const ctx of [orderingContext(), bookingContext(), hybridContext()]) {
			const entries = filterNavigationForOperatingMode(ctx);
			const sections = entries.map((e) => e.section);
			expect(sections).toContain("dashboard");
			expect(sections).toContain("catalog");
			expect(sections).toContain("settings");
		}
	});
});

// ── Flow Availability ────────────────────────────────────────────────────────

describe("isAdminFlowAvailable", () => {
	it("ordering context allows cart and order, blocks booking", () => {
		expect(isAdminFlowAvailable(orderingContext(), "cart")).toBe(true);
		expect(isAdminFlowAvailable(orderingContext(), "order")).toBe(true);
		expect(isAdminFlowAvailable(orderingContext(), "booking")).toBe(false);
	});

	it("booking context allows booking, blocks cart and order", () => {
		expect(isAdminFlowAvailable(bookingContext(), "booking")).toBe(true);
		expect(isAdminFlowAvailable(bookingContext(), "cart")).toBe(false);
		expect(isAdminFlowAvailable(bookingContext(), "order")).toBe(false);
	});

	it("hybrid context allows all flows", () => {
		expect(isAdminFlowAvailable(hybridContext(), "cart")).toBe(true);
		expect(isAdminFlowAvailable(hybridContext(), "order")).toBe(true);
		expect(isAdminFlowAvailable(hybridContext(), "booking")).toBe(true);
	});
});

// ── Blocked Flows ────────────────────────────────────────────────────────────

describe("getAdminBlockedFlows", () => {
	it("ordering blocks booking", () => {
		expect(getAdminBlockedFlows(orderingContext())).toEqual(["booking"]);
	});

	it("booking blocks cart and order", () => {
		expect(getAdminBlockedFlows(bookingContext())).toEqual(["cart", "order"]);
	});

	it("hybrid blocks nothing", () => {
		expect(getAdminBlockedFlows(hybridContext())).toEqual([]);
	});
});

// ── Route Guard ──────────────────────────────────────────────────────────────

describe("evaluateAdminOperatingModeRouteGuard", () => {
	it("allows dashboard in any mode", () => {
		const result = evaluateAdminOperatingModeRouteGuard("/", orderingContext());
		expect(result.allowed).toBe(true);
		expect(result.mode).toBe("ordering");
	});

	it("blocks /bookings route in ordering mode", () => {
		const result = evaluateAdminOperatingModeRouteGuard("/bookings", orderingContext());
		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reason).toBe("module-disabled");
			expect(result.mode).toBe("ordering");
		}
	});

	it("blocks /ordering route in booking mode", () => {
		const result = evaluateAdminOperatingModeRouteGuard("/ordering", bookingContext());
		expect(result.allowed).toBe(false);
		if (!result.allowed) {
			expect(result.reason).toBe("module-disabled");
			expect(result.mode).toBe("booking");
		}
	});

	it("allows /ordering and /bookings in hybrid mode", () => {
		const orderingResult = evaluateAdminOperatingModeRouteGuard("/ordering", hybridContext());
		const bookingsResult = evaluateAdminOperatingModeRouteGuard("/bookings", hybridContext());
		expect(orderingResult.allowed).toBe(true);
		expect(bookingsResult.allowed).toBe(true);
	});

	it("includes mode in the result", () => {
		const result = evaluateAdminOperatingModeRouteGuard("/", hybridContext());
		expect(result.mode).toBe("hybrid");
	});
});

// ── Mode-Specific Sections ───────────────────────────────────────────────────

describe("getModeSpecificSections", () => {
	it("ordering mode shows ordering sections", () => {
		expect(getModeSpecificSections(orderingContext())).toEqual(["ordering"]);
	});

	it("booking mode shows bookings sections", () => {
		expect(getModeSpecificSections(bookingContext())).toEqual(["bookings"]);
	});

	it("hybrid mode shows both", () => {
		const sections = getModeSpecificSections(hybridContext());
		expect(sections).toContain("ordering");
		expect(sections).toContain("bookings");
	});
});

// ── Shared Section Constants ─────────────────────────────────────────────────

describe("shared admin section constants", () => {
	it("defines shared sections", () => {
		expect(sharedAdminSections).toContain("dashboard");
		expect(sharedAdminSections).toContain("catalog");
		expect(sharedAdminSections).toContain("settings");
		expect(sharedAdminSections).toContain("audit");
	});

	it("ordering sections include ordering", () => {
		expect(orderingAdminSections).toContain("ordering");
	});

	it("booking sections include bookings", () => {
		expect(bookingAdminSections).toContain("bookings");
	});
});

// ── Mode Description ─────────────────────────────────────────────────────────

describe("getAdminOperatingModeDescription", () => {
	it("returns descriptions for each mode", () => {
		expect(getAdminOperatingModeDescription(orderingContext())).toContain("Ordering-only");
		expect(getAdminOperatingModeDescription(bookingContext())).toContain("Booking-only");
		expect(getAdminOperatingModeDescription(hybridContext())).toContain("Hybrid");
	});
});
