
# Epic 7: Ordering, Booking, Fulfillment, and Customer Accounts

## Objective

Deliver the operational transaction layer for purchases, reservations, and repeat customer interactions.

## Scope

- carts, checkout, draft orders, placed orders, and fulfillment workflows
- booking search, slot generation, booking lifecycle, and cancellation logic
- customer registration, login, account history, saved preferences, and loyalty hooks
- order and booking operational views in tenant admin

## Deliverables

- customer-facing checkout and booking flows
- admin order and booking management interfaces
- backend order, booking, pricing, and availability services
- customer account area for order and booking history

## Acceptance Criteria

- tenants can operate ordering only, booking only, or hybrid modes
- pricing, tax, and status changes are consistent across customer and admin surfaces
- booking capacity and schedule conflicts are validated server-side
- customer history is tenant-scoped and secure

## Story Decomposition

### E7-S1: Cart and Pricing Engine Foundations

Outcome:
- storefronts can build carts and calculate subtotal, discounts, tax, tip, and total using server-trusted logic

Dependencies:
- Epic 6

Acceptance Signals:
- cart totals are derived from canonical backend rules
- price changes and invalid items are handled safely during checkout preparation

### E7-S2: Order Lifecycle and Fulfillment Operations

Outcome:
- orders move through explicit operational states with tenant-admin visibility and control

Dependencies:
- E7-S1

Acceptance Signals:
- order status transitions are validated server-side
- tenant admins can view and update orders according to role and state rules

### E7-S3: Availability and Slot Computation

Outcome:
- booking-capable tenants can expose valid time slots based on location, service, staff, and policy constraints

Dependencies:
- Epic 6
- Epic 5

Acceptance Signals:
- booking slots respect hours, blackout windows, service duration, and staff availability
- invalid or overlapping bookings are rejected server-side

### E7-S4: Booking Lifecycle Management

Outcome:
- customers and tenant admins can create, confirm, cancel, and complete bookings through explicit lifecycle rules

Dependencies:
- E7-S3

Acceptance Signals:
- booking status transitions and cancellation windows are enforced consistently
- booking records remain visible in both customer and tenant contexts

### E7-S5: Customer Identity and Account History

Outcome:
- customers can register, sign in, and view tenant-scoped order and booking history

Dependencies:
- Epic 2
- E7-S2
- E7-S4

Acceptance Signals:
- customer history is isolated per tenant even for the same user identity across multiple businesses
- authenticated customer views expose only their own orders and bookings

### E7-S6: Hybrid Tenant Operating Modes

Outcome:
- tenants can run ordering-only, bookings-only, or combined experiences using shared platform capabilities

Dependencies:
- E7-S2
- E7-S4

Acceptance Signals:
- module toggles determine which transaction flows and navigation surfaces appear
- hybrid tenants can support both commerce and booking without conflicting operational rules

## Dependencies

- Epics 1 through 6
