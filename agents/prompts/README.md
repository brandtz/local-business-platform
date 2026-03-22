# Cloud Agent Prompt Pack: Epics 9, 11, 12, and Operations

## Overview

This directory contains sequenced prompts for cloud agent execution covering Epics 9 (Onboarding/Import), 11 (Value-Add Features), 12 (Subscription & Billing), E8-S5 full implementation, and E10-S1 (Telemetry). 20 active prompts (19–38), each one self-contained for one agent session targeting one story.

Previous prompts (03–18) covering Epics 6, 7, and 8 have been archived to `archive/` after successful completion.

## Current Project Status

As of 2026-03-22:
- **Epics 1–5**: Fully completed
- **Epic 6**: Fully completed (S1–S6 all done, E6-S6 on local branch pending merge)
- **Epic 7**: Fully completed (S1–S6 all merged via PRs)
- **Epic 8**: S1–S4, S6 completed. S5 design-only (full implementation in prompt 37). E8-S6 on remote branch pending merge.
- **Epics 9, 11, 12**: Not yet started — these prompts cover this work
- **Epic 10**: S1 covered by prompt 38. S2–S7 remain for a future prompt pack.

## Dependency Sequence

Prompts are numbered 19–38 in dependency order. The sequence reflects when each story CAN start based on prerequisite completion.

### Phase 1: Critical Path Foundations (ready now)

| Prompt | Story | Title | Can Parallel With |
|--------|-------|-------|-------------------|
| 19 | E12-S1 | Subscription Package and Tier Model | 20 |
| 20 | E9-S2 | Import Artifact Intake | 19 |

### Phase 2: E11 Quick Wins (ready now)

| Prompt | Story | Title | Can Parallel With |
|--------|-------|-------|-------------------|
| 21 | E11-S5 | Portfolio and Showcase Module | 22 |
| 22 | E11-S3 | Search and Filter Infrastructure | 21 |

### Phase 3: E11 Analytics and Loyalty (ready now)

| Prompt | Story | Title | Can Parallel With |
|--------|-------|-------|-------------------|
| 23 | E11-S1 | Business Analytics and Reporting | 24 |
| 24 | E11-S2 | Customer Loyalty and Rewards | 23 |

### Phase 4: E11 Commerce + E12 Gating (after E12-S1)

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 25 | E11-S4 | Quote and Estimate Management | E7, E8-S4 | 26 |
| 26 | E12-S2 | Feature Gating by Subscription | 19 (E12-S1) | 25 |

### Phase 5: E11 Subscriptions + E12 Billing (after E12-S1)

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 27 | E11-S6 | Customer Subscription and Recurring | E7, E8-S2 | 28 |
| 28 | E12-S3 | Platform Billing Integration | 19 (E12-S1) | 27 |

### Phase 6: E9 Onboarding + OCR Pipeline (after E12-S1, E9-S2)

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 29 | E9-S1 | Guided Onboarding Workflow | 19 (E12-S1) | 30 |
| 30 | E9-S3 | OCR Extraction and Domain Mapping | 20 (E9-S2) | 29 |

### Phase 7: E12 Lifecycle + E9 Review (after E12-S3, E9-S3)

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 31 | E12-S4 | Subscription Lifecycle Management | 28 (E12-S3) | 32 |
| 32 | E9-S4 | Review Workspace and Approval | 30 (E9-S3) | 31 |

### Phase 8: E12 Admin Views + E9 Preview (after E12-S4, E9-S4)

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 33 | E12-S5 | Platform Admin Revenue Views | 31 (E12-S4) | 34 |
| 34 | E9-S5 | Template Application and Preview | 32 (E9-S4) | 33 |

### Phase 9: E12 Self-Service + E9 Publish (after E12-S4, E9-S5)

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 35 | E12-S6 | Tenant Admin Billing Self-Service | 31 (E12-S4) | 36 |
| 36 | E9-S6 | Versioned Publish and Rollback | 34 (E9-S5) | 35 |

### Phase 10: Post-E9 Integration + Observability

| Prompt | Story | Title | Depends On | Can Parallel With |
|--------|-------|-------|------------|-------------------|
| 37 | E8-S5 | Domain Activation Full Implementation | 36 (E9-S6) | 38 |
| 38 | E10-S1 | Structured Logging and Telemetry | 35, 36 | 37 |

## Maximum Safe Parallelism

At most 2 agents can run simultaneously. Use these parallel groups in sequence:

1. **Group A** (Phase 1): Prompts 19 + 20
2. **Group B** (Phase 2): Prompts 21 + 22
3. **Group C** (Phase 3): Prompts 23 + 24
4. **Group D** (Phase 4): Prompts 25 + 26
5. **Group E** (Phase 5): Prompts 27 + 28
6. **Group F** (Phase 6): Prompts 29 + 30
7. **Group G** (Phase 7): Prompts 31 + 32
8. **Group H** (Phase 8): Prompts 33 + 34
9. **Group I** (Phase 9): Prompts 35 + 36
10. **Group J** (Phase 10): Prompts 37 + 38

## Remaining Beyond This Pack

The following stories are NOT covered by prompts 19–38 and will need a future prompt pack:
- E10-S2: Audit Trail Search
- E10-S3: Rate Limiting and Throttling
- E10-S4: Backup and Recovery
- E10-S5: Security Review and Hardening
- E10-S6: Performance Validation
- E10-S7: Playwright Coverage Governance

## Archived Prompts

Completed prompts from the previous pack (Epics 6–8) are in `archive/`:
- Prompts 03–18 covering E6-S4 through E8-S5 (design-only)
- Prompts 01, 02, 04 were removed earlier after completion

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
