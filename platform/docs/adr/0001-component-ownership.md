# ADR 0001: Component Ownership and Extension Rules

## Status

accepted

## Context

The platform has three frontend apps (`web-customer`, `web-admin`, `web-platform-admin`) and a shared UI package (`@platform/ui`). As feature epics progress (E4-S2 through E5), individual apps will build UI compositions on top of the shared design tokens, layout primitives, feedback components, theme overrides, and shell state conventions defined in `@platform/ui`.

Without clear ownership boundaries, shared code accumulates accidental complexity from app-specific needs, or apps duplicate shared patterns. Both outcomes increase maintenance cost and inconsistency risk.

This ADR establishes which code belongs in `@platform/ui` versus app-specific `src/` directories, how shared primitives may be extended, and which patterns are prohibited.

## Decision

### Ownership Boundary

**@platform/ui owns:**

- Design tokens (typography, spacing, color, elevation) — `tokens.ts`
- Semantic color definitions and tenant theme override mechanism — `theme.ts`
- Framework-agnostic primitive descriptors (alerts, empty states, banners, layouts, stacks) — `primitives.ts`
- Shell state descriptors and cross-app chrome policies — `app-shell.ts`
- Any future shared component contracts that must behave identically across all three apps

**Apps own:**

- Vue component implementations that render shared descriptors using `defineComponent` / `h()`
- Route definitions, route guards, and navigation structures
- App-specific view state composables (e.g., `tenant-dashboard.ts` in `web-platform-admin`)
- App-specific page components (e.g., `tenant-list-page.ts`, `tenant-detail-page.ts`)
- Runtime configuration and auth-state wiring

### Extension Rules

1. **Compose, don't fork.** Apps consume `@platform/ui` types and factory functions to build their components. If a shared primitive doesn't fit, compose a new app-local type that wraps or extends the shared type — do not copy and modify the shared source.

2. **Override through designated extension points.** Tenant branding uses `resolveTenantThemeContext()` with `TenantThemeOverride`. Shell state text uses `resolveShellStateDescriptor()` with title/message overrides. Chrome behavior uses per-app shell configs (`createCustomerShellConfig()`, etc.). Do not bypass these extension points.

3. **New shared primitives require cross-app justification.** A type or function should move to `@platform/ui` only when at least two of the three apps need the same contract. Single-app needs stay in the app's `src/` directory.

4. **Type-level contracts first, rendering second.** `@platform/ui` defines TypeScript types and pure functions. Vue-specific rendering stays in apps. This keeps the shared package framework-agnostic and testable without a DOM.

### Prohibited Patterns

- **No direct token mutation.** Apps must not reassign or monkey-patch values from `defaultDesignTokens` or `defaultSemanticColors`. Use `resolveDesignTokens()` with color overrides instead.
- **No component forks.** Copying a shared module into an app's `src/` and modifying it is forbidden. File an issue or extend through composition.
- **No cross-app imports.** Apps must not import from another app's `src/` directory. Shared logic belongs in a package.
- **No tenant details in security-sensitive states.** Access-denied and suspended shell state descriptors must not contain tenant identifiers, slugs, or internal status codes. Use the generic messages from `resolveShellStateDescriptor()` or the per-app overrides in `app-shell.ts`.

## Consequences

- **Easier:** agents and developers can determine where new UI code belongs by checking the two-of-three-apps rule and the type-first guideline.
- **Harder:** adding a quick one-off shared component — the bar for shared code is intentionally higher to prevent bloat.
- **Required:** any PR that adds exports to `@platform/ui` must justify cross-app need in the PR description.
- **Forbidden:** component forks, direct token mutation, cross-app imports, and tenant-detail leakage in security states.

## Alternatives Considered

- **Everything shared by default:** rejected because it leads to a bloated shared package with app-specific conditionals.
- **No shared UI package:** rejected because it forces duplication of design tokens and fundamental type contracts.
- **CSS-in-JS token distribution:** rejected in favor of pure TypeScript tokens that stay framework-agnostic (see E4-S1-T1 design decision in the E4 foundation handoff).

## Follow-Up Work

- E4-S2 through E4-S5 should reference this ADR when deciding where to place new UI code.
- If a pattern is needed by all three apps but isn't in `@platform/ui`, the implementing task should add it with a note referencing this ADR.
