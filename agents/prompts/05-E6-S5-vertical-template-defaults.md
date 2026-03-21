# Prompt 05: E6-S5 Vertical Template Defaults

## Sequence Position

- Prompt: 05 of 15 (remaining)
- Epic: 6
- Story: E6-S5
- Tasks: E6-S5-T1, E6-S5-T2, E6-S5-T3, E6-S5-T4, E6-S5-T5
- Phase: Epic 6 Consolidation (must wait for prompt 03 to complete)

## Prerequisites

- Epic 3 must be completed (tenant provisioning and module/template contracts).
- E6-S1 (catalog domain model) — already completed. See handoff `agents/epics/handoffs/2026-03-20-E6-S1-S3.md`.
- E6-S2 (service and booking domain model) — already completed. See same handoff above.
- E6-S4 (content and SEO domain model) must be completed — prompt 03.
- Verify E6-S4 completion on the active task board before starting.
- Read handoff notes from prompt 03 for content domain contract shapes.
- Read handoff `agents/epics/handoffs/2026-03-20-E6-S1-S3.md` for catalog and service domain contract shapes.

## Context for the Agent

You are implementing the vertical template defaults system. The platform supports multiple business types (restaurant, retail, salon, etc.) and each vertical should initialize with sensible module combinations and starter configuration. Templates are configuration-driven — not hard-coded forks. The template system maps onto the catalog, service, and content domain models already built.

Epic 3 established the module registry and template provisioning contracts. Your work connects those to the domain models from E6-S1, E6-S2, and E6-S4 to deliver a complete vertical initialization experience.

> **Contractor Vertical Pilot Note:** The first pilot customer is a roofing/gutter contractor. Their storefront needs: portfolio showcase, service descriptions, inquiry form submissions, consultation booking, and quote/estimate management. This vertical does NOT need: product catalog ordering, cart/checkout, loyalty, or subscriptions. The contractor vertical proves that verticals must enable/disable modules at a granular level and seed appropriate starter content.

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
agents/epics/packets/epic-06/E6-S5-T5.md
```

Read dependency handoffs:

```
agents/epics/handoffs/2026-03-20-E6-S1-S3.md (catalog and service domain contracts)
agents/epics/handoffs/YYYY-MM-DD-E6-S4-*.md (content domain contracts — from prompt 03)
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

### E6-S5-T4: Inquiry Form Configuration
- Define inquiry-form configuration as a template-level option — for verticals like contractor that use lead-capture rather than direct ordering.
- Enable a storefront inquiry/contact form that creates a lead record (name, email, phone, message, service interest).

### E6-S5-T5: Extension Documentation
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
agents/epics/handoffs/YYYY-MM-DD-E6-S5-T5.md
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

- STOP if E6-S4 handoffs are not yet available — write a blocked handoff. (E6-S1 and E6-S2 are already completed.)
- STOP if Epic 3 module registry contracts are not stable.
- STOP if the work requires modifying the module registry rather than consuming it.
- STOP if template application starts overwriting tenant customizations without safeguards.
