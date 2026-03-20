# Epic 11 Technical Task Plan

> **UX Design References:** See `agents/design/screen-reference-index.md` for the full screen-to-brief mapping. Analytics views reference `Portal Design - Business Admin - analytics.html` and `Portal Design - Business Admin dashboard.html`. Loyalty views reference `Portal Design - Customer Portal - account.html` (CP-15 Loyalty tab) and `Portal Design - Customer Portal cart and checkout.html` (loyalty code input). Search/filter toolbars appear across all admin and customer portal designs. Quote and portfolio features are new additions driven by the contractor-vertical pilot.

## E11-S1 Business Analytics and Reporting Engine

UX References: `Portal Design - Business Admin - analytics.html` (BA-20/21), `Portal Design - Business Admin dashboard.html` (BA-01 KPI cards + charts)

> **Design-Alignment Notes:**
> The analytics page shows: revenue performance line chart with monthly/yearly toggle; sales breakdown by channel (in-store 45%, online 30%, delivery 15%, subscriptions 10%); volume analysis bar chart (orders vs bookings over time); top performers table (products, staff, locations with revenue/count columns); customer retention insights (42.8% repeat rate, new vs returning pie chart); detailed KPI cards ($2.1M sales, 1,552 orders, 42.8% retention) with trend arrows. The dashboard has 4 summary KPI cards and a revenue area chart. All analytics must support time-period switching and location filtering.

Technical Tasks:
- E11-S1-T1: define analytics data model — materialized aggregation tables or query views for revenue, order count, booking count, new/returning customer counts, retention rate, and channel attribution, partitioned by tenant, location, and time period
- E11-S1-T2: implement analytics computation pipeline — scheduled aggregation jobs that compute daily/weekly/monthly rollups from order, booking, and customer transaction data
- E11-S1-T3: implement tenant-scoped analytics query API — endpoints for KPI summary (with trend calculation), revenue time series, volume time series, channel breakdown, top performers (products, staff, locations), and retention metrics — all supporting time-period and location filter parameters
- E11-S1-T4: define admin dashboard widget data contracts and connect analytics query results to E5-S1 dashboard mount points (KPI cards, revenue chart, traffic chart)
- E11-S1-T5: build analytics detail page views — revenue performance chart, volume analysis chart, channel breakdown visual, top performers table, and retention insights panel
- E11-S1-T6: implement export or download hooks for analytics summaries (CSV or PDF) for business owners

Test Requirements:
- unit: aggregation logic produces correct rollups from sample transaction data; trend calculations handle zero-order and single-period edge cases
- integration: analytics queries respect tenant and location scoping; time-period parameter switching returns correct date-bounded results
- performance: aggregation queries remain responsive under realistic data volumes (tens of thousands of orders per tenant)

Handoff Focus:
- analytics data model, aggregation pipeline schedule, query API contracts, dashboard widget integration, and export format

## E11-S2 Customer Loyalty and Rewards Program

UX References: `Portal Design - Customer Portal - account.html` (CP-15 Loyalty tab — Gold Member, 2,450 pts, Platinum threshold 5,000), `Portal Design - Customer Portal cart and checkout.html` (loyalty code input), `Portal Design - Business Admin - customers and staff.html` (VIP/Loyalty tags)

> **Design-Alignment Notes:**
> The customer account Loyalty tab shows: current tier name (Gold Member), point balance (2,450), tier progression bar with next-tier threshold (Platinum at 5,000), and a "Redeem Points" action. Checkout shows a loyalty/promo code input field. Admin customer list shows VIP and Loyalty tag badges. This requires: tier configuration, point accumulation rules, expiration policies, redemption-to-discount conversion, and per-customer loyalty account state.

Technical Tasks:
- E11-S2-T1: define loyalty configuration schema — tenant-level tier definitions (name, point threshold, benefits description), point accumulation rules (points per dollar or per order), and point expiration policy (time-based or rolling)
- E11-S2-T2: define customer loyalty account schema — current tier, point balance, lifetime points, tier-qualification date, and point-transaction ledger (earn, redeem, expire, adjust entries)
- E11-S2-T3: implement point accumulation service — triggered on order completion (E7-S2), calculates and credits points based on tenant rules, evaluates tier promotion
- E11-S2-T4: implement point redemption service — validates balance, converts points to discount amount, applies to cart pricing (E7-S1 pricing engine hook), and debits ledger
- E11-S2-T5: implement point expiration job — scheduled process that expires points past their expiration window and adjusts balances
- E11-S2-T6: define loyalty API contracts — customer-facing: tier status, balance, history, redemption; admin-facing: loyalty configuration CRUD, customer loyalty overview, manual adjustment
- E11-S2-T7: implement customer account loyalty tab data contract and admin customer-list loyalty/VIP tag derivation

