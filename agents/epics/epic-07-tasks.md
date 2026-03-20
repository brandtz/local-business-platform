# Epic 7 Technical Task Plan

> **UX Design References:** See `agents/design/screen-reference-index.md` for the full screen-to-brief mapping. Customer-facing views reference `Portal Design - Customer Portal *.html`. Admin operational views reference `Portal Design - Business Admin - orders and booking.html`. Analytics reference `Portal Design - Business Admin - analytics.html`.

## E7-S1 Cart and Pricing Engine Foundations

UX References: `Portal Design - Customer Portal cart and checkout.html` (CP-04/05 cart + checkout stepper)

> **Design-Alignment Notes (from wireframe review):**
> The checkout wireframe shows a 3-step stepper: Cart → Fulfillment → Payment. The cart step includes item lines with modifier display, quantity controls, and a running price summary. The fulfillment step has a toggle selector (Delivery vs In-Store Pickup) with conditional address form for delivery. The payment step shows order summary with subtotal, tax, discount, tip, delivery fee, and total — plus a promo/loyalty code input field, tip percentage buttons (15%/18%/20%/custom), and an order notes textarea. All of these must be modeled in the cart/pricing domain.

Technical Tasks:
- E7-S1-T1: define cart model and server-side pricing inputs for items, modifiers, discounts, tax, delivery fee, and tip
- E7-S1-T2: implement pricing engine services with deterministic quote outputs including tip calculation (percentage-based and custom amount) and delivery-fee computation
- E7-S1-T3: create cart API contracts for add, update, remove, and quote operations
- E7-S1-T4: define fulfillment-mode selection model (delivery/pickup) with conditional address requirement — cart must store selected fulfillment type and delivery address when applicable
- E7-S1-T5: implement promo-code and loyalty-code validation and discount-application service hooks within the pricing pipeline
- E7-S1-T6: add order-notes field to cart model for customer special instructions
- E7-S1-T7: expose storefront cart state integration using backend-trusted totals only — include all line items in the 3-step stepper data contract (cart summary, fulfillment selection, payment breakdown)

Test Requirements:
- unit: pricing engine covers subtotal, tax, discount, tip (percentage + custom), delivery fee, and promo-code discount calculations plus invalid-item cases
- API contract: cart operations validate quantity, modifier, fulfillment mode, promo code, and stale-price scenarios correctly
- integration: cart persistence and quote generation remain tenant-safe and deterministic; fulfillment mode changes recalculate totals

Handoff Focus:
- pricing invariants, cart payload contract (all 3 stepper stages), fulfillment mode model, tip/promo code interfaces, and stale-price handling rules

## E7-S2 Order Lifecycle and Fulfillment Operations

UX References: `Portal Design - Business Admin - orders and booking.html` (BA-08/09 Orders tab), `Portal Design - Customer Portal - confirmation order-booking details.html` (CP-06)

> **Design-Alignment Notes (from wireframe review):**
> The admin orders view shows a kanban-style pipeline with status column counts (New 12, In Progress 5, Ready 3, Completed 48). Each order row has quick-action buttons ("Start Prep", "Mark Ready", "Complete") and time-ago display (e.g., "5 mins ago"). The page includes search by order ID/customer name, status dropdown filter, and date-range filter. The customer confirmation page shows a tracking progress bar, itemized order details, customer info card, and recommended-products section.

Technical Tasks:
- E7-S2-T1: finalize order schema, state machine (New → In Progress → Ready → Completed, plus Cancelled), and fulfillment mode behavior (delivery vs pickup)
- E7-S2-T2: implement order creation, status transition, and fulfillment management services
- E7-S2-T3: define customer and admin order API contracts and query models — admin queries must support: search by order ID and customer name, filter by status, filter by date range, and pipeline-count aggregation for status badges
- E7-S2-T4: build tenant-admin operational views for order list with pipeline/kanban status counts, individual order detail, and quick-action status transition buttons ("Start Prep", "Mark Ready", "Complete")
- E7-S2-T5: implement time-ago display formatting and order-timestamp query model for admin operational views
- E7-S2-T6: define customer-facing order tracking read model — progress bar state mapping, itemized receipt, and confirmation page data contract

