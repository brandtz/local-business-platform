import {
	fulfillmentModes,
	isValidQuantity,
	type AddCartItemRequest,
	type ApplyLoyaltyCodeRequest,
	type ApplyPromoCodeRequest,
	type SetFulfillmentRequest,
	type SetOrderNotesRequest,
	type SetTipRequest,
	type UpdateCartItemRequest
} from "@platform/types";

// ---------------------------------------------------------------------------
// Contract validation error
// ---------------------------------------------------------------------------

export class CartApiContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CartApiContractError";
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Add item contract
// ---------------------------------------------------------------------------

export function assertValidAddCartItemRequest(
	payload: unknown
): asserts payload is AddCartItemRequest {
	if (!isRecord(payload)) {
		throw new CartApiContractError("Add cart item payload must be an object.");
	}
	if (!isNonEmptyString(payload.catalogItemId)) {
		throw new CartApiContractError(
			"Add cart item payload requires a non-empty catalogItemId."
		);
	}
	if (typeof payload.quantity !== "number" || !isValidQuantity(payload.quantity)) {
		throw new CartApiContractError(
			"Add cart item quantity must be a positive integer."
		);
	}
	if (
		payload.variantId !== undefined &&
		!isNonEmptyString(payload.variantId)
	) {
		throw new CartApiContractError(
			"Add cart item variantId must be a non-empty string when provided."
		);
	}
	if (payload.modifierOptionIds !== undefined) {
		if (!Array.isArray(payload.modifierOptionIds)) {
			throw new CartApiContractError(
				"Add cart item modifierOptionIds must be an array when provided."
			);
		}
		for (let i = 0; i < payload.modifierOptionIds.length; i++) {
			if (!isNonEmptyString(payload.modifierOptionIds[i])) {
				throw new CartApiContractError(
					`Add cart item modifierOptionIds[${i}] must be a non-empty string.`
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Update item contract
// ---------------------------------------------------------------------------

export function assertValidUpdateCartItemRequest(
	payload: unknown
): asserts payload is UpdateCartItemRequest {
	if (!isRecord(payload)) {
		throw new CartApiContractError("Update cart item payload must be an object.");
	}
	if (
		payload.quantity !== undefined &&
		(typeof payload.quantity !== "number" || !isValidQuantity(payload.quantity))
	) {
		throw new CartApiContractError(
			"Update cart item quantity must be a positive integer when provided."
		);
	}
	if (payload.modifierOptionIds !== undefined) {
		if (!Array.isArray(payload.modifierOptionIds)) {
			throw new CartApiContractError(
				"Update cart item modifierOptionIds must be an array when provided."
			);
		}
		for (let i = 0; i < payload.modifierOptionIds.length; i++) {
			if (!isNonEmptyString(payload.modifierOptionIds[i])) {
				throw new CartApiContractError(
					`Update cart item modifierOptionIds[${i}] must be a non-empty string.`
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Fulfillment mode contract
// ---------------------------------------------------------------------------

export function assertValidSetFulfillmentRequest(
	payload: unknown
): asserts payload is SetFulfillmentRequest {
	if (!isRecord(payload)) {
		throw new CartApiContractError(
			"Set fulfillment payload must be an object."
		);
	}
	if (
		typeof payload.fulfillmentMode !== "string" ||
		!(fulfillmentModes as readonly string[]).includes(payload.fulfillmentMode)
	) {
		throw new CartApiContractError(
			"Set fulfillment payload requires a valid fulfillmentMode (delivery or pickup)."
		);
	}
	if (payload.fulfillmentMode === "delivery") {
		if (!isRecord(payload.deliveryAddress)) {
			throw new CartApiContractError(
				"Delivery fulfillment requires a deliveryAddress object."
			);
		}
		const addr = payload.deliveryAddress as Record<string, unknown>;
		if (!isNonEmptyString(addr.line1)) {
			throw new CartApiContractError(
				"Delivery address requires a non-empty line1."
			);
		}
		if (!isNonEmptyString(addr.city)) {
			throw new CartApiContractError(
				"Delivery address requires a non-empty city."
			);
		}
		if (!isNonEmptyString(addr.state)) {
			throw new CartApiContractError(
				"Delivery address requires a non-empty state."
			);
		}
		if (!isNonEmptyString(addr.zip)) {
			throw new CartApiContractError(
				"Delivery address requires a non-empty zip."
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Promo code contract
// ---------------------------------------------------------------------------

export function assertValidApplyPromoCodeRequest(
	payload: unknown
): asserts payload is ApplyPromoCodeRequest {
	if (!isRecord(payload)) {
		throw new CartApiContractError(
			"Apply promo code payload must be an object."
		);
	}
	if (!isNonEmptyString(payload.code)) {
		throw new CartApiContractError(
			"Apply promo code payload requires a non-empty code."
		);
	}
}

// ---------------------------------------------------------------------------
// Loyalty code contract
// ---------------------------------------------------------------------------

export function assertValidApplyLoyaltyCodeRequest(
	payload: unknown
): asserts payload is ApplyLoyaltyCodeRequest {
	if (!isRecord(payload)) {
		throw new CartApiContractError(
			"Apply loyalty code payload must be an object."
		);
	}
	if (!isNonEmptyString(payload.code)) {
		throw new CartApiContractError(
			"Apply loyalty code payload requires a non-empty code."
		);
	}
}

// ---------------------------------------------------------------------------
// Tip contract
// ---------------------------------------------------------------------------

export function assertValidSetTipRequest(
	payload: unknown
): asserts payload is SetTipRequest {
	if (!isRecord(payload)) {
		throw new CartApiContractError("Set tip payload must be an object.");
	}
	if (payload.type !== "percentage" && payload.type !== "custom") {
		throw new CartApiContractError(
			"Set tip payload type must be 'percentage' or 'custom'."
		);
	}
	if (payload.type === "percentage") {
		if (typeof payload.percentage !== "number" || payload.percentage < 0) {
			throw new CartApiContractError(
				"Set tip percentage must be a non-negative number."
			);
		}
	}
	if (payload.type === "custom") {
		if (
			typeof payload.customAmountCents !== "number" ||
			!Number.isInteger(payload.customAmountCents) ||
			payload.customAmountCents < 0
		) {
			throw new CartApiContractError(
				"Set tip customAmountCents must be a non-negative integer."
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Order notes contract
// ---------------------------------------------------------------------------

export function assertValidSetOrderNotesRequest(
	payload: unknown
): asserts payload is SetOrderNotesRequest {
	if (!isRecord(payload)) {
		throw new CartApiContractError(
			"Set order notes payload must be an object."
		);
	}
	if (typeof payload.notes !== "string") {
		throw new CartApiContractError(
			"Set order notes payload requires a notes string."
		);
	}
}
