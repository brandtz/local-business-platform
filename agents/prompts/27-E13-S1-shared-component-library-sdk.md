# Prompt 27: E13-S1 Shared Component Library and SDK API Client

## Sequence Position

- Prompt: 27 of 46
- Epic: 13 — Frontend Implementation and Component Library
- Story: E13-S1
- Tasks: E13-S1-T1, E13-S1-T2, E13-S1-T3, E13-S1-T4, E13-S1-T5, E13-S1-T6
- Phase: E13 UI Foundation (must complete before prompts 28-34)

## Prerequisites

- E1-E4 completed (types, auth, tenant lifecycle, frontend shell contracts)
- `@platform/ui` exists with design tokens and descriptor types — zero renderable components yet
- `@platform/sdk` exists with API client config types — no HTTP transport yet

## Context for the Agent

You are building the **shared component library** and **SDK HTTP API client** that all three portal apps depend on. This is the foundation story — prompts 28-34 all consume what you build here.

`@platform/ui` currently has design tokens (colors, spacing, typography) and TypeScript descriptor types. You must add real **Vue 3 SFC components** that render styled, interactive UI elements. Every component must consume the existing design tokens — no hardcoded colors or spacing.

`@platform/sdk` currently has API client configuration types. You must add a **fetch-based HTTP transport** and **typed client methods** for every domain that has a backend API (auth, catalog, services, orders, bookings, customers, staff, payments, notifications, analytics, loyalty, search, content, locations, portfolio, quotes, subscriptions, tenants, domains, config, health, audit, deployments).

