import type { OrderFulfillmentMode, OrderStatus } from "@platform/types";
import { isValidOrderFulfillmentMode, isValidOrderStatus } from "@platform/types";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class OrderApiContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderApiContractError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Place order request (customer creates order from cart)
// ---------------------------------------------------------------------------

export type PlaceOrderRequest = {
  cartSessionId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

export function assertValidPlaceOrderRequest(
  payload: unknown
): asserts payload is PlaceOrderRequest {
  if (!isRecord(payload)) {
    throw new OrderApiContractError("Request body must be an object.");
  }
  if (!isNonEmptyString(payload.cartSessionId)) {
    throw new OrderApiContractError("cartSessionId must be a non-empty string.");
  }
  if (payload.customerName !== undefined && typeof payload.customerName !== "string") {
    throw new OrderApiContractError("customerName must be a string.");
  }
  if (payload.customerEmail !== undefined && typeof payload.customerEmail !== "string") {
    throw new OrderApiContractError("customerEmail must be a string.");
  }
  if (payload.customerPhone !== undefined && typeof payload.customerPhone !== "string") {
    throw new OrderApiContractError("customerPhone must be a string.");
  }
}

// ---------------------------------------------------------------------------
// Transition order status request (admin changes order state)
// ---------------------------------------------------------------------------

export type TransitionOrderStatusRequest = {
  targetStatus: OrderStatus;
  cancellationReason?: string;
};

export function assertValidTransitionOrderStatusRequest(
  payload: unknown
): asserts payload is TransitionOrderStatusRequest {
  if (!isRecord(payload)) {
    throw new OrderApiContractError("Request body must be an object.");
  }
  if (
    !isNonEmptyString(payload.targetStatus) ||
    !isValidOrderStatus(payload.targetStatus as string)
  ) {
    throw new OrderApiContractError("targetStatus must be a valid order status.");
  }
  if (payload.cancellationReason !== undefined && typeof payload.cancellationReason !== "string") {
    throw new OrderApiContractError("cancellationReason must be a string.");
  }
}

// ---------------------------------------------------------------------------
// Cancel order request (customer cancels their own order)
// ---------------------------------------------------------------------------

export type CancelOrderRequest = {
  reason?: string;
};

export function assertValidCancelOrderRequest(
  payload: unknown
): asserts payload is CancelOrderRequest {
  if (!isRecord(payload)) {
    throw new OrderApiContractError("Request body must be an object.");
  }
  if (payload.reason !== undefined && typeof payload.reason !== "string") {
    throw new OrderApiContractError("reason must be a string.");
  }
}

// ---------------------------------------------------------------------------
// Admin order list query validation
// ---------------------------------------------------------------------------

export type AdminOrderListQueryParams = {
  status?: string;
  fulfillmentMode?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
};

export type ValidatedAdminOrderListQuery = {
  status?: OrderStatus;
  fulfillmentMode?: OrderFulfillmentMode;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export function validateAdminOrderListQuery(
  params: AdminOrderListQueryParams
): ValidatedAdminOrderListQuery {
  const result: ValidatedAdminOrderListQuery = {};

  if (params.status !== undefined) {
    if (!isValidOrderStatus(params.status)) {
      throw new OrderApiContractError(`Invalid status filter: '${params.status}'.`);
    }
    result.status = params.status;
  }

  if (params.fulfillmentMode !== undefined) {
    if (!isValidOrderFulfillmentMode(params.fulfillmentMode)) {
      throw new OrderApiContractError(
        `Invalid fulfillmentMode filter: '${params.fulfillmentMode}'.`
      );
    }
    result.fulfillmentMode = params.fulfillmentMode;
  }

  if (params.search !== undefined && params.search.trim().length > 0) {
    result.search = params.search.trim();
  }

  if (params.dateFrom !== undefined) {
    result.dateFrom = params.dateFrom;
  }

  if (params.dateTo !== undefined) {
    result.dateTo = params.dateTo;
  }

  if (params.page !== undefined) {
    const page = parseInt(params.page, 10);
    if (isNaN(page) || page < 1) {
      throw new OrderApiContractError("page must be a positive integer.");
    }
    result.page = page;
  }

  if (params.pageSize !== undefined) {
    const pageSize = parseInt(params.pageSize, 10);
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new OrderApiContractError("pageSize must be an integer between 1 and 100.");
    }
    result.pageSize = pageSize;
  }

  return result;
}
