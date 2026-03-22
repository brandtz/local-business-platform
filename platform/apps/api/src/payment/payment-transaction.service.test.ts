// E8-S2-T2: Tests for payment transaction orchestration service.
// E8-S2-T4: Tests for refund audit events.
// E8-S2-T5: Tests for multi-processor routing.
// E8-S2-T6: Tests for failover behavior.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import type { PaymentAuditEvent } from "@platform/types";
import {
  isValidPaymentTransactionTransition,
  paymentTransactionStatuses,
} from "@platform/types";

import {
  PaymentTransactionService,
  PaymentTransactionNotFoundError,
  PaymentTransactionTransitionError,
  PaymentTransactionValidationError,
  PaymentProcessorError,
  getFailoverEventLog,
  clearFailoverEventLog,
} from "./payment-transaction.service";
import { PaymentTransactionRepository } from "./payment-transaction.repository";
import { PaymentConnectionRepository } from "./payment-connection.repository";
import { encryptCredentials } from "./credential-encryption.service";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function setupEncryptionKey(): void {
  process.env.PAYMENT_ENCRYPTION_KEY = randomBytes(32).toString("hex");
}

function createConnectionRepo(): PaymentConnectionRepository {
  const repo = new PaymentConnectionRepository();
  return repo;
}

function addStripeConnection(
  repo: PaymentConnectionRepository,
  tenantId: string,
): string {
  const encrypted = encryptCredentials({
    publishableKey: "pk_test_abc",
    secretKey: "sk_test_xyz",
  });
  const conn = repo.createConnection(tenantId, {
    provider: "stripe",
    displayName: "Stripe Test",
    status: "active",
    mode: "sandbox",
    encryptedCredentials: encrypted.ciphertext,
    credentialsIv: encrypted.iv,
    credentialsTag: encrypted.tag,
  });
  repo.updateConnectionStatus(conn.id, "active", {
    lastVerifiedAt: new Date().toISOString(),
  });
  return conn.id;
}

