# Prompt 30: E9-S3 OCR, Extraction, and Domain Mapping Pipeline

## Sequence Position

- Prompt: 30 of 38
- Epic: 9
- Story: E9-S3
- Tasks: E9-S3-T1, E9-S3-T2, E9-S3-T3, E9-S3-T4
- Phase: Epic 9 AI Pipeline (must wait for prompt 20 to complete; can run parallel with prompt 29)

## Prerequisites

- E9-S2 (import artifact intake and job orchestration) must be completed — prompt 20.
- E6 (all domain models) — completed. Extraction maps into catalog, service, content entities.

## Context for the Agent

You are implementing the OCR, extraction, and domain mapping pipeline — the intelligence layer that converts uploaded business artifacts (menus, brochures, service lists) into structured domain data. The pipeline: (1) performs raw text extraction from uploaded images/PDFs, (2) classifies document type, (3) identifies field candidates (product names, prices, descriptions, service details), and (4) maps candidates into staged domain entities.

This must be provider-agnostic: define interfaces for OCR/extraction that can swap providers (Google Vision, AWS Textract, OpenAI, etc.) without changing the pipeline. Extraction results include confidence scores and source-trace metadata so the review workflow (E9-S4) can present corrections to humans.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-09.md
agents/epics/epic-09-tasks.md (section E9-S3)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/ai/import-engine.md
```

Read these task packets:

```
agents/epics/packets/epic-09/E9-S3-T1.md
agents/epics/packets/epic-09/E9-S3-T2.md
agents/epics/packets/epic-09/E9-S3-T3.md
agents/epics/packets/epic-09/E9-S3-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E9-S2-*.md (import job model and artifact storage — from prompt 20)
agents/epics/handoffs/2026-03-20-E6-S1-S3.md (catalog and service entity schemas to map into)
agents/epics/handoffs/2026-03-21-E6-S4-*.md (content entity schema to map into)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (domain entities, import job model)
platform/packages/types/src/ (catalog, service, content types)
platform/apps/api/src/ (import job processing, worker patterns)
```

## Implementation Scope

### E9-S3-T1: Provider-Agnostic OCR Interfaces
- Define OCR and extraction interfaces with prompt/rules versioning model.
- Interfaces must allow provider swap without changing downstream pipeline.

### E9-S3-T2: Raw Text Extraction Pipeline
- Implement raw text extraction, document classification (menu, brochure, price list, service list), and field candidate generation.

### E9-S3-T3: Domain Mapping
- Map extracted candidates into staged catalog, service, content, and operational-setting entities.
- Staged entities are NOT written to canonical tables — they go into a staging area for review (E9-S4).

### E9-S3-T4: Confidence Scores and Source Trace
- Persist confidence scores per extracted field.
- Maintain source-trace metadata linking each staged entity back to the source artifact position.

## Constraints

- Provider-agnostic: no hard dependency on a specific OCR/AI provider.
- Staged output only — extraction results NEVER write directly to canonical domain tables.
- Confidence scores are required for every extracted field.
- Extraction provider failure must degrade cleanly and mark job state explicitly (not silently succeed with empty results).
- Do NOT implement review UI — that is E9-S4.
- Do NOT implement template application or preview — those are E9-S5.

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
agents/epics/handoffs/YYYY-MM-DD-E9-S3-T1.md
agents/epics/handoffs/YYYY-MM-DD-E9-S3-T2.md
agents/epics/handoffs/YYYY-MM-DD-E9-S3-T3.md
agents/epics/handoffs/YYYY-MM-DD-E9-S3-T4.md
```

Each handoff must include:
- Task ID and status
- OCR/extraction provider interface contract
- Document classification categories
- Staged extraction schema (entity types, field structure)
- Confidence scoring model
- Source-trace metadata format
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 32** (E9-S4): Review workspace consumes staged extraction output (direct dependency)
- **Prompts 34, 36** depend transitively through the E9 pipeline

## Stop Conditions

- STOP if E9-S2 import job model or artifact storage is not available — write a blocked handoff.
- STOP if domain entity schemas from E6 have changed incompatibly since their handoff — escalate.
- STOP if the work expands into review workflows or direct canonical writes.
