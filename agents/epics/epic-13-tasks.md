# Epic 13: Frontend Implementation and Component Library — Task Plan

## E13-S1: Shared Component Library and SDK API Client

### E13-S1-T1: AppShell and Layout Components
- AppShell with fixed sidebar, sticky header, scrollable content area
- Sidebar navigation with collapsible groups, active route highlight, module gating
- Header with breadcrumb, tenant branding slot, user menu dropdown
- Layout primitives: PageHeader, PageContent, SplitLayout

### E13-S1-T2: Data Display Components
- DataTable: sortable columns, filter bar, bulk-select checkboxes, row actions, pagination, empty/loading states
- MetricCard: icon, label, value, trend badge (% + direction arrow)
- StatusBadge: semantic color pill (Active, Draft, Pending, Completed, Error, etc.)
- CardGrid: responsive grid of uniform cards with consistent internal layout
- ActivityTimeline: vertical timeline with icon, title, timestamp, description
- Pagination: page numbers, prev/next, "showing X of Y" label

### E13-S1-T3: Interactive Components
- SlidePanel: right-side slide-in with overlay backdrop, header, scrollable content, close on escape/overlay
- Modal: centered overlay with header, body, footer action buttons, focus trap, close on escape
- TabBar: horizontal tabs with active underline indicator, slot content switching
- SearchToolbar: search input + filter button + sort dropdown + action buttons
- StepperWizard: multi-step progress indicator with active/completed/pending states, step navigation
- ToggleSwitch: label + description + toggle control

### E13-S1-T4: Form Components
- FormSection: grouped fields with labels, description, validation error display
- Form field wrappers for text, textarea, select, multi-select, date, number, email, password
- Password strength indicator
- File/image upload with preview
- RichTextEditor: toolbar (bold/italic/lists/link/image), editable content area, draft/publish state

### E13-S1-T5: Calendar and Scheduling Components
- CalendarGrid: day/week/month view toggle, time-slot rows, staff columns, event card placement
- DatePicker: single date and date range selection
- TimeSlotPicker: available slot grid for booking flows

### E13-S1-T6: SDK HTTP API Client
- HTTP transport layer (fetch-based) with auth token injection, tenant header, error normalization
- Typed client methods for: auth, catalog (categories, items), services, orders, bookings, payments, customers, staff, notifications, analytics, loyalty, search, content, locations, portfolio, quotes, subscriptions
- Typed client methods for platform admin: tenants, domains, module config, system health, audit, deployments
- Request/response interceptors for loading state, error toasts
- Pagination helper for list endpoints

### Test Requirements
- Unit tests for every component: renders, props, emits, accessibility
- SDK client: mock HTTP responses, verify typed returns
- Visual snapshot tests for key component states (default, loading, error, empty)

---

## E13-S2: Customer Portal — Storefront and Browse

### E13-S2-T1: Storefront Home (CP-01)
- Hero banner with tenant branding and CTA
- Featured categories grid (CardGrid)
- Flash deals / featured products carousel
- Trust bar / store info strip
- Route: `/` (tenant root)

### E13-S2-T2: Catalog / Menu Browse (CP-02)
- Product grid with category sidebar/filter
- Sort bar, active filter tags, search
- Pagination of results
- Responsive layout (grid → list on mobile)
- Route: `/menu` or `/catalog`

### E13-S2-T3: Item Detail (CP-03)
- Product image, description, pricing
- Modifier groups and options selection
- Quantity selector, add-to-cart button
- Related items section
- Route: `/menu/:itemId`

### E13-S2-T4: Services Browse (CP-07) and Service Detail (CP-08)
- Service cards grid with category filter
- Service detail with duration, pricing, booking CTA
- Routes: `/services`, `/services/:serviceId`

### E13-S2-T5: Login / Register / Reset (CP-20)
- Sign in / register tab toggle
- Email/password form with validation
- Password strength indicator on register
- Forgot password / reset flow
- Social login buttons (configurable)
- Split layout with branding panel
- Routes: `/login`, `/register`, `/forgot-password`

### E13-S2-T6: Content Pages (CP-19)
- CMS rich text render page
- Route: `/pages/:slug`

### E13-S2-T7: Customer Layout Shell
- Customer-facing layout: header with tenant branding, navigation, cart icon with count badge
- Footer with store info, links
- Auth state management (logged in vs guest)
- Route guard setup for protected routes

### Test Requirements
- Playwright smoke: navigate to storefront, browse catalog, view item detail, navigate to services
- Unit: each page component renders with mocked SDK data
- Auth flow: register → login → redirect

