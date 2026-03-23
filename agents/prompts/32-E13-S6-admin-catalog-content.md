# Prompt 32: E13-S6 Business Admin — Catalog, Services, and Content

## Sequence Position

- Prompt: 32 of 46
- Epic: 13 — Frontend Implementation and Component Library
- Story: E13-S6
- Tasks: E13-S6-T1, E13-S6-T2, E13-S6-T3, E13-S6-T4, E13-S6-T5, E13-S6-T6
- Phase: E13 UI Foundation (depends on prompt 31; can run parallel with prompt 29)

## Prerequisites

- E13-S1 (prompt 27) — DataTable, SlidePanel, TabBar, SearchToolbar, FormSection, RichTextEditor, CardGrid
- E13-S5 (prompt 31) — admin shell with sidebar navigation and route config
- E6-S1 (catalog domain) — completed backend
- E6-S2 (services domain) — completed backend
- E6-S3 (content, locations) — completed backend

## Context for the Agent

You are building the **catalog, services, and content management** pages inside the Business Admin portal. This is the bread-and-butter admin CRUD work — business owners manage their product catalog, service offerings, locations, content pages, and announcements from these screens.

The UI pattern is consistent across all these pages: **TabBar** for section switching, **DataTable** with **SearchToolbar** for list views, **SlidePanel** for create/edit forms, and **FormSection** for form layout. Products and services use bulk actions. Content pages use the **RichTextEditor** for body content.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-13.md
agents/epics/epic-13-tasks.md (section E13-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/design/screen-reference-index.md (BA-03 through BA-06, BA-14, BA-15)
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S1-*.md
agents/epics/handoffs/YYYY-MM-DD-E13-S5-*.md (admin shell)
agents/epics/handoffs/*-E6-S1*.md (catalog)
agents/epics/handoffs/*-E6-S2*.md (services)
agents/epics/handoffs/*-E6-S3*.md (content, locations)
```

Read HTML design references:

```
agents/design/Portal Design - Business Admin - catalog and services.html (BA-04, BA-05, BA-06)
agents/design/Portal Design - Business Admin - content and locations.html (BA-03, BA-14, BA-15)
```

Inspect code surfaces:

```
platform/apps/web-admin/src/ (admin shell from E13-S5)
platform/packages/sdk/src/ (catalog, services, content, locations methods)
platform/packages/types/src/ (catalog, service, content, location types)
```

## Implementation Scope

### E13-S6-T1: Category Management (BA-04)
- Categories page within Catalog section (TabBar: Categories | Products | Services)
- Category list — tree or flat list with parent-child indentation
- Drag-reorder for display order (use a lightweight drag library or native HTML5 drag)
- Create category: SlidePanel with FormSection — name, description, parent category select, image upload, display order
- Edit category: same SlidePanel, populated with existing data
- Delete category: confirmation modal (warn if has children or assigned products)
- Fetch: `catalog.listCategories()`, `catalog.createCategory()`, `catalog.updateCategory()`, `catalog.deleteCategory()`
- Route: `/admin/catalog/categories`

### E13-S6-T2: Item / Product Management (BA-05)
- Products tab in Catalog section
- DataTable with columns: image thumbnail, name, category, price, status (Active/Draft/Archived), actions
- SearchToolbar: search by name, filter by category dropdown, filter by status
- Bulk select checkboxes with bulk actions: Activate, Deactivate, Delete
- Create/edit product SlidePanel with tabs/sections:
  - Basic info: name, description (textarea), category select
  - Pricing: base price, compare-at price, tax settings
  - Media: image gallery upload (multiple images, drag-reorder)
  - Modifiers: modifier group management (group name, options with price adjustments)
  - Availability: active toggle, schedule (available from/until dates)
- Fetch: `catalog.listItems({ search, category, status, page })`, `catalog.getItem()`, `catalog.createItem()`, `catalog.updateItem()`, `catalog.deleteItem()`
- Route: `/admin/catalog/products`

### E13-S6-T3: Services Management (BA-06)
- Services tab in Catalog section
- DataTable with columns: name, category, duration, price, booking slots, status, actions
- SearchToolbar: search, filter by category
- Create/edit service SlidePanel:
  - Basic info: name, description, category
  - Pricing: base price, duration (minutes), price per duration unit
  - Booking settings: max concurrent bookings, buffer time between bookings, advance booking window
  - Staff assignment: multi-select of staff members who can perform this service
  - Availability: active toggle, schedule overrides
- Fetch: `services.list()`, `services.get()`, `services.create()`, `services.update()`, `services.delete()`
- Route: `/admin/catalog/services`

### E13-S6-T4: Location Management (BA-03)
- Locations page in Content section
- DataTable with columns: name, address, status, actions
- Create/edit location SlidePanel:
  - Basic info: name, address fields (street, city, state, zip, country), phone, email
  - Operating hours: 7-day grid (day → open time, close time, closed toggle)
  - Fulfillment options: checkboxes for delivery, pickup, dine-in
  - Delivery zone config (radius or zip codes) — if delivery enabled
- Fetch: `locations.list()`, `locations.get()`, `locations.create()`, `locations.update()`, `locations.delete()`
- Route: `/admin/content/locations`

### E13-S6-T5: Content Pages Editor (BA-14)
- Content Pages tab in Content section
- CardGrid of content pages: title, status badge (Draft/Published), last modified, excerpt
- Create page: full-page editor view — title input, URL slug (auto-generated from title, editable), RichTextEditor for body, SEO section (meta title, meta description), featured image upload
- Draft/publish workflow: save as draft, publish, unpublish
- Preview button (opens in new tab — customer portal URL)
- Fetch: `content.listPages()`, `content.getPage()`, `content.createPage()`, `content.updatePage()`, `content.deletePage()`
- Route: `/admin/content/pages`, `/admin/content/pages/:pageId/edit`

### E13-S6-T6: Announcements and Promotions (BA-15)
- Announcements tab in Content section
- DataTable: title, status (Active/Scheduled/Expired), start date, end date, visibility
- Create/edit announcement SlidePanel:
  - Title, content (rich text or plain text)
  - Scheduling: start date/time, end date/time
  - Visibility: all customers, logged-in only, specific segments
  - Display type: banner, popup, in-feed
- Activate/deactivate toggle
- Fetch: `content.listAnnouncements()`, `content.createAnnouncement()`, `content.updateAnnouncement()`
- Route: `/admin/content/announcements`

## Constraints

- Use DataTable, SlidePanel, TabBar, SearchToolbar, FormSection, RichTextEditor from `@platform/ui` — no custom implementations
- Drag-reorder: keep lightweight — native HTML5 drag API or vuedraggable if already in deps
- Image upload: use FileUpload component from E13-S1, integrate with existing media/upload endpoint if available
- All API calls via `@platform/sdk`
- Loading, error, empty states on every list/page
- Form validation: required fields, price format, URL slug format
- Responsive: DataTable should scroll horizontally on small screens

## Validation Commands

```bash
pnpm --filter web-admin typecheck
pnpm --filter web-admin build
pnpm --filter web-admin test
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

Create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E13-S6-T1.md
agents/epics/handoffs/YYYY-MM-DD-E13-S6-T2.md
agents/epics/handoffs/YYYY-MM-DD-E13-S6-T3.md
agents/epics/handoffs/YYYY-MM-DD-E13-S6-T4.md
agents/epics/handoffs/YYYY-MM-DD-E13-S6-T5.md
agents/epics/handoffs/YYYY-MM-DD-E13-S6-T6.md
```

Each handoff must include:
- Component composition for each page (which @platform/ui components used)
- SlidePanel form field definitions
- Drag-reorder implementation approach
- SDK methods consumed with request/response shapes
- Bulk action implementation
- Playwright test results
- Files created/modified

## Downstream Consumers

- Customer portal (prompts 28-30) displays the catalog/content data managed here
- E13-S7 (prompt 33) orders/bookings reference catalog items

## Stop Conditions

- STOP if DataTable/SlidePanel/RichTextEditor not available from E13-S1 — blocked
- STOP if catalog/services/content SDK methods missing — build minimum stubs and document
- STOP if drag-reorder requires a heavy dependency not already in the project — implement without drag, add TODO
