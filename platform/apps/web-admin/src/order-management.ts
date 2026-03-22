// E7-S2-T4: Admin order management views — order list with pipeline counts,
// individual order detail, and quick-action status transition buttons.

import type {
	OrderStatus,
	AdminOrderSummary,
	AdminOrderDetail,
	OrderPipelineCounts,
	OrderQuickAction,
	OrderFulfillmentMode
} from "@platform/types";
import { getOrderQuickActions, isOrderCancellable, formatTimeAgo, getOrderDisplayTimestamp } from "@platform/types";

// ---------------------------------------------------------------------------
// Order status badge display
// ---------------------------------------------------------------------------

export type OrderStatusBadge = {
	status: OrderStatus;
	label: string;
	colorClass: string;
};

const statusBadgeConfig: Record<OrderStatus, { label: string; colorClass: string }> = {
	draft: { label: "Draft", colorClass: "badge-neutral" },
	placed: { label: "New", colorClass: "badge-info" },
	confirmed: { label: "Confirmed", colorClass: "badge-primary" },
	preparing: { label: "Preparing", colorClass: "badge-warning" },
	ready: { label: "Ready", colorClass: "badge-success" },
	completed: { label: "Completed", colorClass: "badge-muted" },
	cancelled: { label: "Cancelled", colorClass: "badge-danger" }
};

/**
 * Returns the display badge configuration for an order status.
 */
export function getOrderStatusBadge(status: OrderStatus): OrderStatusBadge {
	const config = statusBadgeConfig[status];
	return {
		status,
		label: config.label,
		colorClass: config.colorClass
	};
}

// ---------------------------------------------------------------------------
// Fulfillment mode display
// ---------------------------------------------------------------------------

const fulfillmentModeLabels: Record<OrderFulfillmentMode, string> = {
	delivery: "Delivery",
	pickup: "Pickup",
	"dine-in": "Dine-In"
};

/**
 * Returns a human-readable label for a fulfillment mode.
 */
export function getFulfillmentModeLabel(mode: OrderFulfillmentMode): string {
	return fulfillmentModeLabels[mode];
}

// ---------------------------------------------------------------------------
// Pipeline view model
// ---------------------------------------------------------------------------

export type PipelineStatusEntry = {
	status: OrderStatus;
	label: string;
	count: number;
	colorClass: string;
};

/**
 * Builds pipeline status entries from pipeline counts for rendering
 * status badges with counts (e.g., "New 12", "Confirmed 5").
 */
export function buildPipelineView(
	pipeline: OrderPipelineCounts
): PipelineStatusEntry[] {
	return pipeline.counts.map((c) => {
		const badge = getOrderStatusBadge(c.status);
		return {
			status: c.status,
			label: badge.label,
			count: c.count,
			colorClass: badge.colorClass
		};
	});
}

// ---------------------------------------------------------------------------
// Order list row view model
// ---------------------------------------------------------------------------

export type OrderListRowViewModel = {
	id: string;
	statusBadge: OrderStatusBadge;
	fulfillmentLabel: string;
	customerName: string;
	totalFormatted: string;
	itemCount: number;
	timeAgo: string;
};

/**
 * Maps an admin order summary to a list row view model for rendering.
 */
export function buildOrderListRow(
	order: AdminOrderSummary,
	now?: number
): OrderListRowViewModel {
	return {
		id: order.id,
		statusBadge: getOrderStatusBadge(order.status),
		fulfillmentLabel: getFulfillmentModeLabel(order.fulfillmentMode),
		customerName: order.customerName ?? "Guest",
		totalFormatted: formatCents(order.totalCents),
		itemCount: order.itemCount,
		timeAgo: formatTimeAgo(order.placedAt ?? order.createdAt, now)
	};
}

// ---------------------------------------------------------------------------
// Order detail view model
// ---------------------------------------------------------------------------

export type OrderDetailViewModel = {
	id: string;
	statusBadge: OrderStatusBadge;
	fulfillmentLabel: string;
	customerName: string;
	customerEmail: string | null;
	customerPhone: string | null;
	deliveryAddress: string | null;
	orderNotes: string | null;
	subtotalFormatted: string;
	discountFormatted: string;
	taxFormatted: string;
	tipFormatted: string;
	deliveryFeeFormatted: string;
	totalFormatted: string;
	promoCode: string | null;
	loyaltyCode: string | null;
	items: OrderDetailItemViewModel[];
	quickActions: OrderQuickAction[];
	canCancel: boolean;
	timeAgo: string;
};

export type OrderDetailItemViewModel = {
	id: string;
	catalogItemName: string;
	variantName: string | null;
	quantity: number;
	unitPriceFormatted: string;
	lineTotalFormatted: string;
	modifiers: Array<{
		modifierName: string;
		priceFormatted: string;
	}>;
};

/**
 * Maps an admin order detail to a view model for rendering.
 */
export function buildOrderDetailViewModel(
	detail: AdminOrderDetail,
	now?: number
): OrderDetailViewModel {
	const displayTimestamp = getOrderDisplayTimestamp({
		placedAt: detail.placedAt,
		confirmedAt: detail.confirmedAt,
		preparingAt: detail.preparingAt,
		readyAt: detail.readyAt,
		completedAt: detail.completedAt,
		cancelledAt: detail.cancelledAt,
		createdAt: detail.createdAt
	});

	return {
		id: detail.id,
		statusBadge: getOrderStatusBadge(detail.status),
		fulfillmentLabel: getFulfillmentModeLabel(detail.fulfillmentMode),
		customerName: detail.customerName ?? "Guest",
		customerEmail: detail.customerEmail,
		customerPhone: detail.customerPhone,
		deliveryAddress: detail.deliveryAddress
			? formatAddress(detail.deliveryAddress)
			: null,
		orderNotes: detail.orderNotes,
		subtotalFormatted: formatCents(detail.subtotalCents),
		discountFormatted: formatCents(detail.discountCents),
		taxFormatted: formatCents(detail.taxCents),
		tipFormatted: formatCents(detail.tipCents),
		deliveryFeeFormatted: formatCents(detail.deliveryFeeCents),
		totalFormatted: formatCents(detail.totalCents),
		promoCode: detail.promoCode,
		loyaltyCode: detail.loyaltyCode,
		items: detail.items.map((item) => ({
			id: item.id,
			catalogItemName: item.catalogItemName,
			variantName: item.variantName,
			quantity: item.quantity,
			unitPriceFormatted: formatCents(item.unitPriceCents),
			lineTotalFormatted: formatCents(item.lineTotalCents),
			modifiers: item.modifiers.map((m) => ({
				modifierName: m.modifierName,
				priceFormatted: formatCents(m.priceCents)
			}))
		})),
		quickActions: getOrderQuickActions(detail.status),
		canCancel: isOrderCancellable(detail.status),
		timeAgo: formatTimeAgo(displayTimestamp, now)
	};
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Formats cents as a dollar amount (e.g. 2500 → "$25.00").
 */
export function formatCents(cents: number): string {
	const dollars = Math.abs(cents) / 100;
	const formatted = `$${dollars.toFixed(2)}`;
	return cents < 0 ? `-${formatted}` : formatted;
}

/**
 * Formats a delivery address into a single string.
 */
export function formatAddress(address: {
	line1: string;
	line2: string | null;
	city: string;
	state: string;
	zip: string;
}): string {
	const parts = [address.line1];
	if (address.line2) parts.push(address.line2);
	parts.push(`${address.city}, ${address.state} ${address.zip}`);
	return parts.join(", ");
}
