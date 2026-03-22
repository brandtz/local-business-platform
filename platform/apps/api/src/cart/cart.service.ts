import { Injectable } from "@nestjs/common";
import type {
	AddCartItemRequest,
	CartItemRecord,
	CartItemResponse,
	CartModifierRecord,
	CartModifierResponse,
	CartResponse,
	CartSessionRecord,
	CheckoutStepperData,
	FulfillmentMode,
	PricingInput,
	PricingQuote,
	SetFulfillmentRequest,
	UpdateCartItemRequest
} from "@platform/types";

import { CartRepository } from "./cart.repository";
import { PricingEngineService } from "./pricing-engine.service";
import { PromoCodeService } from "./promo-code.service";
import { LoyaltyCodeService } from "./loyalty-code.service";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class CartNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CartNotFoundError";
	}
}

export class CartValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CartValidationError";
	}
}

export class CartStalePriceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CartStalePriceError";
	}
}

// ---------------------------------------------------------------------------
// Cart domain service
// ---------------------------------------------------------------------------

@Injectable()
export class CartService {
	constructor(
		private readonly repository: CartRepository = new CartRepository(),
		private readonly pricingEngine: PricingEngineService = new PricingEngineService(),
		private readonly promoCodeService: PromoCodeService = new PromoCodeService(),
		private readonly loyaltyCodeService: LoyaltyCodeService = new LoyaltyCodeService()
	) {}

	// -----------------------------------------------------------------------
	// Session management
	// -----------------------------------------------------------------------

	getOrCreateSession(
		tenantId: string,
		customerId: string | null
	): CartSessionRecord {
		const existing = this.repository.findSession(tenantId, customerId);
		if (existing) return existing;
		return this.repository.createSession(tenantId, customerId);
	}

	getSession(tenantId: string, sessionId: string): CartSessionRecord {
		const session = this.repository.getSessionById(tenantId, sessionId);
		if (!session) {
			throw new CartNotFoundError(`Cart session ${sessionId} not found.`);
		}
		return session;
	}

	// -----------------------------------------------------------------------
	// Item operations
	// -----------------------------------------------------------------------

	addItem(
		tenantId: string,
		sessionId: string,
		request: AddCartItemRequest,
		currentPriceCents: number,
		catalogItemName: string,
		variantName: string | null,
		modifierDetails: Array<{ optionId: string; name: string; priceCents: number }>
	): CartResponse {
		const session = this.getSession(tenantId, sessionId);

		const cartItem = this.repository.addItem(session.id, {
			catalogItemId: request.catalogItemId,
			catalogItemName,
			variantId: request.variantId ?? null,
			variantName,
			quantity: request.quantity,
			addedPriceCents: currentPriceCents
		});

		if (modifierDetails.length > 0) {
			for (const mod of modifierDetails) {
				this.repository.addModifier(cartItem.id, {
					modifierOptionId: mod.optionId,
					modifierName: mod.name,
					priceCents: mod.priceCents
				});
			}
		}

		return this.buildCartResponse(tenantId, sessionId);
	}

	updateItem(
		tenantId: string,
		sessionId: string,
		cartItemId: string,
		request: UpdateCartItemRequest,
		modifierDetails?: Array<{ optionId: string; name: string; priceCents: number }>
	): CartResponse {
		this.getSession(tenantId, sessionId);

		const item = this.repository.getItemById(sessionId, cartItemId);
		if (!item) {
			throw new CartNotFoundError(`Cart item ${cartItemId} not found.`);
		}

		if (request.quantity !== undefined) {
			this.repository.updateItemQuantity(cartItemId, request.quantity);
		}

		if (request.modifierOptionIds !== undefined && modifierDetails) {
			this.repository.clearModifiers(cartItemId);
			for (const mod of modifierDetails) {
				this.repository.addModifier(cartItemId, {
					modifierOptionId: mod.optionId,
					modifierName: mod.name,
					priceCents: mod.priceCents
				});
			}
		}

		return this.buildCartResponse(tenantId, sessionId);
	}

	removeItem(
		tenantId: string,
		sessionId: string,
		cartItemId: string
	): CartResponse {
		this.getSession(tenantId, sessionId);

		const removed = this.repository.removeItem(sessionId, cartItemId);
		if (!removed) {
			throw new CartNotFoundError(`Cart item ${cartItemId} not found.`);
		}

		return this.buildCartResponse(tenantId, sessionId);
	}

