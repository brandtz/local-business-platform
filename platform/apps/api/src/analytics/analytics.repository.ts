// E11-S1-T1: Analytics aggregation repository — in-memory store for analytics aggregation records
// and aggregation job records, tenant-scoped with time-period and location filtering.

import type {
  AnalyticsAggregationPeriod,
  AnalyticsAggregationRecord,
  AnalyticsChannelType,
  AggregationJobRecord,
  AggregationJobStatus,
  ChannelBreakdownEntry,
} from "@platform/types";

// ─── Injectable Decorator Stub ───────────────────────────────────────────────

function Injectable(): ClassDecorator {
  return () => {};
}

// ─── Repository ──────────────────────────────────────────────────────────────

let aggregationIdCounter = 0;
let jobIdCounter = 0;

function emptyChannelBreakdown(): Record<AnalyticsChannelType, ChannelBreakdownEntry> {
  return {
    delivery: { count: 0, revenueCents: 0 },
    pickup: { count: 0, revenueCents: 0 },
    dine_in: { count: 0, revenueCents: 0 },
    booking: { count: 0, revenueCents: 0 },
  };
}

@Injectable()
export class AnalyticsRepository {
  private aggregations: AnalyticsAggregationRecord[] = [];
  private jobs: AggregationJobRecord[] = [];

  // ── Aggregation Records ──────────────────────────────────────────────────

  upsertAggregation(data: {
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
  }): AnalyticsAggregationRecord {
    const existing = this.aggregations.find(
      (a) =>
        a.tenantId === data.tenantId &&
        a.locationId === data.locationId &&
        a.periodType === data.periodType &&
        a.periodStart === data.periodStart
    );

    if (existing) {
      existing.revenueCents = data.revenueCents;
      existing.orderCount = data.orderCount;
      existing.bookingCount = data.bookingCount;
      existing.newCustomerCount = data.newCustomerCount;
      existing.returningCustomerCount = data.returningCustomerCount;
      existing.channelBreakdown = data.channelBreakdown;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }

    aggregationIdCounter += 1;
    const record: AnalyticsAggregationRecord = {
      id: `agg-${aggregationIdCounter}`,
      tenantId: data.tenantId,
      locationId: data.locationId,
      periodType: data.periodType,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      revenueCents: data.revenueCents,
      orderCount: data.orderCount,
      bookingCount: data.bookingCount,
      newCustomerCount: data.newCustomerCount,
      returningCustomerCount: data.returningCustomerCount,
      channelBreakdown: data.channelBreakdown,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.aggregations.push(record);
    return record;
  }

  getAggregations(
    tenantId: string,
    periodType: AnalyticsAggregationPeriod,
    from: string,
    to: string,
    locationId?: string | null
  ): AnalyticsAggregationRecord[] {
    return this.aggregations.filter((a) => {
      if (a.tenantId !== tenantId) return false;
      if (a.periodType !== periodType) return false;
      if (a.periodStart < from || a.periodStart > to) return false;
      if (locationId !== undefined && locationId !== null && a.locationId !== locationId) return false;
      return true;
    });
  }

  getAggregationById(
    tenantId: string,
    id: string
  ): AnalyticsAggregationRecord | null {
    return this.aggregations.find(
      (a) => a.tenantId === tenantId && a.id === id
    ) ?? null;
  }

  // ── Aggregation Jobs ─────────────────────────────────────────────────────

  createJob(data: {
    tenantId: string;
    periodType: AnalyticsAggregationPeriod;
    periodStart: string;
    periodEnd: string;
  }): AggregationJobRecord {
    jobIdCounter += 1;
    const job: AggregationJobRecord = {
      id: `agg-job-${jobIdCounter}`,
      tenantId: data.tenantId,
      periodType: data.periodType,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status: "pending",
      startedAt: null,
      completedAt: null,
      failedAt: null,
      failureReason: null,
      createdAt: new Date().toISOString(),
    };
    this.jobs.push(job);
    return job;
  }

  updateJobStatus(
    jobId: string,
    status: AggregationJobStatus,
    failureReason?: string
  ): AggregationJobRecord | null {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return null;

    job.status = status;
    const now = new Date().toISOString();
    if (status === "running") job.startedAt = now;
    if (status === "completed") job.completedAt = now;
    if (status === "failed") {
      job.failedAt = now;
      job.failureReason = failureReason ?? null;
    }
    return job;
  }

  getJobById(jobId: string): AggregationJobRecord | null {
    return this.jobs.find((j) => j.id === jobId) ?? null;
  }

  listJobsForTenant(
    tenantId: string,
    status?: AggregationJobStatus
  ): AggregationJobRecord[] {
    return this.jobs.filter((j) => {
      if (j.tenantId !== tenantId) return false;
      if (status !== undefined && j.status !== status) return false;
      return true;
    });
  }
}

export { emptyChannelBreakdown };
