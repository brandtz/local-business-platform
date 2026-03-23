// Account Orders page — order history list with status filters and pagination,
// plus order detail view with full receipt, status timeline, and reorder button.
// Fetches data via SDK orders API.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import type {
	AdminOrderSummary,
	AdminOrderDetail,
	OrderStatus,
	OrderTrackingStepInfo,
} from "@platform/types";
import { computeTrackingSteps } from "@platform/types";

import { useSdk } from "../composables/use-sdk";
import { renderAccountSidebar } from "./account-dashboard-page";

// ── Types ───────────────────────────────────────────────────────────────────

export type StatusFilterTab = {
	key: string;
	label: string;
	filter: string | undefined;
};

// ── Pure Helpers ─────────────────────────────────────────────────────────────

export function formatOrderDate(dateStr: string): string {
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function formatCents(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

export function getOrderStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		draft: "Draft",
		placed: "Placed",
		confirmed: "Confirmed",
		preparing: "Preparing",
		ready: "Ready",
		completed: "Completed",
		cancelled: "Cancelled",
	};
	return labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

export function getStatusFilterTabs(): StatusFilterTab[] {
	return [
		{ key: "all", label: "All", filter: undefined },
		{ key: "active", label: "Active", filter: "active" },
		{ key: "completed", label: "Completed", filter: "completed" },
		{ key: "cancelled", label: "Cancelled", filter: "cancelled" },
	];
}

function getStatusesForFilter(filter: string | undefined): OrderStatus | undefined {
	if (!filter) return undefined;
	switch (filter) {
		case "active":
			return "placed";
		case "completed":
			return "completed";
		case "cancelled":
			return "cancelled";
		default:
			return undefined;
	}
}

// ── Render Helpers: Shared ──────────────────────────────────────────────────

function renderLoading(message: string): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", message),
	]);
}

function renderError(message: string, backTo: string, backLabel: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Something went wrong"),
		h("p", message),
		h(RouterLink, { to: backTo, class: "page-error__back" }, {
			default: () => backLabel,
		}),
	]);
}

// ── Render Helpers: Orders List ─────────────────────────────────────────────

function renderStatusTabs(
	activeFilter: string,
	onSelect: (key: string) => void,
): VNode {
	const tabs = getStatusFilterTabs();

	return h("div", {
		class: "account-orders__tabs",
		role: "tablist",
		"data-testid": "status-tabs",
	}, tabs.map((tab) =>
		h("button", {
			key: tab.key,
			role: "tab",
			class: [
				"account-orders__tab",
				activeFilter === tab.key ? "account-orders__tab--active" : "",
			],
			"aria-selected": String(activeFilter === tab.key),
			"data-testid": `tab-${tab.key}`,
			onClick: () => onSelect(tab.key),
		}, tab.label)
	));
}

function renderOrderCard(order: AdminOrderSummary): VNode {
	return h(RouterLink, {
		to: `/account/orders/${order.id}`,
		class: "account-orders__card",
		"data-testid": `order-card-${order.id}`,
	}, {
		default: () => [
			h("div", { class: "account-orders__card-header" }, [
				h("span", {
					class: "account-orders__order-number",
					"data-testid": "order-number",
				}, `Order #${order.id.slice(0, 8)}`),
				h("span", {
					class: [
						"account-orders__status-badge",
						`account-orders__status-badge--${order.status}`,
					],
					"data-testid": "order-status",
				}, getOrderStatusLabel(order.status)),
			]),
			h("div", { class: "account-orders__card-body" }, [
				h("span", {
					class: "account-orders__date",
					"data-testid": "order-date",
				}, formatOrderDate(order.placedAt ?? order.createdAt)),
				h("span", {
					class: "account-orders__item-count",
					"data-testid": "order-item-count",
				}, `${order.itemCount} item${order.itemCount !== 1 ? "s" : ""}`),
				h("span", {
					class: "account-orders__total",
					"data-testid": "order-total",
				}, formatCents(order.totalCents)),
			]),
		],
	});
}

function renderEmptyOrders(): VNode {
	return h("div", {
		class: "account-orders__empty",
		"data-testid": "empty-state",
	}, [
		h("p", { class: "account-orders__empty-title" }, "No orders yet"),
		h("p", { class: "account-orders__empty-message" }, "No orders yet — browse our menu"),
		h(RouterLink, {
			to: "/menu",
			class: "account-orders__empty-action",
			"data-testid": "browse-menu-link",
		}, { default: () => "Browse Menu" }),
	]);
}

