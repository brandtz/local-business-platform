// E7-S2-T6: Customer-facing order tracking — progress bar state mapping,
// itemized receipt, and confirmation page data contract.

import type {
	OrderTrackingData,
	OrderTrackingStepInfo,
	OrderItemDetail,
	OrderFulfillmentMode
} from "@platform/types";
import { formatTimeAgo } from "@platform/types";

// ---------------------------------------------------------------------------
// Tracking page view model
// ---------------------------------------------------------------------------

export type OrderTrackingViewModel = {
	orderId: string;
	isCancelled: boolean;
	progressBar: OrderProgressBarStep[];
	progressPercent: number;
	statusMessage: string;
	customerInfo: CustomerInfoCardViewModel;
	receipt: OrderReceiptViewModel;
};

export type OrderProgressBarStep = {
	label: string;
	state: "completed" | "current" | "upcoming" | "skipped";
	timeAgo: string | null;
};

export type CustomerInfoCardViewModel = {
	customerName: string;
	customerEmail: string | null;
	customerPhone: string | null;
	fulfillmentLabel: string;
	deliveryAddress: string | null;
};

export type OrderReceiptViewModel = {
	items: ReceiptLineItem[];
	subtotalFormatted: string;
	discountFormatted: string;
	taxFormatted: string;
	tipFormatted: string;
	deliveryFeeFormatted: string;
	totalFormatted: string;
	promoCode: string | null;
};

export type ReceiptLineItem = {
	name: string;
	variantName: string | null;
	quantity: number;
	lineTotalFormatted: string;
	modifiers: string[];
};

// ---------------------------------------------------------------------------
// View model builder
// ---------------------------------------------------------------------------

const fulfillmentLabels: Record<OrderFulfillmentMode, string> = {
	delivery: "Delivery",
	pickup: "Pickup",
	"dine-in": "Dine-In"
};

const statusMessages: Record<string, string> = {
	placed: "Your order has been placed and is waiting to be confirmed.",
	confirmed: "Your order has been confirmed and will be prepared shortly.",
	preparing: "Your order is being prepared.",
	ready: "Your order is ready!",
	completed: "Your order has been completed. Thank you!",
	cancelled: "Your order has been cancelled."
};

/**
 * Builds a complete view model for the customer order tracking page.
 */
export function buildOrderTrackingViewModel(
	data: OrderTrackingData,
	now?: number
): OrderTrackingViewModel {
	const totalSteps = data.steps.length;
	const completedSteps = data.steps.filter(
		(s) => s.state === "completed" || s.state === "current"
	).length;
	const progressPercent =
		totalSteps > 0
			? Math.round((completedSteps / totalSteps) * 100)
			: 0;

	return {
		orderId: data.orderId,
		isCancelled: data.isCancelled,
		progressBar: data.steps.map((step) =>
			buildProgressBarStep(step, now)
		),
		progressPercent,
		statusMessage: statusMessages[data.status] ?? "Order status unknown.",
		customerInfo: buildCustomerInfoCard(data),
		receipt: buildReceipt(data)
	};
}

function buildProgressBarStep(
	step: OrderTrackingStepInfo,
	now?: number
): OrderProgressBarStep {
	return {
		label: step.label,
		state: step.state,
		timeAgo: step.timestamp ? formatTimeAgo(step.timestamp, now) : null
	};
}

function buildCustomerInfoCard(
	data: OrderTrackingData
): CustomerInfoCardViewModel {
	const card = data.customerInfoCard;
	return {
		customerName: card.customerName ?? "Guest",
		customerEmail: card.customerEmail,
		customerPhone: card.customerPhone,
		fulfillmentLabel: fulfillmentLabels[card.fulfillmentMode],
		deliveryAddress: card.deliveryAddress
			? formatDeliveryAddress(card.deliveryAddress)
			: null
	};
}

function buildReceipt(data: OrderTrackingData): OrderReceiptViewModel {
	return {
		items: data.receipt.items.map((item) => buildReceiptLineItem(item)),
		subtotalFormatted: formatReceiptCents(data.receipt.subtotalCents),
		discountFormatted: formatReceiptCents(data.receipt.discountCents),
		taxFormatted: formatReceiptCents(data.receipt.taxCents),
		tipFormatted: formatReceiptCents(data.receipt.tipCents),
		deliveryFeeFormatted: formatReceiptCents(
			data.receipt.deliveryFeeCents
		),
		totalFormatted: formatReceiptCents(data.receipt.totalCents),
		promoCode: data.receipt.promoCode
	};
}

function buildReceiptLineItem(item: OrderItemDetail): ReceiptLineItem {
	return {
		name: item.catalogItemName,
		variantName: item.variantName,
		quantity: item.quantity,
		lineTotalFormatted: formatReceiptCents(item.lineTotalCents),
		modifiers: item.modifiers.map((m) => m.modifierName)
	};
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Formats cents as a dollar amount (e.g. 2500 → "$25.00").
 */
export function formatReceiptCents(cents: number): string {
	const dollars = Math.abs(cents) / 100;
	const formatted = `$${dollars.toFixed(2)}`;
	return cents < 0 ? `-${formatted}` : formatted;
}

function formatDeliveryAddress(address: {
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
