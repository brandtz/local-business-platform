import { describe, it, expect } from "vitest";

import type {
	DashboardAnalyticsWidgetData,
	DashboardKpiCard,
	DashboardRevenueChartData,
	DashboardTrafficChartData,
} from "@platform/types";

import {
	analyticsWidgetIds,
	buildKpiCardDisplay,
	buildRevenueChartDisplay,
	buildTrafficChartDisplay,
	buildDashboardAnalyticsDisplayData,
} from "./analytics-dashboard-widgets";

// ─── Test Data ───────────────────────────────────────────────────────────────

const sampleKpiCard: DashboardKpiCard = {
	label: "Revenue",
	valueCents: 210000,
	trend: "up",
	changePercent: 12.5,
};

const sampleRevenueChart: DashboardRevenueChartData = {
	points: [
		{ period: "2026-01-01", value: 50000 },
		{ period: "2026-01-02", value: 60000 },
		{ period: "2026-01-03", value: 55000 },
	],
	periodType: "daily",
};

const sampleTrafficChart: DashboardTrafficChartData = {
	orderPoints: [
		{ period: "2026-01-01", value: 10 },
		{ period: "2026-01-02", value: 15 },
	],
	bookingPoints: [
		{ period: "2026-01-01", value: 5 },
		{ period: "2026-01-02", value: 8 },
	],
	periodType: "daily",
};

const sampleDashboardData: DashboardAnalyticsWidgetData = {
	kpiCards: [
		{ label: "Revenue", valueCents: 210000, trend: "up", changePercent: 12.5 },
		{ label: "Orders", valueCount: 1552, trend: "up", changePercent: 8.2 },
		{ label: "Bookings", valueCount: 340, trend: "down", changePercent: -3.1 },
		{ label: "Retention", valuePercent: 42.8, trend: "flat", changePercent: 0 },
	],
	revenueChart: sampleRevenueChart,
	trafficChart: sampleTrafficChart,
	lastUpdated: "2026-01-03T12:00:00Z",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("analytics-dashboard-widgets", () => {
	describe("analyticsWidgetIds", () => {
		it("defines all expected widget IDs", () => {
			expect(analyticsWidgetIds.kpiRevenue).toBe("analytics-kpi-revenue");
			expect(analyticsWidgetIds.kpiOrders).toBe("analytics-kpi-orders");
			expect(analyticsWidgetIds.kpiBookings).toBe("analytics-kpi-bookings");
			expect(analyticsWidgetIds.kpiRetention).toBe("analytics-kpi-retention");
			expect(analyticsWidgetIds.revenueChart).toBe("analytics-revenue-chart");
			expect(analyticsWidgetIds.trafficChart).toBe("analytics-traffic-chart");
		});
	});

	describe("buildKpiCardDisplay", () => {
		it("formats currency value for revenue card", () => {
			const display = buildKpiCardDisplay(sampleKpiCard, analyticsWidgetIds.kpiRevenue);

			expect(display.label).toBe("Revenue");
			expect(display.formattedValue).toBe("$2.1K");
			expect(display.trend).toBe("up");
			expect(display.changePercent).toBe(12.5);
			expect(display.trendLabel).toContain("+12.5%");
		});

		it("formats count value for orders card", () => {
			const card: DashboardKpiCard = {
				label: "Orders",
				valueCount: 1552,
				trend: "up",
				changePercent: 8.2,
			};
			const display = buildKpiCardDisplay(card, analyticsWidgetIds.kpiOrders);

			expect(display.formattedValue).toBe("1.6K");
		});

		it("formats percent value for retention card", () => {
			const card: DashboardKpiCard = {
				label: "Retention",
				valuePercent: 42.8,
				trend: "flat",
				changePercent: 0,
			};
			const display = buildKpiCardDisplay(card, analyticsWidgetIds.kpiRetention);

			expect(display.formattedValue).toBe("42.8%");
			expect(display.trendLabel).toContain("No change");
		});

		it("handles down trend", () => {
			const card: DashboardKpiCard = {
				label: "Bookings",
				valueCount: 300,
				trend: "down",
				changePercent: -5.5,
			};
			const display = buildKpiCardDisplay(card, analyticsWidgetIds.kpiBookings);

			expect(display.trendLabel).toContain("-5.5%");
		});

		it("returns dash for card with no value", () => {
			const card: DashboardKpiCard = {
				label: "Empty",
				trend: "flat",
				changePercent: 0,
			};
			const display = buildKpiCardDisplay(card, analyticsWidgetIds.kpiRevenue);

			expect(display.formattedValue).toBe("—");
		});
	});

	describe("buildRevenueChartDisplay", () => {
		it("transforms revenue chart data for display", () => {
			const display = buildRevenueChartDisplay(sampleRevenueChart);

			expect(display.widgetId).toBe("analytics-revenue-chart");
			expect(display.labels).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
			expect(display.values).toEqual([50000, 60000, 55000]);
			expect(display.periodType).toBe("daily");
		});
	});

	describe("buildTrafficChartDisplay", () => {
		it("transforms traffic chart data for display", () => {
			const display = buildTrafficChartDisplay(sampleTrafficChart);

			expect(display.widgetId).toBe("analytics-traffic-chart");
			expect(display.labels).toEqual(["2026-01-01", "2026-01-02"]);
			expect(display.orderValues).toEqual([10, 15]);
			expect(display.bookingValues).toEqual([5, 8]);
		});
	});

	describe("buildDashboardAnalyticsDisplayData", () => {
		it("transforms full dashboard data into display-ready format", () => {
			const display = buildDashboardAnalyticsDisplayData(sampleDashboardData);

			expect(display.kpiCards).toHaveLength(4);
			expect(display.kpiCards[0].widgetId).toBe("analytics-kpi-revenue");
			expect(display.kpiCards[1].widgetId).toBe("analytics-kpi-orders");
			expect(display.kpiCards[2].widgetId).toBe("analytics-kpi-bookings");
			expect(display.kpiCards[3].widgetId).toBe("analytics-kpi-retention");
			expect(display.revenueChart.widgetId).toBe("analytics-revenue-chart");
			expect(display.trafficChart.widgetId).toBe("analytics-traffic-chart");
			expect(display.lastUpdated).toBe("2026-01-03T12:00:00Z");
		});
	});
});
