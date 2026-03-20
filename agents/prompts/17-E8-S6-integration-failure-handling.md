# Prompt 17: E8-S6 Integration Failure Handling and Operational Alerts

## Sequence Position

- Prompt: 17 of 18
- Epic: 8
- Story: E8-S6
- Tasks: E8-S6-T1, E8-S6-T2, E8-S6-T3, E8-S6-T4
- Phase: Epic 8 Operational (must wait for prompts 16 and 14 to complete)

## Prerequisites

- E8-S3 (webhook ingestion and replay) must be completed — prompt 16.
- E8-S4 (notification delivery framework) must be completed — prompt 14.
- Read E8-S3 and E8-S4 handoff notes for failure states and retry mechanisms.

## Context for the Agent

You are implementing the integration failure handling and operational alerts system. Payment failures, webhook processing errors, domain activation issues, and notification delivery failures must all be visible and actionable by operators. This is the observability and operational-response layer that ties together the integration work from E8-S1 through E8-S4.

Platform admins need to inspect recent integration health across tenants. Alerts must be structured, categorized by severity, and include enough context for an operator to take action. This story does not fix failures — it makes them visible and provides response guidance.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-08.md
agents/epics/epic-08-tasks.md (section E8-S6)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-08/E8-S6-T1.md
agents/epics/packets/epic-08/E8-S6-T2.md
agents/epics/packets/epic-08/E8-S6-T3.md
agents/epics/packets/epic-08/E8-S6-T4.md
```

Read dependency handoffs from prompts 14 and 16:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S3-*.md (webhook failure states)
agents/epics/handoffs/YYYY-MM-DD-E8-S4-*.md (notification delivery failures)
agents/epics/handoffs/YYYY-MM-DD-E8-S1-*.md (payment connection failures)
agents/epics/handoffs/YYYY-MM-DD-E8-S2-*.md (payment transaction failures)
```

Inspect these code surfaces:

```
platform/apps/api/src/ (all integration modules from E8)
platform/apps/worker/src/ (queue and delivery workers)
platform/packages/types/src/
```

## Implementation Scope

### E8-S6-T1: Alert Categories and Severity Levels
- Define alert categories for payment, webhook, domain, and notification failures.
- Define severity levels (critical, high, medium, low) and escalation rules.
- Map failure types to alert categories and severities.

### E8-S6-T2: Structured Operational Events
- Emit structured operational events from integration modules.
- Events must include: category, severity, tenant context, failure details, retry metadata.
- Events should be machine-parseable for future alerting integrations.

### E8-S6-T3: Platform Views for Failures
- Create platform-admin views or feeds for recent integration failures and retry states.
- Views must aggregate failures across tenants with filtering by category and severity.
- Show retry counts, last attempt time, and actionable next steps.

### E8-S6-T4: Operator Response Documentation
- Document operator response expectations for common integration incidents.
- Cover: payment connection failures, webhook verification failures, notification delivery failures, stuck retries.
- Document escalation paths and manual intervention procedures.

## Constraints

- Alert events must be structured and machine-parseable — no unstructured log-only alerts.
- Retry state and alert metadata must remain consistent across integration modules.
- Platform-admin failure views must not expose tenant payment secrets or customer PII.
- Do NOT implement automatic remediation — make failures visible and document manual response.
- Do NOT modify integration modules built in E8-S1 through E8-S4 — instrument them.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

If platform-admin failure views are browser-visible:

```bash
npx playwright test --project=web-platform-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S6-T1.md
agents/epics/handoffs/YYYY-MM-DD-E8-S6-T2.md
agents/epics/handoffs/YYYY-MM-DD-E8-S6-T3.md
agents/epics/handoffs/YYYY-MM-DD-E8-S6-T4.md
```

Each handoff must include:
- Task ID and status
- Alert taxonomy documented (categories, severities, escalation rules)
- Structured failure event schema documented
- Operator response mapping documented
- Integration modules instrumented and evidence provided

Update the active task board accordingly.

## Downstream Consumers

No prompts in this sequence directly depend on E8-S6 output. The alert taxonomy and failure event schema will be consumed by:
- Epic 10 telemetry and observability work
- Future alerting integrations (PagerDuty, Slack, etc.)

## Stop Conditions

- STOP if E8-S3 or E8-S4 handoffs are not available — write a blocked handoff.
- STOP if the work requires modifying integration module internals rather than instrumenting them.
- STOP if platform-admin views would expose payment secrets or customer PII.
- STOP if the work drifts into automatic remediation instead of visibility and documentation.
