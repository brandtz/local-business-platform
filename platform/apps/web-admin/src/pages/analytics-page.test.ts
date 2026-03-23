// Tests for analytics page data transforms, KPI display, and chart logic

import { describe, expect, it } from "vitest";

import {
	buildDashboardAnalyticsDisplayData,
	buildKpiCardDisplay,
	buildRevenueChartDisplay,
	buildTrafficChartDisplay,
	analyticsWidgetIds,
} from "../analytics-dashboard-widgets";
import {
	buildRevenuePerformanceViewModel,
	buildChannelBreakdownViewModel,
	buildTopPerformersViewModel,
	createInitialAnalyticsPageState,
} from "../analytics-detail-views";
import type {
	DashboardAnalyticsWidgetData,
	DashboardKpiCard,
	RevenueTimeSeriesResponse,
	ChannelBreakdownResponse,
	TopPerformersResponse,
	AnalyticsTimeFilter,
} from "@platform/types";

const TIME_FILTER: AnalyticsTimeFilter = { from: "2026-03-01", to: "2026-03-31" };

describe("AnalyticsPage helpers", () => {
	describe("dashboard data transforms", () => {
		const dashboardData: DashboardAnalyticsWidgetData = {
			kpiCards: [
				{ label: "Revenue", valueCents: 500000, trend: "up", changePercent: 12 },
				{ label: "Orders", valueCount: 150, trend: "up", changePercent: 8 },
				{ label: "Bookings", valueCount: 45, trend: "down", changePercent: 3 },
				{ label: "Retention", valuePercent: 82, trend: "flat", changePercent: 0 },
			],
			revenueChart: {
				points: [
					{ period: "Week 1", value: 120000 },
					{ period: "Week 2", value: 135000 },
					{ period: "Week 3", value: 110000 },
					{ period: "Week 4", value: 135000 },
				],
				periodType: "weekly",
			},
			trafficChart: {
				orderPoints: [
					{ period: "Week 1", value: 35 },
					{ period: "Week 2", value: 42 },
				],
				bookingPoints: [
					{ period: "Week 1", value: 12 },
					{ period: "Week 2", value: 15 },
				],
				periodType: "weekly",
			},
			lastUpdated: "2026-03-23T10:00:00Z",
		};

		it("builds full dashboard display data", () => {
			const display = buildDashboardAnalyticsDisplayData(dashboardData);
			expect(display.kpiCards).toHaveLength(4);
			expect(display.revenueChart.labels).toHaveLength(4);
			expect(display.trafficChart.labels).toHaveLength(2);
			expect(display.lastUpdated).toBe("2026-03-23T10:00:00Z");
		});

		it("maps KPI widget IDs correctly", () => {
			const display = buildDashboardAnalyticsDisplayData(dashboardData);
			expect(display.kpiCards[0]!.widgetId).toBe(analyticsWidgetIds.kpiRevenue);
			expect(display.kpiCards[1]!.widgetId).toBe(analyticsWidgetIds.kpiOrders);
			expect(display.kpiCards[2]!.widgetId).toBe(analyticsWidgetIds.kpiBookings);
			expect(display.kpiCards[3]!.widgetId).toBe(analyticsWidgetIds.kpiRetention);
		});
	});

	describe("KPI card display", () => {
		it("formats currency KPI", () => {
			const card: DashboardKpiCard = {
				label: "Revenue",
				valueCents: 150000,
				trend: "up",
				changePercent: 10,
			};
			const display = buildKpiCardDisplay(card, analyticsWidgetIds.kpiRevenue);
			expect(display.formattedValue).toBe("$1.5K");
			expect(display.trend).toBe("up");
			expect(display.trendLabel).toContain("10.0%");
		});

		it("formats count KPI", () => {
			const card: DashboardKpiCard = {
				label: "Orders",
				valueCount: 42,
				trend: "up",
				changePercent: 5,
			};
			const display = buildKpiCardDisplay(card, analyticsWidgetIds.kpiOrders);
			expect(display.formattedValue).toBe("42");
		});

		it("formats percent KPI", () => {
			const card: DashboardKpiCard = {
				label: "Retention",
				valuePercent: 85,
				trend: "flat",
				changePercent: 0,
			};
			const display = buildKpiCardDisplay(card, analyticsWidgetIds.kpiRetention);
			expect(display.formattedValue).toBe("85.0%");
			expect(display.trendLabel).toContain("No change");
		});
	});

	describe("revenue chart display", () => {
		it("transforms revenue chart data", () => {
			const data = {
				points: [
					{ period: "Day 1", value: 50000 },
					{ period: "Day 2", value: 60000 },
				],
				periodType: "daily" as const,
			};
			const display = buildRevenueChartDisplay(data);
			expect(display.labels).toEqual(["Day 1", "Day 2"]);
			expect(display.values).toEqual([50000, 60000]);
			expect(display.periodType).toBe("daily");
		});
	});

	describe("traffic chart display", () => {
		it("transforms traffic chart data", () => {
			const data = {
				orderPoints: [{ period: "W1", value: 30 }],
				bookingPoints: [{ period: "W1", value: 10 }],
				periodType: "weekly" as const,
			};
			const display = buildTrafficChartDisplay(data);
			expect(display.orderValues).toEqual([30]);
			expect(display.bookingValues).toEqual([10]);
		});
	});

	describe("detail view models", () => {
		it("builds revenue performance view model", () => {
			const data: RevenueTimeSeriesResponse = {
				points: [{ period: "March", value: 500000 }],
				totalRevenueCents: 500000,
				periodType: "monthly",
			};
			const vm = buildRevenuePerformanceViewModel(data, TIME_FILTER);
			expect(vm.state).toBe("loaded");
			expect(vm.data).toBe(data);
			expect(vm.periodType).toBe("monthly");
		});

		it("builds error revenue view model", () => {
			const vm = buildRevenuePerformanceViewModel(null, TIME_FILTER, "Network error");
			expect(vm.state).toBe("error");
			expect(vm.errorMessage).toBe("Network error");
		});

		it("builds channel breakdown view model", () => {
			const data: ChannelBreakdownResponse = {
				items: [{ channel: "delivery", orderCount: 50, revenueCents: 250000, revenuePercent: 60 }],
				totalRevenueCents: 416667,
			};
			const vm = buildChannelBreakdownViewModel(data, TIME_FILTER);
			expect(vm.state).toBe("loaded");
			expect(vm.data!.items).toHaveLength(1);
		});

		it("builds top performers view model", () => {
			const data: TopPerformersResponse = {
				items: [
					{ id: "p-1", name: "Burger", category: "product", revenueCents: 100000, count: 200, trendPercent: 5 },
				],
				category: "product",
			};
			const vm = buildTopPerformersViewModel(data, TIME_FILTER);
			expect(vm.state).toBe("loaded");
			expect(vm.selectedCategory).toBe("product");
		});
	});

	describe("initial analytics page state", () => {
		it("creates correct initial state", () => {
			const state = createInitialAnalyticsPageState(TIME_FILTER);
			expect(state.activeView).toBe("revenue");
			expect(state.timeFilter).toBe(TIME_FILTER);
			expect(state.revenue.state).toBe("idle");
			expect(state.volume.state).toBe("idle");
			expect(state.channels.state).toBe("idle");
			expect(state.topPerformers.state).toBe("idle");
			expect(state.retention.state).toBe("idle");
		});
	});
});
