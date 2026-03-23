# Prompt 41: E12-S5 Platform Admin Subscription and Revenue Views (with UI)

## Sequence Position

- Prompt: 41 of 46
- Epic: 12 — SaaS Subscription Management & Platform Billing
- Story: E12-S5
- Tasks: E12-S5-T1 through E12-S5-T6
- Phase: Enhanced Backend + UI (depends on prompt 39 E12-S4; can run parallel with prompt 42)

## Prerequisites

- E12-S1 (subscription packages) — completed
- E12-S3 (prompt 36 — billing integration) — billing data
- E12-S4 (prompt 39 — subscription lifecycle) — subscription state machine
- E3-S6 (dashboard widgets) — completed
- E13-S1 (prompt 27) — shared UI components
- E13-S8 (prompt 34) — platform admin portal

## Context for the Agent

You are building the **platform-level subscription analytics and revenue views** — KPI aggregation (MRR, churn, ARPU), a subscription list page, tenant billing detail views, and dashboard integration. This is the platform operator's financial command center.

**This prompt requires both backend AND frontend implementation.** Build the aggregation queries backend, then build rich data-visualization UI in the Platform Admin portal.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md (section E12-S5)
agents/epics/epic-12-tasks.md (section E12-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### KPI Aggregation
- Monthly Recurring Revenue (MRR): sum of active subscription monthly values
- Active subscribers count, trial count
- Churn rate: percentage of cancelled subscriptions over period
- ARPU (Average Revenue Per User): MRR / active subscribers
- Failed payment count and amount

### Subscription List Read Model
- Denormalized view: tenant name, plan name, subscription status, MRR contribution, start date, next billing date
- Filterable by status, plan, date range
- Sortable by MRR, start date, tenant name

### Tenant Billing Detail Read Model
- Subscription history for a tenant
- Invoice history with amounts, status (paid/failed/pending)
- Override action endpoints: extend trial, apply credit (comp), force-cancel with audit logging

## Implementation Scope — Frontend (REQUIRED)

### Platform Dashboard KPI Integration
- Add KPI MetricCards to platform dashboard (extend E13-S8 dashboard):
  - MRR with trend (up/down % vs last month)
  - Active Subscribers count with trend
  - Churn Rate % with trend
  - Trial Count (converting soon / expiring)
- MRR trend chart: line chart showing MRR over last 6/12 months

### Subscription List Page
- **Subscription list** (`/platform/subscriptions`):
  - DataTable: tenant name, plan, status badge, MRR, start date, next billing, actions
  - SearchToolbar: search by tenant name, filter by status tabs (All, Active, Trial, Past Due, Cancelled, Suspended), filter by plan
  - Pagination
  - Click row → tenant billing detail

### Tenant Billing Detail Page
- **Billing detail** (`/platform/subscriptions/:tenantId` or within tenant detail from E13-S8):
  - Subscription summary card: plan, status, MRR, start date, trial end date (if trialing)
  - Subscription timeline: visual history of state transitions
  - Invoice history DataTable: invoice #, date, amount, status badge, actions (view, retry)
  - Override actions panel:
    - "Extend Trial" → Modal: days, reason
    - "Apply Credit / Comp" → Modal: amount or comp plan, reason, duration
    - "Force Cancel" → Modal: immediate vs end-of-cycle, reason
    - All actions require confirmation and are audit-logged
  - Action history: DataTable of override actions taken on this tenant

## Constraints

- MRR calculations must be real-time or near-real-time (computed queries, not stale snapshots)
- Override actions MUST be audit-logged with actor and reason
- Use chart library consistent with E13-S5/E13-S8 dashboards
- Use `@platform/ui` components: MetricCard, DataTable, StatusBadge, Modal, SearchToolbar
- Use `@platform/sdk` — add subscription analytics methods to platform namespace
- All pages integrate into E13-S8 platform admin portal

## Validation Commands

```bash
pnpm --filter @platform/api typecheck
pnpm --filter @platform/api test
pnpm --filter web-platform-admin typecheck
pnpm --filter web-platform-admin build
npx playwright test --project=web-platform-admin-smoke
```

## Handoff Instructions

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E12-S5-*.md`. Include:
- KPI aggregation query implementations
- Subscription list read model schema
- Override action audit logging
- Frontend: dashboard KPI cards, subscription list page, billing detail page
- Chart integration
- Files created/modified

## Stop Conditions

- STOP if subscription data from E12-S3/S4 is insufficient for MRR calculation — implement with mock data and document
- STOP if chart library is not available — implement with numeric displays only, add TODO for charts
- STOP if override actions require billing provider API calls not yet implemented — implement as state-only changes and document