**Design consistency is critical.** The 22 HTML reference files in `agents/design/` show exactly which components are needed and how they look. The `screen-reference-index.md` "Shared Component Patterns" section lists every reusable component with where it appears.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-13.md
agents/epics/epic-13-tasks.md (section E13-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/design/screen-reference-index.md (Shared Component Patterns section)
agents/architecture/tech-stack.md
```

Inspect these code surfaces:

```
platform/packages/ui/src/ (existing tokens and descriptors — extend, don't replace)
platform/packages/sdk/src/ (existing config types — extend, don't replace)
platform/packages/types/src/ (domain types for SDK method signatures)
platform/apps/api/src/ (API routes to understand endpoint contracts)
platform/contracts/ (API contracts if available)
```

Read these HTML design reference files to understand component patterns:

```
agents/design/Portal Design - Business Admin dashboard.html (MetricCard, ActivityTimeline, DataTable patterns)
agents/design/Portal Design - Business Admin - catalog and services.html (DataTable, SlidePanel, SearchToolbar, TabBar)
agents/design/Portal Design - Business Admin - orders and booking.html (CalendarGrid, DataTable, StatusBadge)
agents/design/Portal Design - Customer Portal cart and checkout.html (StepperWizard, FormSection)
agents/design/Portal Design - Customer Portal store front home.html (CardGrid)
agents/design/Portal Design - Platform Admin - dashboard.html (MetricCard layout)
```

## Implementation Scope

### E13-S1-T1: AppShell and Layout Components
Build these components in `@platform/ui`:
- **AppShell** — Fixed sidebar, sticky header, scrollable content area. Sidebar accepts nav items array with icon, label, route, children, module gate key. Header has breadcrumb slot, branding slot, user menu slot.
- **PageHeader** — Title, subtitle, action buttons slot.
- **PageContent** — Padded content wrapper with optional max-width constraint.
- Sidebar must support collapsing for responsive views.
- All layout regions must use design tokens for sizing and spacing.

### E13-S1-T2: Data Display Components
- **DataTable** — Props: columns (with sortable flag), rows, loading, empty message. Features: column sorting, filter bar with search input, bulk-select checkboxes, row action buttons, pagination integration. Emits: sort, filter, select, page-change, row-action.
- **MetricCard** — Props: icon, label, value, trend (percentage + direction). Variants: default, positive, negative, neutral.
- **StatusBadge** — Props: status string, colorMap (maps status → semantic token). Renders as colored pill.
- **CardGrid** — Props: items, columns (responsive breakpoints). Slot for card template.
- **ActivityTimeline** — Props: events (icon, title, timestamp, description). Vertical layout.
- **Pagination** — Props: total, pageSize, currentPage. Emits: page-change. Shows page numbers, prev/next, "showing X of Y."

### E13-S1-T3: Interactive Components
- **SlidePanel** — Props: open, title, width. Right-side slide-in, overlay backdrop. Close on escape, close on overlay click. Emits: close. Transition animation.
- **Modal** — Props: open, title, size (sm/md/lg). Centered overlay with focus trap. Footer slot for action buttons. Close on escape.
- **TabBar** — Props: tabs (label, key). Emits: tab-change. Horizontal with active underline indicator. Slot content switching via active tab.
- **SearchToolbar** — Props: placeholder, filters (array of filter definitions), sort options. Emits: search, filter-change, sort-change. Search input + filter button + sort dropdown + action buttons slot.
- **StepperWizard** — Props: steps (label, key), activeStep. Visual progress indicator with active/completed/pending states. Emits: step-change.
- **ToggleSwitch** — Props: modelValue, label, description. Emits: update:modelValue.

### E13-S1-T4: Form Components
- **FormSection** — Props: title, description. Groups form fields with label, optional description, validation error display.
- **FormField** — Wrapper for text, textarea, select, multi-select, date, number, email, password inputs. Props: label, error, hint, required. Integrates with v-model.
- **PasswordStrengthIndicator** — Props: password string. Visual bar with weak/fair/strong/excellent states.
- **FileUpload** — Props: accept, maxSize, preview. Drag-drop zone with file preview. Emits: upload.
- **RichTextEditor** — Toolbar (bold, italic, lists, link, image), editable content area. Props: modelValue (HTML string). Emits: update:modelValue. Use a lightweight editor library (Tiptap or similar).

### E13-S1-T5: Calendar and Scheduling Components
- **CalendarGrid** — Props: events, view (day/week/month), date. Day view: time-slot rows × staff columns. Week view: day columns. Month view: day cells. Event cards positioned by time. Emits: event-click, slot-click, view-change, date-change.
- **DatePicker** — Props: modelValue, range (boolean). Calendar popup. Emits: update:modelValue.
- **TimeSlotPicker** — Props: slots (array of available time slots), selected. Grid layout. Emits: select.

### E13-S1-T6: SDK HTTP API Client
Build in `@platform/sdk`:
- **HTTP transport**: fetch-based with configurable base URL, auth token injection via header, tenant ID header, error normalization (map HTTP errors to typed error objects).
- **Client factory**: `createApiClient(config)` returns typed client with domain namespaces.
- **Domain methods** — Each method maps to a backend endpoint and returns typed responses:
  - `auth.login()`, `auth.register()`, `auth.forgotPassword()`, `auth.resetPassword()`, `auth.me()`
  - `catalog.listCategories()`, `catalog.getCategory()`, `catalog.createCategory()`, `catalog.updateCategory()`, `catalog.deleteCategory()`, `catalog.listItems()`, `catalog.getItem()`, `catalog.createItem()`, `catalog.updateItem()`, `catalog.deleteItem()`
  - `services.list()`, `services.get()`, `services.create()`, `services.update()`, `services.delete()`, `services.getAvailability()`
  - `orders.list()`, `orders.get()`, `orders.create()`, `orders.updateStatus()`, `orders.refund()`
  - `bookings.list()`, `bookings.get()`, `bookings.create()`, `bookings.updateStatus()`, `bookings.reschedule()`, `bookings.cancel()`
  - `customers.list()`, `customers.get()`, `customers.getMetrics()`
  - `staff.list()`, `staff.get()`, `staff.invite()`, `staff.update()`, `staff.deactivate()`, `staff.getSchedule()`
  - `payments.getConfig()`, `payments.updateConfig()`, `payments.listMethods()`, `payments.addMethod()`, `payments.removeMethod()`
  - `notifications.list()`, `notifications.markRead()`
  - `analytics.dashboard()`, `analytics.revenue()`, `analytics.salesBreakdown()`, `analytics.topPerformers()`
  - `loyalty.getConfig()`, `loyalty.updateConfig()`, `loyalty.getCustomerPoints()`, `loyalty.listRewards()`, `loyalty.redeem()`
  - `search.query()`
  - `content.listPages()`, `content.getPage()`, `content.createPage()`, `content.updatePage()`, `content.deletePage()`, `content.listAnnouncements()`, `content.createAnnouncement()`, `content.updateAnnouncement()`
  - `locations.list()`, `locations.get()`, `locations.create()`, `locations.update()`, `locations.delete()`
  - `portfolio.list()`, `portfolio.get()`, `portfolio.create()`, `portfolio.update()`, `portfolio.delete()`
  - `quotes.list()`, `quotes.get()`, `quotes.create()`, `quotes.update()`, `quotes.send()`, `quotes.accept()`, `quotes.decline()`
  - `subscriptions.listPlans()`, `subscriptions.getPlan()`, `subscriptions.createPlan()`, `subscriptions.getSubscription()`, `subscriptions.cancel()`
  - `tenants.list()`, `tenants.get()`, `tenants.create()`, `tenants.update()`, `tenants.impersonate()`
  - `domains.list()`, `domains.get()`, `domains.create()`, `domains.verify()`, `domains.delete()`
  - `config.getModules()`, `config.updateModule()`, `config.getGlobal()`, `config.updateGlobal()`
  - `health.status()`, `health.jobs()`
  - `audit.list()`, `audit.get()`
  - `deployments.list()`, `deployments.get()`, `deployments.trigger()`, `deployments.rollback()`
- **Pagination helper**: wrap list methods with `paginated()` util that handles cursor/offset pagination.
- **Request/response interceptors**: loading state tracking, error normalization.

## Constraints

- All components MUST use design tokens from `@platform/ui` — no hardcoded hex colors, px spacing values, or font-family strings.
- Components must support tenant theme overrides via CSS custom properties.
- SDK client methods must have fully typed request params and response types — import from `@platform/types`.
- SDK auth token must be injected via interceptor, not passed per-call.
- Do NOT build page-level components in this story — only reusable primitives.
- Do NOT add any runtime dependencies without checking `platform/package.json` first. Prefer lightweight libraries.

## Validation Commands

```bash
pnpm --filter @platform/ui typecheck
pnpm --filter @platform/sdk typecheck
pnpm --filter @platform/ui test
pnpm --filter @platform/sdk test
pnpm typecheck
```

## Handoff Instructions

Create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S1-T1.md
agents/epics/handoffs/YYYY-MM-DD-E13-S1-T2.md
agents/epics/handoffs/YYYY-MM-DD-E13-S1-T3.md
agents/epics/handoffs/YYYY-MM-DD-E13-S1-T4.md
agents/epics/handoffs/YYYY-MM-DD-E13-S1-T5.md
agents/epics/handoffs/YYYY-MM-DD-E13-S1-T6.md
```

Each handoff must include:
- Task ID and status
- Component list with props/emits/slots API
- Design token usage patterns
- SDK method signatures and endpoint mapping
- Validation commands run and results
- Files created/modified

Update the active task board accordingly.

## Downstream Consumers

Every prompt 28-34 depends on this prompt. The components and SDK client you build here are used in all three portals:
- web-customer (prompts 28-30): CardGrid, StepperWizard, FormSection, Pagination, SDK catalog/orders/bookings/auth methods
- web-admin (prompts 31-33): AppShell, DataTable, MetricCard, SlidePanel, TabBar, SearchToolbar, CalendarGrid, SDK admin methods
- web-platform-admin (prompt 34): AppShell, DataTable, MetricCard, CardGrid, SDK tenant/domain/config methods

## Stop Conditions

- STOP if `@platform/ui` has an incompatible build setup for Vue SFC — document and escalate.
- STOP if `@platform/types` does not export the domain types needed for SDK method signatures — build the minimum missing types and document.
- STOP if the existing design token structure does not support CSS custom property theming — propose a migration path in handoff.
