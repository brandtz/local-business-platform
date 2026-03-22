import { describe, expect, it } from "vitest";
import type { PricingInput } from "@platform/types";
import { PricingEngineService } from "./pricing-engine.service";

function createEngine(): PricingEngineService {
	return new PricingEngineService();
}

describe("PricingEngineService", () => {
	// -----------------------------------------------------------------------
	// Subtotal calculations
	// -----------------------------------------------------------------------

	describe("subtotal calculations", () => {
		it("computes subtotal for a single item", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.subtotalCents).toBe(1000);
			expect(quote.totalCents).toBe(1000);
		});

		it("computes subtotal for multiple items", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 2
					},
					{
						cartItemId: "ci-2",
						catalogItemId: "item-2",
						currentPriceCents: 500,
						addedPriceCents: 500,
						modifiers: [],
						quantity: 3
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.subtotalCents).toBe(3500); // 2000 + 1500
		});

		it("includes modifier prices in line total", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [
							{ modifierOptionId: "opt-1", priceCents: 150 },
							{ modifierOptionId: "opt-2", priceCents: 200 }
						],
						quantity: 2
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			// (1000 + 150 + 200) * 2 = 2700
			expect(quote.subtotalCents).toBe(2700);
			expect(quote.lineItems[0].modifiersTotalCents).toBe(350);
		});
	});

	// -----------------------------------------------------------------------
	// Discount calculations
	// -----------------------------------------------------------------------

	describe("discount calculations", () => {
		it("applies percentage discount", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: {
					code: "SAVE10",
					type: "percentage",
					valueCents: 0,
					valuePercent: 10
				},
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.discountCents).toBe(100); // 10% of 1000
			expect(quote.totalCents).toBe(900);
		});

		it("applies fixed discount", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: {
					code: "SAVE5",
					type: "fixed",
					valueCents: 500,
					valuePercent: 0
				},
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.discountCents).toBe(500);
			expect(quote.totalCents).toBe(500);
		});

		it("caps fixed discount at subtotal", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 300,
						addedPriceCents: 300,
						modifiers: [],
						quantity: 1
					}
				],
				discount: {
					code: "BIG",
					type: "fixed",
					valueCents: 500,
					valuePercent: 0
				},
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.discountCents).toBe(300); // capped at subtotal
			expect(quote.totalCents).toBe(0);
		});

		it("rounds percentage discount down", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 999,
						addedPriceCents: 999,
						modifiers: [],
						quantity: 1
					}
				],
				discount: {
					code: "SAVE10",
					type: "percentage",
					valueCents: 0,
					valuePercent: 10
				},
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.discountCents).toBe(99); // floor(999 * 10 / 100) = 99
		});
	});

	// -----------------------------------------------------------------------
	// Tax calculations
	// -----------------------------------------------------------------------

	describe("tax calculations", () => {
		it("computes tax at 8.75% (875 basis points)", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 875 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.taxCents).toBe(88); // round(1000 * 875 / 10000) = 87.5 → 88
		});

		it("applies tax on post-discount amount", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: {
					code: "SAVE50",
					type: "fixed",
					valueCents: 500,
					valuePercent: 0
				},
				taxPolicy: { rateBasisPoints: 1000 }, // 10%
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.taxCents).toBe(50); // 10% of (1000 - 500)
		});

		it("returns zero tax when rate is zero", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.taxCents).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// Tip calculations
	// -----------------------------------------------------------------------

	describe("tip calculations", () => {
		it("computes percentage tip", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 2000,
						addedPriceCents: 2000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: { type: "percentage", percentage: 18, customAmountCents: 0 },
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.tipCents).toBe(360); // 18% of 2000
		});

		it("computes custom tip amount", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 2000,
						addedPriceCents: 2000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: { type: "custom", percentage: 0, customAmountCents: 500 },
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.tipCents).toBe(500);
		});

		it("returns zero tip when null", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.tipCents).toBe(0);
		});

		it("preset tip percentages produce expected values", () => {
			const engine = createEngine();
			const subtotal = 5000;

			for (const pct of [15, 18, 20]) {
				const input: PricingInput = {
					lineItems: [
						{
							cartItemId: "ci-1",
							catalogItemId: "item-1",
							currentPriceCents: subtotal,
							addedPriceCents: subtotal,
							modifiers: [],
							quantity: 1
						}
					],
					discount: null,
					taxPolicy: { rateBasisPoints: 0 },
					tip: { type: "percentage", percentage: pct, customAmountCents: 0 },
					deliveryFee: null
				};

				const quote = engine.computeQuote(input);
				expect(quote.tipCents).toBe(
					Math.round((subtotal * pct) / 100)
				);
			}
		});
	});

	// -----------------------------------------------------------------------
	// Delivery fee
	// -----------------------------------------------------------------------

	describe("delivery fee", () => {
		it("adds delivery fee to total", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: { feeCents: 500 }
			};

			const quote = engine.computeQuote(input);
			expect(quote.deliveryFeeCents).toBe(500);
			expect(quote.totalCents).toBe(1500);
		});

		it("omits delivery fee when null", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.deliveryFeeCents).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// Stale price detection
	// -----------------------------------------------------------------------

	describe("stale price detection", () => {
		it("flags items with changed prices", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1200,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.lineItems[0].isStalePrice).toBe(true);
		});

		it("does not flag items with same price", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: null,
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.lineItems[0].isStalePrice).toBe(false);
		});
	});

	// -----------------------------------------------------------------------
	// Determinism
	// -----------------------------------------------------------------------

	describe("determinism", () => {
		it("produces identical output for identical input", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1599,
						addedPriceCents: 1599,
						modifiers: [
							{ modifierOptionId: "opt-1", priceCents: 250 }
						],
						quantity: 3
					},
					{
						cartItemId: "ci-2",
						catalogItemId: "item-2",
						currentPriceCents: 899,
						addedPriceCents: 899,
						modifiers: [],
						quantity: 1
					}
				],
				discount: {
					code: "SAVE10",
					type: "percentage",
					valueCents: 0,
					valuePercent: 10
				},
				taxPolicy: { rateBasisPoints: 875 },
				tip: { type: "percentage", percentage: 18, customAmountCents: 0 },
				deliveryFee: { feeCents: 399 }
			};

			const quote1 = engine.computeQuote(input);
			const quote2 = engine.computeQuote(input);
			expect(quote1).toStrictEqual(quote2);
		});

		it("produces identical output across engine instances", () => {
			const engine1 = createEngine();
			const engine2 = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 2500,
						addedPriceCents: 2500,
						modifiers: [
							{ modifierOptionId: "opt-1", priceCents: 100 },
							{ modifierOptionId: "opt-2", priceCents: 200 }
						],
						quantity: 2
					}
				],
				discount: {
					code: "FLAT5",
					type: "fixed",
					valueCents: 500,
					valuePercent: 0
				},
				taxPolicy: { rateBasisPoints: 600 },
				tip: { type: "custom", percentage: 0, customAmountCents: 350 },
				deliveryFee: { feeCents: 250 }
			};

			const quote1 = engine1.computeQuote(input);
			const quote2 = engine2.computeQuote(input);
			expect(quote1).toStrictEqual(quote2);
		});
	});

	// -----------------------------------------------------------------------
	// Edge cases
	// -----------------------------------------------------------------------

	describe("edge cases", () => {
		it("handles empty cart", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [],
				discount: null,
				taxPolicy: { rateBasisPoints: 875 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.subtotalCents).toBe(0);
			expect(quote.totalCents).toBe(0);
			expect(quote.lineItems).toHaveLength(0);
		});

		it("total never goes below zero", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 100,
						addedPriceCents: 100,
						modifiers: [],
						quantity: 1
					}
				],
				discount: {
					code: "HUGE",
					type: "fixed",
					valueCents: 100,
					valuePercent: 0
				},
				taxPolicy: { rateBasisPoints: 0 },
				tip: null,
				deliveryFee: null
			};

			const quote = engine.computeQuote(input);
			expect(quote.totalCents).toBeGreaterThanOrEqual(0);
		});

		it("handles full-value discount with delivery fee", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1000,
						addedPriceCents: 1000,
						modifiers: [],
						quantity: 1
					}
				],
				discount: {
					code: "FREE",
					type: "percentage",
					valueCents: 0,
					valuePercent: 100
				},
				taxPolicy: { rateBasisPoints: 875 },
				tip: null,
				deliveryFee: { feeCents: 500 }
			};

			const quote = engine.computeQuote(input);
			expect(quote.discountCents).toBe(1000);
			expect(quote.taxCents).toBe(0); // no tax on zero taxable amount
			expect(quote.deliveryFeeCents).toBe(500);
			expect(quote.totalCents).toBe(500); // only delivery fee
		});

		it("computes complete scenario with all components", () => {
			const engine = createEngine();
			const input: PricingInput = {
				lineItems: [
					{
						cartItemId: "ci-1",
						catalogItemId: "item-1",
						currentPriceCents: 1500,
						addedPriceCents: 1500,
						modifiers: [
							{ modifierOptionId: "opt-1", priceCents: 200 }
						],
						quantity: 2
					},
					{
						cartItemId: "ci-2",
						catalogItemId: "item-2",
						currentPriceCents: 800,
						addedPriceCents: 800,
						modifiers: [],
						quantity: 1
					}
				],
				discount: {
					code: "SAVE10",
					type: "percentage",
					valueCents: 0,
					valuePercent: 10
				},
				taxPolicy: { rateBasisPoints: 875 },
				tip: { type: "percentage", percentage: 15, customAmountCents: 0 },
				deliveryFee: { feeCents: 399 }
			};

			const quote = engine.computeQuote(input);

			// Line 1: (1500 + 200) * 2 = 3400
			expect(quote.lineItems[0].lineTotalCents).toBe(3400);
			// Line 2: 800 * 1 = 800
			expect(quote.lineItems[1].lineTotalCents).toBe(800);
			// Subtotal: 3400 + 800 = 4200
			expect(quote.subtotalCents).toBe(4200);
			// Discount: floor(4200 * 10 / 100) = 420
			expect(quote.discountCents).toBe(420);
			// Tax: round((4200 - 420) * 875 / 10000) = round(3780 * 875 / 10000) = round(330.75) = 331
			expect(quote.taxCents).toBe(331);
			// Tip: round(4200 * 15 / 100) = 630
			expect(quote.tipCents).toBe(630);
			// Delivery fee: 399
			expect(quote.deliveryFeeCents).toBe(399);
			// Total: 4200 - 420 + 331 + 630 + 399 = 5140
			expect(quote.totalCents).toBe(5140);
		});
	});
});
