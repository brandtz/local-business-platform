// E11-S1-T3/T6: Analytics API request validation contracts.
// All analytics endpoints are read-only and tenant-scoped.

import type {
  AnalyticsAggregationPeriod,
  AnalyticsDetailViewType,
  AnalyticsExportFormat,
  TopPerformerCategory,
} from "@platform/types";

import {
  analyticsAggregationPeriods,
  analyticsDetailViewTypes,
  analyticsExportFormats,
  topPerformerCategories,
} from "@platform/types";

// ─── Error Class ─────────────────────────────────────────────────────────────

export class AnalyticsApiContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsApiContractError";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidISODate(value: string): boolean {
  return !isNaN(new Date(value).getTime());
}

// ─── Analytics Query Params Validation ───────────────────────────────────────

export type AnalyticsQueryRequestParams = {
  from?: string;
  to?: string;
  locationId?: string;
  periodType?: string;
};

export type ValidatedAnalyticsQueryParams = {
  from: string;
  to: string;
  locationId: string | null;
  periodType: AnalyticsAggregationPeriod;
};

export function validateAnalyticsQueryParams(
  params: AnalyticsQueryRequestParams
): ValidatedAnalyticsQueryParams {
  if (!params.from || !isNonEmptyString(params.from)) {
    throw new AnalyticsApiContractError("'from' query parameter is required.");
  }
  if (!params.to || !isNonEmptyString(params.to)) {
    throw new AnalyticsApiContractError("'to' query parameter is required.");
  }

  if (!isValidISODate(params.from)) {
    throw new AnalyticsApiContractError("'from' must be a valid ISO 8601 date string.");
  }
  if (!isValidISODate(params.to)) {
    throw new AnalyticsApiContractError("'to' must be a valid ISO 8601 date string.");
  }

  if (new Date(params.from).getTime() >= new Date(params.to).getTime()) {
    throw new AnalyticsApiContractError("'from' must be before 'to'.");
  }

  let periodType: AnalyticsAggregationPeriod = "daily";
  if (params.periodType !== undefined) {
    if (
      !(analyticsAggregationPeriods as readonly string[]).includes(params.periodType)
    ) {
      throw new AnalyticsApiContractError(
        `Invalid periodType: '${params.periodType}'. Must be one of: ${analyticsAggregationPeriods.join(", ")}.`
      );
    }
    periodType = params.periodType as AnalyticsAggregationPeriod;
  }

  return {
    from: params.from,
    to: params.to,
    locationId: params.locationId ?? null,
    periodType,
  };
}

// ─── Top Performers Query Validation ─────────────────────────────────────────

export type TopPerformersRequestParams = AnalyticsQueryRequestParams & {
  category?: string;
  limit?: string;
};

export type ValidatedTopPerformersParams = ValidatedAnalyticsQueryParams & {
  category: TopPerformerCategory;
  limit: number;
};

export function validateTopPerformersParams(
  params: TopPerformersRequestParams
): ValidatedTopPerformersParams {
  const base = validateAnalyticsQueryParams(params);

  let category: TopPerformerCategory = "product";
  if (params.category !== undefined) {
    if (
      !(topPerformerCategories as readonly string[]).includes(params.category)
    ) {
      throw new AnalyticsApiContractError(
        `Invalid category: '${params.category}'. Must be one of: ${topPerformerCategories.join(", ")}.`
      );
    }
    category = params.category as TopPerformerCategory;
  }

  let limit = 10;
  if (params.limit !== undefined) {
    limit = parseInt(params.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new AnalyticsApiContractError("limit must be an integer between 1 and 100.");
    }
  }

  return { ...base, category, limit };
}

// ─── Export Request Validation ───────────────────────────────────────────────

export type AnalyticsExportRequestBody = {
  from?: string;
  to?: string;
  locationId?: string;
  format?: string;
  sections?: string[];
};

export type ValidatedExportRequest = {
  from: string;
  to: string;
  locationId: string | null;
  format: AnalyticsExportFormat;
  sections: AnalyticsDetailViewType[];
};

export function assertValidExportRequest(
  payload: unknown
): asserts payload is ValidatedExportRequest {
  if (!isRecord(payload)) {
    throw new AnalyticsApiContractError("Request body must be an object.");
  }

  if (!isNonEmptyString(payload.from)) {
    throw new AnalyticsApiContractError("'from' is required.");
  }
  if (!isNonEmptyString(payload.to)) {
    throw new AnalyticsApiContractError("'to' is required.");
  }

  if (!isValidISODate(payload.from as string)) {
    throw new AnalyticsApiContractError("'from' must be a valid ISO 8601 date string.");
  }
  if (!isValidISODate(payload.to as string)) {
    throw new AnalyticsApiContractError("'to' must be a valid ISO 8601 date string.");
  }

  if (
    new Date(payload.from as string).getTime() >=
    new Date(payload.to as string).getTime()
  ) {
    throw new AnalyticsApiContractError("'from' must be before 'to'.");
  }

  if (payload.format === undefined || typeof payload.format !== "string") {
    throw new AnalyticsApiContractError("'format' is required.");
  }
  if (
    !(analyticsExportFormats as readonly string[]).includes(payload.format as string)
  ) {
    throw new AnalyticsApiContractError(
      `Invalid format: '${payload.format}'. Must be one of: ${analyticsExportFormats.join(", ")}.`
    );
  }

  if (!Array.isArray(payload.sections) || payload.sections.length === 0) {
    throw new AnalyticsApiContractError("'sections' must be a non-empty array.");
  }

  for (const section of payload.sections as unknown[]) {
    if (
      typeof section !== "string" ||
      !(analyticsDetailViewTypes as readonly string[]).includes(section)
    ) {
      throw new AnalyticsApiContractError(
        `Invalid section: '${section}'. Must be one of: ${analyticsDetailViewTypes.join(", ")}.`
      );
    }
  }
}