	clearCart(tenantId: string, sessionId: string): CartResponse {
		this.getSession(tenantId, sessionId);
		this.repository.clearItems(sessionId);
		return this.buildCartResponse(tenantId, sessionId);
	}

	// -----------------------------------------------------------------------
	// Fulfillment mode
	// -----------------------------------------------------------------------

	setFulfillment(
		tenantId: string,
		sessionId: string,
		request: SetFulfillmentRequest
	): CartResponse {
		this.getSession(tenantId, sessionId);

		this.repository.updateSession(sessionId, {
			fulfillmentMode: request.fulfillmentMode,
			deliveryAddressLine1: request.deliveryAddress?.line1 ?? null,
			deliveryAddressLine2: request.deliveryAddress?.line2 ?? null,
			deliveryCity: request.deliveryAddress?.city ?? null,
			deliveryState: request.deliveryAddress?.state ?? null,
			deliveryZip: request.deliveryAddress?.zip ?? null
		});

		return this.buildCartResponse(tenantId, sessionId);
	}

	// -----------------------------------------------------------------------
	// Promo and loyalty codes
	// -----------------------------------------------------------------------

	applyPromoCode(
		tenantId: string,
		sessionId: string,
		code: string
	): CartResponse {
		this.getSession(tenantId, sessionId);

		const result = this.promoCodeService.validate(tenantId, code);
		if (result.status !== "valid") {
			throw new CartValidationError(
				`Promo code '${code}' is ${result.status}.`
			);
		}

		this.repository.updateSession(sessionId, { promoCode: code });
		return this.buildCartResponse(tenantId, sessionId);
	}

	removePromoCode(
		tenantId: string,
		sessionId: string
	): CartResponse {
		this.getSession(tenantId, sessionId);
		this.repository.updateSession(sessionId, { promoCode: null });
		return this.buildCartResponse(tenantId, sessionId);
	}

	applyLoyaltyCode(
		tenantId: string,
		sessionId: string,
		code: string
	): CartResponse {
		this.getSession(tenantId, sessionId);

		const result = this.loyaltyCodeService.validate(tenantId, code);
		if (result.status !== "valid") {
			throw new CartValidationError(
				`Loyalty code '${code}' is ${result.status}.`
			);
		}

		this.repository.updateSession(sessionId, { loyaltyCode: code });
		return this.buildCartResponse(tenantId, sessionId);
	}

	removeLoyaltyCode(
		tenantId: string,
		sessionId: string
	): CartResponse {
		this.getSession(tenantId, sessionId);
		this.repository.updateSession(sessionId, { loyaltyCode: null });
		return this.buildCartResponse(tenantId, sessionId);
	}

	// -----------------------------------------------------------------------
	// Order notes
	// -----------------------------------------------------------------------

	setOrderNotes(
		tenantId: string,
		sessionId: string,
		notes: string
	): CartResponse {
		this.getSession(tenantId, sessionId);
		this.repository.updateSession(sessionId, {
			orderNotes: notes.trim() || null
		});
		return this.buildCartResponse(tenantId, sessionId);
	}

	// -----------------------------------------------------------------------
	// Quote / response builder
	// -----------------------------------------------------------------------

	getCart(tenantId: string, sessionId: string): CartResponse {
		return this.buildCartResponse(tenantId, sessionId);
	}

	getCheckoutStepperData(
		tenantId: string,
		sessionId: string
	): CheckoutStepperData {
		const response = this.buildCartResponse(tenantId, sessionId);

		return {
			cart: {
				items: response.items,
				quote: response.quote
			},
			fulfillment: {
				fulfillmentMode: response.fulfillmentMode,
				deliveryAddress: response.deliveryAddress
			},
			payment: {
				subtotalCents: response.quote.subtotalCents,
				discountCents: response.quote.discountCents,
				taxCents: response.quote.taxCents,
				tipCents: response.quote.tipCents,
				deliveryFeeCents: response.quote.deliveryFeeCents,
				totalCents: response.quote.totalCents,
				promoCode: response.promoCode,
				loyaltyCode: response.loyaltyCode,
				orderNotes: response.orderNotes
			}
		};
	}

