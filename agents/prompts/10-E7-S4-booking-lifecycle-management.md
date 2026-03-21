# Prompt 10: E7-S4 Booking Lifecycle Management

## Sequence Position

- Prompt: 10 of 15 (remaining)
- Epic: 7
- Story: E7-S4
- Tasks: E7-S4-T1, E7-S4-T2, E7-S4-T3, E7-S4-T4, E7-S4-T5, E7-S4-T6
- Phase: Epic 7 Intermediate (must wait for prompt 08 to complete)

## Prerequisites

- E7-S3 (availability and slot computation) must be completed — prompt 08.
- Read E7-S3 handoff notes for slot computation service, conflict-detection rules, and caching strategy.

## Context for the Agent

You are implementing the booking lifecycle management system. Customers and tenant admins can create, confirm, cancel, and complete bookings through explicit lifecycle rules. Booking creation consumes the slot computation service from E7-S3 to validate that the requested time slot is available and conflict-free.

The booking state machine governs transitions: requested → confirmed → checked-in → completed, with cancellation possible from certain states subject to cancellation window policies. Bookings must prevent double-booking at the staff + time + service level.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-07.md
agents/epics/epic-07-tasks.md (section E7-S4)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-07/E7-S4-T1.md
agents/epics/packets/epic-07/E7-S4-T2.md
agents/epics/packets/epic-07/E7-S4-T3.md
agents/epics/packets/epic-07/E7-S4-T4.md
agents/epics/packets/epic-07/E7-S4-T5.md
agents/epics/packets/epic-07/E7-S4-T6.md
```

Read dependency handoffs from prompt 08:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S3-*.md (slot computation, conflict detection, availability inputs)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (service, staff, slot entities)
platform/packages/types/src/ (service, staff, availability types)
agents/design/Portal Design - Business Admin - orders and booking.html (UX reference)
agents/design/Portal Design - Customer Portal - confirmation order-booking details.html (UX reference)
```

## Implementation Scope

### E7-S4-T1: Booking Schema and State Machine
- Finalize booking schema with status transitions, cancellation windows, and deposit behavior.
- Define booking status enum (requested, confirmed, checked-in, completed, cancelled, no-show).
- Bookings reference service, staff, customer, time slot, and tenant.

### E7-S4-T2: Booking Services
- Implement booking creation, confirm, cancel, check-in, and complete services.
- Booking creation must consume slot computation to validate availability.
- Double-booking prevention must be enforced at the database level.

### E7-S4-T3: Customer and Admin API Contracts
- Define customer and admin booking API contracts and list/detail views.
- Customer API: create booking, view own bookings.
- Admin API: list, filter, view, and manage bookings with exception handling.

### E7-S4-T4: Calendar-View Query Model
- Define calendar-view query model — bookings queryable by date range, staff member, and service type, with time-block data suitable for rendering a day/week/month calendar grid.

### E7-S4-T5: Tenant-Admin Operational Screens
- Build tenant-admin operational screens for booking list view, calendar view, booking detail, and exception handling (reschedule, no-show, manual override).
- Admin screens must show allowed transitions and denial reasons clearly.
- Calendar view renders bookings in correct time slots.

### E7-S4-T6: Customer Booking Tracking
- Define customer-facing booking confirmation and tracking read model with status-bar progress mapping.
- Customer sees booking progress/status bar similar to order tracking.

## Constraints

- Booking status transitions and cancellation windows must be enforced server-side.
- All booking entities must be tenant-scoped.
- Double-booking prevention is mandatory — use database-level constraints or locks.
- Do NOT implement payment deposits or refund logic — that is Epic 8.
- Do NOT implement customer account management — that is E7-S5.
- Do NOT modify slot computation logic — consume it as-is from E7-S3.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

If admin booking screens are browser-visible:

```bash
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S4-T1.md
agents/epics/handoffs/YYYY-MM-DD-E7-S4-T2.md
agents/epics/handoffs/YYYY-MM-DD-E7-S4-T3.md
agents/epics/handoffs/YYYY-MM-DD-E7-S4-T4.md
agents/epics/handoffs/YYYY-MM-DD-E7-S4-T5.md
agents/epics/handoffs/YYYY-MM-DD-E7-S4-T6.md
```

Each handoff must include:
- Task ID and status
- Booking state machine documented (states, valid transitions, cancellation rules)
- Calendar-view data contract documented
- Double-booking prevention mechanism documented
- Admin exception-handling flows (reschedule, no-show) described
- Customer booking tracking read model documented
- Which E7-S3 slot computation contracts were consumed

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 11** (E7-S5): Customer account history displays booking records
- **Prompt 12** (E7-S6): Hybrid tenant modes gate booking flows by module config
- **Prompt 15** (E8-S2): Payment abstraction integrates with booking deposits

## Stop Conditions

- STOP if E7-S3 (slot computation) handoffs are not available — write a blocked handoff.
- STOP if booking creation requires slot computation changes not in E7-S3 handoffs.
- STOP if the work expands into payment processing or customer account management.
- STOP if double-booking prevention cannot be validated with integration tests.
