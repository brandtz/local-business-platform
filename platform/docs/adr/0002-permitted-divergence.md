# ADR 0002: Permitted Divergence from Shared Frontend Conventions

## Status

accepted

## Context

[ADR 0001](0001-component-ownership.md) establishes which UI code belongs in `@platform/ui` versus app-specific directories. The cross-app shell conventions in `app-shell.ts` and the shared API client patterns in `@platform/sdk` define a baseline all three frontend apps must follow.

However, each app serves a different audience (customer, tenant admin, platform operator) and will inevitably encounter situations where the shared baseline doesn't fit. Without explicit rules for when divergence is permitted, agents and developers either over-conform (forcing awkward shared abstractions) or silently deviate (creating inconsistency and security gaps).

This ADR defines which conventions are mandatory (never diverge) and which are flexible (diverge with justification).

## Decision

### Mandatory Conventions — No Divergence Allowed

These conventions protect security, tenant isolation, and cross-app consistency. Apps must not override, bypass, or reimplement them:

1. **Tenant isolation.** All tenant-scoped data flows through the shared `AuthViewerState` and tenant context mechanisms. Apps must not construct alternate tenant resolution paths.

2. **Shell state security messaging.** Access-denied and suspended shell state descriptors must not expose tenant identifiers, slugs, or internal lifecycle status. Use `resolveShellStateDescriptor()` defaults or the per-app overrides in `createCustomerShellConfig()` / `createAdminShellConfig()` / `createPlatformAdminShellConfig()`.

3. **API error classification.** All HTTP error handling must use `classifyApiError()` from `@platform/sdk`. Apps must not create parallel error classification logic.

4. **Auth-state transitions.** `shouldTransitionAuthState()` from `@platform/sdk` determines when to redirect to sign-in or show access-denied. Apps must not hardcode HTTP status checks for auth decisions.

5. **Design token source of truth.** Token values come from `@platform/ui/tokens`. Apps consume tokens through `resolveDesignTokens()` and `resolveTenantThemeContext()`. Direct mutation or alternate token stores are prohibited (see ADR 0001).

6. **Cross-app import prohibition.** Apps must not import from another app's `src/` directory. Shared code belongs in a `@platform/*` package.

### Flexible Conventions — Divergence Permitted with Justification

These conventions are defaults that apps may override when the app's audience or workflow requires it. Divergence must be documented in the PR description with the reason.

1. **Routing patterns.** Apps may define app-specific route structures, guard logic, and navigation models. The shared `ShellState` conventions must still be respected for error and auth states, but route organization is app-owned.

2. **Layout and page composition.** Apps choose their own page layout structures (sidebar, tabs, full-width, etc.). They must consume `PageLayoutDescriptor` and `StackDescriptor` types from `@platform/ui` when applicable, but may use alternative compositions when the shared layout primitives don't fit.

3. **Local state management.** Apps may use app-specific composables, stores, or reactive patterns for local state. There is no requirement to use a shared state management library. View-state discriminated unions (like `TenantListViewState`) are an established pattern but not mandatory.

4. **Shell state descriptor text.** Apps may customize the title and message text for shell states through factory function overrides (e.g., customer app uses "Store Unavailable" for suspended). Chrome policy (showNavigation, showFooter) changes require stronger justification since they affect cross-app consistency.

5. **API client configuration.** Apps use `createApiClientConfig()` as the baseline but may pass different `baseUrl` or `timeout` overrides per app if deployment topology requires it.

6. **Component rendering approach.** The `defineComponent` / `h()` pattern is established but not enforced. Apps may adopt `<script setup>` SFCs or other Vue patterns if they have a compelling reason. Shared `@platform/ui` exports remain pure TypeScript regardless.

### Divergence Evaluation Checklist

Before an app diverges from a shared convention, answer these questions:

- [ ] Is the convention in the "mandatory" list above? If yes, divergence is not permitted.
- [ ] Does the divergence introduce a security risk (bypassing auth, leaking tenant data, skipping error classification)?
- [ ] Can the need be met by using existing override/extension points in the shared API?
- [ ] Is the divergence documented in the PR description with the specific reason?
- [ ] Will the divergence be confined to one app, or does it indicate the shared convention should be updated?

## Consequences

- **Easier:** agents and developers can quickly determine whether an app-specific pattern is acceptable by checking the mandatory vs. flexible lists and the evaluation checklist.
- **Harder:** introducing creative workarounds for mandatory conventions — any such attempt should be flagged in review.
- **Required:** divergence from flexible conventions must be documented in the PR description.
- **Forbidden:** divergence from mandatory conventions under any circumstances.

## Alternatives Considered

- **No divergence allowed:** rejected because it forces awkward shared abstractions for legitimately app-specific needs.
- **Diverge freely with no documentation:** rejected because it leads to silent inconsistency and security gaps.
- **Per-app configuration files for conventions:** rejected as over-engineering at this stage; the checklist approach is lighter and sufficient.

## Follow-Up Work

- E4-S2 through E5 tasks should reference this ADR when proposing app-specific patterns.
- If a new mandatory convention emerges (e.g., PWA caching rules from E4-S5), amend this ADR.
