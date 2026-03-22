// E8-S3-T3: Webhook event processor tests.
// Validates idempotent processing, out-of-order handling, and dead-letter behavior.
// RELIABILITY CRITICAL: Duplicate webhooks must not cause duplicate side effects.

import { describe, it, expect } from "vitest";
import { WebhookEventProcessorService } from "./webhook-event-processor.service";
import { PaymentTransactionRepository } from "./payment-transaction.repository";
import { WebhookEventRepository } from "./webhook-event.repository";
import type {
  WebhookEventRecord,
  ParsedWebhookPayload,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createTestSetup() {
  const transactionRepo = new PaymentTransactionRepository();
  const eventRepo = new WebhookEventRepository();
  const processor = new WebhookEventProcessorService(
    transactionRepo,
    eventRepo,
  );
  return { transactionRepo, eventRepo, processor };
}

function createTestTransaction(
  repo: PaymentTransactionRepository,
  overrides: Partial<{
    tenantId: string;
    provider: string;
    status: string;
    providerTransactionId: string;
    amountCents: number;
    capturedAmountCents: number;
  }> = {},
) {
  return repo.createTransaction(overrides.tenantId ?? "tenant-1", {
    connectionId: "pconn-1",
    provider: (overrides.provider as "stripe" | "square") ?? "stripe",
    status: (overrides.status as "authorized") ?? "authorized",
    referenceType: "order",
    referenceId: "order-1",
    amountCents: overrides.amountCents ?? 5000,
    currency: "usd",
    tipAmountCents: 0,
    providerTransactionId:
      overrides.providerTransactionId ?? "pi_stripe_test_001",
    idempotencyKey: "idem-1",
    metadata: {},
  });
}

function createWebhookEvent(
  repo: WebhookEventRepository,
  overrides: Partial<{
    provider: "stripe" | "square";
    eventType: string;
    providerEventId: string;
    tenantId: string;
    rawPayload: string;
  }> = {},
): WebhookEventRecord {
  const event = repo.createEvent({
    provider: overrides.provider ?? "stripe",
    eventType: overrides.eventType ?? "payment_intent.succeeded",
    providerEventId: overrides.providerEventId ?? "evt_test_001",
    rawPayload:
      overrides.rawPayload ??
      JSON.stringify({
        id: overrides.providerEventId ?? "evt_test_001",
        type: overrides.eventType ?? "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_stripe_test_001",
            amount: 5000,
            metadata: {},
          },
        },
      }),
    tenantId: overrides.tenantId ?? "tenant-1",
    connectionId: "pconn-1",
  });
  return event!;
}

