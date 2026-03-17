# Epic 3 Technical Task Plan

## E3-S1 Tenant Lifecycle State Machine

Technical Tasks:
- E3-S1-T1: formalize tenant lifecycle states and allowed transitions
- E3-S1-T2: implement backend enforcement for tenant activation, suspension, and archival rules
- E3-S1-T3: surface lifecycle state to dependent modules such as auth, routing, and publish control
- E3-S1-T4: record audit events for lifecycle changes and policy denials

Test Requirements:
- unit: lifecycle transition rules reject invalid state changes
- integration: suspended and archived tenants are blocked by dependent modules consistently
- audit test: lifecycle changes are queryable with actor and timestamp context

Handoff Focus:
- tenant state machine, transition guard rules, and downstream dependency contract

## E3-S2 Platform Tenant Provisioning Workflow

Technical Tasks:
- E3-S2-T1: implement tenant creation service with owner assignment and default configuration seed
- E3-S2-T2: apply vertical template defaults and initial module set during provisioning
- E3-S2-T3: create platform-admin API endpoints for tenant provisioning actions
- E3-S2-T4: produce initial provisioning summary payload for downstream onboarding flows

Test Requirements:
- integration: provisioning creates tenant, owner relationship, and default config atomically
- API contract: platform tenant creation validates required fields and returns usable tenant identifiers
- operational test: partial failure paths do not leave orphaned records silently

Handoff Focus:
- provisioning transaction boundaries, default seed contract, and onboarding summary payload

## E3-S3 Managed Subdomain and Preview Routing

Technical Tasks:
- E3-S3-T1: define managed subdomain generation and uniqueness rules
- E3-S3-T2: implement routing resolution for preview storefront and admin surfaces
- E3-S3-T3: add preview environment metadata to tenant configuration
- E3-S3-T4: define safe fallback behavior for unresolved preview routes

Test Requirements:
- unit: subdomain generation handles collisions deterministically
- integration: preview routes resolve the correct tenant context end-to-end
- security test: unresolved routes do not leak tenant data or admin access

Handoff Focus:
- managed preview URL contract, routing assumptions, and fallback behavior

## E3-S4 Custom Domain Verification and Promotion

Technical Tasks:
- E3-S4-T1: model custom domain records, verification state, and promotion state
- E3-S4-T2: implement verification workflow and external dependency abstraction for domain checks
- E3-S4-T3: implement primary domain promotion logic with safe rollback to managed subdomain
- E3-S4-T4: expose platform-admin and tenant-admin read models for domain status

Test Requirements:
- unit: domain verification and promotion rules reject invalid transitions
- integration: only verified domains can be promoted to primary live route
- operational test: failed promotion leaves prior routing state intact

Handoff Focus:
- domain state machine, verification evidence, and rollback contract

## E3-S5 Module Assignment and Template Registry

Technical Tasks:
- E3-S5-T1: define module registry and enablement configuration model
- E3-S5-T2: define template registry metadata and tenant-template association rules
- E3-S5-T3: implement platform APIs to assign and update modules and templates per tenant
- E3-S5-T4: propagate module configuration into frontend and backend capability checks

Test Requirements:
- unit: module assignment validation rejects unsupported combinations
- integration: module toggles affect available routes and services consistently
- contract test: template and module configuration payloads are stable for onboarding consumers

Handoff Focus:
- module keys, template metadata contract, and capability propagation rules

## E3-S6 Platform Operations Console Foundations

Technical Tasks:
- E3-S6-T1: define cross-tenant operational summary queries for lifecycle, publish, and health status
- E3-S6-T2: build platform-admin dashboard shells for tenant list and tenant detail views with privilege context, loading, empty, and failure states
- E3-S6-T3: expose audit, job, and publish summary widgets or data sources for platform operators
- E3-S6-T4: define filtering and search semantics for tenant-level operations views

Test Requirements:
- integration: platform dashboards return cross-tenant summaries without bypassing auth rules
- UI interaction: platform list and detail screens render state, privilege context, and filters correctly
- performance check: tenant summary queries scale for shared-runtime administrative usage

Handoff Focus:
- dashboard query contracts, filters, privilege indicators, and cross-tenant summary semantics

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
