# Cloud Agent Prompt Pack: Epics 6, 7, and 8

## Overview

This directory contains 18 sequenced prompts for cloud agent execution covering Epics 6, 7, and 8. Each file is one self-contained prompt for one agent session targeting one story (typically 4 tasks).

## Current Project Status

As of the generation date for these prompts:
- **Epics 1–3**: Fully completed (72 tasks)
- **Epic 4**: Partially completed (S1 and S6 done, S2–S5 remaining)
- **Epic 5**: Not yet started
- **Epics 6–8**: Not yet started — these prompts cover this work

**IMPORTANT**: Epics 4 and 5 must be completed before most Epic 6 work can begin. The dependency chain is strict.

## Dependency Sequence

Prompts are numbered 01–18 in dependency order. The sequence reflects when each story CAN start based on prerequisite completion.

### Phase 1: Epic 6 Foundation (parallel-safe after E5 completes)

| Prompt | Story | Title | Can Parallel With |
|--------|-------|-------|-------------------|
| 01 | E6-S1 | Catalog Domain Model | 02, 03 |
| 02 | E6-S2 | Service and Booking Domain Model | 01, 03 |
| 03 | E6-S4 | Content and SEO Domain Model | 01, 02 |

### Phase 2: Epic 6 Intermediate

| Prompt | Story | Title | Depends On |
|--------|-------|-------|------------|
| 04 | E6-S3 | Staff and Assignment Domain Model | 02 (E6-S2) |

### Phase 3: Epic 6 Consolidation

| Prompt | Story | Title | Depends On |
|--------|-------|-------|------------|
| 05 | E6-S5 | Vertical Template Defaults | 01, 02, 03 (E6-S1, S2, S4) |
| 06 | E6-S6 | Domain Contract Stabilization | 01, 02, 03, 04 (E6-S1, S2, S3, S4) |

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

At most 3 agents can run simultaneously. Use these parallel groups:

1. **Group A** (Phase 1): Prompts 01 + 02 + 03
2. **Group B** (Phase 4): Prompts 07 + 08
3. **Group C** (Phase 6): Prompts 11 + 12
4. **Group D** (Phase 7): Prompts 13 + 14

All other prompts are sequential dependencies.

## How to Use

1. Complete E4-S2 through E4-S5 and all of Epic 5 first.
2. Start with Phase 1 (prompts 01, 02, 03 in parallel).
3. After Phase 1 completes, run Phase 2 (prompt 04) then Phase 3 (prompts 05, 06).
4. After Phase 3 completes, run Phase 4 (prompts 07, 08 in parallel).
5. Continue following the dependency chain through Phase 10.
6. Prompt 18 is blocked by Epic 9 — defer or run in design-only mode.

## Agent Assignment Rules

- Assign exact prompt numbers before launching agents.
- One agent per prompt — do not share prompts across agents.
- Each prompt's Required Reading section is the agent's complete context.
- Agents write handoff notes but do NOT update the active task board unless designated as coordinator.
- Follow `agents/cloud-agent-overnight-runbook.md` for all operational rules.

## Total Work Summary

| Epic | Stories | Tasks | Prompts |
|------|---------|-------|---------|
| 6 | 6 | 24 | 01–06 |
| 7 | 6 | 24 | 07–12 |
| 8 | 6 | 24 | 13–18 |
| **Total** | **18** | **72** | **18** |
