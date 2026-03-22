import type {
	CartItemRecord,
	CartModifierRecord,
	CartSessionRecord,
	FulfillmentMode
} from "@platform/types";

// ---------------------------------------------------------------------------
// In-memory cart repository for tenant-scoped CRUD
// ---------------------------------------------------------------------------

const sessionCounter = { value: 0 };
const cartItemCounter = { value: 0 };
const cartModifierCounter = { value: 0 };

function nextId(prefix: string, counter: { value: number }): string {
	counter.value += 1;
	return `${prefix}-${counter.value}`;
}

function now(): string {
	return new Date().toISOString();
}

export class CartRepository {
	private sessions: CartSessionRecord[] = [];
	private items: CartItemRecord[] = [];
	private modifiers: CartModifierRecord[] = [];

	// -----------------------------------------------------------------------
	// Sessions
	// -----------------------------------------------------------------------

	findSession(
		tenantId: string,
		customerId: string | null
	): CartSessionRecord | undefined {
		return this.sessions.find(
			(s) =>
				s.tenantId === tenantId &&
				s.customerId === customerId
		);
	}

	getSessionById(
		tenantId: string,
		sessionId: string
	): CartSessionRecord | undefined {
		return this.sessions.find(
			(s) => s.tenantId === tenantId && s.id === sessionId
		);
	}

	createSession(
		tenantId: string,
		customerId: string | null
	): CartSessionRecord {
		const timestamp = now();
		const session: CartSessionRecord = {
			createdAt: timestamp,
			customerId,
			fulfillmentMode: "pickup",
			deliveryAddressLine1: null,
			deliveryAddressLine2: null,
			deliveryCity: null,
			deliveryState: null,
			deliveryZip: null,
			id: nextId("cart-session", sessionCounter),
			orderNotes: null,
			promoCode: null,
			loyaltyCode: null,
			tenantId,
			updatedAt: timestamp
		};
		this.sessions.push(session);
		return session;
	}

	updateSession(
		sessionId: string,
		updates: Partial<
			Pick<
				CartSessionRecord,
				| "fulfillmentMode"
				| "deliveryAddressLine1"
				| "deliveryAddressLine2"
				| "deliveryCity"
				| "deliveryState"
				| "deliveryZip"
				| "orderNotes"
				| "promoCode"
				| "loyaltyCode"
			>
		>
	): CartSessionRecord | undefined {
		const session = this.sessions.find((s) => s.id === sessionId);
		if (!session) return undefined;

		if (updates.fulfillmentMode !== undefined) session.fulfillmentMode = updates.fulfillmentMode;
		if (updates.deliveryAddressLine1 !== undefined) session.deliveryAddressLine1 = updates.deliveryAddressLine1;
		if (updates.deliveryAddressLine2 !== undefined) session.deliveryAddressLine2 = updates.deliveryAddressLine2;
		if (updates.deliveryCity !== undefined) session.deliveryCity = updates.deliveryCity;
		if (updates.deliveryState !== undefined) session.deliveryState = updates.deliveryState;
		if (updates.deliveryZip !== undefined) session.deliveryZip = updates.deliveryZip;
		if (updates.orderNotes !== undefined) session.orderNotes = updates.orderNotes;
		if (updates.promoCode !== undefined) session.promoCode = updates.promoCode;
		if (updates.loyaltyCode !== undefined) session.loyaltyCode = updates.loyaltyCode;
		session.updatedAt = now();

		return session;
	}

	// -----------------------------------------------------------------------
	// Cart items
	// -----------------------------------------------------------------------

	listItems(sessionId: string): CartItemRecord[] {
		return this.items.filter((i) => i.sessionId === sessionId);
	}

	getItemById(
		sessionId: string,
		cartItemId: string
	): CartItemRecord | undefined {
		return this.items.find(
			(i) => i.sessionId === sessionId && i.id === cartItemId
		);
	}

	addItem(
		sessionId: string,
		request: {
			catalogItemId: string;
			catalogItemName: string;
			variantId: string | null;
			variantName: string | null;
			quantity: number;
			addedPriceCents: number;
		}
	): CartItemRecord {
		const item: CartItemRecord = {
			addedPriceCents: request.addedPriceCents,
			catalogItemId: request.catalogItemId,
			catalogItemName: request.catalogItemName,
			id: nextId("cart-item", cartItemCounter),
			quantity: request.quantity,
			sessionId,
			variantId: request.variantId,
			variantName: request.variantName
		};
		this.items.push(item);
		return item;
	}

	updateItemQuantity(cartItemId: string, quantity: number): boolean {
		const item = this.items.find((i) => i.id === cartItemId);
		if (!item) return false;
		item.quantity = quantity;
		return true;
	}

	removeItem(sessionId: string, cartItemId: string): boolean {
		const index = this.items.findIndex(
			(i) => i.sessionId === sessionId && i.id === cartItemId
		);
		if (index === -1) return false;
		this.items.splice(index, 1);
		this.modifiers = this.modifiers.filter(
			(m) => m.cartItemId !== cartItemId
		);
		return true;
	}

	clearItems(sessionId: string): void {
		const itemIds = this.items
			.filter((i) => i.sessionId === sessionId)
			.map((i) => i.id);
		this.items = this.items.filter((i) => i.sessionId !== sessionId);
		this.modifiers = this.modifiers.filter(
			(m) => !itemIds.includes(m.cartItemId)
		);
	}

	// -----------------------------------------------------------------------
	// Modifiers
	// -----------------------------------------------------------------------

	listModifiers(cartItemId: string): CartModifierRecord[] {
		return this.modifiers.filter((m) => m.cartItemId === cartItemId);
	}

	addModifier(
		cartItemId: string,
		request: {
			modifierOptionId: string;
			modifierName: string;
			priceCents: number;
		}
	): CartModifierRecord {
		const modifier: CartModifierRecord = {
			cartItemId,
			id: nextId("cart-mod", cartModifierCounter),
			modifierName: request.modifierName,
			modifierOptionId: request.modifierOptionId,
			priceCents: request.priceCents
		};
		this.modifiers.push(modifier);
		return modifier;
	}

	clearModifiers(cartItemId: string): void {
		this.modifiers = this.modifiers.filter(
			(m) => m.cartItemId !== cartItemId
		);
	}
}
