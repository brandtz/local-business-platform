import { describe, it, expect } from "vitest";
import type { AdminOrderSummary, AdminOrderDetail, OrderPipelineCounts } from "@platform/types";
import {
  getOrderStatusBadge,
  getFulfillmentModeLabel,
  buildPipelineView,
  buildOrderListRow,
  buildOrderDetailViewModel,
  formatCents,
  formatAddress,
} from "./order-management";

describe("Order Management Views", () => {
  // -----------------------------------------------------------------------
  // Status badges
  // -----------------------------------------------------------------------

  describe("getOrderStatusBadge", () => {
    it("returns badge for placed status", () => {
      const badge = getOrderStatusBadge("placed");
      expect(badge.status).toBe("placed");
      expect(badge.label).toBe("New");
      expect(badge.colorClass).toBe("badge-info");
    });

    it("returns badge for confirmed status", () => {
      const badge = getOrderStatusBadge("confirmed");
      expect(badge.label).toBe("Confirmed");
      expect(badge.colorClass).toBe("badge-primary");
    });

    it("returns badge for preparing status", () => {
      const badge = getOrderStatusBadge("preparing");
      expect(badge.label).toBe("Preparing");
      expect(badge.colorClass).toBe("badge-warning");
    });

    it("returns badge for ready status", () => {
      const badge = getOrderStatusBadge("ready");
      expect(badge.label).toBe("Ready");
      expect(badge.colorClass).toBe("badge-success");
    });

    it("returns badge for completed status", () => {
      const badge = getOrderStatusBadge("completed");
      expect(badge.label).toBe("Completed");
      expect(badge.colorClass).toBe("badge-muted");
    });

    it("returns badge for cancelled status", () => {
      const badge = getOrderStatusBadge("cancelled");
      expect(badge.label).toBe("Cancelled");
      expect(badge.colorClass).toBe("badge-danger");
    });

    it("returns badge for draft status", () => {
      const badge = getOrderStatusBadge("draft");
      expect(badge.label).toBe("Draft");
      expect(badge.colorClass).toBe("badge-neutral");
    });
  });

  // -----------------------------------------------------------------------
  // Fulfillment mode labels
  // -----------------------------------------------------------------------

  describe("getFulfillmentModeLabel", () => {
    it("returns Delivery for delivery", () => {
      expect(getFulfillmentModeLabel("delivery")).toBe("Delivery");
    });

    it("returns Pickup for pickup", () => {
      expect(getFulfillmentModeLabel("pickup")).toBe("Pickup");
    });

    it("returns Dine-In for dine-in", () => {
      expect(getFulfillmentModeLabel("dine-in")).toBe("Dine-In");
    });
  });

  // -----------------------------------------------------------------------
  // Pipeline view
  // -----------------------------------------------------------------------

  describe("buildPipelineView", () => {
    it("builds pipeline entries from counts", () => {
      const pipeline: OrderPipelineCounts = {
        counts: [
          { status: "draft", count: 0 },
          { status: "placed", count: 12 },
          { status: "confirmed", count: 5 },
          { status: "preparing", count: 3 },
          { status: "ready", count: 2 },
          { status: "completed", count: 48 },
          { status: "cancelled", count: 1 },
        ],
        total: 71,
      };

      const view = buildPipelineView(pipeline);
      expect(view).toHaveLength(7);
      expect(view[1]).toEqual({
        status: "placed",
        label: "New",
        count: 12,
        colorClass: "badge-info",
      });
      expect(view[5]).toEqual({
        status: "completed",
        label: "Completed",
        count: 48,
        colorClass: "badge-muted",
      });
    });
  });

  // -----------------------------------------------------------------------
  // Order list row
  // -----------------------------------------------------------------------

  describe("buildOrderListRow", () => {
    const baseTime = new Date("2026-03-22T12:00:00.000Z").getTime();

    it("builds list row from order summary", () => {
      const summary: AdminOrderSummary = {
        id: "order-1",
        createdAt: "2026-03-22T11:55:00.000Z",
        status: "placed",
        fulfillmentMode: "pickup",
        customerName: "John Doe",
        totalCents: 2500,
        itemCount: 3,
        placedAt: "2026-03-22T11:55:00.000Z",
      };

      const row = buildOrderListRow(summary, baseTime);
      expect(row.id).toBe("order-1");
      expect(row.statusBadge.label).toBe("New");
      expect(row.fulfillmentLabel).toBe("Pickup");
      expect(row.customerName).toBe("John Doe");
      expect(row.totalFormatted).toBe("$25.00");
      expect(row.itemCount).toBe(3);
      expect(row.timeAgo).toBe("5 mins ago");
    });

    it("shows Guest for null customer name", () => {
      const summary: AdminOrderSummary = {
        id: "order-1",
        createdAt: "2026-03-22T11:55:00.000Z",
        status: "placed",
        fulfillmentMode: "pickup",
        customerName: null,
        totalCents: 1000,
        itemCount: 1,
        placedAt: "2026-03-22T11:55:00.000Z",
      };

      const row = buildOrderListRow(summary, baseTime);
      expect(row.customerName).toBe("Guest");
    });

    it("uses createdAt when placedAt is null", () => {
      const summary: AdminOrderSummary = {
        id: "order-1",
        createdAt: "2026-03-22T11:00:00.000Z",
        status: "draft",
        fulfillmentMode: "pickup",
        customerName: "Jane",
        totalCents: 500,
        itemCount: 1,
        placedAt: null,
      };

      const row = buildOrderListRow(summary, baseTime);
      expect(row.timeAgo).toBe("1 hour ago");
    });
  });

  // -----------------------------------------------------------------------
  // Order detail view model
  // -----------------------------------------------------------------------

  describe("buildOrderDetailViewModel", () => {
    const baseTime = new Date("2026-03-22T12:00:00.000Z").getTime();

    function sampleDetail(overrides?: Partial<AdminOrderDetail>): AdminOrderDetail {
      return {
        id: "order-1",
        createdAt: "2026-03-22T11:50:00.000Z",
        updatedAt: "2026-03-22T11:50:00.000Z",
        status: "placed",
        fulfillmentMode: "pickup",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "555-1234",
        deliveryAddress: null,
        orderNotes: "No onions",
        subtotalCents: 2500,
        discountCents: 500,
        taxCents: 200,
        tipCents: 300,
        deliveryFeeCents: 0,
        totalCents: 2500,
        promoCode: "SAVE20",
        loyaltyCode: null,
        items: [
          {
            id: "item-1",
            catalogItemId: "cat-1",
            catalogItemName: "Burger",
            variantId: null,
            variantName: null,
            quantity: 2,
            unitPriceCents: 999,
            lineTotalCents: 1998,
            modifiers: [
              {
                id: "mod-1",
                modifierOptionId: "opt-1",
                modifierName: "Extra Cheese",
                priceCents: 150,
              },
            ],
          },
        ],
        placedAt: "2026-03-22T11:50:00.000Z",
        confirmedAt: null,
        preparingAt: null,
        readyAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        allowedTransitions: ["confirmed", "cancelled"],
        ...overrides,
      };
    }

    it("builds complete detail view model", () => {
      const vm = buildOrderDetailViewModel(sampleDetail(), baseTime);
      expect(vm.id).toBe("order-1");
      expect(vm.statusBadge.label).toBe("New");
      expect(vm.fulfillmentLabel).toBe("Pickup");
      expect(vm.customerName).toBe("John Doe");
      expect(vm.customerEmail).toBe("john@example.com");
      expect(vm.totalFormatted).toBe("$25.00");
      expect(vm.items).toHaveLength(1);
      expect(vm.items[0].catalogItemName).toBe("Burger");
      expect(vm.items[0].unitPriceFormatted).toBe("$9.99");
      expect(vm.items[0].modifiers).toHaveLength(1);
      expect(vm.items[0].modifiers[0].priceFormatted).toBe("$1.50");
    });

    it("includes quick actions for placed order", () => {
      const vm = buildOrderDetailViewModel(sampleDetail(), baseTime);
      expect(vm.quickActions).toHaveLength(1);
      expect(vm.quickActions[0].label).toBe("Confirm Order");
      expect(vm.canCancel).toBe(true);
    });

    it("includes Start Prep for confirmed order", () => {
      const vm = buildOrderDetailViewModel(
        sampleDetail({
          status: "confirmed",
          confirmedAt: "2026-03-22T11:51:00.000Z",
          allowedTransitions: ["preparing", "cancelled"],
        }),
        baseTime
      );
      expect(vm.quickActions).toHaveLength(1);
      expect(vm.quickActions[0].label).toBe("Start Prep");
      expect(vm.canCancel).toBe(true);
    });

    it("no quick actions for completed order", () => {
      const vm = buildOrderDetailViewModel(
        sampleDetail({
          status: "completed",
          completedAt: "2026-03-22T11:55:00.000Z",
          allowedTransitions: [],
        }),
        baseTime
      );
      expect(vm.quickActions).toHaveLength(0);
      expect(vm.canCancel).toBe(false);
    });

    it("formats delivery address", () => {
      const vm = buildOrderDetailViewModel(
        sampleDetail({
          fulfillmentMode: "delivery",
          deliveryAddress: {
            line1: "123 Main St",
            line2: "Apt 4",
            city: "Springfield",
            state: "IL",
            zip: "62701",
          },
        }),
        baseTime
      );
      expect(vm.deliveryAddress).toBe("123 Main St, Apt 4, Springfield, IL 62701");
    });

    it("shows time ago based on latest state timestamp", () => {
      const vm = buildOrderDetailViewModel(
        sampleDetail({
          status: "confirmed",
          confirmedAt: "2026-03-22T11:58:00.000Z",
        }),
        baseTime
      );
      expect(vm.timeAgo).toBe("2 mins ago");
    });
  });

  // -----------------------------------------------------------------------
  // Formatting helpers
  // -----------------------------------------------------------------------

  describe("formatCents", () => {
    it("formats zero", () => {
      expect(formatCents(0)).toBe("$0.00");
    });

    it("formats whole dollars", () => {
      expect(formatCents(2500)).toBe("$25.00");
    });

    it("formats cents", () => {
      expect(formatCents(999)).toBe("$9.99");
    });

    it("formats large amounts", () => {
      expect(formatCents(123456)).toBe("$1234.56");
    });

    it("formats negative amounts", () => {
      expect(formatCents(-500)).toBe("-$5.00");
    });
  });

  describe("formatAddress", () => {
    it("formats address without line2", () => {
      expect(
        formatAddress({
          line1: "123 Main St",
          line2: null,
          city: "Springfield",
          state: "IL",
          zip: "62701",
        })
      ).toBe("123 Main St, Springfield, IL 62701");
    });

    it("formats address with line2", () => {
      expect(
        formatAddress({
          line1: "123 Main St",
          line2: "Apt 4",
          city: "Springfield",
          state: "IL",
          zip: "62701",
        })
      ).toBe("123 Main St, Apt 4, Springfield, IL 62701");
    });
  });
});
