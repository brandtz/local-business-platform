// E8-S2-T2: In-memory payment transaction repository.
// Tenant-scoped CRUD for payment transaction records and audit events.

import type {
  PaymentTransactionRecord,
  PaymentTransactionStatus,
  PaymentAuditEvent,
  PaymentProvider,
} from "@platform/types";

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

const txnCounter = { value: 0 };
const auditCounter = { value: 0 };

function nextTxnId(): string {
  txnCounter.value += 1;
  return `ptxn-${txnCounter.value}`;
}

function nextAuditId(): string {
  auditCounter.value += 1;
  return `paudit-${auditCounter.value}`;
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class PaymentTransactionRepository {
  private transactions: PaymentTransactionRecord[] = [];
  private auditEvents: PaymentAuditEvent[] = [];

  // -----------------------------------------------------------------------
  // Transaction CRUD
  // -----------------------------------------------------------------------

  createTransaction(
    tenantId: string,
    data: {
      connectionId: string;
      provider: PaymentProvider;
      status: PaymentTransactionStatus;
      referenceType: "order" | "booking";
      referenceId: string;
      amountCents: number;
      currency: string;
      tipAmountCents: number;
      providerTransactionId: string | null;
      idempotencyKey: string;
      metadata: Record<string, unknown>;
    },
  ): PaymentTransactionRecord {
    const timestamp = now();
    const record: PaymentTransactionRecord = {
      id: nextTxnId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      tenantId,
      connectionId: data.connectionId,
      provider: data.provider,
      status: data.status,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      amountCents: data.amountCents,
      currency: data.currency,
      tipAmountCents: data.tipAmountCents,
      providerTransactionId: data.providerTransactionId,
      idempotencyKey: data.idempotencyKey,
      capturedAmountCents: 0,
      refundedAmountCents: 0,
      failureReason: null,
      metadata: data.metadata,
    };
    this.transactions.push(record);
    return record;
  }

  getTransactionById(
    tenantId: string,
    transactionId: string,
  ): PaymentTransactionRecord | null {
    return (
      this.transactions.find(
        (t) => t.tenantId === tenantId && t.id === transactionId,
      ) ?? null
    );
  }

  getTransactionByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): PaymentTransactionRecord | null {
    return (
      this.transactions.find(
        (t) => t.tenantId === tenantId && t.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  getTransactionByReference(
    tenantId: string,
    referenceType: "order" | "booking",
    referenceId: string,
  ): PaymentTransactionRecord | null {
    return (
      this.transactions.find(
        (t) =>
          t.tenantId === tenantId &&
          t.referenceType === referenceType &&
          t.referenceId === referenceId,
      ) ?? null
    );
  }

  listTransactionsByTenant(
    tenantId: string,
    filters?: {
      referenceType?: "order" | "booking";
      referenceId?: string;
      status?: PaymentTransactionStatus;
    },
  ): PaymentTransactionRecord[] {
    let results = this.transactions.filter((t) => t.tenantId === tenantId);
    if (filters?.referenceType) {
      results = results.filter((t) => t.referenceType === filters.referenceType);
    }
    if (filters?.referenceId) {
      results = results.filter((t) => t.referenceId === filters.referenceId);
    }
    if (filters?.status) {
      results = results.filter((t) => t.status === filters.status);
    }
    return results;
  }

  updateTransactionStatus(
    transactionId: string,
    status: PaymentTransactionStatus,
    fields?: {
      providerTransactionId?: string | null;
      capturedAmountCents?: number;
      refundedAmountCents?: number;
      failureReason?: string | null;
    },
  ): PaymentTransactionRecord | null {
    const txn = this.transactions.find((t) => t.id === transactionId);
    if (!txn) return null;

    txn.status = status;
    txn.updatedAt = now();

    if (fields?.providerTransactionId !== undefined) {
      txn.providerTransactionId = fields.providerTransactionId;
    }
    if (fields?.capturedAmountCents !== undefined) {
      txn.capturedAmountCents = fields.capturedAmountCents;
    }
    if (fields?.refundedAmountCents !== undefined) {
      txn.refundedAmountCents = fields.refundedAmountCents;
    }
    if (fields?.failureReason !== undefined) {
      txn.failureReason = fields.failureReason;
    }
    return txn;
  }

  // -----------------------------------------------------------------------
  // Audit event persistence
  // -----------------------------------------------------------------------

  createAuditEvent(
    data: Omit<PaymentAuditEvent, "id" | "timestamp">,
  ): PaymentAuditEvent {
    const event: PaymentAuditEvent = {
      id: nextAuditId(),
      timestamp: now(),
      ...data,
    };
    this.auditEvents.push(event);
    return event;
  }

  getAuditEventsByTransaction(transactionId: string): PaymentAuditEvent[] {
    return this.auditEvents.filter((e) => e.transactionId === transactionId);
  }

  getAuditEventsByTenant(tenantId: string): PaymentAuditEvent[] {
    return this.auditEvents.filter((e) => e.tenantId === tenantId);
  }
}
