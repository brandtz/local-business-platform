# Prompt 11: E7-S5 Customer Identity and Account History

## Sequence Position

- Prompt: 11 of 18
- Epic: 7
- Story: E7-S5
- Tasks: E7-S5-T1, E7-S5-T2, E7-S5-T3, E7-S5-T4
- Phase: Epic 7 Integration (must wait for prompts 09 and 10 to complete)

## Prerequisites

- Epic 2 must be completed (auth and tenant identity foundations).
- E7-S2 (order lifecycle) must be completed — prompt 09.
- E7-S4 (booking lifecycle) must be completed — prompt 10.
- Read handoff notes from prompts 09 and 10 for order and booking data models.

## Context for the Agent

You are implementing customer identity and account history. Customers can register, sign in, and view their tenant-scoped order and booking history. A critical design consideration: the same person may use multiple businesses on the platform, so customer history must be isolated per tenant even if the underlying identity is shared.

Epic 2 established auth and tenant identity. Your work builds the customer-facing account area that references order records from E7-S2 and booking records from E7-S4. The cross-tenant identity model defines how one person's identity maps to per-tenant customer profiles.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-07.md
agents/epics/epic-07-tasks.md (section E7-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-07/E7-S5-T1.md
agents/epics/packets/epic-07/E7-S5-T2.md
agents/epics/packets/epic-07/E7-S5-T3.md
agents/epics/packets/epic-07/E7-S5-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S2-*.md (order lifecycle and API contracts)
agents/epics/handoffs/YYYY-MM-DD-E7-S4-*.md (booking lifecycle and API contracts)
agents/epics/handoffs/ (E2 auth handoffs for identity model)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (order and booking entities)
platform/apps/api/src/auth/ (existing auth and identity services)
platform/packages/types/src/ (order, booking, and auth types)
agents/design/Portal Design - Customer Portal - account.html (UX reference)
agents/design/Portal Design - Customer Portal - signin register reset.html (UX reference)
```

## Implementation Scope

### E7-S5-T1: Customer Registration and Login
- Implement customer registration, login, and profile retrieval flows in tenant context.
- Customer identity must be scoped to the tenant. Leverage existing auth foundations from Epic 2.

### E7-S5-T2: Account History Queries
- Implement account queries for order history, booking history, and preferences.
- History queries must return only the authenticated customer's records for the current tenant.

### E7-S5-T3: Customer Account Shell
- Connect customer account shell to backend history and profile APIs.
- Account pages must render empty, partial, and populated states correctly.

### E7-S5-T4: Cross-Tenant Identity Behavior
- Define cross-tenant identity behavior for one person using multiple businesses.
- Document how shared identity maps to per-tenant customer profiles.
- Ensure history isolation: Tenant A's orders never appear in Tenant B's account view.

## Constraints

- Customer histories must be isolated per tenant — this is a hard security requirement.
- Account endpoints must return only the authenticated customer's own records.
- Do NOT modify existing auth or role services from Epic 2 — extend or consume them.
- Do NOT implement loyalty, rewards, or saved payment methods — those are future scope.
- Do NOT implement admin-side customer management — that is separate from customer self-service.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
pnpm --filter web-customer typecheck
pnpm --filter web-customer test
```

If customer account pages are browser-visible:

```bash
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S5-T1.md
agents/epics/handoffs/YYYY-MM-DD-E7-S5-T2.md
agents/epics/handoffs/YYYY-MM-DD-E7-S5-T3.md
agents/epics/handoffs/YYYY-MM-DD-E7-S5-T4.md
```

Each handoff must include:
- Task ID and status
- Customer account contract documented
- Cross-tenant identity model and assumptions documented
- History query filters ensuring tenant isolation
- Which E7-S2 and E7-S4 contracts were consumed

Update the active task board accordingly.

## Downstream Consumers

No prompts in this sequence directly depend on E7-S5 output, but customer identity is consumed by:
- Epic 8 notification delivery (customer contact information)
- Epic 9 onboarding (customer-facing setup)

## Stop Conditions

- STOP if E7-S2 or E7-S4 handoffs are not available — write a blocked handoff.
- STOP if cross-tenant identity behavior requires auth schema changes not planned in Epic 2.
- STOP if tenant isolation of customer history cannot be validated with integration tests.
- STOP if the work expands into loyalty, rewards, or admin customer management.
