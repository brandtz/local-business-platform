// E13-S7-T5: Customers CRM page — customer DataTable, search/filter,
// slide-out customer profile panel with lazy loading.

import { defineComponent, h, onMounted, ref } from "vue";
import { useSdk } from "../composables/use-sdk";
import { formatCents } from "../order-management";
import type { CustomerProfile } from "@platform/types";
import type { CustomerMetrics } from "@platform/sdk";

// ── Types ────────────────────────────────────────────────────────────────────

type CustomerRow = {
	id: string;
	name: string;
	email: string;
	phone: string;
	createdAt: string;
};

type CustomerDetailData = {
	profile: CustomerProfile;
	metrics: CustomerMetrics | null;
};

type CustomersPageState = {
	customers: CustomerRow[];
	error: string | null;
	isLoading: boolean;
	page: number;
	pageSize: number;
	searchQuery: string;
	selectedCustomer: CustomerDetailData | null;
	selectedLoading: boolean;
	showPanel: boolean;
	total: number;
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderSearchToolbar(
	searchQuery: string,
	onSearch: (q: string) => void,
) {
	return h("div", { class: "search-toolbar", "data-testid": "customer-search-toolbar" }, [
		h("input", {
			type: "text",
			placeholder: "Search by name or email…",
			value: searchQuery,
			class: "search-toolbar__input",
			"data-testid": "customer-search-input",
			onInput: (e: Event) => onSearch((e.target as HTMLInputElement).value),
		}),
	]);
}

function renderCustomersTable(
	customers: CustomerRow[],
	onRowClick: (id: string) => void,
) {
	if (customers.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "customers-empty" }, [
			h("p", "No customers found."),
		]);
	}

	return h("table", { class: "data-table", "data-testid": "customers-table" }, [
		h("thead", [
			h("tr", [
				h("th", "Name"),
				h("th", "Email"),
				h("th", "Phone"),
				h("th", "Joined"),
			]),
		]),
		h(
			"tbody",
			customers.map((customer) =>
				h("tr", {
					key: customer.id,
					class: "data-table__row",
					"data-testid": `customer-row-${customer.id}`,
					onClick: () => onRowClick(customer.id),
				}, [
					h("td", { "data-testid": "customer-name" }, customer.name),
					h("td", { "data-testid": "customer-email" }, customer.email),
					h("td", { "data-testid": "customer-phone" }, customer.phone || "—"),
					h("td", { "data-testid": "customer-joined" }, customer.createdAt.slice(0, 10)),
				]),
			),
		),
	]);
}

function renderPagination(
	page: number,
	total: number,
	pageSize: number,
	onPageChange: (page: number) => void,
) {
	const totalPages = Math.ceil(total / pageSize);
	if (totalPages <= 1) return null;

	return h("div", { class: "pagination", "data-testid": "customers-pagination" }, [
		h("button", {
			disabled: page <= 1,
			"data-testid": "pagination-prev",
			onClick: () => onPageChange(page - 1),
		}, "Previous"),
		h("span", { class: "pagination__info" }, `Page ${page} of ${totalPages}`),
		h("button", {
			disabled: page >= totalPages,
			"data-testid": "pagination-next",
			onClick: () => onPageChange(page + 1),
		}, "Next"),
	]);
}

function renderCustomerPanel(
	data: CustomerDetailData | null,
	loading: boolean,
	onClose: () => void,
) {
	return h("div", { class: "slide-panel slide-panel--open", "data-testid": "customer-panel" }, [
		h("div", { class: "slide-panel__header" }, [
			h("h3", "Customer Profile"),
			h("button", {
				class: "slide-panel__close",
				"data-testid": "panel-close",
				onClick: onClose,
			}, "✕"),
		]),

		loading
			? h("div", { class: "loading", "data-testid": "panel-loading" }, "Loading customer…")
			: data
				? renderCustomerPanelContent(data)
				: h("div", { class: "empty-state" }, "No customer data."),
	]);
}

