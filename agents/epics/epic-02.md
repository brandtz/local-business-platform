
# Epic 2: Identity, Access Control, and Tenant Isolation

## Objective

Implement the security backbone for platform admins, tenant admins, staff, and customers.

## Scope

- authentication for platform, tenant admin, and customer users
- tenant-scoped membership and role model
- session handling, password reset, MFA, and device trust for privileged users
- authorization guards and policy enforcement across backend modules
- audit logging for privileged and security-sensitive actions

## Deliverables

- user, membership, session, and audit domain models
- NestJS auth module with guards and policy decorators
- platform admin impersonation controls with audit trail
- tenant-aware request context and data access patterns

## Acceptance Criteria

- tenant users cannot access data across tenants under any route or query path
- platform admins can access global controls without bypassing audit requirements
- privileged actions require explicit permissions and are tested
- impersonation is time-bound and reversible

## Story Decomposition

### E2-S1: Unified User and Session Model

Outcome:
- the platform supports platform users, tenant users, and customer users through a coherent identity model and secure session lifecycle

Dependencies:
- Epic 1

Acceptance Signals:
- users and sessions are modeled explicitly with expiration, revocation, and audit visibility
- login and logout paths are supported for each actor class that requires them

### E2-S2: Tenant Membership and Role Enforcement

Outcome:
- tenant-scoped users gain access through memberships and roles rather than implicit user-to-tenant assumptions

Dependencies:
- E2-S1

Acceptance Signals:
- tenant membership is required before tenant-admin endpoints return data
- role checks are enforced consistently in backend policies

### E2-S3: Platform Admin Role Separation

Outcome:
- platform-level permissions are isolated from tenant permissions and require stronger trust controls

Dependencies:
- E2-S1

Acceptance Signals:
- platform admins can reach only platform routes unless explicitly impersonating a tenant
- privileged platform capabilities are gated independently from tenant membership

### E2-S4: Request-Scoped Tenant Resolution and Guards

Outcome:
- every tenant-bound request resolves tenant context before business logic executes

Dependencies:
- E2-S2

Acceptance Signals:
- services receive tenant context from trusted request scope rather than raw client input
- unauthorized cross-tenant reads and writes are blocked at the guard and service levels

### E2-S5: MFA, Password Recovery, and Security Events

Outcome:
- high-privilege access flows include step-up authentication and auditable account recovery behavior

Dependencies:
- E2-S1
- E2-S3

Acceptance Signals:
- privileged users can complete MFA challenge flows
- password reset and recovery events are logged and traceable

### E2-S6: Impersonation and Privileged Audit Trail

Outcome:
- platform support actions can be performed through explicit, time-bound impersonation with complete traceability

Dependencies:
- E2-S3
- E2-S4

Acceptance Signals:
- impersonation sessions have start, end, target tenant, and acting user records
- tenant data changes made during impersonation remain attributable to the platform operator

## Dependencies

- Epic 1
