# Agent Execution Norms

## Before Editing

- read the active task packet
- read the latest dependency-chain handoff note
- confirm the task stays inside one primary lane unless a supporting lane is declared

## During Execution

- preserve public contract names unless the task explicitly changes them
- prefer contract and validation work before wider feature wiring
- keep local command behavior aligned with CI command behavior
- record blockers instead of silently widening task scope

## At Task Completion

- update the handoff note
- update the active task board
- list the validation commands that were actually run
- call out any remaining untested risk explicitly

## Escalation Rule

If a task requires more than two ownership lanes or broad cross-cutting edits, split it before continuing.
