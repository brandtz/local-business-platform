// ---------------------------------------------------------------------------
// Order status and state machine
// ---------------------------------------------------------------------------

export const orderStatuses = [
	"draft",
	"placed",
	"confirmed",
	"preparing",
	"ready",
	"completed",
	"cancelled"
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

/**
 * Valid transitions from each order status.
 * Cancellation is allowed from placed, confirmed, and preparing only.
 */
export const orderStatusTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
	draft: ["placed"],
	placed: ["confirmed", "cancelled"],
	confirmed: ["preparing", "cancelled"],
	preparing: ["ready", "cancelled"],
	ready: ["completed"],
	completed: [],
	cancelled: []
};

/**
 * Checks whether a transition from one status to another is valid.
 */
export function isValidOrderTransition(
	from: OrderStatus,
	to: OrderStatus
): boolean {
	return (orderStatusTransitions[from] as readonly string[]).includes(to);
}

/**
 * Returns all valid next statuses from a given status.
 */
export function getNextOrderStatuses(
	status: OrderStatus
): readonly OrderStatus[] {
	return orderStatusTransitions[status];
}

/**
 * Terminal statuses where no further transitions are possible.
 */
export const terminalOrderStatuses: readonly OrderStatus[] = [
	"completed",
	"cancelled"
];

/**
 * Checks whether a status is terminal (no further transitions allowed).
 */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
	return (terminalOrderStatuses as readonly string[]).includes(status);
}

/**
 * Checks whether a string is a valid order status.
 */
export function isValidOrderStatus(status: string): status is OrderStatus {
	return (orderStatuses as readonly string[]).includes(status);
}

/**
 * Cancellable statuses — statuses from which an order can be cancelled.
 */
export const cancellableOrderStatuses: readonly OrderStatus[] = [
	"placed",
	"confirmed",
	"preparing"
];

/**
 * Checks whether an order in a given status can be cancelled.
 */
export function isOrderCancellable(status: OrderStatus): boolean {
	return (cancellableOrderStatuses as readonly string[]).includes(status);
}

// ---------------------------------------------------------------------------
// Fulfillment modes
// ---------------------------------------------------------------------------

export const orderFulfillmentModes = ["delivery", "pickup", "dine-in"] as const;
export type OrderFulfillmentMode = (typeof orderFulfillmentModes)[number];

/**
 * Checks whether a string is a valid order fulfillment mode.
 */
export function isValidOrderFulfillmentMode(
	mode: string
): mode is OrderFulfillmentMode {
	return (orderFulfillmentModes as readonly string[]).includes(mode);
}

// ---------------------------------------------------------------------------
// Order domain records
// ---------------------------------------------------------------------------

export type OrderRecord = {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	customerId: string | null;
	customerName: string | null;
	customerEmail: string | null;
	customerPhone: string | null;
	status: OrderStatus;
	fulfillmentMode: OrderFulfillmentMode;
	deliveryAddressLine1: string | null;
	deliveryAddressLine2: string | null;
	deliveryCity: string | null;
	deliveryState: string | null;
	deliveryZip: string | null;
	orderNotes: string | null;
	subtotalCents: number;
	discountCents: number;
	taxCents: number;
	tipCents: number;
	deliveryFeeCents: number;
	totalCents: number;
	promoCode: string | null;
	loyaltyCode: string | null;
	cartSessionId: string | null;
	placedAt: string | null;
	confirmedAt: string | null;
	preparingAt: string | null;
	readyAt: string | null;
	completedAt: string | null;
	cancelledAt: string | null;
	cancellationReason: string | null;
};

export type OrderItemRecord = {
	id: string;
	orderId: string;
	catalogItemId: string;
	catalogItemName: string;
	variantId: string | null;
	variantName: string | null;
	quantity: number;
	unitPriceCents: number;
	lineTotalCents: number;
};

export type OrderItemModifierRecord = {
	id: string;
	orderItemId: string;
	modifierOptionId: string;
	modifierName: string;
	priceCents: number;
};

