import { describe, expect, it } from "vitest";
import {
	CartApiContractError,
	assertValidAddCartItemRequest,
	assertValidUpdateCartItemRequest,
	assertValidSetFulfillmentRequest,
	assertValidApplyPromoCodeRequest,
	assertValidApplyLoyaltyCodeRequest,
	assertValidSetTipRequest,
	assertValidSetOrderNotesRequest
} from "./cart-api-contracts";

// ---------------------------------------------------------------------------
// Add cart item contract
// ---------------------------------------------------------------------------

describe("assertValidAddCartItemRequest", () => {
	it("accepts valid payload", () => {
		expect(() =>
			assertValidAddCartItemRequest({
				catalogItemId: "item-1",
				quantity: 2
			})
		).not.toThrow();
	});

	it("accepts payload with optional fields", () => {
		expect(() =>
			assertValidAddCartItemRequest({
				catalogItemId: "item-1",
				quantity: 1,
				variantId: "var-1",
				modifierOptionIds: ["opt-1", "opt-2"]
			})
		).not.toThrow();
	});

	it("rejects non-object", () => {
		expect(() => assertValidAddCartItemRequest("string")).toThrow(
			CartApiContractError
		);
	});

	it("rejects missing catalogItemId", () => {
		expect(() =>
			assertValidAddCartItemRequest({ quantity: 1 })
		).toThrow(CartApiContractError);
	});

	it("rejects zero quantity", () => {
		expect(() =>
			assertValidAddCartItemRequest({
				catalogItemId: "item-1",
				quantity: 0
			})
		).toThrow(CartApiContractError);
	});

	it("rejects negative quantity", () => {
		expect(() =>
			assertValidAddCartItemRequest({
				catalogItemId: "item-1",
				quantity: -1
			})
		).toThrow(CartApiContractError);
	});

	it("rejects non-integer quantity", () => {
		expect(() =>
			assertValidAddCartItemRequest({
				catalogItemId: "item-1",
				quantity: 1.5
			})
		).toThrow(CartApiContractError);
	});

	it("rejects empty variantId", () => {
		expect(() =>
			assertValidAddCartItemRequest({
				catalogItemId: "item-1",
				quantity: 1,
				variantId: ""
			})
		).toThrow(CartApiContractError);
	});

	it("rejects non-array modifierOptionIds", () => {
		expect(() =>
			assertValidAddCartItemRequest({
				catalogItemId: "item-1",
				quantity: 1,
				modifierOptionIds: "not-array"
			})
		).toThrow(CartApiContractError);
	});

	it("rejects empty string in modifierOptionIds", () => {
		expect(() =>
			assertValidAddCartItemRequest({
				catalogItemId: "item-1",
				quantity: 1,
				modifierOptionIds: ["opt-1", ""]
			})
		).toThrow(CartApiContractError);
	});
});

// ---------------------------------------------------------------------------
// Update cart item contract
// ---------------------------------------------------------------------------

describe("assertValidUpdateCartItemRequest", () => {
	it("accepts valid payload with quantity", () => {
		expect(() =>
			assertValidUpdateCartItemRequest({ quantity: 3 })
		).not.toThrow();
	});

	it("accepts empty object (no updates)", () => {
		expect(() =>
			assertValidUpdateCartItemRequest({})
		).not.toThrow();
	});

	it("rejects non-object", () => {
		expect(() => assertValidUpdateCartItemRequest(null)).toThrow(
			CartApiContractError
		);
	});

	it("rejects zero quantity", () => {
		expect(() =>
			assertValidUpdateCartItemRequest({ quantity: 0 })
		).toThrow(CartApiContractError);
	});
});

// ---------------------------------------------------------------------------
// Set fulfillment contract
// ---------------------------------------------------------------------------

