# Parallel Agent Overnight Runbook

Use this runbook when assigning background or parallel VS Code agent work.

## Goal

Maximize safe overnight throughput without forcing later agents to reconstruct context.

## Read Order For Every Agent

Each agent should read only:
- agents/README.md
- agents/PLAYWRIGHT_AGENT_STANDARD.md when UI behavior may change
- agents/epics/task-plan-index.md
- the assigned task packet
- the latest dependency handoff note named in the packet

If more context is needed, the task is too broad or the upstream handoff is incomplete.

## Assignment Rules

- assign exact task IDs before launching agents; do not ask multiple agents to self-claim from the same Ready queue
- one agent gets one task only
- implementation agents should not edit agents/epics/handoffs/active-task-board.md during execution unless they are the designated coordinator agent
- do not absorb follow-on work from dependent tasks just because the files are open

## Parallelism Rules

Safe overnight parallelism for the current backlog:
- one Platform Control or Backend Domain task on module registry or template contracts
- one Platform Control or API task on platform summary queries
- one Platform Control task on publish-control or routing policy only if it does not touch the same files as another running task
- one Verification or Frontend task only after its backing contract task is complete

Avoid parallel work when tasks share:
- the same schema entities
- the same auth or tenant-resolution boundary
- the same publish or routing state machine
- the same app shell route map in the same time window

## Validation Rules

Before handoff, every agent must run the commands named in the packet.

Minimum expectations:
- backend or contract task: targeted unit, integration, contract, lint, and typecheck commands
- UI-affecting task: relevant package tests plus Playwright coverage per agents/PLAYWRIGHT_AGENT_STANDARD.md
- cross-surface shell or auth task: pnpm test:e2e:smoke unless the packet narrows to one project explicitly

## Handoff Rules

Every handoff must include:
- task ID and status
- exact files or modules changed
- exact commands run
- Playwright projects run and artifact paths when applicable
- remaining risk, blockers, or follow-on tasks

Default coordination rule:
- implementation agents write handoff notes only
- one human or one designated coordinator agent updates the active task board after reviewing the handoff

## Overnight Ready Queue

Start from agents/epics/overnight-priority-queue.md and keep the active board synchronized with it through a single coordinator.

Current guidance:
- keep at most four concurrent tasks overnight
- prefer independent Epic 3 control-plane tasks until new UI stories become ready
- treat Playwright regressions as stop-the-line issues for the affected task

## Suggested Task Prompt Template

Use this shape when assigning a VS Code agent:

Task: <task id and title>
Read: <task packet>, <dependency handoff>, agents/README.md, agents/PLAYWRIGHT_AGENT_STANDARD.md if UI is affected
Do: implement only the scoped objective and required tests
Validate: run the packet command list exactly
Handoff: create the required handoff note, do not update the active board unless explicitly assigned as coordinator, and list any artifact paths