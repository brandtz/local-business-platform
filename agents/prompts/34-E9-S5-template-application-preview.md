# Prompt 34: E9-S5 Template Application and Preview Generation

## Sequence Position

- Prompt: 34 of 38
- Epic: 9
- Story: E9-S5
- Tasks: E9-S5-T1, E9-S5-T2, E9-S5-T3, E9-S5-T4
- Phase: Epic 9 Preview (must wait for prompt 32 to complete; can run parallel with prompt 33)

## Prerequisites

- E9-S4 (review workspace and approval controls) must be completed — prompt 32. Approved staged data feeds template application.
- E4 (storefront navigation and template regions) — completed.
- E6 (all domain models) — completed. Template applies domain data to layout.
- E6-S5 (vertical template defaults) — completed. Template registry provides layout rules.

## Context for the Agent

You are implementing template application and preview generation — the system that takes approved domain data, tenant configuration, and layout rules from the vertical template, and deterministically produces a preview-ready storefront. The preview must be inspectable before publish.

Determinism is critical: the same input configuration must yield the same preview output. Preview validation checks must verify that navigation works, required content is present, and transactional modules (cart, booking) are functional. Preview URLs and readiness state must be visible to both platform and tenant admin actors in the onboarding flow.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-09.md
agents/epics/epic-09-tasks.md (section E9-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-09/E9-S5-T1.md
agents/epics/packets/epic-09/E9-S5-T2.md
agents/epics/packets/epic-09/E9-S5-T3.md
agents/epics/packets/epic-09/E9-S5-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E9-S4-*.md (review workspace, approved staged data — from prompt 32)
agents/epics/handoffs/YYYY-MM-DD-E9-S1-*.md (onboarding flow, preview integration stubs — from prompt 29)
agents/epics/handoffs/2026-03-21-E6-S5-*.md (vertical template defaults and registry)
agents/epics/handoffs/2026-03-17-E4-*.md (storefront navigation and template regions)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (tenant config, template, domain entities)
platform/packages/types/src/ (template, domain types)
platform/apps/api/src/ (vertical template service, storefront bootstrap)
```

## Implementation Scope

### E9-S5-T1: Template Application Service
- Combine tenant config, approved domain data, and vertical layout rules into a preview payload.
- Deterministic: same inputs produce same output.

### E9-S5-T2: Preview Payload Generation
- Generate preview-ready storefront and admin configuration payloads.
- Include all sections: navigation, content pages, product/service listings, booking configuration.

### E9-S5-T3: Preview Validation Checks
- Validate navigation completeness (all required routes populated).
- Validate content completeness (required pages have content).
- Validate transactional module readiness (cart works if catalog has items, booking works if services exist).
- Incomplete required inputs block preview readiness with actionable reasons.

### E9-S5-T4: Preview URLs and Readiness State
- Expose preview URLs accessible to platform and tenant admin actors.
- Surface readiness state (ready, warnings, blocked) in onboarding and publish workflows (connect to E9-S1-T6 stubs).

## Constraints

- Preview generation must be deterministic — no randomness or non-reproducible behavior.
- Preview must be isolated from live tenant traffic — preview URLs must not be publicly discoverable.
- Incomplete required inputs must block preview with specific reasons, not generic errors.
- Do NOT implement the publish system — that is E9-S6.
- Do NOT modify domain data during preview generation — read-only consumption.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-platform-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E9-S5-T1.md
agents/epics/handoffs/YYYY-MM-DD-E9-S5-T2.md
agents/epics/handoffs/YYYY-MM-DD-E9-S5-T3.md
agents/epics/handoffs/YYYY-MM-DD-E9-S5-T4.md
```

Each handoff must include:
- Task ID and status
- Template application service inputs and outputs
- Preview generation determinism guarantees
- Validation checks and readiness-state contract
- Preview URL pattern and access control
- Onboarding integration connection details
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 36** (E9-S6): Publish flow consumes preview as the release candidate (direct dependency)
- **Prompt 37** (E8-S5): Domain activation consumes publish state which depends on preview readiness

## Stop Conditions

- STOP if E9-S4 approved staged data is not available — write a blocked handoff.
- STOP if vertical template registry from E6-S5 is not operational — escalate.
- STOP if the work expands into publish or domain activation.
