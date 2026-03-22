// E11-S1-T5: Analytics detail page views — revenue performance chart, volume analysis chart,
// channel breakdown visual, top performers table, and retention insights panel.

import type {
	AnalyticsDetailViewType,
	AnalyticsTimeFilter,
	AnalyticsAggregationPeriod,
	RevenueTimeSeriesResponse,
	VolumeTimeSeriesResponse,
	ChannelBreakdownResponse,
	TopPerformersResponse,
	RetentionInsightsResponse,
	TopPerformerCategory,
} from "@platform/types";

// ─── View State ──────────────────────────────────────────────────────────────

export type AnalyticsPageLoadingState = "idle" | "loading" | "loaded" | "error";

// ─── Revenue Performance View ────────────────────────────────────────────────

export type RevenuePerformanceViewModel = {
	state: AnalyticsPageLoadingState;
	data: RevenueTimeSeriesResponse | null;
	periodType: AnalyticsAggregationPeriod;
	timeFilter: AnalyticsTimeFilter;
	errorMessage: string | null;
};

export function buildRevenuePerformanceViewModel(
	data: RevenueTimeSeriesResponse | null,
	timeFilter: AnalyticsTimeFilter,
	error?: string
): RevenuePerformanceViewModel {
	if (error) {
		return {
			state: "error",
			data: null,
			periodType: "daily",
			timeFilter,
			errorMessage: error,
		};
	}
	if (!data) {
		return {
			state: "idle",
			data: null,
			periodType: "daily",
			timeFilter,
			errorMessage: null,
		};
	}
	return {
		state: "loaded",
		data,
		periodType: data.periodType,
		timeFilter,
		errorMessage: null,
	};
}

// ─── Volume Analysis View ────────────────────────────────────────────────────

export type VolumeAnalysisViewModel = {
	state: AnalyticsPageLoadingState;
	data: VolumeTimeSeriesResponse | null;
	periodType: AnalyticsAggregationPeriod;
	timeFilter: AnalyticsTimeFilter;
	errorMessage: string | null;
};

export function buildVolumeAnalysisViewModel(
	data: VolumeTimeSeriesResponse | null,
	timeFilter: AnalyticsTimeFilter,
	error?: string
): VolumeAnalysisViewModel {
	if (error) {
		return {
			state: "error",
			data: null,
			periodType: "daily",
			timeFilter,
			errorMessage: error,
		};
	}
	if (!data) {
		return {
			state: "idle",
			data: null,
			periodType: "daily",
			timeFilter,
			errorMessage: null,
		};
	}
	return {
		state: "loaded",
		data,
		periodType: data.periodType,
		timeFilter,
		errorMessage: null,
	};
}

// ─── Channel Breakdown View ──────────────────────────────────────────────────

export type ChannelBreakdownViewModel = {
	state: AnalyticsPageLoadingState;
	data: ChannelBreakdownResponse | null;
	timeFilter: AnalyticsTimeFilter;
	errorMessage: string | null;
};

export function buildChannelBreakdownViewModel(
	data: ChannelBreakdownResponse | null,
	timeFilter: AnalyticsTimeFilter,
	error?: string
): ChannelBreakdownViewModel {
	if (error) {
		return { state: "error", data: null, timeFilter, errorMessage: error };
	}
	if (!data) {
		return { state: "idle", data: null, timeFilter, errorMessage: null };
	}
	return { state: "loaded", data, timeFilter, errorMessage: null };
}

// ─── Top Performers View ─────────────────────────────────────────────────────

export type TopPerformersViewModel = {
	state: AnalyticsPageLoadingState;
	data: TopPerformersResponse | null;
	selectedCategory: TopPerformerCategory;
	timeFilter: AnalyticsTimeFilter;
	errorMessage: string | null;
};

export function buildTopPerformersViewModel(
	data: TopPerformersResponse | null,
	timeFilter: AnalyticsTimeFilter,
	category: TopPerformerCategory = "product",
	error?: string
): TopPerformersViewModel {
	if (error) {
		return {
			state: "error",
			data: null,
			selectedCategory: category,
			timeFilter,
			errorMessage: error,
		};
	}
	if (!data) {
		return {
			state: "idle",
			data: null,
			selectedCategory: category,
			timeFilter,
			errorMessage: null,
		};
	}
	return {
		state: "loaded",
		data,
		selectedCategory: data.category,
		timeFilter,
		errorMessage: null,
	};
}

// ─── Retention Insights View ─────────────────────────────────────────────────

export type RetentionInsightsViewModel = {
	state: AnalyticsPageLoadingState;
	data: RetentionInsightsResponse | null;
	periodType: AnalyticsAggregationPeriod;
	timeFilter: AnalyticsTimeFilter;
	errorMessage: string | null;
};

export function buildRetentionInsightsViewModel(
	data: RetentionInsightsResponse | null,
	timeFilter: AnalyticsTimeFilter,
	error?: string
): RetentionInsightsViewModel {
	if (error) {
		return {
			state: "error",
			data: null,
			periodType: "monthly",
			timeFilter,
			errorMessage: error,
		};
	}
	if (!data) {
		return {
			state: "idle",
			data: null,
			periodType: "monthly",
			timeFilter,
			errorMessage: null,
		};
	}
	return {
		state: "loaded",
		data,
		periodType: data.periodType,
		timeFilter,
		errorMessage: null,
	};
}

// ─── Unified Analytics Page State ────────────────────────────────────────────

export type AnalyticsPageState = {
	activeView: AnalyticsDetailViewType;
	timeFilter: AnalyticsTimeFilter;
	locationId: string | null;
	revenue: RevenuePerformanceViewModel;
	volume: VolumeAnalysisViewModel;
	channels: ChannelBreakdownViewModel;
	topPerformers: TopPerformersViewModel;
	retention: RetentionInsightsViewModel;
};

export function createInitialAnalyticsPageState(
	timeFilter: AnalyticsTimeFilter
): AnalyticsPageState {
	return {
		activeView: "revenue",
		timeFilter,
		locationId: null,
		revenue: buildRevenuePerformanceViewModel(null, timeFilter),
		volume: buildVolumeAnalysisViewModel(null, timeFilter),
		channels: buildChannelBreakdownViewModel(null, timeFilter),
		topPerformers: buildTopPerformersViewModel(null, timeFilter),
		retention: buildRetentionInsightsViewModel(null, timeFilter),
	};
}
