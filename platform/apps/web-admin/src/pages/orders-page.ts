// E13-S7-T1: Orders Dashboard and List page — order metrics, DataTable with
// status filter tabs, inline actions, search/filter, and pagination.

import { defineComponent, h, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useSdk } from "../composables/use-sdk";
import {
	buildOrderListRow,
	type OrderListRowViewModel,
	type PipelineStatusEntry,
} from "../order-management";
import type { OrderStatus, AdminOrderListQuery } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type OrdersPageState = {
	error: string | null;
	isLoading: boolean;
	orders: OrderListRowViewModel[];
	page: number;
	pageSize: number;
	pipeline: PipelineStatusEntry[];
	searchQuery: string;
	statusFilter: OrderStatus | "all";
	total: number;
};

const statusTabs: Array<OrderStatus | "all"> = [
	"all",
	"placed",
	"confirmed",
	"preparing",
	"ready",
	"completed",
	"cancelled",
];

const statusTabLabels: Record<string, string> = {
	all: "All",
	placed: "Pending",
	confirmed: "Accepted",
	preparing: "Preparing",
	ready: "Ready",
	completed: "Completed",
	cancelled: "Cancelled",
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderMetricCards(pipeline: PipelineStatusEntry[]) {
	return h(
		"div",
		{ class: "metric-cards", "data-testid": "order-metrics" },
		pipeline.map((entry) =>
			h("div", { class: `metric-card ${entry.colorClass}`, key: entry.status, "data-testid": `metric-${entry.status}` }, [
				h("span", { class: "metric-card__label" }, entry.label),
				h("span", { class: "metric-card__value" }, String(entry.count)),
			]),
		),
	);
}

function renderStatusTabs(
	activeTab: OrderStatus | "all",
	onTabChange: (tab: OrderStatus | "all") => void,
) {
	return h(
		"div",
		{ class: "tab-bar", role: "tablist", "data-testid": "order-status-tabs" },
		statusTabs.map((tab) =>
			h("button", {
				class: `tab-bar__tab${activeTab === tab ? " tab-bar__tab--active" : ""}`,
				role: "tab",
				"aria-selected": activeTab === tab ? "true" : "false",
				"data-testid": `tab-${tab}`,
				onClick: () => onTabChange(tab),
			}, statusTabLabels[tab]),
		),
	);
}

function renderSearchToolbar(
	searchQuery: string,
	onSearch: (q: string) => void,
) {
	return h("div", { class: "search-toolbar", "data-testid": "order-search-toolbar" }, [
		h("input", {
			type: "text",
			placeholder: "Search by order # or customer…",
			value: searchQuery,
			class: "search-toolbar__input",
			"data-testid": "order-search-input",
			onInput: (e: Event) => onSearch((e.target as HTMLInputElement).value),
		}),
	]);
}

function renderOrdersTable(
	orders: OrderListRowViewModel[],
	onRowClick: (id: string) => void,
	onAction: (id: string, status: OrderStatus) => void,
) {
	if (orders.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "orders-empty" }, [
			h("p", "No orders found."),
		]);
	}

	return h("table", { class: "data-table", "data-testid": "orders-table" }, [
		h("thead", [
			h("tr", [
				h("th", "Order #"),
				h("th", "Customer"),
				h("th", "Items"),
				h("th", "Total"),
				h("th", "Status"),
				h("th", "Time"),
				h("th", "Actions"),
			]),
		]),
		h(
			"tbody",
			orders.map((order) =>
				h(
					"tr",
					{
						key: order.id,
						class: "data-table__row",
						"data-testid": `order-row-${order.id}`,
						onClick: () => onRowClick(order.id),
					},
					[
						h("td", { "data-testid": "order-number" }, order.id),
						h("td", { "data-testid": "order-customer" }, order.customerName),
						h("td", { "data-testid": "order-items" }, String(order.itemCount)),
						h("td", { "data-testid": "order-total" }, order.totalFormatted),
						h("td", [
							h(
								"span",
								{
									class: `badge ${order.statusBadge.colorClass}`,
									"data-testid": "order-status",
								},
								order.statusBadge.label,
							),
						]),
						h("td", { "data-testid": "order-time" }, order.timeAgo),
						h("td", { onClick: (e: Event) => e.stopPropagation() }, renderInlineActions(order, onAction)),
					],
				),
			),
		),
	]);
}

