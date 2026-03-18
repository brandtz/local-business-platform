# Engineering Conventions

## Module Ownership

- `apps/` holds deployable runtimes and route-entry surfaces
- `packages/` holds reusable public contracts and shared helpers
- `infra/` holds infrastructure-only code and provisioning definitions
- `docs/` holds engineering standards, ADRs, and contributor-facing architecture guidance

## Layering Rules

- apps may depend on shared packages through public package names
- shared packages may not import from `apps/`
- packages must not import another workspace's private `src` path
- lower-level packages should not depend on higher-level presentation or runtime packages
- keep runtime environment parsing in app shells or explicitly shared config helpers, not in shared type-only packages

## Naming Rules

- package names use the `@platform/<name>` format
- app identifiers use kebab-case
- docs use kebab-case file names
- exported types use PascalCase
- exported values use camelCase

## Review Expectations

- Foundation Lane work should receive review from an adjacent lane when possible
- changes that affect CI, package boundaries, or cross-app contracts should include explicit validation notes
- architecture-affecting changes should link an ADR or explain why the existing ADR set is sufficient

## Component Ownership

Refer to [ADR 0001 — Component Ownership and Extension Rules](adr/0001-component-ownership.md) for the full decision record.

Summary:

- `@platform/ui` owns shared design tokens, primitive descriptors, theme overrides, and shell state conventions
- apps own Vue component implementations, routes, view state composables, and page components
- shared primitives are extended through designated factory functions and override parameters, not by forking
- a type or function moves to `@platform/ui` only when at least two of three apps require the same contract
- direct token mutation, component forks, cross-app imports, and tenant-detail leakage in security states are prohibited

## Convention Divergence

Refer to [ADR 0002 — Permitted Divergence from Shared Frontend Conventions](adr/0002-permitted-divergence.md) for the full decision record.

Summary:

- mandatory conventions (tenant isolation, auth transitions, error classification, token source of truth, security messaging, cross-app import ban) cannot be diverged from
- flexible conventions (routing, layout, local state, descriptor text, API client config, rendering approach) may be overridden with justification documented in the PR description
- use the divergence evaluation checklist in ADR 0002 before proposing app-specific patterns
