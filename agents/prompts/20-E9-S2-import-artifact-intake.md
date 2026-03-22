# Prompt 20: E9-S2 Import Artifact Intake and Job Orchestration

## Sequence Position

- Prompt: 20 of 38
- Epic: 9
- Story: E9-S2
- Tasks: E9-S2-T1, E9-S2-T2, E9-S2-T3, E9-S2-T4
- Phase: Epic 9 Foundation (can run parallel with prompt 19)

## Prerequisites

- E1 (workspace and toolchain) — completed.
- E5 (tenant admin infrastructure) — completed.
- E2 (identity and auth) — completed.
- No direct story-level dependency on E12-S1 or E9-S1; this is an independent pipeline entry point.

## Context for the Agent

You are implementing the import artifact intake and job orchestration system. This is the pipeline entry point for the AI-assisted onboarding flow: business owners or platform admins upload artifacts (menus, brochures, service lists, price sheets — typically as images or PDFs), and the system stores them securely, creates import jobs, and orchestrates processing through downstream stages (OCR extraction in E9-S3, review in E9-S4, publish in E9-S6).

The import job model must support retry on failure, resumability after interruption, and staged output that downstream stories consume. Artifacts must be tenant-scoped with malware scanning hooks. The admin must be able to see job status and manage imports.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-09.md
agents/epics/epic-09-tasks.md (section E9-S2)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/ai/import-engine.md
```

Read these task packets:

```
agents/epics/packets/epic-09/E9-S2-T1.md
agents/epics/packets/epic-09/E9-S2-T2.md
agents/epics/packets/epic-09/E9-S2-T3.md
agents/epics/packets/epic-09/E9-S2-T4.md
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma
platform/apps/api/src/ (existing service patterns)
platform/packages/types/src/
```

## Implementation Scope

### E9-S2-T1: Upload Intake Flow
- Implement upload intake with artifact metadata extraction, malware scanning hook, and tenant-scoped storage.
- Supported artifact types: images (JPEG, PNG), PDFs.
- File size limits and validation.
- Artifacts stored with tenant isolation.

### E9-S2-T2: Import Job Model
- Create import-job model with states: pending, processing, staged, failed, completed.
- Support retry with backoff on failure.
- Define staged-output schema for downstream consumption.
- Track failure reason and retry count.

### E9-S2-T3: Worker Job Dispatch
- Define worker job dispatch for import processing.
- Jobs must be resumable after worker restart.
- Use BullMQ job patterns consistent with existing worker infrastructure.

### E9-S2-T4: Admin Views and APIs
- Expose admin APIs for import-job creation, status inspection, and artifact listing.
- Implement tenant-admin views for managing imports: upload form, job list with status, retry action.

## Constraints

- Artifacts must be tenant-scoped — no cross-tenant access.
- Malware scanning must be a hook point (not necessarily implemented) — fail-safe if scan unavailable.
- Import jobs must not silently duplicate staged outputs on retry.
- Do NOT implement OCR/extraction — that is E9-S3.
- Do NOT implement review workflows — that is E9-S4.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

If admin import views are browser-visible:

```bash
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E9-S2-T1.md
agents/epics/handoffs/YYYY-MM-DD-E9-S2-T2.md
agents/epics/handoffs/YYYY-MM-DD-E9-S2-T3.md
agents/epics/handoffs/YYYY-MM-DD-E9-S2-T4.md
```

Each handoff must include:
- Task ID and status
- Import job lifecycle states and transitions
- Artifact storage contract and tenant-scoping model
- Worker dispatch pattern and retry semantics
- Admin API endpoints and response shapes
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 30** (E9-S3): OCR extraction consumes import job artifacts and writes staged output (direct dependency)
- **Prompts 32, 34, 36** depend transitively through the E9 pipeline

## Stop Conditions

- STOP if existing worker infrastructure patterns are not established — escalate.
- STOP if the work expands into OCR/extraction or review workflows.
- STOP if tenant storage isolation cannot be guaranteed.
