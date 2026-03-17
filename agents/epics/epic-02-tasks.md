# Epic 2 Technical Task Plan

## E2-S1 Unified User and Session Model

Technical Tasks:
- E2-S1-T1: finalize identity schema for users, sessions, password credentials, and actor types
- E2-S1-T2: implement auth domain services for session issue, refresh, revocation, and expiration
- E2-S1-T3: define login, logout, and session-refresh API contracts for supported actor classes
- E2-S1-T4: expose minimal auth state to frontend shells without leaking privileged fields

Test Requirements:
- unit: session lifecycle logic covers issue, expiry, rotation, and revoke behavior
- integration: identity persistence and auth flows work against the database layer
- API contract: login, logout, and refresh routes validate correct and incorrect credentials cleanly

Handoff Focus:
- auth token strategy, session invariants, and actor-type assumptions

## E2-S2 Tenant Membership and Role Enforcement

Technical Tasks:
- E2-S2-T1: finalize tenant membership schema and role definitions
- E2-S2-T2: implement authorization policies for tenant owner, admin, manager, and staff roles
- E2-S2-T3: wire tenant membership checks into admin route guards and service-layer access helpers
- E2-S2-T4: document which capabilities are role-based versus module-based

Test Requirements:
- unit: role-policy checks allow and deny the expected capabilities
- integration: tenant-admin endpoints reject users without membership or proper role
- API contract: forbidden responses are consistent and do not leak tenant existence unnecessarily

Handoff Focus:
- role matrix, permission helper APIs, and forbidden-response behavior

## E2-S3 Platform Admin Role Separation

Technical Tasks:
- E2-S3-T1: define platform admin role model and privileged capability map
- E2-S3-T2: implement separate platform guard path distinct from tenant membership checks
- E2-S3-T3: isolate platform sessions and route spaces from tenant-admin sessions where required, including frontend guard and unauthorized/session-expired UX paths
- E2-S3-T4: document platform-only operations and escalation rules

Test Requirements:
- unit: platform role checks are separate from tenant role checks
- integration: platform users can reach platform routes without tenant membership but cannot implicitly reach tenant routes in backend or frontend navigation flows
- security test: tenant credentials cannot elevate into platform routes

Handoff Focus:
- platform role semantics, route partitioning, and escalation boundaries

## E2-S4 Request-Scoped Tenant Resolution and Guards

Technical Tasks:
- E2-S4-T1: implement tenant resolution from domain, subdomain, or scoped admin context
- E2-S4-T2: inject trusted tenant context into request lifecycle and downstream services
- E2-S4-T3: enforce tenant filters in repository and query helpers for tenant-scoped entities and real controller entry points
- E2-S4-T4: define failure behavior for unresolved, suspended, or archived tenants

Test Requirements:
- unit: tenant resolution logic covers managed domains, custom domains, and failure states
- integration: tenant-scoped service queries and controller entry points cannot escape request tenant context
- security test: crafted inputs cannot force access to another tenant's records

Handoff Focus:
- tenant resolution sources, request context contract, and failure-state semantics

## E2-S5 MFA, Password Recovery, and Security Events

Technical Tasks:
- E2-S5-T1: define step-up authentication requirements for privileged actors
- E2-S5-T2: implement MFA challenge, verification, and recovery flow services
- E2-S5-T3: implement password reset request and completion flows with secure token handling
- E2-S5-T4: emit security-relevant audit events for login anomalies, MFA actions, and resets

Test Requirements:
- unit: MFA and reset token validation handles success, expiry, replay, and invalid cases
- integration: privileged login requires additional verification when policy demands it
- security test: recovery flows do not reveal account existence or sensitive tokens

Handoff Focus:
- MFA policy triggers, recovery token lifecycle, and security event taxonomy

## E2-S6 Impersonation and Privileged Audit Trail

Technical Tasks:
- E2-S6-T1: design impersonation session model with explicit target tenant and expiry
- E2-S6-T2: implement impersonation start, revoke, and context propagation behavior
- E2-S6-T3: ensure actions taken during impersonation preserve original actor attribution in audit logs
- E2-S6-T4: expose controlled UI indicators for active impersonation sessions

Test Requirements:
- unit: impersonation lifecycle validates allowed targets, expiry, and revocation
- integration: impersonated actions remain tenant-scoped and audit-attributed to platform operator
- UI interaction: admin surfaces clearly indicate when impersonation is active

Handoff Focus:
- impersonation context contract, audit attribution rules, and UI warning requirements

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
