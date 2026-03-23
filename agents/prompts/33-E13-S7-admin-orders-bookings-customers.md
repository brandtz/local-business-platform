# Prompt 33: E13-S7 Business Admin — Orders, Bookings, Customers, Staff, Analytics

## Sequence Position

- Prompt: 33 of 46
- Epic: 13 — Frontend Implementation and Component Library
- Story: E13-S7
- Tasks: E13-S7-T1, E13-S7-T2, E13-S7-T3, E13-S7-T4, E13-S7-T5, E13-S7-T6, E13-S7-T7, E13-S7-T8
- Phase: E13 UI Foundation (depends on prompt 31; can run parallel with prompt 30)

## Prerequisites

- E13-S1 (prompt 27) — DataTable, MetricCard, CalendarGrid, StatusBadge, SlidePanel, CardGrid, SearchToolbar, Pagination
- E13-S5 (prompt 31) — admin shell with navigation, dashboard pattern (chart library)
- E7-S1, E7-S2, E7-S3, E7-S5 (orders, bookings, customer identity) — completed backend
- E11-S1 (analytics and reporting) — completed backend
- E11-S2 (loyalty) — completed backend
- E11-S5 (portfolio) — completed backend

## Context for the Agent

You are building the **operational management pages** of the Business Admin portal — the screens where business owners and staff manage day-to-day operations: processing orders, managing bookings on a calendar, viewing customer CRM data, managing staff, configuring loyalty, and reviewing analytics.

