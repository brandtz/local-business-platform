# Prompt 29: E13-S3 Customer Portal — Commerce Flow

## Sequence Position

- Prompt: 29 of 46
- Epic: 13 — Frontend Implementation and Component Library
- Story: E13-S3
- Tasks: E13-S3-T1, E13-S3-T2, E13-S3-T3, E13-S3-T4, E13-S3-T5
- Phase: E13 UI Foundation (depends on prompt 28; can run parallel with prompt 32)

## Prerequisites

- E13-S1 (prompt 27) — shared components (StepperWizard, FormSection, DatePicker, TimeSlotPicker)
- E13-S2 (prompt 28) — customer layout shell, auth flow, catalog browse (add-to-cart originates from item detail)
- E7-S1 (cart and pricing engine, order pipeline) — completed backend
- E7-S3 (booking pipeline) — completed backend
- E8-S2 (payment processing) — completed backend

## Context for the Agent

You are building the **commerce flow** for the customer portal: cart, multi-step checkout, order confirmation, booking availability picker, and booking confirmation. This is the revenue-critical path — customers complete purchases and bookings here.

The checkout uses a **StepperWizard** (from E13-S1) with three steps: Fulfillment, Payment, and Review. The booking flow uses a date/time picker with staff and location selection. Both flows end with confirmation pages that show status tracking.

Cart state can be managed client-side (Pinia store) with SDK calls for pricing calculations. The checkout submit calls `orders.create()`. The booking submit calls `bookings.create()`.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-13.md
agents/epics/epic-13-tasks.md (section E13-S3)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/design/screen-reference-index.md (CP-04 through CP-10)
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S1-*.md (components + SDK)
agents/epics/handoffs/YYYY-MM-DD-E13-S2-*.md (customer shell + storefront)
agents/epics/handoffs/*-E7-S1*.md (cart, pricing, orders)
agents/epics/handoffs/*-E7-S3*.md (bookings)
agents/epics/handoffs/*-E8-S2*.md (payment processing)
```

Read HTML design references:

```
agents/design/Portal Design - Customer Portal cart and checkout.html (CP-04, CP-05)
agents/design/Portal Design - Customer Portal - confirmation order-booking details.html (CP-06, CP-10)
```

Inspect code surfaces:

```
platform/apps/web-customer/src/ (existing routes and pages from E13-S2)
platform/packages/sdk/src/ (orders, bookings, payments methods)
platform/packages/types/src/ (cart, order, booking types)
platform/apps/api/src/ (order and booking endpoints to understand contracts)
```

## Implementation Scope

### E13-S3-T1: Cart (CP-04)
- Cart page component consuming cart Pinia store
- Cart item rows: product image thumbnail, name, selected modifiers, quantity controls (+/-), line price, remove button
- Clear cart action
- Order notes textarea
- Cart summary sidebar: subtotal, estimated tax, estimated total
- Proceed to checkout button (disabled if cart empty, requires auth)
- Guest users directed to login before checkout
- Route: `/cart`

### E13-S3-T2: Checkout Stepper (CP-05)
- StepperWizard with 3 steps: Fulfillment → Payment → Review
- **Step 1 — Fulfillment**: Delivery/pickup radio toggle. Delivery: address form (FormSection with fields for street, city, state, zip). Pickup: location selector dropdown (from `locations.list()`), preferred time selector. Delivery scheduling options.
- **Step 2 — Payment**: Payment method selection (saved cards from `payments.listMethods()` or new card input), tip selector (preset % buttons + custom), promo code input with apply button.
- **Step 3 — Review**: Full order summary (items, modifiers, quantities, prices), fulfillment details, payment summary, terms acknowledgment checkbox, "Place Order" button.
- On submit: call `orders.create()` with cart items, fulfillment method, payment method, tip, promo code.
- On success: redirect to order confirmation.
- On failure: show error, stay on review step.
- Route: `/checkout`

### E13-S3-T3: Order Confirmation (CP-06)
- Success hero section with checkmark icon
- Order status tracking timeline (ordered → confirmed → preparing → ready → delivered/picked up)
- Receipt section: line items, subtotal, tax, tip, total
- Customer info card: name, delivery address or pickup location, payment method
- Next actions: "Track Order" button, "Continue Shopping" link
- Fetch: `orders.get(orderId)` for order details
- Route: `/orders/:orderId/confirmation`

### E13-S3-T4: Booking Availability Picker (CP-09)
- DatePicker calendar for selecting booking date
- TimeSlotPicker grid showing available slots for selected date
- Staff selection dropdown (optional, if business enables "choose your provider")
- Location selector (if multi-location)
- Service summary sidebar: service name, duration, price, selected date/time/staff
- Add-on services checkbox list (if available)
- "Confirm Booking" button
- Fetch: `services.getAvailability(serviceId, { date, locationId })` for slots
- On submit: `bookings.create()` with service, date, time, staff, location, add-ons
- Route: `/book/:serviceId`

### E13-S3-T5: Booking Confirmation (CP-10)
- Confirmation hero section
- Booking details card: service name, date/time, staff provider, location
- "Add to Calendar" link (generate .ics or Google Calendar link)
- Manage booking actions: "Reschedule" and "Cancel" buttons (link to account area)
- Fetch: `bookings.get(bookingId)`
- Route: `/bookings/:bookingId/confirmation`

## Constraints

- Cart state in Pinia store — persist to localStorage so cart survives page refresh
- Checkout must validate each step before allowing progression to next step
- Payment method integration should be prepared for Stripe Elements or similar — for now, show saved methods and a "new card" form placeholder
- Do NOT implement actual payment gateway UI (Stripe.js) — that is E8-S2 backend only. Show form fields that submit payment method ID.
- All API calls through `@platform/sdk` — no raw fetch
- Loading, error, and empty states on every page
- Responsive layout for desktop and tablet

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
agents/epics/handoffs/YYYY-MM-DD-E13-S3-T1.md
agents/epics/handoffs/YYYY-MM-DD-E13-S3-T2.md
agents/epics/handoffs/YYYY-MM-DD-E13-S3-T3.md
agents/epics/handoffs/YYYY-MM-DD-E13-S3-T4.md
agents/epics/handoffs/YYYY-MM-DD-E13-S3-T5.md
```

Each handoff must include:
- Cart Pinia store API (actions, getters, persistence)
- Checkout step validation rules
- Booking availability fetch contract
- SDK methods consumed and their request/response shapes
- Playwright test coverage
- Files created/modified

## Downstream Consumers

- E13-S4 (prompt 30) — order/booking history pages link to confirmation and detail pages
- E13-S7 (prompt 33) — admin order/booking views are the other side of these transactions

## Stop Conditions

- STOP if E13-S1 StepperWizard or DatePicker components are missing — write blocked handoff
- STOP if SDK orders/bookings methods are not available — build minimum stubs and document
- STOP if cart pricing calculation requires backend call and endpoint doesn't exist — implement client-side calculation with clear TODO for backend pricing API
