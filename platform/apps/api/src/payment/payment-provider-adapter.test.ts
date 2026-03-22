// E8-S2-T1: Tests for provider-neutral payment interface.
// Validates adapter contract enforcement for all required payment operations.

import { describe, it, expect } from "vitest";
import {
  StripeProviderAdapter,
  SquareProviderAdapter,
  getProviderAdapter,
} from "./payment-provider-adapter";
import type { PaymentProviderAdapter } from "./payment-provider-adapter";

// ---------------------------------------------------------------------------
// Valid test credentials
// ---------------------------------------------------------------------------

const stripeCredentials = {
  publishableKey: "pk_test_abc123",
  secretKey: "sk_test_xyz789",
};

const squareCredentials = {
  applicationId: "sq-app-123",
  accessToken: "sq-token-456",
  locationId: "sq-loc-789",
};

const invalidCredentials = { foo: "bar" };

// ---------------------------------------------------------------------------
// Stripe adapter tests
// ---------------------------------------------------------------------------

describe("StripeProviderAdapter", () => {
  const adapter = new StripeProviderAdapter();

  it("should have provider set to 'stripe'", () => {
    expect(adapter.provider).toBe("stripe");
  });

  it("should verify valid Stripe credentials", async () => {
    const result = await adapter.verifyCredentials(stripeCredentials);
    expect(result.success).toBe(true);
  });

  it("should reject invalid Stripe credentials", async () => {
    const result = await adapter.verifyCredentials(invalidCredentials);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should create intent with valid credentials", async () => {
    const result = await adapter.createIntent(stripeCredentials, {
      amountCents: 5000,
      currency: "usd",
      tipAmountCents: 500,
      idempotencyKey: "test-key-1",
    });
    expect(result.success).toBe(true);
    expect(result.providerTransactionId).toContain("pi_stripe_");
  });

  it("should fail intent creation with invalid credentials", async () => {
    const result = await adapter.createIntent(invalidCredentials, {
      amountCents: 5000,
      currency: "usd",
      tipAmountCents: 0,
      idempotencyKey: "test-key-2",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should capture payment with valid provider transaction ID", async () => {
    const result = await adapter.capturePayment(stripeCredentials, {
      providerTransactionId: "pi_stripe_123",
      amountCents: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("should fail capture without provider transaction ID", async () => {
    const result = await adapter.capturePayment(stripeCredentials, {
      providerTransactionId: "",
      amountCents: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("should void payment with valid provider transaction ID", async () => {
    const result = await adapter.voidPayment(stripeCredentials, {
      providerTransactionId: "pi_stripe_123",
    });
    expect(result.success).toBe(true);
  });

  it("should refund payment with valid parameters", async () => {
    const result = await adapter.refundPayment(stripeCredentials, {
      providerTransactionId: "pi_stripe_123",
      amountCents: 2500,
      idempotencyKey: "refund-key-1",
      reason: "Customer request",
    });
    expect(result.success).toBe(true);
    expect(result.providerRefundId).toContain("re_stripe_");
  });

  it("should fail refund with invalid credentials", async () => {
    const result = await adapter.refundPayment(invalidCredentials, {
      providerTransactionId: "pi_stripe_123",
      amountCents: 2500,
      idempotencyKey: "refund-key-2",
      reason: "Customer request",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Square adapter tests
// ---------------------------------------------------------------------------

describe("SquareProviderAdapter", () => {
  const adapter = new SquareProviderAdapter();

  it("should have provider set to 'square'", () => {
    expect(adapter.provider).toBe("square");
  });

  it("should verify valid Square credentials", async () => {
    const result = await adapter.verifyCredentials(squareCredentials);
    expect(result.success).toBe(true);
  });

  it("should reject invalid Square credentials", async () => {
    const result = await adapter.verifyCredentials(invalidCredentials);
    expect(result.success).toBe(false);
  });

  it("should create intent with valid credentials", async () => {
    const result = await adapter.createIntent(squareCredentials, {
      amountCents: 3000,
      currency: "usd",
      tipAmountCents: 0,
      idempotencyKey: "sq-test-key-1",
    });
    expect(result.success).toBe(true);
    expect(result.providerTransactionId).toContain("sq_pay_");
  });

  it("should fail intent creation with invalid credentials", async () => {
    const result = await adapter.createIntent(invalidCredentials, {
      amountCents: 3000,
      currency: "usd",
      tipAmountCents: 0,
      idempotencyKey: "sq-test-key-2",
    });
    expect(result.success).toBe(false);
  });

  it("should capture payment with valid provider transaction ID", async () => {
    const result = await adapter.capturePayment(squareCredentials, {
      providerTransactionId: "sq_pay_123",
      amountCents: 3000,
    });
    expect(result.success).toBe(true);
  });

  it("should refund payment with valid parameters", async () => {
    const result = await adapter.refundPayment(squareCredentials, {
      providerTransactionId: "sq_pay_123",
      amountCents: 1500,
      idempotencyKey: "sq-refund-key-1",
      reason: "Product return",
    });
    expect(result.success).toBe(true);
    expect(result.providerRefundId).toContain("sq_refund_");
  });
});

// ---------------------------------------------------------------------------
// Adapter registry tests
// ---------------------------------------------------------------------------

describe("getProviderAdapter", () => {
  it("should return Stripe adapter for 'stripe'", () => {
    const adapter = getProviderAdapter("stripe");
    expect(adapter.provider).toBe("stripe");
    expect(adapter).toBeInstanceOf(StripeProviderAdapter);
  });

  it("should return Square adapter for 'square'", () => {
    const adapter = getProviderAdapter("square");
    expect(adapter.provider).toBe("square");
    expect(adapter).toBeInstanceOf(SquareProviderAdapter);
  });

  it("should throw for unsupported provider", () => {
    expect(() =>
      getProviderAdapter("paypal" as never),
    ).toThrow("Unsupported payment provider");
  });
});

// ---------------------------------------------------------------------------
// Interface contract tests
// ---------------------------------------------------------------------------

describe("PaymentProviderAdapter contract", () => {
  const adapters: PaymentProviderAdapter[] = [
    new StripeProviderAdapter(),
    new SquareProviderAdapter(),
  ];

  for (const adapter of adapters) {
    describe(`${adapter.provider} adapter implements full contract`, () => {
      it("should have verifyCredentials method", () => {
        expect(typeof adapter.verifyCredentials).toBe("function");
      });

      it("should have checkConnectionStatus method", () => {
        expect(typeof adapter.checkConnectionStatus).toBe("function");
      });

      it("should have createIntent method", () => {
        expect(typeof adapter.createIntent).toBe("function");
      });

      it("should have capturePayment method", () => {
        expect(typeof adapter.capturePayment).toBe("function");
      });

      it("should have voidPayment method", () => {
        expect(typeof adapter.voidPayment).toBe("function");
      });

      it("should have refundPayment method", () => {
        expect(typeof adapter.refundPayment).toBe("function");
      });
    });
  }
});
