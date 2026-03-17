
# Epic 3: Platform Admin, Tenant Provisioning, and Domain Management

## Objective

Give the platform owner end-to-end control of tenant lifecycle, configuration, routing, and deployment state.

## Scope

- tenant creation, activation, suspension, and archival
- module enablement and vertical template assignment
- managed subdomain generation and custom domain verification
- deployment and publish orchestration visibility
- platform-wide audit, job, and incident visibility

## Deliverables

- platform admin frontend shell and core navigation
- tenancy module with lifecycle state machine
- domain module with verification and promotion workflow
- template registry and module-assignment controls

## Acceptance Criteria

- a platform admin can provision a tenant and create a preview-ready environment
- custom domains can be attached and promoted only after verification
- tenant state changes are audited and enforceable by policy
- platform portal exposes cross-tenant health and operations views

## Story Decomposition

### E3-S1: Tenant Lifecycle State Machine

Outcome:
- tenants move through draft, active, suspended, and archived lifecycle states under explicit business rules

Dependencies:
- Epic 2

Acceptance Signals:
- lifecycle changes require authorized platform actions
- suspended or archived tenants are consistently restricted by downstream systems

### E3-S2: Platform Tenant Provisioning Workflow

Outcome:
- platform admins can create a new tenant with owner assignment, vertical template, and default module set

Dependencies:
- E3-S1

Acceptance Signals:
- tenant creation provisions the minimum configuration needed for preview access
- provisioning emits audit and operational events

### E3-S3: Managed Subdomain and Preview Routing

Outcome:
- every new tenant receives a managed preview route that resolves correctly before custom domain activation

Dependencies:
- E3-S2

Acceptance Signals:
- preview routes resolve tenant storefront and admin surfaces safely
- unresolved tenant routes fail closed rather than leaking other tenant data

### E3-S4: Custom Domain Verification and Promotion

Outcome:
- tenants can attach custom domains that are verified and promoted through explicit operational steps

Dependencies:
- E3-S3

Acceptance Signals:
- domain ownership verification must succeed before promotion
- only one primary live domain is active per tenant at a time unless platform policy says otherwise

### E3-S5: Module Assignment and Template Registry

Outcome:
- the platform can assign enabled modules and visual template defaults per tenant without code branching

Dependencies:
- E3-S2

Acceptance Signals:
- module toggles influence available surfaces and navigation
- template choices are persisted as tenant configuration, not source code divergence

### E3-S6: Platform Operations Console Foundations

Outcome:
- platform admins have central views into tenant state, jobs, publish status, and audit context

Dependencies:
- E3-S1
- E3-S2

Acceptance Signals:
- platform console lists tenants with lifecycle and operational status
- tenant drill-down exposes recent operational and audit context without bypassing security controls

## Dependencies

- Epics 1 and 2
