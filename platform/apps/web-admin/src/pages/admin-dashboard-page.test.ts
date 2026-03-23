// Tests for admin dashboard page rendering logic

import { describe, expect, it } from "vitest";

import { buildKpiCardDisplay, analyticsWidgetIds } from "../analytics-dashboard-widgets";
import { buildOrderListRow } from "../order-management";
import type { DashboardKpiCard } from "@platform/types";
import type { AdminOrderSummary } from "@platform/types";

describe("admin dashboard page data transforms", () => {
	it("transforms KPI cards for dashboard display", () => {
		const card: DashboardKpiCard = {
			label: "Today's Revenue",
			valueCents: 125000,
			trend: "up",
			changePercent: 12.5,
		};

		const display = buildKpiCardDisplay(card, analyticsWidgetIds.kpiRevenue);

		expect(display.widgetId).toBe(analyticsWidgetIds.kpiRevenue);
		expect(display.label).toBe("Today's Revenue");
		expect(display.trend).toBe("up");
		expect(display.changePercent).toBe(12.5);
		expect(display.formattedValue).toBeTruthy();
		expect(display.trendLabel).toContain("12.5%");
	});

	it("transforms order summaries for recent orders table", () => {
		const order: AdminOrderSummary = {
			id: "order-1",
			status: "placed",
			fulfillmentMode: "delivery",
			customerName: "John Doe",
			totalCents: 2500,
			itemCount: 3,
			placedAt: "2026-03-23T10:00:00Z",
			createdAt: "2026-03-23T10:00:00Z",
		};

		const row = buildOrderListRow(order);

		expect(row.id).toBe("order-1");
		expect(row.customerName).toBe("John Doe");
		expect(row.statusBadge.label).toBeTruthy();
		expect(row.totalFormatted).toContain("25");
	});

	it("maps multiple KPI widget IDs correctly", () => {
		const cards: DashboardKpiCard[] = [
			{ label: "Revenue", valueCents: 100000, trend: "up", changePercent: 5 },
			{ label: "Orders", valueCount: 42, trend: "up", changePercent: 8 },
			{ label: "Bookings", valueCount: 15, trend: "down", changePercent: 3 },
			{ label: "Retention", valuePercent: 85, trend: "flat", changePercent: 0 },
		];

		const widgetIds = [
			analyticsWidgetIds.kpiRevenue,
			analyticsWidgetIds.kpiOrders,
			analyticsWidgetIds.kpiBookings,
			analyticsWidgetIds.kpiRetention,
		];

		const displays = cards.map((card, i) =>
			buildKpiCardDisplay(card, widgetIds[i]!),
		);

		expect(displays).toHaveLength(4);
		expect(displays[0]!.widgetId).toBe("analytics-kpi-revenue");
		expect(displays[1]!.widgetId).toBe("analytics-kpi-orders");
		expect(displays[2]!.widgetId).toBe("analytics-kpi-bookings");
		expect(displays[3]!.widgetId).toBe("analytics-kpi-retention");
	});
});
