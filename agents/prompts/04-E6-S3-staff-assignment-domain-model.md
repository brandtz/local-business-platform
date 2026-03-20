# Prompt 04: E6-S3 Staff and Assignment Domain Model

## Sequence Position

- Prompt: 04 of 18
- Epic: 6
- Story: E6-S3
- Tasks: E6-S3-T1, E6-S3-T2, E6-S3-T3, E6-S3-T4
- Phase: Epic 6 Intermediate (must wait for prompt 02 to complete)

## Prerequisites

- E6-S2 (service and booking domain model) must be completed — prompt 02.
- E5-S4 (staff and user management foundations) must be completed.
- Verify on the active task board that both E6-S2 and E5-S4 are Completed.
- Read the E6-S2 handoff notes for service entity contracts and eligibility structures.

## Context for the Agent

You are implementing the staff and assignment domain model. Staff are operational resources (not to be confused with tenant user identity and permissions from Epic 2). Staff records support scheduling assignment, bookability, and location context. They must remain distinct from tenant membership entities.

The service domain model from E6-S2 defines service eligibility — your staff assignment model must connect to that without duplicating service logic. The downstream booking availability computation (E7-S3) will use staff assignment data to determine valid time slots.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-06.md
agents/epics/epic-06-tasks.md (section E6-S3)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-06/E6-S3-T1.md
agents/epics/packets/epic-06/E6-S3-T2.md
agents/epics/packets/epic-06/E6-S3-T3.md
agents/epics/packets/epic-06/E6-S3-T4.md
```

Read the dependency handoffs from prompt 02:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S2-T1.md (service schema contract)
agents/epics/handoffs/YYYY-MM-DD-E6-S2-T2.md (service domain services)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (including new service entities from E6-S2)
platform/packages/types/src/ (service types from E6-S2)
platform/apps/api/src/auth/ (tenant membership entities to NOT duplicate)
```

## Implementation Scope

### E6-S3-T1: Staff Schema
- Finalize Prisma schema for staff profiles, location relationships, and bookable state.
- Staff entities are tenant-scoped. Include assignment relationship to services.
- Staff records are DISTINCT from tenant user identity/membership entities (Epic 2).

### E6-S3-T2: Staff Management Services
- Implement staff management services distinct from tenant-user identity management.
- Enforce tenant isolation. Staff CRUD must not expose auth internals.

### E6-S3-T3: Assignment Surfaces
- Define assignment surfaces needed for service eligibility and booking flow selection.
- Staff-to-service assignment determines which staff can perform which services.

### E6-S3-T4: Admin CRUD and Lookups
- Expose tenant-admin CRUD and lookup queries for operational staff usage.
- Assignment metadata must be available without exposing auth membership details.

## Constraints

- Staff records must be STRICTLY separated from auth membership entities (Epic 2 users/roles).
- All staff entities must be tenant-scoped via foreign key.
- Staff-to-service assignment must reference service entities from E6-S2 without duplicating service logic.
- Do NOT implement scheduling, availability computation, or booking logic — those belong to Epic 7.
- Do NOT modify existing auth or membership services.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

Playwright impact: none (unless admin staff management screens are added with browser-visible behavior).

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S3-T1.md
agents/epics/handoffs/YYYY-MM-DD-E6-S3-T2.md
agents/epics/handoffs/YYYY-MM-DD-E6-S3-T3.md
agents/epics/handoffs/YYYY-MM-DD-E6-S3-T4.md
```

Each handoff must include:
- Task ID and status
- Exact files and modules changed
- Staff-resource model shape and assignment lookups documented
- Explicit confirmation that staff entities are separate from auth membership entities
- Which E6-S2 service contracts were relied on

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 06** (E6-S6): Domain contract stabilization consolidates staff contracts
- **Prompt 08** (E7-S3): Availability computation uses staff assignment data

## Stop Conditions

- STOP if E6-S2 or E5-S4 handoffs are not yet available — write a blocked handoff.
- STOP if the work starts modifying auth or membership entities from Epic 2.
- STOP if the work expands into scheduling or booking logic.
- STOP if staff-to-service assignment requires changes to the service schema that weren't in E6-S2.
