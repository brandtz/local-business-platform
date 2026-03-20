# Prompt 05: E6-S5 Vertical Template Defaults

## Sequence Position

- Prompt: 05 of 18
- Epic: 6
- Story: E6-S5
- Tasks: E6-S5-T1, E6-S5-T2, E6-S5-T3, E6-S5-T4
- Phase: Epic 6 Consolidation (must wait for prompts 01, 02, and 03 to complete)

## Prerequisites

- Epic 3 must be completed (tenant provisioning and module/template contracts).
- E6-S1 (catalog domain model) must be completed — prompt 01.
- E6-S2 (service and booking domain model) must be completed — prompt 02.
- E6-S4 (content and SEO domain model) must be completed — prompt 03.
- Verify all four prerequisites on the active task board before starting.
- Read handoff notes from prompts 01, 02, and 03 for domain contract shapes.

## Context for the Agent

You are implementing the vertical template defaults system. The platform supports multiple business types (restaurant, retail, salon, etc.) and each vertical should initialize with sensible module combinations and starter configuration. Templates are configuration-driven — not hard-coded forks. The template system maps onto the catalog, service, and content domain models already built.

Epic 3 established the module registry and template provisioning contracts. Your work connects those to the domain models from E6-S1, E6-S2, and E6-S4 to deliver a complete vertical initialization experience.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-06.md
agents/epics/epic-06-tasks.md (section E6-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-06/E6-S5-T1.md
agents/epics/packets/epic-06/E6-S5-T2.md
agents/epics/packets/epic-06/E6-S5-T3.md
agents/epics/packets/epic-06/E6-S5-T4.md
```

Read dependency handoffs from prompts 01, 02, 03:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S1-T1.md (catalog schema)
agents/epics/handoffs/YYYY-MM-DD-E6-S2-T1.md (service schema)
agents/epics/handoffs/YYYY-MM-DD-E6-S4-T1.md (content schema)
```

Read Epic 3 module/template handoffs:

```
agents/epics/handoffs/ (E3-S5 module registry handoffs)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (all domain entities from E6-S1, S2, S4)
platform/packages/types/src/ (domain types)
platform/apps/api/src/ (module registry from E3)
```

## Implementation Scope

### E6-S5-T1: Configuration Bundles
- Define configuration bundles for each supported vertical (restaurant, retail, salon, etc.).
- Bundles specify which modules are enabled, theme defaults, and starter data sets.

### E6-S5-T2: Domain Mapping
- Map vertical defaults onto catalog, services, content, and operational settings models.
- Each vertical's bundle must produce valid domain entity seeds when applied.

### E6-S5-T3: Template Application Service
- Implement a template-application service to seed or update tenant defaults safely.
- Must not overwrite existing tenant customizations unexpectedly.
- Must be idempotent for initial application.

### E6-S5-T4: Extension Documentation
- Document extension rules for adding new verticals without changing shared runtime assumptions.
- Document the configuration bundle schema and mapping conventions.

## Constraints

- Templates must remain configuration-driven — no hard-coded forks per business type.
- Template application must not overwrite existing tenant customizations.
- Unsupported module or template combinations must be rejected cleanly.
- Do NOT implement frontend vertical selection UI — that is downstream onboarding work.
- Do NOT modify the module registry from Epic 3 — consume it as-is.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

Playwright impact: none.

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S5-T1.md
agents/epics/handoffs/YYYY-MM-DD-E6-S5-T2.md
agents/epics/handoffs/YYYY-MM-DD-E6-S5-T3.md
agents/epics/handoffs/YYYY-MM-DD-E6-S5-T4.md
```

Each handoff must include:
- Task ID and status
- Vertical configuration bundles defined and their module combinations
- Seeding behavior documented (idempotency, customization override rules)
- Extension rules for new verticals

Update the active task board accordingly.

## Downstream Consumers

No prompts in this sequence directly depend on E6-S5 output, but the vertical template system is consumed by:
- Epic 9 onboarding guided setup flows
- Future tenant creation workflows

## Stop Conditions

- STOP if E6-S1, E6-S2, or E6-S4 handoffs are not yet available — write a blocked handoff.
- STOP if Epic 3 module registry contracts are not stable.
- STOP if the work requires modifying the module registry rather than consuming it.
- STOP if template application starts overwriting tenant customizations without safeguards.
