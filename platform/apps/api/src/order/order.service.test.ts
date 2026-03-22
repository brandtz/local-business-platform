import { describe, it, expect, beforeEach } from "vitest";
import type { CreateOrderFromCartInput } from "@platform/types";
import {
	OrderService,
	OrderNotFoundError,
	OrderTransitionError,
	OrderValidationError
} from "./order.service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function createService(): OrderService {
	return new OrderService();
}

function sampleOrderInput(
	overrides?: Partial<CreateOrderFromCartInput>
): CreateOrderFromCartInput {
	return {
		tenantId: TENANT_A,
		customerId: "cust-1",
		customerName: "John Doe",
		customerEmail: "john@example.com",
		customerPhone: "555-1234",
		cartSessionId: "cart-1",
		fulfillmentMode: "pickup",
		deliveryAddress: null,
		orderNotes: "Extra napkins",
		promoCode: null,
		loyaltyCode: null,
		items: [
			{
				catalogItemId: "cat-1",
				catalogItemName: "Cheeseburger",
				variantId: null,
				variantName: null,
				quantity: 2,
				unitPriceCents: 999,
				lineTotalCents: 1998,
				modifiers: [
					{
						modifierOptionId: "opt-1",
						modifierName: "Extra Cheese",
						priceCents: 150
					}
				]
			}
		],
		subtotalCents: 2298,
		discountCents: 0,
		taxCents: 230,
		tipCents: 300,
		deliveryFeeCents: 0,
		totalCents: 2828,
		...overrides
	};
}

