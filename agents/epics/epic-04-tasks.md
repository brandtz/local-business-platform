# Epic 4 Technical Task Plan

## E4-S1 Shared Design Tokens and Layout System

Technical Tasks:
- E4-S1-T1: define shared visual tokens for typography, spacing, color, elevation, and interaction states
- E4-S1-T2: implement reusable layout primitives, navigation primitives, form primitives, and feedback components
- E4-S1-T3: create theme override mechanism for tenant branding without component forks
- E4-S1-T4: document component ownership and extension rules for app-specific compositions

Test Requirements:
- unit: theme token resolution and component variant logic behave predictably
- UI interaction: shared components render expected states across apps
- visual regression baseline: core primitives have stable render snapshots or equivalent safeguards

Handoff Focus:
- design token source of truth, theme override contract, and component extension boundaries

## E4-S2 Tenant-Aware Frontend Bootstrapping

Technical Tasks:
- E4-S2-T1: implement frontend bootstrap flow that resolves tenant context before route render
- E4-S2-T2: define loading, error, unresolved-tenant, and suspended-tenant shell states
- E4-S2-T3: connect frontend bootstrap to tenant configuration and module payloads from backend APIs
- E4-S2-T4: standardize tenant context availability for downstream routes and stores

Test Requirements:
- UI interaction: storefront bootstraps correctly on managed and custom domains
- integration: tenant config payload drives frontend routing and layout state
- error-state test: unresolved and suspended tenants present safe fallback experiences

Handoff Focus:
- frontend tenant bootstrap contract, startup state machine, and route guard assumptions

## E4-S3 Storefront Navigation and Template Regions

Technical Tasks:
- E4-S3-T1: define storefront layout regions and navigation schema driven by template configuration
- E4-S3-T2: implement route-aware region composition for catalog, services, and content surfaces
- E4-S3-T3: add module-aware navigation filtering based on tenant-enabled capabilities
- E4-S3-T4: expose template composition interfaces for later onboarding and publish workflows

Test Requirements:
- UI interaction: region composition updates predictably with template and module changes
- integration: navigation payloads from backend map correctly to frontend route structure
- regression test: invalid template config fails safely without collapsing the app shell

Handoff Focus:
- layout region schema, navigation config contract, and module-filtering rules

## E4-S4 Customer Account Shell

Technical Tasks:
- E4-S4-T1: define shared customer account route map and navigation model
- E4-S4-T2: implement authenticated account shell with session-aware guards and empty states
- E4-S4-T3: add placeholders and interfaces for orders, bookings, loyalty, and preferences modules
- E4-S4-T4: standardize account-level error and access-denied patterns

Test Requirements:
- UI interaction: authenticated and unauthenticated account entry behaves correctly
- integration: account shell consumes current customer identity and tenant context correctly
- accessibility check: account navigation and forms support keyboard and clear error feedback

Handoff Focus:
- account route contract, auth guard behavior, and module mount points for future work

## E4-S5 PWA and Device Capability Baseline

Technical Tasks:
- E4-S5-T1: define PWA manifest, installability behavior, and static asset caching strategy
- E4-S5-T2: implement service worker registration and safe cache invalidation approach
- E4-S5-T3: define push-notification registration hooks and device capability abstraction points
- E4-S5-T4: document offline-safe versus online-required route behavior

Test Requirements:
- UI interaction: install prompt and registration states behave predictably where supported
- operational test: cache invalidation does not strand users on stale critical assets
- degraded-mode test: offline behavior for read-only storefront surfaces is defined and validated

Handoff Focus:
- cache strategy, manifest assumptions, and push registration interfaces

## E4-S6 Cross-App Frontend Conventions

Technical Tasks:
- E4-S6-T1: define shared frontend patterns for routing, store setup, API client usage, error boundaries, and auth-state transitions
- E4-S6-T2: create app shell integration guidance for customer, tenant admin, and platform admin frontends including loading, empty, access-denied, and session-expired states
- E4-S6-T3: align shared package usage so app-specific code remains thin and intentional
- E4-S6-T4: document when divergence from shared conventions is allowed

Test Requirements:
- integration: all frontend apps consume shared API client and config patterns consistently
- static validation: shared conventions prevent duplicate infrastructure code across apps
- documentation check: allowed extension points and required state-handling patterns are clear enough for follow-on agents

Handoff Focus:
- shared frontend contract surfaces, shell-state patterns, and permitted app-level deviations

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
