# Prompt 31: E13-S5 Business Admin — Shell, Dashboard, and Settings

## Sequence Position

- Prompt: 31 of 46
- Epic: 13 — Frontend Implementation and Component Library
- Story: E13-S5
- Tasks: E13-S5-T1, E13-S5-T2, E13-S5-T3, E13-S5-T4, E13-S5-T5, E13-S5-T6, E13-S5-T7
- Phase: E13 UI Foundation (can run parallel with prompt 28 after prompt 27 is complete)

## Prerequisites

- E13-S1 (prompt 27) — AppShell, MetricCard, ActivityTimeline, DataTable, FormSection, ToggleSwitch, SDK client
- E5 (admin navigation) — completed backend
- E2 (auth) — completed backend
- E8-S1 (payment gateway config) — completed backend

## Context for the Agent

You are building the **Business Admin portal shell** — the `web-admin` app. This includes the AppShell layout with sidebar navigation, the dashboard home page, all settings pages, and the admin sign-in page. Currently the app has only placeholder `h()` renders and zero `.vue` SFC files.

The admin shell is the container for all business admin features. The sidebar navigation must respect **module gating** — if a tenant's subscription does not include a module (e.g., bookings, loyalty), the corresponding sidebar item should be hidden. This gating data comes from the tenant bootstrap/config endpoint.

