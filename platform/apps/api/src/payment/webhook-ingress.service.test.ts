// E8-S3-T1 + T2: Webhook ingress service tests.
// Validates end-to-end webhook reception, signature verification,
// storage, and duplicate detection.

import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { WebhookIngressService } from "./webhook-ingress.service";
import { PaymentConnectionRepository } from "./payment-connection.repository";
import { WebhookEventRepository } from "./webhook-event.repository";
import { WebhookEventProcessorService } from "./webhook-event-processor.service";
import { PaymentTransactionRepository } from "./payment-transaction.repository";
import { encryptCredentials } from "./credential-encryption.service";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const ENCRYPTION_KEY = "a]3Fk9!wQ~Tp2Yv8Xc4Bn6Mj0Lr5Hs1Z";

function setupTestIngress() {
  process.env.PAYMENT_ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY).toString("hex");

  const connectionRepo = new PaymentConnectionRepository();
  const eventRepo = new WebhookEventRepository();
  const transactionRepo = new PaymentTransactionRepository();
  const processor = new WebhookEventProcessorService(
    transactionRepo,
    eventRepo,
  );
  const service = new WebhookIngressService(
    connectionRepo,
    eventRepo,
    processor,
  );

  return { connectionRepo, eventRepo, transactionRepo, processor, service };
}

function createStripeConnection(
  connectionRepo: PaymentConnectionRepository,
  tenantId: string,
  webhookSecret: string,
) {
  const encrypted = encryptCredentials({
    publishableKey: "pk_test_123",
    secretKey: "sk_test_456",
    webhookSecret,
  });

  connectionRepo.createConnection(tenantId, {
    provider: "stripe",
    displayName: "Stripe Test",
    status: "active",
    mode: "sandbox",
    encryptedCredentials: encrypted.ciphertext,
    credentialsIv: encrypted.iv,
    credentialsTag: encrypted.tag,
  });
}

function createSquareConnection(
  connectionRepo: PaymentConnectionRepository,
  tenantId: string,
  signatureKey: string,
) {
  const encrypted = encryptCredentials({
    applicationId: "sq_app_123",
    accessToken: "sq_token_456",
    locationId: "sq_loc_789",
    signatureKey,
  });

  connectionRepo.createConnection(tenantId, {
    provider: "square",
    displayName: "Square Test",
    status: "active",
    mode: "sandbox",
    encryptedCredentials: encrypted.ciphertext,
    credentialsIv: encrypted.iv,
    credentialsTag: encrypted.tag,
  });
}

