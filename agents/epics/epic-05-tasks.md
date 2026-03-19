# Epic 5 Technical Task Plan

> **UX Design References:** See `agents/design/screen-reference-index.md` for the full screen-to-brief mapping. All 8 Business Admin portal screens are in `agents/design/Portal Design - Business Admin *.html`. When building admin UI views, read the corresponding HTML file for layout, component arrangement, and interaction patterns. Colors are ignored — use semantic design tokens.

## E5-S1 Tenant Admin Shell and Navigation

UX References: `Portal Design - Business Admin dashboard.html` (BA-01), all BA sidebar nav patterns

Technical Tasks:
- E5-S1-T1: define tenant-admin route map, information architecture, and role-aware navigation sections
- E5-S1-T2: implement tenant-admin shell with session-aware route guards and tenant context header
- E5-S1-T3: connect module enablement to navigation visibility and route accessibility
- E5-S1-T4: establish admin dashboard placeholders for operations, content, and configuration sections

Test Requirements:
- UI interaction: tenant-admin shell loads only for authorized tenant members
- integration: module toggles and roles shape navigation consistently
- error-state test: suspended tenant or expired session is handled safely in admin shell

Handoff Focus:
- admin route map, nav gating logic, and shared dashboard mount points

## E5-S2 Business Profile and Brand Configuration

UX References: `Portal Design - Business Admin - settings and activity log.html` (BA-02 Business Profile + Branding sections)

Technical Tasks:
- E5-S2-T1: implement tenant profile schema-backed forms for business identity and contact data
- E5-S2-T2: implement brand asset upload and theme configuration inputs
- E5-S2-T3: define backend validation rules for public-facing profile and theme fields
- E5-S2-T4: connect saved brand configuration to storefront presentation payloads

Test Requirements:
- API contract: profile and theme update endpoints validate required fields and invalid media references
- UI interaction: forms show persisted state, validation errors, and save confirmation clearly
- integration: brand changes appear in tenant configuration read models used by storefront bootstrap

Handoff Focus:
- profile payload contract, media reference model, and storefront-facing branding outputs

## E5-S3 Locations, Hours, and Operating Rules

UX References: `Portal Design - Business Admin - content and locations.html` (BA-03 Locations tab)

Technical Tasks:
- E5-S3-T1: implement location CRUD with address, timezone, and contact fields
- E5-S3-T2: implement hours, blackout windows, and fulfillment-mode configuration
- E5-S3-T3: define tax, tipping, cancellation, and lead-time policy configuration model
- E5-S3-T4: expose normalized operating rules for downstream ordering and booking services

Test Requirements:
- unit: operating rule validation rejects impossible hours and policy combinations
- integration: location and operating config persists cleanly and is queryable by downstream modules
- API contract: rule payloads remain stable for future scheduling and commerce consumers

Handoff Focus:
- normalized operating rules contract and location identifier semantics

## E5-S4 Tenant User and Staff Administration

UX References: `Portal Design - Business Admin - customers and staff.html` (BA-07 Staff tab, BA-17 invite modal), `Portal Design - Business Admin - settings and activity log.html` (Users section)

Technical Tasks:
- E5-S4-T1: implement tenant-user invitation, role update, and deactivation paths
- E5-S4-T2: implement staff-member management distinct from full admin user lifecycle
- E5-S4-T3: add UI views for admin users, staff records, and invitation states
- E5-S4-T4: emit audit events for membership and staff-management changes

Test Requirements:
- integration: tenant user and staff records remain scoped and role-safe
- UI interaction: invitation and role-management flows expose current status clearly
- audit test: membership changes and invitation actions are traceable

Handoff Focus:
- distinction between tenant users and staff resources, invitation states, and audit outputs

## E5-S5 Tenant Settings Propagation and Validation

Technical Tasks:
- E5-S5-T1: create backend settings validation layer for cross-field and module-aware constraints
- E5-S5-T2: define update events or cache invalidation hooks for downstream consumers of tenant settings
- E5-S5-T3: ensure settings changes stage or publish appropriately where live rollout must be controlled
- E5-S5-T4: expose user-facing feedback for settings save, validation failure, and pending downstream effects

Test Requirements:
- unit: cross-field validation catches unsupported configuration combinations
- integration: downstream consumers receive updated tenant settings predictably
- operational test: setting changes with publish implications do not create inconsistent live state

Handoff Focus:
- validation rules, propagation mechanism, and live-versus-staged settings behavior

## E5-S6 Tenant Activity and Audit Visibility

UX References: `Portal Design - Business Admin - settings and activity log.html` (BA-18 Activity Log section)

Technical Tasks:
- E5-S6-T1: define tenant-visible audit event categories and filtering rules
- E5-S6-T2: implement backend query surfaces for tenant activity summaries and recent changes
- E5-S6-T3: build tenant-admin activity views for settings, user, publish, and operational events
- E5-S6-T4: ensure platform-internal data is excluded from tenant-visible audit views

Test Requirements:
- integration: tenant activity queries return only tenant-owned and tenant-visible events
- UI interaction: activity filtering and timeline rendering behave correctly
- security test: platform-only actions and other-tenant events are never exposed in tenant views

Handoff Focus:
- tenant-visible audit taxonomy, query filters, and data-redaction rules

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
