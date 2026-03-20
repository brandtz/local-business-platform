# Prompt 03: E6-S4 Content and SEO Domain Model

## Sequence Position

- Prompt: 03 of 18
- Epic: 6
- Story: E6-S4
- Tasks: E6-S4-T1, E6-S4-T2, E6-S4-T3, E6-S4-T4
- Phase: Epic 6 Foundation (can run in parallel with prompts 01 and 02)

## Prerequisites

- E5-S2 (tenant operational settings) must be completed.
- Verify on the active task board that E5-S2 tasks are Completed.
- If E5-S2 is not complete, STOP and report a blocked handoff.

## Context for the Agent

You are implementing the content and SEO domain model for a multi-tenant SaaS platform. Tenants need to manage reusable content pages, announcements, and policy content with publish states. Content must support draft and published states with SEO metadata and stable slugs. The storefront consumes content by slug for page rendering.

This work is independent of catalog and service domain models (prompts 01 and 02) and can run in parallel with them, but it depends on Epic 5 tenant operational settings being in place.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-06.md
agents/epics/epic-06-tasks.md (section E6-S4)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-06/E6-S4-T1.md
agents/epics/packets/epic-06/E6-S4-T2.md
agents/epics/packets/epic-06/E6-S4-T3.md
agents/epics/packets/epic-06/E6-S4-T4.md
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma
platform/packages/types/src/
platform/apps/api/src/
```

Read dependency handoffs:

```
agents/epics/handoffs/active-task-board.md (verify E5-S2 completion)
```

## Implementation Scope

### E6-S4-T1: Content Schema
- Finalize Prisma schema for content pages, publish state enum, SEO metadata, and slugs.
- All entities must be tenant-scoped. Support draft, published, and archived states.
- Generate migration file and shared TypeScript types.

### E6-S4-T2: Content Services
- Implement content services for draft, publish, archive, and retrieval behaviors.
- Enforce tenant isolation and validate slug uniqueness per tenant.

### E6-S4-T3: Admin and Storefront Contracts
- Define admin editing contracts for content CRUD and storefront read contracts by slug.
- Admin endpoints support full lifecycle; storefront returns only published content.

### E6-S4-T4: Template Rendering Hooks
- Establish content model hooks for template rendering and publish workflows.
- Content must be consumable by vertical template defaults (E6-S5).

## Constraints

- All content entities must be tenant-scoped via foreign key.
- Slug uniqueness must be enforced per tenant.
- Content state machine must support draft → published → archived transitions.
- Do NOT implement the template application service — that is E6-S5.
- Do NOT implement frontend content rendering — that is downstream UI work.
- Preserve existing schema entities from earlier epics.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

If admin content editing produces browser-visible behavior:

```bash
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S4-T1.md
agents/epics/handoffs/YYYY-MM-DD-E6-S4-T2.md
agents/epics/handoffs/YYYY-MM-DD-E6-S4-T3.md
agents/epics/handoffs/YYYY-MM-DD-E6-S4-T4.md
```

Use the template at `agents/epics/handoff-note-template.md`. Each handoff must include:
- Task ID and status
- Exact files and modules changed
- Content state machine contract documented
- Slug contract and SEO metadata shapes
- Template-consumption points identified for E6-S5

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 05** (E6-S5): Vertical templates map onto content defaults
- **Prompt 06** (E6-S6): Domain contract stabilization consolidates content contracts

## Stop Conditions

- STOP if E5-S2 is not complete — write a blocked handoff.
- STOP if the work expands into vertical template application or frontend rendering.
- STOP if schema changes conflict with existing entities.
- STOP if more than two ownership lanes become coupled in a single task.
