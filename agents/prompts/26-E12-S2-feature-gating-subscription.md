# Prompt 26: E12-S2 Feature Gating by Subscription Tier

## Sequence Position

- Prompt: 26 of 38
- Epic: 12
- Story: E12-S2
- Tasks: E12-S2-T1, E12-S2-T2, E12-S2-T3, E12-S2-T4, E12-S2-T5
- Phase: Epic 12 Gating (must wait for prompt 19 to complete; can run parallel with prompt 25)

## Prerequisites

- E12-S1 (subscription package and tier model) must be completed — prompt 19.
- E3-S5 (module assignment and template registry) — completed.
- E5-S1 (tenant admin shell and navigation) — completed.
- E4-S3 (storefront navigation and template regions) — completed.

## Context for the Agent

You are implementing feature gating by subscription tier. The subscription entitlements defined in E12-S1 become the authoritative source of feature availability for each tenant. This affects both backend (API endpoint access) and frontend (navigation, route guards, upgrade prompts).

When a tenant's subscription doesn't include a feature, backend endpoints return structured denials (HTTP 403 with upgrade-prompt payload), and the frontend hides or disables navigation items with upgrade call-to-action prompts. Downgrading from a higher tier must preserve data (read-only, not deleted). Usage limits (e.g., orders per month) need soft and hard limit enforcement with warning notifications.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md
agents/epics/epic-12-tasks.md (section E12-S2)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-12/E12-S2-T1.md
agents/epics/packets/epic-12/E12-S2-T2.md
agents/epics/packets/epic-12/E12-S2-T3.md
agents/epics/packets/epic-12/E12-S2-T4.md
agents/epics/packets/epic-12/E12-S2-T5.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S1-*.md (package schema and entitlement model — from prompt 19)
agents/epics/handoffs/2026-03-16-E3-S5-*.md (module assignment)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (E12-S1 package entities)
platform/packages/types/src/ (package and entitlement types)
platform/apps/api/src/ (E3-S5 module assignment, auth guards)
```

## Implementation Scope

### E12-S2-T1: Entitlement Consumption in Module Assignment
- Extend E3-S5 module assignment to consume subscription-tier entitlements as authoritative source of feature availability.
- Subscription entitlements override or merge with manual module assignments.

### E12-S2-T2: Backend Feature-Gate Middleware
- API endpoints and service methods check tenant's active subscription entitlements before processing.
- Return structured denial (HTTP 403 with upgrade-prompt payload) for unentitled features.

### E12-S2-T3: Frontend Feature-Gating Contract
- Navigation items, route guards, and CTA components consume entitlement state.
- Show/hide/disable/upgrade-prompt for unentitled features.

### E12-S2-T4: Grace Period and Downgrade Behavior
- On downgrade, determine which data becomes read-only vs hidden vs archived.
- Ensure no data loss on downgrade.

### E12-S2-T5: Usage-Limit Enforcement
- Enforce soft and hard limits for transaction-limited packages (e.g., 100 orders/month).
- Warning notifications before hard cutoff.

## Constraints

- Feature gating must NOT be bypassable by direct API calls — enforce at middleware level.
- Downgrade must NEVER delete data — read-only degradation only.
- Usage limits must have both soft warnings and hard cutoffs.
- Do NOT implement the billing flow — that is E12-S3.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S2-T1.md
agents/epics/handoffs/YYYY-MM-DD-E12-S2-T2.md
agents/epics/handoffs/YYYY-MM-DD-E12-S2-T3.md
agents/epics/handoffs/YYYY-MM-DD-E12-S2-T4.md
agents/epics/handoffs/YYYY-MM-DD-E12-S2-T5.md
```

Each handoff must include:
- Task ID and status
- Entitlement consumption contract (how module assignment reads from subscription)
- Backend denial response schema (403 + upgrade payload)
- Frontend gating integration points
- Downgrade data-preservation rules
- Usage-limit thresholds and notification triggers
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 31** (E12-S4): Subscription lifecycle changes trigger entitlement recalculation
- **Prompt 33** (E12-S5): Platform admin views show entitlement state per tenant
- **Prompt 35** (E12-S6): Tenant admin billing shows current entitlements and upgrade options

## Stop Conditions

- STOP if E12-S1 package schema or entitlement model is not available — write a blocked handoff.
- STOP if E3-S5 module assignment cannot be extended to consume entitlements — escalate.
- STOP if feature gating would require modifying core service logic rather than wrapping with guards.
