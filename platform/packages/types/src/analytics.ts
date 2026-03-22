// ─── Aggregation Period & Data Model (E11-S1-T1) ────────────────────────────

export const analyticsAggregationPeriods = ["daily", "weekly", "monthly"] as const;
export type AnalyticsAggregationPeriod = (typeof analyticsAggregationPeriods)[number];

/**
 * Analytics channel types derived from order fulfillment modes plus booking.
 * Maps to OrderFulfillmentMode ("delivery" | "pickup" | "dine-in") with
 * underscored "dine_in" for column-safe naming, and "booking" for services.
 */
export const analyticsChannelTypes = ["delivery", "pickup", "dine_in", "booking"] as const;
export type AnalyticsChannelType = (typeof analyticsChannelTypes)[number];

export type ChannelBreakdownEntry = {
  count: number;
  revenueCents: number;
};

export type AnalyticsAggregationRecord = {
  id: string;
  tenantId: string;
  locationId: string | null;
  periodType: AnalyticsAggregationPeriod;
  periodStart: string;
  periodEnd: string;
  revenueCents: number;
  orderCount: number;
  bookingCount: number;
  newCustomerCount: number;
  returningCustomerCount: number;
  channelBreakdown: Record<AnalyticsChannelType, ChannelBreakdownEntry>;
  createdAt: string;
  updatedAt: string;
};

// ─── Computation Pipeline Types (E11-S1-T2) ─────────────────────────────────

export const aggregationJobStatuses = ["pending", "running", "completed", "failed"] as const;
export type AggregationJobStatus = (typeof aggregationJobStatuses)[number];

