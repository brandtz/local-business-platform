// E8-S3-T2: In-memory webhook event repository.
// Stores raw webhook events for audit trail and replay.
// Idempotency key: (provider, providerEventId) — duplicates are detected and skipped.

import type {
  PaymentProvider,
  WebhookEventRecord,
  WebhookEventStatus,
  WebhookEventListQuery,
} from "@platform/types";

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

const webhookCounter = { value: 0 };

function nextWebhookId(): string {
  webhookCounter.value += 1;
  return `whevt-${webhookCounter.value}`;
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class WebhookEventRepository {
  private events: WebhookEventRecord[] = [];

  // -----------------------------------------------------------------------
  // Create — returns null if duplicate (idempotency check)
  // -----------------------------------------------------------------------

  /**
   * Stores a raw webhook event. Returns the created record, or null if
   * a duplicate event (same provider + providerEventId) already exists.
   */
  createEvent(data: {
    provider: PaymentProvider;
    eventType: string;
    providerEventId: string;
    rawPayload: string;
    tenantId: string | null;
    connectionId: string | null;
  }): WebhookEventRecord | null {
    // Idempotency check: reject duplicate (provider, providerEventId)
    const existing = this.events.find(
      (e) =>
        e.provider === data.provider &&
        e.providerEventId === data.providerEventId,
    );
    if (existing) {
      return null;
    }

    const timestamp = now();
    const record: WebhookEventRecord = {
      id: nextWebhookId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      provider: data.provider,
      eventType: data.eventType,
      providerEventId: data.providerEventId,
      rawPayload: data.rawPayload,
      status: "pending",
      tenantId: data.tenantId,
      connectionId: data.connectionId,
      attempts: 0,
      lastError: null,
      lastProcessedAt: null,
    };
    this.events.push(record);
    return record;
  }

  // -----------------------------------------------------------------------
  // Read
  // -----------------------------------------------------------------------

  getEventById(eventId: string): WebhookEventRecord | null {
    return this.events.find((e) => e.id === eventId) ?? null;
  }

  getEventByProviderEventId(
    provider: PaymentProvider,
    providerEventId: string,
  ): WebhookEventRecord | null {
    return (
      this.events.find(
        (e) =>
          e.provider === provider &&
          e.providerEventId === providerEventId,
      ) ?? null
    );
  }

  listEvents(query: WebhookEventListQuery = {}): WebhookEventRecord[] {
    let results = [...this.events];

    if (query.provider) {
      results = results.filter((e) => e.provider === query.provider);
    }
    if (query.eventType) {
      results = results.filter((e) => e.eventType === query.eventType);
    }
    if (query.status) {
      results = results.filter((e) => e.status === query.status);
    }
    if (query.tenantId) {
      results = results.filter((e) => e.tenantId === query.tenantId);
    }
    if (query.startDate) {
      results = results.filter((e) => e.createdAt >= query.startDate!);
    }
    if (query.endDate) {
      results = results.filter((e) => e.createdAt <= query.endDate!);
    }

    // Sort by creation time descending (newest first)
    results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Pagination
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const startIdx = (page - 1) * pageSize;
    return results.slice(startIdx, startIdx + pageSize);
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  updateEventStatus(
    eventId: string,
    status: WebhookEventStatus,
    fields?: {
      lastError?: string | null;
      lastProcessedAt?: string;
      attempts?: number;
    },
  ): WebhookEventRecord | null {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return null;

    event.status = status;
    event.updatedAt = now();

    if (fields?.lastError !== undefined) {
      event.lastError = fields.lastError;
    }
    if (fields?.lastProcessedAt !== undefined) {
      event.lastProcessedAt = fields.lastProcessedAt;
    }
    if (fields?.attempts !== undefined) {
      event.attempts = fields.attempts;
    }

    return event;
  }
}