// ---------------------------------------------------------------------------
// Order creation input (from cart)
// ---------------------------------------------------------------------------

export type CreateOrderFromCartInput = {
	tenantId: string;
	customerId: string | null;
	customerName: string | null;
	customerEmail: string | null;
	customerPhone: string | null;
	cartSessionId: string;
	fulfillmentMode: OrderFulfillmentMode;
	deliveryAddress: {
		line1: string;
		line2: string | null;
		city: string;
		state: string;
		zip: string;
	} | null;
	orderNotes: string | null;
	promoCode: string | null;
	loyaltyCode: string | null;
	items: CreateOrderItemInput[];
	subtotalCents: number;
	discountCents: number;
	taxCents: number;
	tipCents: number;
	deliveryFeeCents: number;
	totalCents: number;
};

export type CreateOrderItemInput = {
	catalogItemId: string;
	catalogItemName: string;
	variantId: string | null;
	variantName: string | null;
	quantity: number;
	unitPriceCents: number;
	lineTotalCents: number;
	modifiers: CreateOrderItemModifierInput[];
};

export type CreateOrderItemModifierInput = {
	modifierOptionId: string;
	modifierName: string;
	priceCents: number;
};

// ---------------------------------------------------------------------------
// Admin order list/detail response types
// ---------------------------------------------------------------------------

export type AdminOrderSummary = {
	id: string;
	createdAt: string;
	status: OrderStatus;
	fulfillmentMode: OrderFulfillmentMode;
	customerName: string | null;
	totalCents: number;
	itemCount: number;
	placedAt: string | null;
};

export type AdminOrderDetail = {
	id: string;
	createdAt: string;
	updatedAt: string;
	status: OrderStatus;
	fulfillmentMode: OrderFulfillmentMode;
	customerName: string | null;
	customerEmail: string | null;
	customerPhone: string | null;
	deliveryAddress: {
		line1: string;
		line2: string | null;
		city: string;
		state: string;
		zip: string;
	} | null;
	orderNotes: string | null;
	subtotalCents: number;
	discountCents: number;
	taxCents: number;
	tipCents: number;
	deliveryFeeCents: number;
	totalCents: number;
	promoCode: string | null;
	loyaltyCode: string | null;
	items: OrderItemDetail[];
	placedAt: string | null;
	confirmedAt: string | null;
	preparingAt: string | null;
	readyAt: string | null;
	completedAt: string | null;
	cancelledAt: string | null;
	cancellationReason: string | null;
	allowedTransitions: readonly OrderStatus[];
};

export type OrderItemDetail = {
	id: string;
	catalogItemId: string;
	catalogItemName: string;
	variantId: string | null;
	variantName: string | null;
	quantity: number;
	unitPriceCents: number;
	lineTotalCents: number;
	modifiers: OrderItemModifierDetail[];
};

export type OrderItemModifierDetail = {
	id: string;
	modifierOptionId: string;
	modifierName: string;
	priceCents: number;
};

// ---------------------------------------------------------------------------
// Admin order list query
// ---------------------------------------------------------------------------

export type AdminOrderListQuery = {
	tenantId: string;
	status?: OrderStatus;
	fulfillmentMode?: OrderFulfillmentMode;
	search?: string;
	dateFrom?: string;
	dateTo?: string;
	page?: number;
	pageSize?: number;
};

export type AdminOrderListResponse = {
	orders: AdminOrderSummary[];
	total: number;
	page: number;
	pageSize: number;
};

// ---------------------------------------------------------------------------
// Pipeline / status count aggregation
// ---------------------------------------------------------------------------

export type OrderStatusCount = {
	status: OrderStatus;
	count: number;
};

export type OrderPipelineCounts = {
	counts: OrderStatusCount[];
	total: number;
};

// ---------------------------------------------------------------------------
// Customer order response types
// ---------------------------------------------------------------------------

