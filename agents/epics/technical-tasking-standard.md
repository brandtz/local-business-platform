# Technical Tasking Standard

This file defines how stories are decomposed into technical tasks for agent execution.

## Task Unit Rules

Each technical task should:
- fit in a single focused implementation session
- touch one primary concern whenever possible: schema, backend service, frontend UI, integration adapter, or operations
- have a clear artifact output, not just activity language
- declare upstream dependencies explicitly
- expose completion evidence that a following agent can trust

## Task Structure

Each task breakdown should include:
- task ID: stable reference in the form E#-S#-T#
- objective: the implementation result of the task
- primary surfaces: files, packages, modules, or runtime areas expected to change
- dependency inputs: prior tasks, contracts, or docs required before starting
- validation commands: the exact command set expected before handoff
- Playwright impact: required, deferred to downstream UI task, or none
- completion evidence: what the next agent can inspect to confirm the task is done

## Playwright Impact Rules

Use these rules for every task packet and task-plan update:
- UI-affecting work in web-customer, web-admin, or web-platform-admin defaults to Playwright required
- contract-only or backend-only tasks may set Playwright impact to none
- partial UI foundation tasks may defer Playwright only when the behavior is not yet shippable on its own and the downstream task is named explicitly
- when Playwright is required, the packet should name the expected project or smoke lane

## Preferred Task Categories

Use these categories to keep decomposition consistent:
- schema and migrations
- backend module and service logic
- API contract and validation
- frontend shell and UI flows
- background job or worker logic
- integration adapter logic
- observability and security controls
- documentation and decision records

## Agent-Safe Task Boundaries

To reduce context loss:
- avoid combining schema changes, API behavior, and multiple UI surfaces in one task unless the story is tiny
- complete read models and write models in separate tasks when both are non-trivial
- separate provider-specific integration work from core domain logic
- separate enforcement from observability for sensitive workflows when both are substantial

## Definition of Ready for a Task

A task is ready only when:
- its dependencies are already completed or explicitly stubbed
- its affected domain contracts are named
- its test requirements are known
- its handoff payload requirements are defined

## Definition of Done for a Task

A task is done only when:
- the scoped implementation artifact exists and is wired correctly
- required tests for that task are present or updated
- required Playwright coverage is present or the handoff explicitly records why Playwright impact is none
- assumptions and unresolved follow-up work are recorded
- the exact validation commands and artifact paths are recorded in the handoff
- the next dependent task can start without rereading the whole epic
