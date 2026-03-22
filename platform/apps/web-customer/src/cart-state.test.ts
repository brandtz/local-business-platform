import { describe, expect, it } from "vitest";
import type { CartResponse, CheckoutStepperData, PricingQuote } from "@platform/types";
import {
	applyCartResponse,
	applyStepperData,
	canAdvanceToStep,
	createInitialCartState,
	getCartItemCount,
	getStaleItems,
	hasStaleItems,
	isCartEmpty,
	setCartError,
	setCartLoading,
	type CartState
} from "./cart-state";

function buildEmptyQuote(): PricingQuote {
	return {
		lineItems: [],
		subtotalCents: 0,
		discountCents: 0,
		taxCents: 0,
		tipCents: 0,
		deliveryFeeCents: 0,
		totalCents: 0
	};
}

function buildCartResponse(
	overrides: Partial<CartResponse> = {}
): CartResponse {
	return {
		sessionId: "session-1",
		tenantId: "tenant-1",
		fulfillmentMode: "pickup",
		deliveryAddress: null,
		orderNotes: null,
		promoCode: null,
		loyaltyCode: null,
		items: [],
		quote: buildEmptyQuote(),
		...overrides
	};
}

describe("cart-state", () => {
	describe("createInitialCartState", () => {
		it("returns default cart state", () => {
			const state = createInitialCartState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
			expect(state.sessionId).toBeNull();
			expect(state.items).toHaveLength(0);
			expect(state.quote).toBeNull();
			expect(state.fulfillmentMode).toBe("pickup");
		});
	});

	describe("applyCartResponse", () => {
		it("updates state from server response", () => {
			const initial = createInitialCartState();
			const response = buildCartResponse({
				sessionId: "session-42",
				items: [
					{
						id: "ci-1",
						catalogItemId: "item-1",
						catalogItemName: "Burger",
						variantId: null,
						variantName: null,
						quantity: 2,
						addedPriceCents: 1000,
						modifiers: []
					}
				],
				quote: {
					...buildEmptyQuote(),
					subtotalCents: 2000,
					totalCents: 2000,
					lineItems: [
						{
							cartItemId: "ci-1",
							catalogItemId: "item-1",
							itemName: "Burger",
							quantity: 2,
							unitPriceCents: 1000,
							modifiersTotalCents: 0,
							lineTotalCents: 2000,
							isStalePrice: false
						}
					]
				}
			});

			const state = applyCartResponse(initial, response);
			expect(state.sessionId).toBe("session-42");
			expect(state.items).toHaveLength(1);
			expect(state.quote?.subtotalCents).toBe(2000);
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
		});

		it("preserves server-computed totals without local calculation", () => {
			const initial = createInitialCartState();
			const response = buildCartResponse({
				quote: {
					...buildEmptyQuote(),
					subtotalCents: 5000,
					discountCents: 500,
					taxCents: 394,
					tipCents: 900,
					deliveryFeeCents: 399,
					totalCents: 6293
				}
			});

			const state = applyCartResponse(initial, response);
			expect(state.quote?.totalCents).toBe(6293);
		});
	});

	describe("setCartLoading / setCartError", () => {
		it("sets loading state", () => {
			const state = setCartLoading(createInitialCartState());
			expect(state.isLoading).toBe(true);
			expect(state.error).toBeNull();
		});

		it("sets error state", () => {
			const state = setCartError(
				createInitialCartState(),
				"Network error"
			);
			expect(state.isLoading).toBe(false);
			expect(state.error).toBe("Network error");
		});
	});

	describe("selectors", () => {
		it("counts items by quantity", () => {
			const state: CartState = {
				...createInitialCartState(),
				items: [
					{
						id: "ci-1",
						catalogItemId: "item-1",
						catalogItemName: "Burger",
						variantId: null,
						variantName: null,
						quantity: 2,
						addedPriceCents: 1000,
						modifiers: []
					},
					{
						id: "ci-2",
						catalogItemId: "item-2",
						catalogItemName: "Fries",
						variantId: null,
						variantName: null,
						quantity: 3,
						addedPriceCents: 500,
						modifiers: []
					}
				]
			};
			expect(getCartItemCount(state)).toBe(5);
		});

		it("detects empty cart", () => {
			expect(isCartEmpty(createInitialCartState())).toBe(true);
		});

		it("detects non-empty cart", () => {
			const state: CartState = {
				...createInitialCartState(),
				items: [
					{
						id: "ci-1",
						catalogItemId: "item-1",
						catalogItemName: "Burger",
						variantId: null,
						variantName: null,
						quantity: 1,
						addedPriceCents: 1000,
						modifiers: []
					}
				]
			};
			expect(isCartEmpty(state)).toBe(false);
		});

		it("detects stale items", () => {
			const state: CartState = {
				...createInitialCartState(),
				quote: {
					...buildEmptyQuote(),
					lineItems: [
						{
							cartItemId: "ci-1",
							catalogItemId: "item-1",
							itemName: "Burger",
							quantity: 1,
							unitPriceCents: 1200,
							modifiersTotalCents: 0,
							lineTotalCents: 1200,
							isStalePrice: true
						},
						{
							cartItemId: "ci-2",
							catalogItemId: "item-2",
							itemName: "Fries",
							quantity: 1,
							unitPriceCents: 500,
							modifiersTotalCents: 0,
							lineTotalCents: 500,
							isStalePrice: false
						}
					]
				}
			};
			expect(hasStaleItems(state)).toBe(true);
			expect(getStaleItems(state)).toEqual(["ci-1"]);
		});
	});

	describe("stepper navigation", () => {
		it("allows advance to fulfillment when cart has items", () => {
			const state: CartState = {
				...createInitialCartState(),
				items: [
					{
						id: "ci-1",
						catalogItemId: "item-1",
						catalogItemName: "Burger",
						variantId: null,
						variantName: null,
						quantity: 1,
						addedPriceCents: 1000,
						modifiers: []
					}
				],
				quote: buildEmptyQuote()
			};
			expect(canAdvanceToStep("cart", "fulfillment", state)).toBe(true);
		});

		it("blocks advance to fulfillment when cart is empty", () => {
			const state = createInitialCartState();
			expect(canAdvanceToStep("cart", "fulfillment", state)).toBe(false);
		});

		it("blocks advance to fulfillment when stale items exist", () => {
			const state: CartState = {
				...createInitialCartState(),
				items: [
					{
						id: "ci-1",
						catalogItemId: "item-1",
						catalogItemName: "Burger",
						variantId: null,
						variantName: null,
						quantity: 1,
						addedPriceCents: 1000,
						modifiers: []
					}
				],
				quote: {
					...buildEmptyQuote(),
					lineItems: [
						{
							cartItemId: "ci-1",
							catalogItemId: "item-1",
							itemName: "Burger",
							quantity: 1,
							unitPriceCents: 1200,
							modifiersTotalCents: 0,
							lineTotalCents: 1200,
							isStalePrice: true
						}
					]
				}
			};
			expect(canAdvanceToStep("cart", "fulfillment", state)).toBe(false);
		});

		it("allows advance to payment with pickup fulfillment", () => {
			const state: CartState = {
				...createInitialCartState(),
				fulfillmentMode: "pickup",
				items: [
					{
						id: "ci-1",
						catalogItemId: "item-1",
						catalogItemName: "Burger",
						variantId: null,
						variantName: null,
						quantity: 1,
						addedPriceCents: 1000,
						modifiers: []
					}
				],
				quote: buildEmptyQuote()
			};
			expect(
				canAdvanceToStep("fulfillment", "payment", state)
			).toBe(true);
		});

		it("blocks advance to payment with delivery but no address", () => {
			const state: CartState = {
				...createInitialCartState(),
				fulfillmentMode: "delivery",
				deliveryAddress: null,
				items: [
					{
						id: "ci-1",
						catalogItemId: "item-1",
						catalogItemName: "Burger",
						variantId: null,
						variantName: null,
						quantity: 1,
						addedPriceCents: 1000,
						modifiers: []
					}
				],
				quote: buildEmptyQuote()
			};
			expect(
				canAdvanceToStep("fulfillment", "payment", state)
			).toBe(false);
		});

		it("allows advance to payment with delivery and address", () => {
			const state: CartState = {
				...createInitialCartState(),
				fulfillmentMode: "delivery",
				deliveryAddress: {
					line1: "123 Main St",
					line2: null,
					city: "Springfield",
					state: "IL",
					zip: "62701"
				},
				items: [
					{
						id: "ci-1",
						catalogItemId: "item-1",
						catalogItemName: "Burger",
						variantId: null,
						variantName: null,
						quantity: 1,
						addedPriceCents: 1000,
						modifiers: []
					}
				],
				quote: buildEmptyQuote()
			};
			expect(
				canAdvanceToStep("fulfillment", "payment", state)
			).toBe(true);
		});

		it("allows navigating backward always", () => {
			const state = createInitialCartState();
			expect(canAdvanceToStep("payment", "cart", state)).toBe(true);
			expect(canAdvanceToStep("fulfillment", "cart", state)).toBe(true);
			expect(canAdvanceToStep("payment", "fulfillment", state)).toBe(true);
		});
	});

	describe("applyStepperData", () => {
		it("stores stepper data in state", () => {
			const state = createInitialCartState();
			const data: CheckoutStepperData = {
				cart: { items: [], quote: buildEmptyQuote() },
				fulfillment: {
					fulfillmentMode: "pickup",
					deliveryAddress: null
				},
				payment: {
					subtotalCents: 0,
					discountCents: 0,
					taxCents: 0,
					tipCents: 0,
					deliveryFeeCents: 0,
					totalCents: 0,
					promoCode: null,
					loyaltyCode: null,
					orderNotes: null
				}
			};

			const updated = applyStepperData(state, data);
			expect(updated.stepperData).toBeDefined();
			expect(updated.stepperData?.fulfillment.fulfillmentMode).toBe("pickup");
		});
	});
});
