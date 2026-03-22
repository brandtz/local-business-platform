// E8-S2-T4: Tests for admin refund and transaction API contracts.

import { describe, it, expect } from "vitest";
import {
  assertValidAdminRefundRequest,
  assertValidTransactionListQuery,
  assertNoSecretsInTransactionResponse,
  AdminRefundValidationError,
} from "./payment-transaction-api-contracts";

// ---------------------------------------------------------------------------
// Refund request validation
// ---------------------------------------------------------------------------

describe("assertValidAdminRefundRequest", () => {
  const validRequest = {
    tenantId: "tenant-1",
    transactionId: "ptxn-1",
    amountCents: 2500,
    reason: "Customer request",
    actorId: "admin-1",
  };

  it("should accept a valid refund request", () => {
    const result = assertValidAdminRefundRequest(validRequest);
    expect(result.tenantId).toBe("tenant-1");
    expect(result.transactionId).toBe("ptxn-1");
    expect(result.amountCents).toBe(2500);
    expect(result.reason).toBe("Customer request");
    expect(result.actorId).toBe("admin-1");
  });

  it("should reject missing tenantId", () => {
    expect(() =>
      assertValidAdminRefundRequest({ ...validRequest, tenantId: "" }),
    ).toThrow(AdminRefundValidationError);
  });

  it("should reject missing transactionId", () => {
    expect(() =>
      assertValidAdminRefundRequest({ ...validRequest, transactionId: "" }),
    ).toThrow(AdminRefundValidationError);
  });

  it("should reject zero amount", () => {
    expect(() =>
      assertValidAdminRefundRequest({ ...validRequest, amountCents: 0 }),
    ).toThrow(AdminRefundValidationError);
  });

  it("should reject negative amount", () => {
    expect(() =>
      assertValidAdminRefundRequest({ ...validRequest, amountCents: -100 }),
    ).toThrow(AdminRefundValidationError);
  });

  it("should reject missing reason (security requirement)", () => {
    expect(() =>
      assertValidAdminRefundRequest({ ...validRequest, reason: "" }),
    ).toThrow(AdminRefundValidationError);
  });

  it("should reject missing actorId (security requirement)", () => {
    expect(() =>
      assertValidAdminRefundRequest({ ...validRequest, actorId: "" }),
    ).toThrow(AdminRefundValidationError);
  });

  it("should trim whitespace from string fields", () => {
    const result = assertValidAdminRefundRequest({
      ...validRequest,
      tenantId: "  tenant-1  ",
      reason: "  Reason  ",
    });
    expect(result.tenantId).toBe("tenant-1");
    expect(result.reason).toBe("Reason");
  });
});

// ---------------------------------------------------------------------------
// Transaction list query validation
// ---------------------------------------------------------------------------

describe("assertValidTransactionListQuery", () => {
  it("should accept minimal query with tenantId", () => {
    const result = assertValidTransactionListQuery({ tenantId: "tenant-1" });
    expect(result.tenantId).toBe("tenant-1");
  });

  it("should accept query with all filters", () => {
    const result = assertValidTransactionListQuery({
      tenantId: "tenant-1",
      referenceType: "order",
      referenceId: "order-1",
      status: "captured",
      page: 2,
      pageSize: 25,
    });
    expect(result.referenceType).toBe("order");
    expect(result.referenceId).toBe("order-1");
    expect(result.status).toBe("captured");
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
  });

  it("should reject missing tenantId", () => {
    expect(() => assertValidTransactionListQuery({})).toThrow(
      AdminRefundValidationError,
    );
  });

  it("should reject invalid referenceType", () => {
    expect(() =>
      assertValidTransactionListQuery({
        tenantId: "tenant-1",
        referenceType: "invoice",
      }),
    ).toThrow(AdminRefundValidationError);
  });

  it("should reject invalid status", () => {
    expect(() =>
      assertValidTransactionListQuery({
        tenantId: "tenant-1",
        status: "processing",
      }),
    ).toThrow(AdminRefundValidationError);
  });

  it("should reject invalid page number", () => {
    expect(() =>
      assertValidTransactionListQuery({
        tenantId: "tenant-1",
        page: 0,
      }),
    ).toThrow(AdminRefundValidationError);
  });

  it("should reject page size over 100", () => {
    expect(() =>
      assertValidTransactionListQuery({
        tenantId: "tenant-1",
        pageSize: 200,
      }),
    ).toThrow(AdminRefundValidationError);
  });
});

// ---------------------------------------------------------------------------
// No secrets in transaction response
// ---------------------------------------------------------------------------

describe("assertNoSecretsInTransactionResponse", () => {
  it("should pass for clean transaction JSON", () => {
    const json = JSON.stringify({
      id: "ptxn-1",
      status: "captured",
      amountCents: 5000,
      provider: "stripe",
    });
    expect(() => assertNoSecretsInTransactionResponse(json)).not.toThrow();
  });

  it("should throw if encryptedCredentials is present", () => {
    const json = JSON.stringify({ encryptedCredentials: "abc123" });
    expect(() => assertNoSecretsInTransactionResponse(json)).toThrow(
      "encryptedCredentials",
    );
  });

  it("should throw if credentialsIv is present", () => {
    const json = JSON.stringify({ credentialsIv: "abc123" });
    expect(() => assertNoSecretsInTransactionResponse(json)).toThrow(
      "credentialsIv",
    );
  });

  it("should throw if credentialsTag is present", () => {
    const json = JSON.stringify({ credentialsTag: "abc123" });
    expect(() => assertNoSecretsInTransactionResponse(json)).toThrow(
      "credentialsTag",
    );
  });

  it("should throw if secretKey is present", () => {
    const json = JSON.stringify({ secretKey: "sk_test_123" });
    expect(() => assertNoSecretsInTransactionResponse(json)).toThrow(
      "secretKey",
    );
  });

  it("should throw if accessToken is present", () => {
    const json = JSON.stringify({ accessToken: "sq-token-123" });
    expect(() => assertNoSecretsInTransactionResponse(json)).toThrow(
      "accessToken",
    );
  });
});
