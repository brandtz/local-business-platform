# Prompt 24: E11-S2 Customer Loyalty and Rewards Program

## Sequence Position

- Prompt: 24 of 38
- Epic: 11
- Story: E11-S2
- Tasks: E11-S2-T1, E11-S2-T2, E11-S2-T3, E11-S2-T4, E11-S2-T5, E11-S2-T6, E11-S2-T7
- Phase: Epic 11 Cross-Cutting Features (can run parallel with prompt 23)

## Prerequisites

- E6-S1 (catalog domain model) — completed. Provides product entities for point accumulation.
- E7-S1 (cart and pricing engine) — completed. Redemption integrates with pricing engine.
- E7-S5 (customer identity and account) — completed. Loyalty tab in customer account.
- E7-S2 (order lifecycle) — completed. Point accumulation triggers on order completion.

## Context for the Agent

You are implementing the customer loyalty and rewards program. Tenants can configure loyalty tiers (e.g., Silver, Gold, Platinum) with point thresholds, define point accumulation rules (points per dollar or per order), and set expiration policies. Customers earn points on completed orders, see their tier and balance in their account, and can redeem points for discounts at checkout.

The customer account Loyalty tab shows: current tier name, point balance, tier progression bar with next-tier threshold, and a "Redeem Points" action. Checkout shows a loyalty/promo code input field. Admin customer list shows VIP and Loyalty tag badges.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-11.md
agents/epics/epic-11-tasks.md (section E11-S2)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read dependency handoffs:

```
agents/epics/handoffs/2026-03-20-E6-S1-S3.md (catalog entities)
agents/epics/handoffs/2026-03-22-E7-S1-*.md (cart and pricing engine)
agents/epics/handoffs/2026-03-22-E7-S2-*.md (order lifecycle — completion trigger)
agents/epics/handoffs/2026-03-22-E7-S5-*.md (customer identity and account tabs)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (customer, order entities)
platform/packages/types/src/ (cart, customer, order types)
platform/apps/api/src/ (order completion events, pricing engine)
agents/design/Portal Design - Customer Portal - account.html (CP-15 Loyalty tab)
agents/design/Portal Design - Customer Portal cart and checkout.html (loyalty code input)
agents/design/Portal Design - Business Admin - customers and staff.html (VIP/Loyalty tags)
```

## Implementation Scope

### E11-S2-T1: Loyalty Configuration Schema
- Tenant-level tier definitions: name, point threshold, benefits description.
- Point accumulation rules: points per dollar or per order.
- Point expiration policy: time-based or rolling.

### E11-S2-T2: Customer Loyalty Account Schema
- Current tier, point balance, lifetime points, tier-qualification date.
- Point-transaction ledger: earn, redeem, expire, adjust entries.

### E11-S2-T3: Point Accumulation Service
- Triggered on order completion (E7-S2).
- Calculates and credits points based on tenant rules.
- Evaluates and applies tier promotion.

### E11-S2-T4: Point Redemption Service
- Validates balance, converts points to discount amount.
- Applies to cart pricing (E7-S1 pricing engine hook).
- Debits ledger.

### E11-S2-T5: Point Expiration Job
- Scheduled process that expires points past their expiration window.
- Adjusts balances accordingly.

### E11-S2-T6: Loyalty API Contracts
- Customer-facing: tier status, balance, history, redemption.
- Admin-facing: loyalty configuration CRUD, customer loyalty overview, manual adjustment.

### E11-S2-T7: Account Tab and Admin Tags
- Customer account loyalty tab data contract.
- Admin customer-list loyalty/VIP tag derivation.

## Constraints

- Loyalty configuration is tenant-scoped — each tenant defines their own program.
- Point balance must never go negative — validate before redemption.
- Expiration must not create orphaned ledger entries.
- Pricing engine integration must be additive — do not modify E7-S1 core pricing logic, use the hook mechanism.
- Do NOT implement promotional campaigns or multi-program loyalty — single program per tenant.

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
agents/epics/handoffs/YYYY-MM-DD-E11-S2-T1.md
agents/epics/handoffs/YYYY-MM-DD-E11-S2-T2.md
agents/epics/handoffs/YYYY-MM-DD-E11-S2-T3.md
agents/epics/handoffs/YYYY-MM-DD-E11-S2-T4.md
agents/epics/handoffs/YYYY-MM-DD-E11-S2-T5.md
agents/epics/handoffs/YYYY-MM-DD-E11-S2-T6.md
agents/epics/handoffs/YYYY-MM-DD-E11-S2-T7.md
```

Each handoff must include:
- Task ID and status
- Loyalty configuration schema (tiers, rules, expiration)
- Customer loyalty account schema (balance, ledger)
- Pricing engine integration hook details
- API contracts (customer-facing and admin-facing)
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The loyalty module is consumed by:
- E11-S1 analytics (customer retention metrics can factor in loyalty status)
- E9-S1 onboarding wizard (loyalty module toggle in vertical configuration)
- E12-S2 feature gating (loyalty may be a gated feature by subscription tier)

## Stop Conditions

- STOP if E7-S1 pricing engine hook mechanism is not extensible — write a blocked handoff.
- STOP if E7-S2 order completion does not emit events that can trigger point accumulation — escalate.
- STOP if the work expands into promotional campaigns or multi-program loyalty.
