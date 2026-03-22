import { describe, it, expect } from "vitest";

import {
  computeTrendDirection,
  computeChangePercent,
  computeRetentionRate,
  formatKpiValue,
  getDefaultTimeFilter,
  isValidAnalyticsTimeFilter,
  analyticsAggregationPeriods,
  analyticsChannelTypes,
  aggregationJobStatuses,
  analyticsTrendDirections,
  analyticsDetailViewTypes,
  analyticsExportFormats,
  topPerformerCategories,
} from "./analytics";

import type {
  KpiMetric,
  AnalyticsAggregationRecord,
  AggregationJobRecord,
  AnalyticsTimeFilter,
} from "./analytics";

// ─── Const Array Tests ───────────────────────────────────────────────────────

describe("analytics const arrays", () => {
  it("exports aggregation period types", () => {
    expect(analyticsAggregationPeriods).toEqual(["daily", "weekly", "monthly"]);
  });

  it("exports channel types including booking", () => {
    expect(analyticsChannelTypes).toContain("delivery");
    expect(analyticsChannelTypes).toContain("pickup");
    expect(analyticsChannelTypes).toContain("dine_in");
    expect(analyticsChannelTypes).toContain("booking");
    expect(analyticsChannelTypes).toHaveLength(4);
  });

  it("exports aggregation job statuses", () => {
    expect(aggregationJobStatuses).toEqual(["pending", "running", "completed", "failed"]);
  });

  it("exports trend directions", () => {
    expect(analyticsTrendDirections).toEqual(["up", "down", "flat"]);
  });

  it("exports detail view types", () => {
    expect(analyticsDetailViewTypes).toContain("revenue");
    expect(analyticsDetailViewTypes).toContain("volume");
    expect(analyticsDetailViewTypes).toContain("channels");
    expect(analyticsDetailViewTypes).toContain("top-performers");
    expect(analyticsDetailViewTypes).toContain("retention");
    expect(analyticsDetailViewTypes).toHaveLength(5);
  });

  it("exports export formats", () => {
    expect(analyticsExportFormats).toEqual(["csv", "pdf"]);
  });

  it("exports top performer categories", () => {
    expect(topPerformerCategories).toEqual(["product", "staff", "location"]);
  });
});

// ─── computeTrendDirection ───────────────────────────────────────────────────

describe("computeTrendDirection", () => {
  it("returns 'up' for positive change", () => {
    expect(computeTrendDirection(15.5)).toBe("up");
    expect(computeTrendDirection(0.01)).toBe("up");
  });

  it("returns 'down' for negative change", () => {
    expect(computeTrendDirection(-10)).toBe("down");
    expect(computeTrendDirection(-0.01)).toBe("down");
  });

  it("returns 'flat' for zero change", () => {
    expect(computeTrendDirection(0)).toBe("flat");
  });
});

// ─── computeChangePercent ────────────────────────────────────────────────────

describe("computeChangePercent", () => {
  it("computes positive change", () => {
    expect(computeChangePercent(150, 100)).toBe(50);
  });

  it("computes negative change", () => {
    expect(computeChangePercent(50, 100)).toBe(-50);
  });

  it("returns 0 when previous is 0 (division by zero)", () => {
    expect(computeChangePercent(100, 0)).toBe(0);
  });

  it("returns 0 when both are 0", () => {
    expect(computeChangePercent(0, 0)).toBe(0);
  });

  it("handles 100% increase", () => {
    expect(computeChangePercent(200, 100)).toBe(100);
  });
});

// ─── computeRetentionRate ────────────────────────────────────────────────────

describe("computeRetentionRate", () => {
  it("computes retention rate as percentage", () => {
    expect(computeRetentionRate(30, 100)).toBe(30);
  });

  it("returns 0 when total customers is 0", () => {
    expect(computeRetentionRate(0, 0)).toBe(0);
  });

  it("returns 100 when all customers are returning", () => {
    expect(computeRetentionRate(50, 50)).toBe(100);
  });

  it("handles partial retention", () => {
    expect(computeRetentionRate(1, 3)).toBeCloseTo(33.33, 1);
  });
});

