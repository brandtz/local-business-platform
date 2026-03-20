# Epic 11: Cross-Cutting Platform Capabilities — Analytics, Loyalty, Search, Quotes, and Portfolio

## Objective

Deliver the cross-cutting features surfaced by UX wireframe review and the contractor-vertical pilot that span multiple domain boundaries and are not owned by any single existing epic.

## Context

Design wireframe review (March 2026) revealed four feature areas visible in the UX but absent from Epics 1–10: business analytics and reporting, customer loyalty and rewards, search and filter infrastructure, and customer subscription/recurring-order support. Separately, the first pilot customer (a roofing and gutter contractor) surfaced the need for a quote/estimate management system and a portfolio/showcase module — both of which are general-purpose capabilities applicable across verticals.

## Scope

- business analytics engine: revenue trends, customer retention, top performers, channel and location breakdowns, admin dashboard widgets
- customer loyalty and rewards: tier model, point accumulation/expiration, redemption flows, checkout integration
- search and filter infrastructure: reusable search indexing, autocomplete, and filter contracts across admin and storefront surfaces
- quote and estimate management: quote domain model, lifecycle (draft → sent → viewed → accepted/declined/expired), customer-portal sharing, quote-to-order conversion
- portfolio and showcase module: project gallery, before/after images, testimonials, and featured-work presentation for service-oriented verticals
- customer subscription and recurring-order support: recurring schedule model, renewal automation, and subscription management within the customer account

## Deliverables

- analytics data pipeline, aggregation queries, and admin chart/widget integrations
- loyalty tier and points engine with customer-account and checkout hooks
- shared search and filter service contracts consumed by all three portals
- quote domain entities, lifecycle services, admin CRUD, and customer-portal read views
- portfolio domain entities, media management, and storefront presentation
- recurring-order/subscription domain model and lifecycle services

## Acceptance Criteria

- business admin dashboard displays live analytics widgets (revenue chart, retention, top performers) fed by real transaction data
- customers can view loyalty tier, point balance, and redeem points at checkout
- search and filter toolbars function consistently across admin catalog, orders, bookings, customers, and storefront product views
- a business admin can create, send, and track a quote; the customer can view and accept/decline it through the customer portal
- a service-oriented tenant can publish a portfolio gallery on their storefront
- a tenant can offer subscription/recurring purchases and manage subscriber lifecycle

## Story Decomposition

### E11-S1: Business Analytics and Reporting Engine

Outcome:
- the platform computes and exposes business-intelligence metrics for revenue, orders, bookings, customers, retention, channel attribution, and top performers at both tenant and location granularity

Dependencies:
- E5-S1 (admin dashboard widget mount points)
- E7-S2 (orders)
- E7-S4 (bookings)
- E7-S5 (customers)

Acceptance Signals:
- analytics queries produce correct aggregations from live commerce and booking data
- admin dashboard widgets consume analytics read models and render trends, breakdowns, and top-performer tables
- analytics support time-period switching and location filtering as shown in the admin design

### E11-S2: Customer Loyalty and Rewards Program

Outcome:
- the platform supports configurable loyalty tiers, point accumulation on transactions, point expiration, and redemption flows integrated with checkout and the customer account area

Dependencies:
- E6-S1 (catalog)
- E7-S1 (cart/pricing)
- E7-S5 (customer account)

Acceptance Signals:
- loyalty tier definitions, point rules, and expiration policies are configurable per tenant
- points accumulate on completed orders and can be redeemed at checkout as a discount
- customer account loyalty tab displays current tier, balance, progression, and history
- checkout supports loyalty code entry and point-redemption flow

### E11-S3: Search and Filter Infrastructure

Outcome:
- a shared search and filter service provides reusable contracts for full-text search, autocomplete, faceted filtering, and paginated results across all three portals

Dependencies:
- E6 (catalog, services, content, staff domain models)
- E4-S1 (design tokens and component library)

Acceptance Signals:
- search contracts are consumed by admin catalog/order/customer views and storefront product/service views
- autocomplete and filter toolbars match the patterns shown in UX wireframes
- search indexing updates when domain entities are created, updated, or deleted

### E11-S4: Quote and Estimate Management

Outcome:
- business admins can create itemized quotes from catalog products and services, send them to customers, and track their lifecycle — customers can view, accept, or decline quotes through the customer portal

Dependencies:
- E6-S1 (catalog)
- E6-S2 (services)
- E7-S1 (pricing engine — reuse for quote line-item calculation)
- E8-S4 (notifications — quote delivery via email/SMS)

Acceptance Signals:
- quote entity supports line items referencing catalog products and services with quantity, price, and notes
- quote lifecycle transitions (Draft → Sent → Viewed → Accepted / Declined / Expired) are enforced with timestamps
- accepted quotes can be converted to orders with pre-filled cart data
- customers receive notification and can open a portal view of the quote without needing to log in (secure link with token)
- business admin can view quote pipeline, filter by status, and track conversion

### E11-S5: Portfolio and Showcase Module

Outcome:
- service-oriented tenants can publish a project portfolio on their storefront — each project includes images (before/after), description, services used, and optional customer testimonial

Dependencies:
- E6-S4 (content domain model)
- E4-S3 (storefront template regions)

Acceptance Signals:
- portfolio projects are tenant-scoped, support multi-image galleries with captions, and reference service categories
- storefront renders a portfolio gallery page and individual project detail pages
- portfolio module is template-controlled and can be enabled/disabled per vertical like other modules

### E11-S6: Customer Subscription and Recurring Order Support

Outcome:
- tenants can offer recurring purchase or service plans — customers can subscribe, manage, pause, or cancel; the platform automates renewal order/booking creation on schedule

Dependencies:
- E7-S1 (cart/pricing)
- E7-S2 (order lifecycle)
- E8-S2 (payment abstraction — recurring charges)
- E7-S5 (customer account)

Acceptance Signals:
- subscription plan model supports frequency, pricing, item selection, and cancellation policy
- recurring orders are created automatically on schedule with saved payment method
- customer account shows active subscriptions with upcoming renewal, pause, and cancel controls
- failed renewal attempts trigger retry and customer notification

## Dependencies

- Epics 1 through 10
- Epic 12 (SaaS subscription model) is a sibling but independent concern — E11 covers end-customer-facing features, E12 covers platform-level tenant billing
