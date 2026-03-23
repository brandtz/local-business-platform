// Tests for order detail page data transforms and workflow logic

import { describe, expect, it } from "vitest";

import {
	buildOrderDetailViewModel,
	formatCents,
	formatAddress,
} from "../order-management";
import type { AdminOrderDetail } from "@platform/types";
import { getOrderQuickActions, isOrderCancellable } from "@platform/types";

const NOW = new Date("2026-03-23T12:00:00Z").getTime();

function sampleOrderDetail(overrides?: Partial<AdminOrderDetail>): AdminOrderDetail {
	return {
		id: "order-1",
		createdAt: "2026-03-23T10:00:00Z",
		updatedAt: "2026-03-23T10:30:00Z",
		status: "placed",
		fulfillmentMode: "delivery",
		customerName: "John Doe",
		customerEmail: "john@example.com",
		customerPhone: "555-1234",
		deliveryAddress: {
			line1: "123 Main St",
			line2: null,
			city: "Springfield",
			state: "IL",
			zip: "62701",
		},
		orderNotes: "Ring doorbell",
		subtotalCents: 2000,
		discountCents: 0,
		taxCents: 180,
		tipCents: 300,
		deliveryFeeCents: 500,
		totalCents: 2980,
		promoCode: null,
		loyaltyCode: null,
		items: [
			{
				id: "item-1",
				catalogItemId: "prod-1",
				catalogItemName: "Burger",
				variantId: null,
				variantName: null,
				quantity: 2,
				unitPriceCents: 900,
				lineTotalCents: 1800,
				modifiers: [
					{ id: "mod-1", modifierOptionId: "opt-1", modifierName: "Extra Cheese", priceCents: 100 },
				],
			},
		],
		placedAt: "2026-03-23T10:00:00Z",
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

describe("OrderDetailPage helpers", () => {
	describe("order detail view model", () => {
		it("builds complete view model from detail", () => {
			const vm = buildOrderDetailViewModel(sampleOrderDetail(), NOW);
			expect(vm.id).toBe("order-1");
			expect(vm.statusBadge.status).toBe("placed");
			expect(vm.customerName).toBe("John Doe");
			expect(vm.customerEmail).toBe("john@example.com");
			expect(vm.totalFormatted).toBe("$29.80");
			expect(vm.subtotalFormatted).toBe("$20.00");
			expect(vm.taxFormatted).toBe("$1.80");
			expect(vm.tipFormatted).toBe("$3.00");
			expect(vm.deliveryFeeFormatted).toBe("$5.00");
		});

		it("includes line items with modifiers", () => {
			const vm = buildOrderDetailViewModel(sampleOrderDetail(), NOW);
			expect(vm.items).toHaveLength(1);
			expect(vm.items[0]!.catalogItemName).toBe("Burger");
			expect(vm.items[0]!.quantity).toBe(2);
			expect(vm.items[0]!.modifiers).toHaveLength(1);
			expect(vm.items[0]!.modifiers[0]!.modifierName).toBe("Extra Cheese");
		});

		it("formats delivery address", () => {
			const vm = buildOrderDetailViewModel(sampleOrderDetail(), NOW);
			expect(vm.deliveryAddress).toContain("123 Main St");
			expect(vm.deliveryAddress).toContain("Springfield");
		});
	});

	describe("status workflow buttons", () => {
		it("placed order has Confirm action", () => {
			const actions = getOrderQuickActions("placed");
			expect(actions.some((a) => a.targetStatus === "confirmed")).toBe(true);
		});

		it("confirmed order has Start Prep action", () => {
			const actions = getOrderQuickActions("confirmed");
			expect(actions.some((a) => a.targetStatus === "preparing")).toBe(true);
		});

		it("preparing order has Mark Ready action", () => {
			const actions = getOrderQuickActions("preparing");
			expect(actions.some((a) => a.targetStatus === "ready")).toBe(true);
		});

		it("ready order has Complete action", () => {
			const actions = getOrderQuickActions("ready");
			expect(actions.some((a) => a.targetStatus === "completed")).toBe(true);
		});

		it("completed order has no forward actions", () => {
			const actions = getOrderQuickActions("completed");
			expect(actions).toHaveLength(0);
		});

		it("cancelled order has no actions", () => {
			const actions = getOrderQuickActions("cancelled");
			expect(actions).toHaveLength(0);
		});
	});

	describe("cancellation rules", () => {
		it("placed orders are cancellable", () => {
			expect(isOrderCancellable("placed")).toBe(true);
		});

		it("confirmed orders are cancellable", () => {
			expect(isOrderCancellable("confirmed")).toBe(true);
		});

		it("preparing orders are cancellable", () => {
			expect(isOrderCancellable("preparing")).toBe(true);
		});

		it("ready orders are not cancellable", () => {
			expect(isOrderCancellable("ready")).toBe(false);
		});

		it("completed orders are not cancellable", () => {
			expect(isOrderCancellable("completed")).toBe(false);
		});
	});

	describe("pricing breakdown", () => {
		it("formats currency amounts correctly", () => {
			expect(formatCents(2500)).toBe("$25.00");
			expect(formatCents(0)).toBe("$0.00");
			expect(formatCents(99)).toBe("$0.99");
			expect(formatCents(100000)).toBe("$1000.00");
		});

		it("handles negative amounts", () => {
			expect(formatCents(-500)).toBe("-$5.00");
		});
	});

	describe("address formatting", () => {
		it("formats address without line2", () => {
			const address = formatAddress({
				line1: "123 Main St",
				line2: null,
				city: "Springfield",
				state: "IL",
				zip: "62701",
			});
			expect(address).toBe("123 Main St, Springfield, IL 62701");
		});

		it("formats address with line2", () => {
			const address = formatAddress({
				line1: "123 Main St",
				line2: "Apt 4",
				city: "Springfield",
				state: "IL",
				zip: "62701",
			});
			expect(address).toBe("123 Main St, Apt 4, Springfield, IL 62701");
		});
	});
});
