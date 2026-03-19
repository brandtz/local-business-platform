# Epic 7 Technical Task Plan

> **UX Design References:** See `agents/design/screen-reference-index.md` for the full screen-to-brief mapping. Customer-facing views reference `Portal Design - Customer Portal *.html`. Admin operational views reference `Portal Design - Business Admin - orders and booking.html`. Analytics reference `Portal Design - Business Admin - analytics.html`.

## E7-S1 Cart and Pricing Engine Foundations

UX References: `Portal Design - Customer Portal cart and checkout.html` (CP-04/05 cart + checkout stepper)

Technical Tasks:
- E7-S1-T1: define cart model and server-side pricing inputs for items, modifiers, discounts, tax, and tip
- E7-S1-T2: implement pricing engine services with deterministic quote outputs
- E7-S1-T3: create cart API contracts for add, update, remove, and quote operations
- E7-S1-T4: expose storefront cart state integration using backend-trusted totals only

Test Requirements:
- unit: pricing engine covers subtotal, tax, discount, and tip calculations plus invalid-item cases
- API contract: cart operations validate quantity, modifier, and stale-price scenarios correctly
- integration: cart persistence and quote generation remain tenant-safe and deterministic

Handoff Focus:
- pricing invariants, cart payload contract, and stale-price handling rules

## E7-S2 Order Lifecycle and Fulfillment Operations

UX References: `Portal Design - Business Admin - orders and booking.html` (BA-08/09 Orders tab), `Portal Design - Customer Portal - confirmation order-booking details.html` (CP-06)

Technical Tasks:
- E7-S2-T1: finalize order schema, state machine, and fulfillment mode behavior
- E7-S2-T2: implement order creation, status transition, and fulfillment management services
- E7-S2-T3: define customer and admin order API contracts and query models
- E7-S2-T4: build tenant-admin operational views for order list, detail, and status actions

Test Requirements:
- unit: order state transitions reject invalid or out-of-sequence actions
- integration: order creation persists correct totals, items, customer link, and fulfillment metadata
- UI interaction: admin order management screens reflect current status and allowed actions correctly

Handoff Focus:
- order state machine, fulfillment semantics, and customer-versus-admin read models

## E7-S3 Availability and Slot Computation

Technical Tasks:
- E7-S3-T1: define availability inputs from location hours, blackout windows, service durations, and staff assignment
- E7-S3-T2: implement slot computation service and conflict-detection rules
- E7-S3-T3: define booking-slot query API contracts for storefront and admin usage
- E7-S3-T4: document caching or recalculation strategy for slot generation under load

Test Requirements:
- unit: slot computation covers overlap, lead time, blackout, and duration scenarios
- integration: slot queries respect tenant location and staff constraints end-to-end
- performance check: slot generation remains predictable under reasonable concurrent query load

Handoff Focus:
- slot computation inputs, caching assumptions, and conflict-detection rules

## E7-S4 Booking Lifecycle Management

UX References: `Portal Design - Business Admin - orders and booking.html` (BA-10/11 Bookings tab + calendar), `Portal Design - Customer Portal - confirmation order-booking details.html` (CP-10)

Technical Tasks:
- E7-S4-T1: finalize booking schema, status transitions, cancellation windows, and deposit behavior
- E7-S4-T2: implement booking creation, confirm, cancel, check-in, and complete services
- E7-S4-T3: define customer and admin booking API contracts and list or detail views
- E7-S4-T4: build tenant-admin operational screens for booking management and exception handling

Test Requirements:
- unit: booking transitions and cancellation policy logic behave correctly across allowed states
- integration: booking creation consumes slot computation safely and prevents double-booking
- UI interaction: booking actions expose allowed transitions and denial reasons clearly

Handoff Focus:
- booking state machine, cancellation rules, and admin exception-handling flows

## E7-S5 Customer Identity and Account History

UX References: `Portal Design - Customer Portal - account.html` (CP-11 through CP-18), `Portal Design - Customer Portal - signin register reset.html` (CP-20)

Technical Tasks:
- E7-S5-T1: implement customer registration, login, and profile retrieval flows in tenant context
- E7-S5-T2: implement account queries for order history, booking history, and preferences
- E7-S5-T3: connect customer account shell to backend history and profile APIs
- E7-S5-T4: define cross-tenant identity behavior for one person using multiple businesses

Test Requirements:
- integration: customer identities and histories remain isolated per tenant
- API contract: account endpoints return only the authenticated customer's records
- UI interaction: customer history pages render empty, partial, and populated states correctly

Handoff Focus:
- customer account contract, cross-tenant identity assumptions, and history query filters

## E7-S6 Hybrid Tenant Operating Modes

Technical Tasks:
- E7-S6-T1: define module-driven operating-mode rules for ordering-only, booking-only, and hybrid tenants
- E7-S6-T2: implement backend enforcement so disabled flows cannot be invoked accidentally
- E7-S6-T3: implement frontend route and navigation gating for operating modes
- E7-S6-T4: document shared and mode-specific operational behaviors for tenant admins

Test Requirements:
- unit: operating-mode rules allow only supported flow combinations per tenant
- integration: disabled transaction flows are blocked at API and service layers
- UI interaction: navigation and call-to-action visibility adjust correctly by tenant mode

Handoff Focus:
- operating-mode rules, gating locations, and shared versus mode-specific admin behavior

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
