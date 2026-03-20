# Epic 8 Technical Task Plan

## E8-S1 Payment Connection Management

Technical Tasks:
- E8-S1-T1: finalize schema and secret-storage contract for tenant payment connections
- E8-S1-T2: implement payment-connection setup, verification, and status-check services
- E8-S1-T3: define tenant-admin APIs and forms for creating and managing gateway connections
- E8-S1-T4: expose sanitized connection-health read models for tenant and platform views

Test Requirements:
- integration: payment connections persist securely and remain tenant-scoped
- API contract: secret-bearing inputs are validated and never echoed back unsafely
- security test: health and status views expose connection state without revealing sensitive values

Handoff Focus:
- encrypted config contract, provider-neutral connection status model, and secret-handling rules

## E8-S2 Payment Intent, Capture, and Refund Abstraction

> **Design-Alignment Notes (from wireframe review):**
> The admin settings page shows Stripe (connected/active, green) and Square (available to connect) — implying tenants can have multiple payment processors configured. The checkout shows a payment method selector. This means the abstraction layer must support: routing capture to the correct active processor, handling refunds to the original capture processor, and failover behavior when the primary processor is unavailable. Tip amounts from cart (E7-S1) must flow through the payment intent.

Technical Tasks:
- E8-S2-T1: define provider-neutral payment service interface for checkout, capture, void, and refund behavior — including tip-amount pass-through from cart pricing engine
- E8-S2-T2: implement core payment transaction orchestration and ledger-facing persistence model
- E8-S2-T3: integrate order and booking services with internal payment abstraction points
- E8-S2-T4: implement tenant-admin refund initiation flow with audit requirements — refund must route to the original capture processor automatically
- E8-S2-T5: implement multi-processor routing logic — when a tenant has multiple active processors, determine which to use for capture (primary preference with configuration) and ensure refunds target the correct original processor
- E8-S2-T6: define failover behavior — when primary processor capture fails, attempt secondary if configured; log failure event for E8-S6 alert pipeline

Test Requirements:
- unit: provider-neutral payment service contracts handle success, failure, partial refund, and multi-processor routing scenarios
- integration: order and booking flows create and update payment transactions consistently; refunds route to correct original processor
- audit test: refund actions capture actor, reason, processor used, and resulting state changes

Handoff Focus:
- internal payment interface, multi-processor routing rules, failover behavior, transaction state mapping, tip pass-through, and refund audit contract

## E8-S3 Webhook Ingestion and Replay Safety

Technical Tasks:
- E8-S3-T1: implement webhook ingress endpoints with signature verification and provider routing
- E8-S3-T2: store raw webhook events for replay and idempotent processing
- E8-S3-T3: implement retry-safe event processors that update transactions and domain state
- E8-S3-T4: create operational tooling or read models for webhook failure inspection and replay

Test Requirements:
- unit: webhook signature verification and idempotency-key logic behave correctly
- integration: duplicate webhook delivery does not duplicate side effects
- operational test: failed webhook processing can be replayed safely from stored payloads

Handoff Focus:
- webhook event store contract, idempotency rules, and replay procedure

## E8-S4 Notification Delivery Framework

Technical Tasks:
- E8-S4-T1: define notification event model, template model, and channel abstraction
- E8-S4-T2: implement queue-backed delivery orchestration for email, SMS, and push channels
- E8-S4-T3: create provider adapters and failure-state mapping for initial delivery providers
- E8-S4-T4: expose delivery history and status views for operators where appropriate

Test Requirements:
- unit: notification rendering and channel selection logic cover success and failure cases
- integration: queued notification delivery persists attempts, retries, and final status correctly
- operational test: provider failure or timeout results in visible retry or terminal-failure behavior

Handoff Focus:
- notification event contract, queue semantics, and provider-failure taxonomy

## E8-S5 Domain Activation Integrated with Publish State

Technical Tasks:
- E8-S5-T1: connect domain promotion logic to published-release health and readiness checks
- E8-S5-T2: block activation when publish validation or release health is not green
- E8-S5-T3: define activation rollback behavior when route validation fails post-promotion
- E8-S5-T4: expose activation readiness and denial reasons in platform and tenant views

Test Requirements:
- integration: domain activation consumes current publish state safely
- unit: readiness checks reject invalid activation attempts with explicit reasons
- operational test: failed post-promotion validation restores previous live routing state

Handoff Focus:
- publish-readiness contract, activation denial semantics, and rollback trigger conditions

## E8-S6 Integration Failure Handling and Operational Alerts

Technical Tasks:
- E8-S6-T1: define alert categories and severity levels for payment, webhook, domain, and notification failures
- E8-S6-T2: emit structured operational events from integration modules
- E8-S6-T3: create platform views or feeds for recent integration failures and retry states
- E8-S6-T4: document operator response expectations for common integration incidents

Test Requirements:
- operational test: important integration failures emit visible alerts with actionable context
- integration: retry state and alert metadata remain consistent across modules
- documentation check: operator guidance matches emitted alert categories and recovery actions

Handoff Focus:
- alert taxonomy, structured failure event schema, and operator response mapping

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
