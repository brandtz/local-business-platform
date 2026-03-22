# Prompt 32: E9-S4 Review Workspace and Approval Controls

## Sequence Position

- Prompt: 32 of 38
- Epic: 9
- Story: E9-S4
- Tasks: E9-S4-T1, E9-S4-T2, E9-S4-T3, E9-S4-T4
- Phase: Epic 9 Review (must wait for prompt 30 to complete; can run parallel with prompt 31)

## Prerequisites

- E9-S3 (OCR, extraction, and domain mapping) must be completed — prompt 30.
- E5 (tenant admin infrastructure) — completed. Review screens live in tenant admin.

## Context for the Agent

You are implementing the review workspace and approval controls — the human-in-the-loop stage where extracted data is reviewed, corrected, and approved before it becomes canonical domain data. After E9-S3 produces staged extraction candidates with confidence scores, this story provides the UI and API for reviewing, editing, and approving those candidates.

The review workspace must clearly distinguish between approved, rejected, edited, and blocked items. Low-confidence extractions and validation failures must be gated — they cannot bypass approval. Staged corrections must not mutate already-published canonical data. This is the quality gate between AI extraction and live data.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-09.md
agents/epics/epic-09-tasks.md (section E9-S4)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-09/E9-S4-T1.md
agents/epics/packets/epic-09/E9-S4-T2.md
agents/epics/packets/epic-09/E9-S4-T3.md
agents/epics/packets/epic-09/E9-S4-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E9-S3-*.md (staged extraction schema, confidence model — from prompt 30)
agents/epics/handoffs/YYYY-MM-DD-E9-S2-*.md (import job model — from prompt 20)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (staged extraction entities from E9-S3)
platform/packages/types/src/ (staged entity types)
platform/apps/api/src/ (extraction pipeline output)
```

## Implementation Scope

### E9-S4-T1: Staged-Review Data Model
- Define model for proposed changes, warnings, and blocking errors.
- Each staged entity has: review status (pending, approved, rejected, edited), confidence score, source trace, and edit history.

### E9-S4-T2: Review APIs
- Fetch staged changes with filter/sort.
- Edit corrections on staged entities.
- Approve/reject actions (individual and bulk).

### E9-S4-T3: Tenant-Admin Review Screens
- Diff views showing extracted vs corrected data.
- Source previews (original artifact with highlighted extraction regions where available).
- Approval controls: approve, reject, edit, bulk approve.

### E9-S4-T4: Approval Gating
- Low-confidence and validation failure items cannot bypass approval.
- Define publish-eligibility rules: all blocking items must be resolved before the staged batch can proceed to E9-S5.

## Constraints

- Staged corrections must NOT mutate already-published canonical data.
- Low-confidence fields cannot bypass approval gating.
- Review state must be audit-trailable (who approved what, when).
- Do NOT implement template application or preview — that is E9-S5.
- Do NOT implement publish — that is E9-S6.

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
agents/epics/handoffs/YYYY-MM-DD-E9-S4-T1.md
agents/epics/handoffs/YYYY-MM-DD-E9-S4-T2.md
agents/epics/handoffs/YYYY-MM-DD-E9-S4-T3.md
agents/epics/handoffs/YYYY-MM-DD-E9-S4-T4.md
```

Each handoff must include:
- Task ID and status
- Staged review model schema
- Approval state semantics (pending, approved, rejected, edited)
- Canonical-versus-staged data separation boundaries
- Publish-eligibility gating rules
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 34** (E9-S5): Template application consumes approved staged data (direct dependency)
- **Prompt 36** (E9-S6): Publish flow requires approval gate to be green

## Stop Conditions

- STOP if E9-S3 staged extraction schema is not available — write a blocked handoff.
- STOP if canonical-versus-staged data boundaries cannot be maintained — escalate.
- STOP if the work expands into template application or publish.
