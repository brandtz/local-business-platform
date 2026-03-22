// E11-S1-T2/T3: Analytics computation pipeline and tenant-scoped query API.
// Computes daily/weekly/monthly aggregation rollups from order, booking, and customer data.
// All queries are tenant-scoped and support time-period + location filtering.

import type {
  AnalyticsAggregationPeriod,
  AnalyticsAggregationRecord,
  AnalyticsChannelType,
  AnalyticsKpiSummary,
  AnalyticsQueryParams,
  AggregationJobInput,
  ChannelBreakdownItem,
  ChannelBreakdownResponse,
  ChannelBreakdownEntry,
  DashboardAnalyticsWidgetData,
  DashboardKpiCard,
  KpiMetric,
  RetentionInsightsResponse,
  RetentionMetrics,
  RetentionTimeSeriesPoint,
  RevenueTimeSeriesResponse,
  RunAggregationResult,
  TimeSeriesDataPoint,
  TopPerformerCategory,
  TopPerformerEntry,
  TopPerformersResponse,
  VolumeTimeSeriesResponse,
  OrderRecord,
  BookingRecord,
  OrderItemRecord,
} from "@platform/types";

import {
  computeChangePercent,
  computeRetentionRate,
  computeTrendDirection,
} from "@platform/types";

import { AnalyticsRepository, emptyChannelBreakdown } from "./analytics.repository";

// ─── Injectable Decorator Stub ───────────────────────────────────────────────

function Injectable(): ClassDecorator {
  return () => {};
}

// ─── Error Classes ───────────────────────────────────────────────────────────

export class AnalyticsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsValidationError";
  }
}

export class AnalyticsNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsNotFoundError";
  }
}

// ─── Order / Booking Record Provider Interface ───────────────────────────────

export type OrderDataProvider = {
  getOrdersInRange(tenantId: string, from: string, to: string): OrderRecord[];
  getOrderItems?(orderId: string): OrderItemRecord[];
};

export type BookingDataProvider = {
  getBookingsInRange(tenantId: string, from: string, to: string): BookingRecord[];
};

// ─── Helper: Map fulfillment mode to analytics channel ───────────────────────

