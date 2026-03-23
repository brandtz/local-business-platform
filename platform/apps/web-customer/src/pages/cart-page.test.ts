import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PricingQuote } from "@platform/types";
import {
	formatCents,
	recalculateQuoteTotals,
} from "./cart-page";

function buildEmptyQuote(): PricingQuote {
	return {
		lineItems: [],
		subtotalCents: 0,
		discountCents: 0,
		taxCents: 0,
		tipCents: 0,
		deliveryFeeCents: 0,
		totalCents: 0,
	};
}

describe("cart-page helpers", () => {
	describe("formatCents", () => {
		it("formats zero", () => {
			expect(formatCents(0)).toBe("$0.00");
		});
		it("formats whole dollars", () => {
			expect(formatCents(2500)).toBe("$25.00");
		});
		it("formats cents", () => {
			expect(formatCents(999)).toBe("$9.99");
		});
	});

	describe("recalculateQuoteTotals", () => {
		it("recalculates subtotal from line items", () => {
			const quote: PricingQuote = {
				...buildEmptyQuote(),
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						itemName: "Burger",
						quantity: 2,
						unitPriceCents: 1000,
						modifiersTotalCents: 0,
						lineTotalCents: 2000,
						isStalePrice: false,
					},
					{
						cartItemId: "ci-2",
						catalogItemId: "item-2",
						itemName: "Fries",
						quantity: 1,
						unitPriceCents: 500,
						modifiersTotalCents: 0,
						lineTotalCents: 500,
						isStalePrice: false,
					},
				],
				taxCents: 200,
			};
			const result = recalculateQuoteTotals(quote);
			expect(result.subtotalCents).toBe(2500);
			expect(result.totalCents).toBe(2700);
		});

		it("includes delivery fee and tip in total", () => {
			const quote: PricingQuote = {
				...buildEmptyQuote(),
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						itemName: "Pizza",
						quantity: 1,
						unitPriceCents: 1500,
						modifiersTotalCents: 0,
						lineTotalCents: 1500,
						isStalePrice: false,
					},
				],
				taxCents: 100,
				deliveryFeeCents: 300,
				tipCents: 200,
				discountCents: 50,
			};
			const result = recalculateQuoteTotals(quote);
			expect(result.subtotalCents).toBe(1500);
			// 1500 + 100 + 300 + 200 - 50 = 2050
			expect(result.totalCents).toBe(2050);
		});

		it("handles empty line items", () => {
			const result = recalculateQuoteTotals(buildEmptyQuote());
			expect(result.subtotalCents).toBe(0);
			expect(result.totalCents).toBe(0);
		});
	});
});
