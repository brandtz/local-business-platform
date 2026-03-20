# Epic 5 Technical Task Plan

> **UX Design References:** See `agents/design/screen-reference-index.md` for the full screen-to-brief mapping. All 8 Business Admin portal screens are in `agents/design/Portal Design - Business Admin *.html`. When building admin UI views, read the corresponding HTML file for layout, component arrangement, and interaction patterns. Colors are ignored — use semantic design tokens.

## E5-S1 Tenant Admin Shell and Navigation

UX References: `Portal Design - Business Admin dashboard.html` (BA-01), all BA sidebar nav patterns

> **Design-Alignment Notes (from wireframe review):**
> The admin dashboard wireframe shows: 4 KPI cards (Revenue $43.5K +12.5%, Orders 1,284 +8.2%, Bookings 342 -2.4%, Customers 8,932 +15.3%) with trend indicators; a Revenue area chart (switchable time periods); a Traffic Sources donut chart; a Recent Orders table with status badges; and a Recent Activity timeline feed. The sidebar navigation includes: Dashboard, Analytics, Catalog & Services, Orders & Bookings, Customers & Staff, Content & Locations, Settings. Dashboard placeholders must be structured to accept these specific widget types and data contracts — not just empty slots.

Technical Tasks:
- E5-S1-T1: define tenant-admin route map, information architecture, and role-aware navigation sections matching the sidebar structure shown in the design (Dashboard, Analytics, Catalog & Services, Orders & Bookings, Customers & Staff, Content & Locations, Settings)
- E5-S1-T2: implement tenant-admin shell with session-aware route guards and tenant context header
- E5-S1-T3: connect module enablement to navigation visibility and route accessibility
- E5-S1-T4: define dashboard widget mount-point contracts for KPI summary cards (with label, value, trend-direction, trend-percentage), chart regions (revenue area chart, traffic donut chart), recent-orders table, and activity timeline — actual data queries are implemented by later epics but the widget interfaces must be established now
- E5-S1-T5: implement dashboard empty-state and loading-state patterns for each widget slot so partial data availability degrades gracefully

Test Requirements:
- UI interaction: tenant-admin shell loads only for authorized tenant members; sidebar matches design navigation hierarchy
- integration: module toggles and roles shape navigation consistently; dashboard widget mount points accept placeholder and real data interchangeably
- error-state test: suspended tenant or expired session is handled safely in admin shell

Handoff Focus:
- admin route map, nav gating logic, dashboard widget-mount contracts (KPI card interface, chart interface, table interface, timeline interface), and shared dashboard state patterns

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

> **Design-Alignment Notes (from wireframe review):**
> The design shows a location sidebar list with selectable location cards and a detail form for the selected location (address, timezone, contact, hours grid, fulfillment modes). Staff cards in the Staff tab show location context. The analytics page has location filter dropdowns. Order checkout has delivery-address estimation tied to location. This implies multi-location operations need: per-location hours/rules, location-aware order routing, and location-based analytics aggregation in downstream epics. The domain model here must support those downstream needs.

Technical Tasks:
- E5-S3-T1: implement location CRUD with address, timezone, contact fields, and geographic coordinates (for delivery radius and distance estimation)
- E5-S3-T2: implement hours, blackout windows, and fulfillment-mode configuration per location (delivery, pickup, dine-in support flags)
- E5-S3-T3: define tax, tipping, cancellation, and lead-time policy configuration model — per location where applicable
- E5-S3-T4: expose normalized operating rules for downstream ordering and booking services
- E5-S3-T5: define location-selection query model for use by downstream features: analytics location filter, order-routing location resolution, and staff-location assignment lookups

Test Requirements:
- unit: operating rule validation rejects impossible hours and policy combinations; location geocoordinates pass format validation
- integration: location and operating config persists cleanly and is queryable by downstream modules; multi-location tenants can have independent hours and policies
- API contract: rule payloads remain stable for future scheduling, commerce, and analytics consumers

Handoff Focus:
- normalized operating rules contract, location identifier semantics, location-selection query model for downstream analytics/routing/assignment

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
