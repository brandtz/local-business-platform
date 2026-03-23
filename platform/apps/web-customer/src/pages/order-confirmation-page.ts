// Order Confirmation page — success hero, order tracking timeline,
// itemized receipt, customer info card, and next-action links.
// Fetches order data via SDK orders API.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { AdminOrderDetail, OrderTrackingStepInfo } from "@platform/types";
import { computeTrackingSteps } from "@platform/types";

import { useSdk } from "../composables/use-sdk";

// ── Formatting ──────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

// ── Render Helpers ──────────────────────────────────────────────────────────

function renderLoading(): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", "Loading order details..."),
	]);
}

function renderError(message: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Order not found"),
		h("p", message),
		h(RouterLink, { to: "/menu", class: "page-error__back" }, {
			default: () => "Back to Menu",
		}),
	]);
}

function renderSuccessHero(): VNode {
	return h("section", {
		class: "order-confirmation__hero",
		"data-testid": "success-hero",
	}, [
		h("div", {
			class: "order-confirmation__checkmark",
			"aria-hidden": "true",
		}, "✓"),
		h("h1", { class: "order-confirmation__heading" }, "Order Confirmed!"),
		h("p", { class: "order-confirmation__subheading" },
			"Thank you for your order. We'll get started right away."
		),
	]);
}

function renderTrackingTimeline(steps: OrderTrackingStepInfo[]): VNode {
	return h("section", {
		class: "order-confirmation__timeline",
		"data-testid": "order-timeline",
	}, [
		h("h2", { class: "order-confirmation__section-title" }, "Order Status"),
		h("ol", { class: "order-confirmation__steps" },
			steps.map((step) =>
				h("li", {
					key: step.step,
					class: [
						"order-confirmation__step",
						`order-confirmation__step--${step.state}`,
					],
					"data-testid": `tracking-step-${step.step}`,
					"data-state": step.state,
				}, [
					h("span", { class: "order-confirmation__step-indicator" }),
					h("span", { class: "order-confirmation__step-label" }, step.label),
				])
			),
		),
	]);
}

function renderReceiptItems(order: AdminOrderDetail): VNode {
	return h("ul", { class: "order-confirmation__line-items", "data-testid": "receipt-items" },
		order.items.map((item) =>
			h("li", {
				key: item.id,
				class: "order-confirmation__line-item",
				"data-testid": "receipt-line-item",
			}, [
				h("span", { class: "order-confirmation__item-name" },
					`${item.catalogItemName} × ${item.quantity}`
				),
				h("span", { class: "order-confirmation__item-price" },
					formatCents(item.lineTotalCents)
				),
			])
		),
	);
}

function renderReceiptTotals(order: AdminOrderDetail): VNode {
	const lines: { label: string; value: string; testId: string }[] = [
		{ label: "Subtotal", value: formatCents(order.subtotalCents), testId: "receipt-subtotal" },
	];

	if (order.discountCents !== 0) {
		lines.push({
			label: order.promoCode ? `Discount (${order.promoCode})` : "Discount",
			value: `-${formatCents(Math.abs(order.discountCents))}`,
			testId: "receipt-discount",
		});
	}

	lines.push({ label: "Tax", value: formatCents(order.taxCents), testId: "receipt-tax" });

	if (order.tipCents > 0) {
		lines.push({ label: "Tip", value: formatCents(order.tipCents), testId: "receipt-tip" });
	}

	if (order.deliveryFeeCents > 0) {
		lines.push({ label: "Delivery Fee", value: formatCents(order.deliveryFeeCents), testId: "receipt-delivery-fee" });
	}

	return h("div", { class: "order-confirmation__totals" }, [
		...lines.map((line) =>
			h("div", {
				key: line.testId,
				class: "order-confirmation__total-row",
				"data-testid": line.testId,
			}, [
				h("span", line.label),
				h("span", line.value),
			])
		),
		h("div", {
			class: "order-confirmation__total-row order-confirmation__total-row--grand",
			"data-testid": "receipt-total",
		}, [
			h("strong", "Total"),
			h("strong", formatCents(order.totalCents)),
		]),
	]);
}

