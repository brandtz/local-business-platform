import { describe, it, expect } from "vitest";
import type { OrderTrackingData } from "@platform/types";
import { computeTrackingSteps, getCurrentTrackingStepIndex } from "@platform/types";
import {
	buildOrderTrackingViewModel,
	formatReceiptCents
} from "./order-tracking";

function sampleTrackingData(
	overrides?: Partial<OrderTrackingData>
): OrderTrackingData {
	return {
		orderId: "order-1",
		status: "placed",
		isCancelled: false,
		steps: computeTrackingSteps("placed", {
			placedAt: "2026-03-22T11:50:00.000Z",
			confirmedAt: null,
			preparingAt: null,
			readyAt: null,
			completedAt: null
		}),
		currentStepIndex: 0,
		customerInfoCard: {
			customerName: "John Doe",
			customerEmail: "john@example.com",
			customerPhone: "555-1234",
			fulfillmentMode: "pickup",
			deliveryAddress: null
		},
		receipt: {
			items: [
				{
					id: "item-1",
					catalogItemId: "cat-1",
					catalogItemName: "Cheeseburger",
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
			promoCode: null
		},
		...overrides
	};
}

describe("Order Tracking", () => {
	const baseTime = new Date("2026-03-22T12:00:00.000Z").getTime();

	// -----------------------------------------------------------------------
	// buildOrderTrackingViewModel
	// -----------------------------------------------------------------------

	describe("buildOrderTrackingViewModel", () => {
		it("builds complete view model for placed order", () => {
			const vm = buildOrderTrackingViewModel(
				sampleTrackingData(),
				baseTime
			);
			expect(vm.orderId).toBe("order-1");
			expect(vm.isCancelled).toBe(false);
			expect(vm.progressBar).toHaveLength(5);
			expect(vm.progressBar[0].label).toBe("Order Placed");
			expect(vm.progressBar[0].state).toBe("current");
			expect(vm.statusMessage).toBe(
				"Your order has been placed and is waiting to be confirmed."
			);
		});

		it("calculates progress percent for placed order (1/5)", () => {
			const vm = buildOrderTrackingViewModel(
				sampleTrackingData(),
				baseTime
			);
			expect(vm.progressPercent).toBe(20);
		});

		it("calculates progress percent for preparing order (3/5)", () => {
			const data = sampleTrackingData({
				status: "preparing",
				steps: computeTrackingSteps("preparing", {
					placedAt: "2026-03-22T11:50:00.000Z",
					confirmedAt: "2026-03-22T11:51:00.000Z",
					preparingAt: "2026-03-22T11:55:00.000Z",
					readyAt: null,
					completedAt: null
				}),
				currentStepIndex: 2
			});
			const vm = buildOrderTrackingViewModel(data, baseTime);
			expect(vm.progressPercent).toBe(60);
		});

		it("calculates progress percent for completed order (5/5)", () => {
			const data = sampleTrackingData({
				status: "completed",
				steps: computeTrackingSteps("completed", {
					placedAt: "2026-03-22T11:50:00.000Z",
					confirmedAt: "2026-03-22T11:51:00.000Z",
					preparingAt: "2026-03-22T11:55:00.000Z",
					readyAt: "2026-03-22T11:58:00.000Z",
					completedAt: "2026-03-22T12:00:00.000Z"
				}),
				currentStepIndex: 4
			});
			const vm = buildOrderTrackingViewModel(data, baseTime);
			expect(vm.progressPercent).toBe(100);
		});

		it("builds receipt with formatted prices", () => {
			const vm = buildOrderTrackingViewModel(
				sampleTrackingData(),
				baseTime
			);
			expect(vm.receipt.totalFormatted).toBe("$28.28");
			expect(vm.receipt.subtotalFormatted).toBe("$22.98");
			expect(vm.receipt.items).toHaveLength(1);
			expect(vm.receipt.items[0].name).toBe("Cheeseburger");
			expect(vm.receipt.items[0].quantity).toBe(2);
			expect(vm.receipt.items[0].lineTotalFormatted).toBe("$19.98");
			expect(vm.receipt.items[0].modifiers).toEqual(["Extra Cheese"]);
		});

		it("builds customer info card for pickup", () => {
			const vm = buildOrderTrackingViewModel(
				sampleTrackingData(),
				baseTime
			);
			expect(vm.customerInfo.customerName).toBe("John Doe");
			expect(vm.customerInfo.customerEmail).toBe("john@example.com");
			expect(vm.customerInfo.fulfillmentLabel).toBe("Pickup");
			expect(vm.customerInfo.deliveryAddress).toBeNull();
		});

		it("builds customer info card for delivery", () => {
			const data = sampleTrackingData({
				customerInfoCard: {
					customerName: "Jane",
					customerEmail: null,
					customerPhone: null,
					fulfillmentMode: "delivery",
					deliveryAddress: {
						line1: "123 Main St",
						line2: "Apt 4",
						city: "Springfield",
						state: "IL",
						zip: "62701"
					}
				}
			});
			const vm = buildOrderTrackingViewModel(data, baseTime);
			expect(vm.customerInfo.fulfillmentLabel).toBe("Delivery");
			expect(vm.customerInfo.deliveryAddress).toBe(
				"123 Main St, Apt 4, Springfield, IL 62701"
			);
		});

		it("shows Guest for null customer name", () => {
			const data = sampleTrackingData({
				customerInfoCard: {
					customerName: null,
					customerEmail: null,
					customerPhone: null,
					fulfillmentMode: "pickup",
					deliveryAddress: null
				}
			});
			const vm = buildOrderTrackingViewModel(data, baseTime);
			expect(vm.customerInfo.customerName).toBe("Guest");
		});

		it("handles cancelled order", () => {
			const data = sampleTrackingData({
				status: "cancelled",
				isCancelled: true,
				steps: computeTrackingSteps("cancelled", {
					placedAt: "2026-03-22T11:50:00.000Z",
					confirmedAt: null,
					preparingAt: null,
					readyAt: null,
					completedAt: null
				}),
				currentStepIndex: -1
			});
			const vm = buildOrderTrackingViewModel(data, baseTime);
			expect(vm.isCancelled).toBe(true);
			expect(vm.statusMessage).toBe("Your order has been cancelled.");
			expect(vm.progressBar[0].state).toBe("completed");
			expect(vm.progressBar[1].state).toBe("skipped");
		});

		it("includes time ago for progress bar steps", () => {
			const data = sampleTrackingData({
				status: "preparing",
				steps: computeTrackingSteps("preparing", {
					placedAt: "2026-03-22T11:50:00.000Z",
					confirmedAt: "2026-03-22T11:51:00.000Z",
					preparingAt: "2026-03-22T11:55:00.000Z",
					readyAt: null,
					completedAt: null
				})
			});
			const vm = buildOrderTrackingViewModel(data, baseTime);
			expect(vm.progressBar[0].timeAgo).toBe("10 mins ago");
			expect(vm.progressBar[1].timeAgo).toBe("9 mins ago");
			expect(vm.progressBar[2].timeAgo).toBe("5 mins ago");
			expect(vm.progressBar[3].timeAgo).toBeNull();
		});

		it("includes promo code in receipt", () => {
			const data = sampleTrackingData({
				receipt: {
					...sampleTrackingData().receipt,
					promoCode: "SAVE20",
					discountCents: 500
				}
			});
			const vm = buildOrderTrackingViewModel(data, baseTime);
			expect(vm.receipt.promoCode).toBe("SAVE20");
			expect(vm.receipt.discountFormatted).toBe("$5.00");
		});
	});

	// -----------------------------------------------------------------------
	// formatReceiptCents
	// -----------------------------------------------------------------------

	describe("formatReceiptCents", () => {
		it("formats zero", () => {
			expect(formatReceiptCents(0)).toBe("$0.00");
		});

		it("formats whole dollars", () => {
			expect(formatReceiptCents(2500)).toBe("$25.00");
		});

		it("formats cents", () => {
			expect(formatReceiptCents(999)).toBe("$9.99");
		});
	});
});
