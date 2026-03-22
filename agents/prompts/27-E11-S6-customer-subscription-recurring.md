# Prompt 27: E11-S6 Customer Subscription and Recurring Order Support

## Sequence Position

- Prompt: 27 of 38
- Epic: 11
- Story: E11-S6
- Tasks: E11-S6-T1, E11-S6-T2, E11-S6-T3, E11-S6-T4, E11-S6-T5, E11-S6-T6, E11-S6-T7
- Phase: Epic 11 Cross-Cutting Features (can run parallel with prompt 28)

## Prerequisites

- E7-S1 (cart and pricing engine) — completed. Subscription pricing uses pricing engine.
- E7-S2 (order lifecycle) — completed. Renewal creates orders.
- E8-S2 (payment intent, capture, refund) — completed. Renewal charges saved payment methods.
- E7-S5 (customer identity and account) — completed. Subscription management in account area.
- E8-S4 (notification delivery) — completed. Payment failure notifications.

## Context for the Agent

You are implementing customer subscription and recurring order support. The analytics breakdown shows "subscriptions 10%" as a sales channel — tenants can offer recurring purchase plans to their end-customers. This is NOT platform billing (that's E12) — this is a tenant-level feature where customers subscribe to recurring product/service deliveries.

Customers manage active plans from their account: view, pause, resume, cancel. Renewal automation creates actual order records on schedule and charges saved payment methods. Failed payments trigger retry with customer notification.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-11.md
agents/epics/epic-11-tasks.md (section E11-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read dependency handoffs:

```
agents/epics/handoffs/2026-03-22-E7-S1-*.md (pricing engine)
agents/epics/handoffs/2026-03-22-E7-S2-*.md (order lifecycle)
agents/epics/handoffs/2026-03-22-E7-S5-*.md (customer account tabs)
agents/epics/handoffs/2026-03-22-E8-S2-*.md (payment intent and capture)
agents/epics/handoffs/2026-03-22-E8-S4-*.md (notification delivery)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (order, customer, payment entities)
platform/packages/types/src/ (order, payment, customer types)
platform/apps/api/src/ (order service, payment service, worker jobs)
agents/design/Portal Design - Customer Portal - account.html
```

## Implementation Scope

### E11-S6-T1: Subscription Plan Schema
- Name, description, linked catalog items or services, frequency (weekly/biweekly/monthly/custom), pricing (flat rate or calculated), cancellation policy (anytime, end-of-period, minimum commitment), and trial period support.

### E11-S6-T2: Customer Subscription Schema
- Plan reference, customer reference, status (active/paused/cancelled/expired), saved payment method reference, next renewal date, billing history.

### E11-S6-T3: Subscription Lifecycle Services
- Subscribe, pause, resume, cancel, and reactivate.
- Enforce cancellation policy and minimum-commitment rules.

### E11-S6-T4: Renewal Automation Job
- Scheduled process that creates renewal orders (E7-S2) from active subscriptions on renewal date.
- Charges saved payment method (E8-S2).
- Handles payment failure with retry and customer notification (E8-S4).

### E11-S6-T5: Admin API Contracts
- Subscription plan CRUD, subscriber list with status filter, subscription override (extend, adjust, cancel on behalf of customer).

### E11-S6-T6: Customer-Facing Subscription Management
- View active subscriptions, upcoming renewal, pause/resume/cancel actions, and billing history within account area (E7-S5 account tab integration).

### E11-S6-T7: Analytics Channel Attribution
- Ensure subscription revenue is tagged as a channel so E11-S1 analytics can report subscription as a revenue channel.

## Constraints

- This is tenant-level customer subscriptions, NOT platform billing (E12). Do not confuse the two.
- Subscription lifecycle must enforce cancellation policy — no premature cancellation if minimum commitment applies.
- Renewal must create real order records — not shadow billing.
- Payment failure retry must have bounded attempts — no infinite retry loops.
- Do NOT implement promotional pricing or coupon discounts on subscriptions.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E11-S6-T1.md
agents/epics/handoffs/YYYY-MM-DD-E11-S6-T2.md
agents/epics/handoffs/YYYY-MM-DD-E11-S6-T3.md
agents/epics/handoffs/YYYY-MM-DD-E11-S6-T4.md
agents/epics/handoffs/YYYY-MM-DD-E11-S6-T5.md
agents/epics/handoffs/YYYY-MM-DD-E11-S6-T6.md
agents/epics/handoffs/YYYY-MM-DD-E11-S6-T7.md
```

Each handoff must include:
- Task ID and status
- Subscription plan schema
- Customer subscription schema
- Lifecycle state machine and cancellation policy enforcement
- Renewal automation job schedule and retry behavior
- Payment integration points
- Analytics channel attribution hook
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The customer subscription module is consumed by:
- E11-S1 analytics (subscription revenue channel)
- E12-S2 feature gating (subscription plans may be a gated feature)

## Stop Conditions

- STOP if E7-S2 order creation API is not suitable for automated renewal — write a blocked handoff.
- STOP if E8-S2 payment capture cannot handle recurring charges on saved payment methods — escalate.
- STOP if the work expands into promotional pricing or coupon management.
