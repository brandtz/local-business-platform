// E8-S3-T4: Webhook admin API contracts tests.
// Validates request validation, view model building, and authorization.

import { describe, it, expect } from "vitest";
import {
  validateWebhookListQuery,
  toWebhookEventSummary,
  toWebhookEventDetail,
  assertPlatformAdminAccess,
  validateReplayRequest,
} from "./webhook-admin-api-contracts";
import type { WebhookEventRecord } from "@platform/types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function sampleEvent(
  overrides?: Partial<WebhookEventRecord>,
): WebhookEventRecord {
  return {
    id: "whevt-1",
    createdAt: "2026-03-22T12:00:00.000Z",
    updatedAt: "2026-03-22T12:00:00.000Z",
    provider: "stripe",
    eventType: "payment_intent.succeeded",
    providerEventId: "evt_test_001",
    rawPayload: '{"id":"evt_test_001"}',
    status: "processed",
    tenantId: "tenant-1",
    connectionId: "pconn-1",
    attempts: 1,
    lastError: null,
    lastProcessedAt: "2026-03-22T12:00:01.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// List query validation
// ---------------------------------------------------------------------------

describe("validateWebhookListQuery", () => {
  it("accepts empty query (no filters)", () => {
    const result = validateWebhookListQuery({});
    expect(result.valid).toBe(true);
    expect(result.query).toBeDefined();
  });

  it("accepts valid provider filter", () => {
    const result = validateWebhookListQuery({ provider: "stripe" });
    expect(result.valid).toBe(true);
    expect(result.query!.provider).toBe("stripe");
  });

  it("rejects invalid provider", () => {
    const result = validateWebhookListQuery({ provider: "paypal" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid provider.");
  });

  it("accepts valid status filter", () => {
    const result = validateWebhookListQuery({ status: "failed" });
    expect(result.valid).toBe(true);
    expect(result.query!.status).toBe("failed");
  });

  it("rejects invalid status", () => {
    const result = validateWebhookListQuery({ status: "completed" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid status.");
  });

  it("accepts valid tenant ID filter", () => {
    const result = validateWebhookListQuery({ tenantId: "tenant-1" });
    expect(result.valid).toBe(true);
    expect(result.query!.tenantId).toBe("tenant-1");
  });

  it("rejects empty tenant ID", () => {
    const result = validateWebhookListQuery({ tenantId: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid tenantId.");
  });

  it("accepts valid pagination", () => {
    const result = validateWebhookListQuery({ page: 2, pageSize: 25 });
    expect(result.valid).toBe(true);
    expect(result.query!.page).toBe(2);
    expect(result.query!.pageSize).toBe(25);
  });

  it("rejects invalid page number", () => {
    const result = validateWebhookListQuery({ page: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Page must be a positive integer.");
  });

  it("rejects page size over 100", () => {
    const result = validateWebhookListQuery({ pageSize: 200 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Page size must be between 1 and 100.");
  });

  it("accepts date range filters", () => {
    const result = validateWebhookListQuery({
      startDate: "2026-03-01T00:00:00.000Z",
      endDate: "2026-03-31T23:59:59.999Z",
    });
    expect(result.valid).toBe(true);
    expect(result.query!.startDate).toBe("2026-03-01T00:00:00.000Z");
    expect(result.query!.endDate).toBe("2026-03-31T23:59:59.999Z");
  });

  it("accepts event type filter", () => {
    const result = validateWebhookListQuery({
      eventType: "payment_intent.succeeded",
    });
    expect(result.valid).toBe(true);
    expect(result.query!.eventType).toBe("payment_intent.succeeded");
  });
});

// ---------------------------------------------------------------------------
// View model builders
// ---------------------------------------------------------------------------

describe("toWebhookEventSummary", () => {
  it("extracts summary fields from full record", () => {
    const record = sampleEvent();
    const summary = toWebhookEventSummary(record);

    expect(summary.id).toBe(record.id);
    expect(summary.provider).toBe(record.provider);
    expect(summary.eventType).toBe(record.eventType);
    expect(summary.providerEventId).toBe(record.providerEventId);
    expect(summary.status).toBe(record.status);
    expect(summary.tenantId).toBe(record.tenantId);
    expect(summary.attempts).toBe(record.attempts);
    expect(summary.createdAt).toBe(record.createdAt);
    expect(summary.lastProcessedAt).toBe(record.lastProcessedAt);
  });

  it("does not include raw payload in summary", () => {
    const record = sampleEvent();
    const summary = toWebhookEventSummary(record);
    const summaryStr = JSON.stringify(summary);
    // rawPayload should not be present as a key
    expect(Object.keys(summary)).not.toContain("rawPayload");
    // But the summary string should not contain the secret fields
    expect(summaryStr).not.toContain("encryptedCredentials");
  });
});

describe("toWebhookEventDetail", () => {
  it("includes raw payload for platform-admin debugging", () => {
    const record = sampleEvent();
    const detail = toWebhookEventDetail(record);

    expect(detail.rawPayload).toBe(record.rawPayload);
    expect(detail.connectionId).toBe(record.connectionId);
    expect(detail.lastError).toBe(record.lastError);
    expect(detail.updatedAt).toBe(record.updatedAt);
  });

  it("includes all summary fields", () => {
    const record = sampleEvent();
    const detail = toWebhookEventDetail(record);

    expect(detail.id).toBe(record.id);
    expect(detail.provider).toBe(record.provider);
    expect(detail.eventType).toBe(record.eventType);
  });

  it("shows error message for failed events", () => {
    const record = sampleEvent({
      status: "failed",
      lastError: "Transaction not found",
    });
    const detail = toWebhookEventDetail(record);

    expect(detail.status).toBe("failed");
    expect(detail.lastError).toBe("Transaction not found");
  });
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("assertPlatformAdminAccess", () => {
  it("does not throw for platform actor type", () => {
    expect(() => assertPlatformAdminAccess("platform")).not.toThrow();
  });

  it("throws for tenant actor type", () => {
    expect(() => assertPlatformAdminAccess("tenant")).toThrow(
      "Access denied: webhook tooling requires platform-admin role.",
    );
  });

  it("throws for anonymous actor type", () => {
    expect(() => assertPlatformAdminAccess("anonymous")).toThrow(
      "Access denied: webhook tooling requires platform-admin role.",
    );
  });
});

// ---------------------------------------------------------------------------
// Replay request validation
// ---------------------------------------------------------------------------

describe("validateReplayRequest", () => {
  it("accepts valid event ID", () => {
    const result = validateReplayRequest({ eventId: "whevt-1" });
    expect(result.valid).toBe(true);
    expect(result.eventId).toBe("whevt-1");
  });

  it("rejects missing event ID", () => {
    const result = validateReplayRequest({});
    expect(result.valid).toBe(false);
    expect(result.error).toBe("eventId is required.");
  });

  it("rejects empty event ID", () => {
    const result = validateReplayRequest({ eventId: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("eventId is required.");
  });
});

// ---------------------------------------------------------------------------
// Secret leak detection — SECURITY CRITICAL
// ---------------------------------------------------------------------------

describe("security — no secret leaks in webhook views", () => {
  it("summary view does not contain credential fields", () => {
    const record = sampleEvent();
    const summary = toWebhookEventSummary(record);
    const summaryStr = JSON.stringify(summary);

    const forbidden = [
      "encryptedCredentials",
      "credentialsIv",
      "credentialsTag",
      "secretKey",
      "accessToken",
    ];
    for (const field of forbidden) {
      expect(summaryStr).not.toContain(field);
    }
  });

  it("detail view only contains raw webhook payload, not connection secrets", () => {
    const record = sampleEvent({
      rawPayload: '{"id":"evt_001","type":"payment_intent.succeeded"}',
    });
    const detail = toWebhookEventDetail(record);
    const detailStr = JSON.stringify(detail);

    expect(detailStr).not.toContain("encryptedCredentials");
    expect(detailStr).not.toContain("credentialsIv");
    expect(detailStr).not.toContain("credentialsTag");
    expect(detailStr).not.toContain("secretKey");
  });
});
