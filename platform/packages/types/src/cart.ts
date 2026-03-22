// ---------------------------------------------------------------------------
// Fulfillment modes
// ---------------------------------------------------------------------------

export const fulfillmentModes = ["delivery", "pickup"] as const;
export type FulfillmentMode = (typeof fulfillmentModes)[number];

// ---------------------------------------------------------------------------
// Discount types
// ---------------------------------------------------------------------------

export const discountTypes = ["percentage", "fixed"] as const;
export type DiscountType = (typeof discountTypes)[number];

// ---------------------------------------------------------------------------
// Cart session and item types (domain records)
// ---------------------------------------------------------------------------

export type CartSessionRecord = {
	createdAt: string;
	customerId: string | null;
	fulfillmentMode: FulfillmentMode;
	deliveryAddressLine1: string | null;
	deliveryAddressLine2: string | null;
	deliveryCity: string | null;
	deliveryState: string | null;
	deliveryZip: string | null;
	id: string;
	orderNotes: string | null;
	promoCode: string | null;
	loyaltyCode: string | null;
	tenantId: string;
	updatedAt: string;
};

export type CartItemRecord = {
	addedPriceCents: number;
	catalogItemId: string;
	catalogItemName: string;
	id: string;
	quantity: number;
	sessionId: string;
	variantId: string | null;
	variantName: string | null;
};

export type CartModifierRecord = {
	cartItemId: string;
	id: string;
	modifierName: string;
	modifierOptionId: string;
	priceCents: number;
};

// ---------------------------------------------------------------------------
// Pricing input types
// ---------------------------------------------------------------------------

export type PricingLineItemInput = {
	cartItemId: string;
	catalogItemId: string;
	currentPriceCents: number;
	addedPriceCents: number;
	modifiers: PricingModifierInput[];
	quantity: number;
};

export type PricingModifierInput = {
	modifierOptionId: string;
	priceCents: number;
};

export type DiscountInput = {
	code: string;
	type: DiscountType;
	valueCents: number;
	valuePercent: number;
};

export type TaxPolicyInput = {
	rateBasisPoints: number;
};

export type TipInput = {
	type: "percentage" | "custom";
	percentage: number;
	customAmountCents: number;
};

export type DeliveryFeeInput = {
	feeCents: number;
};

export type PricingInput = {
	lineItems: PricingLineItemInput[];
	discount: DiscountInput | null;
	taxPolicy: TaxPolicyInput;
	tip: TipInput | null;
	deliveryFee: DeliveryFeeInput | null;
};

// ---------------------------------------------------------------------------
// Pricing quote output types
// ---------------------------------------------------------------------------

export type PricingLineItemOutput = {
	cartItemId: string;
	catalogItemId: string;
	itemName: string;
	quantity: number;
	unitPriceCents: number;
	modifiersTotalCents: number;
	lineTotalCents: number;
	isStalePrice: boolean;
};

export type PricingQuote = {
	lineItems: PricingLineItemOutput[];
	subtotalCents: number;
	discountCents: number;
	taxCents: number;
	tipCents: number;
	deliveryFeeCents: number;
	totalCents: number;
};

// ---------------------------------------------------------------------------
// Cart API request types
// ---------------------------------------------------------------------------

export type AddCartItemRequest = {
	catalogItemId: string;
	variantId?: string;
	quantity: number;
	modifierOptionIds?: string[];
};

export type UpdateCartItemRequest = {
	quantity?: number;
	modifierOptionIds?: string[];
};

export type SetFulfillmentRequest = {
	fulfillmentMode: FulfillmentMode;
	deliveryAddress?: {
		line1: string;
		line2?: string;
		city: string;
		state: string;
		zip: string;
	};
};

export type ApplyPromoCodeRequest = {
	code: string;
};

export type ApplyLoyaltyCodeRequest = {
	code: string;
};

export type SetTipRequest = {
	type: "percentage" | "custom";
	percentage?: number;
	customAmountCents?: number;
};

export type SetOrderNotesRequest = {
	notes: string;
};

// ---------------------------------------------------------------------------
// Cart API response types
// ---------------------------------------------------------------------------

export type CartItemResponse = {
	id: string;
	catalogItemId: string;
	catalogItemName: string;
	variantId: string | null;
	variantName: string | null;
	quantity: number;
	addedPriceCents: number;
	modifiers: CartModifierResponse[];
};

export type CartModifierResponse = {
	id: string;
	modifierOptionId: string;
	modifierName: string;
	priceCents: number;
};

export type CartResponse = {
	sessionId: string;
	tenantId: string;
	fulfillmentMode: FulfillmentMode;
	deliveryAddress: {
		line1: string;
		line2: string | null;
		city: string;
		state: string;
		zip: string;
	} | null;
	orderNotes: string | null;
	promoCode: string | null;
	loyaltyCode: string | null;
	items: CartItemResponse[];
	quote: PricingQuote;
};

// ---------------------------------------------------------------------------
// 3-step stepper data contracts
// ---------------------------------------------------------------------------

export type CartStepData = {
	items: CartItemResponse[];
	quote: PricingQuote;
};

export type FulfillmentStepData = {
	fulfillmentMode: FulfillmentMode;
	deliveryAddress: {
		line1: string;
		line2: string | null;
		city: string;
		state: string;
		zip: string;
	} | null;
};

export type PaymentStepData = {
	subtotalCents: number;
	discountCents: number;
	taxCents: number;
	tipCents: number;
	deliveryFeeCents: number;
	totalCents: number;
	promoCode: string | null;
	loyaltyCode: string | null;
	orderNotes: string | null;
};

export type CheckoutStepperData = {
	cart: CartStepData;
	fulfillment: FulfillmentStepData;
	payment: PaymentStepData;
};

// ---------------------------------------------------------------------------
// Promo / loyalty code validation types
// ---------------------------------------------------------------------------

export const promoCodeStatuses = ["valid", "invalid", "expired", "already-used"] as const;
export type PromoCodeStatus = (typeof promoCodeStatuses)[number];

export const loyaltyCodeStatuses = ["valid", "invalid", "insufficient-balance"] as const;
export type LoyaltyCodeStatus = (typeof loyaltyCodeStatuses)[number];

export type PromoCodeValidationResult = {
	status: PromoCodeStatus;
	discount: DiscountInput | null;
};

export type LoyaltyCodeValidationResult = {
	status: LoyaltyCodeStatus;
	discount: DiscountInput | null;
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isValidFulfillmentMode(mode: string): mode is FulfillmentMode {
	return (fulfillmentModes as readonly string[]).includes(mode);
}

export function isValidDiscountType(type: string): type is DiscountType {
	return (discountTypes as readonly string[]).includes(type);
}

export function isValidQuantity(quantity: number): boolean {
	return Number.isInteger(quantity) && quantity > 0;
}
