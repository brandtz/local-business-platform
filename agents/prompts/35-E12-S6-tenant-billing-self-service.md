# Prompt 35: E12-S6 Tenant Admin Billing Self-Service

## Sequence Position

- Prompt: 35 of 38
- Epic: 12
- Story: E12-S6
- Tasks: E12-S6-T1, E12-S6-T2, E12-S6-T3, E12-S6-T4, E12-S6-T5
- Phase: Epic 12 Tenant Billing (must wait for prompt 31 to complete; can run parallel with prompt 36)

## Prerequisites

- E12-S1 through E12-S4 (package model, feature gating, billing integration, lifecycle) must all be completed — prompts 19, 26, 28, 31.
- E5-S2 (business profile and brand configuration) — completed. Billing section integrates into tenant settings.

## Context for the Agent

You are implementing the tenant admin billing self-service — the interface where business owners manage their subscription, payment method, and invoices without needing platform admin assistance.

The billing section lives in tenant admin settings and shows: current plan with features summary, next invoice date and estimated amount, payment method on file. Tenants can browse available plans, preview proration for upgrade/downgrade, update their payment method (via billing provider's secure UI), view invoice history with PDF downloads, and cancel with a clear explanation of consequences.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md
agents/epics/epic-12-tasks.md (section E12-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-12/E12-S6-T1.md
agents/epics/packets/epic-12/E12-S6-T2.md
agents/epics/packets/epic-12/E12-S6-T3.md
agents/epics/packets/epic-12/E12-S6-T4.md
agents/epics/packets/epic-12/E12-S6-T5.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S1-*.md (package model, comparison read model — from prompt 19)
agents/epics/handoffs/YYYY-MM-DD-E12-S3-*.md (billing integration, payment method flow — from prompt 28)
agents/epics/handoffs/YYYY-MM-DD-E12-S4-*.md (subscription lifecycle, proration — from prompt 31)
agents/epics/handoffs/2026-03-19-E5-S2-*.md (business profile and settings)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (subscription, billing entities)
platform/packages/types/src/ (billing types)
platform/apps/api/src/ (billing provider, subscription lifecycle services)
agents/design/Portal Design - Business Admin - settings and activity log.html
```

## Implementation Scope

### E12-S6-T1: Billing Section in Settings
- Current plan card: name, features summary, price, billing interval.
- Next invoice date and estimated amount.
- Payment method on file (last-4, expiry).

### E12-S6-T2: Plan-Change Flow
- Browse available plans (using E12-S1 comparison model).
- Select upgrade/downgrade.
- View proration preview (from E12-S4).
- Confirm change.

### E12-S6-T3: Payment-Method Update Flow
- Add or replace card via billing provider's secure UI component (Stripe Elements or equivalent).
- Display current method with last-4 and expiry.
- Never handle raw card data.

### E12-S6-T4: Invoice History View
- List of past invoices with date, amount, status (paid/failed/pending).
- PDF download link per invoice.

### E12-S6-T5: Cancellation Flow
- Cancel button with confirmation dialog.
- Explain grace period, data retention policy, and re-subscription options.
- Cancellation reason capture (optional).

## Constraints

- Payment method flow must NEVER expose full card numbers — use billing provider's secure UI.
- Plan-change must show accurate proration _before_ confirmation — no surprises.
- Cancellation must clearly explain consequences (grace period, suspension, data retention).
- Self-service actions must respect subscription lifecycle rules from E12-S4 (e.g., minimum commitment).
- Do NOT implement platform admin override actions — that is E12-S5.

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
agents/epics/handoffs/YYYY-MM-DD-E12-S6-T1.md
agents/epics/handoffs/YYYY-MM-DD-E12-S6-T2.md
agents/epics/handoffs/YYYY-MM-DD-E12-S6-T3.md
agents/epics/handoffs/YYYY-MM-DD-E12-S6-T4.md
agents/epics/handoffs/YYYY-MM-DD-E12-S6-T5.md
```

Each handoff must include:
- Task ID and status
- Billing settings UI data contracts
- Plan-change proration preview integration
- Payment method secure UI integration details
- Cancellation flow messaging and reason capture
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

No prompts in this sequence directly depend on E12-S6. The tenant billing self-service completes the E12 epic.

## Stop Conditions

- STOP if E12-S4 subscription lifecycle (proration preview, cancellation rules) is not available — write a blocked handoff.
- STOP if billing provider secure UI component (Stripe Elements) integration is not feasible — escalate.
- STOP if the work expands into platform admin override actions (E12-S5).
