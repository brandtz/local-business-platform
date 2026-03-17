
# Epic 6: Core Domain Models for Catalog, Services, Staff, and Content

## Objective

Implement the reusable business domain layer that supports food, retail, and appointment-driven businesses in one platform.

## Scope

- catalog categories, items, modifiers, bundles, and media
- service definitions, duration rules, eligibility, and add-ons
- staff records, assignment rules, and schedule metadata
- content pages, announcements, SEO metadata, and policy pages
- vertical templates that turn domain modules on and off by configuration

## Deliverables

- Prisma models and migrations for shared commerce and service domains
- admin CRUD flows for catalog, services, staff, and content
- template-driven defaults for supported business types

## Acceptance Criteria

- restaurant-style and service-style tenants can coexist without separate codebases
- catalog and service modules can be enabled independently or together
- shared entities expose stable contracts for storefront and admin applications

## Story Decomposition

### E6-S1: Catalog Domain Model

Outcome:
- products, categories, pricing, and media-backed catalog entities are modeled for commerce-oriented tenants

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
- staff can be managed as operational resources with bookability and location context

Dependencies:
- E6-S2
- E5-S4

Acceptance Signals:
- staff records support scheduling assignment and admin management
- staff entities remain distinct from tenant user permission entities

### E6-S4: Content and SEO Domain Model

Outcome:
- tenants can manage reusable content pages, announcements, and policy content with publish states

Dependencies:
- E5-S2

Acceptance Signals:
- content entities support draft and published states
- storefront can consume content by stable slugs and metadata

### E6-S5: Vertical Template Defaults

Outcome:
- the platform can apply sensible module, data, and presentation defaults for each supported business type

Dependencies:
- Epic 3
- E6-S1
- E6-S2
- E6-S4

Acceptance Signals:
- each vertical can initialize with a predictable module combination and starter configuration
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
