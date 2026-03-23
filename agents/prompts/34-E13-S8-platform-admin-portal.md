# Prompt 34: E13-S8 Platform Admin Portal

## Sequence Position

- Prompt: 34 of 46
- Epic: 13 — Frontend Implementation and Component Library
- Story: E13-S8
- Tasks: E13-S8-T1, E13-S8-T2, E13-S8-T3, E13-S8-T4, E13-S8-T5, E13-S8-T6, E13-S8-T7, E13-S8-T8
- Phase: E13 UI Foundation (can run parallel with prompts 29-30 after prompt 27 is complete)

## Prerequisites

- E13-S1 (prompt 27) — AppShell, DataTable, MetricCard, CardGrid, StatusBadge, FormSection, ToggleSwitch, Modal, Pagination, SDK client
- E3 (tenant lifecycle) — completed backend
- E8 (domains, payments, integrations) — completed backend
- E11-S3 (search infrastructure) — completed backend

## Context for the Agent

You are building the **entire Platform Admin portal** — the `web-platform-admin` app. This is the super-admin interface used by the platform operator to manage tenants, domains, configuration, system health, and platform-level analytics. Currently the app has placeholder `h()` renders and zero `.vue` SFC files.

Platform Admin is a separate concern from Business Admin — it operates at the platform level, not tenant level. The sign-in uses SSO (Entra ID / Google Workspace) with MFA. The dashboard shows platform-wide KPIs and system health. Tenant management includes provisioning, configuration, and impersonation.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-13.md
agents/epics/epic-13-tasks.md (section E13-S8)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/design/screen-reference-index.md (Platform Admin section — PA-01 through PA-14)
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S1-*.md (components + SDK)
agents/epics/handoffs/*-E3-*.md (tenant lifecycle)
agents/epics/handoffs/*-E8-*.md (domains, payments, integrations)
agents/epics/handoffs/*-E11-S3*.md (search)
```

Read HTML design references:

```
agents/design/Portal Design - Platform Admin - dashboard.html (PA-01)
agents/design/Portal Design - Platform Admin - tenants.html (PA-02, PA-03, PA-04)
agents/design/Portal Design - Platform Admin - domains.html (PA-06)
agents/design/Portal Design - Platform Admin - config and integration.html (PA-05, PA-07, PA-08, PA-11)
agents/design/Portal Design - Platform Admin - operations.html (PA-09, PA-10)
agents/design/Portal Design - Platform Admin - audit and analytics.html (PA-12, PA-13)
agents/design/Portal Design - Platform Admin - publishing.html (PA-14)
agents/design/Portal Design - Platform Admin - sign in.html
```

Inspect code surfaces:

```
platform/apps/web-platform-admin/src/ (existing shell — replace placeholders)
platform/packages/sdk/src/ (tenants, domains, config, health, audit, deployments methods)
platform/packages/types/src/ (tenant, domain, config, health types)
```

## Implementation Scope

### E13-S8-T1: Platform Admin Shell and Sign In
- AppShell with platform-specific sidebar: Dashboard, Tenants, Domains, Configuration (items: Modules, Global Settings, Templates, Payment Providers), Operations (items: System Health, Logs), Analytics, Audit Trail, Publishing
- Platform header: "Platform Admin" branding (no tenant branding), user dropdown
- Sign in page:
  - SSO login buttons: "Sign in with Microsoft" (Entra ID), "Sign in with Google" (Google Workspace)
  - MFA step: 6-digit code input after SSO callback
  - Security warning banner for sensitive operations
- Auth guard on all platform routes
- Routes: `/platform/login`, `/platform` and all sub-routes

### E13-S8-T2: Platform Dashboard (PA-01)
- KPI MetricCards: Total Tenants, Active Tenants, Monthly GMV (Gross Merchandise Value), System Health %
- Traffic and GMV trend chart: dual-axis line chart over time
- System health bars: API, Database, Redis, Queue — each with status color and uptime %
- Active alerts list: severity icon, message, timestamp, acknowledge action
- Recent deployments list: version, date, status badge, environment
- Auto-refresh toggle for real-time-ish updates
- Fetch: platform dashboard endpoint, `health.status()`, `deployments.list({ limit: 5 })`
- Route: `/platform`

### E13-S8-T3: Tenant Management (PA-02, PA-03, PA-04)
- **Tenant List (PA-02)**: CardGrid with status tabs (Active, Trial, Suspended, Archived). Each card: tenant name, plan badge, status indicator, module tags array, created date, key metric (monthly orders or GMV). Click → tenant detail.
- **Tenant Detail (PA-03)**: Full tenant view with sections:
  - Overview: name, plan, status, created date, admin contact
  - Configuration: enabled modules toggles, plan limits
  - Usage metrics: orders, bookings, customers, storage used
  - Domains list (linked to domain management)
  - Actions: Impersonate Admin (opens business admin as that tenant), Suspend, Archive, Change Plan
- **Tenant Provisioning (PA-04)**: Multi-step StepperWizard:
  - Step 1: Business info (name, type, contact)
  - Step 2: Plan selection (toggle plans, see included modules)
  - Step 3: Module configuration (toggle additional modules)
  - Step 4: Admin user (email, name — generates invite)
  - Step 5: Domain setup (subdomain auto-generated, custom domain optional)
  - Step 6: Review and confirm
- Fetch: `tenants.list({ status, page })`, `tenants.get()`, `tenants.create()`, `tenants.update()`, `tenants.impersonate()`
- Routes: `/platform/tenants`, `/platform/tenants/:tenantId`, `/platform/tenants/new`

### E13-S8-T4: Domain Management (PA-06)
- Stats MetricCards: Total Domains, Active (DNS verified + SSL), Pending Verification, Failed
- Domain DataTable: domain name, assigned tenant, DNS status badge, SSL status badge, verification date, actions
- Verification actions: "Check DNS" button (triggers verification), "Retry SSL" button
- Add domain flow: Modal with domain name, tenant selector, auto-generate DNS instructions
- Domain detail: DNS records needed (CNAME/A record values for user to configure), SSL certificate status, propagation history
- Fetch: `domains.list()`, `domains.get()`, `domains.create()`, `domains.verify()`, `domains.delete()`
- Route: `/platform/domains`

### E13-S8-T5: Configuration and Integration (PA-05, PA-07, PA-08, PA-11)
- **Module Configuration (PA-05)**: Feature flags list with ToggleSwitch for each. Module toggles with description and affected tenants count. Save button.
- **Global Settings (PA-07)**: Platform defaults form (FormSection): default plan, trial duration, max tenants per plan, default modules, support email, platform name.
- **Templates and Themes (PA-08)**: Theme list with preview cards. Create/edit theme: name, color palette, typography, preview. Assign as default theme.
- **Payment Providers (PA-11)**: Platform-level payment provider configuration. Provider cards with connection status. API key management (masked display, edit).
- Fetch: `config.getModules()`, `config.updateModule()`, `config.getGlobal()`, `config.updateGlobal()`
- Routes: `/platform/config/modules`, `/platform/config/settings`, `/platform/config/templates`, `/platform/config/payments`

### E13-S8-T6: Operations (PA-09, PA-10)
- **System Health (PA-09)**:
  - Service health cards: API, Database, Redis, Queue — each with status (Healthy/Degraded/Down), uptime, response time, last check
  - Alert banner for active critical issues
  - Background jobs monitor: queue name, depth, processing rate, failed count, last processed
  - Manual health check button
- **Logs Explorer (PA-10)**:
  - Service selector dropdown (API, Worker, Scheduler, etc.)
  - Log level filter (Error, Warn, Info, Debug)
  - Terminal-style log viewer: monospace font, timestamped entries, color-coded by level
  - Auto-scroll toggle, pause button
  - Search within logs
- Fetch: `health.status()`, `health.jobs()`, logs streaming or polling endpoint
- Routes: `/platform/operations`, `/platform/operations/logs`

### E13-S8-T7: Analytics and Audit (PA-12, PA-13)
- **Platform Analytics (PA-12)**:
  - KPI MetricCards: Total Revenue, Tenant Count, Churn Rate, Average GMV per Tenant
  - Tenant growth chart: new tenants over time
  - GMV trend chart: total platform GMV over time
  - Top tenants DataTable: name, plan, GMV, orders, health score, trend
- **Audit Trail (PA-13)**:
  - Event log DataTable: timestamp, user, action, target entity, severity badge
  - Filter bar: date range, user search, action type dropdown, severity dropdown
  - Event detail: click row → expand or SlidePanel with full event details, affected resources, before/after values
  - Error tracking section: recent errors with stack traces
- Fetch: `audit.list({ dateRange, userId, actionType, severity, page })`, analytics endpoints
- Routes: `/platform/analytics`, `/platform/audit`

### E13-S8-T8: Publishing and Deployments (PA-14)
- Deployment stats MetricCards: Total Deployments, Success Rate %, Average Duration, Last Deploy time
- Pipeline visualization: horizontal step flow (Build → Test → Staging → Production) with status indicators for each stage
- Release history DataTable: version, date, environment, status badge, deployer, duration, rollback action
- Rollback action: confirmation Modal with version to rollback to, warning about data implications
- Trigger deploy button (if manual deploy supported)
- Fetch: `deployments.list()`, `deployments.get()`, `deployments.trigger()`, `deployments.rollback()`
- Route: `/platform/publishing`

## Constraints

- Platform Admin uses a DIFFERENT auth flow than Business Admin — SSO + MFA, not email/password
- No tenant branding in Platform Admin — use platform design tokens only
- System health / logs should feel "operations dashboard" — darker theme accents are acceptable if design refs show that
- Impersonate action must open Business Admin in a new tab with appropriate impersonation token
- Tenant provisioning wizard must validate each step before allowing next
- Log viewer must handle large volumes — virtual scrolling or windowed rendering for performance
- All API calls through `@platform/sdk` platform-namespace methods
- Loading, error, empty states everywhere

## Validation Commands

```bash
pnpm --filter web-platform-admin typecheck
pnpm --filter web-platform-admin build
pnpm --filter web-platform-admin test
npx playwright test --project=web-platform-admin-smoke
```

## Handoff Instructions

Create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S8-T1.md
agents/epics/handoffs/YYYY-MM-DD-E13-S8-T2.md
agents/epics/handoffs/YYYY-MM-DD-E13-S8-T3.md
agents/epics/handoffs/YYYY-MM-DD-E13-S8-T4.md
agents/epics/handoffs/YYYY-MM-DD-E13-S8-T5.md
agents/epics/handoffs/YYYY-MM-DD-E13-S8-T6.md
agents/epics/handoffs/YYYY-MM-DD-E13-S8-T7.md
agents/epics/handoffs/YYYY-MM-DD-E13-S8-T8.md
```

Each handoff must include:
- SSO + MFA auth flow implementation details
- Tenant provisioning wizard step definitions and validation
- Log viewer performance approach (virtual scroll / windowing)
- Pipeline visualization component approach
- SDK methods consumed (platform namespace)
- Impersonation implementation
- Playwright test results
- Files created/modified

## Downstream Consumers

- This is the final E13 story — completes the platform admin portal
- E12-S3 (prompt 36) and E12-S5 (prompt 41) add billing views into this portal

## Stop Conditions

- STOP if SSO auth endpoints don't exist yet — implement email/password fallback with TODO for SSO and document
- STOP if health/logs streaming endpoints don't exist — implement polling-based approach and document
- STOP if deployment/publishing endpoints don't exist — render mock data with "Integration Pending" banner and document