describe("assertValidSetFulfillmentRequest", () => {
	it("accepts pickup fulfillment", () => {
		expect(() =>
			assertValidSetFulfillmentRequest({
				fulfillmentMode: "pickup"
			})
		).not.toThrow();
	});

	it("accepts delivery with address", () => {
		expect(() =>
			assertValidSetFulfillmentRequest({
				fulfillmentMode: "delivery",
				deliveryAddress: {
					line1: "123 Main St",
					city: "Springfield",
					state: "IL",
					zip: "62701"
				}
			})
		).not.toThrow();
	});

	it("rejects invalid fulfillment mode", () => {
		expect(() =>
			assertValidSetFulfillmentRequest({
				fulfillmentMode: "ship"
			})
		).toThrow(CartApiContractError);
	});

	it("rejects delivery without address", () => {
		expect(() =>
			assertValidSetFulfillmentRequest({
				fulfillmentMode: "delivery"
			})
		).toThrow(CartApiContractError);
	});

	it("rejects delivery with incomplete address", () => {
		expect(() =>
			assertValidSetFulfillmentRequest({
				fulfillmentMode: "delivery",
				deliveryAddress: {
					line1: "123 Main St"
				}
			})
		).toThrow(CartApiContractError);
	});

	it("rejects non-object", () => {
		expect(() => assertValidSetFulfillmentRequest("pickup")).toThrow(
			CartApiContractError
		);
	});
});

// ---------------------------------------------------------------------------
// Promo code contract
// ---------------------------------------------------------------------------

describe("assertValidApplyPromoCodeRequest", () => {
	it("accepts valid code", () => {
		expect(() =>
			assertValidApplyPromoCodeRequest({ code: "SAVE10" })
		).not.toThrow();
	});

	it("rejects empty code", () => {
		expect(() =>
			assertValidApplyPromoCodeRequest({ code: "" })
		).toThrow(CartApiContractError);
	});

	it("rejects missing code", () => {
		expect(() =>
			assertValidApplyPromoCodeRequest({})
		).toThrow(CartApiContractError);
	});

	it("rejects non-object", () => {
		expect(() =>
			assertValidApplyPromoCodeRequest("SAVE10")
		).toThrow(CartApiContractError);
	});
});

// ---------------------------------------------------------------------------
// Loyalty code contract
// ---------------------------------------------------------------------------

describe("assertValidApplyLoyaltyCodeRequest", () => {
	it("accepts valid code", () => {
		expect(() =>
			assertValidApplyLoyaltyCodeRequest({ code: "LOYALTY123" })
		).not.toThrow();
	});

	it("rejects empty code", () => {
		expect(() =>
			assertValidApplyLoyaltyCodeRequest({ code: "" })
		).toThrow(CartApiContractError);
	});

	it("rejects non-object", () => {
		expect(() =>
			assertValidApplyLoyaltyCodeRequest(42)
		).toThrow(CartApiContractError);
	});
});

// ---------------------------------------------------------------------------
// Tip contract
// ---------------------------------------------------------------------------

describe("assertValidSetTipRequest", () => {
	it("accepts percentage tip", () => {
		expect(() =>
			assertValidSetTipRequest({ type: "percentage", percentage: 18 })
		).not.toThrow();
	});

	it("accepts custom tip", () => {
		expect(() =>
			assertValidSetTipRequest({ type: "custom", customAmountCents: 500 })
		).not.toThrow();
	});

	it("rejects invalid type", () => {
		expect(() =>
			assertValidSetTipRequest({ type: "auto" })
		).toThrow(CartApiContractError);
	});

	it("rejects negative percentage", () => {
		expect(() =>
			assertValidSetTipRequest({ type: "percentage", percentage: -5 })
		).toThrow(CartApiContractError);
	});

	it("rejects non-integer custom amount", () => {
		expect(() =>
			assertValidSetTipRequest({ type: "custom", customAmountCents: 5.5 })
		).toThrow(CartApiContractError);
	});

	it("rejects non-object", () => {
		expect(() => assertValidSetTipRequest(null)).toThrow(
			CartApiContractError
		);
	});
});

// ---------------------------------------------------------------------------
// Order notes contract
// ---------------------------------------------------------------------------

describe("assertValidSetOrderNotesRequest", () => {
	it("accepts valid notes", () => {
		expect(() =>
			assertValidSetOrderNotesRequest({ notes: "No onions please" })
		).not.toThrow();
	});

	it("accepts empty notes", () => {
		expect(() =>
			assertValidSetOrderNotesRequest({ notes: "" })
		).not.toThrow();
	});

	it("rejects missing notes", () => {
		expect(() =>
			assertValidSetOrderNotesRequest({})
		).toThrow(CartApiContractError);
	});

	it("rejects non-object", () => {
		expect(() =>
			assertValidSetOrderNotesRequest("notes")
		).toThrow(CartApiContractError);
	});
});