export type CustomerOrderSummary = {
	id: string;
	createdAt: string;
	status: OrderStatus;
	fulfillmentMode: OrderFulfillmentMode;
	totalCents: number;
	itemCount: number;
};

export type CustomerOrderDetail = {
	id: string;
	createdAt: string;
	status: OrderStatus;
	fulfillmentMode: OrderFulfillmentMode;
	deliveryAddress: {
		line1: string;
		line2: string | null;
		city: string;
		state: string;
		zip: string;
	} | null;
	orderNotes: string | null;
	subtotalCents: number;
	discountCents: number;
	taxCents: number;
	tipCents: number;
	deliveryFeeCents: number;
	totalCents: number;
	items: OrderItemDetail[];
	placedAt: string | null;
	confirmedAt: string | null;
	preparingAt: string | null;
	readyAt: string | null;
	completedAt: string | null;
	cancelledAt: string | null;
};

// ---------------------------------------------------------------------------
// Customer order tracking (E7-S2-T6)
// ---------------------------------------------------------------------------

export const orderTrackingSteps = [
	"placed",
	"confirmed",
	"preparing",
	"ready",
	"completed"
] as const;
export type OrderTrackingStep = (typeof orderTrackingSteps)[number];

export type OrderTrackingStepState = "completed" | "current" | "upcoming" | "skipped";

export type OrderTrackingStepInfo = {
	step: OrderTrackingStep;
	label: string;
	state: OrderTrackingStepState;
	timestamp: string | null;
};

export type OrderTrackingData = {
	orderId: string;
	status: OrderStatus;
	isCancelled: boolean;
	steps: OrderTrackingStepInfo[];
	currentStepIndex: number;
	customerInfoCard: {
		customerName: string | null;
		customerEmail: string | null;
		customerPhone: string | null;
		fulfillmentMode: OrderFulfillmentMode;
		deliveryAddress: {
			line1: string;
			line2: string | null;
			city: string;
			state: string;
			zip: string;
		} | null;
	};
	receipt: {
		items: OrderItemDetail[];
		subtotalCents: number;
		discountCents: number;
		taxCents: number;
		tipCents: number;
		deliveryFeeCents: number;
		totalCents: number;
		promoCode: string | null;
	};
};

/**
 * Maps an order status to tracking step states for progress bar rendering.
 * Cancelled orders show all steps as skipped after the last completed step.
 */
export function computeTrackingSteps(
	status: OrderStatus,
	timestamps: {
		placedAt: string | null;
		confirmedAt: string | null;
		preparingAt: string | null;
		readyAt: string | null;
		completedAt: string | null;
	}
): OrderTrackingStepInfo[] {
	const stepTimestamps: Record<OrderTrackingStep, string | null> = {
		placed: timestamps.placedAt,
		confirmed: timestamps.confirmedAt,
		preparing: timestamps.preparingAt,
		ready: timestamps.readyAt,
		completed: timestamps.completedAt
	};

	const stepLabels: Record<OrderTrackingStep, string> = {
		placed: "Order Placed",
		confirmed: "Confirmed",
		preparing: "Preparing",
		ready: "Ready",
		completed: "Completed"
	};

	const isCancelled = status === "cancelled";
	const statusIndex = isCancelled
		? -1
		: orderTrackingSteps.indexOf(status as OrderTrackingStep);

	return orderTrackingSteps.map((step, index) => {
		let state: OrderTrackingStepState;

		if (isCancelled) {
			state = stepTimestamps[step] ? "completed" : "skipped";
		} else if (index < statusIndex) {
			state = "completed";
		} else if (index === statusIndex) {
			state = "current";
		} else {
			state = "upcoming";
		}

		return {
			step,
			label: stepLabels[step],
			state,
			timestamp: stepTimestamps[step]
		};
	});
}

/**
 * Returns the index of the current step in the tracking progress bar.
 * Returns -1 for cancelled or draft orders.
 */
