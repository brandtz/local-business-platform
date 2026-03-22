// E8-S3-T4: Platform-admin webhook inspection and replay views.
// Displays webhook events with filtering, detail views, and replay actions.
// SECURITY: Only platform-admin role can access this tooling.
// SECURITY: Raw payloads visible only for debugging purposes.

import type {
  WebhookEventSummary,
  WebhookEventDetail,
  WebhookReplayResult,
  PaymentProvider,
  WebhookEventStatus,
} from "@platform/types";

// ---------------------------------------------------------------------------
// View state
// ---------------------------------------------------------------------------

export type WebhookInspectionViewState =
  | { kind: "loading" }
  | {
      kind: "ready";
      events: WebhookEventSummary[];
      totalCount: number;
      filters: WebhookInspectionFilters;
    }
  | { kind: "error"; message: string };

export type WebhookDetailViewState =
  | { kind: "loading" }
  | { kind: "ready"; event: WebhookEventDetail }
  | { kind: "error"; message: string };

export type WebhookReplayViewState =
  | { kind: "idle" }
  | { kind: "replaying"; eventId: string }
  | { kind: "success"; result: WebhookReplayResult }
  | { kind: "error"; message: string };

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type WebhookInspectionFilters = {
  provider: PaymentProvider | null;
  status: WebhookEventStatus | null;
  tenantId: string | null;
  eventType: string | null;
};

export function createDefaultFilters(): WebhookInspectionFilters {
  return {
    provider: null,
    status: null,
    tenantId: null,
    eventType: null,
  };
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function describeWebhookInspectionState(
  state: WebhookInspectionViewState,
): string {
  switch (state.kind) {
    case "loading":
      return "Loading webhook events…";
    case "ready":
      return `${state.events.length} webhook event(s) found.`;
    case "error":
      return state.message;
  }
}

export function describeWebhookDetailState(
  state: WebhookDetailViewState,
): string {
  switch (state.kind) {
    case "loading":
      return "Loading webhook event detail…";
    case "ready":
      return `Event ${state.event.id} — ${state.event.eventType}`;
    case "error":
      return state.message;
  }
}

export function describeWebhookReplayState(
  state: WebhookReplayViewState,
): string {
  switch (state.kind) {
    case "idle":
      return "Ready to replay.";
    case "replaying":
      return `Replaying event ${state.eventId}…`;
    case "success":
      return state.result.success
        ? "Replay succeeded."
        : `Replay failed: ${state.result.error ?? "Unknown error"}`;
    case "error":
      return state.message;
  }
}

// ---------------------------------------------------------------------------
// Event status display
// ---------------------------------------------------------------------------

const statusLabels: Record<WebhookEventStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  processed: "Processed",
  failed: "Failed",
  skipped: "Skipped",
};

const statusColorClasses: Record<WebhookEventStatus, string> = {
  pending: "text-muted",
  processing: "text-info",
  processed: "text-success",
  failed: "text-danger",
  skipped: "text-warning",
};

export function getStatusLabel(status: WebhookEventStatus): string {
  return statusLabels[status];
}

export function getStatusColorClass(status: WebhookEventStatus): string {
  return statusColorClasses[status];
}

// ---------------------------------------------------------------------------
// Summary row formatting
// ---------------------------------------------------------------------------

export type WebhookEventRow = {
  id: string;
  providerLabel: string;
  eventType: string;
  statusLabel: string;
  statusColorClass: string;
  tenantId: string;
  attempts: number;
  createdAt: string;
  canReplay: boolean;
};

const providerLabels: Record<PaymentProvider, string> = {
  stripe: "Stripe",
  square: "Square",
};

export function buildWebhookEventRow(
  summary: WebhookEventSummary,
): WebhookEventRow {
  return {
    id: summary.id,
    providerLabel: providerLabels[summary.provider],
    eventType: summary.eventType,
    statusLabel: getStatusLabel(summary.status),
    statusColorClass: getStatusColorClass(summary.status),
    tenantId: summary.tenantId ?? "—",
    attempts: summary.attempts,
    createdAt: summary.createdAt,
    canReplay: summary.status === "failed",
  };
}

// ---------------------------------------------------------------------------
// SECURITY: Assert no tenant-specific secrets in view data
// ---------------------------------------------------------------------------

export function assertNoSecretsInWebhookView(
  data: WebhookEventRow | WebhookEventSummary,
): boolean {
  const str = JSON.stringify(data);
  const forbidden = [
    "encryptedCredentials",
    "credentialsIv",
    "credentialsTag",
    "secretKey",
    "accessToken",
    "publishableKey",
    "webhookSecret",
    "signatureKey",
  ];
  return !forbidden.some((f) => str.includes(f));
}
