# Prompt 25: E11-S4 Quote and Estimate Management

## Sequence Position

- Prompt: 25 of 38
- Epic: 11
- Story: E11-S4
- Tasks: E11-S4-T1, E11-S4-T2, E11-S4-T3, E11-S4-T4, E11-S4-T5, E11-S4-T6, E11-S4-T7, E11-S4-T8
- Phase: Epic 11 Cross-Cutting Features (can run parallel with prompt 26)

## Prerequisites

- E6-S1 (catalog domain) and E6-S2 (services domain) — completed. Quote line items reference catalog/service entities.
- E7-S1 (cart and pricing engine) — completed. Quote-to-order conversion uses pricing engine.
- E8-S4 (notification delivery framework) — completed. Quote notifications use notification system.

## Context for the Agent

You are implementing the quote and estimate management system — a key feature for the contractor-vertical pilot. Business admins build itemized quotes from their product/service catalog, send them to prospective customers, track whether quotes are viewed/accepted/declined, and convert accepted quotes into orders.

Customers receive quotes via a secure link (no login required for initial viewing), can accept or decline with optional notes, and request revisions. The admin side has a quote pipeline view similar to the order pipeline.

Security is critical: share tokens must be unguessable and tied to the specific quote; customer identity must be captured on accept/decline; no tenant data leakage across share links.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-11.md
agents/epics/epic-11-tasks.md (section E11-S4)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read dependency handoffs:

```
agents/epics/handoffs/2026-03-20-E6-S1-S3.md (catalog and service entities)
agents/epics/handoffs/2026-03-22-E7-S1-*.md (cart and pricing engine)
agents/epics/handoffs/2026-03-22-E8-S4-*.md (notification delivery framework)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (catalog, service, order entities)
platform/packages/types/src/ (catalog, cart, order types)
platform/apps/api/src/ (pricing engine, notification service)
```

## Implementation Scope

### E11-S4-T1: Quote Schema
- Quote header: customer contact info, validity period, notes, terms, status, created/sent/viewed/responded timestamps.
- Quote line items: reference to catalog item or service, description override, quantity, unit price, line notes.
- Quote totals: subtotal, tax estimate, total.

### E11-S4-T2: Quote Lifecycle State Machine
- States: Draft → Sent → Viewed → Accepted / Declined / Revision Requested / Expired.
- Timestamp tracking for each transition.
- Automatic expiration based on validity period.

### E11-S4-T3: Quote Domain Services
- Create, update (draft only), send (generates secure share token and triggers notification), record view event, accept, decline, request revision, expire, and clone (create new from existing).

### E11-S4-T4: Quote-to-Order Conversion
- When accepted, generate a pre-filled cart or order draft from quote line items using E7-S1 pricing engine.
- Preserve quoted prices where applicable.

### E11-S4-T5: Admin API Contracts
- Quote CRUD, quote list with status filter and search, quote pipeline aggregation (count by status), send action, and conversion action.

### E11-S4-T6: Customer-Facing Quote View
- Secure token-based read endpoint (no auth required for viewing).
- Quote detail with line items.
- Accept/decline/revision-request actions (require identity capture — email at minimum).

### E11-S4-T7: Quote Notification Hooks
- Send via email/SMS (E8-S4), include secure portal link.
- Send reminders for quotes approaching expiration.

### E11-S4-T8: Admin Quote Management Views
- Quote list with pipeline status counts.
- Quote detail/edit form with line-item builder.
- Send confirmation and conversion tracking.

## Constraints

- Secure share tokens must be unguessable, time-limited (or tied to quote validity), and scoped to the specific quote.
- Customer-facing token endpoint must not leak other tenant data.
- Accept/decline must capture respondent identity.
- Quote-to-order conversion must use E7-S1 pricing engine — no separate pricing logic.
- Do NOT implement invoice generation from quotes — that is out of scope.

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
agents/epics/handoffs/YYYY-MM-DD-E11-S4-T1.md
agents/epics/handoffs/YYYY-MM-DD-E11-S4-T2.md
agents/epics/handoffs/YYYY-MM-DD-E11-S4-T3.md
agents/epics/handoffs/YYYY-MM-DD-E11-S4-T4.md
agents/epics/handoffs/YYYY-MM-DD-E11-S4-T5.md
agents/epics/handoffs/YYYY-MM-DD-E11-S4-T6.md
agents/epics/handoffs/YYYY-MM-DD-E11-S4-T7.md
agents/epics/handoffs/YYYY-MM-DD-E11-S4-T8.md
```

Each handoff must include:
- Task ID and status
- Quote schema (header + line items + totals)
- Lifecycle state machine transitions
- Secure share token model and security properties
- Quote-to-order conversion contract
- Notification integration points
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The quote management module is consumed by:
- E9-S1 onboarding wizard (contractor vertical includes quote module pre-configuration)
- E12-S2 feature gating (quotes may be a gated feature by subscription tier)
- E11-S3 search infrastructure (quote list filtering)

## Stop Conditions

- STOP if E7-S1 pricing engine cannot support quoted-price preservation during conversion — write a blocked handoff.
- STOP if E8-S4 notification framework cannot handle secure-link notifications — escalate.
- STOP if quote share tokens cannot be made cryptographically secure — escalate.
- STOP if the work expands into invoicing or payment collection on quotes.