export function getCurrentTrackingStepIndex(status: OrderStatus): number {
	if (status === "cancelled" || status === "draft") return -1;
	return orderTrackingSteps.indexOf(status as OrderTrackingStep);
}

// ---------------------------------------------------------------------------
// Admin quick-action semantics
// ---------------------------------------------------------------------------

export type OrderQuickAction = {
	targetStatus: OrderStatus;
	label: string;
	confirmationMessage: string;
};

/**
 * Returns the available quick actions for an order given its current status.
 * Quick actions are the forward-moving transitions admin staff use operationally.
 */
export function getOrderQuickActions(status: OrderStatus): OrderQuickAction[] {
	const actions: OrderQuickAction[] = [];

	const transitions = orderStatusTransitions[status];

	for (const target of transitions) {
		if (target === "cancelled") continue; // cancel is not a quick action
		actions.push(getQuickActionForTransition(target));
	}

	return actions;
}

function getQuickActionForTransition(target: OrderStatus): OrderQuickAction {
	switch (target) {
		case "confirmed":
			return {
				targetStatus: "confirmed",
				label: "Confirm Order",
				confirmationMessage: "Confirm this order and notify the customer?"
			};
		case "preparing":
			return {
				targetStatus: "preparing",
				label: "Start Prep",
				confirmationMessage: "Start preparing this order?"
			};
		case "ready":
			return {
				targetStatus: "ready",
				label: "Mark Ready",
				confirmationMessage: "Mark this order as ready for pickup/delivery?"
			};
		case "completed":
			return {
				targetStatus: "completed",
				label: "Complete",
				confirmationMessage: "Mark this order as completed?"
			};
		case "placed":
			return {
				targetStatus: "placed",
				label: "Place Order",
				confirmationMessage: "Place this order?"
			};
		default:
			return {
				targetStatus: target,
				label: target,
				confirmationMessage: `Transition order to ${target}?`
			};
	}
}

// ---------------------------------------------------------------------------
// Time-ago formatting (E7-S2-T5)
// ---------------------------------------------------------------------------

/**
 * Formats a timestamp into a human-readable relative time string.
 * Designed for admin order pipeline views where relative time is most useful.
 *
 * @param timestamp - ISO 8601 timestamp string
 * @param now - Current time (defaults to Date.now() — injectable for tests)
 * @returns Human-readable relative time string (e.g. "5 mins ago", "2 hours ago")
 */
export function formatTimeAgo(
	timestamp: string,
	now: number = Date.now()
): string {
	const then = new Date(timestamp).getTime();
	const diffMs = now - then;

	if (diffMs < 0) return "just now";

	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSeconds < 60) return "just now";
	if (diffMinutes === 1) return "1 min ago";
	if (diffMinutes < 60) return `${diffMinutes} mins ago`;
	if (diffHours === 1) return "1 hour ago";
	if (diffHours < 24) return `${diffHours} hours ago`;
	if (diffDays === 1) return "1 day ago";
	if (diffDays < 30) return `${diffDays} days ago`;

	const diffMonths = Math.floor(diffDays / 30);
	if (diffMonths === 1) return "1 month ago";
	if (diffMonths < 12) return `${diffMonths} months ago`;

	const diffYears = Math.floor(diffDays / 365);
	if (diffYears === 1) return "1 year ago";
	return `${diffYears} years ago`;
}

/**
 * Returns the most relevant timestamp for display in admin pipeline views.
 * Prioritizes the most recent state-change timestamp.
 */
export function getOrderDisplayTimestamp(order: {
	placedAt: string | null;
	confirmedAt: string | null;
	preparingAt: string | null;
	readyAt: string | null;
	completedAt: string | null;
	cancelledAt: string | null;
	createdAt: string;
}): string {
	return (
		order.cancelledAt ??
		order.completedAt ??
		order.readyAt ??
		order.preparingAt ??
		order.confirmedAt ??
		order.placedAt ??
		order.createdAt
	);
}
