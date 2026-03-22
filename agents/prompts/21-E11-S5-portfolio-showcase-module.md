# Prompt 21: E11-S5 Portfolio and Showcase Module

## Sequence Position

- Prompt: 21 of 38
- Epic: 11
- Story: E11-S5
- Tasks: E11-S5-T1, E11-S5-T2, E11-S5-T3, E11-S5-T4, E11-S5-T5, E11-S5-T6
- Phase: Epic 11 Cross-Cutting Features (can run parallel with prompt 22)

## Prerequisites

- E6-S4 (content and SEO domain model) — completed. See E6-S4 handoff notes.
- E4-S3 (storefront navigation and template regions) — completed. See E4 handoff notes.
- E3-S5 (module assignment and template registry) — completed for module toggle registration.

## Context for the Agent

You are implementing the portfolio and showcase module — a reusable content module for service-oriented verticals. The pilot customer (roofing/gutter contractor) needs a project portfolio page: each project shows before/after images, description, services referenced, and optional customer testimonials.

This module must be toggleable via the E3-S5 module registry (enabled by default for contractor/home-services vertical, disabled for food-service). It reuses media infrastructure patterns from E6-S1 catalog. The storefront exposes published projects with pagination and category filtering. Featured projects can appear on the homepage.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-11.md
agents/epics/epic-11-tasks.md (section E11-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read dependency handoffs:

```
agents/epics/handoffs/2026-03-21-E6-S4-*.md (content and SEO patterns)
agents/epics/handoffs/2026-03-20-E6-S1-S3.md (catalog media patterns to reuse)
agents/epics/handoffs/2026-03-17-E4-S3-*.md (storefront template regions)
agents/epics/handoffs/2026-03-16-E3-S5-*.md (module registry)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (media and content entities)
platform/packages/types/src/ (catalog, content types to follow patterns)
platform/apps/api/src/ (catalog media service patterns)
agents/design/Portal Design - Customer Portal store front home.html
```

## Implementation Scope

### E11-S5-T1: Portfolio Project Schema
- Define schema: title, description (rich text), project date, location/address (optional), referenced service categories, status (draft/published), sort order, and customer testimonial (quote text, attribution name, optional rating).

### E11-S5-T2: Portfolio Media Schema
- Multi-image gallery per project with caption, sort order, and optional before/after tag.
- Reuse media infrastructure from E6-S1 catalog media patterns.

### E11-S5-T3: Portfolio Domain Services
- Project CRUD, publish/unpublish, media management, and featured-project designation.

### E11-S5-T4: Admin API Contracts
- Project CRUD, media upload/reorder, publish state toggle, featured selection.

### E11-S5-T5: Storefront Read Models
- Published projects list with pagination and category filter.
- Featured projects for homepage integration.
- Individual project detail with full media gallery.

### E11-S5-T6: Module Registration
- Register portfolio as a toggleable module in E3-S5 module registry.
- Enable by default for contractor/home-services vertical template.
- Disable by default for food-service vertical.

## Constraints

- Reuse existing media patterns — do not create a separate media system.
- Module toggle must control storefront visibility entirely.
- Portfolio is content-only — no transactional features (ordering from portfolio items is out of scope).
- Do NOT create new vertical templates — only register with existing registry.

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
agents/epics/handoffs/YYYY-MM-DD-E11-S5-T1.md
agents/epics/handoffs/YYYY-MM-DD-E11-S5-T2.md
agents/epics/handoffs/YYYY-MM-DD-E11-S5-T3.md
agents/epics/handoffs/YYYY-MM-DD-E11-S5-T4.md
agents/epics/handoffs/YYYY-MM-DD-E11-S5-T5.md
agents/epics/handoffs/YYYY-MM-DD-E11-S5-T6.md
```

Each handoff must include:
- Task ID and status
- Portfolio schema (project + media)
- Media reuse pattern from E6-S1
- Module registration details
- Storefront read model shapes
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

No prompts in this sequence directly depend on E11-S5. The portfolio module is consumed by:
- E9-S1 onboarding wizard (contractor vertical includes portfolio pre-configuration)
- E10-S7 Playwright coverage governance

## Stop Conditions

- STOP if E6-S1 media patterns or E3-S5 module registry are not operational — write a blocked handoff.
- STOP if the work expands into transactional features on portfolio items.
- STOP if a separate media system is needed instead of reusing E6-S1 patterns.
