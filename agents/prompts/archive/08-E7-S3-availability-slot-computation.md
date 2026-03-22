# Prompt 08: E7-S3 Availability and Slot Computation

## Sequence Position

- Prompt: 08 of 15 (remaining)
- Epic: 7
- Story: E7-S3
- Tasks: E7-S3-T1, E7-S3-T2, E7-S3-T3, E7-S3-T4
- Phase: Epic 7 Foundation (can run in parallel with prompt 07)

## Prerequisites

- Epic 6 must be completed — all stories E6-S1 through E6-S6.
- Epic 5 must be completed (tenant operational settings including location hours).
- E6-S2 (services) and E6-S3 (staff) are already completed — see handoff `agents/epics/handoffs/2026-03-20-E6-S1-S3.md`.
- E6-S6 (contracts) must be completed — prompt 06.
- Read the E6-S1/S2/S3 handoff and E6-S6 handoff notes for service durations, staff assignments, and location data.

## Context for the Agent

You are implementing the availability and slot computation engine for booking-capable tenants. The system must generate valid bookable time slots based on location hours, blackout windows, service durations, and staff availability. Invalid or overlapping bookings must be rejected server-side.

The service domain (E6-S2) provides service durations and pricing. The staff domain (E6-S3) provides staff-to-service assignments. Location hours come from Epic 5 tenant operational settings. Your slot computation engine combines these inputs to produce available booking windows.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-07.md
agents/epics/epic-07-tasks.md (section E7-S3)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-07/E7-S3-T1.md
agents/epics/packets/epic-07/E7-S3-T2.md
agents/epics/packets/epic-07/E7-S3-T3.md
agents/epics/packets/epic-07/E7-S3-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/2026-03-20-E6-S1-S3.md (service durations, staff assignments — completed)
agents/epics/handoffs/YYYY-MM-DD-E6-S6-*.md (stabilized domain contracts)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (service, staff, and location entities)
platform/packages/types/src/ (service and staff types)
platform/apps/api/src/ (service and staff domain services)
```

## Implementation Scope

### E7-S3-T1: Availability Inputs
- Define availability inputs from location hours, blackout windows, service durations, and staff assignment.
- Create input types that slot computation consumes.

### E7-S3-T2: Slot Computation Service
- Implement slot computation service and conflict-detection rules.
- Cover overlap, lead time, blackout, and duration scenarios.
- Slots must respect staff availability, location hours, and existing bookings.

### E7-S3-T3: Booking Slot Query API
- Define booking-slot query API contracts for storefront and admin usage.
- Queries accept date range, service, and optional staff parameters.

### E7-S3-T4: Caching and Recalculation Strategy
- Document caching or recalculation strategy for slot generation under load.
- Slot generation must remain predictable under reasonable concurrent query load.

## Constraints

- Slot computation must be server-side and deterministic for given inputs.
- All slot queries must be tenant-scoped.
- Overlap detection must prevent double-booking at the staff + time + service level.
- Do NOT implement booking creation or lifecycle — that is E7-S4.
- Do NOT implement customer-facing booking UI — that is downstream.
- Do NOT modify service or staff entities — consume the E6 contracts as-is.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

Playwright impact: none (no browser-visible behavior in this story).

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S3-T1.md
agents/epics/handoffs/YYYY-MM-DD-E7-S3-T2.md
agents/epics/handoffs/YYYY-MM-DD-E7-S3-T3.md
agents/epics/handoffs/YYYY-MM-DD-E7-S3-T4.md
```

Each handoff must include:
- Task ID and status
- Slot computation inputs and conflict-detection rules documented
- Caching assumptions documented
- Which E6 service and staff contracts were relied on

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 10** (E7-S4): Booking lifecycle consumes slot computation for booking creation

## Stop Conditions

- STOP if E6-S2 (services) or E6-S3 (staff) contracts are incomplete — write a blocked handoff.
- STOP if slot computation requires service or staff schema changes not in E6 handoffs.
- STOP if the work expands into booking creation or customer-facing UI.
- STOP if overlap detection cannot be validated with unit tests due to missing schema.
