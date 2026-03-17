# Handoff Note

## Header

- Task IDs: E4-S1-T1, E4-S1-T2, E4-S6-T1, E4-S6-T3
- Task Titles:
  - E4-S1-T1: define shared visual tokens for typography, spacing, color, elevation, and interaction states
  - E4-S1-T2: implement reusable layout primitives, navigation primitives, form primitives, and feedback components
  - E4-S6-T1: define shared frontend patterns for routing, store setup, API client usage, error boundaries, and auth-state transitions
  - E4-S6-T3: align shared package usage so app-specific code remains thin and intentional
- Status: completed
- Date: 2026-03-17
- Primary owner lane: Frontend Systems Lane
- Packet paths:
  - ../packets/epic-04/E4-S1-T1.md
  - ../packets/epic-04/E4-S1-T2.md
  - ../packets/epic-04/E4-S6-T1.md
  - ../packets/epic-04/E4-S6-T3.md

## What Changed

- Changed surfaces:
  - ../../../../platform/packages/ui/src/tokens.ts (new — design token source of truth)
  - ../../../../platform/packages/ui/src/tokens.test.ts (new — 13 token tests)
  - ../../../../platform/packages/ui/src/primitives.ts (new — layout/feedback primitive types)
  - ../../../../platform/packages/ui/src/primitives.test.ts (new — 22 primitive tests)
  - ../../../../platform/packages/ui/src/index.ts (updated — re-exports tokens and primitives)
  - ../../../../platform/packages/sdk/src/api-client.ts (new — API client conventions and error patterns)
  - ../../../../platform/packages/sdk/src/api-client.test.ts (new — 20 API client tests)
  - ../../../../platform/packages/sdk/src/index.ts (updated — re-exports api-client)
  - ../../../../platform/apps/web-customer/package.json (updated — added @platform/ui, @platform/sdk, @platform/utils deps)
  - ../../../../platform/apps/web-admin/package.json (updated — same)
  - ../../../../platform/apps/web-platform-admin/package.json (updated — same)
  - ../../../../platform/apps/web-customer/tsconfig.json (updated — added project references for utils, ui, sdk)
  - ../../../../platform/apps/web-admin/tsconfig.json (updated — same)
  - ../../../../platform/apps/web-platform-admin/tsconfig.json (updated — same)
  - ../../../../platform/pnpm-lock.yaml (updated — reflects new workspace dependencies)
- New or updated contracts:
  - `DesignTokens` type and `defaultDesignTokens` constant in @platform/ui — canonical token source
  - `resolveDesignTokens(colorOverrides?)` — tenant branding override without component forks
  - `SemanticColors` — semantic color layer that tenant branding can override
  - `ShellState` / `ShellStateDescriptor` — canonical shell states shared across all apps
  - `AlertDescriptor`, `EmptyStateDescriptor`, `StatusBannerDescriptor`, `PageLayoutDescriptor`, `StackDescriptor` — UI primitive contracts
  - `ApiClientConfig` / `createApiClientConfig()` — shared API client config pattern
  - `ApiErrorKind` / `classifyApiError()` — error classification convention
  - `shouldTransitionAuthState()` — auth-state transition detection from API errors
  - `ErrorBoundaryResult` — discriminated union for error boundary state
- New config, env vars, events, or migrations:
  - none

## Design Decisions

- Design tokens are pure TypeScript with `as const` — no CSS-in-JS or CSS custom property generation at this layer. Apps bind tokens to their rendering approach.
- Tenant branding overrides only the `SemanticColors` layer, keeping typography, spacing, and elevation stable across tenants.
- UI primitive types are framework-agnostic descriptors. Apps use them with Vue's `defineComponent`/`h()` pattern already established in the codebase.
- API client config uses `/api` as default baseUrl and always enables `withCredentials: true` for cookie-based sessions.
- Error classification is HTTP-status-based without coupling to a specific HTTP client library.

## Validation

- Test layers run:
  - `pnpm test` (all 10 workspace packages — 130 tests pass, up from 95)
  - `pnpm typecheck` (all 10 workspace packages pass)
  - `pnpm lint` (all 10 workspace packages pass, zero warnings)
- Key passing cases:
  - token set completeness and semantic color mapping
  - `resolveDesignTokens()` returns defaults without overrides and merges partial color overrides
  - all 7 shell states have default messages; override title/message independently
  - `classifyApiError()` covers null/401/403/404/408/422/429/5xx/unknown status codes
  - `shouldTransitionAuthState()` returns correct transition for 401 and 403
  - error boundary helpers produce correct discriminated union states
  - all alert/banner/layout/stack descriptor factories produce valid defaults
  - workspace dependency-rules and package-manifest contract tests still pass
- Known untested cases and reason:
  - no Playwright tests added because these changes are pure TypeScript library code with no browser-visible impact
  - Playwright impact: none

## Assumptions and Risks

- Assumptions made:
  - pure TypeScript token/primitive definitions are the correct first layer before any Vue component implementation
  - the existing `createPage()` pattern using `defineComponent`/`h()` in apps will consume these descriptors in follow-on tasks
  - color primitive palette is sufficient for the initial design system; can be extended later
- Risks introduced or still open:
  - apps now declare @platform/ui and @platform/sdk as dependencies but do not import from them yet in runtime code — follow-on tasks should wire the consumption
  - font-family tokens use system font stacks; a branded font would need future extension
- Invariants changed: no

## Remaining Dependency Gates for E4-S2 through E4-S5

- **E4-S1-T3** (theme override mechanism for tenant branding): can proceed — depends on E4-S1-T1 tokens which are now complete
- **E4-S1-T4** (document component ownership and extension rules): can proceed — depends on E4-S1-T1 and E4-S1-T2 which are now complete
- **E4-S2** (tenant-aware frontend bootstrapping): BLOCKED — requires unfinished Epic 3 tenant bootstrap and route resolution APIs (E3-S3-T2 through E3-S6-T1)
- **E4-S3** (storefront navigation and template regions): BLOCKED — requires E4-S2 tenant context and unfinished Epic 3 template/module contracts
- **E4-S4** (customer account shell): BLOCKED — requires E4-S2 tenant bootstrap and customer identity APIs
- **E4-S5** (PWA and device capability baseline): partially unblocked — manifest/service worker work is possible but tenant-scoped caching requires E4-S2
- **E4-S6-T2** (app shell integration guidance): can proceed — depends on E4-S6-T1 patterns and E4-S1-T2 shell states which are now complete
- **E4-S6-T4** (document when divergence is allowed): can proceed — documentation task with no code dependency

## Next Handoff Targets

- Next likely task IDs:
  - E4-S1-T3 (theme override mechanism — now unblocked)
  - E4-S1-T4 (component ownership documentation — now unblocked)
  - E4-S6-T2 (app shell integration guidance — now unblocked)
  - E4-S6-T4 (divergence documentation — now unblocked)
- Recommended first files or docs to read:
  - ../../../../platform/packages/ui/src/tokens.ts
  - ../../../../platform/packages/ui/src/primitives.ts
  - ../../../../platform/packages/sdk/src/api-client.ts
  - this handoff note
- Specific blocker or caution for next agent:
  - E4-S2 through E4-S4 remain blocked on unfinished Epic 3 routing and tenant bootstrap outputs
  - when wiring apps to consume @platform/ui tokens, follow the existing `resolveDesignTokens()` override pattern for tenant branding
- Board update required:
  - add E4-S1-T1, E4-S1-T2, E4-S6-T1, E4-S6-T3 to Completed section
