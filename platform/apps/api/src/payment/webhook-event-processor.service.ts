// E8-S3-T3: Retry-safe webhook event processor.
// Processes stored webhook events and reconciles payment transaction state.
//
// RELIABILITY CRITICAL: Idempotent — reprocessing the same event produces
// no additional side effects.
// RELIABILITY CRITICAL: Out-of-order events do not regress transaction state.
// Dead-letter: unrecognized event types are logged but do not fail processing.
//
// This processor does NOT call provider APIs — it processes only from the
// received/stored payload.

import { Injectable } from "@nestjs/common";
import type {
  WebhookEventRecord,
  ParsedWebhookPayload,
  PaymentTransactionStatus,
} from "@platform/types";
import {
  mapProviderEventToTransactionStatus,
  isValidPaymentTransactionTransition,
  isTerminalPaymentTransactionStatus,
} from "@platform/types";

import { PaymentTransactionRepository } from "./payment-transaction.repository";
import { WebhookEventRepository } from "./webhook-event.repository";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class WebhookProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookProcessingError";
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class WebhookEventProcessorService {
  constructor(
    private readonly transactionRepo: PaymentTransactionRepository = new PaymentTransactionRepository(),
    private readonly eventRepo: WebhookEventRepository = new WebhookEventRepository(),
  ) {}

  /**
   * Processes a webhook event and reconciles transaction state.
   * Idempotent: reprocessing an already-processed event is a no-op.
   * Out-of-order safe: will not regress terminal or already-advanced states.
   */
  async processEvent(
    event: WebhookEventRecord,
    parsed: ParsedWebhookPayload,
  ): Promise<void> {
    // Mark event as processing
    this.eventRepo.updateEventStatus(event.id, "processing", {
      attempts: event.attempts + 1,
      lastProcessedAt: new Date().toISOString(),
    });

    try {
      // Map provider event type to target transaction status
      const targetStatus = mapProviderEventToTransactionStatus(
        parsed.provider,
        parsed.eventType,
      );

      if (targetStatus === null) {
        // Unrecognized event type — dead letter, skip without failing
        this.eventRepo.updateEventStatus(event.id, "skipped", {
          lastError: `Unrecognized event type: ${parsed.eventType}`,
        });
        return;
      }

      // Find the transaction by provider transaction ID
      if (!parsed.providerTransactionId) {
        this.eventRepo.updateEventStatus(event.id, "skipped", {
          lastError: "No provider transaction ID in webhook payload.",
        });
        return;
      }

      const transaction = this.findTransactionByProviderTxnId(
        parsed.providerTransactionId,
        event.tenantId,
      );

      if (!transaction) {
        // Transaction not found — might arrive before our system creates it.
        // Mark as failed for retry.
        this.eventRepo.updateEventStatus(event.id, "failed", {
          lastError: `Transaction not found for provider ID: ${parsed.providerTransactionId}`,
        });
        return;
      }

      // Idempotency check: if transaction is already at or past the target state,
      // skip processing without error.
      if (transaction.status === targetStatus) {
        // Already at target state — idempotent skip
        this.eventRepo.updateEventStatus(event.id, "processed", {
          lastError: null,
        });
        return;
      }

      // Out-of-order check: don't regress terminal states
      if (isTerminalPaymentTransactionStatus(transaction.status)) {
        this.eventRepo.updateEventStatus(event.id, "skipped", {
          lastError: `Transaction already in terminal state: ${transaction.status}`,
        });
        return;
      }

      // Check if the transition is valid from the current state
      if (!isValidPaymentTransactionTransition(transaction.status, targetStatus)) {
        // Invalid transition — check if target is "behind" current state
        // (e.g., trying to set "authorized" when already "captured")
        // In this case, skip silently (out-of-order delivery)
        if (isStateAhead(transaction.status, targetStatus)) {
          this.eventRepo.updateEventStatus(event.id, "skipped", {
            lastError: `Transaction already advanced past target state: current=${transaction.status}, target=${targetStatus}`,
          });
          return;
        }

        // Otherwise, it's a genuinely invalid transition
        this.eventRepo.updateEventStatus(event.id, "failed", {
          lastError: `Invalid transition: ${transaction.status} → ${targetStatus}`,
        });
        return;
      }

      // Apply the state change
      const previousStatus = transaction.status;
      const updateFields: {
        capturedAmountCents?: number;
        refundedAmountCents?: number;
        failureReason?: string | null;
      } = {};

      if (targetStatus === "captured" && parsed.amountCents !== null) {
        updateFields.capturedAmountCents = parsed.amountCents;
      } else if (targetStatus === "captured") {
        // If no amount in webhook, use the transaction's authorized amount
        updateFields.capturedAmountCents = transaction.amountCents;
      }

      if (targetStatus === "refunded") {
        // Full refund — set refunded amount to captured amount
        updateFields.refundedAmountCents = transaction.capturedAmountCents || transaction.amountCents;
      }

      if (targetStatus === "failed") {
        updateFields.failureReason = `Provider event: ${parsed.eventType}`;
      }

      this.transactionRepo.updateTransactionStatus(
        transaction.id,
        targetStatus,
        updateFields,
      );

      // Emit audit event for the reconciliation
      this.transactionRepo.createAuditEvent({
        tenantId: transaction.tenantId,
        transactionId: transaction.id,
        action: this.mapTargetStatusToAuditAction(targetStatus),
        actorId: null,
        reason: `Webhook reconciliation: ${parsed.eventType}`,
        previousStatus,
        newStatus: targetStatus,
        amountCents: parsed.amountCents,
        provider: parsed.provider,
        metadata: { webhookEventId: event.id, providerEventId: parsed.providerEventId },
      });

      // Mark event as processed
      this.eventRepo.updateEventStatus(event.id, "processed", {
        lastError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown processing error";
      this.eventRepo.updateEventStatus(event.id, "failed", {
        lastError: message,
      });
      throw new WebhookProcessingError(message);
    }
  }

  /**
   * Replays a stored webhook event by reprocessing from its stored payload.
   * Used by platform admins to recover from transient failures.
   */
  async replayEvent(eventId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const event = this.eventRepo.getEventById(eventId);
    if (!event) {
      return { success: false, error: "Event not found." };
    }

    // Re-parse the stored payload
    const parsed = this.reparsePayload(event);

    try {
      await this.processEvent(event, parsed);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Replay processing failed";
      return { success: false, error: message };
    }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private findTransactionByProviderTxnId(
    providerTransactionId: string,
    tenantId: string | null,
  ) {
    if (!tenantId) return null;

    // Search transactions by provider transaction ID within the tenant
    const transactions =
      this.transactionRepo.listTransactionsByTenant(tenantId);
    return (
      transactions.find(
        (t) => t.providerTransactionId === providerTransactionId,
      ) ?? null
    );
  }

  private reparsePayload(event: WebhookEventRecord): ParsedWebhookPayload {
    const rawPayload = event.rawPayload;
    const parsed = JSON.parse(rawPayload) as Record<string, unknown>;

    if (event.provider === "stripe") {
      const data = (parsed.data as Record<string, unknown>) ?? {};
      const object = (data.object as Record<string, unknown>) ?? {};
      return {
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        rawPayload,
        providerTransactionId: (object.id as string) ?? null,
        amountCents:
          typeof object.amount === "number"
            ? (object.amount as number)
            : null,
        metadata: (object.metadata as Record<string, unknown>) ?? {},
      };
    }

    // Square
    const data = (parsed.data as Record<string, unknown>) ?? {};
    const object = (data.object as Record<string, unknown>) ?? {};
    const innerObj = (object.payment ?? object.refund ?? object) as Record<
      string,
      unknown
    >;
    return {
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      rawPayload,
      providerTransactionId: (innerObj.id as string) ?? null,
      amountCents: null,
      metadata: {},
    };
  }

  private mapTargetStatusToAuditAction(
    status: PaymentTransactionStatus,
  ): "captured" | "voided" | "refund_completed" | "payment_failed" {
    switch (status) {
      case "captured":
        return "captured";
      case "voided":
        return "voided";
      case "refunded":
      case "partially_refunded":
        return "refund_completed";
      case "failed":
        return "payment_failed";
      default:
        return "captured";
    }
  }
}

// ---------------------------------------------------------------------------
// State ordering helper
// ---------------------------------------------------------------------------

const stateOrder: Record<PaymentTransactionStatus, number> = {
  created: 0,
  authorized: 1,
  captured: 2,
  partially_refunded: 3,
  refunded: 4,
  voided: 4,
  failed: 4,
};

/**
 * Returns true if `currentStatus` is "ahead" of `targetStatus` in the
 * payment lifecycle. Used to detect out-of-order webhook delivery.
 */
function isStateAhead(
  currentStatus: PaymentTransactionStatus,
  targetStatus: PaymentTransactionStatus,
): boolean {
  return stateOrder[currentStatus] > stateOrder[targetStatus];
}
