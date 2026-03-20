# Prompt 09: E7-S2 Order Lifecycle and Fulfillment Operations

## Sequence Position

- Prompt: 09 of 18
- Epic: 7
- Story: E7-S2
- Tasks: E7-S2-T1, E7-S2-T2, E7-S2-T3, E7-S2-T4
- Phase: Epic 7 Intermediate (must wait for prompt 07 to complete)

## Prerequisites

- E7-S1 (cart and pricing engine) must be completed — prompt 07.
- Read E7-S1 handoff notes for cart model, pricing types, and cart API contracts.

## Context for the Agent

You are implementing the order lifecycle and fulfillment operations. Orders move through explicit operational states with tenant-admin visibility and control. The cart and pricing engine (E7-S1) provides the foundation — order creation consumes a completed cart with server-trusted pricing. The order state machine governs transitions from draft through placed, confirmed, preparing, ready, completed, and cancelled.

Tenant admins need to view and manage orders according to role and state rules. The customer also needs to see their order status. The order lifecycle is the core commerce transaction record that payment processing (E8-S2) and customer account history (E7-S5) will reference.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-07.md
agents/epics/epic-07-tasks.md (section E7-S2)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-07/E7-S2-T1.md
agents/epics/packets/epic-07/E7-S2-T2.md
agents/epics/packets/epic-07/E7-S2-T3.md
agents/epics/packets/epic-07/E7-S2-T4.md
```

Read dependency handoffs from prompt 07:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S1-*.md (cart model, pricing engine, cart API)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (cart entities from E7-S1)
platform/packages/types/src/ (cart and pricing types)
agents/design/Portal Design - Business Admin - orders and booking.html (UX reference)
agents/design/Portal Design - Customer Portal - confirmation order-booking details.html (UX reference)
```

## Implementation Scope

### E7-S2-T1: Order Schema and State Machine
- Finalize order schema with state machine, fulfillment mode behavior (pickup, delivery, dine-in).
- Define order status enum and valid transition rules.
- Orders reference cart totals, customer, and tenant.

### E7-S2-T2: Order Services
- Implement order creation (from completed cart), status transition, and fulfillment management services.
- Enforce that transitions are valid — reject invalid or out-of-sequence actions.
- Order creation must persist correct totals, items, customer link, and fulfillment metadata.

### E7-S2-T3: Customer and Admin API Contracts
- Define customer and admin order API contracts and query models.
- Customer API: view own orders and order details.
- Admin API: list, filter, view detail, and update order status.

### E7-S2-T4: Tenant-Admin Operational Views
- Build tenant-admin operational views for order list, detail, and status actions.
- Admin screens must reflect current status and allowed actions correctly.

## Constraints

- Order status transitions must be validated server-side — no client-side state jumps.
- All order entities must be tenant-scoped via foreign key.
- Order creation must use server-trusted pricing from the cart — no client-submitted totals.
- Do NOT implement payment processing — that is Epic 8.
- Do NOT implement booking orders — that is E7-S4.
- Do NOT implement customer registration or account history — that is E7-S5.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

If admin order management screens are browser-visible:

```bash
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S2-T1.md
agents/epics/handoffs/YYYY-MM-DD-E7-S2-T2.md
agents/epics/handoffs/YYYY-MM-DD-E7-S2-T3.md
agents/epics/handoffs/YYYY-MM-DD-E7-S2-T4.md
```

Each handoff must include:
- Task ID and status
- Order state machine documented (states, valid transitions, fulfillment modes)
- Customer-versus-admin read model differences documented
- Which E7-S1 cart contracts were consumed

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 11** (E7-S5): Customer account history displays order records
- **Prompt 12** (E7-S6): Hybrid tenant modes gate order flows by module config
- **Prompt 15** (E8-S2): Payment abstraction integrates with order totals

## Stop Conditions

- STOP if E7-S1 (cart and pricing) handoffs are not available — write a blocked handoff.
- STOP if order creation requires cart schema changes not in E7-S1 handoffs.
- STOP if the work expands into payment processing or booking lifecycle.
- STOP if admin order views require unfinished frontend shell work from E4/E5.
