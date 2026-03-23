# Prompt 28: E13-S2 Customer Portal — Storefront and Browse

## Sequence Position

- Prompt: 28 of 46
- Epic: 13 — Frontend Implementation and Component Library
- Story: E13-S2
- Tasks: E13-S2-T1, E13-S2-T2, E13-S2-T3, E13-S2-T4, E13-S2-T5, E13-S2-T6, E13-S2-T7
- Phase: E13 UI Foundation (can run parallel with prompt 31 after prompt 27 is complete)

## Prerequisites

- E13-S1 (prompt 27) completed — shared components and SDK client available
- E6-S1 (catalog domain) and E6-S2 (services domain) — completed backend
- E4-S2 (tenant bootstrap) — completed
- E2 (auth) — completed

## Context for the Agent

You are building the **customer-facing storefront** for the `web-customer` app. This includes the home page, catalog/menu browse, item detail, services browse/detail, login/register, and content pages. The app currently has placeholder `h()` render functions and zero `.vue` SFC files.

You are creating the first real pages customers see. The design references are detailed — follow them closely for layout, component choices, and interaction patterns. Use `@platform/ui` components from E13-S1 and the `@platform/sdk` client for all API calls.

The customer layout has a header with tenant branding, navigation (Home, Menu, Services), cart icon with count badge, and a footer. Auth state determines whether "Account" or "Sign In" shows in the header.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-13.md
agents/epics/epic-13-tasks.md (section E13-S2)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/design/screen-reference-index.md (Customer Portal section)
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S1-*.md (component library and SDK — from prompt 27)
agents/epics/handoffs/*-E6-S1*.md (catalog backend)
agents/epics/handoffs/*-E6-S2*.md (services backend)
agents/epics/handoffs/*-E4-S2*.md (tenant bootstrap)
agents/epics/handoffs/*-E2-*.md (auth)
```

Read these HTML design references:

```
agents/design/Portal Design - Customer Portal store front home.html (CP-01)
agents/design/Portal Design - Customer Portal menu and services.html (CP-02, CP-03, CP-07, CP-08)
agents/design/Portal Design - Customer Portal - signin register reset.html (CP-20)
```

Inspect code surfaces:

```
platform/apps/web-customer/src/ (existing app shell — replace placeholders with real components)
platform/packages/ui/src/ (consume components from E13-S1)
platform/packages/sdk/src/ (consume API client from E13-S1)
platform/packages/types/src/ (catalog, service, auth types)
```

## Implementation Scope

### E13-S2-T7: Customer Layout Shell
- Customer header: tenant logo/name (from tenant bootstrap), navigation links (Home, Menu/Catalog, Services), cart icon with item count badge, user menu (Account if logged in, Sign In if not)
- Footer: store info, links, contact
- Auth state management: detect logged-in user, redirect to login for protected routes
- Route configuration in `vue-router`: define all customer routes (/, /menu, /menu/:itemId, /services, /services/:serviceId, /cart, /checkout, /login, /register, /account/*, /pages/:slug)
- Auth guards for protected routes (/account/*, /checkout)

### E13-S2-T1: Storefront Home (CP-01)
- Hero banner section with tenant branding and primary CTA button
- Featured categories grid using CardGrid component
- Featured/flash deals product carousel or grid section
- Trust bar with store info (hours, delivery, phone)
- Fetch data via SDK: `catalog.listCategories()`, featured items query
- Route: `/`

### E13-S2-T2: Catalog / Menu Browse (CP-02)
- Product grid layout with CardGrid
- Category sidebar or horizontal filter bar
- SearchToolbar with search input, sort (price, name, newest), filters (category, price range)
- Active filter tags with remove
- Pagination component
- Fetch: `catalog.listItems({ category, search, sort, page })`
- Route: `/menu` or `/catalog`

### E13-S2-T3: Item Detail (CP-03)
- Product image (full width on mobile, side column on desktop)
- Product name, description, price
- Modifier group selectors (radio for single-select, checkbox for multi-select)
- Quantity selector
- Add to cart button (with selected modifiers and quantity)
- Related items section
- Fetch: `catalog.getItem(itemId)`
- Route: `/menu/:itemId`

### E13-S2-T4: Services Browse (CP-07) and Service Detail (CP-08)
- Services CardGrid with category filter
- Service card: image, name, duration, price, "Book" CTA
- Service detail page: full description, duration, pricing tiers, staff availability, "Book Now" CTA linking to booking flow
- Fetch: `services.list()`, `services.get(serviceId)`
- Routes: `/services`, `/services/:serviceId`

### E13-S2-T5: Login / Register / Reset (CP-20)
- Split layout: branding panel (left) + form (right)
- TabBar toggle between Sign In and Register tabs
- Sign in form: email, password, remember me, forgot password link
- Register form: name, email, password, password confirmation, password strength indicator
- Forgot password page: email input, submit, success message
- Social login buttons (render if configured in tenant settings)
- On success: redirect to previous page or home
- Fetch: `auth.login()`, `auth.register()`, `auth.forgotPassword()`
- Routes: `/login`, `/register`, `/forgot-password`

### E13-S2-T6: Content Pages (CP-19)
- Simple CMS page: fetch page by slug, render rich text HTML content
- Page title, breadcrumb
- Fetch: `content.getPage(slug)`
- Route: `/pages/:slug`

## Constraints

- Use ONLY `@platform/ui` components — do not create one-off data tables or modals
- Use ONLY `@platform/sdk` for API calls — no raw fetch calls in page components
- All colors via design tokens — no hardcoded hex values
- Loading states: show skeleton/spinner while fetching data
- Error states: show user-friendly error message on API failure
- Empty states: show helpful message when no products, no services, etc.
- Responsive: must work at desktop (1280px+) and tablet (768px+) minimum

## Validation Commands

```bash
pnpm --filter web-customer typecheck
pnpm --filter web-customer build
pnpm --filter web-customer test
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

Create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S2-T1.md
agents/epics/handoffs/YYYY-MM-DD-E13-S2-T2.md
agents/epics/handoffs/YYYY-MM-DD-E13-S2-T3.md
agents/epics/handoffs/YYYY-MM-DD-E13-S2-T4.md
agents/epics/handoffs/YYYY-MM-DD-E13-S2-T5.md
agents/epics/handoffs/YYYY-MM-DD-E13-S2-T6.md
agents/epics/handoffs/YYYY-MM-DD-E13-S2-T7.md
```

Each handoff must include:
- Vue component file paths and route definitions
- SDK methods consumed
- UI components consumed from @platform/ui
- Loading/error/empty state handling approach
- Playwright test projects run and results
- Files created/modified

## Downstream Consumers

- E13-S3 (prompt 29) builds the commerce flow on top of this storefront
- E13-S4 (prompt 30) builds the account area, sharing the customer layout shell

## Stop Conditions

- STOP if E13-S1 components are not available — write a blocked handoff
- STOP if SDK catalog/auth methods are missing — build minimum stubs and document
- STOP if the web-customer app has a build configuration that doesn't support Vue SFC — document and escalate