function createParsedPayload(
  overrides: Partial<ParsedWebhookPayload> = {},
): ParsedWebhookPayload {
  return {
    provider: "stripe",
    providerEventId: "evt_test_001",
    eventType: "payment_intent.succeeded",
    rawPayload: "{}",
    providerTransactionId: "pi_stripe_test_001",
    amountCents: 5000,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reconciliation tests
// ---------------------------------------------------------------------------

describe("WebhookEventProcessorService", () => {
  describe("processEvent — reconciliation", () => {
    it("updates transaction to captured on payment success webhook", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      createTestTransaction(transactionRepo, { status: "authorized" });

      const event = createWebhookEvent(eventRepo);
      const parsed = createParsedPayload();

      await processor.processEvent(event, parsed);

      const txn = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(txn.status).toBe("captured");
      expect(txn.capturedAmountCents).toBe(5000);

      // Verify event marked as processed
      const updatedEvent = eventRepo.getEventById(event.id);
      expect(updatedEvent!.status).toBe("processed");
    });

    it("updates transaction to failed on payment failure webhook", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      createTestTransaction(transactionRepo, { status: "authorized" });

      const event = createWebhookEvent(eventRepo, {
        eventType: "payment_intent.payment_failed",
        providerEventId: "evt_fail_001",
      });
      const parsed = createParsedPayload({
        eventType: "payment_intent.payment_failed",
        providerEventId: "evt_fail_001",
      });

      await processor.processEvent(event, parsed);

      const txn = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(txn.status).toBe("failed");
      expect(txn.failureReason).toContain("payment_intent.payment_failed");
    });

    it("updates transaction to refunded on refund webhook", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      const txn = createTestTransaction(transactionRepo, {
        status: "captured",
        capturedAmountCents: 5000,
      });
      // Manually set captured status
      transactionRepo.updateTransactionStatus(txn.id, "captured", {
        capturedAmountCents: 5000,
      });

      const event = createWebhookEvent(eventRepo, {
        eventType: "charge.refunded",
        providerEventId: "evt_refund_001",
      });
      const parsed = createParsedPayload({
        eventType: "charge.refunded",
        providerEventId: "evt_refund_001",
      });

      await processor.processEvent(event, parsed);

      const updated = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(updated.status).toBe("refunded");
    });

    it("updates transaction to voided on cancellation webhook", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      createTestTransaction(transactionRepo, { status: "authorized" });

      const event = createWebhookEvent(eventRepo, {
        eventType: "payment_intent.canceled",
        providerEventId: "evt_void_001",
      });
      const parsed = createParsedPayload({
        eventType: "payment_intent.canceled",
        providerEventId: "evt_void_001",
      });

      await processor.processEvent(event, parsed);

      const txn = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(txn.status).toBe("voided");
    });

    it("emits audit event for reconciliation", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      const txn = createTestTransaction(transactionRepo, {
        status: "authorized",
      });

      const event = createWebhookEvent(eventRepo);
      const parsed = createParsedPayload();

      await processor.processEvent(event, parsed);

      const auditEvents = transactionRepo.getAuditEventsByTransaction(txn.id);
      expect(auditEvents.length).toBe(1);
      expect(auditEvents[0].action).toBe("captured");
      expect(auditEvents[0].reason).toContain("Webhook reconciliation");
      expect(auditEvents[0].previousStatus).toBe("authorized");
      expect(auditEvents[0].newStatus).toBe("captured");
    });
  });

  // -----------------------------------------------------------------------
  // Idempotency tests
  // -----------------------------------------------------------------------

  describe("processEvent — idempotency", () => {
    it("reprocessing same event does not change already-reconciled state", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      createTestTransaction(transactionRepo, { status: "authorized" });

      const event = createWebhookEvent(eventRepo);
      const parsed = createParsedPayload();

      // First processing — should update to captured
      await processor.processEvent(event, parsed);
      const txnAfterFirst =
        transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(txnAfterFirst.status).toBe("captured");

      // Reset event status for replay
      eventRepo.updateEventStatus(event.id, "pending");

      // Second processing — should be idempotent (already captured)
      await processor.processEvent(event, parsed);
      const txnAfterSecond =
        transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(txnAfterSecond.status).toBe("captured");

      // Should only have 1 audit event (not 2)
      const auditEvents = transactionRepo.getAuditEventsByTransaction(
        txnAfterSecond.id,
      );
      expect(auditEvents.length).toBe(1);
    });

    it("marks already-at-target-state event as processed without error", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      // Transaction is already captured
      const txn = createTestTransaction(transactionRepo, {
        status: "captured",
      });
      transactionRepo.updateTransactionStatus(txn.id, "captured", {
        capturedAmountCents: 5000,
      });

      const event = createWebhookEvent(eventRepo);
      const parsed = createParsedPayload();

      await processor.processEvent(event, parsed);

      const updatedEvent = eventRepo.getEventById(event.id);
      expect(updatedEvent!.status).toBe("processed");
      expect(updatedEvent!.lastError).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Out-of-order tests
  // -----------------------------------------------------------------------

  describe("processEvent — out-of-order handling", () => {
    it("does not regress captured state when late authorized event arrives", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      // Transaction is already captured (advanced past authorized)
      const txn = createTestTransaction(transactionRepo, {
        status: "captured",
      });
      transactionRepo.updateTransactionStatus(txn.id, "captured", {
        capturedAmountCents: 5000,
      });

      // Late-arriving "captured" event — should be idempotent
      const event = createWebhookEvent(eventRepo);
      const parsed = createParsedPayload();

      await processor.processEvent(event, parsed);

      const updated = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      // Should still be captured (not regressed)
      expect(updated.status).toBe("captured");
    });

    it("does not regress refunded state to captured", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      const txn = createTestTransaction(transactionRepo);
      transactionRepo.updateTransactionStatus(txn.id, "refunded", {
        refundedAmountCents: 5000,
      });

      // Late "captured" event after refund — terminal state, should skip
      const event = createWebhookEvent(eventRepo);
      const parsed = createParsedPayload();

      await processor.processEvent(event, parsed);

      const updated = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(updated.status).toBe("refunded");

      const updatedEvent = eventRepo.getEventById(event.id);
      expect(updatedEvent!.status).toBe("skipped");
    });

    it("does not regress voided state", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      const txn = createTestTransaction(transactionRepo);
      transactionRepo.updateTransactionStatus(txn.id, "voided");

      const event = createWebhookEvent(eventRepo, {
        eventType: "payment_intent.succeeded",
        providerEventId: "evt_late_001",
      });
      const parsed = createParsedPayload({
        eventType: "payment_intent.succeeded",
        providerEventId: "evt_late_001",
      });

      await processor.processEvent(event, parsed);

      const updated = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(updated.status).toBe("voided");
    });
  });

  // -----------------------------------------------------------------------
  // Dead-letter tests
  // -----------------------------------------------------------------------

  describe("processEvent — dead letter", () => {
    it("skips unrecognized event types without failing", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      createTestTransaction(transactionRepo);

      const event = createWebhookEvent(eventRepo, {
        eventType: "customer.subscription.created",
        providerEventId: "evt_unknown_001",
      });
      const parsed = createParsedPayload({
        eventType: "customer.subscription.created",
        providerEventId: "evt_unknown_001",
      });

      await processor.processEvent(event, parsed);

      const updatedEvent = eventRepo.getEventById(event.id);
      expect(updatedEvent!.status).toBe("skipped");
      expect(updatedEvent!.lastError).toContain("Unrecognized event type");
    });

    it("skips events without provider transaction ID", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      createTestTransaction(transactionRepo);

      const event = createWebhookEvent(eventRepo);
      const parsed = createParsedPayload({
        providerTransactionId: null,
      });

      await processor.processEvent(event, parsed);

      const updatedEvent = eventRepo.getEventById(event.id);
      expect(updatedEvent!.status).toBe("skipped");
      expect(updatedEvent!.lastError).toContain(
        "No provider transaction ID",
      );
    });

    it("marks event as failed when transaction not found", async () => {
      const { eventRepo, processor } = createTestSetup();
      // No transaction created

      const event = createWebhookEvent(eventRepo);
      const parsed = createParsedPayload({
        providerTransactionId: "pi_nonexistent",
      });

      await processor.processEvent(event, parsed);

      const updatedEvent = eventRepo.getEventById(event.id);
      expect(updatedEvent!.status).toBe("failed");
      expect(updatedEvent!.lastError).toContain("Transaction not found");
    });
  });

  // -----------------------------------------------------------------------
  // Replay tests
  // -----------------------------------------------------------------------

  describe("replayEvent", () => {
    it("replays a failed event successfully", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      createTestTransaction(transactionRepo, { status: "authorized" });

      // Create event and manually mark as failed
      const event = createWebhookEvent(eventRepo);
      eventRepo.updateEventStatus(event.id, "failed", {
        lastError: "Temporary failure",
        attempts: 1,
      });

      const result = await processor.replayEvent(event.id);
      expect(result.success).toBe(true);

      const txn = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(txn.status).toBe("captured");
    });

    it("returns error for nonexistent event", async () => {
      const { processor } = createTestSetup();
      const result = await processor.replayEvent("nonexistent");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Event not found.");
    });

    it("replay of already-processed event is idempotent", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      const txn = createTestTransaction(transactionRepo, {
        status: "captured",
      });
      transactionRepo.updateTransactionStatus(txn.id, "captured", {
        capturedAmountCents: 5000,
      });

      const event = createWebhookEvent(eventRepo);
      eventRepo.updateEventStatus(event.id, "processed");

      const result = await processor.replayEvent(event.id);
      expect(result.success).toBe(true);

      // Transaction should still be captured
      const updated = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(updated.status).toBe("captured");
    });
  });

  // -----------------------------------------------------------------------
  // Square event processing
  // -----------------------------------------------------------------------

  describe("processEvent — Square events", () => {
    it("processes Square payment.completed event", async () => {
      const { transactionRepo, eventRepo, processor } = createTestSetup();
      createTestTransaction(transactionRepo, {
        provider: "square",
        providerTransactionId: "sq_pay_001",
        status: "authorized",
      });

      const event = createWebhookEvent(eventRepo, {
        provider: "square",
        eventType: "payment.completed",
        providerEventId: "sq_evt_001",
        rawPayload: JSON.stringify({
          event_id: "sq_evt_001",
          type: "payment.completed",
          data: {
            object: {
              payment: { id: "sq_pay_001" },
            },
          },
        }),
      });

      const parsed: ParsedWebhookPayload = {
        provider: "square",
        providerEventId: "sq_evt_001",
        eventType: "payment.completed",
        rawPayload: event.rawPayload,
        providerTransactionId: "sq_pay_001",
        amountCents: null,
        metadata: {},
      };

      await processor.processEvent(event, parsed);

      const txn = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(txn.status).toBe("captured");
    });
  });
});
