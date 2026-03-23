// E13-S7-T2: Order Detail page — order header, status workflow buttons,
// line items table, pricing breakdown, fulfillment info, refund section.

import { defineComponent, h, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSdk } from "../composables/use-sdk";
import {
	buildOrderDetailViewModel,
	type OrderDetailViewModel,
} from "../order-management";
import type { OrderStatus } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type OrderDetailPageState = {
	detail: OrderDetailViewModel | null;
	error: string | null;
	isLoading: boolean;
	isUpdating: boolean;
	refundAmount: string;
	refundReason: string;
	showRefundForm: boolean;
	notes: string;
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderOrderHeader(detail: OrderDetailViewModel) {
	return h("div", { class: "order-header", "data-testid": "order-header" }, [
		h("div", { class: "order-header__info" }, [
			h("h2", { "data-testid": "order-number" }, `Order #${detail.id}`),
			h("span", {
				class: `badge ${detail.statusBadge.colorClass}`,
				"data-testid": "order-status-badge",
			}, detail.statusBadge.label),
		]),
		h("div", { class: "order-header__meta" }, [
			h("span", { "data-testid": "order-customer" }, detail.customerName),
			detail.customerEmail
				? h("span", { "data-testid": "order-email" }, detail.customerEmail)
				: null,
			h("span", { "data-testid": "order-time" }, detail.timeAgo),
		]),
	]);
}

function renderWorkflowButtons(
	detail: OrderDetailViewModel,
	onAction: (status: OrderStatus) => void,
	onCancel: () => void,
	isUpdating: boolean,
) {
	return h("div", { class: "workflow-actions", "data-testid": "workflow-actions" }, [
		...detail.quickActions.map((action) =>
			h("button", {
				class: "btn btn--primary",
				disabled: isUpdating,
				"data-testid": `action-${action.targetStatus}`,
				onClick: () => onAction(action.targetStatus),
			}, action.label),
		),
		detail.canCancel
			? h("button", {
				class: "btn btn--danger",
				disabled: isUpdating,
				"data-testid": "action-cancel",
				onClick: onCancel,
			}, "Cancel Order")
			: null,
	]);
}

function renderLineItems(detail: OrderDetailViewModel) {
	return h("div", { class: "line-items", "data-testid": "line-items" }, [
		h("h3", "Line Items"),
		h("table", { class: "data-table" }, [
			h("thead", [
				h("tr", [
					h("th", "Item"),
					h("th", "Modifiers"),
					h("th", "Qty"),
					h("th", "Unit Price"),
					h("th", "Total"),
				]),
			]),
			h(
				"tbody",
				detail.items.map((item) =>
					h("tr", { key: item.id, "data-testid": `line-item-${item.id}` }, [
						h("td", { "data-testid": "item-name" }, [
							item.catalogItemName,
							item.variantName ? h("span", { class: "text-muted" }, ` (${item.variantName})`) : null,
						]),
						h("td", { "data-testid": "item-modifiers" },
							item.modifiers.length > 0
								? item.modifiers.map((m) => m.modifierName).join(", ")
								: "—",
						),
						h("td", { "data-testid": "item-qty" }, String(item.quantity)),
						h("td", { "data-testid": "item-price" }, item.unitPriceFormatted),
						h("td", { "data-testid": "item-total" }, item.lineTotalFormatted),
					]),
				),
			),
		]),
	]);
}

function renderPricingBreakdown(detail: OrderDetailViewModel) {
	const rows = [
		{ label: "Subtotal", value: detail.subtotalFormatted, testId: "subtotal" },
		{ label: "Discount", value: detail.discountFormatted, testId: "discount" },
		{ label: "Tax", value: detail.taxFormatted, testId: "tax" },
		{ label: "Tip", value: detail.tipFormatted, testId: "tip" },
		{ label: "Delivery Fee", value: detail.deliveryFeeFormatted, testId: "delivery-fee" },
		{ label: "Total", value: detail.totalFormatted, testId: "total" },
	];

	return h("div", { class: "pricing-breakdown", "data-testid": "pricing-breakdown" },
		rows.map((row) =>
			h("div", { class: "pricing-row", key: row.testId, "data-testid": `pricing-${row.testId}` }, [
				h("span", { class: "pricing-row__label" }, row.label),
				h("span", { class: "pricing-row__value" }, row.value),
			]),
		),
	);
}

function renderFulfillmentInfo(detail: OrderDetailViewModel) {
	return h("div", { class: "fulfillment-info", "data-testid": "fulfillment-info" }, [
		h("h3", "Fulfillment"),
		h("p", { "data-testid": "fulfillment-mode" }, detail.fulfillmentLabel),
		detail.deliveryAddress
			? h("p", { "data-testid": "delivery-address" }, detail.deliveryAddress)
			: null,
	]);
}

function renderCustomerInfo(detail: OrderDetailViewModel) {
	return h("div", { class: "customer-info", "data-testid": "customer-info-card" }, [
		h("h3", "Customer"),
		h("p", { "data-testid": "customer-name" }, detail.customerName),
		detail.customerEmail
			? h("p", { "data-testid": "customer-email" }, detail.customerEmail)
			: null,
		detail.customerPhone
			? h("p", { "data-testid": "customer-phone" }, detail.customerPhone)
			: null,
	]);
}

function renderRefundSection(
	show: boolean,
	amount: string,
	reason: string,
	onToggle: () => void,
	onAmountChange: (v: string) => void,
	onReasonChange: (v: string) => void,
	onSubmit: () => void,
	isUpdating: boolean,
) {
	return h("div", { class: "refund-section", "data-testid": "refund-section" }, [
		h("button", {
			class: "btn btn--secondary",
			"data-testid": "refund-toggle",
			onClick: onToggle,
		}, show ? "Cancel Refund" : "Issue Refund"),
		show
			? h("div", { class: "refund-form", "data-testid": "refund-form" }, [
				h("label", "Amount ($)"),
				h("input", {
					type: "number",
					value: amount,
					"data-testid": "refund-amount",
					onInput: (e: Event) => onAmountChange((e.target as HTMLInputElement).value),
				}),
				h("label", "Reason"),
				h("textarea", {
					value: reason,
					"data-testid": "refund-reason",
					onInput: (e: Event) => onReasonChange((e.target as HTMLTextAreaElement).value),
				}),
				h("button", {
					class: "btn btn--danger",
					disabled: isUpdating || !amount || !reason,
					"data-testid": "refund-submit",
					onClick: onSubmit,
				}, "Submit Refund"),
			])
			: null,
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const OrderDetailPage = defineComponent({
	name: "OrderDetailPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const state = ref<OrderDetailPageState>({
			detail: null,
			error: null,
			isLoading: false,
			isUpdating: false,
			refundAmount: "",
			refundReason: "",
			showRefundForm: false,
			notes: "",
		});

		async function loadOrder() {
			const orderId = route.params.orderId as string;
			state.value = { ...state.value, isLoading: true, error: null };
			try {
				const detail = await sdk.orders.get(orderId);
				const viewModel = buildOrderDetailViewModel(detail);
				state.value = { ...state.value, isLoading: false, detail: viewModel, notes: detail.orderNotes ?? "" };
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load order",
				};
			}
		}

		async function handleStatusAction(status: OrderStatus) {
			const orderId = route.params.orderId as string;
			state.value = { ...state.value, isUpdating: true };
			try {
				await sdk.orders.updateStatus(orderId, { status });
				void loadOrder();
			} catch {
				state.value = { ...state.value, isUpdating: false, error: "Failed to update status" };
			}
		}

		async function handleCancel() {
			const orderId = route.params.orderId as string;
			state.value = { ...state.value, isUpdating: true };
			try {
				await sdk.orders.updateStatus(orderId, { status: "cancelled" });
				void loadOrder();
			} catch {
				state.value = { ...state.value, isUpdating: false, error: "Failed to cancel order" };
			}
		}

		async function handleRefund() {
			const orderId = route.params.orderId as string;
			const amountCents = Math.round(parseFloat(state.value.refundAmount) * 100);
			state.value = { ...state.value, isUpdating: true };
			try {
				await sdk.orders.refund(orderId, {
					amountCents,
					reason: state.value.refundReason,
				});
				state.value = { ...state.value, isUpdating: false, showRefundForm: false, refundAmount: "", refundReason: "" };
				void loadOrder();
			} catch {
				state.value = { ...state.value, isUpdating: false, error: "Failed to process refund" };
			}
		}

		onMounted(() => {
			void loadOrder();
		});

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("section", { "data-testid": "order-detail-page" }, [
					h("div", { class: "loading", "data-testid": "order-detail-loading" }, "Loading order…"),
				]);
			}

			if (s.error && !s.detail) {
				return h("section", { "data-testid": "order-detail-page" }, [
					h("div", { class: "alert alert--error", "data-testid": "order-detail-error" }, s.error),
					h("button", { class: "btn", onClick: () => router.push("/ordering") }, "Back to Orders"),
				]);
			}

			if (!s.detail) {
				return h("section", { "data-testid": "order-detail-page" }, [
					h("div", { class: "empty-state" }, "Order not found."),
				]);
			}

			return h("section", { "data-testid": "order-detail-page" }, [
				h("button", {
					class: "btn btn--link",
					"data-testid": "back-to-orders",
					onClick: () => router.push("/ordering"),
				}, "← Back to Orders"),

				s.error
					? h("div", { class: "alert alert--error", "data-testid": "order-detail-error" }, s.error)
					: null,

				renderOrderHeader(s.detail),
				renderWorkflowButtons(s.detail, handleStatusAction, handleCancel, s.isUpdating),
				renderLineItems(s.detail),
				renderPricingBreakdown(s.detail),
				renderFulfillmentInfo(s.detail),
				renderCustomerInfo(s.detail),
				renderRefundSection(
					s.showRefundForm,
					s.refundAmount,
					s.refundReason,
					() => { state.value = { ...state.value, showRefundForm: !state.value.showRefundForm }; },
					(v) => { state.value = { ...state.value, refundAmount: v }; },
					(v) => { state.value = { ...state.value, refundReason: v }; },
					handleRefund,
					s.isUpdating,
				),

				h("div", { class: "order-notes", "data-testid": "order-notes" }, [
					h("h3", "Internal Notes"),
					h("textarea", {
						value: s.notes,
						class: "notes-textarea",
						"data-testid": "order-notes-input",
						onInput: (e: Event) => { state.value = { ...state.value, notes: (e.target as HTMLTextAreaElement).value }; },
					}),
				]),
			]);
		};
	},
});