---

## E13-S3: Customer Portal — Commerce Flow

### E13-S3-T1: Cart (CP-04)
- Cart items list with product image, name, modifiers, quantity controls, line price
- Remove item, clear cart
- Order notes textarea
- Cart summary: subtotal, estimated tax, total
- Proceed to checkout CTA
- Route: `/cart`

### E13-S3-T2: Checkout Stepper (CP-05)
- 3-step wizard: Fulfillment → Payment → Review
- Step 1: Delivery/pickup toggle, address form (delivery), location selector (pickup), scheduling
- Step 2: Payment method selection, tip selector, promo code input
- Step 3: Order summary, terms acknowledgment, place order button
- Route: `/checkout`

### E13-S3-T3: Order Confirmation (CP-06)
- Success hero with confetti/icon
- Tracking timeline (status steps)
- Receipt with line items, totals
- Customer info card
- Next actions: track order, continue shopping
- Route: `/orders/:orderId/confirmation`

### E13-S3-T4: Booking Availability Picker (CP-09)
- Date picker (calendar view)
- Available time slots grid for selected date
- Staff selection (optional, if enabled)
- Location selection (if multi-location)
- Add-on services selection
- Route: `/book/:serviceId`

### E13-S3-T5: Booking Confirmation (CP-10)
- Confirmation hero
- Booking details: service, date/time, staff, location
- Calendar integration (add to calendar link)
- Manage booking actions: reschedule, cancel
- Route: `/bookings/:bookingId/confirmation`

### Test Requirements
- Playwright: full cart → checkout → confirmation flow (mock payment)
- Playwright: booking flow from service → availability → confirmation
- Unit: cart calculations, stepper navigation, form validation

---

## E13-S4: Customer Portal — Account Area

### E13-S4-T1: Account Dashboard (CP-11)
- Profile card with avatar, name, email
- Sidebar navigation: Profile, Orders, Bookings, Loyalty, Payments
- Quick stats: total orders, upcoming bookings, loyalty points
- Route: `/account`

### E13-S4-T2: Profile Settings (CP-12)
- Display name, email, phone, avatar
- Edit profile form in slide panel or inline
- Change password flow
- Communication preferences
- Route: `/account/profile`

### E13-S4-T3: Order History and Detail (CP-13, CP-14)
- Order cards list with status badges, date, total
- Sort by date, filter by status
- Order detail page: full receipt, status timeline, reorder CTA
- Routes: `/account/orders`, `/account/orders/:orderId`

### E13-S4-T4: Booking History and Detail (CP-15, CP-16)
- Upcoming vs past sections
- Booking cards with service, date/time, staff, status
- Booking detail: service info, cancel/reschedule actions, add-to-calendar
- Routes: `/account/bookings`, `/account/bookings/:bookingId`

### E13-S4-T5: Loyalty and Rewards (CP-17)
- Points balance display
- Tier progress bar with milestones
- Available rewards list with redeem CTA
- Points history (earned/redeemed)
- Route: `/account/loyalty`

### E13-S4-T6: Payment Methods (CP-18)
- Saved card list with brand icons, last-4, expiry
- Default card badge
- Add new payment method modal
- Remove card with confirmation
- Route: `/account/payments`

### Test Requirements
- Playwright: login → navigate account sections → verify data renders
- Unit: each account page renders with mocked data, edit forms validate
- Edge cases: empty states (no orders, no bookings, no loyalty enrollment)

---

## E13-S5: Business Admin — Shell, Dashboard, and Settings

### E13-S5-T1: Admin Shell and Navigation
- AppShell with sidebar from E13-S1
- Sidebar sections: Dashboard, Catalog, Orders, Bookings, Customers, Staff, Content, Analytics, Settings
- Module gating: hide sidebar items for disabled modules
- Header with tenant name, impersonation banner (when impersonating), user menu
- Responsive sidebar collapse

### E13-S5-T2: Admin Dashboard (BA-01)
- KPI MetricCards row: revenue, orders, bookings, customers (today/period)
- Revenue chart (bar or line)
- Recent orders table (compact DataTable)
- Activity timeline
- Quick action buttons
- Route: `/admin`

### E13-S5-T3: Business Profile and Branding (BA-02)
- Business profile form: name, description, contact info, tax info
- Branding section: logo upload, color pickers (primary, secondary, accent), typography presets
- Live preview panel
- Save/publish actions
- Route: `/admin/settings/profile`

