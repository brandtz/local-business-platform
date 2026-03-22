// E8-S2-T2: Payment transaction orchestration service.
// Core service for creating intents, capturing payments, and processing refunds.
// E8-S2-T5: Multi-processor routing — primary preference with configuration.
// E8-S2-T6: Failover behavior — attempt secondary processor on primary failure.
//
// SECURITY: Refund actions emit audit events with actor and reason.
// SECURITY: Payment credentials are accessed only through the connection service.
// Provider-neutral: No Stripe or Square SDK calls — only adapter interface.

import { Injectable } from "@nestjs/common";
import type {
  PaymentTransactionRecord,
  PaymentTransactionStatus,
  CreatePaymentIntentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  PaymentAuditEvent,
  AdminTransactionSummary,
  AdminTransactionDetail,
  PaymentProvider,
  ProcessorRoutingConfig,
  PaymentConnectionRecord,
} from "@platform/types";
import { isValidPaymentTransactionTransition } from "@platform/types";

import { PaymentTransactionRepository } from "./payment-transaction.repository";
import { PaymentConnectionRepository } from "./payment-connection.repository";
import {
  decryptCredentials,
} from "./credential-encryption.service";
import { getProviderAdapter } from "./payment-provider-adapter";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class PaymentTransactionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentTransactionNotFoundError";
  }
}

export class PaymentTransactionTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentTransactionTransitionError";
  }
}

export class PaymentTransactionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentTransactionValidationError";
  }
}

export class PaymentProcessorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProcessorError";
  }
}

// ---------------------------------------------------------------------------
// Failover event log (E8-S2-T6: for E8-S6 alert pipeline consumption)
// ---------------------------------------------------------------------------

export type FailoverEvent = {
  timestamp: string;
  tenantId: string;
  primaryProvider: PaymentProvider;
  failoverProvider: PaymentProvider;
  primaryError: string;
  referenceType: "order" | "booking";
  referenceId: string;
};

const failoverEventLog: FailoverEvent[] = [];

export function getFailoverEventLog(): readonly FailoverEvent[] {
  return failoverEventLog;
}

