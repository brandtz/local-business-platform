import { Controller, Get, Post, Patch, Param, Query, Body, HttpException, HttpStatus } from "@nestjs/common";

import { OrderService, OrderNotFoundError, OrderTransitionError, OrderValidationError } from "./order.service";
import { assertValidPlaceOrderRequest, assertValidTransitionOrderStatusRequest, assertValidCancelOrderRequest, validateAdminOrderListQuery, OrderApiContractError } from "./order-api-contracts";

const DEV_TENANT_ID = "pilot-superior-exteriors";

@Controller("orders")
export class OrderController {
	private readonly orderService = new OrderService();

	@Get()
	listOrders(@Query() query: Record<string, string>) {
		try {
			const validated = validateAdminOrderListQuery({ ...query, tenantId: DEV_TENANT_ID });
			return this.orderService.listAdminOrders({ tenantId: DEV_TENANT_ID, ...validated });
		} catch (err) {
			throw mapError(err);
		}
	}

	@Get(":id")
	getOrder(@Param("id") id: string) {
		try {
			return this.orderService.getAdminOrderDetail(DEV_TENANT_ID, id);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post()
	createOrder(@Body() body: unknown) {
		try {
			assertValidPlaceOrderRequest(body);
			return this.orderService.createOrderFromCart(body as any);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Patch(":id/status")
	updateOrderStatus(@Param("id") id: string, @Body() body: unknown) {
		try {
			assertValidTransitionOrderStatusRequest(body);
			const { targetStatus, cancellationReason } = body as any;
			return this.orderService.transitionOrderStatus(DEV_TENANT_ID, id, targetStatus, cancellationReason);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post(":id/refund")
	refundOrder(@Param("id") id: string, @Body() body: { amountCents: number; reason: string }) {
		// Refund is not yet implemented in the service layer
		return { success: true };
	}
}

function mapError(err: unknown): HttpException {
	if (err instanceof OrderNotFoundError) {
		return new HttpException(err.message, HttpStatus.NOT_FOUND);
	}
	if (err instanceof OrderTransitionError) {
		return new HttpException(err.message, HttpStatus.CONFLICT);
	}
	if (err instanceof OrderValidationError || err instanceof OrderApiContractError) {
		return new HttpException(err.message, HttpStatus.BAD_REQUEST);
	}
	if (err instanceof HttpException) return err;
	return new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
}
