// E8-S2-T4: Admin refund and transaction management UI helpers.
// View models for transaction history list, refund form, and transaction detail.
// SECURITY: Never exposes payment credentials. All views are tenant-scoped.

import type {
  AdminTransactionSummary,
  AdminTransactionDetail,
  PaymentTransactionStatus,
  PaymentProvider,
  PaymentAuditEvent,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Transaction status badge
// ---------------------------------------------------------------------------

export type StatusBadge = {
  label: string;
  color: string;
};

const transactionStatusBadgeMap: Record<PaymentTransactionStatus, StatusBadge> = {
  created: { label: "Created", color: "gray" },
  authorized: { label: "Authorized", color: "blue" },
  captured: { label: "Captured", color: "green" },
  voided: { label: "Voided", color: "orange" },
  refunded: { label: "Refunded", color: "purple" },
  partially_refunded: { label: "Partially Refunded", color: "yellow" },
  failed: { label: "Failed", color: "red" },
};

export function getTransactionStatusBadge(
  status: PaymentTransactionStatus,
): StatusBadge {
  return transactionStatusBadgeMap[status] ?? { label: status, color: "gray" };
}

// ---------------------------------------------------------------------------
// Provider label
// ---------------------------------------------------------------------------

export function getTransactionProviderLabel(provider: PaymentProvider): string {
  switch (provider) {
    case "stripe":
      return "Stripe";
    case "square":
      return "Square";
    default:
      return provider;
  }
}

// ---------------------------------------------------------------------------
// Transaction list row view model
// ---------------------------------------------------------------------------

export type TransactionListRow = {
  id: string;
  statusBadge: StatusBadge;
  providerLabel: string;
  referenceType: string;
  referenceId: string;
  amountFormatted: string;
  tipFormatted: string;
  capturedFormatted: string;
  refundedFormatted: string;
  createdAt: string;
  canRefund: boolean;
};

export function buildTransactionListRow(
  summary: AdminTransactionSummary,
): TransactionListRow {
  return {
    id: summary.id,
    statusBadge: getTransactionStatusBadge(summary.status),
    providerLabel: getTransactionProviderLabel(summary.provider),
    referenceType: summary.referenceType,
    referenceId: summary.referenceId,
    amountFormatted: formatCents(summary.amountCents, summary.currency),
    tipFormatted: formatCents(summary.tipAmountCents, summary.currency),
    capturedFormatted: formatCents(summary.capturedAmountCents, summary.currency),
    refundedFormatted: formatCents(summary.refundedAmountCents, summary.currency),
    createdAt: summary.createdAt,
    canRefund:
      summary.status === "captured" ||
      summary.status === "partially_refunded",
  };
}

// ---------------------------------------------------------------------------
// Transaction detail view model
// ---------------------------------------------------------------------------

export type TransactionDetailView = TransactionListRow & {
  connectionId: string;
  providerTransactionId: string | null;
  failureReason: string | null;
  auditTrail: AuditEventRow[];
  refundableAmountCents: number;
  refundableAmountFormatted: string;
  currency: string;
};

export type AuditEventRow = {
  id: string;
  timestamp: string;
  action: string;
  actorId: string | null;
  reason: string | null;
  amountFormatted: string | null;
  statusChange: string;
};

export function buildTransactionDetailView(
  detail: AdminTransactionDetail,
): TransactionDetailView {
  const listRow = buildTransactionListRow(detail);
  const refundableAmountCents =
    detail.capturedAmountCents - detail.refundedAmountCents;

  return {
    ...listRow,
    connectionId: detail.connectionId,
    providerTransactionId: detail.providerTransactionId,
    failureReason: detail.failureReason,
    auditTrail: detail.auditEvents.map((e) => buildAuditEventRow(e, detail.currency)),
    refundableAmountCents,
    refundableAmountFormatted: formatCents(refundableAmountCents, detail.currency),
    currency: detail.currency,
  };
}

function buildAuditEventRow(
  event: PaymentAuditEvent,
  currency: string,
): AuditEventRow {
  return {
    id: event.id,
    timestamp: event.timestamp,
    action: formatAuditAction(event.action),
    actorId: event.actorId,
    reason: event.reason,
    amountFormatted: event.amountCents
      ? formatCents(event.amountCents, currency)
      : null,
    statusChange: event.newStatus,
  };
}

function formatAuditAction(action: PaymentAuditEvent["action"]): string {
  switch (action) {
    case "intent_created":
      return "Intent Created";
    case "captured":
      return "Payment Captured";
    case "voided":
      return "Payment Voided";
    case "refund_initiated":
      return "Refund Initiated";
    case "refund_completed":
      return "Refund Completed";
    case "failover_triggered":
      return "Failover Triggered";
    case "payment_failed":
      return "Payment Failed";
    default:
      return action;
  }
}

// ---------------------------------------------------------------------------
// Refund form
// ---------------------------------------------------------------------------

export type RefundFormFields = {
  transactionId: string;
  maxAmountCents: number;
  maxAmountFormatted: string;
  currency: string;
};

export function buildRefundFormFields(
  detail: AdminTransactionDetail,
): RefundFormFields {
  const maxAmountCents =
    detail.capturedAmountCents - detail.refundedAmountCents;
  return {
    transactionId: detail.id,
    maxAmountCents,
    maxAmountFormatted: formatCents(maxAmountCents, detail.currency),
    currency: detail.currency,
  };
}

export type RefundFormValidation = {
  valid: boolean;
  errors: string[];
};

export function validateRefundForm(input: {
  amountCents: number;
  maxAmountCents: number;
  reason: string;
}): RefundFormValidation {
  const errors: string[] = [];

  if (input.amountCents <= 0) {
    errors.push("Refund amount must be greater than zero.");
  }
  if (input.amountCents > input.maxAmountCents) {
    errors.push(
      `Refund amount cannot exceed ${formatCents(input.maxAmountCents, "usd")}.`,
    );
  }
  if (!input.reason || input.reason.trim().length === 0) {
    errors.push("A reason is required for refund actions.");
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

export function formatCents(cents: number, currency: string): string {
  const dollars = (cents / 100).toFixed(2);
  const symbol = currency.toLowerCase() === "usd" ? "$" : currency.toUpperCase() + " ";
  return `${symbol}${dollars}`;
}