export type AggregationJobRecord = {
  id: string;
  tenantId: string;
  periodType: AnalyticsAggregationPeriod;
  periodStart: string;
  periodEnd: string;
  status: AggregationJobStatus;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

export type AggregationJobInput = {
  tenantId: string;
  periodType: AnalyticsAggregationPeriod;
  periodStart: string;
  periodEnd: string;
};

export type RunAggregationResult = {
  jobId: string;
  status: AggregationJobStatus;
  recordsProcessed: number;
  aggregationId: string | null;
};

// ─── Analytics Query API Types (E11-S1-T3) ──────────────────────────────────

export type AnalyticsTimeFilter = {
  from: string;
  to: string;
};

export type AnalyticsQueryParams = {
  tenantId: string;
  timeFilter: AnalyticsTimeFilter;
  locationId?: string | null;
};

export const analyticsTrendDirections = ["up", "down", "flat"] as const;
export type AnalyticsTrendDirection = (typeof analyticsTrendDirections)[number];

export type KpiMetric = {
  current: number;
  previous: number;
  changePercent: number;
  trend: AnalyticsTrendDirection;
};

export type AnalyticsKpiSummary = {
  revenueCents: KpiMetric;
  orderCount: KpiMetric;
  bookingCount: KpiMetric;
  newCustomerCount: KpiMetric;
  returningCustomerCount: KpiMetric;
  retentionRate: KpiMetric;
};

export type TimeSeriesDataPoint = {
  period: string;
  value: number;
};

export type RevenueTimeSeriesResponse = {
  points: TimeSeriesDataPoint[];
  totalRevenueCents: number;
  periodType: AnalyticsAggregationPeriod;
};

export type VolumeTimeSeriesResponse = {
  orderPoints: TimeSeriesDataPoint[];
  bookingPoints: TimeSeriesDataPoint[];
  periodType: AnalyticsAggregationPeriod;
};

export type ChannelBreakdownItem = {
  channel: AnalyticsChannelType;
  orderCount: number;
  revenueCents: number;
  revenuePercent: number;
};

export type ChannelBreakdownResponse = {
  items: ChannelBreakdownItem[];
  totalRevenueCents: number;
};

export const topPerformerCategories = ["product", "staff", "location"] as const;
export type TopPerformerCategory = (typeof topPerformerCategories)[number];

export type TopPerformerEntry = {
  id: string;
  name: string;
  category: TopPerformerCategory;
  revenueCents: number;
  count: number;
  trendPercent: number;
};

export type TopPerformersResponse = {
  items: TopPerformerEntry[];
  category: TopPerformerCategory;
};

export type RetentionMetrics = {
  retentionRate: number;
  newCustomerCount: number;
  returningCustomerCount: number;
  totalCustomerCount: number;
  churnRate: number;
};

export type RetentionTimeSeriesPoint = {
  period: string;
  retentionRate: number;
  newCustomers: number;
  returningCustomers: number;
};

export type RetentionInsightsResponse = {
  current: RetentionMetrics;
  timeSeries: RetentionTimeSeriesPoint[];
  periodType: AnalyticsAggregationPeriod;
};

// ─── Dashboard Widget Types (E11-S1-T4) ─────────────────────────────────────

export type DashboardKpiCard = {
  label: string;
  valueCents?: number;
  valueCount?: number;
  valuePercent?: number;
  trend: AnalyticsTrendDirection;
  changePercent: number;
};

export type DashboardRevenueChartData = {
  points: TimeSeriesDataPoint[];
  periodType: AnalyticsAggregationPeriod;
};

export type DashboardTrafficChartData = {
  orderPoints: TimeSeriesDataPoint[];
  bookingPoints: TimeSeriesDataPoint[];
  periodType: AnalyticsAggregationPeriod;
};

export type DashboardAnalyticsWidgetData = {
  kpiCards: DashboardKpiCard[];
  revenueChart: DashboardRevenueChartData;
  trafficChart: DashboardTrafficChartData;
  lastUpdated: string;
};

// ─── Detail Page View Types (E11-S1-T5) ─────────────────────────────────────

export const analyticsDetailViewTypes = [
  "revenue",
  "volume",
  "channels",
  "top-performers",
  "retention",
] as const;
export type AnalyticsDetailViewType = (typeof analyticsDetailViewTypes)[number];

export type AnalyticsDetailPageData = {
  viewType: AnalyticsDetailViewType;
  timeFilter: AnalyticsTimeFilter;
  locationId: string | null;
};

// ─── Export Types (E11-S1-T6) ────────────────────────────────────────────────

export const analyticsExportFormats = ["csv", "pdf"] as const;
export type AnalyticsExportFormat = (typeof analyticsExportFormats)[number];

export type AnalyticsExportRequest = {
  tenantId: string;
  timeFilter: AnalyticsTimeFilter;
  locationId?: string | null;
  format: AnalyticsExportFormat;
  sections: AnalyticsDetailViewType[];
};

export type AnalyticsExportResult = {
  id: string;
  format: AnalyticsExportFormat;
  fileName: string;
  generatedAt: string;
  downloadUrl: string;
  expiresAt: string;
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Returns the trend direction based on a change percentage.
 */
export function computeTrendDirection(changePercent: number): AnalyticsTrendDirection {
  if (changePercent > 0) return "up";
  if (changePercent < 0) return "down";
  return "flat";
}

/**
 * Computes the percentage change between two values.
 * Returns 0 when the previous value is 0 to avoid division by zero.
 */
export function computeChangePercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Computes customer retention rate as a percentage (0–100).
 * Returns 0 when total customers is 0 to avoid division by zero.
 */
export function computeRetentionRate(returningCustomers: number, totalCustomers: number): number {
  if (totalCustomers === 0) return 0;
  return (returningCustomers / totalCustomers) * 100;
}

/**
 * Formats a KPI metric value for display based on its type.
 */
export function formatKpiValue(metric: KpiMetric, type: "currency" | "count" | "percent"): string {
  switch (type) {
    case "currency":
      return `$${(metric.current / 100).toFixed(2)}`;
    case "count":
      return metric.current.toLocaleString();
    case "percent":
      return `${metric.current.toFixed(1)}%`;
  }
}

/**
 * Returns a default time filter based on the aggregation period type.
 * Daily: last 30 days, weekly: last 12 weeks, monthly: last 12 months.
 */
export function getDefaultTimeFilter(periodType: AnalyticsAggregationPeriod): AnalyticsTimeFilter {
  const now = new Date();
  let from: Date;

  switch (periodType) {
    case "daily":
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      break;
    case "weekly":
      from = new Date(now);
      from.setDate(from.getDate() - 84);
      break;
    case "monthly":
      from = new Date(now);
      from.setMonth(from.getMonth() - 12);
      break;
  }

  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

/**
 * Validates that a time filter has a `from` date strictly before the `to` date.
 */
export function isValidAnalyticsTimeFilter(filter: AnalyticsTimeFilter): boolean {
  return new Date(filter.from).getTime() < new Date(filter.to).getTime();
}
