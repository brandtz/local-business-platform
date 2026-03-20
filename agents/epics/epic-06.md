
# Epic 6: Core Domain Models for Catalog, Services, Staff, and Content

## Objective

Implement the reusable business domain layer that supports food, retail, and appointment-driven businesses in one platform.

## Scope

- catalog categories, items, modifiers, bundles, media galleries, compare-at pricing, bulk operations, and inventory/stock status
- service definitions, duration rules, eligibility, and add-ons
- staff records, assignment rules, schedule/availability metadata, and conflict detection
- content pages (with structured rich-text bodies), announcements (with date-range scheduling and placement), SEO metadata, and policy pages
- vertical templates that turn domain modules on and off by configuration

## Deliverables

- Prisma models and migrations for shared commerce and service domains (including modifier groups, media gallery sort-order, staff schedules, announcement scheduling, and structured content bodies)
- admin CRUD flows for catalog (with bulk ops and modifiers), services, staff (with schedule management), and content (with rich-text editing contracts)
- template-driven defaults for supported business types

## Design-Driven Advisory

> The following features are visible in the UX wireframes but intentionally **out of scope** for Epic 6 domain models. They are documented here so downstream epics can plan accordingly:
> - **Analytics & Reporting** — covered in E11-S1
> - **Loyalty & Rewards** — covered in E11-S2
> - **Search Infrastructure** — covered in E11-S3
> - **Quote & Estimate Management** — covered in E11-S4 (domain model for quotes is in E11, but E6 catalog/service schemas must be stable first as quotes reference them)
> - **Portfolio & Showcase Module** — covered in E11-S5 (reuses E6-S4 content patterns)
> - **Customer Subscription/Recurring Orders** — covered in E11-S6
> - **SaaS Subscription & Platform Billing** — covered in E12

## Acceptance Criteria

- restaurant-style and service-style tenants can coexist without separate codebases
- catalog and service modules can be enabled independently or together
- shared entities expose stable contracts for storefront and admin applications

## Story Decomposition

### E6-S1: Catalog Domain Model

Outcome:
- products, categories, pricing (including compare-at), modifiers (as first-class entities), media galleries with sort-order, inventory/stock status, and bulk-operation support are modeled for commerce-oriented tenants

Dependencies:
- Epics 1 and 5

Acceptance Signals:
- catalog entities support tenant-scoped CRUD and storefront read models
- catalog contracts are stable enough for downstream cart and order usage

### E6-S2: Service and Booking Domain Model

Outcome:
- services, durations, booking settings, and eligibility rules are modeled for appointment-driven tenants

Dependencies:
- Epics 1 and 5

Acceptance Signals:
- services expose the fields needed for availability, booking, and pricing logic
- service contracts are consumable by both storefront and admin surfaces

### E6-S3: Staff and Assignment Domain Model

Outcome:
- staff can be managed as operational resources with bookability, location context, weekly schedule/availability, and service-assignment eligibility

Dependencies:
- E6-S2
- E5-S4

Acceptance Signals:
- staff records support scheduling assignment and admin management
- staff entities remain distinct from tenant user permission entities

### E6-S4: Content and SEO Domain Model

Outcome:
- tenants can manage reusable content pages (with structured rich-text bodies and template regions), announcements (with date-range scheduling and placement configuration), and policy content with publish states

Dependencies:
- E5-S2

Acceptance Signals:
- content entities support draft and published states
- storefront can consume content by stable slugs and metadata

### E6-S5: Vertical Template Defaults

Outcome:
- the platform can apply sensible module, data, and presentation defaults for each supported business type including the contractor/home-services vertical (roofing, gutters, general contracting pilot)

Dependencies:
- Epic 3
- E6-S1
- E6-S2
- E6-S4

Acceptance Signals:
- each vertical can initialize with a predictable module combination and starter configuration
- the contractor vertical enables: services, bookings (for consultation scheduling), content, portfolio (E11-S5), and quotes (E11-S4) while disabling: catalog ordering and loyalty
- templates remain configuration-driven rather than hard-coded forks

### E6-S6: Domain Contract Stabilization

Outcome:
- shared domain APIs are documented and versioned well enough to support later commerce, booking, and onboarding work

Dependencies:
- E6-S1
- E6-S2
- E6-S3
- E6-S4

Acceptance Signals:
- frontend and backend teams can target a clear contract surface for these entities
- schema and API docs reflect the current domain model accurately

## Dependencies

- Epics 1 through 5
