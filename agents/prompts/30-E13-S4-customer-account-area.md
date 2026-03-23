# Prompt 30: E13-S4 Customer Portal — Account Area

## Sequence Position

- Prompt: 30 of 46
- Epic: 13 — Frontend Implementation and Component Library
- Story: E13-S4
- Tasks: E13-S4-T1, E13-S4-T2, E13-S4-T3, E13-S4-T4, E13-S4-T5, E13-S4-T6
- Phase: E13 UI Foundation (depends on prompt 28/29; can run parallel with prompt 33)

## Prerequisites

- E13-S1 (prompt 27) — shared components (StatusBadge, Pagination, SlidePanel, FormSection)
- E13-S2 (prompt 28) — customer layout shell, auth flow, route definitions
- E13-S3 (prompt 29) — commerce flow (order/booking confirmation pages that link into history)
- E7-S5 (customer identity) — completed backend
- E11-S2 (loyalty and rewards) — completed backend
- E8-S2 (payment processing) — completed backend

## Context for the Agent

You are building the **customer account area** — the authenticated section where customers manage their profile, view order and booking history, access loyalty rewards, and manage payment methods. All pages are behind an auth guard.

The account area uses a sidebar navigation pattern within the customer layout shell. The account dashboard is a landing page with profile summary and quick stats, then each sub-section (orders, bookings, loyalty, payments, profile) gets its own page.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-13.md
agents/epics/epic-13-tasks.md (section E13-S4)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/design/screen-reference-index.md (CP-11 through CP-18)
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S1-*.md
agents/epics/handoffs/YYYY-MM-DD-E13-S2-*.md
agents/epics/handoffs/YYYY-MM-DD-E13-S3-*.md
agents/epics/handoffs/*-E7-S5*.md (customer identity)
agents/epics/handoffs/*-E11-S2*.md (loyalty)
agents/epics/handoffs/*-E8-S2*.md (payments)
```

Read HTML design reference:

```
agents/design/Portal Design - Customer Portal - account.html (CP-11 through CP-18)
```

Inspect code surfaces:

```
platform/apps/web-customer/src/ (existing pages from E13-S2/S3)
platform/packages/sdk/src/ (auth, orders, bookings, loyalty, payments methods)
platform/packages/types/src/ (customer, order, booking, loyalty types)
```

## Implementation Scope

### E13-S4-T1: Account Dashboard (CP-11)
- Profile card: avatar, full name, email, member since date
- Sidebar navigation for account sections: Profile, Orders, Bookings, Loyalty, Payment Methods
- Quick stats cards: total orders count, upcoming bookings count, loyalty points balance
- Quick links to recent order and next booking
- Route: `/account`

### E13-S4-T2: Profile Settings (CP-12)
- Display: name, email, phone, avatar
- Edit profile: inline form or slide panel with FormSection for name, phone, avatar upload
- Change password form: current password, new password, confirm new password with strength indicator
- Communication preferences toggles: email notifications, SMS notifications, marketing
- Fetch: `auth.me()`, update via `auth.updateProfile()`
- Route: `/account/profile`

### E13-S4-T3: Order History and Detail (CP-13, CP-14)
- Order list: cards with order number, date, total, status badge, item count
- Sort by date (newest first), filter by status tabs (All, Active, Completed, Cancelled)
- Pagination
- Order detail page: full receipt (items, modifiers, quantities, prices, subtotal, tax, tip, total), status timeline tracking, delivery/pickup info, "Reorder" button (adds items back to cart)
- Empty state: "No orders yet — browse our menu" with CTA
- Fetch: `orders.list({ page, status })`, `orders.get(orderId)`
- Routes: `/account/orders`, `/account/orders/:orderId`

### E13-S4-T4: Booking History and Detail (CP-15, CP-16)
- Two sections: Upcoming bookings (future dates) and Past bookings
- Booking cards: service name, date/time, staff provider, status badge
- Booking detail page: service info, date/time, staff, location, booking notes
- Actions for upcoming: "Reschedule" (opens date/time picker), "Cancel" (confirmation dialog)
- Actions for past: "Book Again" (links to booking flow for same service)
- Empty state: "No bookings yet — explore our services"
- Fetch: `bookings.list({ page, status })`, `bookings.get(bookingId)`
- Routes: `/account/bookings`, `/account/bookings/:bookingId`

### E13-S4-T5: Loyalty and Rewards (CP-17)
- Points balance display (large number)
- Tier progress bar: current tier name, points to next tier, visual progress bar
- Tier benefits summary
- Available rewards list: reward name, point cost, description, "Redeem" button
- Points history table: date, description, points earned/redeemed, balance
- Fetch: `loyalty.getCustomerPoints()`, `loyalty.listRewards()`
- Route: `/account/loyalty`

### E13-S4-T6: Payment Methods (CP-18)
- Saved cards list: card brand icon (Visa, Mastercard, etc.), last 4 digits, expiry date
- Default card indicator badge
- Set as default action
- Remove card with confirmation modal
- Add payment method button → modal with card form placeholder
- Fetch: `payments.listMethods()`, `payments.addMethod()`, `payments.removeMethod()`
- Route: `/account/payments`

## Constraints

- All account pages require authentication — redirect to `/login` if not authenticated
- Use the customer layout shell from E13-S2 with account sidebar navigation
- All API calls through `@platform/sdk`
- Handle loading, error, and empty states for every page
- Responsive layout — account sidebar collapses to dropdown on mobile
- "Reorder" button on order detail must add items to the existing cart Pinia store from E13-S3

## Validation Commands

```bash
pnpm --filter web-customer typecheck
pnpm --filter web-customer build
pnpm --filter web-customer test
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

Create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S4-T1.md
agents/epics/handoffs/YYYY-MM-DD-E13-S4-T2.md
agents/epics/handoffs/YYYY-MM-DD-E13-S4-T3.md
agents/epics/handoffs/YYYY-MM-DD-E13-S4-T4.md
agents/epics/handoffs/YYYY-MM-DD-E13-S4-T5.md
agents/epics/handoffs/YYYY-MM-DD-E13-S4-T6.md
```

Each handoff must include:
- Account route tree and auth guard setup
- SDK methods consumed
- Pinia store interactions (cart reorder)
- Empty/loading/error state handling
- Playwright test coverage
- Files created/modified

## Downstream Consumers

- This completes the customer portal frontend (web-customer)
- E13-S7 (prompt 33) admin CRM views link to the same customer data

## Stop Conditions

- STOP if auth guard cannot detect unauthenticated state — document and escalate
- STOP if loyalty API is not available — render loyalty section as "Coming Soon" placeholder and document
- STOP if payment method management endpoints are missing — render placeholder and document
