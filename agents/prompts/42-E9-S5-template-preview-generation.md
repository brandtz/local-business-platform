# Prompt 42: E9-S5 Template Application and Preview Generation (with UI)

## Sequence Position

- Prompt: 42 of 46
- Epic: 9 — AI Onboarding, Import Review, and Template-Based Publishing
- Story: E9-S5
- Tasks: E9-S5-T1 through E9-S5-T6
- Phase: Enhanced Backend + UI (depends on prompt 40 E9-S4; can run parallel with prompt 41)

## Prerequisites

- E6-S5 (vertical template registry) — completed
- E9-S1 (prompt 37 — onboarding workflow) — preview trigger from onboarding
- E9-S4 (prompt 40 — review workspace) — approved data ready for preview
- E4-S2 (tenant bootstrap) — tenant config for template rendering
- E13-S1 (prompt 27) — shared UI components
- E13-S5 (prompt 31) — admin shell
- E13-S8 (prompt 34) — platform admin portal

## Context for the Agent

You are building the **template application and preview generation** system. This combines tenant configuration, approved domain data, and layout rules to produce a deterministic preview of the storefront. The preview allows admins to see exactly what the customer portal will look like before publishing.

**This prompt requires both backend AND frontend implementation.**

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-9.md (section E9-S5)
agents/epics/epic-9-tasks.md (section E9-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### Template Application Service
- Combine tenant config (branding, layout preferences) + domain data (catalog, services, content) + template layout rules → preview payload
- Deterministic output: same inputs always produce same preview
- Support multiple templates/verticals

### Preview Validation
- Navigation check: all expected routes have content
- Content check: required sections (hero, categories, about) have data
- Module check: enabled modules have corresponding data
- Generate readiness state with actionable reasons for incomplete items

### Preview URL
- Generate preview URL with temporary token
- Preview renders the customer portal with draft/preview data (not live data)
- Readiness endpoint: returns completion percentage and list of issues

## Implementation Scope — Frontend (REQUIRED)

### Admin — Preview Controls
- **Preview panel** in onboarding wizard (E9-S1 Step 6) and in admin settings:
  - "Generate Preview" button → trigger preview generation
  - Preview loading state with progress
  - Preview iframe or "Open in New Tab" link
  - Readiness checklist alongside preview:
    - Checklist items with pass/fail/warning icons
    - Actionable links: "Add Business Hours" → links to location settings, "Add Products" → links to catalog
    - Completion percentage bar

### Admin — Preview Page
- **Standalone preview page** (`/admin/preview`):
  - Full-width iframe rendering the preview storefront
  - Toolbar above iframe: device viewport toggle (desktop/tablet/mobile), refresh, open in new tab
  - Sidebar or overlay with readiness checklist
  - "Publish" CTA when readiness ≥ threshold

### Platform Admin — Preview Management
- Preview status visible in tenant detail (E13-S8):
  - Last preview generated date
  - Readiness score
  - "View Preview" link

## Constraints

- Preview must be read-only — no mutations from preview context
- Preview data must be tenant-scoped — no cross-tenant data leakage
- Preview token must be time-limited (e.g., 1 hour expiry)
- Use `@platform/ui` components for readiness checklist, progress indicators
- Use `@platform/sdk` — add preview methods
- Preview iframe must use CSP-safe embedding

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

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E9-S5-*.md`. Include:
- Template application payload structure
- Preview validation checklist definition
- Preview URL generation and token security
- Frontend: preview page components, readiness checklist, iframe embedding
- Integration with E9-S1 onboarding wizard
- Files created/modified

## Stop Conditions

- STOP if customer portal (E13-S2) renders are not available for preview — implement preview as a JSON payload viewer and document
- STOP if iframe embedding is blocked by CSP — use "Open in New Tab" as primary approach
- STOP if template registry from E6-S5 is missing — use default template configuration
