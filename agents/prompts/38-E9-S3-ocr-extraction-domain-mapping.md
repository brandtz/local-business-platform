# Prompt 38: E9-S3 OCR Extraction and Domain Mapping Pipeline (with UI)

## Sequence Position

- Prompt: 38 of 46
- Epic: 9 — AI Onboarding, Import Review, and Template-Based Publishing
- Story: E9-S3
- Tasks: E9-S3-T1 through E9-S3-T6
- Phase: Enhanced Backend + UI (depends on E9-S2 prompt 20; can run parallel with prompt 37)

## Prerequisites

- E9-S2 (import artifact intake) — completed
- E6-S1, E6-S2, E6-S3 (catalog, services, content schemas) — completed
- E13-S1 (prompt 27) — shared components

## Context for the Agent

You are building the **OCR extraction and domain mapping pipeline** — the AI-powered system that extracts structured data from uploaded documents (menus, price lists, brochures) and maps extracted fields to catalog items, services, content, and operational settings.

**This prompt requires both backend AND frontend implementation.** The backend handles OCR extraction, text classification, and field mapping with confidence scores. The frontend surfaces extraction results in the review workspace (E9-S4), but this story provides the extraction status UI and pipeline monitoring.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-9.md (section E9-S3)
agents/epics/epic-9-tasks.md (section E9-S3)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### OCR/Extraction Provider Interface
- Provider-agnostic interface for OCR (support for external OCR services)
- Prompt/rules versioning for extraction instructions
- Document classification: menu, price list, brochure, staff list, etc.

### Extraction Pipeline
- Raw text extraction from uploaded documents
- Field candidate generation with confidence scores
- Domain mapping: map extracted fields to staged catalog items, services, content, operational settings
- Source-trace metadata: link each extracted field back to document location

### Staged Entity Creation
- Persist extracted data as staged (draft) entities — not directly into canonical data
- Each staged entity has: proposed values, confidence score per field, source document reference, validation status

## Implementation Scope — Frontend (REQUIRED)

### Import/Extraction Status UI
- **Extraction Job Status** component (reusable, used in onboarding and later in review workspace):
  - Job progress indicator: document name, processing stage (uploading → extracting → mapping → staged), elapsed time
  - StatusBadge for job state (Processing, Completed, Failed, Partial)
  - Results summary on completion: X items extracted, Y services extracted, Z low-confidence fields needing review
  - "View in Review Workspace" CTA linking to E9-S4 review UI
- **Import History** page in admin settings or within onboarding flow:
  - DataTable of past imports: document name, date, type, items extracted, status
  - Re-run extraction action for failed imports
- Integrate extraction status into the onboarding wizard (E9-S1 Step 3) if that wizard is available

### Platform Admin — Extraction Pipeline Monitor
- Section in Operations or a dedicated page (`/platform/operations/extraction`):
  - Active extraction jobs DataTable: tenant, document, stage, started, elapsed
  - Failed extractions with error details

## Constraints

- OCR provider must be abstracted — do not hardcode any specific OCR service
- Staged entities MUST be separate from canonical data — no writing directly to live catalog
- Confidence scores must be persisted per field, not just per entity
- Use `@platform/ui` components for DataTable, StatusBadge, progress indicators
- Use `@platform/sdk` — add import/extraction methods
- Sensitive document content: ensure extraction results are tenant-scoped

## Validation Commands

```bash
pnpm --filter @platform/api typecheck
pnpm --filter @platform/api test
pnpm --filter web-admin typecheck
pnpm --filter web-admin build
pnpm --filter web-platform-admin typecheck
pnpm --filter web-platform-admin build
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E9-S3-*.md`. Include:
- OCR provider interface definition
- Staged entity schema and confidence score model
- Extraction pipeline stages and error handling
- Frontend: extraction status component API, import history page
- Integration points with E9-S4 review workspace
- Files created/modified

## Stop Conditions

- STOP if OCR services require external API keys not available in dev — implement mock extraction provider that returns sample data
- STOP if document upload from E9-S2 is not functional — implement from file path and document
- STOP if staged entity model conflicts with canonical schema — use separate tables/collections
