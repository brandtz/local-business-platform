// E8-S3-T2: Webhook event repository tests.
// Validates raw event storage, idempotency deduplication, and event queries.

import { describe, it, expect, beforeEach } from "vitest";
import { WebhookEventRepository } from "./webhook-event.repository";

describe("WebhookEventRepository", () => {
  let repo: WebhookEventRepository;

  beforeEach(() => {
    repo = new WebhookEventRepository();
  });

  // -----------------------------------------------------------------------
  // Create and idempotency
  // -----------------------------------------------------------------------

  describe("createEvent", () => {
    it("stores a new webhook event with full payload", () => {
      const event = repo.createEvent({
        provider: "stripe",
        eventType: "payment_intent.succeeded",
        providerEventId: "evt_stripe_001",
        rawPayload: '{"id":"evt_stripe_001","type":"payment_intent.succeeded"}',
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });

      expect(event).not.toBeNull();
      expect(event!.id).toBeDefined();
      expect(event!.provider).toBe("stripe");
      expect(event!.eventType).toBe("payment_intent.succeeded");
      expect(event!.providerEventId).toBe("evt_stripe_001");
      expect(event!.rawPayload).toContain("evt_stripe_001");
      expect(event!.status).toBe("pending");
      expect(event!.tenantId).toBe("tenant-1");
      expect(event!.connectionId).toBe("pconn-1");
      expect(event!.attempts).toBe(0);
      expect(event!.lastError).toBeNull();
      expect(event!.lastProcessedAt).toBeNull();
      expect(event!.createdAt).toBeDefined();
    });

    it("returns null for duplicate provider event ID (idempotency)", () => {
      const first = repo.createEvent({
        provider: "stripe",
        eventType: "payment_intent.succeeded",
        providerEventId: "evt_dup_001",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });
      expect(first).not.toBeNull();

      const duplicate = repo.createEvent({
        provider: "stripe",
        eventType: "payment_intent.succeeded",
        providerEventId: "evt_dup_001",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });
      expect(duplicate).toBeNull();
    });

    it("allows same event ID from different providers", () => {
      const stripe = repo.createEvent({
        provider: "stripe",
        eventType: "payment_intent.succeeded",
        providerEventId: "shared_id_001",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });

      const square = repo.createEvent({
        provider: "square",
        eventType: "payment.completed",
        providerEventId: "shared_id_001",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-2",
      });

      expect(stripe).not.toBeNull();
      expect(square).not.toBeNull();
    });

    it("stores events with accurate timestamps", () => {
      const before = new Date().toISOString();
      const event = repo.createEvent({
        provider: "stripe",
        eventType: "charge.refunded",
        providerEventId: "evt_ts_001",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });
      const after = new Date().toISOString();

      expect(event).not.toBeNull();
      expect(event!.createdAt >= before).toBe(true);
      expect(event!.createdAt <= after).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Read
  // -----------------------------------------------------------------------

  describe("getEventById", () => {
    it("retrieves event by ID", () => {
      const created = repo.createEvent({
        provider: "stripe",
        eventType: "payment_intent.succeeded",
        providerEventId: "evt_get_001",
        rawPayload: '{"data":"test"}',
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });

      const fetched = repo.getEventById(created!.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created!.id);
      expect(fetched!.rawPayload).toBe('{"data":"test"}');
    });

    it("returns null for unknown ID", () => {
      expect(repo.getEventById("nonexistent")).toBeNull();
    });
  });

  describe("getEventByProviderEventId", () => {
    it("retrieves event by provider and provider event ID", () => {
      repo.createEvent({
        provider: "square",
        eventType: "payment.completed",
        providerEventId: "sq_evt_001",
        rawPayload: "{}",
        tenantId: "tenant-2",
        connectionId: "pconn-2",
      });

      const fetched = repo.getEventByProviderEventId("square", "sq_evt_001");
      expect(fetched).not.toBeNull();
      expect(fetched!.providerEventId).toBe("sq_evt_001");
      expect(fetched!.provider).toBe("square");
    });

    it("returns null for wrong provider", () => {
      repo.createEvent({
        provider: "stripe",
        eventType: "payment_intent.succeeded",
        providerEventId: "evt_wrong_provider",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });

      expect(
        repo.getEventByProviderEventId("square", "evt_wrong_provider"),
      ).toBeNull();
    });
  });

  describe("listEvents", () => {
    beforeEach(() => {
      repo.createEvent({
        provider: "stripe",
        eventType: "payment_intent.succeeded",
        providerEventId: "evt_list_001",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });
      repo.createEvent({
        provider: "stripe",
        eventType: "charge.refunded",
        providerEventId: "evt_list_002",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });
      repo.createEvent({
        provider: "square",
        eventType: "payment.completed",
        providerEventId: "evt_list_003",
        rawPayload: "{}",
        tenantId: "tenant-2",
        connectionId: "pconn-2",
      });
    });

    it("lists all events without filters", () => {
      const events = repo.listEvents();
      expect(events.length).toBe(3);
    });

    it("filters by provider", () => {
      const events = repo.listEvents({ provider: "stripe" });
      expect(events.length).toBe(2);
      expect(events.every((e) => e.provider === "stripe")).toBe(true);
    });

    it("filters by event type", () => {
      const events = repo.listEvents({ eventType: "charge.refunded" });
      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe("charge.refunded");
    });

    it("filters by tenant ID", () => {
      const events = repo.listEvents({ tenantId: "tenant-2" });
      expect(events.length).toBe(1);
      expect(events[0].tenantId).toBe("tenant-2");
    });

    it("filters by status", () => {
      // All events are 'pending' by default
      const pending = repo.listEvents({ status: "pending" });
      expect(pending.length).toBe(3);

      const processed = repo.listEvents({ status: "processed" });
      expect(processed.length).toBe(0);
    });

    it("paginates results", () => {
      const page1 = repo.listEvents({ page: 1, pageSize: 2 });
      expect(page1.length).toBe(2);

      const page2 = repo.listEvents({ page: 2, pageSize: 2 });
      expect(page2.length).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  describe("updateEventStatus", () => {
    it("updates event status and fields", () => {
      const event = repo.createEvent({
        provider: "stripe",
        eventType: "payment_intent.succeeded",
        providerEventId: "evt_update_001",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });

      const updated = repo.updateEventStatus(event!.id, "processed", {
        lastProcessedAt: "2026-03-22T12:00:00.000Z",
        attempts: 1,
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("processed");
      expect(updated!.attempts).toBe(1);
      expect(updated!.lastProcessedAt).toBe("2026-03-22T12:00:00.000Z");
    });

    it("updates error message on failure", () => {
      const event = repo.createEvent({
        provider: "stripe",
        eventType: "charge.refunded",
        providerEventId: "evt_fail_001",
        rawPayload: "{}",
        tenantId: "tenant-1",
        connectionId: "pconn-1",
      });

      const updated = repo.updateEventStatus(event!.id, "failed", {
        lastError: "Transaction not found",
        attempts: 1,
      });

      expect(updated!.status).toBe("failed");
      expect(updated!.lastError).toBe("Transaction not found");
    });

    it("returns null for unknown event ID", () => {
      expect(repo.updateEventStatus("nonexistent", "processed")).toBeNull();
    });
  });
});
