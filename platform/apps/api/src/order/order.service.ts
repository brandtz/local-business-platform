import { Injectable } from "@nestjs/common";
import type {
	CreateOrderFromCartInput,
	OrderRecord,
	OrderStatus,
	AdminOrderSummary,
	AdminOrderDetail,
	AdminOrderListQuery,
	AdminOrderListResponse,
	OrderPipelineCounts,
	OrderStatusCount,
	CustomerOrderSummary,
	CustomerOrderDetail,
	OrderItemDetail,
	OrderItemModifierDetail,
	OrderTrackingData,
	OrderItemRecord,
	OrderItemModifierRecord
} from "@platform/types";
import {
	isValidOrderTransition,
	getNextOrderStatuses,
	isOrderCancellable,
	orderStatuses,
	computeTrackingSteps,
	getCurrentTrackingStepIndex
} from "@platform/types";

import { OrderRepository } from "./order.repository";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class OrderNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OrderNotFoundError";
	}
}

export class OrderTransitionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OrderTransitionError";
	}
}

export class OrderValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OrderValidationError";
	}
}

// ---------------------------------------------------------------------------
// Order status → timestamp field mapping
// ---------------------------------------------------------------------------

const statusTimestampField: Record<string, string | null> = {
	placed: "placedAt",
	confirmed: "confirmedAt",
	preparing: "preparingAt",
	ready: "readyAt",
	completed: "completedAt",
	cancelled: "cancelledAt"
};

// ---------------------------------------------------------------------------
// Order domain service
// ---------------------------------------------------------------------------

@Injectable()
export class OrderService {
	constructor(
		private readonly repository: OrderRepository = new OrderRepository()
	) {}

	// -----------------------------------------------------------------------
	// Order creation
	// -----------------------------------------------------------------------

	createOrderFromCart(input: CreateOrderFromCartInput): OrderRecord {
		if (input.items.length === 0) {
			throw new OrderValidationError("Cannot create order with no items.");
		}

		if (input.totalCents < 0) {
			throw new OrderValidationError("Order total cannot be negative.");
		}

		const order = this.repository.createOrder(input.tenantId, {
			customerId: input.customerId,
			customerName: input.customerName,
			customerEmail: input.customerEmail,
			customerPhone: input.customerPhone,
			status: "placed",
			fulfillmentMode: input.fulfillmentMode,
			deliveryAddressLine1: input.deliveryAddress?.line1 ?? null,
			deliveryAddressLine2: input.deliveryAddress?.line2 ?? null,
			deliveryCity: input.deliveryAddress?.city ?? null,
			deliveryState: input.deliveryAddress?.state ?? null,
			deliveryZip: input.deliveryAddress?.zip ?? null,
			orderNotes: input.orderNotes,
			subtotalCents: input.subtotalCents,
			discountCents: input.discountCents,
			taxCents: input.taxCents,
			tipCents: input.tipCents,
			deliveryFeeCents: input.deliveryFeeCents,
			totalCents: input.totalCents,
			promoCode: input.promoCode,
			loyaltyCode: input.loyaltyCode,
			cartSessionId: input.cartSessionId
		});

		for (const itemInput of input.items) {
			const orderItem = this.repository.addOrderItem(order.id, {
				catalogItemId: itemInput.catalogItemId,
				catalogItemName: itemInput.catalogItemName,
				variantId: itemInput.variantId,
				variantName: itemInput.variantName,
				quantity: itemInput.quantity,
				unitPriceCents: itemInput.unitPriceCents,
				lineTotalCents: itemInput.lineTotalCents
			});

			for (const mod of itemInput.modifiers) {
				this.repository.addOrderItemModifier(orderItem.id, {
					modifierOptionId: mod.modifierOptionId,
					modifierName: mod.modifierName,
					priceCents: mod.priceCents
				});
			}
		}

		return order;
	}

	// -----------------------------------------------------------------------
	// Status transitions
	// -----------------------------------------------------------------------

	transitionOrderStatus(
		tenantId: string,
		orderId: string,
		targetStatus: OrderStatus,
		cancellationReason?: string
	): OrderRecord {
		const order = this.repository.getOrderById(tenantId, orderId);
		if (!order) {
			throw new OrderNotFoundError(`Order ${orderId} not found.`);
		}

		if (!isValidOrderTransition(order.status, targetStatus)) {
			throw new OrderTransitionError(
				`Cannot transition order from '${order.status}' to '${targetStatus}'.`
			);
		}

		if (targetStatus === "cancelled" && !isOrderCancellable(order.status)) {
			throw new OrderTransitionError(
				`Order in status '${order.status}' cannot be cancelled.`
			);
		}

		const timestampField = statusTimestampField[targetStatus] ?? null;

		const updated = this.repository.updateOrderStatus(
			orderId,
			targetStatus,
			timestampField,
			targetStatus === "cancelled" ? (cancellationReason ?? undefined) : undefined
		);

		if (!updated) {
			throw new OrderNotFoundError(`Order ${orderId} not found.`);
		}

		return updated;
	}

