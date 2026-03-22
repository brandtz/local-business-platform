// E8-S3-T1: Webhook signature verification per payment provider.
// SECURITY CRITICAL: Reject unsigned or invalid webhooks.
// Each provider uses a different signing mechanism.
//
// Stripe: HMAC-SHA256 of payload with webhook signing secret, prefixed with timestamp.
// Square: HMAC-SHA256 of URL + payload with webhook signature key.

import { createHmac, timingSafeEqual } from "crypto";
import type { PaymentProvider } from "@platform/types";
import type { WebhookSignatureVerificationResult } from "@platform/types";

// ---------------------------------------------------------------------------
// Stripe signature verification
// ---------------------------------------------------------------------------

/**
 * Maximum age (in seconds) allowed for a Stripe webhook timestamp.
 * Stripe recommends rejecting events older than 5 minutes (300 seconds).
 */
const STRIPE_TIMESTAMP_TOLERANCE_SECONDS = 300;

/**
 * Verifies a Stripe webhook signature.
 *
 * Stripe sends `Stripe-Signature` header in the format:
 *   t=<timestamp>,v1=<signature>
 *
 * The signed payload is: `<timestamp>.<rawBody>`
 * The expected signature is HMAC-SHA256 of signed payload using the webhook secret.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  nowSeconds?: number,
): WebhookSignatureVerificationResult {
  if (!signatureHeader) {
    return { valid: false, error: "Missing Stripe-Signature header." };
  }
  if (!webhookSecret) {
    return { valid: false, error: "Missing webhook signing secret." };
  }

  // Parse the signature header
  const parts = signatureHeader.split(",");
  let timestamp: string | undefined;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key === "t") {
      timestamp = value;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!timestamp) {
    return { valid: false, error: "Missing timestamp in Stripe-Signature header." };
  }

  if (signatures.length === 0) {
    return { valid: false, error: "Missing v1 signature in Stripe-Signature header." };
  }

  // Check timestamp freshness
  const eventTimestamp = parseInt(timestamp, 10);
  if (isNaN(eventTimestamp)) {
    return { valid: false, error: "Invalid timestamp in Stripe-Signature header." };
  }

  const currentSeconds = nowSeconds ?? Math.floor(Date.now() / 1000);
  if (
    Math.abs(currentSeconds - eventTimestamp) >
    STRIPE_TIMESTAMP_TOLERANCE_SECONDS
  ) {
    return { valid: false, error: "Webhook timestamp outside tolerance window." };
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  // Constant-time comparison against any provided v1 signature
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  for (const sig of signatures) {
    const sigBuffer = Buffer.from(sig, "utf8");
    if (
      sigBuffer.length === expectedBuffer.length &&
      timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return { valid: true };
    }
  }

  return { valid: false, error: "Webhook signature verification failed." };
}

// ---------------------------------------------------------------------------
// Square signature verification
// ---------------------------------------------------------------------------

/**
 * Verifies a Square webhook signature.
 *
 * Square sends the signature in the `x-square-hmacsha256-signature` header.
 * The signed payload is: `<notificationUrl><rawBody>`
 * The expected signature is HMAC-SHA256 base64-encoded using the signature key.
 */
export function verifySquareSignature(
  rawBody: string,
  signatureHeader: string,
  signatureKey: string,
  notificationUrl: string,
): WebhookSignatureVerificationResult {
  if (!signatureHeader) {
    return { valid: false, error: "Missing Square signature header." };
  }
  if (!signatureKey) {
    return { valid: false, error: "Missing webhook signature key." };
  }
  if (!notificationUrl) {
    return { valid: false, error: "Missing notification URL for Square verification." };
  }

  // Compute expected signature
  const signedPayload = `${notificationUrl}${rawBody}`;
  const expectedSignature = createHmac("sha256", signatureKey)
    .update(signedPayload)
    .digest("base64");

  // Constant-time comparison
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(signatureHeader, "utf8");

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return { valid: false, error: "Webhook signature verification failed." };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Provider-agnostic verification dispatcher
// ---------------------------------------------------------------------------

export type WebhookVerificationInput = {
  provider: PaymentProvider;
  rawBody: string;
  signatureHeader: string;
  secret: string;
  /** Square requires the notification URL for verification. */
  notificationUrl?: string;
  /** Override for current time (seconds since epoch) — for testing. */
  nowSeconds?: number;
};

/**
 * Verifies a webhook signature for the given provider.
 * Dispatches to the appropriate provider-specific verification function.
 */
export function verifyWebhookSignature(
  input: WebhookVerificationInput,
): WebhookSignatureVerificationResult {
  switch (input.provider) {
    case "stripe":
      return verifyStripeSignature(
        input.rawBody,
        input.signatureHeader,
        input.secret,
        input.nowSeconds,
      );
    case "square":
      return verifySquareSignature(
        input.rawBody,
        input.signatureHeader,
        input.secret,
        input.notificationUrl ?? "",
      );
    default:
      return {
        valid: false,
        error: `Unsupported webhook provider: ${input.provider as string}`,
      };
  }
}
