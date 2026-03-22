import { describe, it, expect } from "vitest";
import {
  assertValidPlaceOrderRequest,
  assertValidTransitionOrderStatusRequest,
  assertValidCancelOrderRequest,
  validateAdminOrderListQuery,
  OrderApiContractError,
} from "./order-api-contracts";

describe("Order API Contracts", () => {
  // -----------------------------------------------------------------------
  // PlaceOrderRequest
  // -----------------------------------------------------------------------

  describe("assertValidPlaceOrderRequest", () => {
    it("accepts valid request with cartSessionId", () => {
      expect(() => assertValidPlaceOrderRequest({ cartSessionId: "cart-1" })).not.toThrow();
    });

    it("accepts request with customer info", () => {
      expect(() =>
        assertValidPlaceOrderRequest({
          cartSessionId: "cart-1",
          customerName: "John",
          customerEmail: "john@example.com",
          customerPhone: "555-1234",
        })
      ).not.toThrow();
    });

    it("rejects non-object", () => {
      expect(() => assertValidPlaceOrderRequest("not-object")).toThrow(OrderApiContractError);
    });

    it("rejects null", () => {
      expect(() => assertValidPlaceOrderRequest(null)).toThrow(OrderApiContractError);
    });

    it("rejects missing cartSessionId", () => {
      expect(() => assertValidPlaceOrderRequest({})).toThrow(OrderApiContractError);
    });

    it("rejects empty cartSessionId", () => {
      expect(() => assertValidPlaceOrderRequest({ cartSessionId: "" })).toThrow(
        OrderApiContractError
      );
    });

    it("rejects non-string customerName", () => {
      expect(() =>
        assertValidPlaceOrderRequest({
          cartSessionId: "cart-1",
          customerName: 123,
        })
      ).toThrow(OrderApiContractError);
    });

    it("rejects non-string customerEmail", () => {
      expect(() =>
        assertValidPlaceOrderRequest({
          cartSessionId: "cart-1",
          customerEmail: 123,
        })
      ).toThrow(OrderApiContractError);
    });

    it("rejects non-string customerPhone", () => {
      expect(() =>
        assertValidPlaceOrderRequest({
          cartSessionId: "cart-1",
          customerPhone: true,
        })
      ).toThrow(OrderApiContractError);
    });
  });

  // -----------------------------------------------------------------------
  // TransitionOrderStatusRequest
  // -----------------------------------------------------------------------

  describe("assertValidTransitionOrderStatusRequest", () => {
    it("accepts valid confirmed transition", () => {
      expect(() =>
        assertValidTransitionOrderStatusRequest({
          targetStatus: "confirmed",
        })
      ).not.toThrow();
    });

    it("accepts cancelled with reason", () => {
      expect(() =>
        assertValidTransitionOrderStatusRequest({
          targetStatus: "cancelled",
          cancellationReason: "Customer request",
        })
      ).not.toThrow();
    });

    it("rejects non-object", () => {
      expect(() => assertValidTransitionOrderStatusRequest("not-object")).toThrow(
        OrderApiContractError
      );
    });

    it("rejects missing targetStatus", () => {
      expect(() => assertValidTransitionOrderStatusRequest({})).toThrow(OrderApiContractError);
    });

    it("rejects invalid targetStatus", () => {
      expect(() =>
        assertValidTransitionOrderStatusRequest({
          targetStatus: "invalid-status",
        })
      ).toThrow(OrderApiContractError);
    });

    it("rejects non-string cancellationReason", () => {
      expect(() =>
        assertValidTransitionOrderStatusRequest({
          targetStatus: "cancelled",
          cancellationReason: 123,
        })
      ).toThrow(OrderApiContractError);
    });
  });

  // -----------------------------------------------------------------------
  // CancelOrderRequest
  // -----------------------------------------------------------------------

  describe("assertValidCancelOrderRequest", () => {
    it("accepts empty object", () => {
      expect(() => assertValidCancelOrderRequest({})).not.toThrow();
    });

    it("accepts with reason", () => {
      expect(() => assertValidCancelOrderRequest({ reason: "Changed my mind" })).not.toThrow();
    });

    it("rejects non-object", () => {
      expect(() => assertValidCancelOrderRequest("not-object")).toThrow(OrderApiContractError);
    });

    it("rejects non-string reason", () => {
      expect(() => assertValidCancelOrderRequest({ reason: 123 })).toThrow(OrderApiContractError);
    });
  });

  // -----------------------------------------------------------------------
  // Admin order list query validation
  // -----------------------------------------------------------------------

  describe("validateAdminOrderListQuery", () => {
    it("returns empty result for no filters", () => {
      const result = validateAdminOrderListQuery({});
      expect(result).toEqual({});
    });

    it("validates status filter", () => {
      const result = validateAdminOrderListQuery({ status: "placed" });
      expect(result.status).toBe("placed");
    });

    it("rejects invalid status filter", () => {
      expect(() => validateAdminOrderListQuery({ status: "fake" })).toThrow(OrderApiContractError);
    });

    it("validates fulfillmentMode filter", () => {
      const result = validateAdminOrderListQuery({
        fulfillmentMode: "pickup",
      });
      expect(result.fulfillmentMode).toBe("pickup");
    });

    it("rejects invalid fulfillmentMode filter", () => {
      expect(() => validateAdminOrderListQuery({ fulfillmentMode: "fake" })).toThrow(
        OrderApiContractError
      );
    });

    it("trims search term", () => {
      const result = validateAdminOrderListQuery({
        search: "  john  ",
      });
      expect(result.search).toBe("john");
    });

    it("ignores blank search", () => {
      const result = validateAdminOrderListQuery({ search: "   " });
      expect(result.search).toBeUndefined();
    });

    it("validates page number", () => {
      const result = validateAdminOrderListQuery({ page: "3" });
      expect(result.page).toBe(3);
    });

    it("rejects invalid page", () => {
      expect(() => validateAdminOrderListQuery({ page: "0" })).toThrow(OrderApiContractError);

      expect(() => validateAdminOrderListQuery({ page: "abc" })).toThrow(OrderApiContractError);
    });

    it("validates pageSize", () => {
      const result = validateAdminOrderListQuery({ pageSize: "50" });
      expect(result.pageSize).toBe(50);
    });

    it("rejects invalid pageSize", () => {
      expect(() => validateAdminOrderListQuery({ pageSize: "0" })).toThrow(OrderApiContractError);

      expect(() => validateAdminOrderListQuery({ pageSize: "101" })).toThrow(OrderApiContractError);
    });

    it("passes through date filters", () => {
      const result = validateAdminOrderListQuery({
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
      });
      expect(result.dateFrom).toBe("2026-03-01");
      expect(result.dateTo).toBe("2026-03-31");
    });

    it("combines all filters", () => {
      const result = validateAdminOrderListQuery({
        status: "confirmed",
        fulfillmentMode: "delivery",
        search: "jane",
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        page: "2",
        pageSize: "10",
      });
      expect(result.status).toBe("confirmed");
      expect(result.fulfillmentMode).toBe("delivery");
      expect(result.search).toBe("jane");
      expect(result.dateFrom).toBe("2026-03-01");
      expect(result.dateTo).toBe("2026-03-31");
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });
  });
});
