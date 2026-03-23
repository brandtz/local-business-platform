import { describe, it, expect } from "vitest";
import {
	STEP_LABELS,
	TIP_PRESETS,
	calculateTipCents,
	validateDeliveryAddress,
	validateNewCard,
} from "./checkout-page";

describe("checkout-page helpers", () => {
	describe("STEP_LABELS", () => {
		it("has three steps in order", () => {
			expect(STEP_LABELS).toEqual(["Fulfillment", "Payment", "Review"]);
		});
	});

	describe("TIP_PRESETS", () => {
		it("provides 15%, 18%, 20% presets", () => {
			expect(TIP_PRESETS).toHaveLength(3);
			expect(TIP_PRESETS[0].label).toBe("15%");
			expect(TIP_PRESETS[1].label).toBe("18%");
			expect(TIP_PRESETS[2].label).toBe("20%");
		});
	});

	describe("calculateTipCents", () => {
		it("returns 0 for empty selection", () => {
			expect(calculateTipCents("", 5000, 0)).toBe(0);
		});

		it("calculates 15% tip", () => {
			expect(calculateTipCents("15%", 10000, 0)).toBe(1500);
		});

		it("calculates 18% tip", () => {
			expect(calculateTipCents("18%", 10000, 0)).toBe(1800);
		});

		it("calculates 20% tip", () => {
			expect(calculateTipCents("20%", 10000, 0)).toBe(2000);
		});

		it("returns custom tip cents when selection is custom", () => {
			expect(calculateTipCents("custom", 10000, 750)).toBe(750);
		});

		it("rounds preset tip to nearest cent", () => {
			expect(calculateTipCents("15%", 3333, 0)).toBe(500);
		});
	});

	describe("validateDeliveryAddress", () => {
		it("returns true for complete address", () => {
			expect(validateDeliveryAddress({
				line1: "123 Main St",
				city: "Springfield",
				state: "IL",
				zip: "62701",
			})).toBe(true);
		});

		it("returns false for empty street", () => {
			expect(validateDeliveryAddress({
				line1: "",
				city: "Springfield",
				state: "IL",
				zip: "62701",
			})).toBe(false);
		});

		it("returns false for empty city", () => {
			expect(validateDeliveryAddress({
				line1: "123 Main St",
				city: "",
				state: "IL",
				zip: "62701",
			})).toBe(false);
		});

		it("returns false for whitespace-only fields", () => {
			expect(validateDeliveryAddress({
				line1: "  ",
				city: "Springfield",
				state: "IL",
				zip: "62701",
			})).toBe(false);
		});
	});

	describe("validateNewCard", () => {
		it("returns true for complete card", () => {
			expect(validateNewCard({
				number: "4242424242424242",
				expiry: "12/28",
				cvv: "123",
			})).toBe(true);
		});

		it("returns false for empty number", () => {
			expect(validateNewCard({
				number: "",
				expiry: "12/28",
				cvv: "123",
			})).toBe(false);
		});

		it("returns false for empty expiry", () => {
			expect(validateNewCard({
				number: "4242424242424242",
				expiry: "",
				cvv: "123",
			})).toBe(false);
		});

		it("returns false for empty cvv", () => {
			expect(validateNewCard({
				number: "4242424242424242",
				expiry: "12/28",
				cvv: "",
			})).toBe(false);
		});
	});
});
