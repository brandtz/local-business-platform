import { describe, it, expect } from "vitest";

import type {
  OrderRecord,
  BookingRecord,
  AnalyticsExportRequest,
} from "@platform/types";

import { AnalyticsService } from "./analytics.service";
import type { OrderDataProvider, BookingDataProvider } from "./analytics.service";
import { AnalyticsExportService } from "./analytics-export.service";

// ─── Test Constants ──────────────────────────────────────────────────────────

const TENANT_A = "tenant-a";

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

function createMockOrderProvider(orders: OrderRecord[]): OrderDataProvider {
  return {
    getOrdersInRange: (tenantId: string, from: string, to: string) =>
      orders.filter(
        (o) => o.tenantId === tenantId && o.createdAt >= from && o.createdAt <= to
      ),
  };
}

function createMockBookingProvider(bookings: BookingRecord[]): BookingDataProvider {
  return {
    getBookingsInRange: (tenantId: string, from: string, to: string) =>
      bookings.filter(
        (b) => b.tenantId === tenantId && b.createdAt >= from && b.createdAt <= to
      ),
  };
}

function createServices(
  orders: OrderRecord[] = [],
  bookings: BookingRecord[] = []
): { analyticsService: AnalyticsService; exportService: AnalyticsExportService } {
  const analyticsService = new AnalyticsService();
  analyticsService.setOrderProvider(createMockOrderProvider(orders));
  analyticsService.setBookingProvider(createMockBookingProvider(bookings));
  const exportService = new AnalyticsExportService(analyticsService);
  return { analyticsService, exportService };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AnalyticsExportService", () => {
  describe("generateExport", () => {
    it("generates a CSV export with valid metadata", () => {
      const orders = [sampleOrder()];
      const { analyticsService, exportService } = createServices(orders);

      analyticsService.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const request: AnalyticsExportRequest = {
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
        format: "csv",
        sections: ["revenue"],
      };

      const result = exportService.generateExport(request);

      expect(result.format).toBe("csv");
      expect(result.fileName).toContain("analytics-");
      expect(result.fileName).toMatch(/\.csv$/);
      expect(result.downloadUrl).toContain("/api/analytics/exports/");
      expect(result.generatedAt).toBeTruthy();
      expect(result.expiresAt).toBeTruthy();
    });

    it("generates a PDF export", () => {
      const { analyticsService, exportService } = createServices();

      analyticsService.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const result = exportService.generateExport({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
        format: "pdf",
        sections: ["retention"],
      });

      expect(result.format).toBe("pdf");
      expect(result.fileName).toMatch(/\.pdf$/);
    });

    it("includes multiple sections in export", () => {
      const orders = [sampleOrder()];
      const bookings = [sampleBooking()];
      const { analyticsService, exportService } = createServices(orders, bookings);

      analyticsService.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const result = exportService.generateExport({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
        format: "csv",
        sections: ["revenue", "volume", "channels", "top-performers", "retention"],
      });

      expect(result.id).toBeTruthy();
      expect(result.format).toBe("csv");
    });

    it("expiry is 24 hours after generation", () => {
      const { analyticsService, exportService } = createServices();

      analyticsService.runAggregation({
        tenantId: TENANT_A,
        periodType: "daily",
        periodStart: "2026-01-01T00:00:00Z",
        periodEnd: "2026-01-31T23:59:59Z",
      });

      const result = exportService.generateExport({
        tenantId: TENANT_A,
        timeFilter: { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
        format: "csv",
        sections: ["revenue"],
      });

      const generatedAt = new Date(result.generatedAt).getTime();
      const expiresAt = new Date(result.expiresAt).getTime();
      const diffHours = (expiresAt - generatedAt) / (1000 * 60 * 60);

      expect(diffHours).toBeCloseTo(24, 0);
    });
  });

  describe("generateCsvContent", () => {
    it("generates valid CSV content", () => {
      const { exportService } = createServices();

      const csv = exportService.generateCsvContent([
        ["Header1", "Header2"],
        ["Value1", "Value2"],
        ["Comma, Value", "Normal"],
      ]);

      expect(csv).toContain("Header1,Header2");
      expect(csv).toContain("Value1,Value2");
      expect(csv).toContain('"Comma, Value"');
    });

    it("escapes double quotes in CSV", () => {
      const { exportService } = createServices();

      const csv = exportService.generateCsvContent([
        ['Value with "quotes"', "Normal"],
      ]);

      expect(csv).toContain('"Value with ""quotes"""');
    });
  });
});
