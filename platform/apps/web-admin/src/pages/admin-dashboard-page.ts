// E13-S5-T2: Admin Dashboard page — KPI cards, revenue chart placeholder,
// recent orders table, activity timeline, and quick action buttons.

import { defineComponent, h, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import { useSdk } from "../composables/use-sdk";
import {
	buildKpiCardDisplay,
	buildRevenueChartDisplay,
	analyticsWidgetIds,
	type KpiCardDisplayData,
	type RevenueChartDisplayData,
} from "../analytics-dashboard-widgets";
import { buildOrderListRow, type OrderListRowViewModel } from "../order-management";

// ── Types ────────────────────────────────────────────────────────────────────

type DashboardState = {
	kpis: KpiCardDisplayData[];
	revenueChart: RevenueChartDisplayData | null;
	recentOrders: OrderListRowViewModel[];
	activityEvents: ActivityEvent[];
	isLoading: boolean;
	error: string | null;
};

type ActivityEvent = {
	id: string;
	description: string;
	timestamp: string;
	type: string;
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderKpiCard(kpi: KpiCardDisplayData) {
	const trendClass =
		kpi.trend === "up"
			? "kpi-card__trend--up"
			: kpi.trend === "down"
				? "kpi-card__trend--down"
				: "kpi-card__trend--flat";

	return h(
		"div",
		{
			class: "kpi-card",
			key: kpi.widgetId,
			"data-testid": `kpi-${kpi.widgetId}`,
		},
		[
			h("div", { class: "kpi-card__label" }, kpi.label),
			h("div", { class: "kpi-card__value" }, kpi.formattedValue),
			h("div", { class: `kpi-card__trend ${trendClass}` }, kpi.trendLabel),
		],
	);
}

function renderKpiRow(kpis: KpiCardDisplayData[]) {
	return h(
		"div",
		{ class: "dashboard__kpi-row", "data-testid": "kpi-row" },
		kpis.map((kpi) => renderKpiCard(kpi)),
	);
}

function renderRevenueChart(chart: RevenueChartDisplayData | null) {
	if (!chart) {
		return h(
			"div",
			{ class: "dashboard__chart dashboard__chart--empty" },
			[h("p", "No revenue data available")],
		);
	}

	const maxValue = Math.max(...chart.values, 1);

	return h(
		"div",
		{ class: "dashboard__chart", "data-testid": "revenue-chart" },
		[
			h("h3", { class: "dashboard__chart-title" }, "Revenue"),
			h("div", { class: "dashboard__chart-canvas", "data-testid": "chart-canvas" }, [
				h(
					"div",
					{ class: "dashboard__chart-bars" },
					chart.labels.map((label, i) =>
						h(
							"div",
							{
								class: "dashboard__chart-bar",
								key: label,
								title: `${label}: $${((chart.values[i] ?? 0) / 100).toFixed(2)}`,
							},
							[
								h("div", {
									class: "dashboard__chart-bar-fill",
									style: {
										height: `${Math.min(100, ((chart.values[i] ?? 0) / maxValue) * 100)}%`,
									},
								}),
								h("span", { class: "dashboard__chart-bar-label" }, label),
							],
						),
					),
				),
			]),
			h("div", { class: "dashboard__chart-period" }, `Period: ${chart.periodType}`),
		],
	);
}

function renderRecentOrders(orders: OrderListRowViewModel[]) {
	if (orders.length === 0) {
		return h(
			"div",
			{ class: "dashboard__orders dashboard__orders--empty", "data-testid": "recent-orders-empty" },
			[h("p", "No recent orders")],
		);
	}

	return h("div", { class: "dashboard__orders", "data-testid": "recent-orders" }, [
		h("h3", { class: "dashboard__section-title" }, "Recent Orders"),
		h("table", { class: "data-table" }, [
			h("thead", [
				h("tr", [
					h("th", "Order #"),
					h("th", "Customer"),
					h("th", "Total"),
					h("th", "Status"),
					h("th", "Time"),
				]),
			]),
			h(
				"tbody",
				orders.map((order) =>
					h("tr", { key: order.id, "data-testid": `order-row-${order.id}` }, [
						h("td", order.id.slice(0, 8)),
						h("td", order.customerName),
						h("td", order.totalFormatted),
						h("td", [
							h(
								"span",
								{
									class: `status-badge status-badge--${order.statusBadge.colorClass}`,
								},
								order.statusBadge.label,
							),
						]),
						h("td", order.timeAgo),
					]),
				),
			),
		]),
	]);
}

function renderActivityTimeline(events: ActivityEvent[]) {
	if (events.length === 0) {
		return h(
			"div",
			{ class: "dashboard__activity dashboard__activity--empty", "data-testid": "activity-empty" },
			[h("p", "No recent activity")],
		);
	}

	return h("div", { class: "dashboard__activity", "data-testid": "activity-timeline" }, [
		h("h3", { class: "dashboard__section-title" }, "Recent Activity"),
		h(
			"ul",
			{ class: "activity-timeline" },
			events.map((event) =>
				h("li", { class: "activity-timeline__item", key: event.id }, [
					h("span", { class: "activity-timeline__dot" }),
					h("div", { class: "activity-timeline__content" }, [
						h("p", { class: "activity-timeline__description" }, event.description),
						h("time", { class: "activity-timeline__time" }, event.timestamp),
					]),
				]),
			),
		),
	]);
}

function renderQuickActions() {
	return h("div", { class: "dashboard__quick-actions", "data-testid": "quick-actions" }, [
		h("h3", { class: "dashboard__section-title" }, "Quick Actions"),
		h("div", { class: "dashboard__action-buttons" }, [
			h(
				RouterLink,
				{ to: "/catalog/new", class: "btn btn--primary" },
				{ default: () => "New Product" },
			),
			h(
				RouterLink,
				{ to: "/ordering/new", class: "btn btn--secondary" },
				{ default: () => "New Order" },
			),
			h(
				RouterLink,
				{ to: "/bookings", class: "btn btn--secondary" },
				{ default: () => "View Bookings" },
			),
		]),
	]);
}

function renderLoadingState() {
	return h(
		"div",
		{
			class: "dashboard dashboard--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "dashboard-loading",
		},
		[h("div", { class: "loading-spinner" }), h("p", "Loading dashboard...")],
	);
}

function renderErrorState(error: string) {
	return h(
		"div",
		{
			class: "dashboard dashboard--error",
			role: "alert",
			"data-testid": "dashboard-error",
		},
		[
			h("h2", "Dashboard Error"),
			h("p", error),
		],
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const AdminDashboardPage = defineComponent({
	name: "AdminDashboardPage",
	setup() {
		const state = ref<DashboardState>({
			kpis: [],
			revenueChart: null,
			recentOrders: [],
			activityEvents: [],
			isLoading: true,
			error: null,
		});

		const sdk = useSdk();

		onMounted(async () => {
			try {
				const [dashboardData, ordersData] = await Promise.allSettled([
					sdk.analytics.dashboard(),
					sdk.orders.list({ tenantId: "", page: 1, pageSize: 5 }),
				]);

				const kpis: KpiCardDisplayData[] = [];
				let revenueChart: RevenueChartDisplayData | null = null;

				if (dashboardData.status === "fulfilled") {
					const data = dashboardData.value;
					const widgetIdMap = [
						analyticsWidgetIds.kpiRevenue,
						analyticsWidgetIds.kpiOrders,
						analyticsWidgetIds.kpiBookings,
						analyticsWidgetIds.kpiRetention,
					];
					kpis.push(
						...data.kpiCards.map((card, i) =>
							buildKpiCardDisplay(card, widgetIdMap[i] ?? analyticsWidgetIds.kpiRevenue),
						),
					);
					revenueChart = buildRevenueChartDisplay(data.revenueChart);
				}

				const recentOrders: OrderListRowViewModel[] = [];
				if (ordersData.status === "fulfilled") {
					recentOrders.push(
						...ordersData.value.orders.map((o) => buildOrderListRow(o)),
					);
				}

				state.value = {
					kpis,
					revenueChart,
					recentOrders,
					activityEvents: [],
					isLoading: false,
					error: null,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load dashboard data",
				};
			}
		});

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return renderLoadingState();
			}

			if (s.error) {
				return renderErrorState(s.error);
			}

			return h("div", { class: "dashboard", "data-testid": "admin-dashboard" }, [
				h("h2", { class: "dashboard__title" }, "Dashboard"),
				renderKpiRow(s.kpis),
				h("div", { class: "dashboard__grid" }, [
					h("div", { class: "dashboard__grid-main" }, [
						renderRevenueChart(s.revenueChart),
						renderRecentOrders(s.recentOrders),
					]),
					h("div", { class: "dashboard__grid-side" }, [
						renderActivityTimeline(s.activityEvents),
						renderQuickActions(),
					]),
				]),
			]);
		};
	},
});
