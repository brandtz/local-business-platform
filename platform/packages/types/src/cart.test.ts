import { describe, expect, it } from "vitest";
import {
	isValidDiscountType,
	isValidFulfillmentMode,
	isValidQuantity,
	type AddCartItemRequest,
	type CartSessionRecord,
	type CheckoutStepperData,
	type PricingInput,
	type PricingQuote,
	type PromoCodeValidationResult,
	type LoyaltyCodeValidationResult,
	type SetFulfillmentRequest,
	type SetTipRequest
} from "./cart";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

describe("isValidFulfillmentMode", () => {
	it("accepts delivery", () => {
		expect(isValidFulfillmentMode("delivery")).toBe(true);
	});

	it("accepts pickup", () => {
		expect(isValidFulfillmentMode("pickup")).toBe(true);
	});

	it("rejects unknown mode", () => {
		expect(isValidFulfillmentMode("ship")).toBe(false);
	});
});

describe("isValidDiscountType", () => {
	it("accepts percentage", () => {
		expect(isValidDiscountType("percentage")).toBe(true);
	});

	it("accepts fixed", () => {
		expect(isValidDiscountType("fixed")).toBe(true);
	});

	it("rejects unknown type", () => {
		expect(isValidDiscountType("bogo")).toBe(false);
	});
});

