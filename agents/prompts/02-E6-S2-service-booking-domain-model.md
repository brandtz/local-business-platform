# Prompt 02: E6-S2 Service and Booking Domain Model

## Sequence Position

- Prompt: 02 of 18
- Epic: 6
- Story: E6-S2
- Tasks: E6-S2-T1, E6-S2-T2, E6-S2-T3, E6-S2-T4
- Phase: Epic 6 Foundation (can run in parallel with prompts 01 and 03)

## Prerequisites

- Epics 1 through 5 must be completed before starting this work.
- Verify that the active task board shows all E1–E5 dependencies as Completed.
- If E4-S2 through E4-S5 or E5 tasks are not yet complete, STOP and report a blocked handoff.

## Context for the Agent

You are implementing the service and booking domain model for a multi-tenant SaaS platform that supports appointment-driven businesses alongside commerce tenants. Services must model durations, pricing, availability settings, and booking configuration. This is foundational work that downstream booking availability (E7-S3), booking lifecycle (E7-S4), and storefront service listings will consume.

The platform already has auth, tenant provisioning, frontend foundations, and admin portal shell from Epics 1–5. Your work establishes the service entity layer that booking and scheduling features will build on.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-06.md
agents/epics/epic-06-tasks.md (section E6-S2)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets for detailed scope per task:

```
agents/epics/packets/epic-06/E6-S2-T1.md
agents/epics/packets/epic-06/E6-S2-T2.md
agents/epics/packets/epic-06/E6-S2-T3.md
agents/epics/packets/epic-06/E6-S2-T4.md
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma
platform/packages/types/src/
platform/apps/api/src/
```

Read the latest dependency handoffs:

```
agents/epics/handoffs/active-task-board.md (verify E1-E5 completion)
```

## Implementation Scope

### E6-S2-T1: Service Schema
- Finalize Prisma schema for Service, ServiceDuration, ServicePricing, AvailabilitySetting, and BookingConfig.
- All entities must be tenant-scoped. Include service status enum and duration-unit type.
- Generate migration file and shared TypeScript types.

### E6-S2-T2: Service Domain Services
- Implement service domain services for CRUD and eligibility rules.
- Enforce tenant isolation on every operation. Validate duration, price, and bookability constraints.

### E6-S2-T3: Admin and Storefront API Contracts
- Define admin and storefront API contracts for service listing and management.
- Admin endpoints support full CRUD; storefront endpoints return only active services.

### E6-S2-T4: Booking Read Models
- Expose service read models needed by booking availability computation.
- Read models must include duration, pricing, and staff eligibility data required by E7-S3.

## Constraints

- All service entities must be tenant-scoped via foreign key.
- Service schema shapes will be consumed by booking availability (E7-S3), booking lifecycle (E7-S4), and storefront.
- Do NOT implement actual slot computation or booking lifecycle — those belong to Epic 7.
- Do NOT implement staff management — that is E6-S3.
- Preserve existing schema entities from earlier epics.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

If API contracts produce browser-visible behavior:

```bash
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S2-T1.md
agents/epics/handoffs/YYYY-MM-DD-E6-S2-T2.md
agents/epics/handoffs/YYYY-MM-DD-E6-S2-T3.md
agents/epics/handoffs/YYYY-MM-DD-E6-S2-T4.md
```

Use the template at `agents/epics/handoff-note-template.md`. Each handoff must include:
- Task ID and status
- Exact files and modules changed
- Exact validation commands run and their results
- Playwright evidence or explicit "Playwright impact: none"
- Service entity contract shapes introduced
- Booking-read requirements documented for E7-S3

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 04** (E6-S3): Staff assignment references service eligibility
- **Prompt 05** (E6-S5): Vertical templates map onto service defaults
- **Prompt 06** (E6-S6): Domain contract stabilization consolidates service contracts
- **Prompt 08** (E7-S3): Availability and slot computation consumes service read models

## Stop Conditions

- STOP if E4 or E5 dependencies are incomplete — write a blocked handoff.
- STOP if the work expands into slot computation, booking lifecycle, or staff management.
- STOP if schema changes conflict with existing entities from Epics 1–3.
- STOP if more than two ownership lanes become coupled in a single task.
