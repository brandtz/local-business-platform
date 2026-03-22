import { describe, it, expect } from "vitest";

import {
  validateAnalyticsQueryParams,
  validateTopPerformersParams,
  assertValidExportRequest,
  AnalyticsApiContractError,
} from "./analytics-api-contracts";

// ─── validateAnalyticsQueryParams ────────────────────────────────────────────

describe("validateAnalyticsQueryParams", () => {
  it("validates a complete valid query", () => {
    const result = validateAnalyticsQueryParams({
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-31T23:59:59Z",
      locationId: "loc-1",
      periodType: "monthly",
    });

    expect(result.from).toBe("2026-01-01T00:00:00Z");
    expect(result.to).toBe("2026-01-31T23:59:59Z");
    expect(result.locationId).toBe("loc-1");
    expect(result.periodType).toBe("monthly");
  });

  it("defaults periodType to daily when not provided", () => {
    const result = validateAnalyticsQueryParams({
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-31T23:59:59Z",
    });

    expect(result.periodType).toBe("daily");
  });

  it("defaults locationId to null when not provided", () => {
    const result = validateAnalyticsQueryParams({
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-31T23:59:59Z",
    });

    expect(result.locationId).toBeNull();
  });

  it("rejects missing 'from' parameter", () => {
    expect(() =>
      validateAnalyticsQueryParams({ to: "2026-01-31T23:59:59Z" })
    ).toThrow(AnalyticsApiContractError);
  });

  it("rejects missing 'to' parameter", () => {
    expect(() =>
      validateAnalyticsQueryParams({ from: "2026-01-01T00:00:00Z" })
    ).toThrow(AnalyticsApiContractError);
  });

  it("rejects invalid date format", () => {
    expect(() =>
      validateAnalyticsQueryParams({
        from: "not-a-date",
        to: "2026-01-31T23:59:59Z",
      })
    ).toThrow(AnalyticsApiContractError);
  });

  it("rejects from >= to", () => {
    expect(() =>
      validateAnalyticsQueryParams({
        from: "2026-02-01T00:00:00Z",
        to: "2026-01-01T00:00:00Z",
      })
    ).toThrow(AnalyticsApiContractError);
  });

  it("rejects invalid periodType", () => {
    expect(() =>
      validateAnalyticsQueryParams({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        periodType: "hourly",
      })
    ).toThrow(AnalyticsApiContractError);
  });
});

// ─── validateTopPerformersParams ─────────────────────────────────────────────

describe("validateTopPerformersParams", () => {
  it("validates complete params with defaults", () => {
    const result = validateTopPerformersParams({
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-31T23:59:59Z",
    });

    expect(result.category).toBe("product");
    expect(result.limit).toBe(10);
  });

  it("accepts valid category", () => {
    const result = validateTopPerformersParams({
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-31T23:59:59Z",
      category: "staff",
    });

    expect(result.category).toBe("staff");
  });

  it("rejects invalid category", () => {
    expect(() =>
      validateTopPerformersParams({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        category: "invalid",
      })
    ).toThrow(AnalyticsApiContractError);
  });

  it("rejects invalid limit", () => {
    expect(() =>
      validateTopPerformersParams({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        limit: "0",
      })
    ).toThrow(AnalyticsApiContractError);
  });

  it("rejects limit > 100", () => {
    expect(() =>
      validateTopPerformersParams({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        limit: "200",
      })
    ).toThrow(AnalyticsApiContractError);
  });
});

// ─── assertValidExportRequest ────────────────────────────────────────────────

describe("assertValidExportRequest", () => {
  it("accepts a valid export request", () => {
    expect(() =>
      assertValidExportRequest({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        format: "csv",
        sections: ["revenue", "channels"],
      })
    ).not.toThrow();
  });

  it("rejects non-object payload", () => {
    expect(() => assertValidExportRequest("string")).toThrow(
      AnalyticsApiContractError
    );
  });

  it("rejects missing format", () => {
    expect(() =>
      assertValidExportRequest({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        sections: ["revenue"],
      })
    ).toThrow(AnalyticsApiContractError);
  });

  it("rejects invalid format", () => {
    expect(() =>
      assertValidExportRequest({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        format: "xlsx",
        sections: ["revenue"],
      })
    ).toThrow(AnalyticsApiContractError);
  });

  it("rejects empty sections array", () => {
    expect(() =>
      assertValidExportRequest({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        format: "csv",
        sections: [],
      })
    ).toThrow(AnalyticsApiContractError);
  });

  it("rejects invalid section name", () => {
    expect(() =>
      assertValidExportRequest({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        format: "csv",
        sections: ["invalid-section"],
      })
    ).toThrow(AnalyticsApiContractError);
  });

  it("accepts pdf format", () => {
    expect(() =>
      assertValidExportRequest({
        from: "2026-01-01T00:00:00Z",
        to: "2026-01-31T23:59:59Z",
        format: "pdf",
        sections: ["retention"],
      })
    ).not.toThrow();
  });
});
