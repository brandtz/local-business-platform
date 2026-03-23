# Prompt 45: E8-S5 Domain Activation Full (with UI)

## Sequence Position

- Prompt: 45 of 46
- Epic: 8 — Payments, Notifications, Domains, and External Integrations
- Story: E8-S5
- Tasks: E8-S5-T1 through E8-S5-T5
- Phase: Enhanced Backend + UI (depends on prompt 44 E9-S6; can run parallel with prompt 46)

## Prerequisites

- E8-S3 (domain management foundation) — completed
- E9-S6 (prompt 44 — versioned publish and rollback) — publish-readiness contract
- E3-S1 (tenant lifecycle) — tenant domain assignment
- E13-S1 (prompt 27) — shared UI components
- E13-S5 (prompt 31) — admin shell
- E13-S8 (prompt 34) — platform admin portal

## Context for the Agent

You are building the **full domain activation system** — the logic that connects domain promotion to published-release health checks, blocks activation when publish validation fails, and provides rollback behavior when post-promotion route validation fails.

**This prompt requires both backend AND frontend implementation.**

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-8.md (section E8-S5)
agents/epics/epic-8-tasks.md (section E8-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### Domain Activation Service
- Connect domain promotion to publish-readiness status from E9-S6
- Block activation when: publish validation fails, release health is not green, DNS/SSL not verified

### Activation Readiness
- Readiness endpoint: returns activation eligibility with list of blocking reasons
- Denial reasons: specific, actionable (e.g., "DNS CNAME not found", "SSL certificate pending", "No published release")

### Activation Rollback
- Post-promotion route validation: verify domain resolves correctly after activation
- If route validation fails: automatic rollback to previous routing state
- Rollback notification to admin

## Implementation Scope — Frontend (REQUIRED)

### Tenant Admin — Domain Status
- **Domain activation status** in admin settings (`/admin/settings/domain`):
  - Current domain display with status indicators: DNS verified ✓/✗, SSL active ✓/✗, Published release ✓/✗
  - Activation readiness indicator: green "Ready to Activate" or red "Not Ready" with specific reasons listed
  - Each denial reason is actionable: "Verify DNS" → shows DNS records to configure, "Publish First" → links to publish page
  - "Activate Domain" button (enabled only when all checks pass) → confirmation modal
  - Post-activation status: "Active" with domain URL link

### Platform Admin — Domain Activation Management
- Extend E13-S8 domain management page (PA-06):
  - Activation readiness column in domain DataTable: green/yellow/red indicator
  - Domain detail: readiness checklist with pass/fail per check
  - Force-activate override for platform admin (with audit logging)
  - Rollback history: list of activation failures with rollback details

## Constraints

- Domain activation MUST be blocked if publish/release health is not green — this is a safety gate
- Rollback of domain routing must be automatic on failure — no manual intervention required
- DNS/SSL verification must use actual checks (DNS TXT/CNAME lookup, SSL certificate validation)
- Use `@platform/ui` components: StatusBadge, Modal, FormSection, DataTable
- Use `@platform/sdk` — add domain activation methods
- Tenant admin pages integrate into E13-S5; platform admin extends E13-S8

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

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E8-S5-*.md`. Include:
- Domain activation service and readiness contract
- Blocking reasons enumeration
- Route validation and rollback mechanism
- Frontend: domain status page, readiness checklist, activation flow
- Platform admin force-activate with audit
- Files created/modified

## Stop Conditions

- STOP if publish-readiness contract from E9-S6 not available — implement basic readiness check (DNS + SSL only)
- STOP if DNS/SSL checks require external services not configured — implement mock checks returning test data
- STOP if route validation post-activation cannot be implemented in dev — skip and document
