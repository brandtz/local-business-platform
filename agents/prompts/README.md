# Cloud Agent Prompt Pack: E13 UI Catch-Up, Epics 9, 11, 12, and Operations

## Overview

This directory contains sequenced prompts for cloud agent execution. **20 active prompts (27–46)** covering:

- **Epic 13** (prompts 27–34): Frontend Implementation and Component Library — builds all three portal UIs using the backend completed in Epics 1–12
- **Remaining backend stories with UI** (prompts 35–46): E11-S6, E12-S3/S4/S5/S6, E9-S1/S3/S4/S5/S6, E8-S5, E10-S1 — each prompt now includes **explicit frontend implementation** alongside backend work

Previous cycle prompts (19–26) covered backend-only work and are retained for reference. Prompt 26 (E12-S2) may still be in-flight. Prompts 03–18 are archived in `archive/`.

> **KEY CHANGE:** Starting with prompt 27, every prompt requires frontend UI implementation. No more backend-only deliveries.

## Current Project Status

As of 2026-03-22:
- **Epics 1–5**: Fully completed (backend only)
- **Epic 6**: Fully completed (backend only — S1–S6 all done)
- **Epic 7**: Fully completed (backend only — S1–S6 all merged)
- **Epic 8**: S1–S4, S6 completed (backend only). S5 full implementation in prompt 45.
- **Epic 9**: S2 completed. S1, S3–S6 covered by prompts 37–44.
- **Epic 11**: S1–S5 completed. S6 covered by prompt 35.
- **Epic 12**: S1 completed. S2 in-flight (prompt 26). S3–S6 covered by prompts 36–43.
- **Epic 13 (NEW)**: Frontend UI catch-up — prompts 27–34 build the visual frontend for all three portals
- **Frontend status**: Zero `.vue` SFC files exist. All three portals are shell-only with `h()` placeholders. `@platform/ui` has tokens only. `@platform/sdk` has config types only.

## Dependency Sequence

Prompts 27–46 in dependency order. E13 UI foundation (27–34) comes first, then remaining backend+UI work (35–46).

### Phase UI-1: Component Library (MUST complete first)

| Prompt | Story | Title | Notes |
|--------|-------|-------|-------|
| 27 | E13-S1 | Shared Component Library + SDK API Client | Foundation for ALL subsequent UI work |

### Phase UI-2: Portal Frontends (after prompt 27)

| Prompt | Story | Title | Can Parallel With |
|--------|-------|-------|-------------------|
| 28 | E13-S2 | Customer Portal — Storefront & Browse | 31 |
| 29 | E13-S3 | Customer Portal — Commerce Flow | 32 (after 28) |
| 30 | E13-S4 | Customer Portal — Account Area | 33 (after 29) |
| 31 | E13-S5 | Business Admin — Shell, Dashboard, Settings | 28 |
| 32 | E13-S6 | Business Admin — Catalog & Content | 29 (after 31) |
| 33 | E13-S7 | Business Admin — Orders, Bookings, Customers | 30 (after 31) |
| 34 | E13-S8 | Platform Admin Portal | 28, 31 |

### Phase 5: Backend+UI — Subscriptions & Billing (after E13 foundation)

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 35 | E11-S6 | Customer Subscription & Recurring (with UI) | 27, 30, 31 | 36 |
| 36 | E12-S3 | Platform Billing Integration (with UI) | 27, 34 | 35 |

### Phase 6: Backend+UI — Onboarding & OCR (after foundation)

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 37 | E9-S1 | Guided Onboarding Workflow (with UI) | 27, 34 | 38 |
| 38 | E9-S3 | OCR Extraction & Domain Mapping (with UI) | 27, 31 | 37 |

### Phase 7: Backend+UI — Lifecycle & Review

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 39 | E12-S4 | Subscription Lifecycle Management (with UI) | 36 | 40 |
| 40 | E9-S4 | Review Workspace & Approval (with UI) | 38 | 39 |

### Phase 8: Backend+UI — Revenue & Preview

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 41 | E12-S5 | Platform Admin Revenue Views (with UI) | 39 | 42 |
| 42 | E9-S5 | Template Application & Preview (with UI) | 40 | 41 |

### Phase 9: Backend+UI — Billing Self-Service & Publish

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 43 | E12-S6 | Tenant Billing Self-Service (with UI) | 39 | 44 |
| 44 | E9-S6 | Versioned Publish & Rollback (with UI) | 42 | 43 |

### Phase 10: Backend+UI — Domain Activation & Telemetry

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 45 | E8-S5 | Domain Activation Full (with UI) | 44 | 46 |
| 46 | E10-S1 | Structured Logging & Telemetry (with UI) | 34 | 45 |

## Maximum Safe Parallelism

At most 2 agents can run simultaneously. Use these parallel groups in sequence:

1. **Group A** (UI Foundation): Prompt 27 alone (CRITICAL — blocks everything)
2. **Group B** (Customer + Admin shells): Prompts 28 + 31
3. **Group C** (Commerce + Catalog): Prompts 29 + 32
4. **Group D** (Account + Orders): Prompts 30 + 33
5. **Group E** (Platform Admin): Prompt 34 (or parallel with 30)
6. **Group F**: Prompts 35 + 36
7. **Group G**: Prompts 37 + 38
8. **Group H**: Prompts 39 + 40
9. **Group I**: Prompts 41 + 42
10. **Group J**: Prompts 43 + 44
11. **Group K**: Prompts 45 + 46

## Previous Cycle Prompts (19–26)

These backend-only prompts from the previous cycle are retained for reference:

| Prompt | Story | Status |
|--------|-------|--------|
| 19 | E12-S1 | Completed |
| 20 | E9-S2 | Completed |
| 21 | E11-S5 | Completed |
| 22 | E11-S3 | Completed |
| 23 | E11-S1 | Completed |
| 24 | E11-S2 | Completed |
| 25 | E11-S4 | In-flight |
| 26 | E12-S2 | In-flight |

## Remaining Beyond This Pack

The following stories are NOT covered by prompts 27–46 and will need a future prompt pack:
- E10-S2: Audit Trail Search
- E10-S3: Rate Limiting and Throttling
- E10-S4: Backup and Recovery
- E10-S5: Security Review and Hardening
- E10-S6: Performance Validation
- E10-S7: Playwright Coverage Governance

## Archived Prompts

Completed prompts from earlier packs (Epics 6–8) are in `archive/`.

## How to Use

1. **Start with prompt 27** — this builds the shared component library and SDK client that ALL subsequent prompts depend on.
2. After 27 completes, run Groups B–E to build out all three portal frontends (prompts 28–34).
3. After portal frontends exist, run Groups F–K for remaining backend+UI work (prompts 35–46).
4. Follow `agents/cloud-agent-overnight-runbook.md` for all operational rules.

## Agent Assignment Rules

- Assign exact prompt numbers before launching agents.
- One agent per prompt — do not share prompts across agents.
- Each prompt's Required Reading section is the agent's complete context.
- **Every prompt 27+ MUST deliver frontend UI** — backend-only completion is not acceptable.
- Agents write handoff notes but do NOT update the active task board unless designated as coordinator.
- Follow `agents/cloud-agent-overnight-runbook.md` for all operational rules.