The dashboard is data-rich with KPI cards, charts, recent activity, and quick actions. Settings pages cover business profile, branding, payment gateway, user management, and activity log.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-13.md
agents/epics/epic-13-tasks.md (section E13-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/design/screen-reference-index.md (Business Admin section — BA-01, BA-02, BA-16, BA-17, BA-18)
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S1-*.md (components + SDK)
agents/epics/handoffs/*-E5-*.md (admin navigation)
agents/epics/handoffs/*-E2-*.md (auth)
agents/epics/handoffs/*-E8-S1*.md (payment gateway config)
```

Read HTML design references:

```
agents/design/Portal Design - Business Admin dashboard.html (BA-01)
agents/design/Portal Design - Business Admin - settings and activity log.html (BA-02, BA-16, BA-17, BA-18)
agents/design/Portal Design - Business Admin - sign in.html
```

Inspect code surfaces:

```
platform/apps/web-admin/src/ (existing shell — replace placeholders)
platform/packages/ui/src/ (consume AppShell, MetricCard, etc.)
platform/packages/sdk/src/ (consume analytics, auth, config, payments methods)
platform/packages/types/src/ (tenant, auth, analytics types)
```

## Implementation Scope

### E13-S5-T1: Admin Shell and Navigation
- AppShell from `@platform/ui` with admin sidebar navigation
- Sidebar sections: Dashboard, Catalog (items: Categories, Products, Services), Orders & Bookings (items: Orders, Bookings), Customers & Staff (items: Customers, Staff), Content (items: Pages, Announcements, Locations), Analytics, Loyalty, Settings (items: Profile & Branding, Payments, Users, Activity Log)
- Module gating: fetch tenant config on app init, conditionally show/hide sidebar sections based on enabled modules (e.g., hide Bookings if bookings module disabled, hide Loyalty if loyalty module disabled)
- Header: tenant business name, impersonation banner (show if admin is being impersonated by platform admin with a "return to platform" link), user dropdown menu (profile, sign out)
- Responsive: sidebar collapses to hamburger menu on tablet
- Route configuration: define all admin routes with auth guards

### E13-S5-T2: Admin Dashboard (BA-01)
- KPI MetricCards row: Today's Revenue, Total Orders, Active Bookings, New Customers — each with trend % vs previous period
- Revenue chart: bar chart for daily revenue over last 7/30 days (use a lightweight chart library or canvas — Chart.js or similar already in deps, or add if needed)
- Recent orders compact DataTable: order #, customer, total, status badge, time ago
- Activity timeline: recent business events (new orders, bookings, customer registrations)
- Quick action buttons: New Product, New Order, View Bookings
- Fetch: `analytics.dashboard()` or individual endpoints for KPIs, `orders.list({ limit: 5 })`, activity events
- Route: `/admin` (dashboard is the default admin page)

### E13-S5-T3: Business Profile and Branding (BA-02)
- Business profile form (FormSection): business name, description, email, phone, address, tax ID
- Branding section (FormSection): logo upload (FileUpload component), primary/secondary/accent color pickers, typography preset selector
- Live preview panel: shows how the customer-facing header/hero would look with current branding
- Save and Publish buttons
- Fetch: `tenants.get(currentTenantId)` for current config, update via tenant settings endpoint
- Route: `/admin/settings/profile`

### E13-S5-T4: Payment Gateway Settings (BA-16)
- Payment provider cards: Stripe, Square (configurable list)
- Each card shows: provider logo/name, connection status (Connected / Not Connected), manage/connect/disconnect button
- Connected provider: show accepted payment types toggles, webhook status
- Connect flow: redirect-based OAuth or API key input form
- Fetch: `payments.getConfig()`, `payments.updateConfig()`
- Route: `/admin/settings/payments`

### E13-S5-T5: Tenant User Management (BA-17)
- User list DataTable: name, email, role, status (Active/Invited/Deactivated), last active date
- Invite user button → Modal: email input, role selector (Admin, Manager, Staff), send invite
- Row actions: edit role, deactivate/reactivate
- User detail slide panel: activity trail
- Fetch: tenant user management endpoints
- Route: `/admin/settings/users`

### E13-S5-T6: Activity and Audit Log (BA-18)
- Filter bar: date range picker, user dropdown, action type dropdown
- Activity table (DataTable): timestamp, user, action description, target entity, details
- Pagination
- Fetch: `audit.list({ dateRange, userId, actionType, page })`
- Route: `/admin/settings/activity`

### E13-S5-T7: Admin Sign In
- Email/password form with validation
- Social login buttons (if configured)
- Remember me checkbox
- Forgot password link → reset flow
- Redirect to admin dashboard on successful auth
- Tenant-branded: show business logo/name from tenant config
- Fetch: `auth.login()`
- Route: `/admin/login`

## Constraints

- Use AppShell from `@platform/ui` — do NOT build a custom shell layout
- Module gating must be driven by tenant config data, not hardcoded
- Chart library: prefer Chart.js if already in dependencies, otherwise add a lightweight option. Do not add D3 for simple charts.
- All colors via design tokens — the branding preview should demonstrate token application
- Auth guard on all admin routes except `/admin/login`
- All API calls through `@platform/sdk`
- Loading, error, and empty states everywhere

## Validation Commands

```bash
pnpm --filter web-admin typecheck
pnpm --filter web-admin build
pnpm --filter web-admin test
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

Create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S5-T1.md
agents/epics/handoffs/YYYY-MM-DD-E13-S5-T2.md
agents/epics/handoffs/YYYY-MM-DD-E13-S5-T3.md
agents/epics/handoffs/YYYY-MM-DD-E13-S5-T4.md
agents/epics/handoffs/YYYY-MM-DD-E13-S5-T5.md
agents/epics/handoffs/YYYY-MM-DD-E13-S5-T6.md
agents/epics/handoffs/YYYY-MM-DD-E13-S5-T7.md
```

Each handoff must include:
- Admin route tree with auth guards and module gating
- Sidebar navigation data structure with gating keys
- Chart library choice and usage
- SDK methods consumed
- Branding preview implementation approach
- Playwright test results
- Files created/modified

## Downstream Consumers

- E13-S6 (prompt 32) adds catalog/content pages inside this shell
- E13-S7 (prompt 33) adds orders/bookings/customers/staff/analytics pages inside this shell

## Stop Conditions

- STOP if `@platform/ui` AppShell is not available from E13-S1 — blocked
- STOP if tenant config endpoint does not expose module gating data — implement basic config and document
- STOP if the web-admin app build config doesn't support Vue SFC — document and escalate
