# Task Ownership Model

This file defines the default ownership lanes for agent-built delivery.

## Ownership Lanes

### Foundation Lane

Primary responsibilities:
- workspace setup
- toolchain configuration
- package boundaries
- build and CI plumbing
- shared configuration

Best fit for:
- Epic 1 heavy tasks
- cross-repo infrastructure setup
- repo-wide guardrails

### Identity and Security Lane

Primary responsibilities:
- authentication
- authorization
- tenant isolation
- MFA and impersonation
- audit and abuse controls

Best fit for:
- Epic 2
- security-heavy tasks in Epics 3, 8, and 10

### Platform Control Lane

Primary responsibilities:
- tenant lifecycle
- module enablement
- domains and routing
- platform admin operations
- publish governance

Best fit for:
- Epic 3
- platform-control portions of Epics 8 and 9

### Frontend Systems Lane

Primary responsibilities:
- shared UI system
- customer shell
- admin shells
- route guards and state wiring
- template-driven layout composition

Best fit for:
- Epic 4
- shell and UI portions of Epics 5, 7, and 9

### Backend Domain Lane

Primary responsibilities:
- schema and migrations
- domain services
- API contracts
- state machines
- query and write models

Best fit for:
- Epics 5, 6, and 7
- backend-heavy parts of Epics 8 and 9

### Integration and Async Lane

Primary responsibilities:
- workers and queues
- webhooks
- notification delivery
- third-party adapters
- import pipelines

Best fit for:
- Epic 8
- async-heavy parts of Epic 9

### Reliability and Operations Lane

Primary responsibilities:
- telemetry
- alerting
- performance budgets
- backup and recovery
- incident tooling

Best fit for:
- Epic 10
- operational hardening tasks anywhere else

### Verification Lane

Primary responsibilities:
- contract validation
- end-to-end test composition
- negative-path testing
- release-readiness verification

Best fit for:
- high-risk tasks that need strong validation before downstream work proceeds
- cross-epic acceptance and regression passes

## Ownership Rules

Every technical task should identify:
- primary owner lane
- optional supporting lane when the task crosses boundaries
- validation lane when the task has elevated risk

Prefer one primary owner lane per task.

Use a supporting lane only when:
- a UI task depends on a backend contract finalized in the same task packet
- an integration task needs domain-state confirmation
- an operations task is instrumenting a newly introduced workflow

## Review Expectations

Review should come from the adjacent lane, not the same lane, when possible.

Examples:
- Foundation Lane tasks reviewed by Backend Domain or Frontend Systems depending on impact
- Identity and Security Lane tasks reviewed by Reliability and Operations or Platform Control
- Frontend Systems Lane tasks reviewed by Backend Domain when they depend on fresh contracts
- Integration and Async Lane tasks reviewed by Backend Domain or Reliability and Operations

## Ownership Priority by Build Wave

Wave 1 priority lanes:
- Foundation Lane
- Identity and Security Lane

Wave 2 priority lanes:
- Platform Control Lane
- Frontend Systems Lane
- Backend Domain Lane

Wave 3 priority lanes:
- Backend Domain Lane
- Frontend Systems Lane
- Verification Lane

Wave 4 priority lanes:
- Integration and Async Lane
- Platform Control Lane
- Frontend Systems Lane

Wave 5 priority lanes:
- Reliability and Operations Lane
- Verification Lane
- Identity and Security Lane

## Escalation Rule

If a task spans more than two ownership lanes, split it before execution.
