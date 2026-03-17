# Agent Handoff Standard

This file defines the minimum payload one agent must leave for the next.

## Required Handoff Payload

Every completed task should leave a concise handoff note containing:
- task ID and title
- status: completed, partially completed, blocked, or superseded
- changed surfaces: exact modules, packages, endpoints, schema areas, or UI routes touched
- dependency outputs: contracts, migrations, events, env vars, or config keys created
- test evidence: what was validated and at what layer
- validation commands: the exact commands that produced the reported evidence
- Playwright evidence: project names and artifact paths when browser tests were run
- open assumptions: decisions made locally that downstream work must preserve or revisit
- follow-up hooks: the next likely task IDs that should consume this work

## Handoff Compression Rules

To reduce context overload:
- summarize changed behavior, not every edit
- name the exact contract or invariant introduced
- link downstream agents to one or two source docs, not the entire repository
- record unresolved risks separately from completed work

## Blocking Handoff Requirements

If a task is blocked, the handoff must state:
- precise blocker
- affected downstream tasks
- smallest decision or dependency needed to unblock
- whether safe stub work can continue elsewhere

## Cross-Task Invariants to Preserve

All handoffs should call out whether the task changed any of these invariants:
- tenant isolation behavior
- auth or role semantics
- public API contracts
- schema and migration assumptions
- template configuration model
- publish and rollback guarantees
- audit or observability behavior
