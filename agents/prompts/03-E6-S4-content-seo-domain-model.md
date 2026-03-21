# Prompt 03: E6-S4 Content and SEO Domain Model

## Sequence Position

- Prompt: 03 of 15 (remaining)
- Epic: 6
- Story: E6-S4
- Tasks: E6-S4-T1, E6-S4-T2, E6-S4-T3, E6-S4-T4, E6-S4-T5, E6-S4-T6
- Phase: Epic 6 Remaining Foundation (can begin after E5 completes)

## Prerequisites

- E5-S2 (tenant operational settings) must be completed.
- E6-S1 (catalog), E6-S2 (services), and E6-S3 (staff) are already completed — see handoff `agents/epics/handoffs/2026-03-20-E6-S1-S3.md`.
- Verify on the active task board that E5-S2 tasks are Completed.
- If E5-S2 is not complete, STOP and report a blocked handoff.

## Context for the Agent

You are implementing the content and SEO domain model for a multi-tenant SaaS platform. Tenants need to manage reusable content pages, announcements, and policy content with publish states. Content must support draft and published states with SEO metadata and stable slugs. The storefront consumes content by slug for page rendering.

This work is independent of catalog and service domain models (which are already completed) but it depends on Epic 5 tenant operational settings being in place.

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
agents/epics/packets/epic-06/E6-S4-T5.md
agents/epics/packets/epic-06/E6-S4-T6.md
```

Read completed domain handoffs for context on established patterns:

```
agents/epics/handoffs/2026-03-20-E6-S1-S3.md (catalog, service, staff domain patterns)
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

### E6-S4-T1: Content Page Schema
- Finalize Prisma schema for content pages — including structured content body (block-based or rich-text JSON), publish state enum (draft/published/archived), SEO metadata (title, description, OG tags), slugs, and template-region assignments.
- All entities must be tenant-scoped. Generate migration file and shared TypeScript types.

### E6-S4-T2: Announcement Schema
- Define schema for announcements — title, body, placement type (banner/popup/inline), date-range scheduling (start/end), active state, and display-priority.
- Announcements are tenant-scoped with scheduling metadata.

### E6-S4-T3: Content Services
- Implement content services for draft, publish, archive, and retrieval behaviors including scheduled publish support.
- Enforce tenant isolation and validate slug uniqueness per tenant.

### E6-S4-T4: Announcement Services
- Implement announcement services for CRUD, activation by date range, and placement-filtered queries.
- Support placement types: banner, popup, inline. Announcements activate and deactivate by date range.

### E6-S4-T5: Admin and Storefront Contracts
- Define admin editing contracts (page create/update with structured body payload, media references within body, SEO fields) and storefront read contracts by slug.
- Admin endpoints support full lifecycle; storefront returns only published content.

### E6-S4-T6: Template Rendering Hooks
- Establish content model hooks for template rendering, publish workflows, and storefront preview data generation.
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
agents/epics/handoffs/YYYY-MM-DD-E6-S4-T5.md
agents/epics/handoffs/YYYY-MM-DD-E6-S4-T6.md
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
