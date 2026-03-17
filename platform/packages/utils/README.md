# Utils Package

Shared utility helpers, guards, and formatting functions.

Ownership boundary:
- framework-light helpers used by multiple packages or apps
- avoid placing domain-specific policies here unless they are truly cross-cutting

Public entrypoint:
- `@platform/utils`

Starter exports:
- `packageName`
- `trimToUndefined`
- `parsePositiveInteger`

Intended consumers:
- shared packages and app shells that need generic parsing or normalization helpers
- validation layers that should stay framework-light

Allowed workspace dependencies:
- `@platform/types`

Do not:
- turn this package into a fallback location for unrelated business logic
- depend on app implementations or frontend framework runtime code
