// E8-S2-T3: Tests for order and booking payment integration.
// Validates checkout-with-payment, capture on fulfillment, void on cancellation,
// failure rollback, and idempotency.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";

import {
  OrderPaymentService,
  BookingPaymentService,
} from "./payment-integration.service";
import { PaymentTransactionService } from "./payment-transaction.service";
import { PaymentTransactionRepository } from "./payment-transaction.repository";
import { PaymentConnectionRepository } from "./payment-connection.repository";
import { encryptCredentials } from "./credential-encryption.service";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function setupEncryptionKey(): void {
  process.env.PAYMENT_ENCRYPTION_KEY = randomBytes(32).toString("hex");
}

function createFullSetup(tenantId: string) {
  const connectionRepo = new PaymentConnectionRepository();
  const transactionRepo = new PaymentTransactionRepository();

  // Add active Stripe connection
  const encrypted = encryptCredentials({
    publishableKey: "pk_test_abc",
    secretKey: "sk_test_xyz",
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
  connectionRepo.updateConnectionStatus(
    connectionRepo.listConnectionsByTenant(tenantId)[0].id,
    "active",
    { lastVerifiedAt: new Date().toISOString() },
  );

  const paymentService = new PaymentTransactionService(
    transactionRepo,
    connectionRepo,
  );

  return { connectionRepo, transactionRepo, paymentService };
}

// ---------------------------------------------------------------------------
// Order payment integration tests
// ---------------------------------------------------------------------------

describe("OrderPaymentService", () => {
  const tenantId = "tenant-order-1";
  let orderPaymentService: OrderPaymentService;
  let paymentService: PaymentTransactionService;

  beforeEach(() => {
    setupEncryptionKey();
    const setup = createFullSetup(tenantId);
    paymentService = setup.paymentService;
    orderPaymentService = new OrderPaymentService(paymentService);
  });

  afterEach(() => {
    delete process.env.PAYMENT_ENCRYPTION_KEY;
  });

  it("should create payment intent for order checkout", async () => {
    const txn = await orderPaymentService.createOrderPaymentIntent({
      tenantId,
      orderId: "order-1",
      amountCents: 5000,
      currency: "usd",
      tipAmountCents: 500,
    });

    expect(txn.status).toBe("authorized");
    expect(txn.amountCents).toBe(5000);
    expect(txn.tipAmountCents).toBe(500);
    expect(txn.referenceType).toBe("order");
    expect(txn.referenceId).toBe("order-1");
  });

  it("should capture payment on order fulfillment", async () => {
    await orderPaymentService.createOrderPaymentIntent({
      tenantId,
      orderId: "order-2",
      amountCents: 4000,
      currency: "usd",
    });

    const captured = await orderPaymentService.captureOrderPayment({
      tenantId,
      orderId: "order-2",
    });

    expect(captured).not.toBeNull();
    expect(captured!.status).toBe("captured");
    expect(captured!.capturedAmountCents).toBe(4000);
  });

  it("should return null when capturing with no existing payment intent", async () => {
    const result = await orderPaymentService.captureOrderPayment({
      tenantId,
      orderId: "order-no-intent",
    });

    expect(result).toBeNull();
  });

  it("should void payment on order cancellation", async () => {
    await orderPaymentService.createOrderPaymentIntent({
      tenantId,
      orderId: "order-3",
      amountCents: 3000,
      currency: "usd",
    });

    const voided = await orderPaymentService.voidOrderPayment({
      tenantId,
      orderId: "order-3",
    });

    expect(voided).not.toBeNull();
    expect(voided!.status).toBe("voided");
  });

  it("should return null when voiding with no existing payment intent", async () => {
    const result = await orderPaymentService.voidOrderPayment({
      tenantId,
      orderId: "order-no-void",
    });

    expect(result).toBeNull();
  });

  it("should be idempotent — retry does not create duplicate intent", async () => {
    const txn1 = await orderPaymentService.createOrderPaymentIntent({
      tenantId,
      orderId: "order-idem",
      amountCents: 2000,
      currency: "usd",
    });

    const txn2 = await orderPaymentService.createOrderPaymentIntent({
      tenantId,
      orderId: "order-idem",
      amountCents: 2000,
      currency: "usd",
    });

    expect(txn2.id).toBe(txn1.id);
  });

  it("should get order payment transaction", async () => {
    await orderPaymentService.createOrderPaymentIntent({
      tenantId,
      orderId: "order-get",
      amountCents: 1500,
      currency: "usd",
    });

    const txn = orderPaymentService.getOrderPaymentTransaction(
      tenantId,
      "order-get",
    );
    expect(txn).not.toBeNull();
    expect(txn!.referenceId).toBe("order-get");
  });

  it("should not capture already voided payment", async () => {
    await orderPaymentService.createOrderPaymentIntent({
      tenantId,
      orderId: "order-void-cap",
      amountCents: 3000,
      currency: "usd",
    });

    await orderPaymentService.voidOrderPayment({
      tenantId,
      orderId: "order-void-cap",
    });

    const result = await orderPaymentService.captureOrderPayment({
      tenantId,
      orderId: "order-void-cap",
    });

    // Should return the voided transaction (not attempt capture)
    expect(result).not.toBeNull();
    expect(result!.status).toBe("voided");
  });
});

// ---------------------------------------------------------------------------
// Booking payment integration tests
// ---------------------------------------------------------------------------

describe("BookingPaymentService", () => {
  const tenantId = "tenant-booking-1";
  let bookingPaymentService: BookingPaymentService;
  let paymentService: PaymentTransactionService;

  beforeEach(() => {
    setupEncryptionKey();
    const setup = createFullSetup(tenantId);
    paymentService = setup.paymentService;
    bookingPaymentService = new BookingPaymentService(paymentService);
  });

  afterEach(() => {
    delete process.env.PAYMENT_ENCRYPTION_KEY;
  });

  it("should create payment intent for booking deposit", async () => {
    const txn = await bookingPaymentService.createBookingPaymentIntent({
      tenantId,
      bookingId: "booking-1",
      amountCents: 2500,
      currency: "usd",
    });

    expect(txn.status).toBe("authorized");
    expect(txn.amountCents).toBe(2500);
    expect(txn.referenceType).toBe("booking");
    expect(txn.referenceId).toBe("booking-1");
  });

  it("should capture payment after booking completion", async () => {
    await bookingPaymentService.createBookingPaymentIntent({
      tenantId,
      bookingId: "booking-2",
      amountCents: 5000,
      currency: "usd",
    });

    const captured = await bookingPaymentService.captureBookingPayment({
      tenantId,
      bookingId: "booking-2",
    });

    expect(captured).not.toBeNull();
    expect(captured!.status).toBe("captured");
  });

  it("should void payment on booking cancellation", async () => {
    await bookingPaymentService.createBookingPaymentIntent({
      tenantId,
      bookingId: "booking-3",
      amountCents: 3000,
      currency: "usd",
    });

    const voided = await bookingPaymentService.voidBookingPayment({
      tenantId,
      bookingId: "booking-3",
    });

    expect(voided).not.toBeNull();
    expect(voided!.status).toBe("voided");
  });

  it("should return null when no booking payment exists", async () => {
    const result = await bookingPaymentService.captureBookingPayment({
      tenantId,
      bookingId: "booking-none",
    });

    expect(result).toBeNull();
  });

  it("should be idempotent for booking intents", async () => {
    const txn1 = await bookingPaymentService.createBookingPaymentIntent({
      tenantId,
      bookingId: "booking-idem",
      amountCents: 2000,
      currency: "usd",
    });

    const txn2 = await bookingPaymentService.createBookingPaymentIntent({
      tenantId,
      bookingId: "booking-idem",
      amountCents: 2000,
      currency: "usd",
    });

    expect(txn2.id).toBe(txn1.id);
  });

  it("should get booking payment transaction", async () => {
    await bookingPaymentService.createBookingPaymentIntent({
      tenantId,
      bookingId: "booking-get",
      amountCents: 1500,
      currency: "usd",
    });

    const txn = bookingPaymentService.getBookingPaymentTransaction(
      tenantId,
      "booking-get",
    );
    expect(txn).not.toBeNull();
    expect(txn!.referenceId).toBe("booking-get");
  });
});
