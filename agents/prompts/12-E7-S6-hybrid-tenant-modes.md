# Prompt 12: E7-S6 Hybrid Tenant Operating Modes

## Sequence Position

- Prompt: 12 of 15 (remaining)
- Epic: 7
- Story: E7-S6
- Tasks: E7-S6-T1, E7-S6-T2, E7-S6-T3, E7-S6-T4
- Phase: Epic 7 Integration (can run in parallel with prompt 11; must wait for prompts 09 and 10)

## Prerequisites

- E7-S2 (order lifecycle) must be completed — prompt 09.
- E7-S4 (booking lifecycle) must be completed — prompt 10.
- Read handoff notes from prompts 09 and 10 for order and booking state machines.
- Read E3 module registry handoffs for module toggling infrastructure.

## Context for the Agent

You are implementing hybrid tenant operating modes. Tenants can run ordering-only, booking-only, or combined (hybrid) experiences. Module toggles from Epic 3 determine which transaction flows and navigation surfaces appear. Disabled flows must be blocked at both API and frontend layers.

This is the final integration story of Epic 7. It ties together the order and booking lifecycles with the module registry from Epic 3 to create a coherent operating mode experience. Admin behavior must adjust based on which modules are active.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-07.md
agents/epics/epic-07-tasks.md (section E7-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-07/E7-S6-T1.md
agents/epics/packets/epic-07/E7-S6-T2.md
agents/epics/packets/epic-07/E7-S6-T3.md
agents/epics/packets/epic-07/E7-S6-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S2-*.md (order lifecycle)
agents/epics/handoffs/YYYY-MM-DD-E7-S4-*.md (booking lifecycle)
agents/epics/handoffs/ (E3-S5 module registry handoffs)
```

Inspect these code surfaces:

```
platform/apps/api/src/ (order and booking services, module registry)
platform/apps/web-customer/src/ (storefront navigation and routing)
platform/apps/web-admin/src/ (admin navigation and routing)
platform/packages/types/src/ (module types from E3)
```

## Implementation Scope

### E7-S6-T1: Operating Mode Rules
- Define module-driven operating-mode rules for ordering-only, booking-only, and hybrid tenants.
- Map module combinations to allowed transaction flows.

### E7-S6-T2: Backend Enforcement
- Implement backend enforcement so disabled flows cannot be invoked accidentally.
- If ordering module is off, cart and order APIs must return appropriate errors.
- If booking module is off, booking APIs must return appropriate errors.

### E7-S6-T3: Frontend Route and Navigation Gating
- Implement frontend route and navigation gating for operating modes.
- Hidden navigation items for disabled modules. Route guards prevent direct URL access.

### E7-S6-T4: Documentation
- Document shared and mode-specific operational behaviors for tenant admins.
- Document which admin screens and actions are available per mode.

## Constraints

- Operating-mode rules must be enforced at BOTH API and frontend layers.
- Module registry from Epic 3 is the source of truth for enabled/disabled modules.
- Do NOT introduce new module types — consume the existing registry.
- Do NOT modify order or booking state machines — gate access to them based on module config.
- Disabled transaction flows must fail cleanly with descriptive errors, not silently.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
pnpm --filter web-customer typecheck
pnpm --filter web-customer test
pnpm --filter web-admin typecheck
pnpm --filter web-admin test
```

If navigation or route gating is browser-visible:

```bash
npx playwright test --project=web-customer-smoke
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E7-S6-T1.md
agents/epics/handoffs/YYYY-MM-DD-E7-S6-T2.md
agents/epics/handoffs/YYYY-MM-DD-E7-S6-T3.md
agents/epics/handoffs/YYYY-MM-DD-E7-S6-T4.md
```

Each handoff must include:
- Task ID and status
- Operating-mode rules documented per module combination
- Gating locations in API and frontend documented
- Shared versus mode-specific admin behavior documented

Update the active task board accordingly.

## Downstream Consumers

No prompts in this sequence directly depend on E7-S6. However, Epic 8 payment and notification flows inherit the operating mode context — a booking-only tenant should not receive order-related notifications.

## Stop Conditions

- STOP if E7-S2 or E7-S4 handoffs are not available — write a blocked handoff.
- STOP if module registry from E3 is not available or has changed incompatibly.
- STOP if the work requires modifying order or booking state machines.
- STOP if the work reduces required UI coverage instead of gating it cleanly.