	cancelOrder(
		tenantId: string,
		orderId: string,
		reason?: string
	): OrderRecord {
		return this.transitionOrderStatus(
			tenantId,
			orderId,
			"cancelled",
			reason
		);
	}

	// -----------------------------------------------------------------------
	// Admin queries
	// -----------------------------------------------------------------------

	getAdminOrderDetail(
		tenantId: string,
		orderId: string
	): AdminOrderDetail {
		const order = this.repository.getOrderById(tenantId, orderId);
		if (!order) {
			throw new OrderNotFoundError(`Order ${orderId} not found.`);
		}

		return this.buildAdminOrderDetail(order);
	}

	listAdminOrders(query: AdminOrderListQuery): AdminOrderListResponse {
		const allOrders = this.repository.listOrdersForTenant(
			query.tenantId,
			{
				status: query.status,
				fulfillmentMode: query.fulfillmentMode,
				search: query.search,
				dateFrom: query.dateFrom,
				dateTo: query.dateTo
			}
		);

		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;
		const startIndex = (page - 1) * pageSize;
		const paged = allOrders.slice(startIndex, startIndex + pageSize);

		return {
			orders: paged.map((o) => this.buildAdminOrderSummary(o)),
			total: allOrders.length,
			page,
			pageSize
		};
	}

	getOrderPipelineCounts(tenantId: string): OrderPipelineCounts {
		const countMap = this.repository.countOrdersByStatus(tenantId);
		const counts: OrderStatusCount[] = [];
		let total = 0;

		for (const status of orderStatuses) {
			const count = countMap.get(status) ?? 0;
			counts.push({ status, count });
			total += count;
		}

		return { counts, total };
	}

	// -----------------------------------------------------------------------
	// Customer queries
	// -----------------------------------------------------------------------

	getCustomerOrderDetail(
		tenantId: string,
		orderId: string,
		customerId: string
	): CustomerOrderDetail {
		const order = this.repository.getOrderByIdForCustomer(
			tenantId,
			orderId,
			customerId
		);
		if (!order) {
			throw new OrderNotFoundError(`Order ${orderId} not found.`);
		}

		return this.buildCustomerOrderDetail(order);
	}

	listCustomerOrders(
		tenantId: string,
		customerId: string
	): CustomerOrderSummary[] {
		const orders = this.repository.listOrdersForCustomer(
			tenantId,
			customerId
		);
		return orders.map((o) => this.buildCustomerOrderSummary(o));
	}

	// -----------------------------------------------------------------------
	// Customer order tracking
	// -----------------------------------------------------------------------

	getOrderTrackingData(
		tenantId: string,
		orderId: string,
		customerId: string
	): OrderTrackingData {
		const order = this.repository.getOrderByIdForCustomer(
			tenantId,
			orderId,
			customerId
		);
		if (!order) {
			throw new OrderNotFoundError(`Order ${orderId} not found.`);
		}

		const items = this.repository.listOrderItems(orderId);
		const itemDetails = items.map((item) => this.buildOrderItemDetail(item));

		const steps = computeTrackingSteps(order.status, {
			placedAt: order.placedAt,
			confirmedAt: order.confirmedAt,
			preparingAt: order.preparingAt,
			readyAt: order.readyAt,
			completedAt: order.completedAt
		});

		return {
			orderId: order.id,
			status: order.status,
			isCancelled: order.status === "cancelled",
			steps,
			currentStepIndex: getCurrentTrackingStepIndex(order.status),
			customerInfoCard: {
				customerName: order.customerName,
				customerEmail: order.customerEmail,
				customerPhone: order.customerPhone,
				fulfillmentMode: order.fulfillmentMode,
				deliveryAddress: order.deliveryAddressLine1
					? {
							line1: order.deliveryAddressLine1,
							line2: order.deliveryAddressLine2,
							city: order.deliveryCity ?? "",
							state: order.deliveryState ?? "",
							zip: order.deliveryZip ?? ""
						}
					: null
			},
			receipt: {
				items: itemDetails,
				subtotalCents: order.subtotalCents,
				discountCents: order.discountCents,
				taxCents: order.taxCents,
				tipCents: order.tipCents,
				deliveryFeeCents: order.deliveryFeeCents,
				totalCents: order.totalCents,
				promoCode: order.promoCode
			}
		};
	}

