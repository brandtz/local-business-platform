import type {
	CartItemResponse,
	CartResponse,
	CheckoutStepperData,
	FulfillmentMode,
	PricingQuote
} from "@platform/types";

// ---------------------------------------------------------------------------
// Storefront cart state — server-trusted totals only
// ---------------------------------------------------------------------------
// The cart state is derived entirely from backend responses. The client
// NEVER computes prices, totals, or discounts locally. Every mutation
// (add, update, remove, fulfillment change, promo code, tip, notes)
// calls the backend and replaces local state with the server response.
// ---------------------------------------------------------------------------

export type CartState = {
	isLoading: boolean;
	error: string | null;
	sessionId: string | null;
	items: CartItemResponse[];
	quote: PricingQuote | null;
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
	stepperData: CheckoutStepperData | null;
};

export function createInitialCartState(): CartState {
	return {
		isLoading: false,
		error: null,
		sessionId: null,
		items: [],
		quote: null,
		fulfillmentMode: "pickup",
		deliveryAddress: null,
		orderNotes: null,
		promoCode: null,
		loyaltyCode: null,
		stepperData: null
	};
}

// ---------------------------------------------------------------------------
// Cart state update — always from server response
// ---------------------------------------------------------------------------

export function applyCartResponse(
	state: CartState,
	response: CartResponse
): CartState {
	return {
		...state,
		isLoading: false,
		error: null,
		sessionId: response.sessionId,
		items: response.items,
		quote: response.quote,
		fulfillmentMode: response.fulfillmentMode,
		deliveryAddress: response.deliveryAddress,
		orderNotes: response.orderNotes,
		promoCode: response.promoCode,
		loyaltyCode: response.loyaltyCode
	};
}

export function applyStepperData(
	state: CartState,
	data: CheckoutStepperData
): CartState {
	return {
		...state,
		stepperData: data
	};
}

export function setCartLoading(state: CartState): CartState {
	return { ...state, isLoading: true, error: null };
}

export function setCartError(state: CartState, error: string): CartState {
	return { ...state, isLoading: false, error };
}

// ---------------------------------------------------------------------------
// Derived selectors (read-only, no computation of prices)
// ---------------------------------------------------------------------------

export function getCartItemCount(state: CartState): number {
	return state.items.reduce((total, item) => total + item.quantity, 0);
}

export function isCartEmpty(state: CartState): boolean {
	return state.items.length === 0;
}

export function hasStaleItems(state: CartState): boolean {
	if (!state.quote) return false;
	return state.quote.lineItems.some((li) => li.isStalePrice);
}

export function getStaleItems(state: CartState): string[] {
	if (!state.quote) return [];
	return state.quote.lineItems
		.filter((li) => li.isStalePrice)
		.map((li) => li.cartItemId);
}

// ---------------------------------------------------------------------------
// Stepper helpers
// ---------------------------------------------------------------------------

export type CheckoutStep = "cart" | "fulfillment" | "payment";

export const checkoutSteps: CheckoutStep[] = [
	"cart",
	"fulfillment",
	"payment"
];

export function canAdvanceToStep(
	currentStep: CheckoutStep,
	targetStep: CheckoutStep,
	state: CartState
): boolean {
	const currentIndex = checkoutSteps.indexOf(currentStep);
	const targetIndex = checkoutSteps.indexOf(targetStep);

	if (targetIndex <= currentIndex) return true;

	if (targetStep === "fulfillment") {
		return !isCartEmpty(state) && !hasStaleItems(state);
	}

	if (targetStep === "payment") {
		return (
			!isCartEmpty(state) &&
			!hasStaleItems(state) &&
			(state.fulfillmentMode === "pickup" || state.deliveryAddress !== null)
		);
	}

	return false;
}
