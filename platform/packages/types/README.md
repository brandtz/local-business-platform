# Types Package

Shared domain contracts, enums, and transport-level types.

Ownership boundary:
- shared public contracts only
- no runtime side effects or framework bootstrapping

Public entrypoint:
- `@platform/types`

Starter exports:
- `packageName`
- `authActorTypes`
- `platformActorRoles`
- `platformCapabilities`
- `tenantStatuses`
- `tenantActorRoles`
- `userStatuses`
- `credentialKinds`
- `sessionScopes`
- `PasswordLoginRequest`
- `PasswordLoginResponse`
- `SessionRefreshRequest`
- `SessionRefreshResponse`
- `LogoutRequest`
- `LogoutResponse`
- `AuthViewerState`
- `TenantSummary`
- `TenantMembershipRecord`
- `createAnonymousAuthViewerState`
- `createAuthenticatedAuthViewerState`
- `appShellIds`
- `sharedPackageNames`
- `AppShellId`
- `SharedPackageName`

Intended consumers:
- all apps and shared packages that need stable platform-level type contracts
- transport and workflow layers that should not pull in framework implementations

Allowed workspace dependencies:
- none

Do not:
- add framework bootstrapping helpers here
- mix runtime config parsing into shared type contracts
