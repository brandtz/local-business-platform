# Tenant Lifecycle State Machine

## States

- `draft`: tenant exists but is not yet operating publicly or serving normal production traffic.
- `active`: tenant is operational and can participate in standard tenant-scoped flows.
- `suspended`: tenant is temporarily disabled and must be blocked by dependent modules until reactivated or archived.
- `archived`: tenant is permanently closed in the current lifecycle model.

## Allowed Transitions

- `draft -> active` via `activate`
- `draft -> archived` via `archive`
- `active -> suspended` via `suspend`
- `active -> archived` via `archive`
- `suspended -> active` via `activate`
- `suspended -> archived` via `archive`

Transitions not listed above are denied. In particular, `active -> draft`, `draft -> suspended`, and all transitions out of `archived` are invalid.

## Operational Rules

- lifecycle mutations require a platform actor with the `tenants:write` capability
- archived is terminal in the current platform model
- dependent modules should not invent their own lifecycle transitions
- request gating may allow `draft` tenants for controlled setup flows, but must still deny `suspended` and `archived` tenants where operational access is required
- later persistence and API layers should emit audit records whenever lifecycle changes occur or are denied

## Audit Baseline

- `tenant.lifecycle_transitioned` records successful lifecycle mutations with actor, tenant, prior status, next status, and timestamp context
- `tenant.lifecycle_denied` records policy denials with actor, tenant, current status, lifecycle path, machine-readable reason, and timestamp context
- lifecycle denial reasons should remain machine-readable so later platform operations views can filter them without parsing human text