### E13-S5-T4: Payment Gateway Settings (BA-16)
- Payment provider cards (Stripe, Square)
- Connection status indicator
- Connect/manage/disconnect buttons
- Payment method configuration (accepted types)
- Route: `/admin/settings/payments`

### E13-S5-T5: Tenant User Management (BA-17)
- User list DataTable with role, status, last active
- Invite user flow (email + role selection)
- Edit user role, deactivate user
- User activity trail
- Route: `/admin/settings/users`

### E13-S5-T6: Activity and Audit Log (BA-18)
- Filter bar: date range, user, action type
- Activity table with columns: timestamp, user, action, target, details
- Pagination
- Route: `/admin/settings/activity`

### E13-S5-T7: Admin Sign In
- Email/password form
- Social login options (configurable)
- Remember me, forgot password
- Redirect to dashboard on success
- Route: `/admin/login`

### Test Requirements
- Playwright: admin login → dashboard renders with data → navigate all settings sections
- Unit: sidebar module gating, MetricCard rendering, form validation
- Auth: sign-in flow, redirect on unauthenticated access

---

## E13-S6: Business Admin — Catalog, Services, and Content

### E13-S6-T1: Category Management (BA-04)
- Category list/tree with drag-reorder
- CRUD: create, edit, delete category (slide panel or inline)
- Category image upload
- Parent/child relationship management
- Route: `/admin/catalog/categories`

### E13-S6-T2: Item / Product Management (BA-05)
- DataTable with search, filters, bulk-select
- Side panel for create/edit: name, description, price, media gallery, modifier groups, category assignment, availability toggle
- Bulk actions: activate, deactivate, delete
- Route: `/admin/catalog/products`

### E13-S6-T3: Services Management (BA-06)
- Service list with DataTable
- Side panel for create/edit: name, description, duration, pricing, booking settings, staff assignment, availability
- Service category management
- Route: `/admin/catalog/services`

### E13-S6-T4: Location Management (BA-03)
- Location list DataTable
- Location detail form: name, address, contact, operating hours grid (day/open/close), fulfillment options checkboxes
- Route: `/admin/content/locations`

### E13-S6-T5: Content Pages Editor (BA-14)
- Content page cards grid with status badges (Draft, Published)
- Create/edit page: title, slug, RichTextEditor, SEO fields
- Draft/publish workflow with preview
- Route: `/admin/content/pages`

### E13-S6-T6: Announcements and Promotions (BA-15)
- Announcements DataTable with status, date range, visibility
- Create/edit announcement: title, content, scheduling (start/end date), audience targeting
- Activate/deactivate toggle
- Route: `/admin/content/announcements`

### Test Requirements
- Playwright: create a product → verify it appears in list → edit → delete
- Playwright: create a service → verify booking settings render
- Unit: DataTable filtering, side panel open/close, form validation, drag-reorder

---

## E13-S7: Business Admin — Orders, Bookings, Customers, Staff, Analytics

### E13-S7-T1: Orders Dashboard and List (BA-08)
- Metrics cards: total orders, pending, in-progress, completed (today/period)
- Orders DataTable with status filter tabs, search, date range
- Inline action buttons: view, accept, process, complete
- Route: `/admin/orders`

### E13-S7-T2: Order Detail (BA-09)
- Order header: ID, customer, status badge, created date
- Status workflow buttons (accept → prepare → ready → complete)
- Line items table with pricing breakdown
- Customer info card
- Refund actions (partial/full)
- Notes/comments section
- Route: `/admin/orders/:orderId`

### E13-S7-T3: Bookings Calendar (BA-10)
- CalendarGrid: day/week/month view toggle
- Staff columns in day view
- Booking event cards with color by status
- Click to view detail
- New booking quick-create
- Route: `/admin/bookings`

### E13-S7-T4: Booking Detail (BA-11)
- Booking header: service, customer, staff, date/time, status
- Status workflow: confirm → check-in → in-progress → complete
- Reschedule action (date/time/staff picker)
- Staff reassignment
- Cancel with reason
- Route: `/admin/bookings/:bookingId`

### E13-S7-T5: Customers CRM (BA-12)
- Customer DataTable with search, filters (active, recent, high-value)
- Slide-out customer profile panel: contact info, metrics (total spend, orders, visits), order history, notes
- Route: `/admin/customers`

### E13-S7-T6: Staff Management (BA-07)
- Staff card grid with photo, name, role, status
- Invite modal: email, role, permissions
- Staff detail: schedule, services assigned, booking metrics
- Edit/deactivate actions
- Route: `/admin/staff`

