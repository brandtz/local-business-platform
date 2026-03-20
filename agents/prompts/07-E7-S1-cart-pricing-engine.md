# Prompt 07: E7-S1 Cart and Pricing Engine Foundations

## Sequence Position

- Prompt: 07 of 18
- Epic: 7
- Story: E7-S1
- Tasks: E7-S1-T1, E7-S1-T2, E7-S1-T3, E7-S1-T4
- Phase: Epic 7 Foundation (can run in parallel with prompt 08)

## Prerequisites

- Epic 6 must be completed — all stories E6-S1 through E6-S6, prompts 01–06.
- Specifically verify that E6-S1 (catalog — prompt 01) and E6-S6 (contract stabilization — prompt 06) are Completed.
- Read E6-S1 and E6-S6 handoff notes for catalog item types, pricing types, and shared contracts.

## Context for the Agent

You are implementing the cart and pricing engine foundations for a multi-tenant commerce platform. Storefronts need to build carts and calculate subtotal, discounts, tax, tip, and total using server-trusted logic. The pricing engine must be deterministic — identical inputs always produce identical outputs. Cart totals are derived from canonical backend rules, never from client-side calculations.

The catalog domain model from Epic 6 provides item, variant, modifier, and pricing types. Your cart model references those types. The pricing engine is a pure calculation service — it does not handle payment processing (Epic 8) or order creation (E7-S2).

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-07.md
agents/epics/epic-07-tasks.md (section E7-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-07/E7-S1-T1.md
agents/epics/packets/epic-07/E7-S1-T2.md
agents/epics/packets/epic-07/E7-S1-T3.md
agents/epics/packets/epic-07/E7-S1-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S1-*.md (catalog contracts)
agents/epics/handoffs/YYYY-MM-DD-E6-S6-*.md (stabilized domain contracts)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (catalog entities from E6)
platform/packages/types/src/ (catalog and shared domain types)
agents/design/Portal Design - Customer Portal cart and checkout.html (UX reference)
```

## Implementation Scope

### E7-S1-T1: Cart Model and Pricing Inputs
- Define cart schema (CartSession, CartItem, CartModifier) with tenant-scoped ownership.
- Define pricing input types: subtotal, modifier adjustments, discount application, tax calculation inputs, tip options.
- Generate migration and shared types.

### E7-S1-T2: Pricing Engine Services
- Implement pricing engine services with deterministic quote outputs.
- Cover subtotal, tax, discount, and tip calculations.
- Handle invalid-item cases, stale-price scenarios, and zero-quantity edge cases.

### E7-S1-T3: Cart API Contracts
- Create cart API contracts for add, update, remove, and quote operations.
- Validate quantity, modifier selections, and stale-price scenarios.

### E7-S1-T4: Storefront Cart Integration
- Expose storefront cart state integration using backend-trusted totals only.
- Client-side cart state must display server-calculated totals, not local calculations.

## Constraints

- Security: pricing calculations must run server-side. Client must not compute totals.
- Cart sessions must be tenant-scoped via foreign key.
- Pricing engine must be deterministic — same inputs always produce same outputs.
- Cart and pricing types must be stable for checkout (E7-S2), storefront (E7-S1-T4), and payment (E8-S2).
- Do NOT implement order creation or fulfillment — that is E7-S2.
- Do NOT implement payment processing — that is Epic 8.
- Do NOT implement booking-related pricing — that is E7-S3/E7-S4.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

If storefront cart UI is browser-visible:

```bash
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S1-T1.md
agents/epics/handoffs/YYYY-MM-DD-E7-S1-T2.md
agents/epics/handoffs/YYYY-MM-DD-E7-S1-T3.md
agents/epics/handoffs/YYYY-MM-DD-E7-S1-T4.md
```

Each handoff must include:
- Task ID and status
- Pricing invariants documented (determinism, server-authority, edge cases)
- Cart payload contract shapes
- Stale-price handling rules
- Which E6 catalog contracts were consumed

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 09** (E7-S2): Order lifecycle consumes cart totals for order creation
- **Prompt 15** (E8-S2): Payment abstraction consumes cart/order pricing

## Stop Conditions

- STOP if E6 contracts are not stable — write a blocked handoff.
- STOP if pricing logic becomes non-deterministic or depends on external state.
- STOP if the work expands into order lifecycle or payment processing.
- STOP if client-side pricing calculations are introduced (server-authority violation).