// ─── formatKpiValue ──────────────────────────────────────────────────────────

describe("formatKpiValue", () => {
  const metric: KpiMetric = {
    current: 250000,
    previous: 200000,
    changePercent: 25,
    trend: "up",
  };

  it("formats currency from cents", () => {
    expect(formatKpiValue(metric, "currency")).toBe("$2500.00");
  });

  it("formats count with locale string", () => {
    expect(formatKpiValue(metric, "count")).toBeTruthy();
  });

  it("formats percent with one decimal", () => {
    const percentMetric: KpiMetric = { ...metric, current: 42.8 };
    expect(formatKpiValue(percentMetric, "percent")).toBe("42.8%");
  });
});

// ─── getDefaultTimeFilter ────────────────────────────────────────────────────

describe("getDefaultTimeFilter", () => {
  it("returns a valid filter for daily period", () => {
    const filter = getDefaultTimeFilter("daily");
    expect(new Date(filter.from).getTime()).toBeLessThan(new Date(filter.to).getTime());
    expect(isValidAnalyticsTimeFilter(filter)).toBe(true);
  });

  it("returns a valid filter for weekly period", () => {
    const filter = getDefaultTimeFilter("weekly");
    expect(isValidAnalyticsTimeFilter(filter)).toBe(true);
  });

  it("returns a valid filter for monthly period", () => {
    const filter = getDefaultTimeFilter("monthly");
    expect(isValidAnalyticsTimeFilter(filter)).toBe(true);
  });

  it("daily filter spans approximately 30 days", () => {
    const filter = getDefaultTimeFilter("daily");
    const fromDate = new Date(filter.from);
    const toDate = new Date(filter.to);
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });
});

// ─── isValidAnalyticsTimeFilter ──────────────────────────────────────────────

describe("isValidAnalyticsTimeFilter", () => {
  it("returns true for valid filter (from < to)", () => {
    const filter: AnalyticsTimeFilter = {
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-31T00:00:00Z",
    };
    expect(isValidAnalyticsTimeFilter(filter)).toBe(true);
  });

  it("returns false when from equals to", () => {
    const filter: AnalyticsTimeFilter = {
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-01T00:00:00Z",
    };
    expect(isValidAnalyticsTimeFilter(filter)).toBe(false);
  });

  it("returns false when from is after to", () => {
    const filter: AnalyticsTimeFilter = {
      from: "2026-02-01T00:00:00Z",
      to: "2026-01-01T00:00:00Z",
    };
    expect(isValidAnalyticsTimeFilter(filter)).toBe(false);
  });
});

// ─── Type Shape Validation ───────────────────────────────────────────────────

describe("type shape validation", () => {
  it("AnalyticsAggregationRecord has required fields", () => {
    const record: AnalyticsAggregationRecord = {
      id: "agg-1",
      tenantId: "t-1",
      locationId: null,
      periodType: "daily",
      periodStart: "2026-01-01T00:00:00Z",
      periodEnd: "2026-01-02T00:00:00Z",
      revenueCents: 100000,
      orderCount: 50,
      bookingCount: 20,
      newCustomerCount: 10,
      returningCustomerCount: 5,
      channelBreakdown: {
        delivery: { count: 10, revenueCents: 20000 },
        pickup: { count: 20, revenueCents: 40000 },
        dine_in: { count: 15, revenueCents: 30000 },
        booking: { count: 5, revenueCents: 10000 },
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    expect(record.tenantId).toBe("t-1");
    expect(record.channelBreakdown.delivery.count).toBe(10);
  });

  it("AggregationJobRecord has required fields", () => {
    const job: AggregationJobRecord = {
      id: "job-1",
      tenantId: "t-1",
      periodType: "daily",
      periodStart: "2026-01-01T00:00:00Z",
      periodEnd: "2026-01-02T00:00:00Z",
      status: "pending",
      startedAt: null,
      completedAt: null,
      failedAt: null,
      failureReason: null,
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(job.status).toBe("pending");
  });
});
