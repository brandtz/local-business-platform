import { describe, it, expect } from "vitest";

import type {
  OrderRecord,
  BookingRecord,
  OrderItemRecord,
  AggregationJobInput,
} from "@platform/types";

import { AnalyticsService } from "./analytics.service";
import type { OrderDataProvider, BookingDataProvider } from "./analytics.service";

// ─── Test Constants ──────────────────────────────────────────────────────────

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

// ─── Test Data Factories ─────────────────────────────────────────────────────

function sampleOrder(overrides?: Partial<OrderRecord>): OrderRecord {
  return {
    id: "order-1",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
    tenantId: TENANT_A,
    customerId: "cust-1",
    customerName: "Alice",
    customerEmail: "alice@example.com",
    customerPhone: "555-1234",
    status: "completed",
    fulfillmentMode: "pickup",
    deliveryAddressLine1: null,
    deliveryAddressLine2: null,
    deliveryCity: null,
    deliveryState: null,
    deliveryZip: null,
    orderNotes: null,
    subtotalCents: 2000,
    discountCents: 0,
    taxCents: 200,
    tipCents: 0,
    deliveryFeeCents: 0,
    totalCents: 2200,
    promoCode: null,
    loyaltyCode: null,
    cartSessionId: null,
    placedAt: "2026-01-15T10:00:00Z",
    confirmedAt: "2026-01-15T10:05:00Z",
    preparingAt: "2026-01-15T10:10:00Z",
    readyAt: "2026-01-15T10:20:00Z",
    completedAt: "2026-01-15T10:25:00Z",
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  };
}

function sampleBooking(overrides?: Partial<BookingRecord>): BookingRecord {
  return {
    id: "booking-1",
    createdAt: "2026-01-15T14:00:00Z",
    updatedAt: "2026-01-15T14:00:00Z",
    tenantId: TENANT_A,
    customerId: "cust-2",
    customerName: "Bob",
    customerEmail: "bob@example.com",
    customerPhone: "555-5678",
    serviceId: "svc-1",
    serviceName: "Haircut",
    staffId: "staff-1",
    staffName: "Carol",
    locationId: "loc-1",
    startTime: "2026-01-15T15:00:00Z",
    endTime: "2026-01-15T15:30:00Z",
    durationMinutes: 30,
    status: "completed",
    notes: null,
    cancellationReason: null,
    requestedAt: "2026-01-15T14:00:00Z",
    confirmedAt: "2026-01-15T14:05:00Z",
    checkedInAt: "2026-01-15T14:55:00Z",
    completedAt: "2026-01-15T15:30:00Z",
    cancelledAt: null,
    noShowAt: null,
    ...overrides,
  };
}

function sampleOrderItem(overrides?: Partial<OrderItemRecord>): OrderItemRecord {
  return {
    id: "item-1",
    orderId: "order-1",
    catalogItemId: "cat-1",
    catalogItemName: "Premium Coffee",
    variantId: null,
    variantName: null,
    quantity: 2,
    unitPriceCents: 500,
    lineTotalCents: 1000,
    ...overrides,
  };
}

// ─── Mock Data Providers ─────────────────────────────────────────────────────

function createMockOrderProvider(orders: OrderRecord[], items: OrderItemRecord[] = []): OrderDataProvider {
  return {
    getOrdersInRange: (tenantId: string, from: string, to: string) =>
      orders.filter(
        (o) =>
          o.tenantId === tenantId &&
          o.createdAt >= from &&
          o.createdAt <= to
      ),
    getOrderItems: (orderId: string) =>
      items.filter((i) => i.orderId === orderId),
  };
}

function createMockBookingProvider(bookings: BookingRecord[]): BookingDataProvider {
  return {
    getBookingsInRange: (tenantId: string, from: string, to: string) =>
      bookings.filter(
        (b) =>
          b.tenantId === tenantId &&
          b.createdAt >= from &&
          b.createdAt <= to
      ),
  };
}

// ─── Service Creation ────────────────────────────────────────────────────────

