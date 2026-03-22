import { describe, it, expect } from "vitest";
import {
  orderStatuses,
  isValidOrderTransition,
  getNextOrderStatuses,
  isTerminalOrderStatus,
  isValidOrderStatus,
  isOrderCancellable,
  orderFulfillmentModes,
  isValidOrderFulfillmentMode,
  computeTrackingSteps,
  getCurrentTrackingStepIndex,
  getOrderQuickActions,
  formatTimeAgo,
  getOrderDisplayTimestamp,
} from "./order";
import type {
  OrderRecord,
  OrderItemRecord,
  OrderItemModifierRecord,
  CreateOrderFromCartInput,
  AdminOrderSummary,
  AdminOrderDetail,
  AdminOrderListQuery,
  OrderPipelineCounts,
  CustomerOrderSummary,
  CustomerOrderDetail,
  OrderTrackingData,
} from "./order";

describe("Order types", () => {
  // -----------------------------------------------------------------------
  // Order status enum
  // -----------------------------------------------------------------------

  describe("orderStatuses", () => {
    it("defines all expected statuses", () => {
      expect(orderStatuses).toEqual([
        "draft",
        "placed",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ]);
    });

    it("isValidOrderStatus accepts valid statuses", () => {
      for (const status of orderStatuses) {
        expect(isValidOrderStatus(status)).toBe(true);
      }
    });

    it("isValidOrderStatus rejects invalid statuses", () => {
      expect(isValidOrderStatus("unknown")).toBe(false);
      expect(isValidOrderStatus("")).toBe(false);
      expect(isValidOrderStatus("PLACED")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // State machine transitions
  // -----------------------------------------------------------------------

  describe("state machine transitions", () => {
    it("draft can only transition to placed", () => {
      expect(getNextOrderStatuses("draft")).toEqual(["placed"]);
    });

    it("placed can transition to confirmed or cancelled", () => {
      expect(getNextOrderStatuses("placed")).toEqual(["confirmed", "cancelled"]);
    });

    it("confirmed can transition to preparing or cancelled", () => {
      expect(getNextOrderStatuses("confirmed")).toEqual(["preparing", "cancelled"]);
    });

    it("preparing can transition to ready or cancelled", () => {
      expect(getNextOrderStatuses("preparing")).toEqual(["ready", "cancelled"]);
    });

    it("ready can only transition to completed", () => {
      expect(getNextOrderStatuses("ready")).toEqual(["completed"]);
    });

    it("completed has no transitions", () => {
      expect(getNextOrderStatuses("completed")).toEqual([]);
    });

    it("cancelled has no transitions", () => {
      expect(getNextOrderStatuses("cancelled")).toEqual([]);
    });

    it("isValidOrderTransition accepts valid forward transitions", () => {
      expect(isValidOrderTransition("draft", "placed")).toBe(true);
      expect(isValidOrderTransition("placed", "confirmed")).toBe(true);
      expect(isValidOrderTransition("confirmed", "preparing")).toBe(true);
      expect(isValidOrderTransition("preparing", "ready")).toBe(true);
      expect(isValidOrderTransition("ready", "completed")).toBe(true);
    });

    it("isValidOrderTransition accepts cancellation from allowed statuses", () => {
      expect(isValidOrderTransition("placed", "cancelled")).toBe(true);
      expect(isValidOrderTransition("confirmed", "cancelled")).toBe(true);
      expect(isValidOrderTransition("preparing", "cancelled")).toBe(true);
    });

    it("isValidOrderTransition rejects invalid transitions", () => {
      expect(isValidOrderTransition("draft", "confirmed")).toBe(false);
      expect(isValidOrderTransition("placed", "ready")).toBe(false);
      expect(isValidOrderTransition("ready", "cancelled")).toBe(false);
      expect(isValidOrderTransition("completed", "placed")).toBe(false);
      expect(isValidOrderTransition("cancelled", "placed")).toBe(false);
    });

    it("isValidOrderTransition rejects backward transitions", () => {
      expect(isValidOrderTransition("confirmed", "placed")).toBe(false);
      expect(isValidOrderTransition("ready", "preparing")).toBe(false);
      expect(isValidOrderTransition("completed", "ready")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Terminal statuses
  // -----------------------------------------------------------------------

  describe("terminal statuses", () => {
    it("completed and cancelled are terminal", () => {
      expect(isTerminalOrderStatus("completed")).toBe(true);
      expect(isTerminalOrderStatus("cancelled")).toBe(true);
    });

    it("non-terminal statuses are not terminal", () => {
      expect(isTerminalOrderStatus("draft")).toBe(false);
      expect(isTerminalOrderStatus("placed")).toBe(false);
      expect(isTerminalOrderStatus("confirmed")).toBe(false);
      expect(isTerminalOrderStatus("preparing")).toBe(false);
      expect(isTerminalOrderStatus("ready")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Cancellable statuses
  // -----------------------------------------------------------------------

  describe("cancellable statuses", () => {
    it("placed, confirmed, and preparing are cancellable", () => {
      expect(isOrderCancellable("placed")).toBe(true);
      expect(isOrderCancellable("confirmed")).toBe(true);
      expect(isOrderCancellable("preparing")).toBe(true);
    });

    it("draft, ready, completed, and cancelled are not cancellable", () => {
      expect(isOrderCancellable("draft")).toBe(false);
      expect(isOrderCancellable("ready")).toBe(false);
      expect(isOrderCancellable("completed")).toBe(false);
      expect(isOrderCancellable("cancelled")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Fulfillment modes
  // -----------------------------------------------------------------------

  describe("fulfillment modes", () => {
    it("defines delivery, pickup, and dine-in", () => {
      expect(orderFulfillmentModes).toEqual(["delivery", "pickup", "dine-in"]);
    });

    it("isValidOrderFulfillmentMode accepts valid modes", () => {
      expect(isValidOrderFulfillmentMode("delivery")).toBe(true);
      expect(isValidOrderFulfillmentMode("pickup")).toBe(true);
      expect(isValidOrderFulfillmentMode("dine-in")).toBe(true);
    });

    it("isValidOrderFulfillmentMode rejects invalid modes", () => {
      expect(isValidOrderFulfillmentMode("takeout")).toBe(false);
      expect(isValidOrderFulfillmentMode("")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Domain record types
  // -----------------------------------------------------------------------

  describe("domain records", () => {
    it("OrderRecord has required fields for pickup", () => {
      const record: OrderRecord = {
        id: "order-1",
        createdAt: "2026-03-22T00:00:00.000Z",
        updatedAt: "2026-03-22T00:00:00.000Z",
        tenantId: "tenant-1",
        customerId: "cust-1",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "555-1234",
        status: "placed",
        fulfillmentMode: "pickup",
        deliveryAddressLine1: null,
        deliveryAddressLine2: null,
        deliveryCity: null,
        deliveryState: null,
        deliveryZip: null,
        orderNotes: "Extra napkins",
        subtotalCents: 2500,
        discountCents: 500,
        taxCents: 200,
        tipCents: 300,
        deliveryFeeCents: 0,
        totalCents: 2500,
        promoCode: "SAVE20",
        loyaltyCode: null,
        cartSessionId: "cart-1",
        placedAt: "2026-03-22T00:00:00.000Z",
        confirmedAt: null,
        preparingAt: null,
        readyAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
      };
      expect(record.status).toBe("placed");
      expect(record.fulfillmentMode).toBe("pickup");
    });

    it("OrderRecord has delivery address for delivery mode", () => {
      const record: OrderRecord = {
        id: "order-2",
        createdAt: "2026-03-22T00:00:00.000Z",
        updatedAt: "2026-03-22T00:00:00.000Z",
        tenantId: "tenant-1",
        customerId: "cust-1",
        customerName: "Jane Doe",
        customerEmail: null,
        customerPhone: null,
        status: "confirmed",
        fulfillmentMode: "delivery",
        deliveryAddressLine1: "123 Main St",
        deliveryAddressLine2: "Apt 4",
        deliveryCity: "Springfield",
        deliveryState: "IL",
        deliveryZip: "62701",
        orderNotes: null,
        subtotalCents: 3000,
        discountCents: 0,
        taxCents: 300,
        tipCents: 0,
        deliveryFeeCents: 500,
        totalCents: 3800,
        promoCode: null,
        loyaltyCode: null,
        cartSessionId: "cart-2",
        placedAt: "2026-03-22T00:00:00.000Z",
        confirmedAt: "2026-03-22T00:01:00.000Z",
        preparingAt: null,
        readyAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
      };
      expect(record.fulfillmentMode).toBe("delivery");
      expect(record.deliveryAddressLine1).toBe("123 Main St");
    });

    it("OrderItemRecord captures pricing snapshot", () => {
      const item: OrderItemRecord = {
        id: "item-1",
        orderId: "order-1",
        catalogItemId: "catalog-1",
        catalogItemName: "Cheeseburger",
        variantId: null,
        variantName: null,
        quantity: 2,
        unitPriceCents: 999,
        lineTotalCents: 1998,
      };
      expect(item.lineTotalCents).toBe(item.unitPriceCents * item.quantity);
    });

    it("OrderItemModifierRecord captures modifier pricing", () => {
      const mod: OrderItemModifierRecord = {
        id: "mod-1",
        orderItemId: "item-1",
        modifierOptionId: "opt-1",
        modifierName: "Extra Cheese",
        priceCents: 150,
      };
      expect(mod.priceCents).toBe(150);
    });
  });

  // -----------------------------------------------------------------------
  // CreateOrderFromCartInput
  // -----------------------------------------------------------------------

  describe("CreateOrderFromCartInput", () => {
    it("captures complete cart snapshot for order creation", () => {
      const input: CreateOrderFromCartInput = {
        tenantId: "tenant-1",
        customerId: "cust-1",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "555-1234",
        cartSessionId: "cart-1",
        fulfillmentMode: "pickup",
        deliveryAddress: null,
        orderNotes: "Extra napkins",
        promoCode: "SAVE20",
        loyaltyCode: null,
        items: [
          {
            catalogItemId: "cat-1",
            catalogItemName: "Burger",
            variantId: null,
            variantName: null,
            quantity: 2,
            unitPriceCents: 999,
            lineTotalCents: 1998,
            modifiers: [
              {
                modifierOptionId: "opt-1",
                modifierName: "Extra Cheese",
                priceCents: 150,
              },
            ],
          },
        ],
        subtotalCents: 2298,
        discountCents: 200,
        taxCents: 210,
        tipCents: 300,
        deliveryFeeCents: 0,
        totalCents: 2608,
      };
      expect(input.items).toHaveLength(1);
      expect(input.items[0].modifiers).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Admin response types
  // -----------------------------------------------------------------------

  describe("admin order types", () => {
    it("AdminOrderSummary provides list-level data", () => {
      const summary: AdminOrderSummary = {
        id: "order-1",
        createdAt: "2026-03-22T00:00:00.000Z",
        status: "placed",
        fulfillmentMode: "pickup",
        customerName: "John",
        totalCents: 2500,
        itemCount: 3,
        placedAt: "2026-03-22T00:00:00.000Z",
      };
      expect(summary.status).toBe("placed");
    });

    it("AdminOrderDetail includes allowed transitions", () => {
      const detail: AdminOrderDetail = {
        id: "order-1",
        createdAt: "2026-03-22T00:00:00.000Z",
        updatedAt: "2026-03-22T00:00:00.000Z",
        status: "placed",
        fulfillmentMode: "pickup",
        customerName: "John",
        customerEmail: "j@example.com",
        customerPhone: null,
        deliveryAddress: null,
        orderNotes: null,
        subtotalCents: 2500,
        discountCents: 0,
        taxCents: 250,
        tipCents: 0,
        deliveryFeeCents: 0,
        totalCents: 2750,
        promoCode: null,
        loyaltyCode: null,
        items: [],
        placedAt: "2026-03-22T00:00:00.000Z",
        confirmedAt: null,
        preparingAt: null,
        readyAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        allowedTransitions: ["confirmed", "cancelled"],
      };
      expect(detail.allowedTransitions).toContain("confirmed");
      expect(detail.allowedTransitions).toContain("cancelled");
    });

    it("AdminOrderListQuery supports filters", () => {
      const query: AdminOrderListQuery = {
        tenantId: "tenant-1",
        status: "placed",
        fulfillmentMode: "pickup",
        search: "john",
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        page: 1,
        pageSize: 20,
      };
      expect(query.status).toBe("placed");
    });

    it("OrderPipelineCounts aggregates status counts", () => {
      const pipeline: OrderPipelineCounts = {
        counts: [
          { status: "placed", count: 12 },
          { status: "confirmed", count: 5 },
          { status: "preparing", count: 3 },
          { status: "ready", count: 2 },
          { status: "completed", count: 48 },
          { status: "cancelled", count: 1 },
        ],
        total: 71,
      };
      expect(pipeline.counts).toHaveLength(6);
      expect(pipeline.total).toBe(71);
    });
  });

  // -----------------------------------------------------------------------
  // Customer order types
  // -----------------------------------------------------------------------

  describe("customer order types", () => {
    it("CustomerOrderSummary provides list-level data", () => {
      const summary: CustomerOrderSummary = {
        id: "order-1",
        createdAt: "2026-03-22T00:00:00.000Z",
        status: "placed",
        fulfillmentMode: "pickup",
        totalCents: 2500,
        itemCount: 3,
      };
      expect(summary.status).toBe("placed");
    });

    it("CustomerOrderDetail does not include admin fields", () => {
      const detail: CustomerOrderDetail = {
        id: "order-1",
        createdAt: "2026-03-22T00:00:00.000Z",
        status: "placed",
        fulfillmentMode: "pickup",
        deliveryAddress: null,
        orderNotes: "Extra napkins",
        subtotalCents: 2500,
        discountCents: 0,
        taxCents: 250,
        tipCents: 0,
        deliveryFeeCents: 0,
        totalCents: 2750,
        items: [],
        placedAt: "2026-03-22T00:00:00.000Z",
        confirmedAt: null,
        preparingAt: null,
        readyAt: null,
        completedAt: null,
        cancelledAt: null,
      };
      // CustomerOrderDetail does NOT have allowedTransitions or customerEmail
      expect(detail.status).toBe("placed");
      expect(detail).not.toHaveProperty("allowedTransitions");
      expect(detail).not.toHaveProperty("customerEmail");
    });
  });

  // -----------------------------------------------------------------------
  // Tracking progress bar (E7-S2-T6)
  // -----------------------------------------------------------------------

  describe("order tracking", () => {
    it("computes tracking steps for a placed order", () => {
      const steps = computeTrackingSteps("placed", {
        placedAt: "2026-03-22T00:00:00.000Z",
        confirmedAt: null,
        preparingAt: null,
        readyAt: null,
        completedAt: null,
      });
      expect(steps).toHaveLength(5);
      expect(steps[0].state).toBe("current");
      expect(steps[0].label).toBe("Order Placed");
      expect(steps[1].state).toBe("upcoming");
      expect(steps[2].state).toBe("upcoming");
      expect(steps[3].state).toBe("upcoming");
      expect(steps[4].state).toBe("upcoming");
    });

    it("computes tracking steps for a preparing order", () => {
      const steps = computeTrackingSteps("preparing", {
        placedAt: "2026-03-22T00:00:00.000Z",
        confirmedAt: "2026-03-22T00:01:00.000Z",
        preparingAt: "2026-03-22T00:05:00.000Z",
        readyAt: null,
        completedAt: null,
      });
      expect(steps[0].state).toBe("completed");
      expect(steps[1].state).toBe("completed");
      expect(steps[2].state).toBe("current");
      expect(steps[3].state).toBe("upcoming");
      expect(steps[4].state).toBe("upcoming");
    });

    it("computes tracking steps for a completed order", () => {
      const steps = computeTrackingSteps("completed", {
        placedAt: "2026-03-22T00:00:00.000Z",
        confirmedAt: "2026-03-22T00:01:00.000Z",
        preparingAt: "2026-03-22T00:05:00.000Z",
        readyAt: "2026-03-22T00:15:00.000Z",
        completedAt: "2026-03-22T00:20:00.000Z",
      });
      expect(steps[0].state).toBe("completed");
      expect(steps[1].state).toBe("completed");
      expect(steps[2].state).toBe("completed");
      expect(steps[3].state).toBe("completed");
      expect(steps[4].state).toBe("current");
    });

    it("computes tracking steps for a cancelled order", () => {
      const steps = computeTrackingSteps("cancelled", {
        placedAt: "2026-03-22T00:00:00.000Z",
        confirmedAt: "2026-03-22T00:01:00.000Z",
        preparingAt: null,
        readyAt: null,
        completedAt: null,
      });
      expect(steps[0].state).toBe("completed"); // had timestamp
      expect(steps[1].state).toBe("completed"); // had timestamp
      expect(steps[2].state).toBe("skipped");
      expect(steps[3].state).toBe("skipped");
      expect(steps[4].state).toBe("skipped");
    });

    it("getCurrentTrackingStepIndex returns correct index", () => {
      expect(getCurrentTrackingStepIndex("placed")).toBe(0);
      expect(getCurrentTrackingStepIndex("confirmed")).toBe(1);
      expect(getCurrentTrackingStepIndex("preparing")).toBe(2);
      expect(getCurrentTrackingStepIndex("ready")).toBe(3);
      expect(getCurrentTrackingStepIndex("completed")).toBe(4);
      expect(getCurrentTrackingStepIndex("cancelled")).toBe(-1);
      expect(getCurrentTrackingStepIndex("draft")).toBe(-1);
    });

    it("OrderTrackingData has complete shape", () => {
      const data: OrderTrackingData = {
        orderId: "order-1",
        status: "preparing",
        isCancelled: false,
        steps: computeTrackingSteps("preparing", {
          placedAt: "2026-03-22T00:00:00.000Z",
          confirmedAt: "2026-03-22T00:01:00.000Z",
          preparingAt: "2026-03-22T00:05:00.000Z",
          readyAt: null,
          completedAt: null,
        }),
        currentStepIndex: 2,
        customerInfoCard: {
          customerName: "John Doe",
          customerEmail: "john@example.com",
          customerPhone: "555-1234",
          fulfillmentMode: "pickup",
          deliveryAddress: null,
        },
        receipt: {
          items: [],
          subtotalCents: 2500,
          discountCents: 0,
          taxCents: 250,
          tipCents: 300,
          deliveryFeeCents: 0,
          totalCents: 3050,
          promoCode: null,
        },
      };
      expect(data.currentStepIndex).toBe(2);
      expect(data.isCancelled).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Quick actions (E7-S2-T4)
  // -----------------------------------------------------------------------

  describe("order quick actions", () => {
    it("placed order has Confirm Order action", () => {
      const actions = getOrderQuickActions("placed");
      expect(actions).toHaveLength(1);
      expect(actions[0].targetStatus).toBe("confirmed");
      expect(actions[0].label).toBe("Confirm Order");
    });

    it("confirmed order has Start Prep action", () => {
      const actions = getOrderQuickActions("confirmed");
      expect(actions).toHaveLength(1);
      expect(actions[0].targetStatus).toBe("preparing");
      expect(actions[0].label).toBe("Start Prep");
    });

    it("preparing order has Mark Ready action", () => {
      const actions = getOrderQuickActions("preparing");
      expect(actions).toHaveLength(1);
      expect(actions[0].targetStatus).toBe("ready");
      expect(actions[0].label).toBe("Mark Ready");
    });

    it("ready order has Complete action", () => {
      const actions = getOrderQuickActions("ready");
      expect(actions).toHaveLength(1);
      expect(actions[0].targetStatus).toBe("completed");
      expect(actions[0].label).toBe("Complete");
    });

    it("completed order has no quick actions", () => {
      expect(getOrderQuickActions("completed")).toEqual([]);
    });

    it("cancelled order has no quick actions", () => {
      expect(getOrderQuickActions("cancelled")).toEqual([]);
    });

    it("draft order has Place Order action", () => {
      const actions = getOrderQuickActions("draft");
      expect(actions).toHaveLength(1);
      expect(actions[0].targetStatus).toBe("placed");
      expect(actions[0].label).toBe("Place Order");
    });
  });

  // -----------------------------------------------------------------------
  // Time-ago formatting (E7-S2-T5)
  // -----------------------------------------------------------------------

  describe("formatTimeAgo", () => {
    const baseTime = new Date("2026-03-22T12:00:00.000Z").getTime();

    it("returns 'just now' for very recent times", () => {
      const timestamp = new Date(baseTime - 30 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("just now");
    });

    it("returns '1 min ago' for 60 seconds", () => {
      const timestamp = new Date(baseTime - 60 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("1 min ago");
    });

    it("returns '5 mins ago' for 5 minutes", () => {
      const timestamp = new Date(baseTime - 5 * 60 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("5 mins ago");
    });

    it("returns '1 hour ago' for 1 hour", () => {
      const timestamp = new Date(baseTime - 60 * 60 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("1 hour ago");
    });

    it("returns '3 hours ago' for 3 hours", () => {
      const timestamp = new Date(baseTime - 3 * 60 * 60 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("3 hours ago");
    });

    it("returns '1 day ago' for 24 hours", () => {
      const timestamp = new Date(baseTime - 24 * 60 * 60 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("1 day ago");
    });

    it("returns '7 days ago' for 7 days", () => {
      const timestamp = new Date(baseTime - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("7 days ago");
    });

    it("returns '1 month ago' for ~30 days", () => {
      const timestamp = new Date(baseTime - 31 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("1 month ago");
    });

    it("returns '1 year ago' for ~365 days", () => {
      const timestamp = new Date(baseTime - 366 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("1 year ago");
    });

    it("returns 'just now' for future timestamps", () => {
      const timestamp = new Date(baseTime + 60 * 1000).toISOString();
      expect(formatTimeAgo(timestamp, baseTime)).toBe("just now");
    });
  });

  // -----------------------------------------------------------------------
  // Order display timestamp (E7-S2-T5)
  // -----------------------------------------------------------------------

  describe("getOrderDisplayTimestamp", () => {
    it("returns most recent state timestamp", () => {
      expect(
        getOrderDisplayTimestamp({
          placedAt: "2026-03-22T00:00:00.000Z",
          confirmedAt: "2026-03-22T00:01:00.000Z",
          preparingAt: "2026-03-22T00:05:00.000Z",
          readyAt: null,
          completedAt: null,
          cancelledAt: null,
          createdAt: "2026-03-21T23:59:00.000Z",
        })
      ).toBe("2026-03-22T00:05:00.000Z");
    });

    it("returns createdAt when no state timestamps exist", () => {
      expect(
        getOrderDisplayTimestamp({
          placedAt: null,
          confirmedAt: null,
          preparingAt: null,
          readyAt: null,
          completedAt: null,
          cancelledAt: null,
          createdAt: "2026-03-22T00:00:00.000Z",
        })
      ).toBe("2026-03-22T00:00:00.000Z");
    });

    it("returns cancelledAt for cancelled orders", () => {
      expect(
        getOrderDisplayTimestamp({
          placedAt: "2026-03-22T00:00:00.000Z",
          confirmedAt: "2026-03-22T00:01:00.000Z",
          preparingAt: null,
          readyAt: null,
          completedAt: null,
          cancelledAt: "2026-03-22T00:10:00.000Z",
          createdAt: "2026-03-21T23:59:00.000Z",
        })
      ).toBe("2026-03-22T00:10:00.000Z");
    });
  });
});
