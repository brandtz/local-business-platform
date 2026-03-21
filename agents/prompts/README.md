# Cloud Agent Prompt Pack: Epics 6, 7, and 8

## Overview

This directory contains sequenced prompts for cloud agent execution covering Epics 6, 7, and 8. Each file is one self-contained prompt for one agent session targeting one story. Originally 18 prompts; 3 have been removed after completion (01, 02, 04). 15 prompts remain.

## Current Project Status

As of 2026-03-21:
- **Epics 1–3**: Fully completed (72 tasks)
- **Epic 4**: Fully completed (S1–S6 all done)
- **Epic 5**: Not yet started
- **Epic 6**: Partially completed — S1 (Catalog), S2 (Services), S3 (Staff) are done; S4–S6 remain
- **Epics 7–8**: Not yet started — these prompts cover this work

**Completed prompts removed**: Prompts 01 (E6-S1), 02 (E6-S2), and 04 (E6-S3) have been removed because that work is complete. See handoff `agents/epics/handoffs/2026-03-20-E6-S1-S3.md` for details.

**IMPORTANT**: Epic 5 must be completed before most remaining Epic 6 work can begin. The dependency chain is strict.

## Dependency Sequence

Prompts are numbered 01–18 in dependency order. The sequence reflects when each story CAN start based on prerequisite completion.

### ~~Phase 1: Epic 6 Foundation~~ — COMPLETED

Prompts 01 (E6-S1), 02 (E6-S2) removed — work completed 2026-03-20.

### Phase 1: Epic 6 Remaining Foundation (after E5 completes)

| Prompt | Story | Title | Depends On |
|--------|-------|-------|------------|
| 03 | E6-S4 | Content and SEO Domain Model | E5-S2 |

### ~~Phase 2: Epic 6 Intermediate~~ — COMPLETED

Prompt 04 (E6-S3) removed — work completed 2026-03-20.

### Phase 2: Epic 6 Consolidation

| Prompt | Story | Title | Depends On |
|--------|-------|-------|------------|
| 05 | E6-S5 | Vertical Template Defaults | 03 (E6-S4) — E6-S1, S2 already done |
| 06 | E6-S6 | Domain Contract Stabilization | 03 (E6-S4) — E6-S1, S2, S3 already done |

### Phase 4: Epic 7 Foundation (parallel-safe after E6 completes)

| Prompt | Story | Title | Can Parallel With |
|--------|-------|-------|-------------------|
| 07 | E7-S1 | Cart and Pricing Engine | 08 |
| 08 | E7-S3 | Availability and Slot Computation | 07 |

### Phase 5: Epic 7 Intermediate

| Prompt | Story | Title | Depends On |
|--------|-------|-------|------------|
| 09 | E7-S2 | Order Lifecycle and Fulfillment | 07 (E7-S1) |
| 10 | E7-S4 | Booking Lifecycle Management | 08 (E7-S3) |

### Phase 6: Epic 7 Integration

| Prompt | Story | Title | Depends On |
|--------|-------|-------|------------|
| 11 | E7-S5 | Customer Identity and Account History | 09, 10 (E7-S2, S4) |
| 12 | E7-S6 | Hybrid Tenant Operating Modes | 09, 10 (E7-S2, S4) |

### Phase 7: Epic 8 Foundation (parallel-safe after E7 completes)

| Prompt | Story | Title | Can Parallel With |
|--------|-------|-------|-------------------|
| 13 | E8-S1 | Payment Connection Management | 14 |
| 14 | E8-S4 | Notification Delivery Framework | 13 |

### Phase 8: Epic 8 Intermediate

| Prompt | Story | Title | Depends On |
|--------|-------|-------|------------|
| 15 | E8-S2 | Payment Intent, Capture, and Refund | 13 (E8-S1) |

### Phase 9: Epic 8 Deep Integration

| Prompt | Story | Title | Depends On |
|--------|-------|-------|------------|
| 16 | E8-S3 | Webhook Ingestion and Replay | 15 (E8-S2) |

### Phase 10: Epic 8 Operational and Final

| Prompt | Story | Title | Depends On |
|--------|-------|-------|------------|
| 17 | E8-S6 | Integration Failure Handling | 14, 16 (E8-S4, S3) |
| 18 | E8-S5 | Domain Activation with Publish State | **BLOCKED by Epic 9** |

## Maximum Safe Parallelism

At most 2 agents can run simultaneously in the remaining work. Use these parallel groups:

1. **Group A** (Phase 2): Prompts 05 + 06 (after prompt 03 completes)
2. **Group B** (Phase 4): Prompts 07 + 08
3. **Group C** (Phase 6): Prompts 11 + 12
4. **Group D** (Phase 7): Prompts 13 + 14

All other prompts are sequential dependencies.

## How to Use

1. Complete all of Epic 5 first.
2. Run prompt 03 (E6-S4 Content and SEO). E6-S1, S2, and S3 are already done.
3. After prompt 03 completes, run Phase 2 (prompts 05 + 06 in parallel).
4. After Phase 2 completes, run Phase 4 (prompts 07 + 08 in parallel).
5. Continue following the dependency chain through Phase 10.
6. Prompt 18 is blocked by Epic 9 — defer or run in design-only mode.

## Agent Assignment Rules

- Assign exact prompt numbers before launching agents.
- One agent per prompt — do not share prompts across agents.
- Each prompt's Required Reading section is the agent's complete context.
- Agents write handoff notes but do NOT update the active task board unless designated as coordinator.
- Follow `agents/cloud-agent-overnight-runbook.md` for all operational rules.

## Total Work Summary

| Epic | Stories | Remaining Prompts | Status |
|------|---------|-------------------|--------|
| 6 | 6 | 03, 05, 06 | S1–S3 complete, S4–S6 remaining |
| 7 | 6 | 07–12 | Not started |
| 8 | 6 | 13–18 | Not started |
| **Total** | **18** | **15** | **3 prompts removed (completed)** |