function mapFulfillmentToChannel(fulfillmentMode: string): AnalyticsChannelType {
  switch (fulfillmentMode) {
    case "delivery":
      return "delivery";
    case "pickup":
      return "pickup";
    case "dine-in":
      return "dine_in";
    default:
      return "pickup";
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository = new AnalyticsRepository(),
    private orderProvider: OrderDataProvider | null = null,
    private bookingProvider: BookingDataProvider | null = null
  ) {}

  setOrderProvider(provider: OrderDataProvider): void {
    this.orderProvider = provider;
  }

  setBookingProvider(provider: BookingDataProvider): void {
    this.bookingProvider = provider;
  }

  // ── T2: Aggregation Pipeline ─────────────────────────────────────────────

  /**
   * Runs an aggregation job for a specific tenant, period type, and date range.
   * Idempotent: re-running for the same parameters overwrites existing aggregation.
   */
  runAggregation(input: AggregationJobInput): RunAggregationResult {
    const job = this.repository.createJob({
      tenantId: input.tenantId,
      periodType: input.periodType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });

    this.repository.updateJobStatus(job.id, "running");

    try {
      const orders = this.orderProvider?.getOrdersInRange(
        input.tenantId,
        input.periodStart,
        input.periodEnd
      ) ?? [];

      const bookings = this.bookingProvider?.getBookingsInRange(
        input.tenantId,
        input.periodStart,
        input.periodEnd
      ) ?? [];

      // Compute aggregation metrics
      const completedOrders = orders.filter((o) => o.status === "completed");
      const completedBookings = bookings.filter((b) => b.status === "completed");

      const revenueCents = completedOrders.reduce((sum, o) => sum + o.totalCents, 0);
      const orderCount = completedOrders.length;
      const bookingCount = completedBookings.length;

      // Customer analysis — new vs returning
      const customerIds = new Set<string>();
      const seenBefore = new Set<string>();

      for (const order of completedOrders) {
        if (order.customerId) {
          if (customerIds.has(order.customerId)) {
            seenBefore.add(order.customerId);
          }
          customerIds.add(order.customerId);
        }
      }
      for (const booking of completedBookings) {
        if (booking.customerId) {
          if (customerIds.has(booking.customerId)) {
            seenBefore.add(booking.customerId);
          }
          customerIds.add(booking.customerId);
        }
      }

      const returningCustomerCount = seenBefore.size;
      const newCustomerCount = customerIds.size - returningCustomerCount;

      // Channel breakdown
      const channelBreakdown = emptyChannelBreakdown();
      for (const order of completedOrders) {
        const channel = mapFulfillmentToChannel(order.fulfillmentMode);
        channelBreakdown[channel].count += 1;
        channelBreakdown[channel].revenueCents += order.totalCents;
      }
      channelBreakdown.booking.count = bookingCount;

      const aggregation = this.repository.upsertAggregation({
        tenantId: input.tenantId,
        locationId: null,
        periodType: input.periodType,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        revenueCents,
        orderCount,
        bookingCount,
        newCustomerCount,
        returningCustomerCount,
        channelBreakdown,
      });

      this.repository.updateJobStatus(job.id, "completed");

      return {
        jobId: job.id,
        status: "completed",
        recordsProcessed: orders.length + bookings.length,
        aggregationId: aggregation.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.repository.updateJobStatus(job.id, "failed", message);
      return {
        jobId: job.id,
        status: "failed",
        recordsProcessed: 0,
        aggregationId: null,
      };
    }
  }

  // ── T3: KPI Summary ──────────────────────────────────────────────────────

  getKpiSummary(params: AnalyticsQueryParams): AnalyticsKpiSummary {
    const currentRecords = this.repository.getAggregations(
      params.tenantId,
      "daily",
      params.timeFilter.from,
      params.timeFilter.to,
      params.locationId
    );

    // Compute previous period for trend
    const fromDate = new Date(params.timeFilter.from);
    const toDate = new Date(params.timeFilter.to);
    const durationMs = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - durationMs).toISOString();
    const prevTo = params.timeFilter.from;

    const previousRecords = this.repository.getAggregations(
      params.tenantId,
      "daily",
      prevFrom,
      prevTo,
      params.locationId
    );

    const currentTotals = this.sumAggregations(currentRecords);
    const previousTotals = this.sumAggregations(previousRecords);

    return {
      revenueCents: this.buildKpiMetric(currentTotals.revenueCents, previousTotals.revenueCents),
      orderCount: this.buildKpiMetric(currentTotals.orderCount, previousTotals.orderCount),
      bookingCount: this.buildKpiMetric(currentTotals.bookingCount, previousTotals.bookingCount),
      newCustomerCount: this.buildKpiMetric(currentTotals.newCustomerCount, previousTotals.newCustomerCount),
      returningCustomerCount: this.buildKpiMetric(
        currentTotals.returningCustomerCount,
        previousTotals.returningCustomerCount
      ),
      retentionRate: this.buildRetentionKpiMetric(currentTotals, previousTotals),
    };
  }

  // ── T3: Revenue Time Series ──────────────────────────────────────────────

  getRevenueTimeSeries(
    params: AnalyticsQueryParams,
    periodType: AnalyticsAggregationPeriod = "daily"
  ): RevenueTimeSeriesResponse {
    const records = this.repository.getAggregations(
      params.tenantId,
      periodType,
      params.timeFilter.from,
      params.timeFilter.to,
      params.locationId
    );

    const points: TimeSeriesDataPoint[] = records.map((r) => ({
      period: r.periodStart,
      value: r.revenueCents,
    }));

    const totalRevenueCents = records.reduce((sum, r) => sum + r.revenueCents, 0);

    return { points, totalRevenueCents, periodType };
  }

  // ── T3: Volume Time Series ───────────────────────────────────────────────

  getVolumeTimeSeries(
    params: AnalyticsQueryParams,
    periodType: AnalyticsAggregationPeriod = "daily"
  ): VolumeTimeSeriesResponse {
    const records = this.repository.getAggregations(
      params.tenantId,
      periodType,
      params.timeFilter.from,
      params.timeFilter.to,
      params.locationId
    );

    const orderPoints: TimeSeriesDataPoint[] = records.map((r) => ({
      period: r.periodStart,
      value: r.orderCount,
    }));

    const bookingPoints: TimeSeriesDataPoint[] = records.map((r) => ({
      period: r.periodStart,
      value: r.bookingCount,
    }));

    return { orderPoints, bookingPoints, periodType };
  }

  // ── T3: Channel Breakdown ────────────────────────────────────────────────

  getChannelBreakdown(params: AnalyticsQueryParams): ChannelBreakdownResponse {
    const records = this.repository.getAggregations(
      params.tenantId,
      "daily",
      params.timeFilter.from,
      params.timeFilter.to,
      params.locationId
    );

    const channelTotals = emptyChannelBreakdown();
    for (const record of records) {
      for (const [channel, entry] of Object.entries(record.channelBreakdown)) {
        const ch = channel as AnalyticsChannelType;
        const bd = entry as ChannelBreakdownEntry;
        channelTotals[ch].count += bd.count;
        channelTotals[ch].revenueCents += bd.revenueCents;
      }
    }

    const totalRevenueCents = Object.values(channelTotals).reduce(
      (sum, e) => sum + e.revenueCents,
      0
    );

    const items: ChannelBreakdownItem[] = Object.entries(channelTotals).map(
      ([channel, entry]) => ({
        channel: channel as AnalyticsChannelType,
        orderCount: entry.count,
        revenueCents: entry.revenueCents,
        revenuePercent: totalRevenueCents > 0
          ? (entry.revenueCents / totalRevenueCents) * 100
          : 0,
      })
    );

    return { items, totalRevenueCents };
  }

  // ── T3: Top Performers ───────────────────────────────────────────────────

  getTopPerformers(
    params: AnalyticsQueryParams,
    category: TopPerformerCategory,
    limit: number = 10
  ): TopPerformersResponse {
    // For the in-memory implementation, top performers are computed from raw order data
    const orders = this.orderProvider?.getOrdersInRange(
      params.tenantId,
      params.timeFilter.from,
      params.timeFilter.to
    ) ?? [];

    const completedOrders = orders.filter((o) => o.status === "completed");

    const performerMap = new Map<string, { name: string; revenueCents: number; count: number }>();

    if (category === "product") {
      // Group by product using order items from provider
      for (const order of completedOrders) {
        const items = this.orderProvider?.getOrderItems?.(order.id) ?? [];
        for (const item of items) {
          const existing = performerMap.get(item.catalogItemId) ?? {
            name: item.catalogItemName,
            revenueCents: 0,
            count: 0,
          };
          existing.revenueCents += item.lineTotalCents;
          existing.count += item.quantity;
          performerMap.set(item.catalogItemId, existing);
        }
        // If no items provider, aggregate at order level
        if (items.length === 0) {
          const key = `order-${order.id}`;
          const existing = performerMap.get(key) ?? {
            name: "Order " + order.id.slice(0, 8),
            revenueCents: 0,
            count: 0,
          };
          existing.revenueCents += order.totalCents;
          existing.count += 1;
          performerMap.set(key, existing);
        }
      }
    } else if (category === "location") {
      // Group by locationId (not on order record, use "default" for now)
      const entry = performerMap.get("default-location") ?? {
        name: "Main Location",
        revenueCents: 0,
        count: 0,
      };
      for (const order of completedOrders) {
        entry.revenueCents += order.totalCents;
        entry.count += 1;
      }
      performerMap.set("default-location", entry);
    } else {
      // staff — not directly on order record, use empty
    }

    const items: TopPerformerEntry[] = Array.from(performerMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        category,
        revenueCents: data.revenueCents,
        count: data.count,
        trendPercent: 0,
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, limit);

    return { items, category };
  }

  // ── T3: Retention Metrics ────────────────────────────────────────────────

  getRetentionInsights(
    params: AnalyticsQueryParams,
    periodType: AnalyticsAggregationPeriod = "monthly"
  ): RetentionInsightsResponse {
    const records = this.repository.getAggregations(
      params.tenantId,
      periodType,
      params.timeFilter.from,
      params.timeFilter.to,
      params.locationId
    );

    const totalNew = records.reduce((s, r) => s + r.newCustomerCount, 0);
    const totalReturning = records.reduce((s, r) => s + r.returningCustomerCount, 0);
    const totalCustomers = totalNew + totalReturning;

    const current: RetentionMetrics = {
      retentionRate: computeRetentionRate(totalReturning, totalCustomers),
      newCustomerCount: totalNew,
      returningCustomerCount: totalReturning,
      totalCustomerCount: totalCustomers,
      churnRate: totalCustomers > 0 ? 100 - computeRetentionRate(totalReturning, totalCustomers) : 0,
    };

    const timeSeries: RetentionTimeSeriesPoint[] = records.map((r) => {
      const total = r.newCustomerCount + r.returningCustomerCount;
      return {
        period: r.periodStart,
        retentionRate: computeRetentionRate(r.returningCustomerCount, total),
        newCustomers: r.newCustomerCount,
        returningCustomers: r.returningCustomerCount,
      };
    });

    return { current, timeSeries, periodType };
  }

  // ── T4: Dashboard Widget Data ────────────────────────────────────────────

  getDashboardWidgetData(params: AnalyticsQueryParams): DashboardAnalyticsWidgetData {
    const kpiSummary = this.getKpiSummary(params);
    const revenueTs = this.getRevenueTimeSeries(params, "daily");
    const volumeTs = this.getVolumeTimeSeries(params, "daily");

    const kpiCards: DashboardKpiCard[] = [
      {
        label: "Revenue",
        valueCents: kpiSummary.revenueCents.current,
        trend: kpiSummary.revenueCents.trend,
        changePercent: kpiSummary.revenueCents.changePercent,
      },
      {
        label: "Orders",
        valueCount: kpiSummary.orderCount.current,
        trend: kpiSummary.orderCount.trend,
        changePercent: kpiSummary.orderCount.changePercent,
      },
      {
        label: "Bookings",
        valueCount: kpiSummary.bookingCount.current,
        trend: kpiSummary.bookingCount.trend,
        changePercent: kpiSummary.bookingCount.changePercent,
      },
      {
        label: "Retention",
        valuePercent: kpiSummary.retentionRate.current,
        trend: kpiSummary.retentionRate.trend,
        changePercent: kpiSummary.retentionRate.changePercent,
      },
    ];

    return {
      kpiCards,
      revenueChart: {
        points: revenueTs.points,
        periodType: revenueTs.periodType,
      },
      trafficChart: {
        orderPoints: volumeTs.orderPoints,
        bookingPoints: volumeTs.bookingPoints,
        periodType: volumeTs.periodType,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private sumAggregations(records: AnalyticsAggregationRecord[]): {
    revenueCents: number;
    orderCount: number;
    bookingCount: number;
    newCustomerCount: number;
    returningCustomerCount: number;
  } {
    return records.reduce(
      (acc, r) => ({
        revenueCents: acc.revenueCents + r.revenueCents,
        orderCount: acc.orderCount + r.orderCount,
        bookingCount: acc.bookingCount + r.bookingCount,
        newCustomerCount: acc.newCustomerCount + r.newCustomerCount,
        returningCustomerCount: acc.returningCustomerCount + r.returningCustomerCount,
      }),
      {
        revenueCents: 0,
        orderCount: 0,
        bookingCount: 0,
        newCustomerCount: 0,
        returningCustomerCount: 0,
      }
    );
  }

  private buildKpiMetric(current: number, previous: number): KpiMetric {
    const changePercent = computeChangePercent(current, previous);
    return {
      current,
      previous,
      changePercent,
      trend: computeTrendDirection(changePercent),
    };
  }

  private buildRetentionKpiMetric(
    currentTotals: { newCustomerCount: number; returningCustomerCount: number },
    previousTotals: { newCustomerCount: number; returningCustomerCount: number }
  ): KpiMetric {
    const currentTotal = currentTotals.newCustomerCount + currentTotals.returningCustomerCount;
    const previousTotal = previousTotals.newCustomerCount + previousTotals.returningCustomerCount;

    const currentRate = computeRetentionRate(currentTotals.returningCustomerCount, currentTotal);
    const previousRate = computeRetentionRate(previousTotals.returningCustomerCount, previousTotal);
    const changePercent = computeChangePercent(currentRate, previousRate);

    return {
      current: currentRate,
      previous: previousRate,
      changePercent,
      trend: computeTrendDirection(changePercent),
    };
  }
}
