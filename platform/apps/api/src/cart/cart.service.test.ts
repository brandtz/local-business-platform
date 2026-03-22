import { beforeEach, describe, expect, it } from "vitest";
import { CartService, CartNotFoundError, CartValidationError } from "./cart.service";
import { CartRepository } from "./cart.repository";
import { PricingEngineService } from "./pricing-engine.service";
import { PromoCodeService } from "./promo-code.service";
import { LoyaltyCodeService } from "./loyalty-code.service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function createService(): CartService {
	return new CartService(
		new CartRepository(),
		new PricingEngineService(),
		new PromoCodeService(),
		new LoyaltyCodeService()
	);
}

describe("CartService", () => {
	let service: CartService;

	beforeEach(() => {
		service = createService();
	});

	// -----------------------------------------------------------------------
	// Session management
	// -----------------------------------------------------------------------

	describe("session management", () => {
		it("creates a new session", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			expect(session.tenantId).toBe(TENANT_A);
			expect(session.customerId).toBe("customer-1");
			expect(session.fulfillmentMode).toBe("pickup");
		});

		it("returns existing session for same tenant and customer", () => {
			const session1 = service.getOrCreateSession(TENANT_A, "customer-1");
			const session2 = service.getOrCreateSession(TENANT_A, "customer-1");
			expect(session1.id).toBe(session2.id);
		});

		it("creates separate sessions for different tenants", () => {
			const session1 = service.getOrCreateSession(TENANT_A, "customer-1");
			const session2 = service.getOrCreateSession(TENANT_B, "customer-1");
			expect(session1.id).not.toBe(session2.id);
		});

		it("throws for non-existent session", () => {
			expect(() =>
				service.getSession(TENANT_A, "non-existent")
			).toThrow(CartNotFoundError);
		});
	});

	// -----------------------------------------------------------------------
	// Item operations
	// -----------------------------------------------------------------------

	describe("item operations", () => {
		it("adds an item to the cart", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const response = service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-1", quantity: 2 },
				1000,
				"Burger",
				null,
				[]
			);

			expect(response.items).toHaveLength(1);
			expect(response.items[0].catalogItemId).toBe("item-1");
			expect(response.items[0].quantity).toBe(2);
			expect(response.items[0].addedPriceCents).toBe(1000);
		});

		it("adds item with modifiers", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const response = service.addItem(
				TENANT_A,
				session.id,
				{
					catalogItemId: "item-1",
					quantity: 1,
					modifierOptionIds: ["opt-1"]
				},
				1000,
				"Burger",
				null,
				[{ optionId: "opt-1", name: "Extra Cheese", priceCents: 150 }]
			);

			expect(response.items).toHaveLength(1);
			expect(response.items[0].modifiers).toHaveLength(1);
			expect(response.items[0].modifiers[0].modifierName).toBe("Extra Cheese");
			expect(response.items[0].modifiers[0].priceCents).toBe(150);
		});

		it("returns server-computed quote after add", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const response = service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-1", quantity: 1 },
				1000,
				"Burger",
				null,
				[]
			);

			expect(response.quote).toBeDefined();
			expect(response.quote.subtotalCents).toBe(1000);
		});

		it("updates item quantity", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const addResponse = service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-1", quantity: 1 },
				1000,
				"Burger",
				null,
				[]
			);

			const updateResponse = service.updateItem(
				TENANT_A,
				session.id,
				addResponse.items[0].id,
				{ quantity: 5 }
			);

			expect(updateResponse.items[0].quantity).toBe(5);
		});

		it("removes an item", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const addResponse = service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-1", quantity: 1 },
				1000,
				"Burger",
				null,
				[]
			);

			const removeResponse = service.removeItem(
				TENANT_A,
				session.id,
				addResponse.items[0].id
			);

			expect(removeResponse.items).toHaveLength(0);
		});

		it("throws on remove non-existent item", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");

			expect(() =>
				service.removeItem(TENANT_A, session.id, "non-existent")
			).toThrow(CartNotFoundError);
		});

		it("clears all items", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-1", quantity: 1 },
				1000,
				"Burger",
				null,
				[]
			);
			service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-2", quantity: 2 },
				500,
				"Fries",
				null,
				[]
			);

			const response = service.clearCart(TENANT_A, session.id);
			expect(response.items).toHaveLength(0);
			expect(response.quote.subtotalCents).toBe(0);
		});

		it("returns updated quote after every mutation", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");

			const r1 = service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-1", quantity: 2 },
				1000,
				"Burger",
				null,
				[]
			);
			expect(r1.quote.subtotalCents).toBe(2000);

			const r2 = service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-2", quantity: 1 },
				500,
				"Fries",
				null,
				[]
			);
			expect(r2.quote.subtotalCents).toBe(2500);
		});
	});

	// -----------------------------------------------------------------------
	// Fulfillment mode
	// -----------------------------------------------------------------------

	describe("fulfillment mode", () => {
		it("sets pickup fulfillment", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const response = service.setFulfillment(TENANT_A, session.id, {
				fulfillmentMode: "pickup"
			});
			expect(response.fulfillmentMode).toBe("pickup");
			expect(response.deliveryAddress).toBeNull();
		});

		it("sets delivery fulfillment with address", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const response = service.setFulfillment(TENANT_A, session.id, {
				fulfillmentMode: "delivery",
				deliveryAddress: {
					line1: "123 Main St",
					line2: "Apt 4B",
					city: "Springfield",
					state: "IL",
					zip: "62701"
				}
			});
			expect(response.fulfillmentMode).toBe("delivery");
			expect(response.deliveryAddress?.line1).toBe("123 Main St");
			expect(response.deliveryAddress?.line2).toBe("Apt 4B");
		});

		it("clears address when switching to pickup", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			service.setFulfillment(TENANT_A, session.id, {
				fulfillmentMode: "delivery",
				deliveryAddress: {
					line1: "123 Main St",
					city: "Springfield",
					state: "IL",
					zip: "62701"
				}
			});

			const response = service.setFulfillment(TENANT_A, session.id, {
				fulfillmentMode: "pickup"
			});
			expect(response.fulfillmentMode).toBe("pickup");
			expect(response.deliveryAddress).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// Order notes
	// -----------------------------------------------------------------------

	describe("order notes", () => {
		it("sets order notes", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const response = service.setOrderNotes(
				TENANT_A,
				session.id,
				"No onions please"
			);
			expect(response.orderNotes).toBe("No onions please");
		});

		it("clears order notes with empty string", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			service.setOrderNotes(TENANT_A, session.id, "No onions");
			const response = service.setOrderNotes(TENANT_A, session.id, "");
			expect(response.orderNotes).toBeNull();
		});

		it("trims whitespace from order notes", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const response = service.setOrderNotes(
				TENANT_A,
				session.id,
				"  No onions  "
			);
			expect(response.orderNotes).toBe("No onions");
		});
	});

	// -----------------------------------------------------------------------
	// Promo and loyalty codes
	// -----------------------------------------------------------------------

	describe("promo and loyalty codes", () => {
		it("rejects invalid promo code (default service)", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			expect(() =>
				service.applyPromoCode(TENANT_A, session.id, "INVALID")
			).toThrow(CartValidationError);
		});

		it("rejects invalid loyalty code (default service)", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			expect(() =>
				service.applyLoyaltyCode(TENANT_A, session.id, "INVALID")
			).toThrow(CartValidationError);
		});

		it("removes promo code", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const response = service.removePromoCode(TENANT_A, session.id);
			expect(response.promoCode).toBeNull();
		});

		it("removes loyalty code", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			const response = service.removeLoyaltyCode(TENANT_A, session.id);
			expect(response.loyaltyCode).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// Tenant isolation
	// -----------------------------------------------------------------------

	describe("tenant isolation", () => {
		it("cannot access session from different tenant", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			expect(() =>
				service.getSession(TENANT_B, session.id)
			).toThrow(CartNotFoundError);
		});
	});

	// -----------------------------------------------------------------------
	// Checkout stepper data
	// -----------------------------------------------------------------------

	describe("checkout stepper data", () => {
		it("returns 3-step stepper data", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-1", quantity: 1 },
				1000,
				"Burger",
				null,
				[]
			);
			service.setFulfillment(TENANT_A, session.id, {
				fulfillmentMode: "delivery",
				deliveryAddress: {
					line1: "123 Main St",
					city: "Springfield",
					state: "IL",
					zip: "62701"
				}
			});
			service.setOrderNotes(TENANT_A, session.id, "Ring the bell");

			const stepper = service.getCheckoutStepperData(TENANT_A, session.id);

			// Cart step
			expect(stepper.cart.items).toHaveLength(1);
			expect(stepper.cart.quote.subtotalCents).toBe(1000);

			// Fulfillment step
			expect(stepper.fulfillment.fulfillmentMode).toBe("delivery");
			expect(stepper.fulfillment.deliveryAddress?.line1).toBe("123 Main St");

			// Payment step
			expect(stepper.payment.subtotalCents).toBe(1000);
			expect(stepper.payment.orderNotes).toBe("Ring the bell");
		});
	});

	// -----------------------------------------------------------------------
	// Quote computation with external price lookup
	// -----------------------------------------------------------------------

	describe("quote with price lookup", () => {
		it("detects stale prices via current price lookup", () => {
			const session = service.getOrCreateSession(TENANT_A, "customer-1");
			service.addItem(
				TENANT_A,
				session.id,
				{ catalogItemId: "item-1", quantity: 1 },
				1000,
				"Burger",
				null,
				[]
			);

			// Price has changed from 1000 to 1200
			const priceLookup = new Map([["item-1", 1200]]);
			const quote = service.computeQuote(
				TENANT_A,
				session.id,
				priceLookup,
				0,
				null,
				null
			);

			expect(quote.lineItems[0].isStalePrice).toBe(true);
		});
	});
});