function addSquareConnection(
  repo: PaymentConnectionRepository,
  tenantId: string,
): string {
  const encrypted = encryptCredentials({
    applicationId: "sq-app-test",
    accessToken: "sq-token-test",
    locationId: "sq-loc-test",
  });
  const conn = repo.createConnection(tenantId, {
    provider: "square",
    displayName: "Square Test",
    status: "active",
    mode: "sandbox",
    encryptedCredentials: encrypted.ciphertext,
    credentialsIv: encrypted.iv,
    credentialsTag: encrypted.tag,
  });
  repo.updateConnectionStatus(conn.id, "active", {
    lastVerifiedAt: new Date().toISOString(),
  });
  return conn.id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PaymentTransactionService", () => {
  let connectionRepo: PaymentConnectionRepository;
  let transactionRepo: PaymentTransactionRepository;
  let service: PaymentTransactionService;
  const tenantId = "tenant-1";

  beforeEach(() => {
    setupEncryptionKey();
    connectionRepo = createConnectionRepo();
    transactionRepo = new PaymentTransactionRepository();
    service = new PaymentTransactionService(
      transactionRepo,
      connectionRepo,
    );
    addStripeConnection(connectionRepo, tenantId);
    clearFailoverEventLog();
  });

  afterEach(() => {
    delete process.env.PAYMENT_ENCRYPTION_KEY;
  });

  // -----------------------------------------------------------------------
  // Transaction state machine (types)
  // -----------------------------------------------------------------------

  describe("transaction state machine", () => {
    it("should define all expected transaction statuses", () => {
      expect(paymentTransactionStatuses).toContain("created");
      expect(paymentTransactionStatuses).toContain("authorized");
      expect(paymentTransactionStatuses).toContain("captured");
      expect(paymentTransactionStatuses).toContain("voided");
      expect(paymentTransactionStatuses).toContain("refunded");
      expect(paymentTransactionStatuses).toContain("partially_refunded");
      expect(paymentTransactionStatuses).toContain("failed");
    });

    it("should allow created → authorized", () => {
      expect(isValidPaymentTransactionTransition("created", "authorized")).toBe(
        true,
      );
    });

    it("should allow authorized → captured", () => {
      expect(
        isValidPaymentTransactionTransition("authorized", "captured"),
      ).toBe(true);
    });

    it("should allow authorized → voided", () => {
      expect(
        isValidPaymentTransactionTransition("authorized", "voided"),
      ).toBe(true);
    });

    it("should allow captured → refunded", () => {
      expect(
        isValidPaymentTransactionTransition("captured", "refunded"),
      ).toBe(true);
    });

    it("should allow captured → partially_refunded", () => {
      expect(
        isValidPaymentTransactionTransition("captured", "partially_refunded"),
      ).toBe(true);
    });

    it("should allow partially_refunded → refunded", () => {
      expect(
        isValidPaymentTransactionTransition("partially_refunded", "refunded"),
      ).toBe(true);
    });

    it("should not allow direct created → captured", () => {
      expect(
        isValidPaymentTransactionTransition("created", "captured"),
      ).toBe(false);
    });

    it("should not allow refunded → captured", () => {
      expect(
        isValidPaymentTransactionTransition("refunded", "captured"),
      ).toBe(false);
    });

    it("should not allow voided → any transition", () => {
      expect(
        isValidPaymentTransactionTransition("voided", "captured"),
      ).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Create payment intent (E8-S2-T2)
  // -----------------------------------------------------------------------

  describe("createPaymentIntent", () => {
    it("should create a payment intent with authorized status", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-1",
        amountCents: 5000,
        currency: "usd",
        tipAmountCents: 500,
        idempotencyKey: "intent-1",
      });

      expect(txn.status).toBe("authorized");
      expect(txn.amountCents).toBe(5000);
      expect(txn.tipAmountCents).toBe(500);
      expect(txn.referenceType).toBe("order");
      expect(txn.referenceId).toBe("order-1");
      expect(txn.providerTransactionId).toBeTruthy();
      expect(txn.provider).toBe("stripe");
    });

    it("should be idempotent — duplicate key returns existing transaction", async () => {
      const txn1 = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-2",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "idem-key-1",
      });

      const txn2 = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-2",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "idem-key-1",
      });

      expect(txn2.id).toBe(txn1.id);
    });

    it("should reject zero amount", async () => {
      await expect(
        service.createPaymentIntent({
          tenantId,
          referenceType: "order",
          referenceId: "order-3",
          amountCents: 0,
          currency: "usd",
          idempotencyKey: "intent-zero",
        }),
      ).rejects.toThrow(PaymentTransactionValidationError);
    });

    it("should reject negative amount", async () => {
      await expect(
        service.createPaymentIntent({
          tenantId,
          referenceType: "order",
          referenceId: "order-4",
          amountCents: -100,
          currency: "usd",
          idempotencyKey: "intent-negative",
        }),
      ).rejects.toThrow(PaymentTransactionValidationError);
    });

    it("should throw when no active connection exists", async () => {
      const emptyConnectionRepo = new PaymentConnectionRepository();
      const svc = new PaymentTransactionService(
        transactionRepo,
        emptyConnectionRepo,
      );

      await expect(
        svc.createPaymentIntent({
          tenantId: "tenant-no-conn",
          referenceType: "order",
          referenceId: "order-5",
          amountCents: 1000,
          currency: "usd",
          idempotencyKey: "intent-no-conn",
        }),
      ).rejects.toThrow(PaymentProcessorError);
    });

    it("should emit intent_created audit event", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-audit-1",
        amountCents: 2000,
        currency: "usd",
        idempotencyKey: "intent-audit-1",
      });

      const detail = service.getTransactionDetail(tenantId, txn.id);
      const intentEvents = detail.auditEvents.filter(
        (e: PaymentAuditEvent) => e.action === "intent_created",
      );
      expect(intentEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // Capture payment (E8-S2-T2)
  // -----------------------------------------------------------------------

  describe("capturePayment", () => {
    it("should capture an authorized payment", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-cap-1",
        amountCents: 5000,
        currency: "usd",
        idempotencyKey: "cap-intent-1",
      });

      const captured = await service.capturePayment({
        tenantId,
        transactionId: txn.id,
      });

      expect(captured.status).toBe("captured");
      expect(captured.capturedAmountCents).toBe(5000);
    });

    it("should reject capture from invalid state (voided)", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-cap-2",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "cap-intent-2",
      });

      await service.voidPayment(tenantId, txn.id);

      await expect(
        service.capturePayment({ tenantId, transactionId: txn.id }),
      ).rejects.toThrow(PaymentTransactionTransitionError);
    });

    it("should emit captured audit event", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-cap-audit-1",
        amountCents: 4000,
        currency: "usd",
        idempotencyKey: "cap-audit-1",
      });

      const captured = await service.capturePayment({
        tenantId,
        transactionId: txn.id,
      });

      const detail = service.getTransactionDetail(tenantId, captured.id);
      const captureEvents = detail.auditEvents.filter(
        (e: PaymentAuditEvent) => e.action === "captured",
      );
      expect(captureEvents.length).toBe(1);
    });

    it("should throw for non-existent transaction", async () => {
      await expect(
        service.capturePayment({
          tenantId,
          transactionId: "non-existent",
        }),
      ).rejects.toThrow(PaymentTransactionNotFoundError);
    });
  });

  // -----------------------------------------------------------------------
  // Void payment (E8-S2-T2)
  // -----------------------------------------------------------------------

  describe("voidPayment", () => {
    it("should void an authorized payment", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-void-1",
        amountCents: 2500,
        currency: "usd",
        idempotencyKey: "void-intent-1",
      });

      const voided = await service.voidPayment(tenantId, txn.id);
      expect(voided.status).toBe("voided");
    });

    it("should reject void from captured state", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-void-2",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "void-intent-2",
      });

      await service.capturePayment({ tenantId, transactionId: txn.id });

      await expect(service.voidPayment(tenantId, txn.id)).rejects.toThrow(
        PaymentTransactionTransitionError,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Process refund (E8-S2-T2 + E8-S2-T4)
  // -----------------------------------------------------------------------

  describe("processRefund", () => {
    it("should process a full refund on a captured payment", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-refund-1",
        amountCents: 5000,
        currency: "usd",
        idempotencyKey: "refund-intent-1",
      });
      await service.capturePayment({ tenantId, transactionId: txn.id });

      const refunded = await service.processRefund({
        tenantId,
        transactionId: txn.id,
        amountCents: 5000,
        reason: "Customer request",
        actorId: "admin-1",
        idempotencyKey: "refund-key-1",
      });

      expect(refunded.status).toBe("refunded");
      expect(refunded.refundedAmountCents).toBe(5000);
    });

    it("should process a partial refund", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-refund-2",
        amountCents: 5000,
        currency: "usd",
        idempotencyKey: "refund-intent-2",
      });
      await service.capturePayment({ tenantId, transactionId: txn.id });

      const refunded = await service.processRefund({
        tenantId,
        transactionId: txn.id,
        amountCents: 2000,
        reason: "Partial return",
        actorId: "admin-1",
        idempotencyKey: "partial-refund-1",
      });

      expect(refunded.status).toBe("partially_refunded");
      expect(refunded.refundedAmountCents).toBe(2000);
    });

    it("should support multiple partial refunds up to full amount", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-refund-3",
        amountCents: 5000,
        currency: "usd",
        idempotencyKey: "refund-intent-3",
      });
      await service.capturePayment({ tenantId, transactionId: txn.id });

      // First partial refund
      const partial = await service.processRefund({
        tenantId,
        transactionId: txn.id,
        amountCents: 2000,
        reason: "Partial return 1",
        actorId: "admin-1",
        idempotencyKey: "multi-refund-1",
      });
      expect(partial.status).toBe("partially_refunded");
      expect(partial.refundedAmountCents).toBe(2000);

      // Second refund — remaining amount
      const full = await service.processRefund({
        tenantId,
        transactionId: txn.id,
        amountCents: 3000,
        reason: "Partial return 2",
        actorId: "admin-1",
        idempotencyKey: "multi-refund-2",
      });
      expect(full.status).toBe("refunded");
      expect(full.refundedAmountCents).toBe(5000);
    });

    it("should reject refund exceeding remaining captured amount", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-refund-4",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "refund-intent-4",
      });
      await service.capturePayment({ tenantId, transactionId: txn.id });

      await expect(
        service.processRefund({
          tenantId,
          transactionId: txn.id,
          amountCents: 5000,
          reason: "Over-refund attempt",
          actorId: "admin-1",
          idempotencyKey: "over-refund-1",
        }),
      ).rejects.toThrow(PaymentTransactionValidationError);
    });

    it("should reject refund on uncaptured transaction", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-refund-5",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "refund-intent-5",
      });

      // Authorized transaction has 0 captured amount, so both amount and state checks reject
      await expect(
        service.processRefund({
          tenantId,
          transactionId: txn.id,
          amountCents: 3000,
          reason: "Early refund",
          actorId: "admin-1",
          idempotencyKey: "early-refund-1",
        }),
      ).rejects.toThrow("exceeds remaining captured amount");
    });

    it("should reject refund without actor ID", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-refund-6",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "refund-intent-6",
      });
      await service.capturePayment({ tenantId, transactionId: txn.id });

      await expect(
        service.processRefund({
          tenantId,
          transactionId: txn.id,
          amountCents: 3000,
          reason: "No actor",
          actorId: "",
          idempotencyKey: "no-actor-1",
        }),
      ).rejects.toThrow(PaymentTransactionValidationError);
    });

    it("should reject refund without reason", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-refund-7",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "refund-intent-7",
      });
      await service.capturePayment({ tenantId, transactionId: txn.id });

      await expect(
        service.processRefund({
          tenantId,
          transactionId: txn.id,
          amountCents: 3000,
          reason: "",
          actorId: "admin-1",
          idempotencyKey: "no-reason-1",
        }),
      ).rejects.toThrow(PaymentTransactionValidationError);
    });

    // SECURITY: Refund audit events
    it("should emit refund_initiated and refund_completed audit events with actor and reason", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-refund-audit-1",
        amountCents: 4000,
        currency: "usd",
        idempotencyKey: "refund-audit-intent-1",
      });
      await service.capturePayment({ tenantId, transactionId: txn.id });

      await service.processRefund({
        tenantId,
        transactionId: txn.id,
        amountCents: 2000,
        reason: "Damaged item",
        actorId: "admin-actor-1",
        idempotencyKey: "audit-refund-1",
      });

      const detail = service.getTransactionDetail(tenantId, txn.id);
      const initiatedEvents = detail.auditEvents.filter(
        (e: PaymentAuditEvent) => e.action === "refund_initiated",
      );
      const completedEvents = detail.auditEvents.filter(
        (e: PaymentAuditEvent) => e.action === "refund_completed",
      );

      expect(initiatedEvents.length).toBe(1);
      expect(initiatedEvents[0].actorId).toBe("admin-actor-1");
      expect(initiatedEvents[0].reason).toBe("Damaged item");
      expect(initiatedEvents[0].amountCents).toBe(2000);

      expect(completedEvents.length).toBe(1);
      expect(completedEvents[0].actorId).toBe("admin-actor-1");
      expect(completedEvents[0].reason).toBe("Damaged item");
    });
  });

  // -----------------------------------------------------------------------
  // Multi-processor routing (E8-S2-T5)
  // -----------------------------------------------------------------------

  describe("multi-processor routing", () => {
    it("should use primary provider from routing config", async () => {
      addSquareConnection(connectionRepo, tenantId);
      service.setRoutingConfig({
        tenantId,
        primaryProvider: "square",
        failoverEnabled: false,
      });

      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-route-1",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "route-1",
      });

      expect(txn.provider).toBe("square");
    });

    it("should fall back to first active connection when no routing config", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-route-2",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "route-2",
      });

      expect(txn.provider).toBe("stripe");
    });

    it("should resolve routing config", () => {
      service.setRoutingConfig({
        tenantId,
        primaryProvider: "stripe",
        failoverEnabled: true,
      });

      const config = service.getRoutingConfig(tenantId);
      expect(config).not.toBeNull();
      expect(config!.primaryProvider).toBe("stripe");
      expect(config!.failoverEnabled).toBe(true);
    });

    it("should return null for non-existent routing config", () => {
      expect(service.getRoutingConfig("unknown-tenant")).toBeNull();
    });

    it("should ensure refund routes to original processor", async () => {
      addSquareConnection(connectionRepo, tenantId);
      service.setRoutingConfig({
        tenantId,
        primaryProvider: "stripe",
        failoverEnabled: false,
      });

      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-route-refund",
        amountCents: 5000,
        currency: "usd",
        idempotencyKey: "route-refund-1",
      });
      expect(txn.provider).toBe("stripe");

      await service.capturePayment({ tenantId, transactionId: txn.id });

      // Change routing config to Square
      service.setRoutingConfig({
        tenantId,
        primaryProvider: "square",
        failoverEnabled: false,
      });

      // Refund should still go to original processor (Stripe)
      const refunded = await service.processRefund({
        tenantId,
        transactionId: txn.id,
        amountCents: 5000,
        reason: "Routing test",
        actorId: "admin-1",
        idempotencyKey: "route-refund-key-1",
      });
      expect(refunded.status).toBe("refunded");
      // Verify provider didn't change
      expect(refunded.provider).toBe("stripe");
    });
  });

  // -----------------------------------------------------------------------
  // Failover behavior (E8-S2-T6)
  // -----------------------------------------------------------------------

  describe("failover behavior", () => {
    it("should failover to secondary processor when primary fails and failover is enabled", async () => {
      // Create a broken connection repo where stripe credentials are bad
      const failoverConnRepo = new PaymentConnectionRepository();

      // Add a stripe connection with invalid credentials (will fail verification at adapter)
      const badEncrypted = encryptCredentials({
        publishableKey: "bad_key",
        secretKey: "bad_secret",
      });
      failoverConnRepo.createConnection(tenantId, {
        provider: "stripe",
        displayName: "Bad Stripe",
        status: "active",
        mode: "sandbox",
        encryptedCredentials: badEncrypted.ciphertext,
        credentialsIv: badEncrypted.iv,
        credentialsTag: badEncrypted.tag,
      });
      failoverConnRepo.updateConnectionStatus(
        failoverConnRepo.listConnectionsByTenant(tenantId)[0].id,
        "active",
      );

      // Add a working Square connection
      addSquareConnection(failoverConnRepo, tenantId);

      const failoverService = new PaymentTransactionService(
        new PaymentTransactionRepository(),
        failoverConnRepo,
      );
      failoverService.setRoutingConfig({
        tenantId,
        primaryProvider: "stripe",
        failoverEnabled: true,
      });

      const txn = await failoverService.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-failover-1",
        amountCents: 4000,
        currency: "usd",
        idempotencyKey: "failover-1",
      });

      expect(txn.provider).toBe("square");
      expect(txn.status).toBe("authorized");

      // Verify failover event was logged
      const events = getFailoverEventLog();
      expect(events.length).toBeGreaterThanOrEqual(1);
      const lastEvent = events[events.length - 1];
      expect(lastEvent.primaryProvider).toBe("stripe");
      expect(lastEvent.failoverProvider).toBe("square");
      expect(lastEvent.tenantId).toBe(tenantId);
    });

    it("should fail when primary fails and failover is disabled", async () => {
      const failoverConnRepo = new PaymentConnectionRepository();

      const badEncrypted = encryptCredentials({
        publishableKey: "bad_key",
        secretKey: "bad_secret",
      });
      failoverConnRepo.createConnection(tenantId, {
        provider: "stripe",
        displayName: "Bad Stripe",
        status: "active",
        mode: "sandbox",
        encryptedCredentials: badEncrypted.ciphertext,
        credentialsIv: badEncrypted.iv,
        credentialsTag: badEncrypted.tag,
      });
      failoverConnRepo.updateConnectionStatus(
        failoverConnRepo.listConnectionsByTenant(tenantId)[0].id,
        "active",
      );

      addSquareConnection(failoverConnRepo, tenantId);

      const noFailoverService = new PaymentTransactionService(
        new PaymentTransactionRepository(),
        failoverConnRepo,
      );
      noFailoverService.setRoutingConfig({
        tenantId,
        primaryProvider: "stripe",
        failoverEnabled: false,
      });

      const txn = await noFailoverService.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-no-failover-1",
        amountCents: 4000,
        currency: "usd",
        idempotencyKey: "no-failover-1",
      });

      expect(txn.status).toBe("failed");
    });

    it("should log failure event for E8-S6 alert pipeline on failover", async () => {
      clearFailoverEventLog();

      const failoverConnRepo = new PaymentConnectionRepository();
      const badEncrypted = encryptCredentials({
        publishableKey: "bad_key",
        secretKey: "bad_secret",
      });
      failoverConnRepo.createConnection(tenantId, {
        provider: "stripe",
        displayName: "Bad Stripe",
        status: "active",
        mode: "sandbox",
        encryptedCredentials: badEncrypted.ciphertext,
        credentialsIv: badEncrypted.iv,
        credentialsTag: badEncrypted.tag,
      });
      failoverConnRepo.updateConnectionStatus(
        failoverConnRepo.listConnectionsByTenant(tenantId)[0].id,
        "active",
      );
      addSquareConnection(failoverConnRepo, tenantId);

      const failoverService = new PaymentTransactionService(
        new PaymentTransactionRepository(),
        failoverConnRepo,
      );
      failoverService.setRoutingConfig({
        tenantId,
        primaryProvider: "stripe",
        failoverEnabled: true,
      });

      await failoverService.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-failover-log-1",
        amountCents: 2000,
        currency: "usd",
        idempotencyKey: "failover-log-1",
      });

      const events = getFailoverEventLog();
      expect(events.length).toBe(1);
      expect(events[0].primaryProvider).toBe("stripe");
      expect(events[0].failoverProvider).toBe("square");
      expect(events[0].primaryError).toBeDefined();
      expect(events[0].referenceType).toBe("order");
      expect(events[0].referenceId).toBe("order-failover-log-1");
    });
  });

  // -----------------------------------------------------------------------
  // Admin query methods (E8-S2-T4)
  // -----------------------------------------------------------------------

  describe("admin queries", () => {
    it("should list transactions for a tenant", async () => {
      await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-list-1",
        amountCents: 2000,
        currency: "usd",
        idempotencyKey: "list-1",
      });
      await service.createPaymentIntent({
        tenantId,
        referenceType: "booking",
        referenceId: "booking-list-1",
        amountCents: 1500,
        currency: "usd",
        idempotencyKey: "list-2",
      });

      const all = service.listTransactions(tenantId);
      expect(all.length).toBe(2);
    });

    it("should filter transactions by reference type", async () => {
      await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-filter-1",
        amountCents: 2000,
        currency: "usd",
        idempotencyKey: "filter-1",
      });
      await service.createPaymentIntent({
        tenantId,
        referenceType: "booking",
        referenceId: "booking-filter-1",
        amountCents: 1500,
        currency: "usd",
        idempotencyKey: "filter-2",
      });

      const orders = service.listTransactions(tenantId, {
        referenceType: "order",
      });
      expect(orders.length).toBe(1);
      expect(orders[0].referenceType).toBe("order");
    });

    it("should get transaction detail with audit events", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-detail-1",
        amountCents: 3000,
        currency: "usd",
        idempotencyKey: "detail-1",
      });

      const detail = service.getTransactionDetail(tenantId, txn.id);
      expect(detail.id).toBe(txn.id);
      expect(detail.auditEvents).toBeDefined();
      expect(detail.auditEvents.length).toBeGreaterThanOrEqual(1);
    });

    it("should throw for non-existent transaction detail", () => {
      expect(() =>
        service.getTransactionDetail(tenantId, "non-existent"),
      ).toThrow(PaymentTransactionNotFoundError);
    });

    it("should not include credentials in transaction summary", async () => {
      await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-no-secrets",
        amountCents: 2000,
        currency: "usd",
        idempotencyKey: "no-secrets-1",
      });

      const summaries = service.listTransactions(tenantId);
      const json = JSON.stringify(summaries);
      expect(json).not.toContain("encryptedCredentials");
      expect(json).not.toContain("credentialsIv");
      expect(json).not.toContain("credentialsTag");
      expect(json).not.toContain("secretKey");
      expect(json).not.toContain("accessToken");
    });
  });

  // -----------------------------------------------------------------------
  // Tenant isolation
  // -----------------------------------------------------------------------

  describe("tenant isolation", () => {
    it("should not find transactions from another tenant", async () => {
      await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-iso-1",
        amountCents: 2000,
        currency: "usd",
        idempotencyKey: "iso-1",
      });

      const otherTenantTxns = service.listTransactions("other-tenant");
      expect(otherTenantTxns.length).toBe(0);
    });

    it("should throw when accessing transaction from wrong tenant", async () => {
      const txn = await service.createPaymentIntent({
        tenantId,
        referenceType: "order",
        referenceId: "order-iso-2",
        amountCents: 2000,
        currency: "usd",
        idempotencyKey: "iso-2",
      });

      expect(() =>
        service.getTransactionDetail("other-tenant", txn.id),
      ).toThrow(PaymentTransactionNotFoundError);
    });
  });
});
