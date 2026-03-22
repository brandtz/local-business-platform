# Prompt 36: E9-S6 Versioned Publish and Rollback

## Sequence Position

- Prompt: 36 of 38
- Epic: 9
- Story: E9-S6
- Tasks: E9-S6-T1, E9-S6-T2, E9-S6-T3, E9-S6-T4
- Phase: Epic 9 Onboarding Finalisation (must wait for prompt 34 to complete; can run parallel with prompt 35)

## Prerequisites

- E9-S5 (template application and preview) — prompt 34 must be completed. Published versions derive from validated previews.
- E9-S4 (review workspace and approval) — prompt 32 must be completed. Approval gates publishing.
- E8-S3 (content versioning and scheduling) — completed. Import content follows the same versioning model.

## Context for the Agent

You are implementing the versioned publish and rollback system — the final step of the onboarding/import pipeline where approved merchant data is atomically published to the live tenant schema.

The publish operation creates a numbered release (version N+1) from the approved review workspace. Each release is an immutable snapshot. Rollback reverts the live tenant to version N-1hydraulically — without data loss. Partial publishes are NOT supported — all-or-nothing atomicity.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-09.md
agents/epics/epic-09-tasks.md (section E9-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-09/E9-S6-T1.md
agents/epics/packets/epic-09/E9-S6-T2.md
agents/epics/packets/epic-09/E9-S6-T3.md
agents/epics/packets/epic-09/E9-S6-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E9-S5-*.md (preview validated, ready for publish — from prompt 34)
agents/epics/handoffs/YYYY-MM-DD-E9-S4-*.md (approval controls, gating rules — from prompt 32)
agents/epics/handoffs/2026-03-19-E8-S3-*.md (content versioning model)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (review workspace, content version entities)
platform/packages/types/src/ (import pipeline, version types)
platform/apps/api/src/ (review workspace, content services)
```

## Implementation Scope

### E9-S6-T1: Publish Release Model
- Schema for release snapshots: release_id, version_number, tenant_id, source (import/manual), published_at, published_by.
- Immutable once created — no updates allowed.
- Auto-incrementing version within tenant scope.

### E9-S6-T2: Publish Orchestration
- Transaction that atomically copies approved review workspace to live tenant tables.
- All-or-nothing — if any entity write fails, roll back the entire transaction.
- Clear live-content cache after successful publish.
- BullMQ job for publish execution (may take time for large imports).

### E9-S6-T3: Rollback Mechanism
- Revert to any previous release version.
- Rollback creates version N+1 that is a copy of version N-1 (not destructive rewrite).
- Must handle foreign key references properly (categories → items → modifiers).
- Platform admin and tenant admin can initiate rollback.

### E9-S6-T4: Publish and Rollback Admin UI
- Publish button (disabled until review workspace is approved).
- Release history with version number, date, initiator, and release type (import/rollback/manual).
- Rollback action per release with confirmation dialog.
- Progress indicator during publish/rollback execution.

## Constraints

- Publish is atomic — partial publish is a system error, not a feature.
- Rollback must never destroy release snapshots — always append-only version history.
- Publish must clear relevant caches (menu, storefront) after completion.
- Do NOT implement incremental/differential publish — full snapshot only for this story.
- Foreign key ordering during publish must be correct: categories before items, items before modifiers.

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
agents/epics/handoffs/YYYY-MM-DD-E9-S6-T1.md
agents/epics/handoffs/YYYY-MM-DD-E9-S6-T2.md
agents/epics/handoffs/YYYY-MM-DD-E9-S6-T3.md
agents/epics/handoffs/YYYY-MM-DD-E9-S6-T4.md
```

Each handoff must include:
- Task ID and status
- Release model schema additions
- Publish orchestration flow (transaction, BullMQ job, cache clear)
- Rollback mechanism and version append logic
- Admin UI data contracts and component locations
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

- Prompt 37 (E8-S5 Domain Activation Full Implementation) — needs the publish system to activate domains against published content.

## Stop Conditions

- STOP if E9-S5 preview/validation is not in place — write a blocked handoff.
- STOP if the work expands into differential publish or conflict resolution.
- STOP if review workspace approval gating from E9-S4 is missing.