	computeQuote(
		tenantId: string,
		sessionId: string,
		currentPriceLookup: Map<string, number>,
		taxRateBasisPoints: number,
		tip: { type: "percentage" | "custom"; percentage: number; customAmountCents: number } | null,
		deliveryFeeCents: number | null
	): PricingQuote {
		const session = this.getSession(tenantId, sessionId);
		const items = this.repository.listItems(sessionId);

		const pricingInput = this.buildPricingInput(
			session,
			items,
			currentPriceLookup,
			taxRateBasisPoints,
			tip,
			deliveryFeeCents
		);

		return this.pricingEngine.computeQuote(pricingInput);
	}

	// -----------------------------------------------------------------------
	// Private helpers
	// -----------------------------------------------------------------------

	private buildCartResponse(
		tenantId: string,
		sessionId: string
	): CartResponse {
		const session = this.getSession(tenantId, sessionId);
		const items = this.repository.listItems(sessionId);

		const cartItems: CartItemResponse[] = items.map((item) => {
			const modifiers = this.repository.listModifiers(item.id);
			return this.mapCartItemResponse(item, modifiers);
		});

		const pricingInput = this.buildPricingInput(
			session,
			items,
			new Map(),
			0,
			null,
			null
		);

		const quote = this.pricingEngine.computeQuote(pricingInput);

		const deliveryAddress = session.deliveryAddressLine1
			? {
					line1: session.deliveryAddressLine1,
					line2: session.deliveryAddressLine2,
					city: session.deliveryCity ?? "",
					state: session.deliveryState ?? "",
					zip: session.deliveryZip ?? ""
				}
			: null;

		return {
			sessionId: session.id,
			tenantId: session.tenantId,
			fulfillmentMode: session.fulfillmentMode,
			deliveryAddress,
			orderNotes: session.orderNotes,
			promoCode: session.promoCode,
			loyaltyCode: session.loyaltyCode,
			items: cartItems,
			quote
		};
	}

	private buildPricingInput(
		session: CartSessionRecord,
		items: CartItemRecord[],
		currentPriceLookup: Map<string, number>,
		taxRateBasisPoints: number,
		tip: { type: "percentage" | "custom"; percentage: number; customAmountCents: number } | null,
		deliveryFeeCents: number | null
	): PricingInput {
		const lineItems = items.map((item) => {
			const modifiers = this.repository.listModifiers(item.id);
			const currentPrice = currentPriceLookup.get(item.catalogItemId) ?? item.addedPriceCents;

			return {
				cartItemId: item.id,
				catalogItemId: item.catalogItemId,
				currentPriceCents: currentPrice,
				addedPriceCents: item.addedPriceCents,
				modifiers: modifiers.map((m) => ({
					modifierOptionId: m.modifierOptionId,
					priceCents: m.priceCents
				})),
				quantity: item.quantity
			};
		});

		let discount = null;
		if (session.promoCode) {
			const promoResult = this.promoCodeService.validate(
				session.tenantId,
				session.promoCode
			);
			if (promoResult.status === "valid" && promoResult.discount) {
				discount = promoResult.discount;
			}
		}

		return {
			lineItems,
			discount,
			taxPolicy: { rateBasisPoints: taxRateBasisPoints },
			tip,
			deliveryFee: deliveryFeeCents != null ? { feeCents: deliveryFeeCents } : null
		};
	}

	private mapCartItemResponse(
		item: CartItemRecord,
		modifiers: CartModifierRecord[]
	): CartItemResponse {
		return {
			id: item.id,
			catalogItemId: item.catalogItemId,
			catalogItemName: item.catalogItemName,
			variantId: item.variantId,
			variantName: item.variantName,
			quantity: item.quantity,
			addedPriceCents: item.addedPriceCents,
			modifiers: modifiers.map((m) => this.mapCartModifierResponse(m))
		};
	}

	private mapCartModifierResponse(
		mod: CartModifierRecord
	): CartModifierResponse {
		return {
			id: mod.id,
			modifierOptionId: mod.modifierOptionId,
			modifierName: mod.modifierName,
			priceCents: mod.priceCents
		};
	}
}
