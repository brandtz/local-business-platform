
# Epic 5: Tenant Admin Portal and Operational Configuration

## Objective

Provide each business with a secure back office to configure and operate its tenant.

## Scope

- tenant dashboard, settings, and operational preferences
- location, hours, fulfillment, tax, and policy configuration
- tenant user management and staff invitations
- media, theme, and content controls

## Deliverables

- web-admin application shell and navigation
- settings forms and validation for operational configuration
- user and staff administration interfaces
- tenant-level audit and activity summaries where useful

## Acceptance Criteria

- tenant owners can configure business identity and operating rules without platform intervention
- tenant admins only see their own data and available modules
- configuration changes propagate to storefront and downstream workflows safely

## Story Decomposition

### E5-S1: Tenant Admin Shell and Navigation

Outcome:
- tenant users have a coherent admin workspace with role-aware navigation and dashboard entry points

Dependencies:
- Epics 2 and 4

Acceptance Signals:
- tenant admins land in a tenant-scoped portal with navigation limited by role and module access
- admin shell can host settings, catalog, services, bookings, and commerce sections without restructuring later

### E5-S2: Business Profile and Brand Configuration

Outcome:
- tenant owners can manage business identity, contact metadata, branding assets, and core public-facing information

Dependencies:
- E5-S1

Acceptance Signals:
- business profile changes persist safely and update storefront presentation through configuration
- media upload and theme configuration paths are tenant-scoped and validated

### E5-S3: Locations, Hours, and Operating Rules

Outcome:
- each tenant can configure physical locations, hours, fulfillment support, blackout windows, and operating policies

Dependencies:
- E5-S1

Acceptance Signals:
- multiple locations can be managed under one tenant
- operating rules feed both ordering and booking downstream logic

### E5-S4: Tenant User and Staff Administration

Outcome:
- tenant owners can invite and manage admins, managers, and staff with explicit role boundaries

Dependencies:
- Epic 2
- E5-S1

Acceptance Signals:
- invitations and role updates are tenant-scoped and audited
- staff records can exist independently from full tenant admin privileges

### E5-S5: Tenant Settings Propagation and Validation

Outcome:
- configuration changes are validated server-side and propagated safely to storefront, scheduling, and commerce modules

Dependencies:
- E5-S2
- E5-S3

Acceptance Signals:
- invalid settings combinations are rejected with clear feedback
- settings updates trigger the necessary cache invalidation or publish staging behavior

### E5-S6: Tenant Activity and Audit Visibility

Outcome:
- tenant admins can inspect recent operational changes relevant to their business without accessing platform-internal controls

Dependencies:
- Epic 2
- E5-S1

Acceptance Signals:
- recent settings, user, and publish-related events are visible in tenant context
- tenant activity views exclude platform-only or other-tenant information

## Dependencies

- Epics 1 through 4
