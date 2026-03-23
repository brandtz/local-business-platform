// E13-S7-T8: Analytics Dashboard page — revenue charts, sales breakdown,
// customer metrics, booking analytics, top performers, date range selector.

import { defineComponent, h, onMounted, ref } from "vue";
import { useSdk } from "../composables/use-sdk";
import {
	buildRevenuePerformanceViewModel,
	buildChannelBreakdownViewModel,
	buildTopPerformersViewModel,
	createInitialAnalyticsPageState,
	type AnalyticsPageState,
} from "../analytics-detail-views";
import {
	buildDashboardAnalyticsDisplayData,
	type KpiCardDisplayData,
	type RevenueChartDisplayData,
} from "../analytics-dashboard-widgets";
import type {
	AnalyticsTimeFilter,
	AnalyticsAggregationPeriod,
	ChannelBreakdownResponse,
	TopPerformersResponse,
} from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type AnalyticsPageViewState = {
	activeTab: "overview" | "revenue" | "channels" | "performers";
	dashboardData: ReturnType<typeof buildDashboardAnalyticsDisplayData> | null;
	detailState: AnalyticsPageState;
	error: string | null;
	isLoading: boolean;
	period: AnalyticsAggregationPeriod;
	timeFilter: AnalyticsTimeFilter;
};

