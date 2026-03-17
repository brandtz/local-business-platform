# UI Package

Shared design system primitives, tokens, and layout building blocks.

Ownership boundary:
- reusable presentation primitives only
- no app-specific route logic or business workflows

Public entrypoint:
- `@platform/ui`

Starter exports:
- `packageName`
- `createUiShellDescriptor`
- `UiShellDescriptor`

Intended consumers:
- frontend applications and later shared design-system layers
- shell composition code that needs presentation-oriented metadata

Allowed workspace dependencies:
- `@platform/types`
- `@platform/utils`

Do not:
- import from frontend app `src` trees
- add tenant- or route-specific workflow logic into this package
