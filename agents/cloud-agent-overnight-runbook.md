# Cloud Agent Overnight Runbook

Use this runbook when assigning background or parallel GitHub cloud-agent work.

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

## Claim Rules

- claim only tasks listed in agents/epics/handoffs/active-task-board.md under Ready
- one agent claims one task only
- move the task to In Progress before changing code
- do not absorb follow-on work from dependent tasks just because the files are open

## Parallelism Rules

Safe overnight parallelism for the current backlog:
- one Platform Control or Backend Domain task on preview routing or domains
- one Platform Control or Backend Domain task on module registry or template contracts
- one Platform Control or API task on platform summary queries
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

## Overnight Ready Queue

Start from agents/epics/overnight-priority-queue.md and keep the active board synchronized with it.

Current guidance:
- keep at most four concurrent tasks overnight
- prefer independent Epic 3 control-plane tasks until new UI stories become ready
- treat Playwright regressions as stop-the-line issues for the affected task

## Suggested Task Prompt Template

Use this shape when assigning a cloud agent:

Task: <task id and title>
Read: <task packet>, <dependency handoff>, agents/README.md, agents/PLAYWRIGHT_AGENT_STANDARD.md if UI is affected
Do: implement only the scoped objective and required tests
Validate: run the packet command list exactly
Handoff: create the required handoff note, update the active board, and list any artifact paths