function createService(
  orders: OrderRecord[] = [],
  bookings: BookingRecord[] = [],
  items: OrderItemRecord[] = []
): AnalyticsService {
  const service = new AnalyticsService();
  service.setOrderProvider(createMockOrderProvider(orders, items));
  service.setBookingProvider(createMockBookingProvider(bookings));
  return service;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AnalyticsService", () => {
  // ── Aggregation Pipeline (T2) ──────────────────────────────────────────

  describe("runAggregation", () => {
    it("creates an aggregation record from completed orders and bookings", () => {
      const orders = [
        sampleOrder({ id: "o-1", totalCents: 2000 }),
        sampleOrder({ id: "o-2", totalCents: 3000, fulfillmentMode: "delivery" }),
        sampleOrder({ id: "o-3", status: "cancelled", totalCents: 1000 }),
      ];
      const bookings = [
        sampleBooking({ id: "b-1" }),
        sampleBooking({ id: "b-2", status: "cancelled" }),
      ];
      const service = createService(orders, bookings);

      const result = service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      expect(result.status).toBe("completed");
      expect(result.recordsProcessed).toBe(5); // all orders + bookings
      expect(result.aggregationId).not.toBeNull();
    });

    it("is idempotent — re-running overwrites existing aggregation", () => {
      const orders = [sampleOrder({ totalCents: 2000 })];
      const service = createService(orders);

      const input: AggregationJobInput = {
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      };

      const result1 = service.runAggregation(input);
      const result2 = service.runAggregation(input);

      expect(result1.status).toBe("completed");
      expect(result2.status).toBe("completed");
      // Both should reference the same aggregation (upserted)
      expect(result2.aggregationId).toBe(result1.aggregationId);
    });

    it("handles empty data gracefully", () => {
      const service = createService();

      const result = service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      expect(result.status).toBe("completed");
      expect(result.recordsProcessed).toBe(0);
    });

    it("computes channel breakdown from fulfillment modes", () => {
      const orders = [
        sampleOrder({ id: "o-1", fulfillmentMode: "delivery", totalCents: 1000 }),
        sampleOrder({ id: "o-2", fulfillmentMode: "pickup", totalCents: 2000 }),
        sampleOrder({ id: "o-3", fulfillmentMode: "dine-in", totalCents: 3000 }),
      ];
      const service = createService(orders);

      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const channelData = service.getChannelBreakdown({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      const deliveryItem = channelData.items.find((i) => i.channel === "delivery");
      const pickupItem = channelData.items.find((i) => i.channel === "pickup");
      const dineInItem = channelData.items.find((i) => i.channel === "dine_in");

      expect(deliveryItem?.revenueCents).toBe(1000);
      expect(pickupItem?.revenueCents).toBe(2000);
      expect(dineInItem?.revenueCents).toBe(3000);
    });

    it("tracks new vs returning customers", () => {
      const orders = [
        sampleOrder({ id: "o-1", customerId: "cust-1" }),
        sampleOrder({ id: "o-2", customerId: "cust-1" }), // returning
        sampleOrder({ id: "o-3", customerId: "cust-2" }),
      ];
      const service = createService(orders);

      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const kpi = service.getKpiSummary({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      // cust-1 seen twice → returning; cust-2 only once → new
      expect(kpi.newCustomerCount.current).toBe(1);
      expect(kpi.returningCustomerCount.current).toBe(1);
    });
  });

  // ── KPI Summary (T3) ──────────────────────────────────────────────────

  describe("getKpiSummary", () => {
    it("returns zero metrics when no data exists", () => {
      const service = createService();

      const kpi = service.getKpiSummary({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(kpi.revenueCents.current).toBe(0);
      expect(kpi.orderCount.current).toBe(0);
      expect(kpi.bookingCount.current).toBe(0);
      expect(kpi.retentionRate.trend).toBe("flat");
    });

    it("computes trend direction for metrics", () => {
      const orders = [
        sampleOrder({ id: "o-1", totalCents: 5000, createdAt: "2026-01-15T10:00:00Z" }),
      ];
      const service = createService(orders);

      // Run current period aggregation
      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const kpi = service.getKpiSummary({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(kpi.revenueCents.current).toBe(5000);
      expect(kpi.orderCount.current).toBe(1);
    });

    it("enforces tenant isolation", () => {
      const orders = [
        sampleOrder({ tenantId: TENANT_A, totalCents: 3000 }),
        sampleOrder({ tenantId: TENANT_B, id: "o-2", totalCents: 7000 }),
      ];
      const service = createService(orders);

      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });
      service.runAggregation({
        tenantId: TENANT_B,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const kpiA = service.getKpiSummary({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });
      const kpiB = service.getKpiSummary({
        tenantId: TENANT_B,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(kpiA.revenueCents.current).toBe(3000);
      expect(kpiB.revenueCents.current).toBe(7000);
    });
  });

  // ── Revenue Time Series (T3) ──────────────────────────────────────────

  describe("getRevenueTimeSeries", () => {
    it("returns time series data points", () => {
      const orders = [
        sampleOrder({ totalCents: 2000, createdAt: "2026-01-15T10:00:00Z" }),
      ];
      const service = createService(orders);

      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const result = service.getRevenueTimeSeries({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(result.periodType).toBe("daily");
      expect(result.points.length).toBeGreaterThanOrEqual(1);
      expect(result.totalRevenueCents).toBe(2000);
    });

    it("returns empty points when no data", () => {
      const service = createService();

      const result = service.getRevenueTimeSeries({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(result.points).toHaveLength(0);
      expect(result.totalRevenueCents).toBe(0);
    });
  });

  // ── Volume Time Series (T3) ───────────────────────────────────────────

  describe("getVolumeTimeSeries", () => {
    it("returns separate order and booking volume points", () => {
      const orders = [sampleOrder()];
      const bookings = [sampleBooking()];
      const service = createService(orders, bookings);

      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const result = service.getVolumeTimeSeries({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(result.orderPoints.length).toBeGreaterThanOrEqual(1);
      expect(result.bookingPoints.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Channel Breakdown (T3) ────────────────────────────────────────────

  describe("getChannelBreakdown", () => {
    it("returns all four channel types", () => {
      const service = createService();

      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const result = service.getChannelBreakdown({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(result.items).toHaveLength(4);
      const channels = result.items.map((i) => i.channel);
      expect(channels).toContain("delivery");
      expect(channels).toContain("pickup");
      expect(channels).toContain("dine_in");
      expect(channels).toContain("booking");
    });

    it("computes revenue percentages correctly", () => {
      const orders = [
        sampleOrder({ id: "o-1", fulfillmentMode: "pickup", totalCents: 5000 }),
        sampleOrder({ id: "o-2", fulfillmentMode: "delivery", totalCents: 5000 }),
      ];
      const service = createService(orders);

      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const result = service.getChannelBreakdown({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      const pickup = result.items.find((i) => i.channel === "pickup");
      const delivery = result.items.find((i) => i.channel === "delivery");

      expect(pickup?.revenuePercent).toBe(50);
      expect(delivery?.revenuePercent).toBe(50);
      expect(result.totalRevenueCents).toBe(10000);
    });
  });

  // ── Top Performers (T3) ───────────────────────────────────────────────

  describe("getTopPerformers", () => {
    it("returns product performers from order item data", () => {
      const orders = [sampleOrder({ id: "o-1" })];
      const items = [
        sampleOrderItem({ orderId: "o-1", catalogItemId: "cat-1", catalogItemName: "Premium Coffee", lineTotalCents: 1000 }),
        sampleOrderItem({ id: "item-2", orderId: "o-1", catalogItemId: "cat-2", catalogItemName: "Latte", lineTotalCents: 800, quantity: 1 }),
      ];
      const service = createService(orders, [], items);

      const result = service.getTopPerformers(
        {
          tenantId: TENANT_A,
          timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
        },
        "product"
      );

      expect(result.category).toBe("product");
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0].revenueCents).toBeGreaterThan(0);
    });

    it("limits results to requested limit", () => {
      const service = createService();

      const result = service.getTopPerformers(
        {
          tenantId: TENANT_A,
          timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
        },
        "product",
        5
      );

      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it("returns location performers", () => {
      const orders = [sampleOrder()];
      const service = createService(orders);

      const result = service.getTopPerformers(
        {
          tenantId: TENANT_A,
          timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
        },
        "location"
      );

      expect(result.category).toBe("location");
    });
  });

  // ── Retention Insights (T3) ───────────────────────────────────────────

  describe("getRetentionInsights", () => {
    it("returns retention metrics with zero data", () => {
      const service = createService();

      const result = service.getRetentionInsights({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(result.current.retentionRate).toBe(0);
      expect(result.current.churnRate).toBe(0);
      expect(result.current.totalCustomerCount).toBe(0);
    });

    it("computes retention from new and returning customer counts", () => {
      const orders = [
        sampleOrder({ id: "o-1", customerId: "cust-1" }),
        sampleOrder({ id: "o-2", customerId: "cust-1" }),
        sampleOrder({ id: "o-3", customerId: "cust-2" }),
      ];
      const service = createService(orders);

      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "monthly",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const result = service.getRetentionInsights({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(result.current.totalCustomerCount).toBe(2);
      expect(result.current.returningCustomerCount).toBe(1);
      expect(result.current.retentionRate).toBe(50);
      expect(result.current.churnRate).toBe(50);
    });
  });

  // ── Dashboard Widget Data (T4) ────────────────────────────────────────

  describe("getDashboardWidgetData", () => {
    it("returns complete dashboard widget data", () => {
      const orders = [sampleOrder({ totalCents: 5000 })];
      const bookings = [sampleBooking()];
      const service = createService(orders, bookings);

      service.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const result = service.getDashboardWidgetData({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      expect(result.kpiCards).toHaveLength(4);
      expect(result.kpiCards[0].label).toBe("Revenue");
      expect(result.kpiCards[1].label).toBe("Orders");
      expect(result.kpiCards[2].label).toBe("Bookings");
      expect(result.kpiCards[3].label).toBe("Retention");
      expect(result.revenueChart).toBeDefined();
      expect(result.trafficChart).toBeDefined();
      expect(result.lastUpdated).toBeTruthy();
    });

    it("KPI cards include trend information", () => {
      const service = createService();

      const result = service.getDashboardWidgetData({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
      });

      for (const card of result.kpiCards) {
        expect(["up", "down", "flat"]).toContain(card.trend);
        expect(typeof card.changePercent).toBe("number");
      }
    });
  });
});