function renderPagination(
	page: number,
	total: number,
	pageSize: number,
	onPageChange: (p: number) => void,
): VNode {
	const totalPages = Math.ceil(total / pageSize);
	if (totalPages <= 1) return h("span");

	return h("div", {
		class: "account-orders__pagination",
		"data-testid": "pagination",
	}, [
		h("button", {
			class: "account-orders__page-btn",
			"data-testid": "pagination-prev",
			disabled: page <= 1,
			onClick: () => onPageChange(page - 1),
		}, "Previous"),
		h("span", {
			class: "account-orders__page-info",
			"data-testid": "pagination-info",
		}, `Page ${page} of ${totalPages}`),
		h("button", {
			class: "account-orders__page-btn",
			"data-testid": "pagination-next",
			disabled: page >= totalPages,
			onClick: () => onPageChange(page + 1),
		}, "Next"),
	]);
}

// ── Render Helpers: Order Detail ────────────────────────────────────────────

function renderDetailTimeline(steps: OrderTrackingStepInfo[]): VNode {
	return h("section", {
		class: "account-order-detail__timeline",
		"data-testid": "order-timeline",
	}, [
		h("h3", "Order Status"),
		h("ol", { class: "account-order-detail__steps" },
			steps.map((step) =>
				h("li", {
					key: step.step,
					class: [
						"account-order-detail__step",
						`account-order-detail__step--${step.state}`,
					],
					"data-testid": `tracking-step-${step.step}`,
					"data-state": step.state,
				}, [
					h("span", { class: "account-order-detail__step-indicator" }),
					h("div", { class: "account-order-detail__step-content" }, [
						h("span", { class: "account-order-detail__step-label" }, step.label),
						step.timestamp
							? h("span", {
								class: "account-order-detail__step-time",
							}, formatOrderDate(step.timestamp))
							: null,
					]),
				])
			),
		),
	]);
}

function renderDetailReceipt(order: AdminOrderDetail): VNode {
	return h("section", {
		class: "account-order-detail__receipt",
		"data-testid": "order-receipt",
	}, [
		h("h3", "Items"),
		h("ul", { class: "account-order-detail__items", "data-testid": "receipt-items" },
			order.items.map((item) =>
				h("li", {
					key: item.id,
					class: "account-order-detail__item",
					"data-testid": "receipt-line-item",
				}, [
					h("div", { class: "account-order-detail__item-main" }, [
						h("span", { class: "account-order-detail__item-name" },
							`${item.catalogItemName} × ${item.quantity}`
						),
						h("span", { class: "account-order-detail__item-price" },
							formatCents(item.lineTotalCents)
						),
					]),
					item.modifiers.length > 0
						? h("ul", { class: "account-order-detail__modifiers" },
							item.modifiers.map((mod) =>
								h("li", {
									key: mod.id,
									class: "account-order-detail__modifier",
									"data-testid": "receipt-modifier",
								}, [
									h("span", mod.modifierName),
									mod.priceCents > 0
										? h("span", ` +${formatCents(mod.priceCents)}`)
										: null,
								])
							)
						)
						: null,
				])
			)
		),
		// Totals
		h("div", { class: "account-order-detail__totals" }, [
			h("div", {
				class: "account-order-detail__total-row",
				"data-testid": "receipt-subtotal",
			}, [
				h("span", "Subtotal"),
				h("span", formatCents(order.subtotalCents)),
			]),
			order.discountCents !== 0
				? h("div", {
					class: "account-order-detail__total-row",
					"data-testid": "receipt-discount",
				}, [
					h("span", order.promoCode ? `Discount (${order.promoCode})` : "Discount"),
					h("span", `-${formatCents(Math.abs(order.discountCents))}`),
				])
				: null,
			h("div", {
				class: "account-order-detail__total-row",
				"data-testid": "receipt-tax",
			}, [
				h("span", "Tax"),
				h("span", formatCents(order.taxCents)),
			]),
			order.tipCents > 0
				? h("div", {
					class: "account-order-detail__total-row",
					"data-testid": "receipt-tip",
				}, [
					h("span", "Tip"),
					h("span", formatCents(order.tipCents)),
				])
				: null,
			order.deliveryFeeCents > 0
				? h("div", {
					class: "account-order-detail__total-row",
					"data-testid": "receipt-delivery-fee",
				}, [
					h("span", "Delivery Fee"),
					h("span", formatCents(order.deliveryFeeCents)),
				])
				: null,
			h("div", {
				class: "account-order-detail__total-row account-order-detail__total-row--grand",
				"data-testid": "receipt-total",
			}, [
				h("strong", "Total"),
				h("strong", formatCents(order.totalCents)),
			]),
		]),
	]);
}

