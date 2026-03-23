# Prompt 40: E9-S4 Review Workspace and Approval Controls (with UI)

## Sequence Position

- Prompt: 40 of 46
- Epic: 9 — AI Onboarding, Import Review, and Template-Based Publishing
- Story: E9-S4
- Tasks: E9-S4-T1 through E9-S4-T7
- Phase: Enhanced Backend + UI (depends on prompt 38 E9-S3; can run parallel with prompt 39)

## Prerequisites

- E9-S2 (import artifact intake) — completed
- E9-S3 (prompt 38 — OCR extraction and domain mapping) — staged entities with confidence scores
- E6-S1, E6-S2, E6-S3 (canonical catalog, service, content schemas) — completed
- E13-S1 (prompt 27) — shared UI components
- E13-S5 (prompt 31) or E13-S8 (prompt 34) — admin shell

## Context for the Agent

You are building the **review workspace** — the UI-heavy feature where admins review AI-extracted data before it goes live. This involves a staged-review data model, diff views comparing proposed changes against canonical data, confidence indicators, inline editing, and approve/reject controls.

**This prompt is UI-dominant.** The backend creates the review data model and APIs, but the majority of the work is building a rich, interactive review interface that makes it easy for admins to confidently approve or correct extracted data.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-9.md (section E9-S4)
agents/epics/epic-9-tasks.md (section E9-S4)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read handoffs from E9-S3 (staged entities, confidence scores).

## Implementation Scope — Backend

### Staged Review Data Model
- Separate staged entities from canonical data (proposed_items, proposed_services, proposed_content, proposed_settings)
- Each staged entity has: proposed field values, confidence score per field, validation status (valid/warning/error), review status (pending/approved/rejected/edited)
- Diff calculation: compare staged vs canonical (for updates) or vs empty (for new items)

### Review APIs
- Fetch staged changes: list with filters (type, status, confidence threshold)
- Edit staged item: update proposed values inline
- Approve/reject individual items or bulk actions
- Publish approved items: move approved staged entities to canonical data

### Gating
- Low-confidence items (below configurable threshold) require explicit review — cannot be auto-approved
- Validation-failed items blocked from approval until corrected

## Implementation Scope — Frontend (REQUIRED)

### Review Workspace Page
- **Main review workspace** (`/admin/imports/:importId/review` or `/platform/imports/:importId/review`):
  - **Summary header**: import source document name, extraction date, total items, items by status (pending/approved/rejected)
  - **Filter bar**: filter by type (products, services, content, settings), status (pending/approved/rejected), confidence level (high/medium/low)
  - **Review list**: each staged item as a review card or table row:
    - Item name/title
    - Confidence indicator: color-coded badge (green high, yellow medium, red low)
    - Status badge (Pending, Approved, Rejected, Edited)
    - Source reference: link/highlight showing where in the original document this was extracted from
    - Quick actions: Approve, Reject, Edit

### Review Item Detail
- **Diff view** for each staged item:
  - Side-by-side or inline comparison of proposed values vs canonical (for updates)
  - Highlight changed/new fields
  - Confidence score per field with visual indicator
  - Validation warnings/errors displayed inline
- **Inline editing**: click a field value to edit it directly with FormField component
- **Source preview**: show the relevant portion of the original document (image crop or text excerpt)
- **Approve/Reject** buttons with optional notes

### Bulk Actions
- Select multiple items with checkboxes
- Bulk approve (only items without blocking errors)
- Bulk reject with reason
- "Approve All High-Confidence" shortcut button

### Publish Approved
- "Publish to Live" button that moves all approved staged items to canonical data
- Confirmation modal: X items will be published, Y updates, Z new items
- Publishing progress indicator
- Success/failure summary

## Constraints

- Staged data MUST remain separate from canonical data until explicitly published
- Low-confidence items MUST require manual review — no auto-approve shortcut for these
- Diff view must clearly distinguish new fields, changed fields, and unchanged fields
- Use `@platform/ui` components: DataTable, StatusBadge, FormField, SlidePanel, Modal, SearchToolbar
- Use `@platform/sdk` — add review workspace methods
- Inline editing must validate against the same rules as the source entity schema

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

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E9-S4-*.md`. Include:
- Staged review data model schema
- Review API contracts (list, edit, approve, reject, publish)
- Confidence threshold configuration
- Frontend: review workspace component tree, diff view implementation
- Inline editing approach and validation
- Publish flow and error handling
- Files created/modified

## Stop Conditions

- STOP if E9-S3 staged entities are not available — create sample staged data for UI development and document
- STOP if diff calculation is too complex for the current data model — implement simplified field-by-field comparison
- STOP if source document preview requires OCR coordinate data not available — show text excerpt only
