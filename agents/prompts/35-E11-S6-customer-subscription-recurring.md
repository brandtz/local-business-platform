# Prompt 35: E11-S6 Customer Subscription and Recurring Orders (with UI)

## Sequence Position

- Prompt: 35 of 46
- Epic: 11 — Cross-Cutting Platform Capabilities
- Story: E11-S6
- Tasks: E11-S6-T1 through E11-S6-T8
- Phase: Enhanced Backend + UI (can run parallel with prompt 36)

## Prerequisites

- E7-S1 (cart, pricing, orders) — completed
- E8-S2 (payment processing) — completed
- E11-S1 (analytics) — completed
- E13-S1 (prompt 27) — shared UI components and SDK client
- E13-S5 (prompt 31) — admin shell
- E13-S4 (prompt 30) — customer account area

## Context for the Agent

You are building the **customer subscription and recurring order** system. This includes backend subscription plan and lifecycle management, renewal automation, AND the corresponding frontend UI in both the Business Admin and Customer portals.

**This prompt requires both backend AND frontend implementation.** After completing the backend services, schemas, and APIs, you MUST also build the Vue frontend pages that surface this functionality.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-11.md (section E11-S6)
agents/epics/epic-11-tasks.md (section E11-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/design/screen-reference-index.md
```

Read dependency handoffs from E13 prompts and completed backend work.

## Implementation Scope — Backend

### Subscription Plan Schema
- Plan entity: name, description, frequency (weekly/biweekly/monthly), pricing, cancellation policy, eligible items/services
- Customer subscription: plan reference, customer, status (active/paused/cancelled/expired), next renewal date, payment method

### Subscription Lifecycle Services
- Subscribe, pause, resume, cancel actions with state machine transitions
- Renewal automation job: create orders on schedule, charge saved payment method
- Failed renewal retry pipeline with configurable retry intervals
- Notification hooks for upcoming renewal, successful charge, failed charge

### Analytics Integration
- Subscription channel attribution hooks for E11-S1 analytics

## Implementation Scope — Frontend (REQUIRED)

### Business Admin — Subscription Management
- **Subscription Plans page** (`/admin/subscriptions/plans`): DataTable of plans with CRUD via SlidePanel. Fields: name, frequency, pricing, eligible items, cancellation policy.
- **Subscriber List page** (`/admin/subscriptions/subscribers`): DataTable of active subscriptions with status filter tabs (Active, Paused, Cancelled, Expired). Columns: customer, plan, status, next renewal, created date. Row actions: extend, adjust, cancel on behalf.
- **Subscriber Detail SlidePanel**: subscription details, billing history, override actions

### Customer Portal — My Subscriptions
- **Subscriptions tab** in account area (`/account/subscriptions`): list of active/paused/cancelled subscriptions
- **Subscription card**: plan name, frequency, next renewal date, price, status badge
- **Actions**: Pause/Resume toggle, Cancel with confirmation modal, View billing history
- **Upcoming renewal notice**: highlight next charge date and amount

## Constraints

- Use `@platform/ui` components (DataTable, SlidePanel, StatusBadge, FormSection, Modal) — no custom implementations
- Use `@platform/sdk` for all API calls — add new subscription methods to SDK client
- Payment method charges must go through E8-S2 payment processing — no separate payment logic
- All admin pages integrate into the `web-admin` AppShell from E13-S5
- Customer pages integrate into customer account layout from E13-S4

## Validation Commands

```bash
pnpm --filter @platform/api typecheck
pnpm --filter @platform/api test
pnpm --filter web-admin typecheck
pnpm --filter web-admin build
pnpm --filter web-customer typecheck
pnpm --filter web-customer build
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E11-S6-*.md` for each task. Each handoff must include:
- Backend: schema changes, API contracts, state machine transitions, renewal job details
- Frontend: Vue component paths, routes added, SDK methods added, UI component usage
- Playwright test coverage for both admin and customer subscription flows
- Files created/modified

## Stop Conditions

- STOP if E8-S2 payment processing cannot handle recurring charges — document and escalate
- STOP if E13-S1 components not available — build backend only with blocked handoff for UI
- STOP if renewal job scheduling infrastructure (BullMQ) is not configured — document setup needs
