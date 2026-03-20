# Prompt 06: E6-S6 Domain Contract Stabilization

## Sequence Position

- Prompt: 06 of 18
- Epic: 6
- Story: E6-S6
- Tasks: E6-S6-T1, E6-S6-T2, E6-S6-T3, E6-S6-T4
- Phase: Epic 6 Consolidation (must wait for prompts 01, 02, 03, and 04 to complete)

## Prerequisites

- E6-S1 (catalog) must be completed — prompt 01.
- E6-S2 (services) must be completed — prompt 02.
- E6-S3 (staff) must be completed — prompt 04.
- E6-S4 (content) must be completed — prompt 03.
- Verify all four on the active task board. Read all E6 handoff notes.

## Context for the Agent

You are performing domain contract stabilization — the final consolidation story of Epic 6. All four domain modules (catalog, services, staff, content) have been implemented. Your job is to consolidate their contracts, define stable shared package types, document domain events or change-notification hooks, and establish versioning rules for future non-breaking extension.

This is a contract-quality and documentation story. The output enables frontend and backend teams across Epics 7 and 8 to target a clear, stable contract surface for these entities.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-06.md
agents/epics/epic-06-tasks.md (section E6-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-06/E6-S6-T1.md
agents/epics/packets/epic-06/E6-S6-T2.md
agents/epics/packets/epic-06/E6-S6-T3.md
agents/epics/packets/epic-06/E6-S6-T4.md
```

Read ALL E6 handoff notes:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S1-*.md (catalog contracts)
agents/epics/handoffs/YYYY-MM-DD-E6-S2-*.md (service contracts)
agents/epics/handoffs/YYYY-MM-DD-E6-S3-*.md (staff contracts)
agents/epics/handoffs/YYYY-MM-DD-E6-S4-*.md (content contracts)
```

Inspect these code surfaces:

```
platform/packages/types/src/ (all domain types from E6)
platform/apps/api/prisma/schema.prisma (full schema including E6 additions)
platform/apps/api/src/ (all domain services from E6)
platform/contracts/ (existing contract files)
```

## Implementation Scope

### E6-S6-T1: Contract Consolidation
- Consolidate schema, API, and frontend-facing contracts for catalog, services, staff, and content.
- Verify consistency across Prisma schema, TypeScript types, and API payloads.
- Fix any misalignments found.

### E6-S6-T2: Stable Shared Package Types
- Define stable shared package types for the core business domains.
- These types must be importable by downstream packages (web-customer, web-admin, sdk).
- Ensure types are re-exported cleanly from `@platform/types`.

### E6-S6-T3: Domain Event Hooks
- Document domain event or change-notification hooks used by downstream stories.
- Identify which domain changes should emit events (e.g., catalog item published, service created, booking config changed).
- Define event schemas if domain events are implemented.

### E6-S6-T4: Contract Versioning Rules
- Identify contract versioning rules for future non-breaking extension.
- Document which fields are required vs. optional, how additions should be handled, and what constitutes a breaking change.

## Constraints

- This is primarily a consolidation and documentation story — minimize new feature code.
- Do NOT add new domain entities — only stabilize what was built in E6-S1 through E6-S4.
- Shared types must align with implemented API payloads and persistence schema.
- Do NOT implement event bus infrastructure — document event contracts only.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm typecheck:contracts
pnpm --filter @platform/api typecheck
pnpm --filter web-customer typecheck
pnpm --filter web-admin typecheck
pnpm --filter @platform/api test
```

Playwright impact: none.

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E6-S6-T1.md
agents/epics/handoffs/YYYY-MM-DD-E6-S6-T2.md
agents/epics/handoffs/YYYY-MM-DD-E6-S6-T3.md
agents/epics/handoffs/YYYY-MM-DD-E6-S6-T4.md
```

Each handoff must include:
- Task ID and status
- Shared domain contract package contents and export map
- Event names or hooks documented
- Versioning rules established
- Any misalignments found and fixed

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 07** (E7-S1): Cart pricing engine imports catalog contracts
- **Prompt 08** (E7-S3): Availability computation imports service and staff contracts
- **Prompt 09** (E7-S2): Order lifecycle imports domain contracts
- **All Epic 7 and 8 prompts** rely on the contract surface stabilized here

## Stop Conditions

- STOP if any E6-S1 through E6-S4 handoffs are missing — write a blocked handoff.
- STOP if misalignments are found that require re-implementing domain services (escalate to the relevant prompt owner).
- STOP if the work expands into new domain entity design.
