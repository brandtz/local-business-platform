// E8-S2-T3: Order and booking payment integration.
// Integration layer connecting payment orchestration to order checkout and
// booking confirmation flows. Payment failure rolls back to appropriate state.
//
// Order checkout → create payment intent → capture on fulfillment
// Booking confirm → create payment intent → capture after completion
//
// Provider-neutral: calls PaymentTransactionService, never SDK directly.

import { Injectable } from "@nestjs/common";
import type { PaymentTransactionRecord } from "@platform/types";

import { PaymentTransactionService } from "./payment-transaction.service";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class OrderPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderPaymentError";
  }
}

export class BookingPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingPaymentError";
  }
}

// ---------------------------------------------------------------------------
// Order payment integration
// ---------------------------------------------------------------------------

@Injectable()
export class OrderPaymentService {
  constructor(
    private readonly paymentService: PaymentTransactionService,
  ) {}

  /**
   * Creates a payment intent for an order checkout.
   * Called when a customer completes checkout with payment.
   * Returns the authorized transaction record.
   * On failure, the returned record has status 'failed'.
   */
  async createOrderPaymentIntent(params: {
    tenantId: string;
    orderId: string;
    amountCents: number;
    currency: string;
    tipAmountCents?: number;
  }): Promise<PaymentTransactionRecord> {
    const idempotencyKey = `order_intent_${params.orderId}`;

    return this.paymentService.createPaymentIntent({
      tenantId: params.tenantId,
      referenceType: "order",
      referenceId: params.orderId,
      amountCents: params.amountCents,
      currency: params.currency,
      tipAmountCents: params.tipAmountCents ?? 0,
      idempotencyKey,
      metadata: { orderId: params.orderId },
    });
  }

  /**
   * Captures payment for a fulfilled order.
   * Called when the order transitions to a fulfillment state (e.g., ready/completed).
   * Returns the captured transaction record or null if no payment intent exists.
   */
  async captureOrderPayment(params: {
    tenantId: string;
    orderId: string;
  }): Promise<PaymentTransactionRecord | null> {
    const txn = this.paymentService.getTransactionByReference(
      params.tenantId,
      "order",
      params.orderId,
    );
    if (!txn) return null;

    // Only capture if authorized
    if (txn.status !== "authorized") return txn;

    return this.paymentService.capturePayment({
      tenantId: params.tenantId,
      transactionId: txn.id,
    });
  }

  /**
   * Voids an order payment intent (e.g., on cancellation before capture).
   */
  async voidOrderPayment(params: {
    tenantId: string;
    orderId: string;
  }): Promise<PaymentTransactionRecord | null> {
    const txn = this.paymentService.getTransactionByReference(
      params.tenantId,
      "order",
      params.orderId,
    );
    if (!txn) return null;

    // Only void if authorized (not yet captured)
    if (txn.status !== "authorized") return txn;

    return this.paymentService.voidPayment(params.tenantId, txn.id);
  }

  /**
   * Returns the payment transaction for an order, if any.
   */
  getOrderPaymentTransaction(
    tenantId: string,
    orderId: string,
  ): PaymentTransactionRecord | null {
    return this.paymentService.getTransactionByReference(
      tenantId,
      "order",
      orderId,
    );
  }
}

// ---------------------------------------------------------------------------
// Booking payment integration
// ---------------------------------------------------------------------------

@Injectable()
export class BookingPaymentService {
  constructor(
    private readonly paymentService: PaymentTransactionService,
  ) {}

  /**
   * Creates a payment intent for a booking deposit or full prepayment.
   * Called when a booking is confirmed with a required payment.
   */
  async createBookingPaymentIntent(params: {
    tenantId: string;
    bookingId: string;
    amountCents: number;
    currency: string;
  }): Promise<PaymentTransactionRecord> {
    const idempotencyKey = `booking_intent_${params.bookingId}`;

    return this.paymentService.createPaymentIntent({
      tenantId: params.tenantId,
      referenceType: "booking",
      referenceId: params.bookingId,
      amountCents: params.amountCents,
      currency: params.currency,
      tipAmountCents: 0,
      idempotencyKey,
      metadata: { bookingId: params.bookingId },
    });
  }

  /**
   * Captures payment for a completed booking.
   * Called when the booking transitions to 'completed'.
   */
  async captureBookingPayment(params: {
    tenantId: string;
    bookingId: string;
  }): Promise<PaymentTransactionRecord | null> {
    const txn = this.paymentService.getTransactionByReference(
      params.tenantId,
      "booking",
      params.bookingId,
    );
    if (!txn) return null;

    if (txn.status !== "authorized") return txn;

    return this.paymentService.capturePayment({
      tenantId: params.tenantId,
      transactionId: txn.id,
    });
  }

  /**
   * Voids a booking payment intent (e.g., on cancellation before capture).
   */
  async voidBookingPayment(params: {
    tenantId: string;
    bookingId: string;
  }): Promise<PaymentTransactionRecord | null> {
    const txn = this.paymentService.getTransactionByReference(
      params.tenantId,
      "booking",
      params.bookingId,
    );
    if (!txn) return null;

    if (txn.status !== "authorized") return txn;

    return this.paymentService.voidPayment(params.tenantId, txn.id);
  }

  /**
   * Returns the payment transaction for a booking, if any.
   */
  getBookingPaymentTransaction(
    tenantId: string,
    bookingId: string,
  ): PaymentTransactionRecord | null {
    return this.paymentService.getTransactionByReference(
      tenantId,
      "booking",
      bookingId,
    );
  }
}