describe("isValidQuantity", () => {
	it("accepts positive integers", () => {
		expect(isValidQuantity(1)).toBe(true);
		expect(isValidQuantity(10)).toBe(true);
	});

	it("rejects zero", () => {
		expect(isValidQuantity(0)).toBe(false);
	});

	it("rejects negative numbers", () => {
		expect(isValidQuantity(-1)).toBe(false);
	});

	it("rejects non-integers", () => {
		expect(isValidQuantity(1.5)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Cart session record shape
// ---------------------------------------------------------------------------

describe("CartSessionRecord type", () => {
	it("constructs a valid session record", () => {
		const session: CartSessionRecord = {
			createdAt: "2026-01-01T00:00:00.000Z",
			customerId: "customer-1",
			fulfillmentMode: "pickup",
			deliveryAddressLine1: null,
			deliveryAddressLine2: null,
			deliveryCity: null,
			deliveryState: null,
			deliveryZip: null,
			id: "session-1",
			orderNotes: null,
			promoCode: null,
			loyaltyCode: null,
			tenantId: "tenant-1",
			updatedAt: "2026-01-01T00:00:00.000Z"
		};
		expect(session.tenantId).toBe("tenant-1");
		expect(session.fulfillmentMode).toBe("pickup");
	});

	it("supports delivery fulfillment with address", () => {
		const session: CartSessionRecord = {
			createdAt: "2026-01-01T00:00:00.000Z",
			customerId: "customer-1",
			fulfillmentMode: "delivery",
			deliveryAddressLine1: "123 Main St",
			deliveryAddressLine2: "Apt 4B",
			deliveryCity: "Springfield",
			deliveryState: "IL",
			deliveryZip: "62701",
			id: "session-2",
			orderNotes: "Leave at door",
			promoCode: "SAVE10",
			loyaltyCode: null,
			tenantId: "tenant-1",
			updatedAt: "2026-01-01T00:00:00.000Z"
		};
		expect(session.fulfillmentMode).toBe("delivery");
		expect(session.deliveryAddressLine1).toBe("123 Main St");
		expect(session.orderNotes).toBe("Leave at door");
	});
});

// ---------------------------------------------------------------------------
// Pricing input and quote types
// ---------------------------------------------------------------------------

describe("PricingInput type", () => {
	it("constructs a complete pricing input", () => {
		const input: PricingInput = {
			lineItems: [
				{
					cartItemId: "ci-1",
					catalogItemId: "item-1",
					currentPriceCents: 1000,
					addedPriceCents: 1000,
					modifiers: [{ modifierOptionId: "opt-1", priceCents: 150 }],
					quantity: 2
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
			deliveryFee: { feeCents: 500 }
		};

		expect(input.lineItems).toHaveLength(1);
		expect(input.discount?.type).toBe("percentage");
		expect(input.taxPolicy.rateBasisPoints).toBe(875);
	});

	it("allows null discount, tip, and delivery fee", () => {
		const input: PricingInput = {
			lineItems: [],
			discount: null,
			taxPolicy: { rateBasisPoints: 0 },
			tip: null,
			deliveryFee: null
		};
		expect(input.discount).toBeNull();
		expect(input.tip).toBeNull();
		expect(input.deliveryFee).toBeNull();
	});
});

describe("PricingQuote type", () => {
	it("constructs a complete quote", () => {
		const quote: PricingQuote = {
			lineItems: [
				{
					cartItemId: "ci-1",
					catalogItemId: "item-1",
					itemName: "Burger",
					quantity: 2,
					unitPriceCents: 1000,
					modifiersTotalCents: 150,
					lineTotalCents: 2300,
					isStalePrice: false
				}
			],
			subtotalCents: 2300,
			discountCents: 230,
			taxCents: 181,
			tipCents: 414,
			deliveryFeeCents: 500,
			totalCents: 3165
		};

		expect(quote.subtotalCents).toBe(2300);
		expect(quote.lineItems[0].isStalePrice).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Cart API request / response types
// ---------------------------------------------------------------------------

describe("Cart API request types", () => {
	it("constructs AddCartItemRequest", () => {
		const req: AddCartItemRequest = {
			catalogItemId: "item-1",
			quantity: 2,
			modifierOptionIds: ["opt-1", "opt-2"]
		};
		expect(req.quantity).toBe(2);
	});

	it("constructs SetFulfillmentRequest for delivery", () => {
		const req: SetFulfillmentRequest = {
			fulfillmentMode: "delivery",
			deliveryAddress: {
				line1: "123 Main St",
				city: "Springfield",
				state: "IL",
				zip: "62701"
			}
		};
		expect(req.fulfillmentMode).toBe("delivery");
		expect(req.deliveryAddress?.line1).toBe("123 Main St");
	});

	it("constructs SetTipRequest for percentage", () => {
		const req: SetTipRequest = {
			type: "percentage",
			percentage: 18
		};
		expect(req.type).toBe("percentage");
	});

	it("constructs SetTipRequest for custom amount", () => {
		const req: SetTipRequest = {
			type: "custom",
			customAmountCents: 500
		};
		expect(req.customAmountCents).toBe(500);
	});
});

// ---------------------------------------------------------------------------
// Checkout stepper data contract
// ---------------------------------------------------------------------------

describe("CheckoutStepperData type", () => {
	it("constructs full 3-step stepper data", () => {
		const data: CheckoutStepperData = {
			cart: {
				items: [],
				quote: {
					lineItems: [],
					subtotalCents: 0,
					discountCents: 0,
					taxCents: 0,
					tipCents: 0,
					deliveryFeeCents: 0,
					totalCents: 0
				}
			},
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

		expect(data.cart.items).toHaveLength(0);
		expect(data.fulfillment.fulfillmentMode).toBe("pickup");
		expect(data.payment.totalCents).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Promo / loyalty code validation types
// ---------------------------------------------------------------------------

describe("PromoCodeValidationResult type", () => {
	it("constructs valid result with discount", () => {
		const result: PromoCodeValidationResult = {
			status: "valid",
			discount: {
				code: "SAVE10",
				type: "percentage",
				valueCents: 0,
				valuePercent: 10
			}
		};
		expect(result.status).toBe("valid");
		expect(result.discount?.valuePercent).toBe(10);
	});

	it("constructs invalid result", () => {
		const result: PromoCodeValidationResult = {
			status: "invalid",
			discount: null
		};
		expect(result.status).toBe("invalid");
	});
});

describe("LoyaltyCodeValidationResult type", () => {
	it("constructs valid result with discount", () => {
		const result: LoyaltyCodeValidationResult = {
			status: "valid",
			discount: {
				code: "LOYALTY",
				type: "fixed",
				valueCents: 500,
				valuePercent: 0
			}
		};
		expect(result.status).toBe("valid");
		expect(result.discount?.valueCents).toBe(500);
	});

	it("constructs insufficient-balance result", () => {
		const result: LoyaltyCodeValidationResult = {
			status: "insufficient-balance",
			discount: null
		};
		expect(result.status).toBe("insufficient-balance");
	});
});