function renderReceipt(order: AdminOrderDetail): VNode {
	return h("section", {
		class: "order-confirmation__receipt",
		"data-testid": "order-receipt",
	}, [
		h("h2", { class: "order-confirmation__section-title" }, "Order Summary"),
		renderReceiptItems(order),
		renderReceiptTotals(order),
	]);
}

function renderCustomerInfo(order: AdminOrderDetail): VNode {
	const rows: VNode[] = [];

	if (order.customerName) {
		rows.push(h("div", {
			class: "order-confirmation__info-row",
			"data-testid": "customer-name",
		}, [
			h("span", { class: "order-confirmation__info-label" }, "Name"),
			h("span", order.customerName),
		]));
	}

	const fulfillmentLabel = order.fulfillmentMode === "delivery"
		? "Delivery"
		: order.fulfillmentMode === "pickup"
			? "Pickup"
			: "Dine-In";

	rows.push(h("div", {
		class: "order-confirmation__info-row",
		"data-testid": "fulfillment-mode",
	}, [
		h("span", { class: "order-confirmation__info-label" }, "Fulfillment"),
		h("span", fulfillmentLabel),
	]));

	if (order.deliveryAddress) {
		const addr = order.deliveryAddress;
		const parts = [addr.line1];
		if (addr.line2) parts.push(addr.line2);
		parts.push(`${addr.city}, ${addr.state} ${addr.zip}`);

		rows.push(h("div", {
			class: "order-confirmation__info-row",
			"data-testid": "delivery-address",
		}, [
			h("span", { class: "order-confirmation__info-label" }, "Address"),
			h("span", parts.join(", ")),
		]));
	}

	rows.push(h("div", {
		class: "order-confirmation__info-row",
		"data-testid": "payment-method",
	}, [
		h("span", { class: "order-confirmation__info-label" }, "Payment"),
		h("span", "Paid"),
	]));

	return h("section", {
		class: "order-confirmation__customer-info",
		"data-testid": "customer-info",
	}, [
		h("h2", { class: "order-confirmation__section-title" }, "Details"),
		...rows,
	]);
}

function renderActions(orderId: string): VNode {
	return h("section", {
		class: "order-confirmation__actions",
		"data-testid": "order-actions",
	}, [
		h(RouterLink, {
			to: `/orders/${orderId}/confirmation`,
			class: "order-confirmation__action-btn order-confirmation__action-btn--primary",
			"data-testid": "track-order-link",
		}, { default: () => "Track Order" }),
		h(RouterLink, {
			to: "/menu",
			class: "order-confirmation__action-btn order-confirmation__action-btn--secondary",
			"data-testid": "continue-shopping-link",
		}, { default: () => "Continue Shopping" }),
	]);
}

// ── Page Component ──────────────────────────────────────────────────────────

export const OrderConfirmationPage = defineComponent({
	name: "OrderConfirmationPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const order = ref<AdminOrderDetail | null>(null);

		async function fetchOrder(orderId: string): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const result = await sdk.orders.get(orderId);
				order.value = result;
			} catch {
				error.value = "This order could not be found. It may have been removed or is no longer available.";
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
			if (loading.value) return renderLoading();
			if (error.value || !order.value) return renderError(error.value ?? "Order not found");

			const currentOrder = order.value;

			const steps = computeTrackingSteps(currentOrder.status, {
				placedAt: currentOrder.placedAt,
				confirmedAt: currentOrder.confirmedAt,
				preparingAt: currentOrder.preparingAt,
				readyAt: currentOrder.readyAt,
				completedAt: currentOrder.completedAt,
			});

			return h("div", {
				class: "order-confirmation-page",
				"data-testid": "order-confirmation-page",
			}, [
				renderSuccessHero(),
				h("p", {
					class: "order-confirmation__order-id",
					"data-testid": "order-id",
				}, `Order #${currentOrder.id}`),
				renderTrackingTimeline(steps),
				renderReceipt(currentOrder),
				renderCustomerInfo(currentOrder),
				renderActions(currentOrder.id),
			]);
		};
	},
});
