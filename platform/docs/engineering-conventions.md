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