function renderInlineActions(
	order: OrderListRowViewModel,
	onAction: (id: string, status: OrderStatus) => void,
) {
	const actions: Array<{ label: string; target: OrderStatus }> = [];

	switch (order.statusBadge.status) {
		case "placed":
			actions.push({ label: "Accept", target: "confirmed" });
			break;
		case "confirmed":
			actions.push({ label: "Start Prep", target: "preparing" });
			break;
		case "preparing":
			actions.push({ label: "Mark Ready", target: "ready" });
			break;
		case "ready":
			actions.push({ label: "Complete", target: "completed" });
			break;
	}

	if (actions.length === 0) return [];

	return actions.map((action) =>
		h("button", {
			class: "btn btn--sm btn--primary",
			"data-testid": `action-${action.target}`,
			onClick: () => onAction(order.id, action.target),
		}, action.label),
	);
}

function renderPagination(
	page: number,
	total: number,
	pageSize: number,
	onPageChange: (page: number) => void,
) {
	const totalPages = Math.ceil(total / pageSize);
	if (totalPages <= 1) return null;

	return h("div", { class: "pagination", "data-testid": "orders-pagination" }, [
		h(
			"button",
			{
				disabled: page <= 1,
				"data-testid": "pagination-prev",
				onClick: () => onPageChange(page - 1),
			},
			"Previous",
		),
		h("span", { class: "pagination__info", "data-testid": "pagination-info" }, `Page ${page} of ${totalPages}`),
		h(
			"button",
			{
				disabled: page >= totalPages,
				"data-testid": "pagination-next",
				onClick: () => onPageChange(page + 1),
			},
			"Next",
		),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const OrdersPage = defineComponent({
	name: "OrdersPage",
	setup() {
		const sdk = useSdk();
		const router = useRouter();

		const state = ref<OrdersPageState>({
			error: null,
			isLoading: false,
			orders: [],
			page: 1,
			pageSize: 20,
			pipeline: [],
			searchQuery: "",
			statusFilter: "all",
			total: 0,
		});

		async function loadOrders() {
			state.value = { ...state.value, isLoading: true, error: null };
			try {
				const query: AdminOrderListQuery = {
					tenantId: "",
					page: state.value.page,
					pageSize: state.value.pageSize,
				};
				if (state.value.statusFilter !== "all") {
					query.status = state.value.statusFilter;
				}
				if (state.value.searchQuery.trim()) {
					query.search = state.value.searchQuery.trim();
				}

				const response = await sdk.orders.list(query);
				const orders = response.orders.map((o) => buildOrderListRow(o));
				state.value = {
					...state.value,
					isLoading: false,
					orders,
					total: response.total,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load orders",
				};
			}
		}

		function handleTabChange(tab: OrderStatus | "all") {
			state.value = { ...state.value, statusFilter: tab, page: 1 };
			void loadOrders();
		}

		function handleSearch(query: string) {
			state.value = { ...state.value, searchQuery: query, page: 1 };
			void loadOrders();
		}

		function handleRowClick(orderId: string) {
			void router.push(`/ordering/${orderId}`);
		}

		async function handleStatusAction(orderId: string, status: OrderStatus) {
			try {
				await sdk.orders.updateStatus(orderId, { status });
				void loadOrders();
			} catch {
				state.value = { ...state.value, error: "Failed to update order status" };
			}
		}

		function handlePageChange(page: number) {
			state.value = { ...state.value, page };
			void loadOrders();
		}

		onMounted(() => {
			void loadOrders();
		});

		return () => {
			const s = state.value;

			if (s.isLoading && s.orders.length === 0) {
				return h("section", { "data-testid": "orders-page" }, [
					h("h2", "Orders"),
					h("div", { class: "loading", "data-testid": "orders-loading" }, "Loading orders…"),
				]);
			}

			return h("section", { "data-testid": "orders-page" }, [
				h("h2", "Orders"),

				s.error
					? h("div", { class: "alert alert--error", "data-testid": "orders-error" }, s.error)
					: null,

				s.pipeline.length > 0 ? renderMetricCards(s.pipeline) : null,

				renderSearchToolbar(s.searchQuery, handleSearch),
				renderStatusTabs(s.statusFilter, handleTabChange),
				renderOrdersTable(s.orders, handleRowClick, handleStatusAction),
				renderPagination(s.page, s.total, s.pageSize, handlePageChange),
			]);
		};
	},
});
