# Prompt 18: E8-S5 Domain Activation Integrated with Publish State

## Sequence Position

- Prompt: 18 of 18
- Epic: 8
- Story: E8-S5
- Tasks: E8-S5-T1, E8-S5-T2, E8-S5-T3, E8-S5-T4
- Phase: Epic 8 Final (BLOCKED until Epic 9 is complete; this prompt is last in sequence)

## Prerequisites

- Epic 3 must be completed (domain and routing infrastructure).
- **Epic 9 must be completed** (publish state and release management).
- This story has a hard dependency on Epic 9 which is NOT covered by the E6–E8 prompt sequence.
- If Epic 9 is not complete, this prompt CANNOT be executed. Document a blocked handoff.

## Context for the Agent

You are implementing domain activation integrated with publish state. Custom domains are promoted to production only when the tenant has a healthy published release and valid routing configuration. This is the final integration point between the domain infrastructure (Epic 3) and the publish system (Epic 9).

Failed activation must preserve the prior live configuration — the system must not leave a tenant in a broken state. Activation readiness and denial reasons must be visible in both platform and tenant admin views.

**IMPORTANT**: This story depends on Epic 9 which is outside the E6–E8 sequence. If Epic 9 is not yet complete, treat this as a design-and-contract-only task — define the integration contract and readiness checks but do not implement the full activation workflow.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-08.md
agents/epics/epic-08-tasks.md (section E8-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-08/E8-S5-T1.md
agents/epics/packets/epic-08/E8-S5-T2.md
agents/epics/packets/epic-08/E8-S5-T3.md
agents/epics/packets/epic-08/E8-S5-T4.md
```

Read dependency handoffs:

```
agents/epics/handoffs/ (E3 domain and routing handoffs)
agents/epics/handoffs/ (E9 publish state handoffs — if available)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (domain entities from E3)
platform/apps/api/src/ (domain and routing services from E3)
platform/packages/types/src/
```

## Implementation Scope

### If Epic 9 is complete:

#### E8-S5-T1: Connect Domain Promotion to Publish Health
- Connect domain promotion logic to published-release health and readiness checks.
- Domain activation consumes current publish state to determine if promotion is safe.

#### E8-S5-T2: Block Activation on Unhealthy Publish State
- Block activation when publish validation or release health is not green.
- Activation denial must include explicit reasons (missing release, failed health check, invalid routing).

#### E8-S5-T3: Rollback Behavior
- Define activation rollback behavior when route validation fails post-promotion.
- Failed post-promotion validation must restore previous live routing state.
- Rollback must be automatic and immediate.

#### E8-S5-T4: Readiness and Denial Views
- Expose activation readiness and denial reasons in platform and tenant views.
- Platform admins see cross-tenant activation status. Tenant admins see their own domain readiness.

### If Epic 9 is NOT complete (design-only mode):

- Define the publish-readiness contract that E8-S5 will consume from Epic 9.
- Define the activation denial semantics and rollback trigger conditions.
- Document the integration contract and expected inputs/outputs.
- Create interface stubs that will be connected when Epic 9 lands.

## Constraints

- Domain promotion must NEVER occur against an unhealthy or missing publish state.
- Failed activation must preserve the prior live configuration — no broken states.
- Rollback must be automatic and immediate on post-promotion validation failure.
- Do NOT implement the publish system — consume Epic 9's output.
- Do NOT implement domain registration or DNS management — that is out of scope.

## Validation Commands

If implementation is possible:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

If admin views are browser-visible:

```bash
npx playwright test --project=web-admin-smoke
npx playwright test --project=web-platform-admin-smoke
```

If design-only mode:

```bash
pnpm typecheck:contracts
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T1.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T2.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T3.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T4.md
```

Each handoff must include:
- Task ID and status (blocked if Epic 9 is not available)
- Publish-readiness contract defined
- Activation denial semantics documented
- Rollback trigger conditions documented
- Whether full implementation or design-only was delivered

Update the active task board accordingly.

## Downstream Consumers

No prompts in this sequence depend on E8-S5 output. The domain activation contract is consumed by:
- Epic 10 domain health monitoring and operational runbooks

## Stop Conditions

- STOP and write a blocked handoff if Epic 9 publish state is not available — switch to design-only mode.
- STOP if domain promotion could leave a tenant in a broken state.
- STOP if rollback behavior cannot be validated with integration tests.
- STOP if the work requires modifying Epic 3 domain infrastructure rather than consuming it.
