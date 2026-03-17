
# Epic 8: Payments, Notifications, Domains, and External Integrations

## Objective

Connect the platform to the outside world safely and reliably.

## Scope

- payment gateway abstraction and tenant gateway connections
- webhook ingestion and retry model
- email, SMS, and push notification channels
- custom domain lifecycle and production publish dependencies
- analytics and observability provider hooks

## Deliverables

- Stripe and Square adapters
- notification delivery module with provider abstraction
- webhook event store and replay tooling
- domain activation workflow integrated with publish state

## Acceptance Criteria

- tenant checkouts and refunds work through supported adapters without adapter-specific leakage into core commerce logic
- notification delivery attempts are traceable and retryable
- custom domain promotion only occurs against healthy published configurations
- provider failures degrade gracefully and are observable

## Story Decomposition

### E8-S1: Payment Connection Management

Outcome:
- tenants can create and verify payment gateway connections without exposing provider-specific secrets unsafely

Dependencies:
- Epics 3, 5, and 7

Acceptance Signals:
- payment connections are stored encrypted and tied to the correct tenant
- connection health can be inspected without revealing secret values

### E8-S2: Payment Intent, Capture, and Refund Abstraction

Outcome:
- commerce and booking flows can authorize, capture, and refund payments through a stable internal adapter contract

Dependencies:
- E8-S1
- Epic 7

Acceptance Signals:
- order and booking flows use internal payment service contracts rather than provider SDK calls directly
- refund actions are audited and synchronized from webhook confirmation

### E8-S3: Webhook Ingestion and Replay Safety

Outcome:
- external provider events are received, verified, stored, and processed idempotently

Dependencies:
- E8-S2

Acceptance Signals:
- duplicate webhooks do not duplicate side effects
- failed webhook processing can be retried safely from stored event payloads

### E8-S4: Notification Delivery Framework

Outcome:
- email, SMS, and push events can be queued, rendered, delivered, and observed through a common notification layer

Dependencies:
- Epic 7
- Epic 1

Acceptance Signals:
- notifications can be generated from domain events without hard-coupling to a single provider
- delivery attempts and failures are observable per tenant and event type

### E8-S5: Domain Activation Integrated with Publish State

Outcome:
- custom domains are promoted only when the tenant has a healthy published release and valid routing configuration

Dependencies:
- Epic 3
- Epic 9

Acceptance Signals:
- domain promotion checks current publish health before activation
- failed activation paths preserve the prior live configuration

### E8-S6: Integration Failure Handling and Operational Alerts

Outcome:
- payment, webhook, domain, and notification failures are visible and actionable by operators

Dependencies:
- E8-S3
- E8-S4

Acceptance Signals:
- integration failures emit actionable alerts and retry metadata
- platform admins can inspect recent integration health across tenants

## Dependencies

- Epics 1 through 7
