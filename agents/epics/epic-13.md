# Epic 13: Frontend Implementation and Component Library

## Objective

Build the complete visual frontend for all three portals (Customer, Business Admin, Platform Admin) using Vue 3 SFC components backed by the existing backend contracts, type definitions, view-model transformers, and API services built in Epics 1–12.

## Context

Epics 1–12 established a comprehensive backend — types, API services, Prisma schemas, state management functions, route definitions, and view-model transformers — but the frontend apps remain shell-only with placeholder `h()` render functions. The `@platform/ui` package contains design tokens and descriptor types but zero renderable Vue components. The `@platform/sdk` package has API client configuration types but no HTTP transport or domain-specific methods.

22 detailed HTML design reference files exist in `agents/design/` covering ~50+ screens across all three portals. The `screen-reference-index.md` maps each screen to its design file and documents shared component patterns. The `ux-design-brief.md` provides authoritative requirements.

This epic connects the backend to the user. Every story produces working, styled, interactive Vue components that consume real API endpoints and render real data.

## Scope

- shared Vue component library in `@platform/ui` (DataTable, MetricCard, StatusBadge, SlidePanel, Modal, TabBar, FormSection, CalendarGrid, SearchToolbar, Pagination, StepperWizard, CardGrid, ActivityTimeline, ToggleSwitch, RichTextEditor, AppShell)
- HTTP API client in `@platform/sdk` with typed domain methods for all completed backend services
- Customer Portal: storefront home, catalog/menu browse, item detail, services browse/detail, cart, checkout, order/booking confirmation, account dashboard, profile, order/booking history, loyalty, payment methods, login/register
- Business Admin Portal: dashboard, catalog/services/content management, orders/bookings management, customers/staff, analytics, settings, payment gateway config, activity log, sign-in
- Platform Admin Portal: dashboard, tenant management, domain management, module/global config, templates/themes, system health, logs, analytics, audit trail, publishing, sign-in

## Deliverables

- `@platform/ui` Vue component library with all shared components listed in `screen-reference-index.md`
- `@platform/sdk` HTTP API client with typed methods for auth, catalog, services, orders, bookings, payments, notifications, analytics, loyalty, search, portfolio, subscriptions, tenants, domains, import
- Customer Portal (`web-customer`): all CP-01 through CP-20 screens as Vue SFC components with routing, data fetching, and interactivity
- Business Admin Portal (`web-admin`): all BA-01 through BA-18 screens plus analytics and sign-in
- Platform Admin Portal (`web-platform-admin`): all PA-01 through PA-14 screens plus sign-in

## Acceptance Criteria

- all three portals render styled, interactive screens matching the HTML design references
- every screen fetches real data from the API (with loading states, error states, empty states)
- navigation between screens works via vue-router with proper auth guards
- shared components from `@platform/ui` are used consistently across portals
- all screens use semantic design tokens from `@platform/ui` — no hardcoded colors
- tenant theming (`TenantThemeOverride`) applies correctly to customer portal and business admin
- module gating hides/disables features not in tenant's configuration
- forms validate input and display errors
- responsive layout works at desktop and tablet breakpoints minimum

## Story Decomposition

### E13-S1: Shared Component Library and SDK API Client

Outcome:
- `@platform/ui` exports renderable Vue 3 SFC components for all shared patterns (DataTable, MetricCard, StatusBadge, SlidePanel, Modal, TabBar, FormSection, CalendarGrid, SearchToolbar, Pagination, StepperWizard, CardGrid, ActivityTimeline, ToggleSwitch, AppShell with sidebar+header+content layout)
- `@platform/sdk` exports an HTTP API client with typed methods for every completed backend domain

Dependencies:
- E4 (frontend shell contracts)
- E1-E3 (foundation types)

Acceptance Signals:
- components render correctly in isolation with props
- SDK methods return typed responses from API endpoints
- components consume design tokens for all colors, spacing, typography
- components support tenant theme overrides

### E13-S2: Customer Portal — Storefront and Browse

Outcome:
- storefront home (CP-01), catalog/menu browse (CP-02), item detail (CP-03), services browse (CP-07), service detail (CP-08), login/register/reset (CP-20), content pages (CP-19)
- routes wired in vue-router, data fetched from API, loading/error/empty states handled

Dependencies:
- E13-S1
- E6 (catalog, services backend)
- E4-S2 (tenant bootstrap)