This is the most screen-dense story. The order pipeline and booking calendar are the most complex UI components. The orders page has status filter tabs and inline action buttons. The booking calendar renders different views (day/week/month) with staff columns and event cards. The CRM has a slide-out customer profile panel.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-13.md
agents/epics/epic-13-tasks.md (section E13-S7)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/design/screen-reference-index.md (BA-07 through BA-13, Analytics)
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S1-*.md
agents/epics/handoffs/YYYY-MM-DD-E13-S5-*.md (admin shell, chart library)
agents/epics/handoffs/*-E7-S1*.md (orders)
agents/epics/handoffs/*-E7-S3*.md (bookings)
agents/epics/handoffs/*-E7-S5*.md (customer identity)
agents/epics/handoffs/*-E11-S1*.md (analytics)
agents/epics/handoffs/*-E11-S2*.md (loyalty)
agents/epics/handoffs/*-E11-S5*.md (portfolio)
```

Read HTML design references:

```
agents/design/Portal Design - Business Admin - orders and booking.html (BA-08, BA-09, BA-10, BA-11)
agents/design/Portal Design - Business Admin - customers and staff.html (BA-07, BA-12)
agents/design/Portal Design - Business Admin - analytics.html
```

Inspect code surfaces:

```
platform/apps/web-admin/src/ (admin shell and pages from E13-S5, E13-S6)
platform/packages/sdk/src/ (orders, bookings, customers, staff, analytics, loyalty methods)
platform/packages/types/src/ (order, booking, customer, staff, analytics types)
```

## Implementation Scope

### E13-S7-T1: Orders Dashboard and List (BA-08)
- MetricCards row: Total Orders, Pending, In-Progress, Completed (with period selector: Today, This Week, This Month)
- Orders DataTable with status filter tabs: All | Pending | Accepted | Preparing | Ready | Completed | Cancelled
- Table columns: order #, customer name, items count, total, status badge, created time, actions
- Inline actions: Accept (for Pending), Mark Preparing, Mark Ready, Complete
- SearchToolbar: search by order # or customer name, date range filter
- Pagination
- Click row → navigate to order detail
- Fetch: `orders.list({ status, search, dateRange, page })`, order metrics endpoint
- Route: `/admin/orders`

### E13-S7-T2: Order Detail (BA-09)
- Order header: order #, customer name/email, status badge, created date
- Status workflow buttons: context-sensitive action buttons based on current status (Accept → Prepare → Ready → Complete). "Cancel Order" secondary action.
- Line items table: item name, modifiers, quantity, unit price, line total
- Pricing breakdown: subtotal, tax, tip, discount, total
- Fulfillment info: delivery address or pickup location, scheduled time
- Customer info card: name, email, phone, total orders count
- Refund section: partial refund (line item select + amount) or full refund with confirmation
- Notes/comments: internal notes textarea for staff
- Fetch: `orders.get(orderId)`
- Actions: `orders.updateStatus(orderId, newStatus)`, `orders.refund(orderId, refundData)`
- Route: `/admin/orders/:orderId`

### E13-S7-T3: Bookings Calendar (BA-10)
- CalendarGrid component with view toggle: Day | Week | Month
- **Day view**: Time rows (30-min increments) × staff columns. Booking cards placed at correct time/staff intersection with color by status.
- **Week view**: Day columns with time rows. Booking cards stacked by time.
- **Month view**: Day cells with booking count badges. Click to drill down to day view.
- Click booking card → navigate to booking detail
- "New Booking" button → quick-create modal (service, customer, date/time, staff)
- Date navigation: prev/next, today button, date picker jump
- Fetch: `bookings.list({ dateRange, staffId, view })` for calendar events
- Route: `/admin/bookings`

### E13-S7-T4: Booking Detail (BA-11)
- Booking header: service name, customer name, staff assigned, date/time, status badge
- Status workflow buttons: Confirm → Check In → In Progress → Complete. "Cancel" secondary action.
- Reschedule action: opens date/time/staff picker (DatePicker + TimeSlotPicker)
- Staff reassignment: dropdown to switch to different staff member
- Cancel with reason: modal with reason textarea and confirmation
- Booking notes: internal notes for staff
- Fetch: `bookings.get(bookingId)`
- Actions: `bookings.updateStatus()`, `bookings.reschedule()`, `bookings.cancel()`
- Route: `/admin/bookings/:bookingId`

### E13-S7-T5: Customers CRM (BA-12)
- Customer DataTable: name, email, phone, total orders, total spend, last order date, status (Active/Inactive)
- SearchToolbar: search by name/email, filter by activity (All, Active, High-Value, Inactive)
- Click row → slide-out customer profile panel (SlidePanel):
  - Contact info section
  - Metrics: total orders, total spend, average order value, first/last order dates
  - Recent orders list (compact)
  - Loyalty status (points, tier) if loyalty module enabled
  - Notes section
- Pagination
- Fetch: `customers.list({ search, filter, page })`, `customers.get(customerId)`, `customers.getMetrics(customerId)`
- Route: `/admin/customers`

### E13-S7-T6: Staff Management (BA-07)
- Staff CardGrid: photo/avatar, name, role, status badge (Active/Invited/Deactivated)
- Invite staff button → Modal: email, name, role selector (Admin, Manager, Staff), assigned services multi-select
- Staff detail SlidePanel or page:
  - Profile: name, email, phone, role, avatar
  - Schedule: weekly availability grid
  - Assigned services list
  - Booking metrics: total bookings, upcoming, utilization rate
  - Edit, deactivate actions
- Fetch: `staff.list()`, `staff.get(staffId)`, `staff.invite()`, `staff.update()`, `staff.deactivate()`, `staff.getSchedule(staffId)`
- Route: `/admin/staff`

### E13-S7-T7: Loyalty Program Configuration (BA-13)
- Points configuration: points earned per dollar spent, rounding rules
- Tier definitions DataTable: tier name, points threshold, benefits description. CRUD via SlidePanel.
- Rewards catalog DataTable: reward name, points cost, description, availability status. CRUD via SlidePanel.
- Module-gated: show "Enable Loyalty Module" placeholder if module not enabled in tenant config
- Fetch: `loyalty.getConfig()`, `loyalty.updateConfig()`, `loyalty.listRewards()`
- Route: `/admin/loyalty`

### E13-S7-T8: Analytics Dashboard
- Revenue charts: line/bar chart for daily/weekly/monthly revenue with period toggle
- Sales breakdown: pie/donut chart by category, top products/services tables
- Customer metrics: new customers, returning customers, retention rate
- Booking analytics: utilization rate by staff, most popular services, peak hours heatmap
- Top performers: top products by revenue, top services by bookings, top staff by utilization
- Date range selector affecting all charts
- Use same chart library as E13-S5 dashboard
- Fetch: `analytics.dashboard()`, `analytics.revenue({ period })`, `analytics.salesBreakdown()`, `analytics.topPerformers()`
- Route: `/admin/analytics`

## Constraints

- CalendarGrid is the most complex component — ensure it correctly positions booking events at time+staff intersections
- Order workflow buttons must be context-sensitive — only show valid next status transitions
- CRM slide panel must load customer data lazily (on row click, not all at once)
- Chart library: reuse whatever was chosen in E13-S5 (prompt 31)
- Module gating: loyalty section hidden if module disabled
- All API calls through `@platform/sdk`
- Loading, error, empty states everywhere
- Responsive: calendar should allow horizontal scroll on tablet, DataTables scroll horizontally

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
agents/epics/handoffs/YYYY-MM-DD-E13-S7-T1.md
agents/epics/handoffs/YYYY-MM-DD-E13-S7-T2.md
agents/epics/handoffs/YYYY-MM-DD-E13-S7-T3.md
agents/epics/handoffs/YYYY-MM-DD-E13-S7-T4.md
agents/epics/handoffs/YYYY-MM-DD-E13-S7-T5.md
agents/epics/handoffs/YYYY-MM-DD-E13-S7-T6.md
agents/epics/handoffs/YYYY-MM-DD-E13-S7-T7.md
agents/epics/handoffs/YYYY-MM-DD-E13-S7-T8.md
```

Each handoff must include:
- Order/booking workflow state machine (which buttons appear for which status)
- Calendar event positioning algorithm
- CRM slide panel lazy loading approach
- Chart library usage and data contracts
- SDK methods consumed
- Module gating implementation
- Playwright test results
- Files created/modified

## Downstream Consumers

- Customer-facing order/booking confirmations (prompts 29-30) show the customer side of these transactions
- E13-S8 (prompt 34) platform admin sees aggregated analytics across tenants

## Stop Conditions

- STOP if CalendarGrid component from E13-S1 is missing or incomplete — build a simplified version and document
- STOP if order/booking status workflow data is not available from backend — implement with hardcoded transitions and document
- STOP if analytics endpoints return different shapes than expected — adapt and document in handoff
