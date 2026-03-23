# Prompt 44: E9-S6 Versioned Publish and Rollback Control (with UI)

## Sequence Position

- Prompt: 44 of 46
- Epic: 9 — AI Onboarding, Import Review, and Template-Based Publishing
- Story: E9-S6
- Tasks: E9-S6-T1 through E9-S6-T7
- Phase: Enhanced Backend + UI (depends on prompt 42 E9-S5; can run parallel with prompt 43)

## Prerequisites

- E9-S5 (prompt 42 — template application and preview) — preview payloads and readiness validation
- E9-S4 (prompt 40 — review workspace) — approved staged data
- E3-S1 (tenant lifecycle) — tenant config management
- E8-S5 (prompt 45 — domain activation, if available) — publish triggers domain health check
- E13-S1 (prompt 27) — shared UI components
- E13-S5 (prompt 31) — admin shell
- E13-S8 (prompt 34) — platform admin portal

## Context for the Agent

You are building the **versioned publish and rollback** system — the final stage of the onboarding/content pipeline where approved, previewed configurations are published live. Each publish creates a versioned release that can be rolled back to if needed.

**This prompt requires both backend AND frontend implementation.**

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-9.md (section E9-S6)
agents/epics/epic-9-tasks.md (section E9-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### Publish-Release Model
- `PublishRelease`: version number (semver or sequential), status (building/validating/publishing/live/rolled_back/failed), summary metadata, created by, created at
- Status transitions: Building → Validating → Publishing → Live (or Failed at any stage)

### Publish Orchestration
- Pre-publish validation: run same checks as preview readiness (E9-S5) — block publish if validation fails
- Release creation: snapshot current approved config into versioned release
- Activation handoff: switch live configuration pointer to new release

### Rollback
- Last-known-good selection: determine the most recent successful release
- Rollback restore: revert live configuration to selected previous release
- Safety: failed publishes must NEVER corrupt live configuration — atomic swap pattern

### Audit
- All publish and rollback actions fully logged with actor, release version, result, timestamp

## Implementation Scope — Frontend (REQUIRED)

### Tenant Admin — Publish Management
- **Publish page** (`/admin/publishing` or within content settings):
  - **Current Live Release** card: version number, published date, published by, status badge
  - **Publish New Version** button:
    - Pre-publish validation runs → show checklist (pass/fail/warning per check)
    - If all pass: "Publish Now" confirmation with release notes textarea
    - If failures: show blocking issues with fix links
    - Publishing progress indicator during publish
    - Success/failure result display
  - **Release History** DataTable: version, date, status badge, published by, actions (rollback)
  - **Rollback** action: select release → confirmation Modal with warning about potential data implications → restore
  - **Publish Status** timeline for active publish: step-by-step progress (Building → Validating → Publishing → Live)

### Platform Admin — Publishing Oversight
- Extend E13-S8 publishing page (PA-14):
  - Cross-tenant publish activity: recent publishes across all tenants with tenant name, version, status
  - Failed publishes alert list
  - Force-rollback action for platform admin override

## Constraints

- Publish MUST be atomic: either the entire release goes live or none of it does
- Rollback MUST always succeed for the last-known-good release — it's the safety net
- Version numbers must be sequential and never reused
- All publish/rollback actions audit-logged
- Use `@platform/ui` components: DataTable, StatusBadge, Modal, StepperWizard (for publish progress)
- Use `@platform/sdk` — add publish/release methods
- Tenant admin publish page integrates into E13-S5 admin shell
- Platform admin integrates into E13-S8 publishing page

## Validation Commands

```bash
pnpm --filter @platform/api typecheck
pnpm --filter @platform/api test
pnpm --filter web-admin typecheck
pnpm --filter web-admin build
pnpm --filter web-platform-admin typecheck
pnpm --filter web-platform-admin build
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-platform-admin-smoke
```

## Handoff Instructions

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E9-S6-*.md`. Include:
- Publish-release model schema and status transitions
- Atomic publish mechanism
- Rollback selection algorithm and restore behavior
- Frontend: publish page components, validation checklist, rollback flow
- Audit logging for publish/rollback actions
- Files created/modified

## Stop Conditions

- STOP if preview/validation from E9-S5 is not available — implement basic validation checks inline
- STOP if atomic configuration switching cannot be guaranteed — implement with database transaction and document limitations
- STOP if domain activation health check (E8-S5) is not available — skip post-publish domain check, document
