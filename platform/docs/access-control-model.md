# Access Control Model

## Purpose

This document explains how tenant-admin and platform-admin access decisions are evaluated, where they diverge, and which operations require explicit escalation.

## Order of Evaluation

Tenant-admin access should be evaluated in this order:
1. actor type must be `tenant`
2. request must carry an explicit user id
3. user must have an active membership for the target tenant
4. tenant role must allow the requested baseline capability
5. module-specific feature flags may further narrow allowed actions later

The first four rules are active now.
Module-specific narrowing is planned but not yet implemented.

## Platform-Admin Evaluation Path

Platform-admin access should be evaluated in this order:
1. actor type must be `platform`
2. request must carry an explicit user id
3. request must carry a valid platform role
4. platform role must allow the requested platform capability
5. tenant access is still denied unless the caller enters an explicit tenant-scoped path later such as impersonation

The first four rules are active now.
Explicit tenant-scoped support flows such as impersonation remain separate work and are not implied by ordinary platform access success.

## Platform Role-Based Capabilities

The current platform capabilities are:
- `platform:manage`
- `tenants:read`
- `tenants:write`
- `domains:manage`
- `impersonation:manage`
- `analytics:read`

Current platform baseline map:
- `owner`: all current platform capabilities
- `admin`: `tenants:read`, `tenants:write`, `domains:manage`, `analytics:read`
- `support`: `tenants:read`, `impersonation:manage`
- `analyst`: `tenants:read`, `analytics:read`

These platform capabilities are enforced through a dedicated platform access helper path and must stay distinct from tenant membership checks.

## Platform-Only Operations and Escalation Rules

Platform-only operations are actions that should succeed only through platform scope and should not rely on tenant membership:
- cross-tenant lifecycle inspection and tenant status review
- tenant creation, suspension, archival, and other tenant-state management
- custom domain review and management across tenants
- cross-tenant analytics and operational summaries
- impersonation session initiation and revocation

Escalation rules:
- ordinary platform access does not grant tenant-admin route access
- ordinary platform access does not satisfy tenant membership requirements
- tenant data mutation should happen through tenant-scoped access rules, even when initiated by platform operators
- support-style access to tenant state should use explicit, auditable escalation such as impersonation rather than silent scope blending
- impersonation is higher trust than ordinary platform read or management capabilities and must remain explicit in API, UI, and audit behavior

## Role-Based Baseline Capabilities

The current baseline capabilities are role-based:
- `tenant:manage`
- `catalog:write`
- `orders:manage`
- `staff:manage`
- `content:publish`

Current baseline map:
- `owner`: all baseline capabilities
- `admin`: `catalog:write`, `orders:manage`, `staff:manage`, `content:publish`
- `manager`: `catalog:write`, `orders:manage`, `content:publish`
- `staff`: `orders:manage`

These baseline capabilities are enforced in the API auth helper layer and should stay stable unless the helper implementation and this document are updated together.

## Module-Based Capability Narrowing

Module-based checks are a second gate, not a replacement for tenant role checks.

Examples of future module-based narrowing:
- a tenant with ordering disabled should not use `orders:manage` even if the role would otherwise allow it
- a tenant with content disabled should not use `content:publish` even if the role would otherwise allow it
- a tenant with staff tools disabled should not use `staff:manage` even if the role would otherwise allow it

Module checks should never grant access a role does not already have.
They can only reduce access from the baseline role map.

## Failure Behavior

Missing membership, revoked membership, wrong tenant, and insufficient role should fail with the same tenant-access denial behavior.
Do not leak whether a tenant exists or whether the caller was close to having access.

Missing platform role, wrong actor type, missing user identity, and insufficient platform capability should fail with the same platform-access denial behavior.
Do not let platform-access success imply tenant-access success, and do not let tenant denial paths reveal whether platform escalation would have been possible.

Tenant resolution and tenant lifecycle state are evaluated before tenant-scoped reads and writes proceed.
Current machine-readable tenant failure reasons are:
- `tenant-unresolved`: request scope could not resolve a tenant from trusted inputs
- `tenant-inactive`: request resolved a tenant that is still draft and therefore not active for live-routing or publish-control paths
- `tenant-suspended`: request resolved a tenant that is suspended and therefore non-operational
- `tenant-archived`: request resolved a tenant that is archived and therefore non-operational

Current baseline semantics:
- `draft` tenants remain allowed through the operational tenant gate for preview and admin setup flows
- `live-routing` and `publish-control` paths require `active` tenant status and therefore reject `draft` tenants with `tenant-inactive`
- `suspended` and `archived` tenants fail closed before tenant membership or tenant-scoped data filtering returns business data
- platform-admin route space that resolves to platform scope is not treated as a tenant and therefore fails any downstream tenant requirement path

## Implementation Anchors

- `apps/api/src/auth/tenant-authorization.ts` owns the baseline capability map
- `apps/api/src/auth/tenant-access.service.ts` owns membership and capability enforcement for service and future guard usage
- `apps/api/src/auth/tenant-request-policy.service.ts` owns unresolved, suspended, and archived tenant failure semantics for tenant-scoped request flows
- `apps/api/src/auth/tenant-publish-policy.service.ts` owns the active-only publish gate for tenant lifecycle state
- `apps/api/src/auth/platform-authorization.ts` owns the platform capability map
- `apps/api/src/auth/platform-access.service.ts` owns platform role and capability enforcement for service and future guard usage
- later module-gating helpers should extend this model instead of bypassing it
- later impersonation work should build on this separation instead of blending tenant and platform scopes implicitly
