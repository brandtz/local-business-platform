# Prompt 43: E12-S6 Tenant Admin Billing Self-Service (with UI)

## Sequence Position

- Prompt: 43 of 46
- Epic: 12 — SaaS Subscription Management & Platform Billing
- Story: E12-S6
- Tasks: E12-S6-T1 through E12-S6-T7
- Phase: Enhanced Backend + UI (depends on prompt 39 E12-S4; can run parallel with prompt 44)

## Prerequisites

- E12-S1 (subscription packages) — completed
- E12-S3 (prompt 36 — billing integration, Stripe Elements) — payment method management
- E12-S4 (prompt 39 — subscription lifecycle) — state machine, proration
- E13-S1 (prompt 27) — shared UI components
- E13-S5 (prompt 31) — admin shell

## Context for the Agent

You are building the **tenant admin billing self-service** — a Billing section in the Business Admin settings where tenant admins can view their current plan, manage payment methods, view invoice history, change plans, and cancel subscriptions.

**This prompt is UI-dominant** with supporting backend endpoints. The billing provider integration (E12-S3) and subscription lifecycle (E12-S4) provide the data — this story builds the self-service interface.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md (section E12-S6)
agents/epics/epic-12-tasks.md (section E12-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### Billing Settings Read Model
- Current plan details: name, features summary, monthly/annual price, billing cycle date
- Next invoice: date, estimated amount
- Payment method on file: card brand, last 4, expiry (from billing provider)

### Plan Change Flow
- Plan comparison endpoint: side-by-side features for current vs target plan
- Proration preview: credit for remaining days on current plan, charge for new plan, net amount
- Apply plan change with confirmation

### Invoice Management
- Invoice list with pagination: invoice #, date, amount, status, PDF link
- Invoice PDF retrieval (from billing provider or generated)

### Cancellation Flow
- Cancellation endpoint with reason capture
- Grace period and data retention info
- Cancellation confirmation with consequences messaging

## Implementation Scope — Frontend (REQUIRED)

### Admin Settings — Billing Section
- Add **Billing** section to admin settings sidebar (in E13-S5 admin shell)

### Current Plan Card (`/admin/settings/billing`)
- Plan name with badge (e.g., "Professional")
- Feature summary: bullet list of included features/modules
- Billing cycle: "Monthly" or "Annual", next billing date
- "Change Plan" button
- "Cancel Subscription" link (styled subtly — destructive action)

### Payment Method Card
- Card on file: brand icon (Visa/MC/Amex), •••• last4, exp MM/YY
- "Update Payment Method" button → Stripe Elements secure embed or modal
- If no card: "Add Payment Method" CTA

### Invoice History
- DataTable: invoice #, date, amount, status badge (Paid/Failed/Pending), PDF download icon
- Pagination
- Click row → view invoice detail or download PDF

### Plan Change Flow
- **Plan comparison page** (`/admin/settings/billing/change-plan`):
  - Side-by-side plan cards showing: name, price, features list, module access
  - Current plan highlighted
  - Select new plan → proration preview:
    - "Credit for X days remaining on [Current Plan]"
    - "Charge for [New Plan] starting today"
    - "Net: $X.XX"
  - Confirm button with billing date
  - Success confirmation

### Cancellation Flow
- **Cancel subscription dialog** (Modal):
  - Consequences messaging: "Your account will remain active until [date]", "After cancellation, you will lose access to [features]", "Your data will be retained for X days"
  - Optional reason capture: dropdown (too expensive, missing features, switching providers, other) + textarea
  - "Cancel My Subscription" button (red/destructive)
  - Confirmation: "Your subscription has been cancelled. Active until [date]."

## Constraints

- Payment method update MUST use Stripe Elements (secure iframe) — NEVER collect raw card numbers
- Plan change proration must match billing provider calculations exactly
- Cancellation must show clear consequences before confirming
- Invoice PDFs: link to billing provider-hosted PDF or generate simple PDF server-side
- Use `@platform/ui` components: DataTable, Modal, FormSection, StatusBadge, MetricCard
- Use `@platform/sdk` — add billing self-service methods to tenant namespace
- Integrates into E13-S5 admin settings sidebar

## Validation Commands

```bash
pnpm --filter @platform/api typecheck
pnpm --filter @platform/api test
pnpm --filter web-admin typecheck
pnpm --filter web-admin build
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E12-S6-*.md`. Include:
- Billing settings read model API contracts
- Plan comparison and proration preview endpoints
- Stripe Elements integration approach for payment method
- Frontend: billing page components, plan change flow, cancellation dialog
- Invoice PDF retrieval approach
- Files created/modified

## Stop Conditions

- STOP if Stripe Elements cannot be embedded due to CSP or build config — implement text-based card management placeholder and document
- STOP if proration preview endpoint from E12-S4 not available — show estimated proration with disclaimer
- STOP if invoice PDF endpoint not available — show invoice detail as HTML page instead
