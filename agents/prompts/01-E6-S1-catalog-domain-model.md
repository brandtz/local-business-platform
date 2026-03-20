# Prompt 01: E6-S1 Catalog Domain Model

## Sequence Position

- Prompt: 01 of 18
- Epic: 6
- Story: E6-S1
- Tasks: E6-S1-T1, E6-S1-T2, E6-S1-T3, E6-S1-T4
- Phase: Epic 6 Foundation (can run in parallel with prompts 02 and 03)

## Prerequisites

- Epics 1 through 5 must be completed before starting this work.
- Verify that the active task board shows all E1–E5 dependencies as Completed.
- If E4-S2 through E4-S5 or E5 tasks are not yet complete, STOP and report a blocked handoff.

## Context for the Agent

You are implementing the catalog domain model for a multi-tenant SaaS platform that supports food, retail, and appointment-driven businesses. The catalog module must be tenant-scoped, support categories, items, pricing variants, modifiers, status management, and media references. This is foundational work that downstream cart (E7-S1), storefront (E6-S1-T4), and admin CRUD (E6-S1-T3) will consume.

Epics 1–3 established the platform foundation, auth, and tenant provisioning. Epic 4 built the frontend system and shared UI conventions. Epic 5 established the tenant admin portal shell and operational settings. Your work sits in Wave 3 of the delivery plan.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-06.md
agents/epics/epic-06-tasks.md (section E6-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets for detailed scope per task:

```
agents/epics/packets/epic-06/E6-S1-T1.md
agents/epics/packets/epic-06/E6-S1-T2.md
agents/epics/packets/epic-06/E6-S1-T3.md
agents/epics/packets/epic-06/E6-S1-T4.md
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma
platform/packages/types/src/
platform/apps/api/src/
```

Read the latest dependency handoffs to understand what has already been built:

```
agents/epics/handoffs/active-task-board.md (verify E1-E5 completion)
```

## Implementation Scope

### E6-S1-T1: Catalog Schema
- Finalize Prisma schema for Category, Item, ItemVariant (pricing), ItemModifier, ItemStatus enum, and MediaReference.
- All entities must include tenant-scoped foreign keys.
- Generate migration file and shared TypeScript types in `packages/types`.

### E6-S1-T2: Catalog Domain Services
- Implement catalog domain services and repository patterns for tenant-scoped CRUD.
- Services must enforce tenant isolation on every query and mutation.

### E6-S1-T3: Admin API Contracts
- Define admin API contracts and query models for category and item management.
- Validate payloads and enforce slug uniqueness per tenant.

### E6-S1-T4: Storefront Read Models
- Expose storefront read models for active catalog presentation.
- Read models should return only active/published items for the requesting tenant.

## Constraints

- All catalog entities must be tenant-scoped via foreign key — no cross-tenant data leakage.
- Catalog schema shapes will be consumed by the cart (E7-S1), storefront, and admin surfaces — design for contract stability.
- Do NOT implement cart, pricing engine, checkout, or booking logic — those belong to Epic 7.
- Do NOT implement inventory tracking — that is out of scope for this story.
- Preserve existing schema entities and migrations from earlier epics.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

If admin API or storefront read models produce browser-visible behavior:

```bash
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

When complete, create a handoff note at:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S1-T1.md (for schema task)
agents/epics/handoffs/YYYY-MM-DD-E6-S1-T2.md (for services task)
agents/epics/handoffs/YYYY-MM-DD-E6-S1-T3.md (for admin API task)
agents/epics/handoffs/YYYY-MM-DD-E6-S1-T4.md (for storefront read models task)
```

Use the template at `agents/epics/handoff-note-template.md`. Each handoff must include:
- Task ID and status
- Exact files and modules changed
- Exact validation commands run and their results
- Playwright evidence or explicit "Playwright impact: none"
- Remaining risks or follow-on tasks
- Contract shapes introduced (schema, API payloads, shared types)

Update the active task board to move tasks from Ready → In Progress → Completed as work progresses.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 04** (E6-S3): Staff assignment needs catalog context
- **Prompt 05** (E6-S5): Vertical templates map onto catalog defaults
- **Prompt 06** (E6-S6): Domain contract stabilization consolidates catalog contracts
- **Prompt 07** (E7-S1): Cart and pricing engine consumes catalog item and pricing types

## Stop Conditions

- STOP if E4 or E5 dependencies are incomplete — write a blocked handoff instead.
- STOP if the work expands to require pricing engine, cart, or checkout logic.
- STOP if schema changes conflict with existing entities from Epics 1–3.
- STOP if more than two ownership lanes (schema + API + UI) become coupled in a single task — split the work.
