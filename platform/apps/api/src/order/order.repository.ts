import type {
	OrderRecord,
	OrderItemRecord,
	OrderItemModifierRecord,
	OrderStatus,
	OrderFulfillmentMode
} from "@platform/types";

// ---------------------------------------------------------------------------
// In-memory order repository for tenant-scoped CRUD
// ---------------------------------------------------------------------------

const orderCounter = { value: 0 };
const orderItemCounter = { value: 0 };
const orderModifierCounter = { value: 0 };

function nextId(prefix: string, counter: { value: number }): string {
	counter.value += 1;
	return `${prefix}-${counter.value}`;
}

function now(): string {
	return new Date().toISOString();
}

export class OrderRepository {
	private orders: OrderRecord[] = [];
	private items: OrderItemRecord[] = [];
	private modifiers: OrderItemModifierRecord[] = [];

	// -----------------------------------------------------------------------
	// Orders
	// -----------------------------------------------------------------------

	createOrder(
		tenantId: string,
		data: {
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
		}
	): OrderRecord {
		const timestamp = now();
		const order: OrderRecord = {
			id: nextId("order", orderCounter),
			createdAt: timestamp,
			updatedAt: timestamp,
			tenantId,
			customerId: data.customerId,
			customerName: data.customerName,
			customerEmail: data.customerEmail,
			customerPhone: data.customerPhone,
			status: data.status,
			fulfillmentMode: data.fulfillmentMode,
			deliveryAddressLine1: data.deliveryAddressLine1,
			deliveryAddressLine2: data.deliveryAddressLine2,
			deliveryCity: data.deliveryCity,
			deliveryState: data.deliveryState,
			deliveryZip: data.deliveryZip,
			orderNotes: data.orderNotes,
			subtotalCents: data.subtotalCents,
			discountCents: data.discountCents,
			taxCents: data.taxCents,
			tipCents: data.tipCents,
			deliveryFeeCents: data.deliveryFeeCents,
			totalCents: data.totalCents,
			promoCode: data.promoCode,
			loyaltyCode: data.loyaltyCode,
			cartSessionId: data.cartSessionId,
			placedAt: data.status === "placed" ? timestamp : null,
			confirmedAt: null,
			preparingAt: null,
			readyAt: null,
			completedAt: null,
			cancelledAt: null,
			cancellationReason: null
		};
		this.orders.push(order);
		return order;
	}

	getOrderById(tenantId: string, orderId: string): OrderRecord | undefined {
		return this.orders.find(
			(o) => o.tenantId === tenantId && o.id === orderId
		);
	}

	getOrderByIdForCustomer(
		tenantId: string,
		orderId: string,
		customerId: string
	): OrderRecord | undefined {
		return this.orders.find(
			(o) =>
				o.tenantId === tenantId &&
				o.id === orderId &&
				o.customerId === customerId
		);
	}

	listOrdersForTenant(
		tenantId: string,
		filters?: {
			status?: OrderStatus;
			fulfillmentMode?: OrderFulfillmentMode;
			search?: string;
			dateFrom?: string;
			dateTo?: string;
		}
	): OrderRecord[] {
		let results = this.orders.filter((o) => o.tenantId === tenantId);

		if (filters?.status) {
			results = results.filter((o) => o.status === filters.status);
		}
		if (filters?.fulfillmentMode) {
			results = results.filter(
				(o) => o.fulfillmentMode === filters.fulfillmentMode
			);
		}
		if (filters?.search) {
			const term = filters.search.toLowerCase();
			results = results.filter(
				(o) =>
					o.id.toLowerCase().includes(term) ||
					(o.customerName?.toLowerCase().includes(term) ?? false)
			);
		}
		if (filters?.dateFrom) {
			results = results.filter((o) => o.createdAt >= filters.dateFrom!);
		}
		if (filters?.dateTo) {
			results = results.filter((o) => o.createdAt <= filters.dateTo!);
		}

		return results.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
	}

	listOrdersForCustomer(
		tenantId: string,
		customerId: string
	): OrderRecord[] {
		return this.orders
			.filter(
				(o) => o.tenantId === tenantId && o.customerId === customerId
			)
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() -
					new Date(a.createdAt).getTime()
			);
	}

	updateOrderStatus(
		orderId: string,
		status: OrderStatus,
		timestampField: string | null,
		cancellationReason?: string
	): OrderRecord | undefined {
		const order = this.orders.find((o) => o.id === orderId);
		if (!order) return undefined;

		order.status = status;
		order.updatedAt = now();

		if (timestampField && timestampField in order) {
			(order as Record<string, unknown>)[timestampField] = order.updatedAt;
		}

		if (cancellationReason !== undefined) {
			order.cancellationReason = cancellationReason;
		}

		return order;
	}

	countOrdersByStatus(
		tenantId: string
	): Map<OrderStatus, number> {
		const counts = new Map<OrderStatus, number>();
		for (const order of this.orders) {
			if (order.tenantId !== tenantId) continue;
			counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
		}
		return counts;
	}

	// -----------------------------------------------------------------------
	// Order items
	// -----------------------------------------------------------------------

	addOrderItem(
		orderId: string,
		data: {
			catalogItemId: string;
			catalogItemName: string;
			variantId: string | null;
			variantName: string | null;
			quantity: number;
			unitPriceCents: number;
			lineTotalCents: number;
		}
	): OrderItemRecord {
		const item: OrderItemRecord = {
			id: nextId("order-item", orderItemCounter),
			orderId,
			catalogItemId: data.catalogItemId,
			catalogItemName: data.catalogItemName,
			variantId: data.variantId,
			variantName: data.variantName,
			quantity: data.quantity,
			unitPriceCents: data.unitPriceCents,
			lineTotalCents: data.lineTotalCents
		};
		this.items.push(item);
		return item;
	}

	listOrderItems(orderId: string): OrderItemRecord[] {
		return this.items.filter((i) => i.orderId === orderId);
	}

	// -----------------------------------------------------------------------
	// Order item modifiers
	// -----------------------------------------------------------------------

	addOrderItemModifier(
		orderItemId: string,
		data: {
			modifierOptionId: string;
			modifierName: string;
			priceCents: number;
		}
	): OrderItemModifierRecord {
		const modifier: OrderItemModifierRecord = {
			id: nextId("order-mod", orderModifierCounter),
			orderItemId,
			modifierOptionId: data.modifierOptionId,
			modifierName: data.modifierName,
			priceCents: data.priceCents
		};
		this.modifiers.push(modifier);
		return modifier;
	}

	listOrderItemModifiers(orderItemId: string): OrderItemModifierRecord[] {
		return this.modifiers.filter((m) => m.orderItemId === orderItemId);
	}
}
