# Epic 6 Technical Task Plan

## E6-S1 Catalog Domain Model

Technical Tasks:
- E6-S1-T1: finalize schema for categories, items, pricing, status, and media references
- E6-S1-T2: implement catalog domain services and repository patterns for tenant-scoped CRUD
- E6-S1-T3: define admin API contracts and query models for category and item management
- E6-S1-T4: expose storefront read models for active catalog presentation

Test Requirements:
- integration: catalog entities persist with tenant-safe relationships and retrieval patterns
- API contract: admin CRUD and storefront read routes validate payloads and filters correctly
- unit: catalog validation rules cover pricing, status, and slug or identity constraints

Handoff Focus:
- catalog schema contract, storefront read model, and admin API payload shapes

## E6-S2 Service and Booking Domain Model

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

Technical Tasks:
- E6-S3-T1: finalize schema for staff profiles, location relationships, and bookable state
- E6-S3-T2: implement staff management services distinct from tenant-user identity management
- E6-S3-T3: define assignment surfaces needed for service eligibility and booking flow selection
- E6-S3-T4: expose tenant-admin CRUD and lookup queries for operational staff usage

Test Requirements:
- integration: staff records remain scoped to tenant and location rules correctly
- API contract: staff CRUD supports assignment metadata without exposing auth internals
- unit: bookable-state and assignment validation handle missing or invalid relationships

Handoff Focus:
- staff-resource model, assignment lookups, and separation from auth membership entities

## E6-S4 Content and SEO Domain Model

Technical Tasks:
- E6-S4-T1: finalize schema for content pages, publish state, SEO metadata, and slugs
- E6-S4-T2: implement content services for draft, publish, archive, and retrieval behaviors
- E6-S4-T3: define admin editing contracts and storefront read contracts by slug
- E6-S4-T4: establish content model hooks for template rendering and publish workflows

Test Requirements:
- integration: content draft and published states persist and query correctly
- API contract: content endpoints validate slug uniqueness and publish-state transitions
- unit: SEO metadata and slug rules are enforced consistently

Handoff Focus:
- content state machine, slug contract, and template-consumption points

## E6-S5 Vertical Template Defaults

Technical Tasks:
- E6-S5-T1: define configuration bundles for each supported vertical across modules, theme, and starter data
- E6-S5-T2: map vertical defaults onto catalog, services, content, and operational settings models
- E6-S5-T3: implement template-application service to seed or update tenant defaults safely
- E6-S5-T4: document extension rules for new verticals without changing shared runtime assumptions

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
