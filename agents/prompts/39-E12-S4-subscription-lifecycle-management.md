# Prompt 39: E12-S4 Subscription Lifecycle Management (with UI)

## Sequence Position

- Prompt: 39 of 46
- Epic: 12 — SaaS Subscription Management & Platform Billing
- Story: E12-S4
- Tasks: E12-S4-T1 through E12-S4-T8
- Phase: Enhanced Backend + UI (depends on prompt 36 E12-S3; can run parallel with prompt 40)

## Prerequisites

- E12-S1 (subscription packages) — completed
- E12-S3 (prompt 36 — billing integration) — needed for payment processing
- E3-S1 (tenant lifecycle) — completed
- E13-S1 (prompt 27) — shared UI components
- E13-S8 (prompt 34) — platform admin portal
- E13-S5 (prompt 31) — admin shell

## Context for the Agent

You are building the **full tenant subscription lifecycle** — the state machine that governs how a tenant moves from trial to active to past-due to cancelled/suspended. This includes proration on plan changes, dunning sequences for failed payments, trial management, and integration with tenant lifecycle.

**This prompt requires both backend AND frontend implementation.**

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md (section E12-S4)
agents/epics/epic-12-tasks.md (section E12-S4)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### Subscription State Machine
- States: Trial → Active → Past Due → Cancelled → Suspended → Reactivated
- Transition rules with validation and side effects
- Integration with tenant lifecycle: subscription suspension → tenant suspension

### Upgrade/Downgrade with Proration
- Proration preview API: calculate cost difference for mid-cycle plan change
- Apply proration on plan change: credit remaining days, charge new rate
- Immediate vs end-of-cycle upgrade options

### Dunning Sequence
- Configurable retry schedule: retry day 1, day 3, day 7
- Escalation: warning email → grace period → auto-suspend
- Admin notification at each dunning stage

### Trial Management
- Auto-create trial on tenant provisioning
- Trial expiration handling: convert to paid or suspend
- Trial extension API (platform admin override)

## Implementation Scope — Frontend (REQUIRED)

### Platform Admin — Subscription Override Controls
- **Subscription override actions** in tenant detail view (extend existing tenant detail from E13-S8):
  - "Extend Trial" button → Modal: number of days, reason
  - "Apply Credit" button → Modal: credit amount, reason
  - "Force Cancel" button → Modal: confirmation, immediate vs end-of-cycle, reason
  - "Change Plan" button → Modal: plan selector, proration preview, effective date
  - All actions logged in audit trail
- **Dunning status** visible on tenant cards: show warning badge if tenant is in dunning sequence
- **Subscription status filter** on tenant list: filter by subscription status (Trial, Active, Past Due, Dunning, Suspended)

### Tenant Admin — Plan Management
- **Proration preview** when changing plans: show current plan, new plan side-by-side with cost breakdown (credit, charge, net)
- **Trial conversion prompt**: banner when trial is expiring with CTA to select a paid plan
- **Subscription status** in billing section: current status, next billing date, grace period countdown if in dunning

## Constraints

- State machine transitions must be auditable — log every transition with actor and reason
- Proration calculations must be deterministic and match billing provider (Stripe) calculations
- Dunning jobs via BullMQ, not cron
- Use `@platform/ui` components — Modal, FormSection, MetricCard, StatusBadge
- Use `@platform/sdk` — add subscription lifecycle methods
- Platform admin UI extends E13-S8 tenant pages; tenant admin UI extends E13-S5 settings

## Validation Commands

```bash
pnpm --filter @platform/api typecheck
pnpm --filter @platform/api test
pnpm --filter web-platform-admin typecheck
pnpm --filter web-platform-admin build
pnpm --filter web-admin typecheck
pnpm --filter web-admin build
npx playwright test --project=web-platform-admin-smoke
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E12-S4-*.md`. Include:
- State machine diagram (states + transitions + side effects)
- Proration calculation formula and preview contract
- Dunning sequence configuration and job details
- Frontend: override action modals, proration preview component, trial banner
- Files created/modified

## Stop Conditions

- STOP if E12-S3 billing integration is not available — implement state machine without payment hooks, document
- STOP if BullMQ is not configured for scheduling — implement with setTimeout fallback and document
- STOP if tenant lifecycle integration (E3-S1) state machine is incompatible — document conflict and escalate
