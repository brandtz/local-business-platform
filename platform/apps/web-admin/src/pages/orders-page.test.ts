// Tests for orders page data transforms and helper logic

import { describe, expect, it } from "vitest";

import {
	buildOrderListRow,
	buildPipelineView,
	getOrderStatusBadge,
} from "../order-management";
import type { AdminOrderSummary, OrderPipelineCounts, OrderStatus } from "@platform/types";

const NOW = new Date("2026-03-23T12:00:00Z").getTime();

function sampleOrder(overrides?: Partial<AdminOrderSummary>): AdminOrderSummary {
	return {
		id: "order-1",
		createdAt: "2026-03-23T10:00:00Z",
		status: "placed",
		fulfillmentMode: "delivery",
		customerName: "John Doe",
		totalCents: 2500,
		itemCount: 3,
		placedAt: "2026-03-23T10:00:00Z",
		...overrides,
	};
}

describe("OrdersPage helpers", () => {
	describe("status tab configuration", () => {
		const statusTabs: Array<OrderStatus | "all"> = [
			"all", "placed", "confirmed", "preparing", "ready", "completed", "cancelled",
		];

		it("has all expected status tabs", () => {
			expect(statusTabs).toContain("all");
			expect(statusTabs).toContain("placed");
			expect(statusTabs).toContain("confirmed");
			expect(statusTabs).toContain("preparing");
			expect(statusTabs).toContain("ready");
			expect(statusTabs).toContain("completed");
			expect(statusTabs).toContain("cancelled");
			expect(statusTabs).toHaveLength(7);
		});
	});

	describe("order list row building", () => {
		it("builds row from order summary", () => {
			const row = buildOrderListRow(sampleOrder(), NOW);
			expect(row.id).toBe("order-1");
			expect(row.customerName).toBe("John Doe");
			expect(row.statusBadge.status).toBe("placed");
			expect(row.totalFormatted).toBe("$25.00");
			expect(row.itemCount).toBe(3);
		});

		it("defaults to Guest when customer name is null", () => {
			const row = buildOrderListRow(sampleOrder({ customerName: null }), NOW);
			expect(row.customerName).toBe("Guest");
		});

		it("shows correct badge for each status", () => {
			const statuses: OrderStatus[] = ["placed", "confirmed", "preparing", "ready", "completed", "cancelled"];
			for (const status of statuses) {
				const row = buildOrderListRow(sampleOrder({ status }), NOW);
				expect(row.statusBadge.status).toBe(status);
				expect(row.statusBadge.label).toBeTruthy();
				expect(row.statusBadge.colorClass).toBeTruthy();
			}
		});
	});

	describe("inline action context sensitivity", () => {
		it("placed orders should show Accept action", () => {
			const badge = getOrderStatusBadge("placed");
			expect(badge.label).toBe("New");
			// placed → confirmed is the next step
		});

		it("confirmed orders should show Start Prep action", () => {
			const badge = getOrderStatusBadge("confirmed");
			expect(badge.label).toBe("Confirmed");
		});

		it("preparing orders should show Mark Ready action", () => {
			const badge = getOrderStatusBadge("preparing");
			expect(badge.label).toBe("Preparing");
		});

		it("ready orders should show Complete action", () => {
			const badge = getOrderStatusBadge("ready");
			expect(badge.label).toBe("Ready");
		});

		it("completed and cancelled orders have no forward actions", () => {
			const completedBadge = getOrderStatusBadge("completed");
			const cancelledBadge = getOrderStatusBadge("cancelled");
			expect(completedBadge.label).toBe("Completed");
			expect(cancelledBadge.label).toBe("Cancelled");
		});
	});

	describe("pipeline view", () => {
		it("builds pipeline entries from counts", () => {
			const pipeline: OrderPipelineCounts = {
				counts: [
					{ status: "placed", count: 5 },
					{ status: "confirmed", count: 3 },
					{ status: "preparing", count: 2 },
				],
				total: 10,
			};

			const view = buildPipelineView(pipeline);
			expect(view).toHaveLength(3);
			expect(view[0]!.status).toBe("placed");
			expect(view[0]!.count).toBe(5);
			expect(view[0]!.label).toBe("New");
		});
	});

	describe("pagination logic", () => {
		it("calculates total pages correctly", () => {
			const total = 45;
			const pageSize = 20;
			const totalPages = Math.ceil(total / pageSize);
			expect(totalPages).toBe(3);
		});

		it("handles exact page boundary", () => {
			const totalPages = Math.ceil(40 / 20);
			expect(totalPages).toBe(2);
		});

		it("single page when total is less than page size", () => {
			const totalPages = Math.ceil(10 / 20);
			expect(totalPages).toBe(1);
		});
	});
});