	// -----------------------------------------------------------------------
	// Private builders
	// -----------------------------------------------------------------------

	private buildAdminOrderSummary(order: OrderRecord): AdminOrderSummary {
		const items = this.repository.listOrderItems(order.id);
		return {
			id: order.id,
			createdAt: order.createdAt,
			status: order.status,
			fulfillmentMode: order.fulfillmentMode,
			customerName: order.customerName,
			totalCents: order.totalCents,
			itemCount: items.length,
			placedAt: order.placedAt
		};
	}

	private buildAdminOrderDetail(order: OrderRecord): AdminOrderDetail {
		const items = this.repository.listOrderItems(order.id);
		const itemDetails = items.map((item) => this.buildOrderItemDetail(item));

		return {
			id: order.id,
			createdAt: order.createdAt,
			updatedAt: order.updatedAt,
			status: order.status,
			fulfillmentMode: order.fulfillmentMode,
			customerName: order.customerName,
			customerEmail: order.customerEmail,
			customerPhone: order.customerPhone,
			deliveryAddress: order.deliveryAddressLine1
				? {
						line1: order.deliveryAddressLine1,
						line2: order.deliveryAddressLine2,
						city: order.deliveryCity ?? "",
						state: order.deliveryState ?? "",
						zip: order.deliveryZip ?? ""
					}
				: null,
			orderNotes: order.orderNotes,
			subtotalCents: order.subtotalCents,
			discountCents: order.discountCents,
			taxCents: order.taxCents,
			tipCents: order.tipCents,
			deliveryFeeCents: order.deliveryFeeCents,
			totalCents: order.totalCents,
			promoCode: order.promoCode,
			loyaltyCode: order.loyaltyCode,
			items: itemDetails,
			placedAt: order.placedAt,
			confirmedAt: order.confirmedAt,
			preparingAt: order.preparingAt,
			readyAt: order.readyAt,
			completedAt: order.completedAt,
			cancelledAt: order.cancelledAt,
			cancellationReason: order.cancellationReason,
			allowedTransitions: getNextOrderStatuses(order.status)
		};
	}

	private buildCustomerOrderSummary(
		order: OrderRecord
	): CustomerOrderSummary {
		const items = this.repository.listOrderItems(order.id);
		return {
			id: order.id,
			createdAt: order.createdAt,
			status: order.status,
			fulfillmentMode: order.fulfillmentMode,
			totalCents: order.totalCents,
			itemCount: items.length
		};
	}

	private buildCustomerOrderDetail(
		order: OrderRecord
	): CustomerOrderDetail {
		const items = this.repository.listOrderItems(order.id);
		const itemDetails = items.map((item) => this.buildOrderItemDetail(item));

		return {
			id: order.id,
			createdAt: order.createdAt,
			status: order.status,
			fulfillmentMode: order.fulfillmentMode,
			deliveryAddress: order.deliveryAddressLine1
				? {
						line1: order.deliveryAddressLine1,
						line2: order.deliveryAddressLine2,
						city: order.deliveryCity ?? "",
						state: order.deliveryState ?? "",
						zip: order.deliveryZip ?? ""
					}
				: null,
			orderNotes: order.orderNotes,
			subtotalCents: order.subtotalCents,
			discountCents: order.discountCents,
			taxCents: order.taxCents,
			tipCents: order.tipCents,
			deliveryFeeCents: order.deliveryFeeCents,
			totalCents: order.totalCents,
			items: itemDetails,
			placedAt: order.placedAt,
			confirmedAt: order.confirmedAt,
			preparingAt: order.preparingAt,
			readyAt: order.readyAt,
			completedAt: order.completedAt,
			cancelledAt: order.cancelledAt
		};
	}

	private buildOrderItemDetail(item: OrderItemRecord): OrderItemDetail {
		const modifiers = this.repository.listOrderItemModifiers(item.id);
		return {
			id: item.id,
			catalogItemId: item.catalogItemId,
			catalogItemName: item.catalogItemName,
			variantId: item.variantId,
			variantName: item.variantName,
			quantity: item.quantity,
			unitPriceCents: item.unitPriceCents,
			lineTotalCents: item.lineTotalCents,
			modifiers: modifiers.map((m) => this.buildOrderItemModifierDetail(m))
		};
	}

	private buildOrderItemModifierDetail(
		modifier: OrderItemModifierRecord
	): OrderItemModifierDetail {
		return {
			id: modifier.id,
			modifierOptionId: modifier.modifierOptionId,
			modifierName: modifier.modifierName,
			priceCents: modifier.priceCents
		};
	}
}
