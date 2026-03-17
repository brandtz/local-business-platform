
# Epic 4: Shared Frontend System and Customer Experience Shell

## Objective

Build the shared frontend substrate that powers tenant storefronts and customer account experiences.

## Scope

- customer web application shell with tenant resolution
- shared design system, theming, navigation, and layout composition
- PWA support, asset strategy, and runtime branding
- storefront rendering for catalog, services, and content pages
- customer account foundations for orders, bookings, and profile

## Deliverables

- reusable UI component library and theme tokens
- customer app router structure and domain-based bootstrapping
- storefront template system and layout regions
- account area shell with auth-aware navigation

## Acceptance Criteria

- a new tenant can render a branded storefront without code forks
- shared components are used across customer, admin, and platform portals where appropriate
- tenant branding and module toggles affect the rendered experience predictably
- customer shell supports mobile-first responsive behavior and installability

## Story Decomposition

### E4-S1: Shared Design Tokens and Layout System

Outcome:
- a reusable design foundation exists for typography, spacing, color, forms, navigation, and layout composition

Dependencies:
- Epic 1

Acceptance Signals:
- shared tokens and base components are consumable by all frontend apps
- theme overrides can be applied at runtime without component forks

### E4-S2: Tenant-Aware Frontend Bootstrapping

Outcome:
- the customer application resolves tenant context from domain or slug before rendering tenant content

Dependencies:
- Epic 3

Acceptance Signals:
- storefront shell boots into the correct tenant context on managed and custom domains
- unresolved or suspended tenants present safe fallback behavior

### E4-S3: Storefront Navigation and Template Regions

Outcome:
- tenant storefronts render through configurable layout regions and navigation rules rather than bespoke page implementations per business

Dependencies:
- E4-S1
- E4-S2

Acceptance Signals:
- templates control hero, navigation, content modules, and supporting layout regions
- turning modules on or off changes the storefront composition safely

### E4-S4: Customer Account Shell

Outcome:
- signed-in customers have a shared shell for profile, orders, bookings, loyalty, and communication preferences

Dependencies:
- Epic 2
- E4-S1

Acceptance Signals:
- customer account navigation is tenant-aware and secure
- account shell can host order and booking history modules as they land

### E4-S5: PWA and Device Capability Baseline

Outcome:
- customer-facing surfaces support installation, offline-friendly assets, and notification registration hooks

Dependencies:
- E4-S2

Acceptance Signals:
- storefront shell is installable as a PWA
- caching strategy is defined for static assets and safe read-only tenant content

### E4-S6: Cross-App Frontend Conventions

Outcome:
- customer, tenant admin, and platform admin apps share routing, API client, auth, and component conventions where appropriate

Dependencies:
- E4-S1
- Epic 1

Acceptance Signals:
- shared frontend packages reduce duplicate infrastructure code
- app-specific UI remains separated from cross-app primitives and utilities

## Dependencies

- Epics 1, 2, and 3
