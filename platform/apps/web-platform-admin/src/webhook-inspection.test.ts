// E8-S3-T4: Platform-admin webhook inspection view tests.
// Validates display helpers, state management, and security assertions.

import { describe, it, expect } from "vitest";
import type { WebhookEventSummary } from "@platform/types";
import {
  createDefaultFilters,
  describeWebhookInspectionState,
  describeWebhookDetailState,
  describeWebhookReplayState,
  getStatusLabel,
  getStatusColorClass,
  buildWebhookEventRow,
  assertNoSecretsInWebhookView,
  type WebhookInspectionViewState,
  type WebhookDetailViewState,
  type WebhookReplayViewState,
} from "./webhook-inspection";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function sampleSummary(
  overrides?: Partial<WebhookEventSummary>,
): WebhookEventSummary {
  return {
    id: "whevt-1",
    provider: "stripe",
    eventType: "payment_intent.succeeded",
    providerEventId: "evt_001",
    status: "processed",
    tenantId: "tenant-1",
    attempts: 1,
    createdAt: "2026-03-22T12:00:00.000Z",
    lastProcessedAt: "2026-03-22T12:00:01.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// View state descriptions
// ---------------------------------------------------------------------------

describe("describeWebhookInspectionState", () => {
  it("returns loading message", () => {
    expect(
      describeWebhookInspectionState({ kind: "loading" }),
    ).toBe("Loading webhook events…");
  });

  it("returns event count in ready state", () => {
    const state: WebhookInspectionViewState = {
      kind: "ready",
      events: [sampleSummary()],
      totalCount: 1,
      filters: createDefaultFilters(),
    };
    expect(describeWebhookInspectionState(state)).toBe(
      "1 webhook event(s) found.",
    );
  });

  it("returns error message", () => {
    const state: WebhookInspectionViewState = {
      kind: "error",
      message: "Failed to load events",
    };
    expect(describeWebhookInspectionState(state)).toBe(
      "Failed to load events",
    );
  });
});

describe("describeWebhookDetailState", () => {
  it("returns loading message", () => {
    expect(describeWebhookDetailState({ kind: "loading" })).toBe(
      "Loading webhook event detail…",
    );
  });

  it("returns event identifier in ready state", () => {
    const state: WebhookDetailViewState = {
      kind: "ready",
      event: {
        ...sampleSummary(),
        rawPayload: "{}",
        connectionId: "pconn-1",
        lastError: null,
        updatedAt: "2026-03-22T12:00:01.000Z",
      },
    };
    expect(describeWebhookDetailState(state)).toContain("whevt-1");
  });

  it("returns error message", () => {
    expect(
      describeWebhookDetailState({
        kind: "error",
        message: "Event not found",
      }),
    ).toBe("Event not found");
  });
});

describe("describeWebhookReplayState", () => {
  it("returns idle message", () => {
    expect(describeWebhookReplayState({ kind: "idle" })).toBe(
      "Ready to replay.",
    );
  });

  it("returns replaying message with event ID", () => {
    const state: WebhookReplayViewState = {
      kind: "replaying",
      eventId: "whevt-5",
    };
    expect(describeWebhookReplayState(state)).toContain("whevt-5");
  });

  it("returns success message on successful replay", () => {
    const state: WebhookReplayViewState = {
      kind: "success",
      result: { eventId: "whevt-5", success: true, newStatus: "processed" },
    };
    expect(describeWebhookReplayState(state)).toBe("Replay succeeded.");
  });

  it("returns failure message on failed replay", () => {
    const state: WebhookReplayViewState = {
      kind: "success",
      result: {
        eventId: "whevt-5",
        success: false,
        newStatus: "failed",
        error: "Transaction not found",
      },
    };
    expect(describeWebhookReplayState(state)).toContain(
      "Transaction not found",
    );
  });

  it("returns error message", () => {
    expect(
      describeWebhookReplayState({
        kind: "error",
        message: "Network error",
      }),
    ).toBe("Network error");
  });
});

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

describe("getStatusLabel", () => {
  it("returns labels for all statuses", () => {
    expect(getStatusLabel("pending")).toBe("Pending");
    expect(getStatusLabel("processing")).toBe("Processing");
    expect(getStatusLabel("processed")).toBe("Processed");
    expect(getStatusLabel("failed")).toBe("Failed");
    expect(getStatusLabel("skipped")).toBe("Skipped");
  });
});

describe("getStatusColorClass", () => {
  it("returns correct color classes", () => {
    expect(getStatusColorClass("processed")).toBe("text-success");
    expect(getStatusColorClass("failed")).toBe("text-danger");
    expect(getStatusColorClass("pending")).toBe("text-muted");
    expect(getStatusColorClass("processing")).toBe("text-info");
    expect(getStatusColorClass("skipped")).toBe("text-warning");
  });
});

// ---------------------------------------------------------------------------
// Event row building
// ---------------------------------------------------------------------------

describe("buildWebhookEventRow", () => {
  it("builds display row from summary", () => {
    const row = buildWebhookEventRow(sampleSummary());
    expect(row.id).toBe("whevt-1");
    expect(row.providerLabel).toBe("Stripe");
    expect(row.eventType).toBe("payment_intent.succeeded");
    expect(row.statusLabel).toBe("Processed");
    expect(row.statusColorClass).toBe("text-success");
    expect(row.attempts).toBe(1);
  });

  it("shows Square label for square provider", () => {
    const row = buildWebhookEventRow(
      sampleSummary({ provider: "square" }),
    );
    expect(row.providerLabel).toBe("Square");
  });

  it("allows replay only for failed events", () => {
    const failedRow = buildWebhookEventRow(
      sampleSummary({ status: "failed" }),
    );
    expect(failedRow.canReplay).toBe(true);

    const processedRow = buildWebhookEventRow(
      sampleSummary({ status: "processed" }),
    );
    expect(processedRow.canReplay).toBe(false);

    const pendingRow = buildWebhookEventRow(
      sampleSummary({ status: "pending" }),
    );
    expect(pendingRow.canReplay).toBe(false);
  });

  it("shows dash for null tenant ID", () => {
    const row = buildWebhookEventRow(
      sampleSummary({ tenantId: null }),
    );
    expect(row.tenantId).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// Default filters
// ---------------------------------------------------------------------------

describe("createDefaultFilters", () => {
  it("returns null for all filters", () => {
    const filters = createDefaultFilters();
    expect(filters.provider).toBeNull();
    expect(filters.status).toBeNull();
    expect(filters.tenantId).toBeNull();
    expect(filters.eventType).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Security — no secrets in view data
// ---------------------------------------------------------------------------

describe("assertNoSecretsInWebhookView", () => {
  it("passes for clean webhook event row", () => {
    const row = buildWebhookEventRow(sampleSummary());
    expect(assertNoSecretsInWebhookView(row)).toBe(true);
  });

  it("passes for clean webhook event summary", () => {
    const summary = sampleSummary();
    expect(assertNoSecretsInWebhookView(summary)).toBe(true);
  });
});