function makeStripeSignature(
  payload: string,
  secret: string,
  timestamp: number,
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const sig = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

function makeSquareSignature(
  payload: string,
  signatureKey: string,
  notificationUrl: string,
): string {
  return createHmac("sha256", signatureKey)
    .update(`${notificationUrl}${payload}`)
    .digest("base64");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WebhookIngressService", () => {
  const nowSeconds = 1700000000;

  describe("handleWebhook — Stripe", () => {
    const webhookSecret = "whsec_ingress_test_stripe";
    const stripePayload = JSON.stringify({
      id: "evt_ingress_001",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_stripe_ingress_001",
          amount: 3000,
          metadata: {},
        },
      },
    });

    it("accepts valid Stripe webhook and stores event", async () => {
      const { connectionRepo, eventRepo, service } = setupTestIngress();
      createStripeConnection(connectionRepo, "tenant-1", webhookSecret);

      const signature = makeStripeSignature(
        stripePayload,
        webhookSecret,
        nowSeconds,
      );

      const result = await service.handleWebhook({
        provider: "stripe",
        rawBody: stripePayload,
        signatureHeader: signature,
        tenantId: "tenant-1",
        nowSeconds,
      });

      expect(result.accepted).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(result.duplicate).toBe(false);

      // Verify event was stored
      const events = eventRepo.listEvents();
      expect(events.length).toBe(1);
      expect(events[0].provider).toBe("stripe");
      expect(events[0].eventType).toBe("payment_intent.succeeded");
      expect(events[0].rawPayload).toBe(stripePayload);
    });

    it("rejects invalid Stripe signature", async () => {
      const { connectionRepo, service } = setupTestIngress();
      createStripeConnection(connectionRepo, "tenant-1", webhookSecret);

      const result = await service.handleWebhook({
        provider: "stripe",
        rawBody: stripePayload,
        signatureHeader: "t=1,v1=invalid_signature",
        tenantId: "tenant-1",
        nowSeconds,
      });

      expect(result.accepted).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("detects duplicate webhook delivery", async () => {
      const { connectionRepo, service } = setupTestIngress();
      createStripeConnection(connectionRepo, "tenant-1", webhookSecret);

      const signature = makeStripeSignature(
        stripePayload,
        webhookSecret,
        nowSeconds,
      );

      // First delivery
      const first = await service.handleWebhook({
        provider: "stripe",
        rawBody: stripePayload,
        signatureHeader: signature,
        tenantId: "tenant-1",
        nowSeconds,
      });
      expect(first.accepted).toBe(true);
      expect(first.duplicate).toBe(false);

      // Second delivery (duplicate)
      const second = await service.handleWebhook({
        provider: "stripe",
        rawBody: stripePayload,
        signatureHeader: signature,
        tenantId: "tenant-1",
        nowSeconds,
      });
      expect(second.accepted).toBe(true);
      expect(second.duplicate).toBe(true);
      expect(second.eventId).toBeNull();
    });

    it("returns 200 immediately even if processing fails", async () => {
      const { connectionRepo, eventRepo, service } = setupTestIngress();
      createStripeConnection(connectionRepo, "tenant-1", webhookSecret);

      // No transaction exists, so processing will fail
      const signature = makeStripeSignature(
        stripePayload,
        webhookSecret,
        nowSeconds,
      );

      const result = await service.handleWebhook({
        provider: "stripe",
        rawBody: stripePayload,
        signatureHeader: signature,
        tenantId: "tenant-1",
        nowSeconds,
      });

      // Still accepted (stored for retry)
      expect(result.accepted).toBe(true);
      expect(result.eventId).toBeDefined();

      // Event stored even though processing failed
      const events = eventRepo.listEvents();
      expect(events.length).toBe(1);
    });

    it("rejects webhook when no connection found", async () => {
      const { service } = setupTestIngress();

      const result = await service.handleWebhook({
        provider: "stripe",
        rawBody: stripePayload,
        signatureHeader: "t=1,v1=abc",
        tenantId: "tenant-nonexistent",
        nowSeconds,
      });

      expect(result.accepted).toBe(false);
      expect(result.error).toContain("No payment connection found");
    });
  });

  describe("handleWebhook — Square", () => {
    const signatureKey = "sq_sig_ingress_test";
    const notificationUrl = "https://api.example.com/webhooks/square";
    const squarePayload = JSON.stringify({
      event_id: "sq_evt_ingress_001",
      type: "payment.completed",
      data: {
        object: {
          payment: {
            id: "sq_pay_ingress_001",
          },
        },
      },
    });

    it("accepts valid Square webhook and stores event", async () => {
      const { connectionRepo, eventRepo, service } = setupTestIngress();
      createSquareConnection(connectionRepo, "tenant-2", signatureKey);

      const signature = makeSquareSignature(
        squarePayload,
        signatureKey,
        notificationUrl,
      );

      const result = await service.handleWebhook({
        provider: "square",
        rawBody: squarePayload,
        signatureHeader: signature,
        tenantId: "tenant-2",
        notificationUrl,
      });

      expect(result.accepted).toBe(true);
      expect(result.eventId).toBeDefined();

      const events = eventRepo.listEvents();
      expect(events.length).toBe(1);
      expect(events[0].provider).toBe("square");
    });

    it("rejects invalid Square signature", async () => {
      const { connectionRepo, service } = setupTestIngress();
      createSquareConnection(connectionRepo, "tenant-2", signatureKey);

      const result = await service.handleWebhook({
        provider: "square",
        rawBody: squarePayload,
        signatureHeader: "invalid_base64_sig",
        tenantId: "tenant-2",
        notificationUrl,
      });

      expect(result.accepted).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("handleWebhook — end-to-end processing", () => {
    const webhookSecret = "whsec_e2e_test";

    it("processes webhook and updates transaction state", async () => {
      const { connectionRepo, transactionRepo, service } = setupTestIngress();
      createStripeConnection(connectionRepo, "tenant-1", webhookSecret);

      // Create a transaction awaiting capture
      transactionRepo.createTransaction("tenant-1", {
        connectionId: "pconn-1",
        provider: "stripe",
        status: "authorized",
        referenceType: "order",
        referenceId: "order-e2e-1",
        amountCents: 4200,
        currency: "usd",
        tipAmountCents: 0,
        providerTransactionId: "pi_stripe_e2e_001",
        idempotencyKey: "idem-e2e-1",
        metadata: {},
      });

      const payload = JSON.stringify({
        id: "evt_e2e_001",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_stripe_e2e_001",
            amount: 4200,
            metadata: {},
          },
        },
      });

      const signature = makeStripeSignature(payload, webhookSecret, nowSeconds);

      const result = await service.handleWebhook({
        provider: "stripe",
        rawBody: payload,
        signatureHeader: signature,
        tenantId: "tenant-1",
        nowSeconds,
      });

      expect(result.accepted).toBe(true);

      // Verify transaction updated
      const txn = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(txn.status).toBe("captured");
      expect(txn.capturedAmountCents).toBe(4200);
    });

    it("duplicate webhook does not create duplicate side effects", async () => {
      const { connectionRepo, transactionRepo, service } = setupTestIngress();
      createStripeConnection(connectionRepo, "tenant-1", webhookSecret);

      transactionRepo.createTransaction("tenant-1", {
        connectionId: "pconn-1",
        provider: "stripe",
        status: "authorized",
        referenceType: "order",
        referenceId: "order-dup-1",
        amountCents: 2500,
        currency: "usd",
        tipAmountCents: 0,
        providerTransactionId: "pi_stripe_dup_001",
        idempotencyKey: "idem-dup-1",
        metadata: {},
      });

      const payload = JSON.stringify({
        id: "evt_dup_e2e_001",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_stripe_dup_001",
            amount: 2500,
            metadata: {},
          },
        },
      });

      const signature = makeStripeSignature(payload, webhookSecret, nowSeconds);

      // First delivery
      await service.handleWebhook({
        provider: "stripe",
        rawBody: payload,
        signatureHeader: signature,
        tenantId: "tenant-1",
        nowSeconds,
      });

      // Second delivery (duplicate)
      const secondResult = await service.handleWebhook({
        provider: "stripe",
        rawBody: payload,
        signatureHeader: signature,
        tenantId: "tenant-1",
        nowSeconds,
      });

      expect(secondResult.duplicate).toBe(true);

      // Transaction should be captured only once
      const txn = transactionRepo.listTransactionsByTenant("tenant-1")[0];
      expect(txn.status).toBe("captured");

      // Only one audit event
      const auditEvents = transactionRepo.getAuditEventsByTransaction(txn.id);
      expect(auditEvents.length).toBe(1);
    });
  });
});
