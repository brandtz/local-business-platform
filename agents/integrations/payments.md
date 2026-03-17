
# Payments Integration Strategy

## Goals

- support multiple processors through a stable internal abstraction
- separate tenant payment processing from platform billing concerns
- provide secure, auditable handling for payment intents, refunds, disputes, and reconciliation events

## Core Abstraction

Payment adapters must implement a common interface.

- createCheckoutSession()
- createPaymentIntent()
- capturePayment()
- voidPayment()
- refundPayment()
- tokenizePaymentMethod()
- handleWebhook()
- getConnectionStatus()

## Initial Adapters

- Stripe
- Square

## Connection Model

Each tenant can store one or more gateway connections.

- gateway provider
- tenant-owned credentials or connected account references
- operating mode: sandbox or production
- supported payment methods
- connection health and last verification timestamp

## Payment Flows

### Order Flow

- create cart or draft order
- quote totals, taxes, discounts, fees, and tip options
- create payment intent or checkout session
- confirm authorization
- capture immediately or on fulfillment depending on tenant setting
- persist transaction and ledger events

### Booking Flow

- support no-charge reservation, deposit, or full prepayment
- support cancellation windows and refund rules

### Refund Flow

- platform and tenant admins with permission can initiate refunds
- refund reason and acting user are mandatory
- refunds create audit events and sync back from webhook confirmation

## Webhooks

Every provider integration must support webhook ingestion.

- signature verification required
- events must be idempotent
- events stored before processing for replay capability
- failures sent to retry queue and alerting channel

## Security Requirements

- raw secrets encrypted at rest
- least-privilege scopes for gateway credentials
- platform admins can inspect connection health without seeing secret values
- every money movement action is audit logged

## Out of Scope for Adapter Layer

- platform subscription billing logic
- generalized accounting system
- tax nexus determination engine

These may be implemented as adjacent modules but must not leak into provider adapters.