Test Requirements:
- unit: point accumulation, tier promotion, redemption, and expiration logic handle boundary conditions (exact threshold, zero balance, expired points, partial redemption)
- integration: completed orders trigger correct point credits; redemption at checkout produces correct discount and ledger entries
- API contract: customer loyalty endpoints return only authenticated customer's data; admin endpoints enforce tenant scope

Handoff Focus:
- loyalty configuration model, point ledger schema, accumulation/redemption service contracts, pricing-engine integration point, and expiration job schedule

## E11-S3 Search and Filter Infrastructure

> **Design-Alignment Notes:**
> Every admin list page (catalog, orders, bookings, customers, staff, content) and the customer storefront (products, services) includes a search input and filter toolbar. Patterns include: text search by name/ID, dropdown status filters, date-range pickers, category facets, and sortable column headers. This requires a shared search service rather than ad-hoc per-page implementations.

Technical Tasks:
- E11-S3-T1: define shared search service interface — generic search contract supporting full-text query, faceted filters (enum, range, date), sort parameters, and cursor-based pagination; consumable by any domain module
- E11-S3-T2: implement search indexing strategy — define which domain entities are indexed (catalog items, services, orders, bookings, customers, staff, content pages), indexing triggers (on create/update/delete), and tenant-scoped index isolation
- E11-S3-T3: implement autocomplete service — typeahead suggestions from indexed entities for admin and storefront search bars
- E11-S3-T4: define reusable filter-toolbar data contract — structured filter definitions (field, type, options) that drive frontend filter toolbar rendering from server-provided metadata
- E11-S3-T5: integrate search service with initial consumers — admin catalog list, admin order list, admin customer list, and storefront product/service list
- E11-S3-T6: implement search result ranking and relevance tuning baseline

Test Requirements:
- integration: search queries return tenant-scoped results; index updates propagate within acceptable latency
- API contract: search endpoints accept standardized filter, sort, and pagination parameters; autocomplete returns relevant suggestions
- performance: search and autocomplete respond within acceptable latency under realistic catalog sizes (thousands of items)

Handoff Focus:
- search service interface, indexing strategy, filter-toolbar data contract, and consumer integration points

## E11-S4 Quote and Estimate Management

> **Design-Alignment Notes (contractor-vertical pilot):**
> The pilot customer (roofing and gutter contractor) needs: a way to build itemized quotes from their catalog of products and services, send them to prospective customers, track whether quotes are viewed/accepted/declined, and convert accepted quotes into orders. From the customer portal side, the recipient should be able to view the quote via a secure link (no login required for initial view), accept or decline with optional notes, and request revisions. The business admin needs a quote pipeline view similar to the order pipeline.

Technical Tasks:
- E11-S4-T1: define quote schema — quote header (customer contact info, validity period, notes, terms, status, created/sent/viewed/responded timestamps), quote line items (reference to catalog item or service, description override, quantity, unit price, line notes), and quote totals (subtotal, tax estimate, total)
- E11-S4-T2: implement quote lifecycle state machine — Draft → Sent → Viewed → Accepted / Declined / Revision Requested / Expired; with timestamp tracking for each transition and automatic expiration based on validity period
- E11-S4-T3: implement quote domain services — create, update (draft only), send (generates secure share token and triggers notification), record view event, accept, decline, request revision, expire, and clone (create new quote from existing)
- E11-S4-T4: implement quote-to-order conversion service — when a quote is accepted, generate a pre-filled cart or order draft from the quote line items using E7-S1 pricing engine, preserving the quoted prices where applicable
- E11-S4-T5: define admin API contracts — quote CRUD, quote list with status filter and search, quote pipeline aggregation (count by status), send action, and conversion action
- E11-S4-T6: define customer-facing quote view — secure token-based read endpoint (no auth required for viewing), quote detail with line items, accept/decline/revision-request actions (these require identity capture — email at minimum)
- E11-S4-T7: implement quote notification hooks — send via email/SMS (E8-S4), include secure portal link, send reminders for quotes approaching expiration
- E11-S4-T8: build admin quote management views — quote list with pipeline status counts, quote detail/edit form with line-item builder, send confirmation, and conversion tracking

