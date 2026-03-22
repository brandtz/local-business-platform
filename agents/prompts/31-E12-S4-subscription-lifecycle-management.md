# Prompt 31: E12-S4 Subscription Lifecycle Management

## Sequence Position

- Prompt: 31 of 38
- Epic: 12
- Story: E12-S4
- Tasks: E12-S4-T1, E12-S4-T2, E12-S4-T3, E12-S4-T4, E12-S4-T5, E12-S4-T6
- Phase: Epic 12 Lifecycle (must wait for prompts 19, 28 to complete; can run parallel with prompt 32)

## Prerequisites

- E12-S1 (subscription package model) must be completed — prompt 19.
- E12-S3 (platform billing integration) must be completed — prompt 28.
- E3-S1 (tenant lifecycle state machine) — completed. Subscription state ties into tenant lifecycle.
- E8-S4 (notification delivery) — completed. Dunning notifications use notification framework.

## Context for the Agent

You are implementing subscription lifecycle management — the state machine that governs how tenant subscriptions move through their lifecycle: trial, active, past due, cancelled, suspended. This includes upgrade/downgrade with proration, a dunning sequence for failed payments, trial management, and connection to the tenant lifecycle state machine.

When a payment fails, the system retries on a configurable schedule, sends warning notifications at each stage, and eventually suspends the tenant after a grace period. Upgrade/downgrade changes must calculate proration and update the billing provider. Trial-to-paid conversion must be smooth. Suspended subscriptions can trigger tenant suspension in E3-S1.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md
agents/epics/epic-12-tasks.md (section E12-S4)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-12/E12-S4-T1.md
agents/epics/packets/epic-12/E12-S4-T2.md
agents/epics/packets/epic-12/E12-S4-T3.md
agents/epics/packets/epic-12/E12-S4-T4.md
agents/epics/packets/epic-12/E12-S4-T5.md
agents/epics/packets/epic-12/E12-S4-T6.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S1-*.md (package schema — from prompt 19)
agents/epics/handoffs/YYYY-MM-DD-E12-S3-*.md (billing provider integration — from prompt 28)
agents/epics/handoffs/2026-03-16-E3-S1-*.md (tenant lifecycle state machine)
agents/epics/handoffs/2026-03-22-E8-S4-*.md (notification delivery framework)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (package, tenant, billing entities)
platform/packages/types/src/ (billing and tenant types)
platform/apps/api/src/ (billing provider adapter, tenant lifecycle service)
```

## Implementation Scope

### E12-S4-T1: Tenant Subscription Schema
- Tenant reference, package reference, status (trialing/active/past_due/cancelled/suspended), current period start/end, trial end date, cancellation date, and billing provider references.

### E12-S4-T2: Subscription State Machine
- Trial → Active (on payment or trial conversion), Active → Past Due (on failed payment), Past Due → Active (on successful retry), Active → Cancelled (on cancellation, enters grace period), Cancelled → Suspended (after grace period), Suspended → Active (on reactivation with payment), any → Suspended (platform admin override).

### E12-S4-T3: Upgrade/Downgrade Services
- Calculate proration (or next-cycle application).
- Update billing provider subscription.
- Trigger entitlement recalculation (E12-S2).
- Provide proration preview API for tenant admin UI.

### E12-S4-T4: Dunning Sequence
- Configurable retry schedule (e.g., retry at day 1, 3, 7).
- Warning notifications to tenant admin at each stage (E8-S4).
- Grace period duration before suspension.
- Automatic suspension trigger.

### E12-S4-T5: Trial Management
- Trial creation on tenant provisioning (E3-S2).
- Trial-to-paid conversion flow.
- Trial expiration handling (prompt to subscribe or suspend).

### E12-S4-T6: Tenant Lifecycle Integration
- Suspended subscriptions trigger tenant suspension in E3-S1.
- Reactivated subscriptions restore tenant active state.

## Constraints

- State machine must reject invalid transitions — no silent state corruption.
- Dunning retries must be bounded — configurable schedule, not infinite.
- Proration calculation must be accurate for mid-cycle changes.
- Trial conversion must not create duplicate billing subscriptions.
- Do NOT implement platform admin override UI — that is E12-S5.
- Do NOT implement tenant admin billing UI — that is E12-S6.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

Playwright impact: none (admin UIs are E12-S5 and E12-S6).

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S4-T1.md
agents/epics/handoffs/YYYY-MM-DD-E12-S4-T2.md
agents/epics/handoffs/YYYY-MM-DD-E12-S4-T3.md
agents/epics/handoffs/YYYY-MM-DD-E12-S4-T4.md
agents/epics/handoffs/YYYY-MM-DD-E12-S4-T5.md
agents/epics/handoffs/YYYY-MM-DD-E12-S4-T6.md
```

Each handoff must include:
- Task ID and status
- Subscription state machine (all transitions, guards, triggers)
- Dunning schedule configuration and notification triggers
- Proration calculation logic
- Trial management flow
- Tenant lifecycle integration points
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 33** (E12-S5): Platform admin views show subscription state, dunning state, override actions
- **Prompt 35** (E12-S6): Tenant admin billing shows subscription status, upgrade/downgrade, cancellation

## Stop Conditions

- STOP if E12-S1 or E12-S3 handoffs are not available — write a blocked handoff.
- STOP if E3-S1 tenant lifecycle cannot be extended to respond to subscription state changes — escalate.
- STOP if billing provider adapter cannot handle proration calculations — escalate.
