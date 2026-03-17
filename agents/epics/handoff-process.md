# Standardized Handoff Process

This file defines the execution workflow for task packets and handoff notes.

## Goal

Minimize context loss between agents while keeping tasks small enough to execute safely.

## Standard Flow

### 1. Prepare Packet

Before work starts:
- select one technical task ID
- assign primary owner lane
- confirm dependency tasks are completed or explicitly stubbed
- create or update the task packet for that assignment

### 2. Claim Task

When an agent starts work:
- mark the task as in progress in the active board
- claim only one task at a time
- read only the minimal context pack defined in the packet
- verify dependency outputs exist before editing code

### 3. Execute Task

During implementation:
- stay within the packet scope
- record any scope pressure that suggests the task should split
- do not absorb downstream work just because context is available

### 4. Validate Task

Before handoff:
- run the test layers required by the packet
- run the exact validation commands named in the packet
- run Playwright coverage when the packet marks Playwright impact as required
- record what was validated and what remains intentionally unvalidated
- verify no invariant was changed silently

### 5. Write Handoff Note

At the end of the task:
- create a handoff note using handoff-note-template.md
- store it in agents/epics/handoffs/
- use the naming pattern YYYY-MM-DD-task-id.md
- link the note to the next likely task IDs

### 6. Update Task Board

After the handoff note is written:
- move the task from in progress to completed, blocked, or partially completed
- record the handoff note path in the board entry
- activate only the next tasks whose dependencies are now satisfied

### 7. Start Next Task

The next agent should read:
- the story file
- the task plan file
- the task packet
- the latest dependency handoff note
- the shared standards only if needed for clarification

## Required Artifacts Per Task

Every active technical task must have:
- one task packet
- one owner lane assignment
- one expected handoff destination
- one explicit test requirement list

Every completed technical task must have:
- one handoff note
- one board status update
- one clear pointer to downstream tasks

## Stop-and-Split Rule

Stop and split the task if any of these become true:
- more than two ownership lanes are now required
- schema, API, and UI all need meaningful changes in one packet
- the task can no longer be validated in one session
- the next agent would need more than the packet and one handoff note to continue

## Blocking Rule

When blocked:
- do not leave the task only in chat context
- write a blocked handoff note immediately
- identify the smallest decision or upstream artifact needed to unblock
- move the blocked task out of the active execution slot if parallel work can continue elsewhere