describe("OrderService", () => {
	let service: OrderService;

	beforeEach(() => {
		service = createService();
	});

	// -----------------------------------------------------------------------
	// Order creation
	// -----------------------------------------------------------------------

	describe("createOrderFromCart", () => {
		it("creates an order with placed status", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(order.status).toBe("placed");
			expect(order.tenantId).toBe(TENANT_A);
			expect(order.customerId).toBe("cust-1");
			expect(order.customerName).toBe("John Doe");
			expect(order.placedAt).not.toBeNull();
		});

		it("snapshots pricing totals from cart", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(order.subtotalCents).toBe(2298);
			expect(order.discountCents).toBe(0);
			expect(order.taxCents).toBe(230);
			expect(order.tipCents).toBe(300);
			expect(order.deliveryFeeCents).toBe(0);
			expect(order.totalCents).toBe(2828);
		});

		it("snapshots fulfillment mode and notes", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(order.fulfillmentMode).toBe("pickup");
			expect(order.orderNotes).toBe("Extra napkins");
		});

		it("captures delivery address for delivery orders", () => {
			const order = service.createOrderFromCart(
				sampleOrderInput({
					fulfillmentMode: "delivery",
					deliveryAddress: {
						line1: "123 Main St",
						line2: "Apt 4",
						city: "Springfield",
						state: "IL",
						zip: "62701"
					},
					deliveryFeeCents: 500,
					totalCents: 3328
				})
			);
			expect(order.fulfillmentMode).toBe("delivery");
			expect(order.deliveryAddressLine1).toBe("123 Main St");
			expect(order.deliveryCity).toBe("Springfield");
			expect(order.deliveryFeeCents).toBe(500);
		});

		it("captures dine-in fulfillment mode", () => {
			const order = service.createOrderFromCart(
				sampleOrderInput({
					fulfillmentMode: "dine-in"
				})
			);
			expect(order.fulfillmentMode).toBe("dine-in");
		});

		it("rejects order with no items", () => {
			expect(() =>
				service.createOrderFromCart(sampleOrderInput({ items: [] }))
			).toThrow(OrderValidationError);
		});

		it("rejects order with negative total", () => {
			expect(() =>
				service.createOrderFromCart(sampleOrderInput({ totalCents: -1 }))
			).toThrow(OrderValidationError);
		});

		it("persists order items with modifiers", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			const detail = service.getAdminOrderDetail(TENANT_A, order.id);
			expect(detail.items).toHaveLength(1);
			expect(detail.items[0].catalogItemName).toBe("Cheeseburger");
			expect(detail.items[0].quantity).toBe(2);
			expect(detail.items[0].unitPriceCents).toBe(999);
			expect(detail.items[0].modifiers).toHaveLength(1);
			expect(detail.items[0].modifiers[0].modifierName).toBe("Extra Cheese");
		});

		it("captures cart session reference", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(order.cartSessionId).toBe("cart-1");
		});

		it("captures promo code", () => {
			const order = service.createOrderFromCart(
				sampleOrderInput({ promoCode: "SAVE20" })
			);
			expect(order.promoCode).toBe("SAVE20");
		});
	});

	// -----------------------------------------------------------------------
	// Status transitions
	// -----------------------------------------------------------------------

	describe("transitionOrderStatus", () => {
		it("transitions placed → confirmed", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			const updated = service.transitionOrderStatus(
				TENANT_A,
				order.id,
				"confirmed"
			);
			expect(updated.status).toBe("confirmed");
			expect(updated.confirmedAt).not.toBeNull();
		});

		it("transitions confirmed → preparing", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			const updated = service.transitionOrderStatus(
				TENANT_A,
				order.id,
				"preparing"
			);
			expect(updated.status).toBe("preparing");
			expect(updated.preparingAt).not.toBeNull();
		});

		it("transitions preparing → ready", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			service.transitionOrderStatus(TENANT_A, order.id, "preparing");
			const updated = service.transitionOrderStatus(
				TENANT_A,
				order.id,
				"ready"
			);
			expect(updated.status).toBe("ready");
			expect(updated.readyAt).not.toBeNull();
		});

		it("transitions ready → completed", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			service.transitionOrderStatus(TENANT_A, order.id, "preparing");
			service.transitionOrderStatus(TENANT_A, order.id, "ready");
			const updated = service.transitionOrderStatus(
				TENANT_A,
				order.id,
				"completed"
			);
			expect(updated.status).toBe("completed");
			expect(updated.completedAt).not.toBeNull();
		});

		it("rejects invalid transition placed → ready", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(() =>
				service.transitionOrderStatus(TENANT_A, order.id, "ready")
			).toThrow(OrderTransitionError);
		});

		it("rejects backward transition confirmed → placed", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			expect(() =>
				service.transitionOrderStatus(TENANT_A, order.id, "placed")
			).toThrow(OrderTransitionError);
		});

		it("rejects transition from completed", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			service.transitionOrderStatus(TENANT_A, order.id, "preparing");
			service.transitionOrderStatus(TENANT_A, order.id, "ready");
			service.transitionOrderStatus(TENANT_A, order.id, "completed");
			expect(() =>
				service.transitionOrderStatus(TENANT_A, order.id, "placed")
			).toThrow(OrderTransitionError);
		});

		it("rejects transition from cancelled", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.cancelOrder(TENANT_A, order.id, "Customer request");
			expect(() =>
				service.transitionOrderStatus(TENANT_A, order.id, "confirmed")
			).toThrow(OrderTransitionError);
		});

		it("throws for non-existent order", () => {
			expect(() =>
				service.transitionOrderStatus(TENANT_A, "fake-id", "confirmed")
			).toThrow(OrderNotFoundError);
		});

		it("enforces tenant isolation on transitions", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(() =>
				service.transitionOrderStatus(TENANT_B, order.id, "confirmed")
			).toThrow(OrderNotFoundError);
		});
	});

	// -----------------------------------------------------------------------
	// Cancellation
	// -----------------------------------------------------------------------

	describe("cancelOrder", () => {
		it("cancels a placed order", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			const cancelled = service.cancelOrder(
				TENANT_A,
				order.id,
				"Customer request"
			);
			expect(cancelled.status).toBe("cancelled");
			expect(cancelled.cancelledAt).not.toBeNull();
			expect(cancelled.cancellationReason).toBe("Customer request");
		});

		it("cancels a confirmed order", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			const cancelled = service.cancelOrder(TENANT_A, order.id);
			expect(cancelled.status).toBe("cancelled");
		});

		it("cancels a preparing order", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			service.transitionOrderStatus(TENANT_A, order.id, "preparing");
			const cancelled = service.cancelOrder(TENANT_A, order.id);
			expect(cancelled.status).toBe("cancelled");
		});

		it("rejects cancellation of ready order", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			service.transitionOrderStatus(TENANT_A, order.id, "preparing");
			service.transitionOrderStatus(TENANT_A, order.id, "ready");
			expect(() =>
				service.cancelOrder(TENANT_A, order.id)
			).toThrow(OrderTransitionError);
		});

		it("rejects cancellation of completed order", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			service.transitionOrderStatus(TENANT_A, order.id, "preparing");
			service.transitionOrderStatus(TENANT_A, order.id, "ready");
			service.transitionOrderStatus(TENANT_A, order.id, "completed");
			expect(() =>
				service.cancelOrder(TENANT_A, order.id)
			).toThrow(OrderTransitionError);
		});
	});

	// -----------------------------------------------------------------------
	// Admin queries
	// -----------------------------------------------------------------------

	describe("admin queries", () => {
		it("lists all orders for a tenant", () => {
			service.createOrderFromCart(sampleOrderInput());
			service.createOrderFromCart(
				sampleOrderInput({ customerId: "cust-2", customerName: "Jane" })
			);
			const result = service.listAdminOrders({ tenantId: TENANT_A });
			expect(result.orders).toHaveLength(2);
			expect(result.total).toBe(2);
		});

		it("filters orders by status", () => {
			const order1 = service.createOrderFromCart(sampleOrderInput());
			service.createOrderFromCart(
				sampleOrderInput({ customerId: "cust-2" })
			);
			service.transitionOrderStatus(TENANT_A, order1.id, "confirmed");

			const placed = service.listAdminOrders({
				tenantId: TENANT_A,
				status: "placed"
			});
			expect(placed.orders).toHaveLength(1);

			const confirmed = service.listAdminOrders({
				tenantId: TENANT_A,
				status: "confirmed"
			});
			expect(confirmed.orders).toHaveLength(1);
		});

		it("filters orders by fulfillment mode", () => {
			service.createOrderFromCart(sampleOrderInput());
			service.createOrderFromCart(
				sampleOrderInput({
					customerId: "cust-2",
					fulfillmentMode: "delivery",
					deliveryAddress: {
						line1: "123 Main St",
						line2: null,
						city: "Springfield",
						state: "IL",
						zip: "62701"
					}
				})
			);

			const pickup = service.listAdminOrders({
				tenantId: TENANT_A,
				fulfillmentMode: "pickup"
			});
			expect(pickup.orders).toHaveLength(1);
		});

		it("searches orders by customer name", () => {
			service.createOrderFromCart(sampleOrderInput());
			service.createOrderFromCart(
				sampleOrderInput({
					customerId: "cust-2",
					customerName: "Jane Smith"
				})
			);

			const results = service.listAdminOrders({
				tenantId: TENANT_A,
				search: "jane"
			});
			expect(results.orders).toHaveLength(1);
			expect(results.orders[0].customerName).toBe("Jane Smith");
		});

		it("searches orders by order ID", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			const results = service.listAdminOrders({
				tenantId: TENANT_A,
				search: order.id
			});
			expect(results.orders).toHaveLength(1);
		});

		it("paginates results", () => {
			for (let i = 0; i < 5; i++) {
				service.createOrderFromCart(
					sampleOrderInput({ customerId: `cust-${i}` })
				);
			}
			const page1 = service.listAdminOrders({
				tenantId: TENANT_A,
				page: 1,
				pageSize: 2
			});
			expect(page1.orders).toHaveLength(2);
			expect(page1.total).toBe(5);

			const page3 = service.listAdminOrders({
				tenantId: TENANT_A,
				page: 3,
				pageSize: 2
			});
			expect(page3.orders).toHaveLength(1);
		});

		it("returns admin order detail with allowed transitions", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			const detail = service.getAdminOrderDetail(TENANT_A, order.id);
			expect(detail.status).toBe("placed");
			expect(detail.allowedTransitions).toContain("confirmed");
			expect(detail.allowedTransitions).toContain("cancelled");
			expect(detail.customerEmail).toBe("john@example.com");
		});

		it("admin detail of completed order has no allowed transitions", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			service.transitionOrderStatus(TENANT_A, order.id, "preparing");
			service.transitionOrderStatus(TENANT_A, order.id, "ready");
			service.transitionOrderStatus(TENANT_A, order.id, "completed");
			const detail = service.getAdminOrderDetail(TENANT_A, order.id);
			expect(detail.allowedTransitions).toEqual([]);
		});

		it("throws for admin detail of non-existent order", () => {
			expect(() =>
				service.getAdminOrderDetail(TENANT_A, "fake-id")
			).toThrow(OrderNotFoundError);
		});

		it("enforces tenant isolation on admin detail", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(() =>
				service.getAdminOrderDetail(TENANT_B, order.id)
			).toThrow(OrderNotFoundError);
		});
	});

	// -----------------------------------------------------------------------
	// Pipeline counts
	// -----------------------------------------------------------------------

	describe("pipeline counts", () => {
		it("returns counts for all statuses", () => {
			service.createOrderFromCart(sampleOrderInput());
			const order2 = service.createOrderFromCart(
				sampleOrderInput({ customerId: "cust-2" })
			);
			service.transitionOrderStatus(TENANT_A, order2.id, "confirmed");

			const pipeline = service.getOrderPipelineCounts(TENANT_A);
			expect(pipeline.total).toBe(2);

			const placedCount = pipeline.counts.find(
				(c) => c.status === "placed"
			);
			expect(placedCount?.count).toBe(1);

			const confirmedCount = pipeline.counts.find(
				(c) => c.status === "confirmed"
			);
			expect(confirmedCount?.count).toBe(1);
		});

		it("returns zero counts for empty tenant", () => {
			const pipeline = service.getOrderPipelineCounts(TENANT_B);
			expect(pipeline.total).toBe(0);
			for (const c of pipeline.counts) {
				expect(c.count).toBe(0);
			}
		});
	});

	// -----------------------------------------------------------------------
	// Customer queries
	// -----------------------------------------------------------------------

	describe("customer queries", () => {
		it("lists orders for a specific customer", () => {
			service.createOrderFromCart(sampleOrderInput());
			service.createOrderFromCart(
				sampleOrderInput({ customerId: "cust-2" })
			);

			const orders = service.listCustomerOrders(TENANT_A, "cust-1");
			expect(orders).toHaveLength(1);
			expect(orders[0].status).toBe("placed");
		});

		it("returns customer order detail without admin fields", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			const detail = service.getCustomerOrderDetail(
				TENANT_A,
				order.id,
				"cust-1"
			);
			expect(detail.status).toBe("placed");
			expect(detail).not.toHaveProperty("allowedTransitions");
			expect(detail).not.toHaveProperty("customerEmail");
			expect(detail).not.toHaveProperty("cancellationReason");
		});

		it("throws for customer accessing another customer's order", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(() =>
				service.getCustomerOrderDetail(
					TENANT_A,
					order.id,
					"cust-999"
				)
			).toThrow(OrderNotFoundError);
		});

		it("enforces tenant isolation on customer queries", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(() =>
				service.getCustomerOrderDetail(
					TENANT_B,
					order.id,
					"cust-1"
				)
			).toThrow(OrderNotFoundError);
		});
	});

	// -----------------------------------------------------------------------
	// Customer order tracking
	// -----------------------------------------------------------------------

	describe("order tracking", () => {
		it("returns tracking data for a placed order", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			const tracking = service.getOrderTrackingData(
				TENANT_A,
				order.id,
				"cust-1"
			);
			expect(tracking.orderId).toBe(order.id);
			expect(tracking.status).toBe("placed");
			expect(tracking.isCancelled).toBe(false);
			expect(tracking.steps).toHaveLength(5);
			expect(tracking.currentStepIndex).toBe(0);
			expect(tracking.customerInfoCard.customerName).toBe("John Doe");
			expect(tracking.receipt.totalCents).toBe(2828);
			expect(tracking.receipt.items).toHaveLength(1);
		});

		it("returns tracking data for a preparing order", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.transitionOrderStatus(TENANT_A, order.id, "confirmed");
			service.transitionOrderStatus(TENANT_A, order.id, "preparing");

			const tracking = service.getOrderTrackingData(
				TENANT_A,
				order.id,
				"cust-1"
			);
			expect(tracking.currentStepIndex).toBe(2);
			expect(tracking.steps[0].state).toBe("completed");
			expect(tracking.steps[1].state).toBe("completed");
			expect(tracking.steps[2].state).toBe("current");
		});

		it("returns tracking data for a cancelled order", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			service.cancelOrder(TENANT_A, order.id, "Customer request");

			const tracking = service.getOrderTrackingData(
				TENANT_A,
				order.id,
				"cust-1"
			);
			expect(tracking.isCancelled).toBe(true);
			expect(tracking.currentStepIndex).toBe(-1);
		});

		it("includes delivery address in customer info card", () => {
			const order = service.createOrderFromCart(
				sampleOrderInput({
					fulfillmentMode: "delivery",
					deliveryAddress: {
						line1: "123 Main St",
						line2: null,
						city: "Springfield",
						state: "IL",
						zip: "62701"
					}
				})
			);
			const tracking = service.getOrderTrackingData(
				TENANT_A,
				order.id,
				"cust-1"
			);
			expect(tracking.customerInfoCard.deliveryAddress).not.toBeNull();
			expect(tracking.customerInfoCard.deliveryAddress?.line1).toBe(
				"123 Main St"
			);
		});

		it("throws for customer accessing another customer's tracking", () => {
			const order = service.createOrderFromCart(sampleOrderInput());
			expect(() =>
				service.getOrderTrackingData(TENANT_A, order.id, "cust-999")
			).toThrow(OrderNotFoundError);
		});
	});
});
