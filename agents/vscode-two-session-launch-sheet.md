# VS Code Two-Session Launch Sheet

Use this when running two VS Code agent sessions in parallel.

## Goal

Validate that fixed-task VS Code agents can increase throughput without repeating the merge-conflict problems from the first cloud-worker batch.

## Coordination Rules

- assign exact task IDs before launching either session
- do not ask either session to self-claim from the active board
- implementation sessions should not edit `agents/epics/handoffs/active-task-board.md`
- implementation sessions should create code changes and a handoff note only
- one human operator updates the active board after reviewing both handoffs
- if either session discovers overlap with the other task, stop and leave a blocked handoff instead of improvising a wider slice

## Recommended Pair

Run these two tasks first:

1. Session 1: `E3-S4-T1`
2. Session 2: `E3-S6-T1`

Why this pair:

- `E3-S4-T1` is centered on domain-state modeling and schema or shared contract work
- `E3-S6-T1` is centered on platform operational summaries and query contracts
- they are less likely to collide than pairing `E3-S5-T1` with `E3-S6-T1`, which both lean on platform control and shared tenant summary contracts

## Session 1 Prompt

```text
Task: Execute assigned Epic 3 task E3-S4-T1 only.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/epics/task-plan-index.md
- agents/epics/packets/epic-03/E3-S4-T1.md
- agents/workflows/create-business.md
- agents/PLAYWRIGHT_AGENT_STANDARD.md only if you discover unexpected browser-visible impact

Do:
- Implement only E3-S4-T1: model custom domain records, verification state, and promotion state.
- Keep the work tenant-bound and contract-first.
- Do not implement live DNS verification or promotion workflow behavior.
- Do not edit agents/epics/handoffs/active-task-board.md.

Validate:
- pnpm --filter @platform/api test
- pnpm --filter @platform/api typecheck
- pnpm typecheck:contracts

Handoff:
- Create agents/epics/handoffs/2026-03-17-E3-S4-T1.md using the handoff template.
- Record exact files changed, exact commands run, contract decisions, and any blockers.
- Do not update the active task board.

Stop conditions:
- Stop if the task expands into DNS verification, activation workflow, or tenant-routing implementation.
- Stop if you need to change the same platform summary or module-registry surfaces being touched by another session.
```

## Session 2 Prompt

```text
Task: Execute assigned Epic 3 task E3-S6-T1 only.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/epics/task-plan-index.md
- agents/epics/packets/epic-03/E3-S6-T1.md
- agents/epics/handoffs/2026-03-16-E3-S1-T4.md
- agents/epics/handoffs/2026-03-16-E3-S2-T4.md
- agents/PLAYWRIGHT_AGENT_STANDARD.md only if you discover unexpected browser-visible impact

Do:
- Implement only E3-S6-T1: define cross-tenant operational summary queries for lifecycle, publish, and health status.
- Keep this platform-admin-only and fail closed for tenant-admin access.
- Do not build UI screens.
- Do not edit agents/epics/handoffs/active-task-board.md.

Validate:
- pnpm --filter @platform/api test
- pnpm --filter @platform/api typecheck
- pnpm typecheck:contracts

Handoff:
- Create agents/epics/handoffs/2026-03-17-E3-S6-T1.md using the handoff template.
- Record exact files changed, exact commands run, summary-field decisions, and any blockers.
- Do not update the active task board.

Stop conditions:
- Stop if the task expands into platform-admin screen implementation.
- Stop if the work begins changing the domain-state model owned by Session 1.
```

## Hold For Later

Keep `E3-S5-T1` for a later single-session pass or a third session only after the first two handoffs are reviewed.

Reason:

- it is likely to touch shared provisioning and contract surfaces that may overlap with either downstream routing or platform summary work
- it is a better follow-up once the first two sessions prove the fixed-assignment workflow is behaving

## Review Checklist

After both sessions finish:

1. review both handoff notes before changing the board
2. merge the lower-risk, narrower contract change first
3. rerun the touched validation commands locally if either session modified shared contracts
4. only then update `agents/epics/handoffs/active-task-board.md`