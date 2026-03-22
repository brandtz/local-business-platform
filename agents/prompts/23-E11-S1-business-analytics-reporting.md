# Prompt 23: E11-S1 Business Analytics and Reporting Engine

## Sequence Position

- Prompt: 23 of 38
- Epic: 11
- Story: E11-S1
- Tasks: E11-S1-T1, E11-S1-T2, E11-S1-T3, E11-S1-T4, E11-S1-T5, E11-S1-T6
- Phase: Epic 11 Cross-Cutting Features (can run parallel with prompt 24)

## Prerequisites

- E5-S1 (tenant admin shell with dashboard mount points) — completed.
- E7-S2 (order lifecycle) — completed. Provides order transaction data.
- E7-S4 (booking lifecycle) — completed. Provides booking data.
- E7-S5 (customer identity) — completed. Provides customer data for retention metrics.

## Context for the Agent

You are implementing the business analytics and reporting engine. Business admins need actionable insights: revenue performance, order/booking volumes, channel attribution, top performers, and customer retention metrics. The dashboard shows KPI cards with trend arrows, and the dedicated analytics page provides detailed charts and tables.

Analytics data is computed from order, booking, and customer transaction data via scheduled aggregation jobs. All queries must be tenant-scoped and support time-period and location filtering. The analytics API feeds both dashboard widgets (E5-S1 mount points) and dedicated analytics page views.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-11.md
agents/epics/epic-11-tasks.md (section E11-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read dependency handoffs:

```
agents/epics/handoffs/2026-03-19-E5-S1-*.md (dashboard widget mount points)
agents/epics/handoffs/2026-03-22-E7-S2-*.md (order lifecycle and data model)
agents/epics/handoffs/2026-03-22-E7-S4-*.md (booking lifecycle and data model)
agents/epics/handoffs/2026-03-22-E7-S5-*.md (customer identity and history)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (order, booking, customer entities)
platform/packages/types/src/ (order, booking, customer types)
platform/apps/api/src/ (order and booking services)
agents/design/Portal Design - Business Admin - analytics.html
agents/design/Portal Design - Business Admin dashboard.html
```

## Implementation Scope

### E11-S1-T1: Analytics Data Model
- Define materialized aggregation tables or query views for: revenue, order count, booking count, new/returning customer counts, retention rate, and channel attribution.
- Partition by tenant, location, and time period.

### E11-S1-T2: Analytics Computation Pipeline
- Implement scheduled aggregation jobs computing daily/weekly/monthly rollups from order, booking, and customer transaction data.

### E11-S1-T3: Tenant-Scoped Analytics Query API
- Endpoints for: KPI summary (with trend calculation), revenue time series, volume time series, channel breakdown, top performers (products, staff, locations), and retention metrics.
- All endpoints support time-period and location filter parameters.

### E11-S1-T4: Dashboard Widget Integration
- Define admin dashboard widget data contracts.
- Connect analytics query results to E5-S1 dashboard mount points (KPI cards, revenue chart, traffic chart).

### E11-S1-T5: Analytics Detail Page Views
- Revenue performance chart, volume analysis chart, channel breakdown visual, top performers table, and retention insights panel.

### E11-S1-T6: Export Hooks
- Implement export or download hooks for analytics summaries (CSV or PDF) for business owners.

## Constraints

- All analytics queries must be tenant-scoped — no cross-tenant metric leakage.
- Aggregation jobs must be idempotent and handle re-runs gracefully.
- Analytics data is read-only — no mutations through analytics APIs.
- Do NOT implement real-time streaming analytics — batch/scheduled aggregation only.
- Performance: aggregation queries must remain responsive under realistic data volumes (tens of thousands of orders per tenant).

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E11-S1-T1.md
agents/epics/handoffs/YYYY-MM-DD-E11-S1-T2.md
agents/epics/handoffs/YYYY-MM-DD-E11-S1-T3.md
agents/epics/handoffs/YYYY-MM-DD-E11-S1-T4.md
agents/epics/handoffs/YYYY-MM-DD-E11-S1-T5.md
agents/epics/handoffs/YYYY-MM-DD-E11-S1-T6.md
```

Each handoff must include:
- Task ID and status
- Analytics data model and aggregation table schema
- Computation pipeline schedule and job identifiers
- Query API endpoint contracts with filter parameters
- Dashboard widget integration points
- Export format details
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 27** (E11-S6): Customer subscription revenue channel attribution feeds into analytics (integration hook)
- E12-S5 (Platform admin views) may reference analytics patterns

## Stop Conditions

- STOP if order or booking data models are not stable enough for aggregation — write a blocked handoff.
- STOP if E5-S1 dashboard mount points are not established — escalate.
- STOP if the work expands into real-time analytics or predictive features.
