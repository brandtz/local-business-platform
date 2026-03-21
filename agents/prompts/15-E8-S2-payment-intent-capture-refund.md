# Prompt 15: E8-S2 Payment Intent, Capture, and Refund Abstraction

## Sequence Position

- Prompt: 15 of 15 (remaining)
- Epic: 8
- Story: E8-S2
- Tasks: E8-S2-T1, E8-S2-T2, E8-S2-T3, E8-S2-T4, E8-S2-T5, E8-S2-T6
- Phase: Epic 8 Intermediate (must wait for prompt 13 to complete)

## Prerequisites

- E8-S1 (payment connection management) must be completed — prompt 13.
- Epic 7 must be completed — prompts 07–12 (order and booking lifecycle for payment integration points).
- Read E8-S1 handoff notes for payment connection model, encryption strategy, and adapter contract.
- Read E7-S2 and E7-S4 handoff notes for order and booking payment integration points.

## Context for the Agent

You are implementing the payment intent, capture, and refund abstraction layer. Commerce and booking flows must be able to authorize, capture, and refund payments through a stable internal adapter contract without calling provider SDKs directly. Order and booking services consume the payment service — not Stripe or Square directly.

Refund actions are security-sensitive and must be audited. Payment transactions are synchronized from webhook confirmation (E8-S3) to ensure consistency between the platform and the payment provider.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-08.md
agents/epics/epic-08-tasks.md (section E8-S2)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/integrations/payments.md
```

Read these task packets:

```
agents/epics/packets/epic-08/E8-S2-T1.md
agents/epics/packets/epic-08/E8-S2-T2.md
agents/epics/packets/epic-08/E8-S2-T3.md
agents/epics/packets/epic-08/E8-S2-T4.md
agents/epics/packets/epic-08/E8-S2-T5.md
agents/epics/packets/epic-08/E8-S2-T6.md
```

Read dependency handoffs from prompt 13:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S1-*.md (payment connection model and adapter contract)
```

Read order and booking handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S2-*.md (order lifecycle)
agents/epics/handoffs/YYYY-MM-DD-E7-S4-*.md (booking lifecycle)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (payment connection entities from E8-S1)
platform/apps/api/src/ (payment connection services, order services, booking services)
platform/packages/types/src/
```

## Implementation Scope

### E8-S2-T1: Provider-Neutral Payment Interface
- Define provider-neutral payment service interface for checkout, capture, void, and refund behavior.
- Interface must abstract Stripe and Square behind a common contract.
- Define payment intent states: created → authorized → captured → voided → refunded (partial or full).

### E8-S2-T2: Payment Transaction Orchestration
- Implement core payment transaction orchestration and ledger-facing persistence model.
- Payment transactions reference orders/bookings, tenants, and payment connections.
- Transaction records must support audit trail for all state changes.

### E8-S2-T3: Order and Booking Integration
- Integrate order and booking services with internal payment abstraction points.
- Order checkout creates a payment intent via the abstraction.
- Booking deposits use the same abstraction.

### E8-S2-T4: Refund Initiation Flow
- Implement tenant-admin refund initiation flow with audit requirements.
- Refund actions must capture actor, reason, and resulting state changes.
- Partial refunds must be supported.
- Refund must route to the original capture processor automatically.

### E8-S2-T5: Multi-Processor Routing
- Implement multi-processor routing logic — when a tenant has multiple active processors, determine which to use for capture (primary preference with configuration).
- Ensure refunds target the correct original processor.

### E8-S2-T6: Failover Behavior
- Define failover behavior — when primary processor capture fails, attempt secondary if configured.
- Log failure event for E8-S6 alert pipeline.

## Constraints

- **SECURITY CRITICAL**: Refund actions must emit audit events with actor and reason.
- **SECURITY CRITICAL**: Payment credentials are accessed only through the connection service (E8-S1).
- Provider-neutral interface is mandatory — no Stripe or Square SDK calls in domain services.
- Payment transactions must be tenant-scoped.
- Do NOT implement webhook handling — that is E8-S3.
- Do NOT implement provider-specific checkout flows (Stripe Elements, Square Web Payments SDK) — use the abstraction.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

Security-specific test expectations:
- Verify refund actions emit audit events.
- Verify payment credentials are not accessed outside the connection service.
- Verify provider-neutral interface handles success, failure, and partial refund scenarios.

If admin refund UI is browser-visible:

```bash
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S2-T1.md
agents/epics/handoffs/YYYY-MM-DD-E8-S2-T2.md
agents/epics/handoffs/YYYY-MM-DD-E8-S2-T3.md
agents/epics/handoffs/YYYY-MM-DD-E8-S2-T4.md
agents/epics/handoffs/YYYY-MM-DD-E8-S2-T5.md
agents/epics/handoffs/YYYY-MM-DD-E8-S2-T6.md
```

Each handoff must include:
- Task ID and status
- Internal payment interface documented
- Multi-processor routing rules and failover behavior documented
- Transaction state mapping documented
- Refund audit contract documented
- Which E8-S1 connection contracts were consumed

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 16** (E8-S3): Webhook ingestion synchronizes payment transactions

## Stop Conditions

- STOP if E8-S1 (payment connections) handoffs are not available — write a blocked handoff.
- STOP if order or booking services from E7 are not available for integration.
- STOP if refund audit cannot be validated with tests.
- STOP if provider-specific SDK calls leak into domain services.
