# Prompt 33: E12-S5 Platform Admin Subscription and Revenue Views

## Sequence Position

- Prompt: 33 of 38
- Epic: 12
- Story: E12-S5
- Tasks: E12-S5-T1, E12-S5-T2, E12-S5-T3, E12-S5-T4, E12-S5-T5
- Phase: Epic 12 Admin Views (must wait for prompt 31 to complete; can run parallel with prompt 34)

## Prerequisites

- E12-S1 through E12-S4 (package model, feature gating, billing integration, lifecycle) must all be completed — prompts 19, 26, 28, 31.
- E3-S6 (platform operations console foundations) — completed for dashboard integration.

## Context for the Agent

You are implementing the platform admin subscription and revenue views — the management interface where platform operators monitor subscription health, revenue metrics, and take administrative actions on tenant billing.

Platform admins need: MRR (monthly recurring revenue), active subscriber count, trial count, churn rate, failed-payment count, and ARPU (average revenue per user). They need a searchable subscriber list with subscription status and payment health indicators. They need detailed billing views per tenant with override actions (extend trial, apply credit, comp plan, force-cancel) — all with audit logging.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md
agents/epics/epic-12-tasks.md (section E12-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-12/E12-S5-T1.md
agents/epics/packets/epic-12/E12-S5-T2.md
agents/epics/packets/epic-12/E12-S5-T3.md
agents/epics/packets/epic-12/E12-S5-T4.md
agents/epics/packets/epic-12/E12-S5-T5.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S1-*.md (package model — from prompt 19)
agents/epics/handoffs/YYYY-MM-DD-E12-S3-*.md (billing integration — from prompt 28)
agents/epics/handoffs/YYYY-MM-DD-E12-S4-*.md (subscription lifecycle — from prompt 31)
agents/epics/handoffs/2026-03-17-E3-S6-*.md (platform operations console)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (subscription, billing entities)
platform/packages/types/src/ (billing types)
platform/apps/api/src/ (subscription and billing services)
agents/design/Portal Design - Platform Admin - dashboard.html
agents/design/Portal Design - Platform Admin - operations.html
```

## Implementation Scope

### E12-S5-T1: Platform Subscription KPIs
- Define and implement aggregation queries for: total MRR, active subscriber count, trial count, churn rate (monthly), failed-payment count, and ARPU.

### E12-S5-T2: Subscription List View
- Tenant name, plan name, subscription status, MRR contribution, next billing date, payment health indicator.
- Search, status filter, and plan filter.

### E12-S5-T3: Tenant Billing Detail View
- Subscription history, invoice list, payment attempts, dunning state.
- Override actions: extend trial, apply credit, comp plan, force-cancel.

### E12-S5-T4: Dashboard KPI Integration
- Integrate subscription KPIs into E3-S6 platform dashboard: MRR card, subscriber count card, churn rate card, and MRR trend chart.

### E12-S5-T5: Override Actions with Audit Logging
- Every manual subscription change records: platform admin actor, reason, and before/after state.

## Constraints

- All override actions must be audit-logged — no silent changes.
- KPI queries must be performant — avoid full-table scans.
- Override actions must confirm before executing (destructive action pattern).
- Platform admin views must not expose tenant payment secrets (card numbers, etc.).
- Do NOT implement tenant-facing billing views — that is E12-S6.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
npx playwright test --project=web-platform-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S5-T1.md
agents/epics/handoffs/YYYY-MM-DD-E12-S5-T2.md
agents/epics/handoffs/YYYY-MM-DD-E12-S5-T3.md
agents/epics/handoffs/YYYY-MM-DD-E12-S5-T4.md
agents/epics/handoffs/YYYY-MM-DD-E12-S5-T5.md
```

Each handoff must include:
- Task ID and status
- KPI aggregation queries and data contracts
- Subscription list/detail data contracts
- Override action semantics and audit log format
- Dashboard integration points
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

No prompts in this sequence directly depend on E12-S5. The platform admin billing views are consumed by:
- E10-S2 (audit search and operational diagnostics)

## Stop Conditions

- STOP if E12-S1 through E12-S4 handoffs are not all available — write a blocked handoff.
- STOP if E3-S6 platform dashboard cannot accept new KPI widgets — escalate.
- STOP if override actions cannot be audit-logged through existing audit infrastructure.