export function clearFailoverEventLog(): void {
  failoverEventLog.length = 0;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PaymentTransactionService {
  constructor(
    private readonly transactionRepo: PaymentTransactionRepository = new PaymentTransactionRepository(),
    private readonly connectionRepo: PaymentConnectionRepository = new PaymentConnectionRepository(),
    private routingConfigs: Map<string, ProcessorRoutingConfig> = new Map(),
  ) {}

  // -----------------------------------------------------------------------
  // Multi-processor routing (E8-S2-T5)
  // -----------------------------------------------------------------------

  /**
   * Sets the processor routing configuration for a tenant.
   * When multiple active processors exist, this determines which is primary.
   */
  setRoutingConfig(config: ProcessorRoutingConfig): void {
    this.routingConfigs.set(config.tenantId, config);
  }

  getRoutingConfig(tenantId: string): ProcessorRoutingConfig | null {
    return this.routingConfigs.get(tenantId) ?? null;
  }

  /**
   * Resolves which payment connection to use for a new intent.
   * Returns the primary active connection, falling back to any active connection.
   * Throws if no active connection exists.
   */
  resolveConnection(tenantId: string): PaymentConnectionRecord {
    const connections = this.connectionRepo.listConnectionsByTenant(tenantId);
    const activeConnections = connections.filter((c) => c.status === "active");

    if (activeConnections.length === 0) {
      throw new PaymentProcessorError(
        `No active payment connections for tenant '${tenantId}'.`,
      );
    }

    // Check for routing config preference
    const config = this.routingConfigs.get(tenantId);
    if (config) {
      const preferred = activeConnections.find(
        (c) => c.provider === config.primaryProvider,
      );
      if (preferred) return preferred;
    }

    // Default: first active connection
    return activeConnections[0];
  }

  /**
   * Resolves the secondary (failover) connection for a tenant.
   * Returns null if no secondary active connection exists or failover is disabled.
   */
  resolveFailoverConnection(
    tenantId: string,
    excludeProvider: PaymentProvider,
  ): PaymentConnectionRecord | null {
    const config = this.routingConfigs.get(tenantId);
    if (!config?.failoverEnabled) return null;

    const connections = this.connectionRepo.listConnectionsByTenant(tenantId);
    const failoverConnection = connections.find(
      (c) => c.status === "active" && c.provider !== excludeProvider,
    );
    return failoverConnection ?? null;
  }

  // -----------------------------------------------------------------------
  // Create payment intent (E8-S2-T2)
  // -----------------------------------------------------------------------

  /**
   * Creates a payment intent via the provider-neutral adapter.
   * Handles idempotency: duplicate idempotency keys return the existing transaction.
   * Routes to the resolved primary processor; failover on failure (E8-S2-T6).
   */
  async createPaymentIntent(
    input: CreatePaymentIntentInput,
  ): Promise<PaymentTransactionRecord> {
    // Idempotency check
    const existing = this.transactionRepo.getTransactionByIdempotencyKey(
      input.tenantId,
      input.idempotencyKey,
    );
    if (existing) return existing;

    // Validate input
    if (input.amountCents <= 0) {
      throw new PaymentTransactionValidationError(
        "Payment amount must be positive.",
      );
    }

    // Resolve primary connection (E8-S2-T5)
    const primaryConnection = this.resolveConnection(input.tenantId);
    const credentials = this.decryptConnectionCredentials(primaryConnection);
    const adapter = getProviderAdapter(primaryConnection.provider);

    const result = await adapter.createIntent(credentials, {
      amountCents: input.amountCents,
      currency: input.currency,
      tipAmountCents: input.tipAmountCents ?? 0,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });

    // Primary succeeded
    if (result.success) {
      const txn = this.transactionRepo.createTransaction(input.tenantId, {
        connectionId: primaryConnection.id,
        provider: primaryConnection.provider,
        status: "authorized",
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        amountCents: input.amountCents,
        currency: input.currency,
        tipAmountCents: input.tipAmountCents ?? 0,
        providerTransactionId: result.providerTransactionId ?? null,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata ?? {},
      });
      this.emitAuditEvent(txn, "intent_created", null, null);
      return txn;
    }

    // Primary failed — attempt failover (E8-S2-T6)
    const failoverConnection = this.resolveFailoverConnection(
      input.tenantId,
      primaryConnection.provider,
    );

    if (failoverConnection) {
      // Log failover event for E8-S6 alert pipeline
      failoverEventLog.push({
        timestamp: new Date().toISOString(),
        tenantId: input.tenantId,
        primaryProvider: primaryConnection.provider,
        failoverProvider: failoverConnection.provider,
        primaryError: result.error ?? "Unknown error",
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      });

      const failoverCredentials =
        this.decryptConnectionCredentials(failoverConnection);
      const failoverAdapter = getProviderAdapter(failoverConnection.provider);
      const failoverResult = await failoverAdapter.createIntent(
        failoverCredentials,
        {
          amountCents: input.amountCents,
          currency: input.currency,
          tipAmountCents: input.tipAmountCents ?? 0,
          idempotencyKey: input.idempotencyKey,
          metadata: input.metadata,
        },
      );

      if (failoverResult.success) {
        const txn = this.transactionRepo.createTransaction(input.tenantId, {
          connectionId: failoverConnection.id,
          provider: failoverConnection.provider,
          status: "authorized",
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          amountCents: input.amountCents,
          currency: input.currency,
          tipAmountCents: input.tipAmountCents ?? 0,
          providerTransactionId:
            failoverResult.providerTransactionId ?? null,
          idempotencyKey: input.idempotencyKey,
          metadata: input.metadata ?? {},
        });
        this.emitAuditEvent(txn, "failover_triggered", null, null);
        this.emitAuditEvent(txn, "intent_created", null, null);
        return txn;
      }
    }

    // Both processors failed — create a failed transaction record
    const failedTxn = this.transactionRepo.createTransaction(input.tenantId, {
      connectionId: primaryConnection.id,
      provider: primaryConnection.provider,
      status: "failed",
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      amountCents: input.amountCents,
      currency: input.currency,
      tipAmountCents: input.tipAmountCents ?? 0,
      providerTransactionId: null,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata ?? {},
    });
    const updatedFailed = this.transactionRepo.updateTransactionStatus(failedTxn.id, "failed", {
      failureReason: result.error ?? "Payment processing failed.",
    });
    this.emitAuditEvent(updatedFailed!, "payment_failed", null, null);
    return updatedFailed!;
  }

  // -----------------------------------------------------------------------
  // Capture payment (E8-S2-T2)
  // -----------------------------------------------------------------------

  /**
   * Captures a previously authorized payment.
   * Transitions authorized → captured.
   * Uses the original processor that created the intent.
   */
  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<PaymentTransactionRecord> {
    const txn = this.requireTransaction(input.tenantId, input.transactionId);

    // Validate state transition
    this.validateTransition(txn.status, "captured");

    // Resolve the original connection (E8-S2-T5: refunds target original processor)
    const connection = this.connectionRepo.getConnectionById(
      input.tenantId,
      txn.connectionId,
    );
    if (!connection) {
      throw new PaymentProcessorError(
        `Payment connection '${txn.connectionId}' not found for capture.`,
      );
    }

    const credentials = this.decryptConnectionCredentials(connection);
    const adapter = getProviderAdapter(connection.provider);
    const captureAmount = input.amountCents ?? txn.amountCents;

    const result = await adapter.capturePayment(credentials, {
      providerTransactionId: txn.providerTransactionId!,
      amountCents: captureAmount,
    });

    if (!result.success) {
      // Mark as failed
      const updated = this.transactionRepo.updateTransactionStatus(
        txn.id,
        "failed",
        { failureReason: result.error ?? "Capture failed." },
      );
      this.emitAuditEvent(
        { ...txn, status: "failed" },
        "payment_failed",
        null,
        null,
      );
      return updated!;
    }

    const updated = this.transactionRepo.updateTransactionStatus(
      txn.id,
      "captured",
      { capturedAmountCents: captureAmount },
    );
    this.emitAuditEvent(updated!, "captured", null, captureAmount);
    return updated!;
  }

  // -----------------------------------------------------------------------
  // Void payment (E8-S2-T2)
  // -----------------------------------------------------------------------

  /**
   * Voids a previously authorized (but not captured) payment.
   * Transitions authorized → voided.
   */
  async voidPayment(
    tenantId: string,
    transactionId: string,
  ): Promise<PaymentTransactionRecord> {
    const txn = this.requireTransaction(tenantId, transactionId);
    this.validateTransition(txn.status, "voided");

    const connection = this.connectionRepo.getConnectionById(
      tenantId,
      txn.connectionId,
    );
    if (!connection) {
      throw new PaymentProcessorError(
        `Payment connection '${txn.connectionId}' not found for void.`,
      );
    }

    const credentials = this.decryptConnectionCredentials(connection);
    const adapter = getProviderAdapter(connection.provider);

    const result = await adapter.voidPayment(credentials, {
      providerTransactionId: txn.providerTransactionId!,
    });

    if (!result.success) {
      const updated = this.transactionRepo.updateTransactionStatus(
        txn.id,
        "failed",
        { failureReason: result.error ?? "Void failed." },
      );
      this.emitAuditEvent(
        { ...txn, status: "failed" },
        "payment_failed",
        null,
        null,
      );
      return updated!;
    }

    const updated = this.transactionRepo.updateTransactionStatus(
      txn.id,
      "voided",
    );
    this.emitAuditEvent(updated!, "voided", null, null);
    return updated!;
  }

  // -----------------------------------------------------------------------
  // Process refund (E8-S2-T2 + E8-S2-T4)
  // -----------------------------------------------------------------------

  /**
   * Issues a full or partial refund against a captured payment.
   * SECURITY CRITICAL: Emits audit event with actor and reason.
   * Refund routes to the original capture processor automatically (E8-S2-T5).
   * Supports partial refunds — tracks refundedAmountCents cumulatively.
   * Idempotent: duplicate idempotency keys are rejected.
   */
  async processRefund(
    input: RefundPaymentInput,
  ): Promise<PaymentTransactionRecord> {
    const txn = this.requireTransaction(input.tenantId, input.transactionId);

    // Validate actor and reason (security requirement)
    if (!input.actorId || input.actorId.trim().length === 0) {
      throw new PaymentTransactionValidationError(
        "Actor ID is required for refund actions.",
      );
    }
    if (!input.reason || input.reason.trim().length === 0) {
      throw new PaymentTransactionValidationError(
        "Reason is required for refund actions.",
      );
    }

    // Validate amount
    if (input.amountCents <= 0) {
      throw new PaymentTransactionValidationError(
        "Refund amount must be positive.",
      );
    }

    const remainingCapture = txn.capturedAmountCents - txn.refundedAmountCents;
    if (input.amountCents > remainingCapture) {
      throw new PaymentTransactionValidationError(
        `Refund amount (${input.amountCents}) exceeds remaining captured amount (${remainingCapture}).`,
      );
    }

    // Validate state transition
    const isFullRefund =
      input.amountCents === remainingCapture;
    const targetStatus = isFullRefund ? "refunded" : "partially_refunded";

    if (
      txn.status !== "captured" &&
      txn.status !== "partially_refunded"
    ) {
      throw new PaymentTransactionTransitionError(
        `Cannot refund transaction in '${txn.status}' state. Must be 'captured' or 'partially_refunded'.`,
      );
    }

    // Route to the original capture processor (E8-S2-T5)
    const connection = this.connectionRepo.getConnectionById(
      input.tenantId,
      txn.connectionId,
    );
    if (!connection) {
      throw new PaymentProcessorError(
        `Original payment connection '${txn.connectionId}' not found for refund.`,
      );
    }

    const credentials = this.decryptConnectionCredentials(connection);
    const adapter = getProviderAdapter(connection.provider);

    // Emit refund_initiated audit event BEFORE processing (security requirement)
    this.emitAuditEvent(
      txn,
      "refund_initiated",
      input.actorId,
      input.amountCents,
      input.reason,
    );

    const result = await adapter.refundPayment(credentials, {
      providerTransactionId: txn.providerTransactionId!,
      amountCents: input.amountCents,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason,
    });

    if (!result.success) {
      throw new PaymentProcessorError(
        `Refund failed: ${result.error ?? "Unknown error"}`,
      );
    }

    const newRefundedTotal = txn.refundedAmountCents + input.amountCents;
    const updated = this.transactionRepo.updateTransactionStatus(
      txn.id,
      targetStatus,
      { refundedAmountCents: newRefundedTotal },
    );

    // Emit refund_completed audit event
    this.emitAuditEvent(
      updated!,
      "refund_completed",
      input.actorId,
      input.amountCents,
      input.reason,
    );

    return updated!;
  }

  // -----------------------------------------------------------------------
  // Admin query methods (E8-S2-T4)
  // -----------------------------------------------------------------------

  listTransactions(
    tenantId: string,
    filters?: {
      referenceType?: "order" | "booking";
      referenceId?: string;
      status?: PaymentTransactionStatus;
    },
  ): AdminTransactionSummary[] {
    const records = this.transactionRepo.listTransactionsByTenant(
      tenantId,
      filters,
    );
    return records.map(this.toTransactionSummary);
  }

  getTransactionDetail(
    tenantId: string,
    transactionId: string,
  ): AdminTransactionDetail {
    const txn = this.requireTransaction(tenantId, transactionId);
    const auditEvents =
      this.transactionRepo.getAuditEventsByTransaction(transactionId);
    return {
      ...this.toTransactionSummary(txn),
      connectionId: txn.connectionId,
      providerTransactionId: txn.providerTransactionId,
      failureReason: txn.failureReason,
      auditEvents,
    };
  }

  getTransactionByReference(
    tenantId: string,
    referenceType: "order" | "booking",
    referenceId: string,
  ): PaymentTransactionRecord | null {
    return this.transactionRepo.getTransactionByReference(
      tenantId,
      referenceType,
      referenceId,
    );
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private requireTransaction(
    tenantId: string,
    transactionId: string,
  ): PaymentTransactionRecord {
    const record = this.transactionRepo.getTransactionById(
      tenantId,
      transactionId,
    );
    if (!record) {
      throw new PaymentTransactionNotFoundError(
        `Payment transaction '${transactionId}' not found for tenant '${tenantId}'.`,
      );
    }
    return record;
  }

  private validateTransition(
    from: PaymentTransactionStatus,
    to: PaymentTransactionStatus,
  ): void {
    if (!isValidPaymentTransactionTransition(from, to)) {
      throw new PaymentTransactionTransitionError(
        `Cannot transition payment transaction from '${from}' to '${to}'.`,
      );
    }
  }

  private decryptConnectionCredentials(
    connection: PaymentConnectionRecord,
  ): Record<string, unknown> {
    return decryptCredentials({
      ciphertext: connection.encryptedCredentials,
      iv: connection.credentialsIv,
      tag: connection.credentialsTag,
    });
  }

  private emitAuditEvent(
    txn: PaymentTransactionRecord,
    action: PaymentAuditEvent["action"],
    actorId: string | null,
    amountCents: number | null,
    reason?: string | null,
  ): PaymentAuditEvent {
    return this.transactionRepo.createAuditEvent({
      tenantId: txn.tenantId,
      transactionId: txn.id,
      action,
      actorId,
      reason: reason ?? null,
      previousStatus: null,
      newStatus: txn.status,
      amountCents,
      provider: txn.provider,
      metadata: {},
    });
  }

  private toTransactionSummary(
    record: PaymentTransactionRecord,
  ): AdminTransactionSummary {
    return {
      id: record.id,
      status: record.status,
      referenceType: record.referenceType,
      referenceId: record.referenceId,
      provider: record.provider,
      amountCents: record.amountCents,
      currency: record.currency,
      tipAmountCents: record.tipAmountCents,
      capturedAmountCents: record.capturedAmountCents,
      refundedAmountCents: record.refundedAmountCents,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