Acceptance Signals:
- storefront home displays hero, featured categories, and template-driven layout
- browsing catalog shows products with category filters, search, pagination
- item detail shows modifiers, pricing, add-to-cart
- login/register forms authenticate against API

### E13-S3: Customer Portal — Commerce Flow

Outcome:
- cart (CP-04), checkout stepper (CP-05), order confirmation (CP-06), booking availability picker (CP-09), booking confirmation (CP-10)
- full purchase flow from cart through payment to confirmation

Dependencies:
- E13-S2
- E7 (cart, orders, bookings backend)
- E8-S2 (payment processing)

Acceptance Signals:
- cart shows items with quantity controls, price totals
- checkout stepper walks through fulfillment, payment, confirmation
- booking picker shows available slots by date/staff
- confirmation pages show order/booking details with status

### E13-S4: Customer Portal — Account Area

Outcome:
- account dashboard (CP-11), profile settings (CP-12), order history (CP-13), order detail (CP-14), booking history (CP-15), booking detail (CP-16), loyalty and rewards (CP-17), payment methods (CP-18)

Dependencies:
- E13-S3
- E7-S5 (customer identity)
- E11-S2 (loyalty)

Acceptance Signals:
- account dashboard shows profile summary, recent orders, loyalty status
- order and booking history lists render with status badges and detail navigation
- loyalty shows points balance, tier progress, redemption options
- payment methods list cards on file with add/remove

### E13-S5: Business Admin — Shell, Dashboard, and Settings

Outcome:
- admin shell with sidebar navigation, header, impersonation banner
- dashboard (BA-01) with KPI cards, recent orders, activity timeline
- settings: business profile (BA-02), payment gateway (BA-16), user management (BA-17), activity log (BA-18)
- sign-in page

Dependencies:
- E13-S1
- E5 (admin navigation)
- E2 (auth)
- E8-S1 (payments config)

Acceptance Signals:
- sidebar navigation reflects enabled modules
- dashboard shows real KPI data from analytics API
- settings forms save and validate correctly
- activity log filters and paginates

### E13-S6: Business Admin — Catalog, Services, and Content

Outcome:
- category management (BA-04), item/product management (BA-05), services management (BA-06)
- location management (BA-03), content pages editor (BA-14), announcements (BA-15)
- CRUD operations via slide panels, tab-based layout matching design specs

Dependencies:
- E13-S5
- E6 (catalog, services, content backend)

Acceptance Signals:
- catalog items display in DataTable with search, filters, bulk select
- side panel opens for create/edit with form validation
- services form includes duration, pricing, booking settings
- content pages editor has rich text editing with draft/publish
- locations show operating hours grid

### E13-S7: Business Admin — Orders, Bookings, Customers, Staff, Analytics

Outcome:
- orders dashboard and list (BA-08), order detail (BA-09)
- bookings calendar and list (BA-10), booking detail (BA-11)
- customers CRM (BA-12), staff management (BA-07)
- loyalty config (BA-13), analytics dashboard
- tab-based layout with data tables, calendar grid, and slide panels

Dependencies:
- E13-S6
- E7 (orders, bookings backend)
- E11-S1 (analytics)
- E11-S2 (loyalty)
- E11-S5 (portfolio)

Acceptance Signals:
- orders list with status filters, inline actions, detail view
- bookings calendar renders day/week/month views with staff columns
- customers CRM shows DataTable with slide-out profile panel
- staff management shows card grid with invite modal
- analytics dashboard shows revenue charts, top performers

### E13-S8: Platform Admin Portal

Outcome:
- all PA-01 through PA-14 screens
- dashboard, tenant list/detail/provisioning, domain management, module config, global settings, templates/themes, system health, logs explorer, payment providers, platform analytics, audit trail, publishing/deployments, sign-in

Dependencies:
- E13-S1
- E3 (tenant lifecycle)
- E8 (domains, payments, integrations)
- E11-S3 (search)

Acceptance Signals:
- dashboard shows platform-level KPIs, system health, active alerts
- tenant list with status tabs, module tags, plan badges
- domain management table with DNS/SSL status indicators
- system health monitors with real-time-ish updates
- audit trail with filterable event log

## Dependencies

- E1-E8 (all completed backend services)
- E9-S2, E11-S1, E11-S2, E11-S3, E11-S5, E12-S1 (completed backend from current cycle)
- E4 (frontend shell contracts — consumed and extended)
- Design reference files in `agents/design/`