Test Requirements:
- unit: quote state machine rejects invalid transitions; expiration logic handles timezone and validity-period edge cases; line-item total calculations are correct
- integration: quote creation persists with line items; send generates secure token; quote-to-order conversion creates valid order draft; notification hooks fire on send and reminder
- API contract: admin CRUD validates required fields; customer-facing token endpoint returns quote without leaking other tenant data; accept/decline captures respondent identity
- security: secure share tokens are unguessable, time-limited (or tied to quote validity), and scoped to the specific quote

Handoff Focus:
- quote schema (header + line items), lifecycle state machine, secure-share token model, quote-to-order conversion contract, and notification integration points

## E11-S5 Portfolio and Showcase Module

> **Design-Alignment Notes (contractor-vertical pilot):**
> The pilot contractor needs a project portfolio page on their storefront — each project shows before/after images, description of work done, services referenced, location, and optional customer testimonial. This is a reusable module for any service-oriented vertical (contractors, salons, landscapers, etc.). It should be template-controlled and toggleable like other modules.

Technical Tasks:
- E11-S5-T1: define portfolio project schema — title, description (rich text), project date, location/address (optional), referenced service categories, status (draft/published), sort order, and customer testimonial (quote text, attribution name, optional rating)
- E11-S5-T2: define portfolio media schema — multi-image gallery per project with caption, sort order, and optional before/after tag; reuse media infrastructure from E6-S1 catalog media patterns
- E11-S5-T3: implement portfolio domain services — project CRUD, publish/unpublish, media management, and featured-project designation
- E11-S5-T4: define admin API contracts for portfolio management — project CRUD, media upload/reorder, publish state toggle, featured selection
- E11-S5-T5: expose storefront read models — published projects list (with pagination, category filter), featured projects for homepage, and individual project detail with full media gallery
- E11-S5-T6: register portfolio as a toggleable module in E3-S5 module registry so it can be enabled/disabled per vertical template

Test Requirements:
- integration: portfolio projects persist with media, service references, and tenant scoping; module toggle controls storefront visibility
- API contract: admin CRUD validates required fields; storefront endpoints return only published projects; media upload/reorder operations are atomic
- unit: before/after tag logic, featured-project constraints, and publish-state transitions behave correctly

Handoff Focus:
- portfolio schema, media reuse pattern, module registration, storefront read models, and featured-project logic

## E11-S6 Customer Subscription and Recurring Order Support

> **Design-Alignment Notes:**
> The analytics breakdown shows "subscriptions 10%" as a sales channel. This implies tenants can offer recurring purchase plans. From the customer account, subscribers need to manage active plans (view, pause, resume, cancel). Recurring orders must create actual order records on schedule and charge saved payment methods.

Technical Tasks:
- E11-S6-T1: define subscription plan schema — name, description, linked catalog items or services, frequency (weekly/biweekly/monthly/custom), pricing (flat rate or calculated), cancellation policy (anytime, end-of-period, minimum commitment), and trial period support
- E11-S6-T2: define customer subscription schema — plan reference, customer reference, status (active/paused/cancelled/expired), saved payment method reference, next renewal date, billing history
- E11-S6-T3: implement subscription lifecycle services — subscribe, pause, resume, cancel, and reactivate; enforce cancellation policy and minimum-commitment rules
- E11-S6-T4: implement renewal automation job — scheduled process that creates renewal orders (E7-S2) from active subscriptions on their renewal date, charges saved payment method (E8-S2), and handles payment failure with retry + customer notification (E8-S4)
- E11-S6-T5: define admin API contracts — subscription plan CRUD, subscriber list with status filter, subscription override (extend, adjust, cancel on behalf of customer)
- E11-S6-T6: define customer-facing subscription management — view active subscriptions, upcoming renewal, pause/resume/cancel actions, and billing history within the account area (E7-S5 account tab integration)
- E11-S6-T7: implement analytics channel attribution for subscription revenue so E11-S1 analytics can report subscription as a revenue channel

Test Requirements:
- unit: subscription lifecycle transitions enforce cancellation policy and minimum commitment; renewal date calculation handles month boundaries correctly
- integration: renewal job creates valid orders and payment intents; failed payments trigger retry and notification; pause suspends future renewals
- API contract: admin endpoints enforce tenant scope; customer endpoints return only authenticated subscriber's data

Handoff Focus:
- subscription plan model, customer subscription schema, renewal automation job, payment retry behavior, and analytics channel attribution hook

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
