# Epic 6 Technical Task Plan

> **UX Design References:** See `agents/design/screen-reference-index.md` for the full screen-to-brief mapping. Catalog/service admin views reference `Portal Design - Business Admin - catalog and services.html`. Content views reference `Portal Design - Business Admin - content and locations.html`. Storefront views reference `Portal Design - Customer Portal menu and services.html`.

## E6-S1 Catalog Domain Model

UX References: `Portal Design - Business Admin - catalog and services.html` (BA-04/05 Products+Categories tabs), `Portal Design - Customer Portal menu and services.html` (CP-02/03)

> **Design-Alignment Notes (from wireframe review):**
> The admin catalog screens show: drag-handle row reordering for categories and items; bulk select with edit/delete actions; compare-at (was/now) pricing; a dedicated Modifiers tab with size/color/add-on configurators; multi-image media gallery with drag-to-reorder; low-stock alert indicators; active/inactive toggle and published/draft visibility control per item. The customer storefront shows: filter/sort toolbar, product cards opening into detail modals with color/add-on selectors and wishlist toggle. All of these must be reflected in the domain model and API contracts.

Technical Tasks:
- E6-S1-T1: finalize schema for categories, items, pricing (including compare-at / strike-through price), status lifecycle (active/inactive, published/draft), and media gallery references with sort-order
- E6-S1-T2: define schema for item modifiers, modifier groups (size, color, add-ons), and bundle relationships — modifiers should be a first-class entity, not embedded JSON
- E6-S1-T3: implement catalog domain services and repository patterns for tenant-scoped CRUD including category and item sort-order persistence for drag-reorder
- E6-S1-T4: implement bulk-operation service layer (bulk status change, bulk delete) with batch validation
- E6-S1-T5: define admin API contracts and query models for category/item management, modifier CRUD, and bulk operations — include filter, sort, search, and pagination parameters matching the admin toolbar design
- E6-S1-T6: expose storefront read models for active catalog presentation including modifier options, image gallery order, pricing display fields, and wishlist-ready item identifiers
- E6-S1-T7: define inventory/stock status fields and low-stock threshold alerting model (schema + query) to support admin low-stock badge indicators

Test Requirements:
- integration: catalog entities persist with tenant-safe relationships and retrieval patterns; sort-order and bulk operations commit atomically
- API contract: admin CRUD, bulk operations, and storefront read routes validate payloads and filters correctly; modifier CRUD is independently testable
- unit: catalog validation rules cover pricing (including compare-at constraints), status lifecycle transitions, modifier-group cardinality, and slug or identity constraints

Handoff Focus:
- catalog schema contract (including modifiers and media gallery), storefront read model, admin API payload shapes, and bulk-operation semantics

## E6-S2 Service and Booking Domain Model

UX References: `Portal Design - Business Admin - catalog and services.html` (BA-06 Services tab), `Portal Design - Customer Portal menu and services.html` (CP-07/08)

Technical Tasks:
- E6-S2-T1: finalize schema for services, durations, availability-related settings, and pricing
- E6-S2-T2: implement service domain services for CRUD and eligibility rules
- E6-S2-T3: define admin and storefront API contracts for service listing and management
- E6-S2-T4: expose service read models needed by booking availability computation

Test Requirements:
- integration: services persist with tenant-scoped constraints and active-state filtering
- API contract: service endpoints enforce valid duration and booking configuration fields
- unit: service-rule validation covers duration, price, and bookability constraints

Handoff Focus:
- service entity contract, booking-read requirements, and admin API expectations

## E6-S3 Staff and Assignment Domain Model

UX References: `Portal Design - Business Admin - customers and staff.html` (BA-07 Staff tab)

> **Design-Alignment Notes (from wireframe review):**
> The admin staff view shows a card-grid layout with photo, name, role, email, and status/access level per staff member. Each card has "Schedule" and "Profile" action buttons — indicating the domain model must support schedule metadata (weekly availability, break/blackout windows) in addition to basic profile data. Staff status affects booking eligibility. The analytics dashboard also references a "Top Performers" table which implies staff-keyed metric aggregation downstream, so staff identifiers should be structured for future analytics joins.

Technical Tasks:
- E6-S3-T1: finalize schema for staff profiles (photo, role, contact info, status), location relationships, and bookable-state flag
- E6-S3-T2: define staff schedule/availability schema — weekly recurring availability windows, break periods, and per-staff blackout dates; this is the data backing the "Schedule" button in the admin card grid
- E6-S3-T3: implement staff management services distinct from tenant-user identity management, including schedule CRUD
- E6-S3-T4: define assignment surfaces needed for service eligibility and booking flow selection — which staff can perform which services, based on skill/certification mapping
- E6-S3-T5: implement schedule-conflict detection logic so overlapping availability windows or double-booked blackout periods are rejected at the domain layer
- E6-S3-T6: expose tenant-admin CRUD and lookup queries for operational staff usage, including card-grid list with role/status filters and individual profile + schedule detail views