function renderCustomerPanelContent(data: CustomerDetailData) {
	const { profile, metrics } = data;

	return h("div", { class: "customer-panel-content", "data-testid": "panel-content" }, [
		h("div", { class: "customer-panel__section", "data-testid": "panel-contact" }, [
			h("h4", "Contact"),
			h("p", { "data-testid": "panel-name" }, profile.displayName ?? "—"),
			h("p", { "data-testid": "panel-email" }, profile.email),
			h("p", { "data-testid": "panel-phone" }, profile.phone ?? "—"),
		]),

		metrics
			? h("div", { class: "customer-panel__section", "data-testid": "panel-metrics" }, [
				h("h4", "Metrics"),
				h("div", { class: "metrics-grid" }, [
					h("div", { "data-testid": "metric-total-customers" }, [
						h("span", "Total Customers"),
						h("strong", String(metrics.totalCustomers)),
					]),
					h("div", { "data-testid": "metric-active" }, [
						h("span", "Active"),
						h("strong", String(metrics.activeCustomers)),
					]),
					h("div", { "data-testid": "metric-new-month" }, [
						h("span", "New This Month"),
						h("strong", String(metrics.newCustomersThisMonth)),
					]),
					h("div", { "data-testid": "metric-avg-order" }, [
						h("span", "Avg Order Value"),
						h("strong", formatCents(metrics.averageOrderValue)),
					]),
				]),
			])
			: null,
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const CustomersPage = defineComponent({
	name: "CustomersPage",
	setup() {
		const sdk = useSdk();

		const state = ref<CustomersPageState>({
			customers: [],
			error: null,
			isLoading: false,
			page: 1,
			pageSize: 20,
			searchQuery: "",
			selectedCustomer: null,
			selectedLoading: false,
			showPanel: false,
			total: 0,
		});

		async function loadCustomers() {
			state.value = { ...state.value, isLoading: true, error: null };
			try {
				const response = await sdk.customers.list({
					page: state.value.page,
					pageSize: state.value.pageSize,
					search: state.value.searchQuery || undefined,
				});
				const customers: CustomerRow[] = response.data.map((c) => ({
					id: c.id,
					name: c.displayName ?? "—",
					email: c.email,
					phone: c.phone ?? "",
					createdAt: c.createdAt,
				}));
				state.value = {
					...state.value,
					isLoading: false,
					customers,
					total: response.total,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load customers",
				};
			}
		}

		async function loadCustomerDetail(customerId: string) {
			state.value = { ...state.value, showPanel: true, selectedLoading: true, selectedCustomer: null };
			try {
				const [profile, metrics] = await Promise.all([
					sdk.customers.get(customerId),
					sdk.customers.getMetrics().catch(() => null),
				]);
				state.value = {
					...state.value,
					selectedLoading: false,
					selectedCustomer: { profile, metrics },
				};
			} catch (err) {
				state.value = {
					...state.value,
					selectedLoading: false,
					error: err instanceof Error ? err.message : "Failed to load customer",
				};
			}
		}

		function handleSearch(query: string) {
			state.value = { ...state.value, searchQuery: query, page: 1 };
			void loadCustomers();
		}

		function handleRowClick(customerId: string) {
			void loadCustomerDetail(customerId);
		}

		function handlePageChange(page: number) {
			state.value = { ...state.value, page };
			void loadCustomers();
		}

		function handleClosePanel() {
			state.value = { ...state.value, showPanel: false, selectedCustomer: null };
		}

		onMounted(() => {
			void loadCustomers();
		});

		return () => {
			const s = state.value;

			return h("section", { "data-testid": "customers-page" }, [
				h("h2", "Customers"),

				s.error
					? h("div", { class: "alert alert--error", "data-testid": "customers-error" }, s.error)
					: null,

				renderSearchToolbar(s.searchQuery, handleSearch),

				s.isLoading && s.customers.length === 0
					? h("div", { class: "loading", "data-testid": "customers-loading" }, "Loading customers…")
					: renderCustomersTable(s.customers, handleRowClick),

				renderPagination(s.page, s.total, s.pageSize, handlePageChange),

				s.showPanel
					? renderCustomerPanel(s.selectedCustomer, s.selectedLoading, handleClosePanel)
					: null,
			]);
		};
	},
});