function defaultTimeFilter(): AnalyticsTimeFilter {
	const now = new Date();
	const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	return {
		from: from.toISOString().slice(0, 10),
		to: now.toISOString().slice(0, 10),
	};
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderPeriodSelector(
	active: AnalyticsAggregationPeriod,
	onChange: (period: AnalyticsAggregationPeriod) => void,
) {
	const periods: AnalyticsAggregationPeriod[] = ["daily", "weekly", "monthly"];
	return h("div", { class: "period-selector", "data-testid": "period-selector" },
		periods.map((p) =>
			h("button", {
				class: `period-selector__btn${active === p ? " period-selector__btn--active" : ""}`,
				"data-testid": `period-${p}`,
				onClick: () => onChange(p),
			}, p.charAt(0).toUpperCase() + p.slice(1)),
		),
	);
}

function renderDateRangeSelector(
	timeFilter: AnalyticsTimeFilter,
	onFromChange: (v: string) => void,
	onToChange: (v: string) => void,
) {
	return h("div", { class: "date-range-selector", "data-testid": "date-range-selector" }, [
		h("label", "From"),
		h("input", {
			type: "date",
			value: timeFilter.from,
			"data-testid": "date-from",
			onInput: (e: Event) => onFromChange((e.target as HTMLInputElement).value),
		}),
		h("label", "To"),
		h("input", {
			type: "date",
			value: timeFilter.to,
			"data-testid": "date-to",
			onInput: (e: Event) => onToChange((e.target as HTMLInputElement).value),
		}),
	]);
}

function renderTabBar(
	active: string,
	onChange: (tab: string) => void,
) {
	const tabs = [
		{ id: "overview", label: "Overview" },
		{ id: "revenue", label: "Revenue" },
		{ id: "channels", label: "Channels" },
		{ id: "performers", label: "Top Performers" },
	];

	return h("div", { class: "tab-bar", role: "tablist", "data-testid": "analytics-tabs" },
		tabs.map((tab) =>
			h("button", {
				class: `tab-bar__tab${active === tab.id ? " tab-bar__tab--active" : ""}`,
				role: "tab",
				"data-testid": `tab-${tab.id}`,
				onClick: () => onChange(tab.id),
			}, tab.label),
		),
	);
}

function renderKpiCards(cards: KpiCardDisplayData[]) {
	return h("div", { class: "kpi-cards", "data-testid": "analytics-kpis" },
		cards.map((card) =>
			h("div", { class: "kpi-card", key: card.widgetId, "data-testid": `kpi-${card.widgetId}` }, [
				h("span", { class: "kpi-card__label" }, card.label),
				h("span", { class: "kpi-card__value" }, card.formattedValue),
				h("span", {
					class: `kpi-card__trend kpi-card__trend--${card.trend}`,
					"data-testid": "kpi-trend",
				}, card.trendLabel),
			]),
		),
	);
}

function renderRevenueChart(data: RevenueChartDisplayData) {
	return h("div", { class: "chart-container", "data-testid": "revenue-chart" }, [
		h("h3", "Revenue"),
		h("div", { class: "chart-placeholder", "data-testid": "revenue-chart-canvas" }, [
			h("div", { class: "chart-bars" },
				data.labels.map((label, i) =>
					h("div", {
						class: "chart-bar",
						key: label,
						"data-testid": `chart-bar-${i}`,
						style: { height: `${Math.min(100, (data.values[i]! / Math.max(...data.values, 1)) * 100)}%` },
					}, [
						h("span", { class: "chart-bar__label" }, label),
					]),
				),
			),
		]),
	]);
}

function renderChannelBreakdown(items: ChannelBreakdownResponse["items"]) {
	return h("div", { class: "channel-breakdown", "data-testid": "channel-breakdown" }, [
		h("h3", "Sales by Channel"),
		h("table", { class: "data-table" }, [
			h("thead", [
				h("tr", [h("th", "Channel"), h("th", "Orders"), h("th", "Revenue"), h("th", "%")]),
			]),
			h("tbody",
				items.map((item) =>
					h("tr", { key: item.channel, "data-testid": `channel-${item.channel}` }, [
						h("td", item.channel),
						h("td", String(item.orderCount)),
						h("td", `$${(item.revenueCents / 100).toFixed(2)}`),
						h("td", `${item.revenuePercent.toFixed(1)}%`),
					]),
				),
			),
		]),
	]);
}

function renderTopPerformers(items: TopPerformersResponse["items"]) {
	return h("div", { class: "top-performers", "data-testid": "top-performers" }, [
		h("h3", "Top Performers"),
		items.length === 0
			? h("p", { class: "text-muted" }, "No data available.")
			: h("table", { class: "data-table" }, [
				h("thead", [
					h("tr", [h("th", "Name"), h("th", "Revenue"), h("th", "Count"), h("th", "Trend")]),
				]),
				h("tbody",
					items.map((item) =>
						h("tr", { key: item.id, "data-testid": `performer-${item.id}` }, [
							h("td", item.name),
							h("td", `$${(item.revenueCents / 100).toFixed(2)}`),
							h("td", String(item.count)),
							h("td", {
								class: item.trendPercent > 0 ? "trend--up" : item.trendPercent < 0 ? "trend--down" : "",
							}, `${item.trendPercent > 0 ? "+" : ""}${item.trendPercent.toFixed(1)}%`),
						]),
					),
				),
			]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const AnalyticsPage = defineComponent({
	name: "AnalyticsPage",
	setup() {
		const sdk = useSdk();
		const tf = defaultTimeFilter();

		const state = ref<AnalyticsPageViewState>({
			activeTab: "overview",
			dashboardData: null,
			detailState: createInitialAnalyticsPageState(tf),
			error: null,
			isLoading: false,
			period: "daily",
			timeFilter: tf,
		});

		async function loadDashboard() {
			state.value = { ...state.value, isLoading: true, error: null };
			try {
				const queryParams = {
					tenantId: "",
					timeFilter: state.value.timeFilter,
				};
				const data = await sdk.analytics.dashboard(queryParams);
				const displayData = buildDashboardAnalyticsDisplayData(data);
				state.value = { ...state.value, isLoading: false, dashboardData: displayData };
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load analytics",
				};
			}
		}

		async function loadRevenue() {
			try {
				const data = await sdk.analytics.revenue({
					tenantId: "",
					timeFilter: state.value.timeFilter,
				});
				const vm = buildRevenuePerformanceViewModel(data, state.value.timeFilter);
				state.value = {
					...state.value,
					detailState: { ...state.value.detailState, revenue: vm },
				};
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : "Failed to load revenue";
				const vm = buildRevenuePerformanceViewModel(null, state.value.timeFilter, errMsg);
				state.value = {
					...state.value,
					detailState: { ...state.value.detailState, revenue: vm },
				};
			}
		}

		async function loadChannels() {
			try {
				const data = await sdk.analytics.salesBreakdown({
					tenantId: "",
					timeFilter: state.value.timeFilter,
				});
				const vm = buildChannelBreakdownViewModel(data, state.value.timeFilter);
				state.value = {
					...state.value,
					detailState: { ...state.value.detailState, channels: vm },
				};
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : "Failed to load channels";
				const vm = buildChannelBreakdownViewModel(null, state.value.timeFilter, errMsg);
				state.value = {
					...state.value,
					detailState: { ...state.value.detailState, channels: vm },
				};
			}
		}

		async function loadPerformers() {
			try {
				const data = await sdk.analytics.topPerformers({
					tenantId: "",
					timeFilter: state.value.timeFilter,
				});
				const vm = buildTopPerformersViewModel(data, state.value.timeFilter);
				state.value = {
					...state.value,
					detailState: { ...state.value.detailState, topPerformers: vm },
				};
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : "Failed to load top performers";
				const vm = buildTopPerformersViewModel(null, state.value.timeFilter, "product", errMsg);
				state.value = {
					...state.value,
					detailState: { ...state.value.detailState, topPerformers: vm },
				};
			}
		}

		function handleTabChange(tab: string) {
			state.value = { ...state.value, activeTab: tab as AnalyticsPageViewState["activeTab"] };
			if (tab === "overview") void loadDashboard();
			if (tab === "revenue") void loadRevenue();
			if (tab === "channels") void loadChannels();
			if (tab === "performers") void loadPerformers();
		}

		onMounted(() => {
			void loadDashboard();
		});

		return () => {
			const s = state.value;

			return h("section", { "data-testid": "analytics-page" }, [
				h("h2", "Analytics"),

				s.error
					? h("div", { class: "alert alert--error", "data-testid": "analytics-error" }, s.error)
					: null,

				h("div", { class: "analytics-controls" }, [
					renderDateRangeSelector(
						s.timeFilter,
						(v) => { state.value = { ...state.value, timeFilter: { ...state.value.timeFilter, from: v } }; },
						(v) => { state.value = { ...state.value, timeFilter: { ...state.value.timeFilter, to: v } }; },
					),
					renderPeriodSelector(s.period, (p) => {
						state.value = { ...state.value, period: p };
					}),
				]),

				renderTabBar(s.activeTab, handleTabChange),

				s.isLoading
					? h("div", { class: "loading", "data-testid": "analytics-loading" }, "Loading analytics…")
					: null,

				// Overview tab
				!s.isLoading && s.activeTab === "overview" && s.dashboardData
					? h("div", { "data-testid": "analytics-overview" }, [
						renderKpiCards(s.dashboardData.kpiCards),
						renderRevenueChart(s.dashboardData.revenueChart),
					])
					: null,

				// Revenue tab
				!s.isLoading && s.activeTab === "revenue" && s.detailState.revenue.data
					? h("div", { "data-testid": "analytics-revenue" }, [
						renderRevenueChart({
							widgetId: "analytics-revenue-chart" as const,
							labels: s.detailState.revenue.data.points.map((p) => p.period),
							values: s.detailState.revenue.data.points.map((p) => p.value),
							periodType: s.detailState.revenue.periodType,
						}),
					])
					: null,

				// Channels tab
				!s.isLoading && s.activeTab === "channels" && s.detailState.channels.data
					? h("div", { "data-testid": "analytics-channels" }, [
						renderChannelBreakdown(s.detailState.channels.data.items),
					])
					: null,

				// Top performers tab
				!s.isLoading && s.activeTab === "performers" && s.detailState.topPerformers.data
					? h("div", { "data-testid": "analytics-performers" }, [
						renderTopPerformers(s.detailState.topPerformers.data.items),
					])
					: null,
			]);
		};
	},
});
