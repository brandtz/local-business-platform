# Prompt 19: E12-S1 Subscription Package and Tier Model

## Sequence Position

- Prompt: 19 of 38
- Epic: 12
- Story: E12-S1
- Tasks: E12-S1-T1, E12-S1-T2, E12-S1-T3, E12-S1-T4, E12-S1-T5
- Phase: Epic 12 Foundation (can run parallel with prompt 20)

## Prerequisites

- E3-S5 (module assignment and template registry) — completed. See E3 handoff notes.
- All E6 domain contracts stabilized — see E6 handoff notes.
- Read the full E12 epic overview for billing context.

## Context for the Agent

You are implementing the SaaS subscription package and tier model — the foundational building block for platform billing. This defines the packages that tenants subscribe to, what features and limits each tier includes, and how packages evolve over time without breaking existing subscribers.

This is distinct from E11-S6 (customer-facing recurring orders within a tenant). Here, the "customer" is the tenant (business owner) paying the platform. The package model must be rich enough to support plan comparison UIs, feature gating (E12-S2), billing integration (E12-S3), and the onboarding wizard's subscription selection step (E9-S1).

Every downstream E12 story depends on this one. Get the schema and entitlement mapping right — everything else builds on it.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md
agents/epics/epic-12-tasks.md (section E12-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-12/E12-S1-T1.md
agents/epics/packets/epic-12/E12-S1-T2.md
agents/epics/packets/epic-12/E12-S1-T3.md
agents/epics/packets/epic-12/E12-S1-T4.md
agents/epics/packets/epic-12/E12-S1-T5.md
```

Read dependency handoffs:

```
agents/epics/handoffs/2026-03-16-E3-S5-*.md (module assignment and template registry)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (E3 module assignment entities)
platform/packages/types/src/ (existing domain types)
platform/contracts/ (existing contract files)
```

## Implementation Scope

### E12-S1-T1: Subscription Package Schema
- Define subscription package schema: name, description, billing interval (monthly/annual), base price, trial duration, status (active/deprecated), and sort order.
- Add Prisma schema entities and migrations.

### E12-S1-T2: Feature Entitlement Schema
- Define per-package list of enabled modules (catalog, services, bookings, quotes, portfolio, loyalty, analytics).
- Define transaction/usage limits (orders per month, storage GB, staff seats).
- Define premium feature flags.
- Entitlements must be consumable by E3-S5 module gating and E12-S2 feature gates.

### E12-S1-T3: Package CRUD Services
- Implement package CRUD for platform admin: create, update, deprecate (soft-disable for new subscriptions while grandfathering existing), and list with entitlement details.
- Deprecation prevents new subscriptions but preserves existing subscribers on the deprecated plan.

### E12-S1-T4: Package Comparison Read Model
- Define structured contract for displaying plan comparison tables (feature x tier matrix).
- Usable in both platform admin and tenant admin contexts.
- Must provide all data needed for the plan-picker UI in onboarding (E9-S1).

### E12-S1-T5: Package Versioning Strategy
- When entitlements change, existing subscribers retain their contracted entitlements until they explicitly upgrade or their renewal cycle applies the new terms.
- Define the versioning contract and grandfathering rules.

## Constraints

- Package schema must be tenant-agnostic — packages are platform-level, not per-tenant.
- Entitlement structure must be extensible without breaking existing consumers.
- Do NOT implement billing integration — that is E12-S3.
- Do NOT implement subscription lifecycle — that is E12-S4.
- Do NOT implement feature gating enforcement — that is E12-S2.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

Playwright impact: none (no browser-visible changes in this story).

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S1-T1.md
agents/epics/handoffs/YYYY-MM-DD-E12-S1-T2.md
agents/epics/handoffs/YYYY-MM-DD-E12-S1-T3.md
agents/epics/handoffs/YYYY-MM-DD-E12-S1-T4.md
agents/epics/handoffs/YYYY-MM-DD-E12-S1-T5.md
```

Each handoff must include:
- Task ID and status
- Package schema fields and types
- Entitlement mapping contract (module list, limits, flags)
- Versioning and grandfathering rules
- Comparison read model shape
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 26** (E12-S2): Feature gating consumes entitlement schema (direct dependency)
- **Prompt 28** (E12-S3): Billing integration creates billing subscriptions for packages (direct dependency)
- **Prompt 29** (E9-S1): Onboarding wizard uses package comparison model for subscription selection (direct dependency)
- **Prompts 31–36** rely on the package model transitively through E12-S2, S3, and E9

## Stop Conditions

- STOP if E3-S5 module assignment handoff is missing — write a blocked handoff.
- STOP if the work expands into billing integration or subscription lifecycle.
- STOP if entitlement schema cannot cleanly map to E3-S5 module assignment output.
