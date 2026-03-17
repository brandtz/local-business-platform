# Epic Delivery Plan

This directory contains the platform delivery plan decomposed from architecture into epics and implementation-ready stories.

It now also includes:
- task-level technical plans for each epic
- test requirement standards for story and task execution
- agent handoff rules to reduce context loss between implementation sessions
- execution strategy guidance for sequencing and safe parallelism

## Story Format

Each story uses the following shape:

- story ID: stable reference in the form E#-S#
- title: concise capability name
- outcome: what becomes true when the story is complete
- dependencies: upstream stories or epics that must land first
- acceptance signals: the key checks that prove the story is complete

## Sequencing Principle

The platform is sequenced by dependency and architectural risk, not by a narrow MVP.

Build waves:
- Wave 1: foundation, identity, tenancy, and platform control
- Wave 2: shared frontend system and tenant operational portal
- Wave 3: shared domain models plus ordering and booking flows
- Wave 4: integrations, onboarding automation, and publish orchestration
- Wave 5: hardening, observability, and operational resilience

## Story Granularity Rules

- stories should be independently testable
- stories should avoid mixing domain modeling, UI, and third-party integrations unless the coupling is unavoidable
- security-sensitive capabilities should have separate stories for enforcement and auditing when appropriate
- stories may deliver internal platform capability even when they are not directly user-facing

## Completion Standard

An epic is considered ready for implementation only when:
- its stories have explicit dependencies
- acceptance signals are specific enough to test
- cross-tenant security implications are accounted for
- operational and audit implications are called out where relevant

An epic is considered task-ready only when:
- it has a companion technical task plan
- story tasks reference test expectations clearly
- handoff expectations are defined well enough for a new agent to continue from the prior task output
