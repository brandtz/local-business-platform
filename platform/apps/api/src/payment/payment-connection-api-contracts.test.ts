import { describe, it, expect } from "vitest";
import {
  assertValidCreatePaymentConnectionRequest,
  assertValidVerifyPaymentConnectionRequest,
  assertValidDeactivatePaymentConnectionRequest,
  assertNoSecretsInResponse,
  PaymentConnectionApiContractError,
} from "./payment-connection-api-contracts";

// ---------------------------------------------------------------------------
// Create payment connection request
// ---------------------------------------------------------------------------

describe("assertValidCreatePaymentConnectionRequest", () => {
  it("accepts valid Stripe connection request", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "stripe",
        displayName: "My Stripe",
        mode: "production",
        credentials: {
          publishableKey: "pk_test_123",
          secretKey: "sk_test_456",
        },
      }),
    ).not.toThrow();
  });

  it("accepts valid Square connection request", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "square",
        displayName: "My Square",
        mode: "sandbox",
        credentials: {
          applicationId: "sq-app-123",
          accessToken: "sq-token-456",
          locationId: "sq-loc-789",
        },
      }),
    ).not.toThrow();
  });

  it("rejects non-object input", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest("invalid"),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects null input", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest(null),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects invalid provider", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "paypal",
        displayName: "Test",
        mode: "sandbox",
        credentials: {},
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects empty provider", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "",
        displayName: "Test",
        mode: "sandbox",
        credentials: {},
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects empty display name", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "stripe",
        displayName: "",
        mode: "sandbox",
        credentials: {
          publishableKey: "pk_test_123",
          secretKey: "sk_test_456",
        },
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects invalid mode", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "stripe",
        displayName: "Test",
        mode: "test",
        credentials: {
          publishableKey: "pk_test_123",
          secretKey: "sk_test_456",
        },
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects non-object credentials", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "stripe",
        displayName: "Test",
        mode: "sandbox",
        credentials: "not-an-object",
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects Stripe request missing publishableKey", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "stripe",
        displayName: "Test",
        mode: "sandbox",
        credentials: {
          secretKey: "sk_test_456",
        },
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects Stripe request missing secretKey", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "stripe",
        displayName: "Test",
        mode: "sandbox",
        credentials: {
          publishableKey: "pk_test_123",
        },
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects Square request missing applicationId", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "square",
        displayName: "Test",
        mode: "sandbox",
        credentials: {
          accessToken: "sq-token-456",
          locationId: "sq-loc-789",
        },
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects Square request missing accessToken", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "square",
        displayName: "Test",
        mode: "sandbox",
        credentials: {
          applicationId: "sq-app-123",
          locationId: "sq-loc-789",
        },
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects Square request missing locationId", () => {
    expect(() =>
      assertValidCreatePaymentConnectionRequest({
        provider: "square",
        displayName: "Test",
        mode: "sandbox",
        credentials: {
          applicationId: "sq-app-123",
          accessToken: "sq-token-456",
        },
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });
});

// ---------------------------------------------------------------------------
// Verify payment connection request
// ---------------------------------------------------------------------------

describe("assertValidVerifyPaymentConnectionRequest", () => {
  it("accepts valid request", () => {
    expect(() =>
      assertValidVerifyPaymentConnectionRequest({
        connectionId: "conn-123",
      }),
    ).not.toThrow();
  });

  it("rejects non-object input", () => {
    expect(() =>
      assertValidVerifyPaymentConnectionRequest("invalid"),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects empty connectionId", () => {
    expect(() =>
      assertValidVerifyPaymentConnectionRequest({
        connectionId: "",
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects missing connectionId", () => {
    expect(() =>
      assertValidVerifyPaymentConnectionRequest({}),
    ).toThrow(PaymentConnectionApiContractError);
  });
});

// ---------------------------------------------------------------------------
// Deactivate payment connection request
// ---------------------------------------------------------------------------

describe("assertValidDeactivatePaymentConnectionRequest", () => {
  it("accepts valid request", () => {
    expect(() =>
      assertValidDeactivatePaymentConnectionRequest({
        connectionId: "conn-123",
      }),
    ).not.toThrow();
  });

  it("rejects non-object input", () => {
    expect(() =>
      assertValidDeactivatePaymentConnectionRequest(42),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects empty connectionId", () => {
    expect(() =>
      assertValidDeactivatePaymentConnectionRequest({
        connectionId: "",
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });
});

// ---------------------------------------------------------------------------
// SECURITY: Response sanitization
// ---------------------------------------------------------------------------

describe("assertNoSecretsInResponse", () => {
  it("accepts clean response objects", () => {
    expect(() =>
      assertNoSecretsInResponse({
        id: "conn-1",
        provider: "stripe",
        status: "active",
        displayName: "My Stripe",
      }),
    ).not.toThrow();
  });

  it("rejects response with encryptedCredentials", () => {
    expect(() =>
      assertNoSecretsInResponse({
        id: "conn-1",
        encryptedCredentials: "some-encrypted-data",
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects response with credentialsIv", () => {
    expect(() =>
      assertNoSecretsInResponse({
        id: "conn-1",
        credentialsIv: "some-iv",
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects response with credentialsTag", () => {
    expect(() =>
      assertNoSecretsInResponse({
        id: "conn-1",
        credentialsTag: "some-tag",
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects response with secretKey", () => {
    expect(() =>
      assertNoSecretsInResponse({
        id: "conn-1",
        secretKey: "sk_test_123",
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects response with accessToken", () => {
    expect(() =>
      assertNoSecretsInResponse({
        id: "conn-1",
        accessToken: "sq-token-123",
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("rejects response with nested secrets", () => {
    expect(() =>
      assertNoSecretsInResponse({
        id: "conn-1",
        nested: { encryptedCredentials: "secret" },
      }),
    ).toThrow(PaymentConnectionApiContractError);
  });

  it("accepts arrays of clean objects", () => {
    expect(() =>
      assertNoSecretsInResponse([
        { id: "conn-1", provider: "stripe", status: "active" },
        { id: "conn-2", provider: "square", status: "inactive" },
      ]),
    ).not.toThrow();
  });
});
