import { describe, it, expect } from "vitest";
import {
  paymentProviders,
  isValidPaymentProvider,
  paymentConnectionStatuses,
  isValidPaymentConnectionTransition,
  isValidPaymentConnectionStatus,
  paymentConnectionModes,
  isValidPaymentConnectionMode,
  sanitizePaymentConnection,
  buildConnectionHealthView,
  buildPlatformPaymentHealthSummary,
  paymentConnectionSecretFields,
  paymentConnectionStatusTransitions,
  paymentTransactionStatuses,
  isValidPaymentTransactionTransition,
  isTerminalPaymentTransactionStatus,
} from "./payment";
import type { PaymentConnectionRecord } from "./payment";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function sampleRecord(
  overrides?: Partial<PaymentConnectionRecord>,
): PaymentConnectionRecord {
  return {
    id: "conn-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    tenantId: "tenant-1",
    provider: "stripe",
    displayName: "Stripe Live",
    status: "active",
    mode: "production",
    encryptedCredentials: "encrypted-blob",
    credentialsIv: "iv-hex",
    credentialsTag: "tag-hex",
    lastVerifiedAt: "2026-01-01T00:00:00.000Z",
    verificationError: null,
    statusChangedAt: "2026-01-01T00:00:00.000Z",
    suspendedReason: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Provider enum
// ---------------------------------------------------------------------------

describe("PaymentProvider", () => {
  it("defines stripe and square", () => {
    expect(paymentProviders).toEqual(["stripe", "square"]);
  });

  it("validates known providers", () => {
    expect(isValidPaymentProvider("stripe")).toBe(true);
    expect(isValidPaymentProvider("square")).toBe(true);
  });

  it("rejects unknown providers", () => {
    expect(isValidPaymentProvider("paypal")).toBe(false);
    expect(isValidPaymentProvider("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

describe("PaymentConnectionStatus", () => {
  it("defines four statuses", () => {
    expect(paymentConnectionStatuses).toEqual([
      "inactive",
      "verifying",
      "active",
      "suspended",
    ]);
  });

  it("validates known statuses", () => {
    for (const s of paymentConnectionStatuses) {
      expect(isValidPaymentConnectionStatus(s)).toBe(true);
    }
  });

  it("rejects unknown statuses", () => {
    expect(isValidPaymentConnectionStatus("pending")).toBe(false);
    expect(isValidPaymentConnectionStatus("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Connection mode
// ---------------------------------------------------------------------------

describe("PaymentConnectionMode", () => {
  it("defines sandbox and production", () => {
    expect(paymentConnectionModes).toEqual(["sandbox", "production"]);
  });

  it("validates known modes", () => {
    expect(isValidPaymentConnectionMode("sandbox")).toBe(true);
    expect(isValidPaymentConnectionMode("production")).toBe(true);
  });

  it("rejects unknown modes", () => {
    expect(isValidPaymentConnectionMode("test")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// State machine transitions
// ---------------------------------------------------------------------------

describe("paymentConnectionStatusTransitions", () => {
  it("allows inactive → verifying", () => {
    expect(isValidPaymentConnectionTransition("inactive", "verifying")).toBe(true);
  });

  it("does not allow inactive → active directly", () => {
    expect(isValidPaymentConnectionTransition("inactive", "active")).toBe(false);
  });

  it("allows verifying → active on success", () => {
    expect(isValidPaymentConnectionTransition("verifying", "active")).toBe(true);
  });

  it("allows verifying → inactive on failure", () => {
    expect(isValidPaymentConnectionTransition("verifying", "inactive")).toBe(true);
  });

  it("allows active → suspended", () => {
    expect(isValidPaymentConnectionTransition("active", "suspended")).toBe(true);
  });

  it("allows active → verifying for re-verification", () => {
    expect(isValidPaymentConnectionTransition("active", "verifying")).toBe(true);
  });

  it("allows suspended → verifying for recovery", () => {
    expect(isValidPaymentConnectionTransition("suspended", "verifying")).toBe(true);
  });

  it("allows suspended → inactive for deactivation", () => {
    expect(isValidPaymentConnectionTransition("suspended", "inactive")).toBe(true);
  });

  it("does not allow suspended → active directly", () => {
    expect(isValidPaymentConnectionTransition("suspended", "active")).toBe(false);
  });

  it("covers all statuses in transition map", () => {
    for (const status of paymentConnectionStatuses) {
      expect(paymentConnectionStatusTransitions[status]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Sanitization — SECURITY CRITICAL
// ---------------------------------------------------------------------------

describe("sanitizePaymentConnection", () => {
  it("removes encrypted credentials from output", () => {
    const record = sampleRecord();
    const sanitized = sanitizePaymentConnection(record);

    // Must NOT contain secret fields
    const sanitizedObj = sanitized as Record<string, unknown>;
    for (const field of paymentConnectionSecretFields) {
      expect(sanitizedObj[field]).toBeUndefined();
    }
  });

  it("preserves all non-secret fields", () => {
    const record = sampleRecord();
    const sanitized = sanitizePaymentConnection(record);

    expect(sanitized.id).toBe(record.id);
    expect(sanitized.provider).toBe(record.provider);
    expect(sanitized.displayName).toBe(record.displayName);
    expect(sanitized.status).toBe(record.status);
    expect(sanitized.mode).toBe(record.mode);
    expect(sanitized.lastVerifiedAt).toBe(record.lastVerifiedAt);
    expect(sanitized.verificationError).toBe(record.verificationError);
    expect(sanitized.statusChangedAt).toBe(record.statusChangedAt);
    expect(sanitized.suspendedReason).toBe(record.suspendedReason);
    expect(sanitized.createdAt).toBe(record.createdAt);
    expect(sanitized.updatedAt).toBe(record.updatedAt);
  });

  it("returns exactly the expected keys", () => {
    const sanitized = sanitizePaymentConnection(sampleRecord());
    const keys = Object.keys(sanitized).sort();
    expect(keys).toEqual([
      "createdAt",
      "displayName",
      "id",
      "lastVerifiedAt",
      "mode",
      "provider",
      "status",
      "statusChangedAt",
      "suspendedReason",
      "updatedAt",
      "verificationError",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Health view — SECURITY CRITICAL
// ---------------------------------------------------------------------------

describe("buildConnectionHealthView", () => {
  it("never includes credentials in health view", () => {
    const health = buildConnectionHealthView(sampleRecord());
    const healthObj = health as Record<string, unknown>;
    for (const field of paymentConnectionSecretFields) {
      expect(healthObj[field]).toBeUndefined();
    }
  });

  it("marks active connections as healthy", () => {
    const health = buildConnectionHealthView(sampleRecord({ status: "active" }));
    expect(health.isHealthy).toBe(true);
  });

  it("marks inactive connections as not healthy", () => {
    const health = buildConnectionHealthView(sampleRecord({ status: "inactive" }));
    expect(health.isHealthy).toBe(false);
  });

  it("marks suspended connections as not healthy", () => {
    const health = buildConnectionHealthView(sampleRecord({ status: "suspended" }));
    expect(health.isHealthy).toBe(false);
  });

  it("marks verifying connections as not healthy", () => {
    const health = buildConnectionHealthView(sampleRecord({ status: "verifying" }));
    expect(health.isHealthy).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Platform health summary — SECURITY CRITICAL
// ---------------------------------------------------------------------------

describe("buildPlatformPaymentHealthSummary", () => {
  it("returns zeros for empty input", () => {
    const summary = buildPlatformPaymentHealthSummary([]);
    expect(summary.totalConnections).toBe(0);
    expect(summary.activeConnections).toBe(0);
    expect(summary.suspendedConnections).toBe(0);
    expect(summary.verifyingConnections).toBe(0);
    expect(summary.inactiveConnections).toBe(0);
  });

  it("counts connections by status", () => {
    const records = [
      sampleRecord({ id: "c1", status: "active", provider: "stripe" }),
      sampleRecord({ id: "c2", status: "active", provider: "square" }),
      sampleRecord({ id: "c3", status: "suspended", provider: "stripe" }),
      sampleRecord({ id: "c4", status: "verifying", provider: "square" }),
      sampleRecord({ id: "c5", status: "inactive", provider: "stripe" }),
    ];
    const summary = buildPlatformPaymentHealthSummary(records);

    expect(summary.totalConnections).toBe(5);
    expect(summary.activeConnections).toBe(2);
    expect(summary.suspendedConnections).toBe(1);
    expect(summary.verifyingConnections).toBe(1);
    expect(summary.inactiveConnections).toBe(1);
  });

  it("breaks down counts by provider", () => {
    const records = [
      sampleRecord({ id: "c1", status: "active", provider: "stripe" }),
      sampleRecord({ id: "c2", status: "active", provider: "square" }),
      sampleRecord({ id: "c3", status: "suspended", provider: "stripe" }),
    ];
    const summary = buildPlatformPaymentHealthSummary(records);

    expect(summary.byProvider.stripe.total).toBe(2);
    expect(summary.byProvider.stripe.active).toBe(1);
    expect(summary.byProvider.stripe.suspended).toBe(1);
    expect(summary.byProvider.square.total).toBe(1);
    expect(summary.byProvider.square.active).toBe(1);
  });

  it("never exposes credentials in summary", () => {
    const records = [sampleRecord()];
    const summary = buildPlatformPaymentHealthSummary(records);
    const summaryStr = JSON.stringify(summary);

    expect(summaryStr).not.toContain("encrypted-blob");
    expect(summaryStr).not.toContain("iv-hex");
    expect(summaryStr).not.toContain("tag-hex");
  });
});

// ---------------------------------------------------------------------------
// Secret fields enumeration
// ---------------------------------------------------------------------------

describe("paymentConnectionSecretFields", () => {
  it("lists all encrypted credential fields", () => {
    expect(paymentConnectionSecretFields).toContain("encryptedCredentials");
    expect(paymentConnectionSecretFields).toContain("credentialsIv");
    expect(paymentConnectionSecretFields).toContain("credentialsTag");
  });
});

// ---------------------------------------------------------------------------
// E8-S2: Payment transaction state machine tests
// ---------------------------------------------------------------------------

describe("paymentTransactionStatuses", () => {
  it("defines all expected statuses", () => {
    expect(paymentTransactionStatuses).toContain("created");
    expect(paymentTransactionStatuses).toContain("authorized");
    expect(paymentTransactionStatuses).toContain("captured");
    expect(paymentTransactionStatuses).toContain("voided");
    expect(paymentTransactionStatuses).toContain("refunded");
    expect(paymentTransactionStatuses).toContain("partially_refunded");
    expect(paymentTransactionStatuses).toContain("failed");
    expect(paymentTransactionStatuses.length).toBe(7);
  });
});

describe("isValidPaymentTransactionTransition", () => {
  it("allows created → authorized", () => {
    expect(isValidPaymentTransactionTransition("created", "authorized")).toBe(true);
  });

  it("allows created → failed", () => {
    expect(isValidPaymentTransactionTransition("created", "failed")).toBe(true);
  });

  it("allows authorized → captured", () => {
    expect(isValidPaymentTransactionTransition("authorized", "captured")).toBe(true);
  });

  it("allows authorized → voided", () => {
    expect(isValidPaymentTransactionTransition("authorized", "voided")).toBe(true);
  });

  it("allows captured → refunded", () => {
    expect(isValidPaymentTransactionTransition("captured", "refunded")).toBe(true);
  });

  it("allows captured → partially_refunded", () => {
    expect(isValidPaymentTransactionTransition("captured", "partially_refunded")).toBe(true);
  });

  it("allows partially_refunded → refunded", () => {
    expect(isValidPaymentTransactionTransition("partially_refunded", "refunded")).toBe(true);
  });

  it("allows partially_refunded → partially_refunded (additional partial)", () => {
    expect(isValidPaymentTransactionTransition("partially_refunded", "partially_refunded")).toBe(true);
  });

  it("rejects created → captured (skip)", () => {
    expect(isValidPaymentTransactionTransition("created", "captured")).toBe(false);
  });

  it("rejects refunded → any", () => {
    expect(isValidPaymentTransactionTransition("refunded", "captured")).toBe(false);
    expect(isValidPaymentTransactionTransition("refunded", "refunded")).toBe(false);
  });

  it("rejects voided → any", () => {
    expect(isValidPaymentTransactionTransition("voided", "captured")).toBe(false);
  });

  it("rejects failed → any", () => {
    expect(isValidPaymentTransactionTransition("failed", "captured")).toBe(false);
    expect(isValidPaymentTransactionTransition("failed", "authorized")).toBe(false);
  });
});

describe("isTerminalPaymentTransactionStatus", () => {
  it("identifies voided as terminal", () => {
    expect(isTerminalPaymentTransactionStatus("voided")).toBe(true);
  });

  it("identifies refunded as terminal", () => {
    expect(isTerminalPaymentTransactionStatus("refunded")).toBe(true);
  });

  it("identifies failed as terminal", () => {
    expect(isTerminalPaymentTransactionStatus("failed")).toBe(true);
  });

  it("identifies captured as non-terminal", () => {
    expect(isTerminalPaymentTransactionStatus("captured")).toBe(false);
  });

  it("identifies authorized as non-terminal", () => {
    expect(isTerminalPaymentTransactionStatus("authorized")).toBe(false);
  });

  it("identifies partially_refunded as non-terminal", () => {
    expect(isTerminalPaymentTransactionStatus("partially_refunded")).toBe(false);
  });
});
