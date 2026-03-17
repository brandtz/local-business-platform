# Config Package

Shared configuration helpers for environment, runtime settings, and build-time conventions.

Ownership boundary:
- environment loading, config validation, and shared build conventions
- no business-domain logic

Public entrypoint:
- `@platform/config`
- config files: `@platform/config/eslint`, `@platform/config/prettier`, `@platform/config/vitest`

Starter exports:
- `packageName`
- `configExports`
- `workspaceTaskNames`
- `workspaceDependencyRules`

Intended consumers:
- root workspace configuration
- application shells that need shared config metadata only
- shared-package boundary tooling and validation

Allowed workspace dependencies:
- none

Do not:
- import business-domain logic into this package
- import another workspace's private `src` path instead of its public entrypoint

Available shared configs:
- eslint: shared workspace lint rules and ignore patterns
- prettier: shared formatting conventions
- vitest: shared unit and integration test discovery rules
