// E11-S1-T6: Analytics export hooks — CSV/PDF download generation for analytics summaries.
// Generates downloadable export files from analytics data.

import type {
  AnalyticsExportFormat,
  AnalyticsExportRequest,
  AnalyticsExportResult,
  AnalyticsDetailViewType,
  AnalyticsQueryParams,
  ChannelBreakdownResponse,
  TopPerformersResponse,
  RetentionInsightsResponse,
  RevenueTimeSeriesResponse,
} from "@platform/types";

import { AnalyticsService } from "./analytics.service";

// ─── Injectable Decorator Stub ───────────────────────────────────────────────

function Injectable(): ClassDecorator {
  return () => {};
}

// ─── Error Classes ───────────────────────────────────────────────────────────

export class AnalyticsExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsExportError";
  }
}

// ─── Export Service ──────────────────────────────────────────────────────────

let exportIdCounter = 0;

@Injectable()
export class AnalyticsExportService {
  constructor(
    private readonly analyticsService: AnalyticsService
  ) {}

  /**
   * Generates an analytics export in the requested format.
   * Returns metadata about the generated export including download URL.
   */
  generateExport(request: AnalyticsExportRequest): AnalyticsExportResult {
    const params: AnalyticsQueryParams = {
      tenantId: request.tenantId,
      timeFilter: request.timeFilter,
      locationId: request.locationId ?? null,
    };

    const sections = request.sections;
    const rows: string[][] = [];

    for (const section of sections) {
      const sectionRows = this.buildSectionRows(section, params);
      rows.push(...sectionRows);
      rows.push([]); // blank separator row
    }

    exportIdCounter += 1;
    const exportId = `export-${exportIdCounter}`;
    const now = new Date();
    const fileName = this.buildFileName(request.format, request.tenantId, now);

    // In a real implementation, CSV/PDF content would be written to storage.
    // For this in-memory implementation, we generate the metadata response.
    if (request.format === "csv") {
      this.generateCsvContent(rows);
    } else {
      this.generatePdfContent(rows);
    }

    return {
      id: exportId,
      format: request.format,
      fileName,
      generatedAt: now.toISOString(),
      downloadUrl: `/api/analytics/exports/${exportId}/download`,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // ── Section Row Builders ─────────────────────────────────────────────────

  private buildSectionRows(
    section: AnalyticsDetailViewType,
    params: AnalyticsQueryParams
  ): string[][] {
    switch (section) {
      case "revenue":
        return this.buildRevenueSectionRows(params);
      case "volume":
        return this.buildVolumeSectionRows(params);
      case "channels":
        return this.buildChannelSectionRows(params);
      case "top-performers":
        return this.buildTopPerformerSectionRows(params);
      case "retention":
        return this.buildRetentionSectionRows(params);
    }
  }

  private buildRevenueSectionRows(params: AnalyticsQueryParams): string[][] {
    const data: RevenueTimeSeriesResponse = this.analyticsService.getRevenueTimeSeries(params);
    const rows: string[][] = [
      ["Revenue Performance"],
      ["Period", "Revenue (cents)"],
    ];
    for (const point of data.points) {
      rows.push([point.period, String(point.value)]);
    }
    rows.push(["Total", String(data.totalRevenueCents)]);
    return rows;
  }

  private buildVolumeSectionRows(params: AnalyticsQueryParams): string[][] {
    const data = this.analyticsService.getVolumeTimeSeries(params);
    const rows: string[][] = [
      ["Volume Analysis"],
      ["Period", "Orders", "Bookings"],
    ];
    for (let i = 0; i < data.orderPoints.length; i++) {
      rows.push([
        data.orderPoints[i].period,
        String(data.orderPoints[i].value),
        String(data.bookingPoints[i]?.value ?? 0),
      ]);
    }
    return rows;
  }

  private buildChannelSectionRows(params: AnalyticsQueryParams): string[][] {
    const data: ChannelBreakdownResponse = this.analyticsService.getChannelBreakdown(params);
    const rows: string[][] = [
      ["Channel Breakdown"],
      ["Channel", "Order Count", "Revenue (cents)", "Revenue %"],
    ];
    for (const item of data.items) {
      rows.push([
        item.channel,
        String(item.orderCount),
        String(item.revenueCents),
        `${item.revenuePercent.toFixed(1)}%`,
      ]);
    }
    return rows;
  }

  private buildTopPerformerSectionRows(params: AnalyticsQueryParams): string[][] {
    const data: TopPerformersResponse = this.analyticsService.getTopPerformers(params, "product");
    const rows: string[][] = [
      ["Top Performers — Products"],
      ["Name", "Revenue (cents)", "Count", "Trend %"],
    ];
    for (const item of data.items) {
      rows.push([
        item.name,
        String(item.revenueCents),
        String(item.count),
        `${item.trendPercent.toFixed(1)}%`,
      ]);
    }
    return rows;
  }

  private buildRetentionSectionRows(params: AnalyticsQueryParams): string[][] {
    const data: RetentionInsightsResponse = this.analyticsService.getRetentionInsights(params);
    const rows: string[][] = [
      ["Customer Retention"],
      ["Metric", "Value"],
      ["Retention Rate", `${data.current.retentionRate.toFixed(1)}%`],
      ["New Customers", String(data.current.newCustomerCount)],
      ["Returning Customers", String(data.current.returningCustomerCount)],
      ["Total Customers", String(data.current.totalCustomerCount)],
      ["Churn Rate", `${data.current.churnRate.toFixed(1)}%`],
    ];
    return rows;
  }

  // ── Format Generators ────────────────────────────────────────────────────

  /**
   * Generates CSV content from row data.
   * Returns the CSV string (in production, would write to file storage).
   */
  generateCsvContent(rows: string[][]): string {
    return rows
      .map((row) =>
        row
          .map((cell) => {
            if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(",")
      )
      .join("\n");
  }

  /**
   * Generates PDF content placeholder.
   * In production, a PDF generation library (e.g., PDFKit) would be used.
   * Returns a placeholder string representation.
   */
  generatePdfContent(rows: string[][]): string {
    // Placeholder — real implementation would use a PDF library
    return `[PDF] ${rows.length} rows`;
  }

  // ── File Naming ──────────────────────────────────────────────────────────

  private buildFileName(
    format: AnalyticsExportFormat,
    tenantId: string,
    date: Date
  ): string {
    const dateStr = date.toISOString().split("T")[0];
    return `analytics-${tenantId}-${dateStr}.${format}`;
  }
}
