# Agent Execution Strategy

This file defines the most efficient implementation path for a fully agent-built delivery process.

## Core Principle

Optimize for low-context, high-certainty handoffs.

The plan should favor:
- narrow tasks with durable outputs
- dependency-first sequencing
- stable contracts before wide UI work
- testable seams before provider integrations
- reusable shells before tenant-specific configuration depth

## Recommended Agent Cadence

Per story, use this execution order whenever applicable:
1. contract and schema task
2. backend enforcement and service task
3. API boundary and validation task
4. UI shell or page task
5. integration or async processing task
6. observability and hardening task

This order prevents UI or integration agents from guessing at unstable domain behavior.

## Recommended Parallelism Rules

Safe to parallelize:
- multiple UI tasks after contracts stabilize
- multiple read-only query surfaces on top of finished domain models
- provider adapters behind a finished internal interface
- documentation and ADR work beside implementation

Do not parallelize aggressively when work shares:
- the same schema entities
- the same role or auth boundary
- the same publish state machine
- the same queue or webhook semantics

## Overnight Cloud-Agent Rules

For unattended execution:
- let agents claim work only from the Ready section of the active board
- keep one task per agent and no more than four concurrent tasks unless a new queue review says otherwise
- pair UI-affecting tasks with Playwright validation before they can move to Completed
- prefer contract and control-plane tasks first so downstream UI agents do not guess at unstable behavior

## Build Waves for Efficient Delivery

Wave 1:
- Epic 1 and Epic 2 only
- no downstream domain or UI feature work before tenant isolation is trustworthy

Wave 2:
- Epic 3, Epic 4, and Epic 5
- establish platform control, tenant shells, and shared frontend conventions

Wave 3:
- Epic 6 then Epic 7
- finish domain contracts before transaction-heavy workflows

Wave 4:
- Epic 8 and Epic 9
- connect external systems only after core workflows and publish contracts are stable

Wave 5:
- Epic 10 across all prior waves as hardening and validation

## Artifact-First Handoffs

Each story should produce one primary artifact that downstream work can anchor to.

Examples:
- schema and migration artifact
- API contract artifact
- module interface or service contract
- route map and UI state contract
- provider adapter interface
- publish state machine specification
- alerting and operational checklist

## Review Minimization Rule

A new agent should need to read only:
- the epic story definition
- the specific task block
- the standard docs for tasking, tests, and handoffs
- the most recent handoff note for its dependency chain

If more context is needed routinely, the task is too broad and should be split.
