// E8-S3-T1: Webhook signature verification tests.
// SECURITY CRITICAL: These tests validate that invalid/tampered/expired webhooks are rejected.

import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  verifyStripeSignature,
  verifySquareSignature,
  verifyWebhookSignature,
} from "./webhook-signature.service";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function stripeSignatureHeader(
  payload: string,
  secret: string,
  timestamp: number,
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function squareSignatureHeader(
  payload: string,
  signatureKey: string,
  notificationUrl: string,
): string {
  const signedPayload = `${notificationUrl}${payload}`;
  return createHmac("sha256", signatureKey)
    .update(signedPayload)
    .digest("base64");
}

// ---------------------------------------------------------------------------
// Stripe signature verification
// ---------------------------------------------------------------------------

describe("verifyStripeSignature", () => {
  const secret = "whsec_test_secret_12345";
  const payload = '{"id":"evt_1","type":"payment_intent.succeeded"}';
  const nowSeconds = 1700000000;

  it("accepts valid Stripe webhook signature", () => {
    const header = stripeSignatureHeader(payload, secret, nowSeconds);
    const result = verifyStripeSignature(payload, header, secret, nowSeconds);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects tampered payload", () => {
    const header = stripeSignatureHeader(payload, secret, nowSeconds);
    const tampered = '{"id":"evt_1","type":"payment_intent.payment_failed"}';
    const result = verifyStripeSignature(tampered, header, secret, nowSeconds);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Webhook signature verification failed.");
  });

  it("rejects wrong secret", () => {
    const header = stripeSignatureHeader(payload, secret, nowSeconds);
    const result = verifyStripeSignature(
      payload,
      header,
      "wrong_secret",
      nowSeconds,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Webhook signature verification failed.");
  });

  it("rejects expired timestamp", () => {
    const oldTimestamp = nowSeconds - 600; // 10 minutes ago (> 5 min tolerance)
    const header = stripeSignatureHeader(payload, secret, oldTimestamp);
    const result = verifyStripeSignature(payload, header, secret, nowSeconds);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Webhook timestamp outside tolerance window.");
  });

  it("rejects future timestamp outside tolerance", () => {
    const futureTimestamp = nowSeconds + 600;
    const header = stripeSignatureHeader(payload, secret, futureTimestamp);
    const result = verifyStripeSignature(payload, header, secret, nowSeconds);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Webhook timestamp outside tolerance window.");
  });

  it("accepts timestamp within tolerance", () => {
    const recentTimestamp = nowSeconds - 200; // 3+ minutes ago (< 5 min tolerance)
    const header = stripeSignatureHeader(payload, secret, recentTimestamp);
    const result = verifyStripeSignature(payload, header, secret, nowSeconds);
    expect(result.valid).toBe(true);
  });

  it("rejects missing signature header", () => {
    const result = verifyStripeSignature(payload, "", secret, nowSeconds);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing Stripe-Signature header.");
  });

  it("rejects missing webhook secret", () => {
    const header = stripeSignatureHeader(payload, secret, nowSeconds);
    const result = verifyStripeSignature(payload, header, "", nowSeconds);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing webhook signing secret.");
  });

  it("rejects header without timestamp", () => {
    const result = verifyStripeSignature(
      payload,
      "v1=abc123",
      secret,
      nowSeconds,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Missing timestamp in Stripe-Signature header.",
    );
  });

  it("rejects header without v1 signature", () => {
    const result = verifyStripeSignature(
      payload,
      `t=${nowSeconds}`,
      secret,
      nowSeconds,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Missing v1 signature in Stripe-Signature header.",
    );
  });
});

// ---------------------------------------------------------------------------
// Square signature verification
// ---------------------------------------------------------------------------

describe("verifySquareSignature", () => {
  const signatureKey = "square_test_sig_key_67890";
  const payload = '{"event_id":"sq_evt_1","type":"payment.completed"}';
  const notificationUrl = "https://api.example.com/webhooks/square";

  it("accepts valid Square webhook signature", () => {
    const header = squareSignatureHeader(
      payload,
      signatureKey,
      notificationUrl,
    );
    const result = verifySquareSignature(
      payload,
      header,
      signatureKey,
      notificationUrl,
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects tampered payload", () => {
    const header = squareSignatureHeader(
      payload,
      signatureKey,
      notificationUrl,
    );
    const tampered = '{"event_id":"sq_evt_1","type":"payment.failed"}';
    const result = verifySquareSignature(
      tampered,
      header,
      signatureKey,
      notificationUrl,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Webhook signature verification failed.");
  });

  it("rejects wrong signature key", () => {
    const header = squareSignatureHeader(
      payload,
      signatureKey,
      notificationUrl,
    );
    const result = verifySquareSignature(
      payload,
      header,
      "wrong_key",
      notificationUrl,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Webhook signature verification failed.");
  });

  it("rejects wrong notification URL", () => {
    const header = squareSignatureHeader(
      payload,
      signatureKey,
      notificationUrl,
    );
    const result = verifySquareSignature(
      payload,
      header,
      signatureKey,
      "https://wrong.example.com/webhooks/square",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Webhook signature verification failed.");
  });

  it("rejects missing signature header", () => {
    const result = verifySquareSignature(
      payload,
      "",
      signatureKey,
      notificationUrl,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing Square signature header.");
  });

  it("rejects missing signature key", () => {
    const header = squareSignatureHeader(
      payload,
      signatureKey,
      notificationUrl,
    );
    const result = verifySquareSignature(
      payload,
      header,
      "",
      notificationUrl,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing webhook signature key.");
  });

  it("rejects missing notification URL", () => {
    const header = squareSignatureHeader(
      payload,
      signatureKey,
      notificationUrl,
    );
    const result = verifySquareSignature(payload, header, signatureKey, "");
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Missing notification URL for Square verification.",
    );
  });
});

// ---------------------------------------------------------------------------
// Provider-agnostic verification dispatcher
// ---------------------------------------------------------------------------

describe("verifyWebhookSignature", () => {
  it("dispatches to Stripe verification", () => {
    const secret = "whsec_dispatch_test";
    const payload = '{"id":"evt_dispatch"}';
    const nowSeconds = 1700000000;
    const signedPayload = `${nowSeconds}.${payload}`;
    const sig = createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");
    const header = `t=${nowSeconds},v1=${sig}`;

    const result = verifyWebhookSignature({
      provider: "stripe",
      rawBody: payload,
      signatureHeader: header,
      secret,
      nowSeconds,
    });
    expect(result.valid).toBe(true);
  });

  it("dispatches to Square verification", () => {
    const signatureKey = "sq_dispatch_key";
    const payload = '{"event_id":"sq_dispatch"}';
    const notificationUrl = "https://example.com/webhooks/square";
    const header = createHmac("sha256", signatureKey)
      .update(`${notificationUrl}${payload}`)
      .digest("base64");

    const result = verifyWebhookSignature({
      provider: "square",
      rawBody: payload,
      signatureHeader: header,
      secret: signatureKey,
      notificationUrl,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid Stripe signature through dispatcher", () => {
    const result = verifyWebhookSignature({
      provider: "stripe",
      rawBody: "{}",
      signatureHeader: "t=1,v1=invalid",
      secret: "test",
      nowSeconds: 1,
    });
    expect(result.valid).toBe(false);
  });
});