Test Requirements:
- unit: order state transitions reject invalid or out-of-sequence actions; pipeline count aggregation is correct
- integration: order creation persists correct totals, items, customer link, fulfillment metadata, and timestamps
- UI interaction: admin order management screens reflect current status, pipeline counts, quick-action buttons, and search/filter behavior correctly

Handoff Focus:
- order state machine, pipeline aggregation queries, quick-action semantics, fulfillment behavior, and customer-versus-admin read models

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

> **Design-Alignment Notes (from wireframe review):**
> The admin bookings view shows both a list view and a calendar view (day/week/month). The calendar view is referenced in the design tabs and implies visual time-block rendering of bookings. Booking detail includes customer info, service name, assigned staff member, datetime, duration, and status. The customer confirmation page shows a booking progress/status bar similar to order tracking.

Technical Tasks:
- E7-S4-T1: finalize booking schema, status transitions (Pending → Confirmed → Checked-In → Completed, plus Cancelled/No-Show), cancellation windows, and deposit behavior
- E7-S4-T2: implement booking creation, confirm, cancel, check-in, and complete services
- E7-S4-T3: define customer and admin booking API contracts and list or detail views
- E7-S4-T4: define calendar-view query model — bookings queryable by date range, staff member, and service type, with time-block data suitable for rendering a day/week/month calendar grid
- E7-S4-T5: build tenant-admin operational screens for booking list view, calendar view, booking detail, and exception handling (reschedule, no-show, manual override)
- E7-S4-T6: define customer-facing booking confirmation and tracking read model with status-bar progress mapping

Test Requirements:
- unit: booking transitions and cancellation policy logic behave correctly across allowed states; no-show and reschedule handled
- integration: booking creation consumes slot computation safely and prevents double-booking; calendar queries return correct time blocks
- UI interaction: booking actions expose allowed transitions and denial reasons clearly; calendar view renders bookings in correct time slots

Handoff Focus:
- booking state machine, calendar-view data contract, cancellation rules, and admin exception-handling flows

## E7-S5 Customer Identity and Account History

UX References: `Portal Design - Customer Portal - account.html` (CP-11 through CP-18), `Portal Design - Customer Portal - signin register reset.html` (CP-20)

> **Design-Alignment Notes (from wireframe review):**
> The customer account wireframe shows 7 sidebar tabs: Profile, Orders, Bookings, Saved Addresses, Payment Methods, Loyalty, and Notifications. The Profile section includes editable name, email, phone, and avatar. Saved Addresses supports add/edit/delete/set-default flows. Payment Methods shows stored cards with add/remove and default selection. The Loyalty tab displays current tier (Gold Member), point balance (2,450 pts), tier progression bar toward next tier (Platinum at 5,000 pts), and a Points Redemption button. The Notifications tab shows per-category toggles for email/SMS/push. All 7 tabs must be reflected in account data models and API contracts.

Technical Tasks:
- E7-S5-T1: implement customer registration, login, and profile retrieval flows in tenant context (including avatar, name, email, phone)
- E7-S5-T2: implement account queries for order history, booking history, and preferences
- E7-S5-T3: implement saved-address CRUD — add, edit, delete, and set-default address for use in checkout delivery fulfillment
- E7-S5-T4: implement saved payment-method management — list, add, remove, and set-default stored card references (via payment gateway token, not raw card data)
- E7-S5-T5: define loyalty account read model — current tier, point balance, tier-progression thresholds, and points-history query (this provides the data contract for the Loyalty tab; full loyalty engine is a separate concern)
- E7-S5-T6: implement notification-preference model — per-category (orders, bookings, promotions, account) toggles for email, SMS, and push channels
- E7-S5-T7: connect customer account shell to all 7 backend module APIs (profile, orders, bookings, addresses, payment methods, loyalty, notifications)
- E7-S5-T8: define cross-tenant identity behavior for one person using multiple businesses

Test Requirements:
- integration: customer identities and histories remain isolated per tenant; saved addresses and payment methods are tenant-scoped
- API contract: account endpoints return only the authenticated customer's records; payment method endpoints never expose raw card numbers
- UI interaction: all 7 account tabs render empty, partial, and populated states correctly; default-address and default-payment flows work end-to-end

Handoff Focus:
- customer account contract (all 7 tabs), saved-address and payment-method models, loyalty read-model contract, notification-preference schema, cross-tenant identity assumptions, and history query filters

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