function renderDetailActions(orderId: string): VNode {
	return h("section", {
		class: "account-order-detail__actions",
		"data-testid": "order-actions",
	}, [
		h(RouterLink, {
			to: "/menu",
			class: "account-order-detail__btn account-order-detail__btn--primary",
			"data-testid": "reorder-btn",
		}, { default: () => "Reorder" }),
		h(RouterLink, {
			to: "/account/orders",
			class: "account-order-detail__btn account-order-detail__btn--secondary",
			"data-testid": "back-to-orders",
		}, { default: () => "Back to Orders" }),
	]);
}

// ── Orders List Component ───────────────────────────────────────────────────

export const AccountOrdersPage = defineComponent({
	name: "AccountOrdersPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const orders = ref<AdminOrderSummary[]>([]);
		const total = ref(0);
		const page = ref(1);
		const pageSize = 10;
		const activeFilter = ref("all");

		async function fetchOrders(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const statusFilter = getStatusesForFilter(
					getStatusFilterTabs().find((t) => t.key === activeFilter.value)?.filter
				);

				const result = await sdk.orders.list({
					page: page.value,
					pageSize,
					status: statusFilter,
				} as Parameters<typeof sdk.orders.list>[0]);

				orders.value = result.orders;
				total.value = result.total;
			} catch {
				error.value = "Unable to load your orders. Please try again later.";
			} finally {
				loading.value = false;
			}
		}

		function selectFilter(key: string): void {
			activeFilter.value = key;
			page.value = 1;
			fetchOrders();
		}

		function changePage(newPage: number): void {
			page.value = newPage;
			fetchOrders();
		}

		onMounted(fetchOrders);

		return () => {
			if (loading.value) return renderLoading("Loading orders...");
			if (error.value) return renderError(error.value, "/account", "Back to Account");

			return h("div", {
				class: "account-orders-page",
				"data-testid": "account-orders-page",
			}, [
				renderAccountSidebar(route.path, (path) => router.push(path)),
				h("div", { class: "account-orders__content" }, [
					h("h1", { class: "account-orders__heading" }, "Order History"),
					renderStatusTabs(activeFilter.value, selectFilter),
					orders.value.length === 0
						? renderEmptyOrders()
						: h("div", { class: "account-orders__list", "data-testid": "orders-list" },
							orders.value.map((order) => renderOrderCard(order))
						),
					orders.value.length > 0
						? renderPagination(page.value, total.value, pageSize, changePage)
						: null,
				]),
			]);
		};
	},
});

// ── Order Detail Component ──────────────────────────────────────────────────

export const AccountOrderDetailPage = defineComponent({
	name: "AccountOrderDetailPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const order = ref<AdminOrderDetail | null>(null);

		async function fetchOrder(orderId: string): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				order.value = await sdk.orders.get(orderId);
			} catch {
				error.value = "This order could not be found.";
			} finally {
				loading.value = false;
			}
		}

		onMounted(() => {
			const orderId = route.params.orderId as string;
			if (orderId) {
				fetchOrder(orderId);
			} else {
				error.value = "No order specified.";
				loading.value = false;
			}
		});

		return () => {
			if (loading.value) return renderLoading("Loading order details...");
			if (error.value || !order.value) return renderError(
				error.value ?? "Order not found",
				"/account/orders",
				"Back to Orders",
			);

			const currentOrder = order.value;
			const steps = computeTrackingSteps(currentOrder.status, {
				placedAt: currentOrder.placedAt,
				confirmedAt: currentOrder.confirmedAt,
				preparingAt: currentOrder.preparingAt,
				readyAt: currentOrder.readyAt,
				completedAt: currentOrder.completedAt,
			});

			return h("div", {
				class: "account-order-detail-page",
				"data-testid": "account-order-detail-page",
			}, [
				renderAccountSidebar(route.path, (path) => router.push(path)),
				h("div", { class: "account-order-detail__content" }, [
					h("h1", {
						class: "account-order-detail__heading",
						"data-testid": "order-heading",
					}, `Order #${currentOrder.id.slice(0, 8)}`),
					h("div", {
						class: "account-order-detail__meta",
						"data-testid": "order-meta",
					}, [
						h("span", {
							class: [
								"account-order-detail__status-badge",
								`account-order-detail__status-badge--${currentOrder.status}`,
							],
							"data-testid": "order-status-badge",
						}, getOrderStatusLabel(currentOrder.status)),
						h("span", {
							"data-testid": "order-date",
						}, formatOrderDate(currentOrder.placedAt ?? currentOrder.createdAt)),
					]),
					renderDetailTimeline(steps),
					renderDetailReceipt(currentOrder),
					renderDetailActions(currentOrder.id),
				]),
			]);
		};
	},
});
