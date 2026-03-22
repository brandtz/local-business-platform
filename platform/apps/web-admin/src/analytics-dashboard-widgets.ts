// E11-S1-T4: Dashboard analytics widget integration — connects analytics query results
// to E5-S1 dashboard mount points (KPI cards, revenue chart, traffic chart).

import type {
	DashboardAnalyticsWidgetData,
	DashboardKpiCard,
	DashboardRevenueChartData,
	DashboardTrafficChartData,
	AnalyticsTrendDirection,
	TimeSeriesDataPoint,
	AnalyticsAggregationPeriod,
} from "@platform/types";

// ─── Dashboard Analytics Widget IDs ──────────────────────────────────────────

/**
 * Widget IDs used to register analytics widgets in the E5-S1 dashboard.
 * These correspond to mount points in admin-dashboard.ts.
 */
export const analyticsWidgetIds = {
	kpiRevenue: "analytics-kpi-revenue",
	kpiOrders: "analytics-kpi-orders",
	kpiBookings: "analytics-kpi-bookings",
	kpiRetention: "analytics-kpi-retention",
	revenueChart: "analytics-revenue-chart",
	trafficChart: "analytics-traffic-chart",
} as const;

export type AnalyticsWidgetId = (typeof analyticsWidgetIds)[keyof typeof analyticsWidgetIds];

// ─── Widget Data Contracts ───────────────────────────────────────────────────

/**
 * KPI card display contract for rendering a single metric card.
 */
export type KpiCardDisplayData = {
	widgetId: AnalyticsWidgetId;
	label: string;
	formattedValue: string;
	trend: AnalyticsTrendDirection;
	changePercent: number;
	trendLabel: string;
};

/**
 * Revenue chart display contract for rendering the revenue line chart widget.
 */
export type RevenueChartDisplayData = {
	widgetId: typeof analyticsWidgetIds.revenueChart;
	labels: string[];
	values: number[];
	periodType: AnalyticsAggregationPeriod;
};

/**
 * Traffic chart display contract for rendering the order/booking volume chart widget.
 */
export type TrafficChartDisplayData = {
	widgetId: typeof analyticsWidgetIds.trafficChart;
	labels: string[];
	orderValues: number[];
	bookingValues: number[];
	periodType: AnalyticsAggregationPeriod;
};

// ─── Transformation Functions ────────────────────────────────────────────────

function formatTrendLabel(changePercent: number, trend: AnalyticsTrendDirection): string {
	const absPercent = Math.abs(changePercent).toFixed(1);
	if (trend === "up") return `+${absPercent}% vs prior period`;
	if (trend === "down") return `-${absPercent}% vs prior period`;
	return "No change vs prior period";
}

function formatCurrencyValue(cents: number): string {
	const dollars = cents / 100;
	if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
	if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
	return `$${dollars.toFixed(2)}`;
}

function formatCountValue(count: number): string {
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
	return count.toLocaleString();
}

function formatPercentValue(percent: number): string {
	return `${percent.toFixed(1)}%`;
}

/**
 * Transforms a DashboardKpiCard from the analytics API into display data
 * suitable for rendering in the dashboard.
 */
export function buildKpiCardDisplay(
	card: DashboardKpiCard,
	widgetId: AnalyticsWidgetId
): KpiCardDisplayData {
	let formattedValue: string;

	if (card.valueCents !== undefined) {
		formattedValue = formatCurrencyValue(card.valueCents);
	} else if (card.valueCount !== undefined) {
		formattedValue = formatCountValue(card.valueCount);
	} else if (card.valuePercent !== undefined) {
		formattedValue = formatPercentValue(card.valuePercent);
	} else {
		formattedValue = "—";
	}

	return {
		widgetId,
		label: card.label,
		formattedValue,
		trend: card.trend,
		changePercent: card.changePercent,
		trendLabel: formatTrendLabel(card.changePercent, card.trend),
	};
}

/**
 * Transforms revenue chart data from the analytics API into display data.
 */
export function buildRevenueChartDisplay(
	data: DashboardRevenueChartData
): RevenueChartDisplayData {
	return {
		widgetId: analyticsWidgetIds.revenueChart,
		labels: data.points.map((p) => p.period),
		values: data.points.map((p) => p.value),
		periodType: data.periodType,
	};
}

/**
 * Transforms traffic chart data from the analytics API into display data.
 */
export function buildTrafficChartDisplay(
	data: DashboardTrafficChartData
): TrafficChartDisplayData {
	return {
		widgetId: analyticsWidgetIds.trafficChart,
		labels: data.orderPoints.map((p) => p.period),
		orderValues: data.orderPoints.map((p) => p.value),
		bookingValues: data.bookingPoints.map((p) => p.value),
		periodType: data.periodType,
	};
}

/**
 * Transforms full dashboard widget data into an array of all display-ready widgets.
 */
export function buildDashboardAnalyticsDisplayData(
	data: DashboardAnalyticsWidgetData
): {
	kpiCards: KpiCardDisplayData[];
	revenueChart: RevenueChartDisplayData;
	trafficChart: TrafficChartDisplayData;
	lastUpdated: string;
} {
	const kpiWidgetIds: AnalyticsWidgetId[] = [
		analyticsWidgetIds.kpiRevenue,
		analyticsWidgetIds.kpiOrders,
		analyticsWidgetIds.kpiBookings,
		analyticsWidgetIds.kpiRetention,
	];

	const kpiCards = data.kpiCards.map((card, i) =>
		buildKpiCardDisplay(card, kpiWidgetIds[i])
	);

	return {
		kpiCards,
		revenueChart: buildRevenueChartDisplay(data.revenueChart),
		trafficChart: buildTrafficChartDisplay(data.trafficChart),
		lastUpdated: data.lastUpdated,
	};
}
