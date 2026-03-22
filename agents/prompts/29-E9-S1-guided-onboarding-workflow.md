# Prompt 29: E9-S1 Guided Onboarding Workflow

## Sequence Position

- Prompt: 29 of 38
- Epic: 9
- Story: E9-S1
- Tasks: E9-S1-T1, E9-S1-T2, E9-S1-T3, E9-S1-T4, E9-S1-T5, E9-S1-T6
- Phase: Epic 9 Onboarding (must wait for prompt 19 to complete; can run parallel with prompt 30)

## Prerequisites

- E12-S1 (subscription package model) must be completed — prompt 19. Onboarding requires subscription package selection.
- E3 (tenant lifecycle and provisioning) — completed. Onboarding creates tenants.
- E5 (tenant admin infrastructure) — completed. Onboarding flows surface in admin.
- E6-S5 (vertical template defaults) — completed. Onboarding selects vertical template.
- E6-S1/S2 (catalog and services) — completed. Onboarding seeds initial products/services.

## Context for the Agent

You are implementing the guided onboarding workflow — the primary UX flow for platform admins creating new tenant businesses. The core experience is: "I upload details about a business — name, description, images — select a vertical, add a basic set of products or services, and the platform generates a tenant portal."

The onboarding is a multi-step wizard: (1) Business Identity (name, description, logo, cover images, contact info, address), (2) Vertical Selection (from E6-S5 registry with visual previews), (3) Initial Data Seeding (simplified CRUD seeding catalog/service entities), (4) Subscription Selection (from E12-S1 plan comparison), (5) User/Feature Configuration, (6) Preview, (7) Publish. Each step must be saveable and resumable.

There are two actor contexts: platform admins who drive onboarding from start, and tenant admins who may resume to complete remaining steps (hours, detailed content, branding refinement).

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-09.md
agents/epics/epic-09-tasks.md (section E9-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-09/E9-S1-T1.md
agents/epics/packets/epic-09/E9-S1-T2.md
agents/epics/packets/epic-09/E9-S1-T3.md
agents/epics/packets/epic-09/E9-S1-T4.md
agents/epics/packets/epic-09/E9-S1-T5.md
agents/epics/packets/epic-09/E9-S1-T6.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S1-*.md (subscription package model — from prompt 19)
agents/epics/handoffs/2026-03-21-E6-S5-*.md (vertical template defaults)
agents/epics/handoffs/2026-03-20-E6-S1-S3.md (catalog and service entities)
agents/epics/handoffs/2026-03-16-E3-S2-*.md (tenant provisioning)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (tenant, package, catalog, service entities)
platform/packages/types/src/ (all domain types)
platform/apps/api/src/ (tenant provisioning, vertical template, catalog services)
agents/design/Portal Design - Platform Admin - operations.html
```

## Implementation Scope

### E9-S1-T1: Onboarding Stage Model
- Define stages: Business Identity → Vertical Selection → Initial Data Seeding → Subscription Selection → User/Feature Configuration → Preview → Publish.
- Define resume state and actor responsibilities across platform and tenant contexts.

### E9-S1-T2: Orchestration Service
- Implement onboarding orchestration service and progress-tracking persistence.
- Support resume, skip (where allowed), and block conditions per stage.

### E9-S1-T3: Platform-Admin Onboarding Wizard UI
- Step-by-step form flow: business details input, vertical template selection (with visual previews from E6-S5 registry), initial product/service entry (simplified CRUD seeding), subscription package selection (from E12-S1 plan comparison), and user invitation.

### E9-S1-T4: Tenant-Admin Onboarding Resume View
- For cases where tenant owner completes remaining steps: hours, detailed content, branding refinement.

### E9-S1-T5: Checkpoint States
- Define blocking, warning, and complete states for each checkpoint.
- Minimum viable publish requires: business name, at least one product or service, selected vertical, and active subscription (or trial).

### E9-S1-T6: Preview and Publish Connection
- Connect onboarding completion to E9-S5 preview generation and E9-S6 publish flow.
- If E9-S5/S6 not yet available, define the integration contract and leave connection stubs.

## Constraints

- Onboarding must be saveable and resumable — no lost progress on browser close or session timeout.
- Platform admin and tenant admin must have clear actor boundaries — not all steps are available to both.
- Minimum viable publish requirements must be enforced — no publishing without business name, product/service, vertical, and subscription.
- Do NOT implement import/OCR — that is E9-S2/S3.
- Do NOT implement the preview or publish systems — those are E9-S5/S6.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
npx playwright test --project=web-platform-admin-smoke
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E9-S1-T1.md
agents/epics/handoffs/YYYY-MM-DD-E9-S1-T2.md
agents/epics/handoffs/YYYY-MM-DD-E9-S1-T3.md
agents/epics/handoffs/YYYY-MM-DD-E9-S1-T4.md
agents/epics/handoffs/YYYY-MM-DD-E9-S1-T5.md
agents/epics/handoffs/YYYY-MM-DD-E9-S1-T6.md
```

Each handoff must include:
- Task ID and status
- Onboarding state machine (stages, transitions, actor assignments)
- Checkpoint identifiers and blocking/warning rules
- Actor-responsibility model (platform admin vs tenant admin)
- Preview/publish integration stubs or connections
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 34** (E9-S5): Template application and preview generation connects to onboarding T6
- **Prompt 36** (E9-S6): Publish flow connects to onboarding completion

## Stop Conditions

- STOP if E12-S1 package model is not available — write a blocked handoff noting subscription selection cannot be implemented.
- STOP if E6-S5 vertical template registry is not operational — write a blocked handoff.
- STOP if the work expands into import/OCR (E9-S2/S3) or preview/publish (E9-S5/S6).
