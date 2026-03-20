# Prompt 13: E8-S1 Payment Connection Management

## Sequence Position

- Prompt: 13 of 18
- Epic: 8
- Story: E8-S1
- Tasks: E8-S1-T1, E8-S1-T2, E8-S1-T3, E8-S1-T4
- Phase: Epic 8 Foundation (can run in parallel with prompt 14)

## Prerequisites

- Epic 3 must be completed (tenant provisioning).
- Epic 5 must be completed (tenant operational settings).
- Epic 6 must be completed — prompts 01–06 (domain contracts consumed by payment flows).
- Epic 7 must be completed — prompts 07–12 (ordering and booking flows that use payments).
- Verify all prerequisites on the active task board.

## Context for the Agent

You are implementing payment connection management — the foundational story that allows tenants to create and verify payment gateway connections (Stripe, Square). This is security-critical work: payment credentials must be stored encrypted and strictly tenant-scoped. Connection health must be inspectable without revealing secret values.

The platform uses an adapter pattern for payment providers — no provider-specific SDK calls should leak into domain logic. The payment connection model you build here is consumed by the payment abstraction layer (E8-S2) and admin management UI (E8-S1-T3).

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-08.md
agents/epics/epic-08-tasks.md (section E8-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/integrations/payments.md
```

Read these task packets:

```
agents/epics/packets/epic-08/E8-S1-T1.md
agents/epics/packets/epic-08/E8-S1-T2.md
agents/epics/packets/epic-08/E8-S1-T3.md
agents/epics/packets/epic-08/E8-S1-T4.md
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma
platform/packages/types/src/
platform/apps/api/src/
```

## Implementation Scope

### E8-S1-T1: Payment Connection Schema
- Finalize schema for PaymentConnection with provider type (Stripe, Square), encrypted credentials, connection status, and tenant FK.
- Define connection status enum and provider type enum.
- Credentials must NEVER be stored in plaintext.
- Generate migration and shared types.

### E8-S1-T2: Connection Services
- Implement payment-connection setup, verification, and status-check services.
- Connection verification must validate credentials against the provider without storing raw responses.
- Status transitions: inactive → verifying → active → suspended.

### E8-S1-T3: Tenant-Admin APIs and Forms
- Define tenant-admin APIs and forms for creating and managing gateway connections.
- Secret-bearing inputs must be validated and NEVER echoed back in responses.

### E8-S1-T4: Sanitized Health Read Models
- Expose sanitized connection-health read models for tenant and platform views.
- Health views show connection state, last verification time, and provider type.
- Health views NEVER reveal API keys, secrets, or tokens.

## Constraints

- **SECURITY CRITICAL**: Payment credentials must be encrypted at rest and in transit.
- **SECURITY CRITICAL**: Health and status views must NEVER expose secret values.
- **SECURITY CRITICAL**: One active connection per provider per tenant — enforce at schema level.
- All payment connection entities must be tenant-scoped.
- Use adapter pattern — no direct provider SDK calls in domain services.
- Do NOT implement payment processing — that is E8-S2.
- Do NOT implement webhook handling — that is E8-S3.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

Security-specific test expectations:
- Verify credentials are not stored in plaintext.
- Verify health endpoints do not expose secret values.
- Verify connection uniqueness constraint per provider per tenant.

If admin connection management is browser-visible:

```bash
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S1-T1.md
agents/epics/handoffs/YYYY-MM-DD-E8-S1-T2.md
agents/epics/handoffs/YYYY-MM-DD-E8-S1-T3.md
agents/epics/handoffs/YYYY-MM-DD-E8-S1-T4.md
```

Each handoff must include:
- Task ID and status
- Encrypted config contract documented
- Provider-neutral connection status model
- Secret-handling rules documented
- Security test evidence (encryption, no-leak, uniqueness)

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 15** (E8-S2): Payment intent and capture uses connection credentials
- **Prompt 16** (E8-S3): Webhook ingestion references payment connections

## Stop Conditions

- STOP if credentials encryption strategy cannot be validated.
- STOP if health endpoints might leak secret values — fix before continuing.
- STOP if the work expands into payment processing or webhook handling.
- STOP if Epic 7 order/booking contracts are not available.
