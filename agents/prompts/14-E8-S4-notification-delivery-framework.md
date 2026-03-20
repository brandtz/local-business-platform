# Prompt 14: E8-S4 Notification Delivery Framework

## Sequence Position

- Prompt: 14 of 18
- Epic: 8
- Story: E8-S4
- Tasks: E8-S4-T1, E8-S4-T2, E8-S4-T3, E8-S4-T4
- Phase: Epic 8 Foundation (can run in parallel with prompt 13)

## Prerequisites

- Epic 7 must be completed (ordering and booking domain events).
- Epic 1 must be completed (tenant and queue infrastructure).
- Verify prerequisites on the active task board.

## Context for the Agent

You are implementing the notification delivery framework — email, SMS, and push notification channels through a common abstraction layer. Notifications can be generated from domain events (order confirmed, booking created, payment received) without hard-coupling to a single provider. Delivery attempts and failures must be observable per tenant and event type.

The framework uses a queue-backed delivery orchestration pattern with provider adapters. BullMQ + Redis (from Epic 1) provides the queue infrastructure. Templates define how notifications are rendered for each channel and event type.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-08.md
agents/epics/epic-08-tasks.md (section E8-S4)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-08/E8-S4-T1.md
agents/epics/packets/epic-08/E8-S4-T2.md
agents/epics/packets/epic-08/E8-S4-T3.md
agents/epics/packets/epic-08/E8-S4-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S2-*.md (order events)
agents/epics/handoffs/YYYY-MM-DD-E7-S4-*.md (booking events)
agents/epics/handoffs/ (E1 queue infrastructure handoffs)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma
platform/apps/worker/src/ (existing queue/worker infrastructure)
platform/packages/types/src/
```

## Implementation Scope

### E8-S4-T1: Notification Domain Models
- Define NotificationEvent model (event type, tenant, entity reference, payload).
- Define NotificationTemplate model (event type, channel, template body with variable slots, tenant-customizable flag).
- Define NotificationChannel enum (email, SMS, in-app/push).
- Seed default templates for core event types (order confirmation, booking confirmation, payment receipt).

### E8-S4-T2: Queue-Backed Delivery Orchestration
- Implement queue-backed delivery orchestration for email, SMS, and push channels.
- Use BullMQ jobs to process notification delivery asynchronously.
- Handle retries with exponential backoff for transient failures.

### E8-S4-T3: Provider Adapters
- Create provider adapters and failure-state mapping for initial delivery providers.
- Adapters must implement a common interface — swappable without changing domain logic.
- Map provider-specific errors to a common failure taxonomy.

### E8-S4-T4: Delivery History and Status Views
- Expose delivery history and status views for operators.
- Show delivery attempts, retries, final status (delivered, failed, bounced), and failure reasons.
- Delivery history must be tenant-scoped.

## Constraints

- Notifications must not hard-couple to a single provider — use adapter pattern.
- Templates can be tenant-customized; default templates are shared across tenants.
- Delivery attempts must be persisted for observability and retry.
- Queue processing must be idempotent — reprocessing the same event should not send duplicate notifications.
- Do NOT implement the notification trigger logic within order/booking services — consume domain events.
- Do NOT implement push notification provider infrastructure (APNs, FCM) yet — define the adapter interface only.
- Sensitive customer data in notifications must be handled carefully (no PII in logs).

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
pnpm --filter @platform/worker test
```

Playwright impact: none (notification delivery is backend-only).

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S4-T1.md
agents/epics/handoffs/YYYY-MM-DD-E8-S4-T2.md
agents/epics/handoffs/YYYY-MM-DD-E8-S4-T3.md
agents/epics/handoffs/YYYY-MM-DD-E8-S4-T4.md
```

Each handoff must include:
- Task ID and status
- Notification event contract documented
- Queue semantics (retry policy, idempotency strategy) documented
- Provider adapter interface documented
- Provider-failure taxonomy defined

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 17** (E8-S6): Integration failure handling monitors notification delivery failures

## Stop Conditions

- STOP if Epic 7 domain events are not defined — write a blocked handoff.
- STOP if BullMQ/Redis queue infrastructure from Epic 1 is not available.
- STOP if the work expands into implementing full push notification provider SDKs.
- STOP if notification templates require customer data models not yet available.
