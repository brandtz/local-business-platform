// E8-S2-T4: Tests for admin refund and transaction management UI.

import { describe, it, expect } from "vitest";
import type {
  AdminTransactionSummary,
  AdminTransactionDetail,
} from "@platform/types";
import {
  getTransactionStatusBadge,
  getTransactionProviderLabel,
  buildTransactionListRow,
  buildTransactionDetailView,
  buildRefundFormFields,
  validateRefundForm,
  formatCents,
} from "./payment-transaction-management";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function sampleSummary(
  overrides?: Partial<AdminTransactionSummary>,
): AdminTransactionSummary {
  return {
    id: "ptxn-1",
    status: "captured",
    referenceType: "order",
    referenceId: "order-1",
    provider: "stripe",
    amountCents: 5000,
    currency: "usd",
    tipAmountCents: 500,
    capturedAmountCents: 5000,
    refundedAmountCents: 0,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:30:00.000Z",
    ...overrides,
  };
}

function sampleDetail(
  overrides?: Partial<AdminTransactionDetail>,
): AdminTransactionDetail {
  return {
    ...sampleSummary(),
    connectionId: "pconn-1",
    providerTransactionId: "pi_stripe_123",
    failureReason: null,
    auditEvents: [
      {
        id: "paudit-1",
        timestamp: "2026-01-15T10:00:00.000Z",
        tenantId: "tenant-1",
        transactionId: "ptxn-1",
        action: "intent_created",
        actorId: null,
        reason: null,
        previousStatus: null,
        newStatus: "authorized",
        amountCents: null,
        provider: "stripe",
        metadata: {},
      },
      {
        id: "paudit-2",
        timestamp: "2026-01-15T10:30:00.000Z",
        tenantId: "tenant-1",
        transactionId: "ptxn-1",
        action: "captured",
        actorId: null,
        reason: null,
        previousStatus: null,
        newStatus: "captured",
        amountCents: 5000,
        provider: "stripe",
        metadata: {},
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Status badge tests
// ---------------------------------------------------------------------------

describe("getTransactionStatusBadge", () => {
  it("should return green badge for captured status", () => {
    const badge = getTransactionStatusBadge("captured");
    expect(badge.label).toBe("Captured");
    expect(badge.color).toBe("green");
  });

  it("should return blue badge for authorized status", () => {
    const badge = getTransactionStatusBadge("authorized");
    expect(badge.label).toBe("Authorized");
    expect(badge.color).toBe("blue");
  });

  it("should return red badge for failed status", () => {
    const badge = getTransactionStatusBadge("failed");
    expect(badge.label).toBe("Failed");
    expect(badge.color).toBe("red");
  });

  it("should return purple badge for refunded status", () => {
    const badge = getTransactionStatusBadge("refunded");
    expect(badge.label).toBe("Refunded");
    expect(badge.color).toBe("purple");
  });

  it("should return yellow badge for partially_refunded status", () => {
    const badge = getTransactionStatusBadge("partially_refunded");
    expect(badge.label).toBe("Partially Refunded");
    expect(badge.color).toBe("yellow");
  });

  it("should return orange badge for voided status", () => {
    const badge = getTransactionStatusBadge("voided");
    expect(badge.label).toBe("Voided");
    expect(badge.color).toBe("orange");
  });
});

// ---------------------------------------------------------------------------
// Provider label tests
// ---------------------------------------------------------------------------

describe("getTransactionProviderLabel", () => {
  it("should return 'Stripe' for stripe", () => {
    expect(getTransactionProviderLabel("stripe")).toBe("Stripe");
  });

  it("should return 'Square' for square", () => {
    expect(getTransactionProviderLabel("square")).toBe("Square");
  });
});

// ---------------------------------------------------------------------------
// Transaction list row tests
// ---------------------------------------------------------------------------

describe("buildTransactionListRow", () => {
  it("should build list row from summary", () => {
    const row = buildTransactionListRow(sampleSummary());
    expect(row.id).toBe("ptxn-1");
    expect(row.statusBadge.label).toBe("Captured");
    expect(row.providerLabel).toBe("Stripe");
    expect(row.referenceType).toBe("order");
    expect(row.amountFormatted).toBe("$50.00");
    expect(row.tipFormatted).toBe("$5.00");
    expect(row.canRefund).toBe(true);
  });

  it("should set canRefund false for non-captured/non-partial statuses", () => {
    const row = buildTransactionListRow(
      sampleSummary({ status: "authorized" }),
    );
    expect(row.canRefund).toBe(false);
  });

  it("should set canRefund true for partially_refunded status", () => {
    const row = buildTransactionListRow(
      sampleSummary({ status: "partially_refunded" }),
    );
    expect(row.canRefund).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Transaction detail view tests
// ---------------------------------------------------------------------------

describe("buildTransactionDetailView", () => {
  it("should build detail view with audit trail", () => {
    const view = buildTransactionDetailView(sampleDetail());
    expect(view.id).toBe("ptxn-1");
    expect(view.auditTrail.length).toBe(2);
    expect(view.refundableAmountCents).toBe(5000);
    expect(view.refundableAmountFormatted).toBe("$50.00");
    expect(view.currency).toBe("usd");
  });

  it("should compute refundable amount after partial refund", () => {
    const view = buildTransactionDetailView(
      sampleDetail({
        capturedAmountCents: 5000,
        refundedAmountCents: 2000,
      }),
    );
    expect(view.refundableAmountCents).toBe(3000);
    expect(view.refundableAmountFormatted).toBe("$30.00");
  });

  it("should show zero refundable for fully refunded", () => {
    const view = buildTransactionDetailView(
      sampleDetail({
        capturedAmountCents: 5000,
        refundedAmountCents: 5000,
        status: "refunded",
      }),
    );
    expect(view.refundableAmountCents).toBe(0);
    expect(view.canRefund).toBe(false);
  });

  it("should format audit event actions", () => {
    const view = buildTransactionDetailView(sampleDetail());
    expect(view.auditTrail[0].action).toBe("Intent Created");
    expect(view.auditTrail[1].action).toBe("Payment Captured");
  });
});

// ---------------------------------------------------------------------------
// Refund form tests
// ---------------------------------------------------------------------------

describe("buildRefundFormFields", () => {
  it("should compute max refund amount", () => {
    const fields = buildRefundFormFields(sampleDetail());
    expect(fields.maxAmountCents).toBe(5000);
    expect(fields.maxAmountFormatted).toBe("$50.00");
    expect(fields.transactionId).toBe("ptxn-1");
  });

  it("should compute reduced max after partial refund", () => {
    const fields = buildRefundFormFields(
      sampleDetail({ refundedAmountCents: 2000 }),
    );
    expect(fields.maxAmountCents).toBe(3000);
  });
});

describe("validateRefundForm", () => {
  it("should validate a correct refund form", () => {
    const result = validateRefundForm({
      amountCents: 2500,
      maxAmountCents: 5000,
      reason: "Customer request",
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should reject zero amount", () => {
    const result = validateRefundForm({
      amountCents: 0,
      maxAmountCents: 5000,
      reason: "Customer request",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject amount exceeding max", () => {
    const result = validateRefundForm({
      amountCents: 6000,
      maxAmountCents: 5000,
      reason: "Customer request",
    });
    expect(result.valid).toBe(false);
  });

  it("should reject missing reason", () => {
    const result = validateRefundForm({
      amountCents: 2500,
      maxAmountCents: 5000,
      reason: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "A reason is required for refund actions.",
    );
  });
});

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

describe("formatCents", () => {
  it("should format USD amounts with dollar sign", () => {
    expect(formatCents(5000, "usd")).toBe("$50.00");
    expect(formatCents(123, "usd")).toBe("$1.23");
    expect(formatCents(0, "usd")).toBe("$0.00");
  });

  it("should format non-USD amounts with currency code", () => {
    expect(formatCents(1000, "eur")).toBe("EUR 10.00");
  });
});

// ---------------------------------------------------------------------------
// No secrets in view models
// ---------------------------------------------------------------------------

describe("security - no secrets in view models", () => {
  it("should not contain credential data in list row", () => {
    const row = buildTransactionListRow(sampleSummary());
    const json = JSON.stringify(row);
    expect(json).not.toContain("encryptedCredentials");
    expect(json).not.toContain("credentialsIv");
    expect(json).not.toContain("credentialsTag");
    expect(json).not.toContain("secretKey");
    expect(json).not.toContain("accessToken");
  });

  it("should not contain credential data in detail view", () => {
    const view = buildTransactionDetailView(sampleDetail());
    const json = JSON.stringify(view);
    expect(json).not.toContain("encryptedCredentials");
    expect(json).not.toContain("credentialsIv");
    expect(json).not.toContain("credentialsTag");
    expect(json).not.toContain("secretKey");
    expect(json).not.toContain("accessToken");
  });
});