### E13-S7-T7: Loyalty Program Configuration (BA-13)
- Points-per-dollar configuration
- Tier definitions: name, threshold, benefits
- Rewards catalog: create reward with point cost, description, availability
- Route: `/admin/loyalty`

### E13-S7-T8: Analytics Dashboard
- Revenue charts: daily/weekly/monthly toggle
- Sales breakdown by category, product, service
- Top performers (products, services, staff)
- Customer metrics: new, returning, retention rate
- Booking utilization rates
- Route: `/admin/analytics`

### Test Requirements
- Playwright: view orders list → click order → process through workflow
- Playwright: navigate bookings calendar → view booking detail
- Unit: calendar view switching, order workflow buttons, customer panel, analytics chart rendering
- Edge cases: empty order list, no bookings, zero analytics

---

## E13-S8: Platform Admin Portal

### E13-S8-T1: Platform Admin Shell and Sign In
- AppShell with platform sidebar: Dashboard, Tenants, Domains, Config, Operations, Analytics, Audit, Publishing
- Platform-level header (no tenant branding)
- Sign in with SSO (Entra ID / Google Workspace), MFA 6-digit input
- Routes: `/platform/login`, `/platform`

### E13-S8-T2: Platform Dashboard (PA-01)
- KPI MetricCards: total tenants, active tenants, GMV, system health %
- Traffic/GMV trend chart
- System health bars (API, DB, Redis, Queue)
- Active alerts list
- Recent deployments
- Route: `/platform`

### E13-S8-T3: Tenant Management (PA-02, PA-03, PA-04)
- Tenant card grid with status tabs (Active, Trial, Suspended, Archived)
- Module tags and plan badges on cards
- Tenant detail view: config, usage metrics, manage domains, impersonate admin
- Tenant provisioning wizard: name, plan, modules, admin user, domain
- Routes: `/platform/tenants`, `/platform/tenants/:tenantId`, `/platform/tenants/new`

### E13-S8-T4: Domain Management (PA-06)
- Stats cards: total domains, active, pending verification
- Domain DataTable with columns: domain, tenant, DNS status, SSL status, verified date
- Verification actions: check DNS, retry SSL
- Add domain flow
- Route: `/platform/domains`

### E13-S8-T5: Configuration and Integration (PA-05, PA-07, PA-08, PA-11)
- Module configuration: feature flags with toggles
- Global settings form: platform defaults
- Templates and themes management
- Payment provider configuration at platform level
- Routes: `/platform/config`, `/platform/config/modules`, `/platform/config/templates`, `/platform/config/payments`

### E13-S8-T6: Operations (PA-09, PA-10)
- System health cards: API, DB, Redis, Queue with status, uptime, latency
- Alert banner for active issues
- Background jobs monitor: queue depth, processing rate, failed jobs
- Logs explorer: service and level selectors, terminal-style log viewer with auto-scroll
- Routes: `/platform/operations`, `/platform/operations/logs`

### E13-S8-T7: Analytics and Audit (PA-12, PA-13)
- Platform analytics: tenant growth chart, GMV trend, top tenants table with health scores
- KPI cards: total revenue, tenant count, churn rate
- Audit trail: filterable event log (user, action, timestamp, target, severity)
- Error tracking section
- Routes: `/platform/analytics`, `/platform/audit`

### E13-S8-T8: Publishing and Deployments (PA-14)
- Deployment stats cards: total deployments, success rate, avg duration
- Pipeline visualization: build → test → staging → production
- Release history DataTable with version, date, status, rollback action
- Rollback confirmation modal
- Route: `/platform/publishing`

### Test Requirements
- Playwright: platform login → dashboard renders → navigate all sections
- Playwright: tenant provisioning wizard flow
- Unit: tenant card grid rendering, domain status indicators, log viewer, pipeline visualization
- Auth: SSO login flow, MFA verification

---

## Playwright Delivery Overlay

Every story MUST include Playwright test coverage as follows:

| Project | Focus |
|---------|-------|
| `web-customer-smoke` | Storefront load, catalog browse, item view, auth flow |
| `web-customer-commerce` | Cart → checkout → confirmation e2e |
| `web-customer-account` | Account navigation, order/booking history |
| `web-admin-smoke` | Admin login, dashboard data render, navigation |
| `web-admin-catalog` | Product CRUD, service CRUD, content CRUD |
| `web-admin-orders` | Order list → detail → workflow, booking calendar |
| `web-platform-smoke` | Platform login, dashboard, tenant list |

All Playwright tests must follow `agents/PLAYWRIGHT_AGENT_STANDARD.md`.
