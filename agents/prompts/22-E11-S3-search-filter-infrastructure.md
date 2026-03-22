# Prompt 22: E11-S3 Search and Filter Infrastructure

## Sequence Position

- Prompt: 22 of 38
- Epic: 11
- Story: E11-S3
- Tasks: E11-S3-T1, E11-S3-T2, E11-S3-T3, E11-S3-T4, E11-S3-T5, E11-S3-T6
- Phase: Epic 11 Cross-Cutting Features (can run parallel with prompt 21)

## Prerequisites

- E6 (all domain models — catalog, services, staff, content) — completed.
- E4-S1 (shared design tokens and layout system) — completed.
- E7 (orders, bookings, customers) — completed for indexing targets.

## Context for the Agent

You are implementing the shared search and filter infrastructure. Every admin list page (catalog, orders, bookings, customers, staff, content) and the customer storefront (products, services) includes a search input and filter toolbar. This requires a shared search service rather than ad-hoc per-page implementations.

The search service provides: full-text query, faceted filters (enum, range, date), sort parameters, cursor-based pagination, and autocomplete. It must be tenant-scoped so no data leaks across tenants. The service defines a generic interface consumable by any domain module, with initial integrations for catalog, orders, customers, and storefront.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-11.md
agents/epics/epic-11-tasks.md (section E11-S3)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read dependency handoffs:

```
agents/epics/handoffs/2026-03-20-E6-S1-S3.md (catalog, services, staff domain models)
agents/epics/handoffs/2026-03-21-E6-S4-*.md (content domain model)
agents/epics/handoffs/2026-03-22-E7-S1-*.md (cart and catalog patterns)
agents/epics/handoffs/2026-03-22-E7-S2-*.md (order domain)
agents/epics/handoffs/2026-03-22-E7-S5-*.md (customer domain)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (all domain entities)
platform/packages/types/src/ (domain types for indexing)
platform/apps/api/src/ (existing list/query patterns in admin APIs)
agents/design/Portal Design - Business Admin - catalog and services.html
agents/design/Portal Design - Customer Portal menu and services.html
```

## Implementation Scope

### E11-S3-T1: Shared Search Service Interface
- Define generic search contract: full-text query, faceted filters (enum, range, date), sort parameters, and cursor-based pagination.
- Interface must be consumable by any domain module without coupling to specific entities.

### E11-S3-T2: Search Indexing Strategy
- Define which domain entities are indexed: catalog items, services, orders, bookings, customers, staff, content pages.
- Define indexing triggers (on create/update/delete).
- Enforce tenant-scoped index isolation.

### E11-S3-T3: Autocomplete Service
- Typeahead suggestions from indexed entities.
- Usable in admin search bars and storefront search.

### E11-S3-T4: Reusable Filter-Toolbar Data Contract
- Structured filter definitions (field, type, options) that drive frontend filter toolbar rendering from server-provided metadata.
- Frontend consumes filter metadata to render dropdowns, date pickers, and text inputs generically.

### E11-S3-T5: Initial Consumer Integrations
- Integrate search with: admin catalog list, admin order list, admin customer list, and storefront product/service list.

### E11-S3-T6: Search Ranking and Relevance Baseline
- Implement basic relevance scoring and ranking tuning.

## Constraints

- Search results must be tenant-scoped — cross-tenant data leakage is a security violation.
- The search service must be a shared abstraction, not per-entity implementations.
- Do NOT implement full-text search via external engines (Elasticsearch, etc.) unless existing infrastructure supports it — start with database-level search and define the abstraction for future provider swap.
- Do NOT implement monitoring or analytics on search — that is E10/E11-S1 territory.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-customer-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E11-S3-T1.md
agents/epics/handoffs/YYYY-MM-DD-E11-S3-T2.md
agents/epics/handoffs/YYYY-MM-DD-E11-S3-T3.md
agents/epics/handoffs/YYYY-MM-DD-E11-S3-T4.md
agents/epics/handoffs/YYYY-MM-DD-E11-S3-T5.md
agents/epics/handoffs/YYYY-MM-DD-E11-S3-T6.md
```

Each handoff must include:
- Task ID and status
- Search service interface contract
- Indexed entities and trigger strategy
- Filter-toolbar metadata contract
- Consumer integration points
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The search service is consumed by:
- E11-S4 (quotes) — quote list search and filter
- All future admin list views benefit from the shared infrastructure
- E10-S7 Playwright coverage governance

## Stop Conditions

- STOP if domain entity schemas are not stable enough for indexing — write a blocked handoff.
- STOP if tenant-scoped index isolation cannot be guaranteed.
- STOP if the work expands into external search engine integration without infrastructure support.
