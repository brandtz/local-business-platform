import { describe, it, expect } from "vitest";

import type {
	AnalyticsTimeFilter,
	RevenueTimeSeriesResponse,
	VolumeTimeSeriesResponse,
	ChannelBreakdownResponse,
	TopPerformersResponse,
	RetentionInsightsResponse,
} from "@platform/types";

import {
	buildRevenuePerformanceViewModel,
	buildVolumeAnalysisViewModel,
	buildChannelBreakdownViewModel,
	buildTopPerformersViewModel,
	buildRetentionInsightsViewModel,
	createInitialAnalyticsPageState,
} from "./analytics-detail-views";

// ─── Test Data ───────────────────────────────────────────────────────────────

const defaultTimeFilter: AnalyticsTimeFilter = {
	from: "2026-01-01T00:00:00Z",
	to: "2026-01-31T23:59:59Z",
};

const sampleRevenueData: RevenueTimeSeriesResponse = {
	points: [{ period: "2026-01-01", value: 50000 }],
	totalRevenueCents: 50000,
	periodType: "daily",
};

const sampleVolumeData: VolumeTimeSeriesResponse = {
	orderPoints: [{ period: "2026-01-01", value: 10 }],
	bookingPoints: [{ period: "2026-01-01", value: 5 }],
	periodType: "daily",
};

const sampleChannelData: ChannelBreakdownResponse = {
	items: [
		{ channel: "pickup", orderCount: 10, revenueCents: 50000, revenuePercent: 100 },
	],
	totalRevenueCents: 50000,
};

const sampleTopPerformersData: TopPerformersResponse = {
	items: [
		{ id: "p-1", name: "Premium Coffee", category: "product", revenueCents: 14985, count: 42, trendPercent: 12 },
	],
	category: "product",
};

const sampleRetentionData: RetentionInsightsResponse = {
	current: {
		retentionRate: 42.8,
		newCustomerCount: 57,
		returningCustomerCount: 43,
		totalCustomerCount: 100,
		churnRate: 57.2,
	},
	timeSeries: [
		{ period: "2026-01", retentionRate: 42.8, newCustomers: 57, returningCustomers: 43 },
	],
	periodType: "monthly",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("analytics-detail-views", () => {
	describe("buildRevenuePerformanceViewModel", () => {
		it("builds loaded state from data", () => {
			const vm = buildRevenuePerformanceViewModel(sampleRevenueData, defaultTimeFilter);

			expect(vm.state).toBe("loaded");
			expect(vm.data).toBe(sampleRevenueData);
			expect(vm.periodType).toBe("daily");
			expect(vm.errorMessage).toBeNull();
		});

		it("builds idle state from null data", () => {
			const vm = buildRevenuePerformanceViewModel(null, defaultTimeFilter);

			expect(vm.state).toBe("idle");
			expect(vm.data).toBeNull();
		});

		it("builds error state", () => {
			const vm = buildRevenuePerformanceViewModel(null, defaultTimeFilter, "Network error");

			expect(vm.state).toBe("error");
			expect(vm.errorMessage).toBe("Network error");
		});
	});

	describe("buildVolumeAnalysisViewModel", () => {
		it("builds loaded state", () => {
			const vm = buildVolumeAnalysisViewModel(sampleVolumeData, defaultTimeFilter);

			expect(vm.state).toBe("loaded");
			expect(vm.data?.orderPoints).toHaveLength(1);
			expect(vm.data?.bookingPoints).toHaveLength(1);
		});

		it("builds error state", () => {
			const vm = buildVolumeAnalysisViewModel(null, defaultTimeFilter, "Failed");

			expect(vm.state).toBe("error");
			expect(vm.errorMessage).toBe("Failed");
		});
	});

	describe("buildChannelBreakdownViewModel", () => {
		it("builds loaded state", () => {
			const vm = buildChannelBreakdownViewModel(sampleChannelData, defaultTimeFilter);

			expect(vm.state).toBe("loaded");
			expect(vm.data?.items).toHaveLength(1);
		});

		it("builds idle state from null data", () => {
			const vm = buildChannelBreakdownViewModel(null, defaultTimeFilter);

			expect(vm.state).toBe("idle");
		});
	});

	describe("buildTopPerformersViewModel", () => {
		it("builds loaded state with correct category", () => {
			const vm = buildTopPerformersViewModel(sampleTopPerformersData, defaultTimeFilter);

			expect(vm.state).toBe("loaded");
			expect(vm.selectedCategory).toBe("product");
			expect(vm.data?.items).toHaveLength(1);
		});

		it("uses default category when not provided", () => {
			const vm = buildTopPerformersViewModel(null, defaultTimeFilter);

			expect(vm.selectedCategory).toBe("product");
		});

		it("accepts staff category", () => {
			const vm = buildTopPerformersViewModel(null, defaultTimeFilter, "staff");

			expect(vm.selectedCategory).toBe("staff");
		});
	});

	describe("buildRetentionInsightsViewModel", () => {
		it("builds loaded state with retention data", () => {
			const vm = buildRetentionInsightsViewModel(sampleRetentionData, defaultTimeFilter);

			expect(vm.state).toBe("loaded");
			expect(vm.data?.current.retentionRate).toBe(42.8);
			expect(vm.periodType).toBe("monthly");
		});

		it("builds error state", () => {
			const vm = buildRetentionInsightsViewModel(null, defaultTimeFilter, "Timeout");

			expect(vm.state).toBe("error");
			expect(vm.errorMessage).toBe("Timeout");
		});
	});

	describe("createInitialAnalyticsPageState", () => {
		it("creates initial state with all views in idle", () => {
			const state = createInitialAnalyticsPageState(defaultTimeFilter);

			expect(state.activeView).toBe("revenue");
			expect(state.timeFilter).toBe(defaultTimeFilter);
			expect(state.locationId).toBeNull();
			expect(state.revenue.state).toBe("idle");
			expect(state.volume.state).toBe("idle");
			expect(state.channels.state).toBe("idle");
			expect(state.topPerformers.state).toBe("idle");
			expect(state.retention.state).toBe("idle");
		});
	});
});