Test Requirements:
- integration: staff records remain scoped to tenant and location rules correctly; schedule windows persist and query correctly
- API contract: staff CRUD supports assignment metadata, schedule management, and role/status filtering without exposing auth internals
- unit: bookable-state and assignment validation handle missing or invalid relationships; schedule-conflict detection rejects overlapping windows

Handoff Focus:
- staff-resource model, schedule/availability contract, assignment lookups, conflict-detection rules, and separation from auth membership entities

## E6-S4 Content and SEO Domain Model

UX References: `Portal Design - Business Admin - content and locations.html` (BA-14 Pages tab, BA-15 Announcements tab)

> **Design-Alignment Notes (from wireframe review):**
> The admin content screen shows: a Pages list with title, preview thumbnail, draft/published status badge, and edit/preview actions; a rich text editor with full formatting toolbar (bold, italic, link, image embed, lists); an Announcements tab with date-range scheduling and placement configuration (banner, popup, inline). The branding section of settings shows a live storefront preview panel. Content pages use template-based layouts (hero + content sections). The domain model must support rich structured content bodies (not just plain text), announcement scheduling metadata, and template region mapping.

Technical Tasks:
- E6-S4-T1: finalize schema for content pages — including structured content body (block-based or rich-text JSON), publish state (draft/published/archived), SEO metadata (title, description, OG tags), slugs, and template-region assignments
- E6-S4-T2: define schema for announcements — title, body, placement type (banner/popup/inline), date-range scheduling (start/end), active state, and display-priority
- E6-S4-T3: implement content services for draft, publish, archive, and retrieval behaviors including scheduled publish support
- E6-S4-T4: implement announcement services for CRUD, activation by date range, and placement-filtered queries
- E6-S4-T5: define admin editing contracts (page create/update with structured body payload, media references within body, SEO fields) and storefront read contracts by slug
- E6-S4-T6: establish content model hooks for template rendering, publish workflows, and storefront preview data generation

Test Requirements:
- integration: content draft and published states persist and query correctly; announcements activate and deactivate by date range
- API contract: content endpoints validate slug uniqueness, publish-state transitions, and structured body format; announcement endpoints validate date-range and placement fields
- unit: SEO metadata and slug rules are enforced consistently; announcement scheduling logic handles timezone edge cases

Handoff Focus:
- content state machine, structured body format contract, announcement scheduling model, slug contract, and template-consumption points

## E6-S5 Vertical Template Defaults

> **Design-Alignment Notes (contractor pilot):**
> The first pilot customer is a roofing and gutter contractor who also does general contracting. Their storefront should: showcase completed projects (portfolio), describe services offered, accept inquiry form submissions and consultation booking requests, and support quote/estimate management. This vertical does NOT need: product catalog ordering, cart/checkout, loyalty, or subscriptions. The contractor vertical informs the template model — it proves that verticals must be able to enable/disable modules at a granular level and seed appropriate starter content.

Technical Tasks:
- E6-S5-T1: define configuration bundles for each supported vertical across modules, theme, and starter data — initially support at minimum: restaurant/food, retail/commerce, appointment/salon, and contractor/home-services verticals
- E6-S5-T2: map vertical defaults onto catalog, services, content, portfolio, quotes, and operational settings models — the contractor vertical enables: services (with consultation/estimate service types), bookings (consultation scheduling), content (about page, service descriptions), portfolio (E11-S5), and quotes (E11-S4); disables: catalog product ordering, cart/checkout, loyalty
- E6-S5-T3: implement template-application service to seed or update tenant defaults safely — seed starter service categories (e.g., Roofing, Gutters, General Contracting), sample content pages, and default business hours
- E6-S5-T4: define inquiry-form configuration as a template-level option — for verticals like contractor that use lead-capture rather than direct ordering, enable a storefront inquiry/contact form that creates a lead record (name, email, phone, message, service interest)
- E6-S5-T5: document extension rules for new verticals without changing shared runtime assumptions

Test Requirements:
- integration: vertical selection applies deterministic defaults to a new tenant
- unit: unsupported module or template combinations are rejected cleanly
- regression test: existing tenant customizations are not overwritten unexpectedly during template application

Handoff Focus:
- vertical configuration bundles, seeding behavior, and customization override rules

## E6-S6 Domain Contract Stabilization

Technical Tasks:
- E6-S6-T1: consolidate schema, API, and frontend-facing contracts for catalog, services, staff, and content
- E6-S6-T2: define stable shared package types for the core business domains
- E6-S6-T3: document domain event or change-notification hooks used by downstream stories
- E6-S6-T4: identify contract versioning rules for future non-breaking extension

Test Requirements:
- contract test: shared types align with implemented API payloads and persistence expectations
- integration: downstream consumers can import and use stable domain contracts
- documentation check: domain contract references remain synchronized with schema and API docs

Handoff Focus:
- shared domain contract package, event names or hooks, and versioning rules

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
