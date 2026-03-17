
# Agent Engineering Rules

Use this directory as the control plane for agent execution.

## Core Stack

- language: TypeScript
- backend: NestJS
- frontend: Vue 3
- database: PostgreSQL + Prisma
- queues: BullMQ + Redis

## Mandatory Constraints

- all tenant-scoped entities must include a tenant identifier
- tenant isolation must be enforced in controllers, services, jobs, cache keys, and storage paths
- platform-admin capabilities must be separated from tenant-admin capabilities
- privileged actions must emit audit events
- no external integration may be called directly from domain logic without an adapter boundary

## Engineering Standards

- strict null checks enabled
- no unbounded use of any
- all schema changes require Prisma migration updates and document updates
- every feature requires unit, integration, and contract coverage where applicable
- money movement, publish flows, and impersonation paths require explicit tests

## Repository Shape

Implementation work should target the platform/ monorepo structure described in the blueprint and scaffolded in this repository.

Agents must preserve modular boundaries and avoid introducing tenant-specific forks in application code.

## Operating Entry Points

- start with cloud-agent-overnight-runbook.md when assigning unattended or parallel work
- treat PLAYWRIGHT_AGENT_STANDARD.md as the canonical browser-test contract for all UI-affecting work
- use epics/task-plan-index.md as the routing document for standards, task plans, packets, handoffs, and the active board
- use epics/overnight-priority-queue.md to seed the overnight ready queue before widening scope

## Mandatory Delivery Rules

- claim one task at a time and update epics/handoffs/active-task-board.md before making code changes
- any change that affects web-customer, web-admin, or web-platform-admin behavior must add or update Playwright coverage before handoff unless the packet explicitly marks Playwright impact as none
- handoffs must record the exact validation commands that were run, including Playwright project names and artifact paths when browser coverage was involved
