# SDK Package

Typed client and helpers for consuming platform APIs from frontend applications.

Ownership boundary:
- frontend-facing API client and transport helpers
- should depend on shared contract types, not on app implementations

Public entrypoint:
- `@platform/sdk`

Starter exports:
- `packageName`
- `createSdkClientDescriptor`
- `SdkClientDescriptor`

Intended consumers:
- frontend applications and integration-facing shared layers
- future API client composition code that needs stable transport contracts

Allowed workspace dependencies:
- `@platform/types`
- `@platform/utils`

Do not:
- import server application modules into the SDK
- bypass shared package entrypoints to reach into private implementation files
