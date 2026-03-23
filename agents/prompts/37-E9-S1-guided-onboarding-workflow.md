# Prompt 37: E9-S1 Guided Onboarding Workflow (with UI)

## Sequence Position

- Prompt: 37 of 46
- Epic: 9 — AI Onboarding, Import Review, and Template-Based Publishing
- Story: E9-S1
- Tasks: E9-S1-T1 through E9-S1-T8
- Phase: Enhanced Backend + UI (can run parallel with prompt 38)

## Prerequisites

- E6-S5 (vertical template registry) — completed
- E12-S1 (subscription packages) — completed
- E3-S1 (tenant lifecycle) — completed
- E13-S1 (prompt 27) — shared UI components (StepperWizard, FormSection, CardGrid)
- E13-S8 (prompt 34) — platform admin portal

## Context for the Agent

You are building the **guided onboarding workflow** — a multi-step wizard that walks platform admins (and optionally tenant admins) through setting up a new business on the platform. The workflow covers business identity, vertical selection, data seeding, subscription plan, user configuration, preview, and publish.

**This prompt requires both backend AND frontend implementation.** Build the onboarding stage model, orchestration service, and progress tracking backend, THEN build the multi-step onboarding wizard UI.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-9.md (section E9-S1)
agents/epics/epic-9-tasks.md (section E9-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### Onboarding Stage Model
- 7 stages: Business Identity → Vertical Selection → Data Seeding → Subscription Selection → User Config → Preview → Publish
- Resume state: track which stage the onboarding is at, support resume from last completed stage
- Actor tracking: who completed each stage (platform admin vs tenant admin)

### Orchestration Service
- Progress persistence: save/load onboarding state per tenant
- Checkpoint system: blocking checks (must complete before next stage), warning checks (can proceed but flagged), complete checks
- Minimum viable publish validation: business name + at least 1 product + vertical selected + subscription assigned

### Integration Points
- Stage 2 (Vertical Selection): consume vertical template registry from E6-S5
- Stage 4 (Subscription Selection): consume plan comparison from E12-S1
- Stage 6 (Preview): trigger preview generation (E9-S5 when available)
- Stage 7 (Publish): trigger publish flow (E9-S6 when available)

## Implementation Scope — Frontend (REQUIRED)

### Platform Admin — Onboarding Wizard
- **Full-page onboarding wizard** (`/platform/tenants/new/onboard` or integrated into tenant provisioning):
  - StepperWizard with 7 steps matching the backend stages
  - **Step 1 — Business Identity**: FormSection with business name, description, logo upload (FileUpload), business images, contact details (email, phone, address)
  - **Step 2 — Vertical Selection**: CardGrid of available vertical templates (restaurant, salon, contractor, etc.) with preview images, descriptions, included features. Select one.
  - **Step 3 — Data Seeding**: Option to import data (link to import flow E9-S2) or skip with manual entry later. Show seeded sample data from selected template.
  - **Step 4 — Subscription Selection**: Plan comparison cards showing features, pricing, module access per plan. Select plan. Toggle optional add-on modules.
  - **Step 5 — User Config**: Invite admin user: email, name, role. Optional: invite additional staff.
  - **Step 6 — Preview**: Show preview of generated storefront (iframe or link). Readiness checklist showing completed/incomplete items with actionable links.
  - **Step 7 — Publish**: Review summary of all configuration. Publish button with confirmation. Success state with links to admin portal and customer portal.
- **Resume capability**: if onboarding was started but not completed, show badge on tenant card and resume from last stage
- **Validation per step**: prevent progression if required fields are missing

### Tenant Admin — Resume Onboarding
- If tenant was provisioned but onboarding is incomplete, show an **onboarding banner** at the top of admin dashboard with "Complete Setup" CTA
- Complete remaining steps (hours, content, branding) in a simplified wizard

## Constraints

- Use `@platform/ui` StepperWizard, FormSection, CardGrid, FileUpload — no custom step implementations
- Use `@platform/sdk` — add onboarding methods to platform namespace
- Vertical templates should render attractive preview cards — use representative images
- Do NOT implement the full import flow (E9-S2/S3) — just provide a link/button to trigger it
- Do NOT implement preview generation (E9-S5) — show placeholder if not available
- Platform admin wizard integrates into E13-S8 portal; tenant admin banner integrates into E13-S5 admin shell

## Validation Commands

```bash
pnpm --filter @platform/api typecheck
pnpm --filter @platform/api test
pnpm --filter web-platform-admin typecheck
pnpm --filter web-platform-admin build
pnpm --filter web-admin typecheck
pnpm --filter web-admin build
npx playwright test --project=web-platform-admin-smoke
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E9-S1-*.md`. Include:
- Onboarding stage model and state machine
- Orchestration service API contracts
- Frontend: wizard component tree, step validation rules, resume logic
- Integration points with E9-S5 (preview) and E9-S6 (publish)
- Files created/modified

## Stop Conditions

- STOP if E6-S5 vertical template registry is not available — use hardcoded template list as fallback
- STOP if E12-S1 plan data is not available — use mock plan data and document
- STOP if E13-S1 StepperWizard not available — build simplified step UI and document
