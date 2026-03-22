# Prompt 16: E8-S3 Webhook Ingestion and Replay Safety

## Sequence Position

- Prompt: 16 (original numbering; 15 prompts remain after removing completed)
- Epic: 8
- Story: E8-S3
- Tasks: E8-S3-T1, E8-S3-T2, E8-S3-T3, E8-S3-T4
- Phase: Epic 8 Deep Integration (must wait for prompt 15 to complete)

## Prerequisites

- E8-S2 (payment intent, capture, and refund) must be completed — prompt 15.
- Read E8-S2 handoff notes for payment transaction model and state mapping.
- Read E8-S1 handoff notes for provider connection model and signature verification context.

## Context for the Agent

You are implementing webhook ingestion and replay safety. External payment providers (Stripe, Square) send webhook events to confirm payment actions. These events must be received, verified (signature validation), stored, and processed idempotently. Duplicate webhooks must not duplicate side effects. Failed webhook processing must be retryable from stored event payloads.

This is infrastructure-critical work. The webhook event store becomes the source of truth for reconciling platform payment state with provider payment state. The replay capability ensures recovery from transient failures without manual intervention.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-08.md
agents/epics/epic-08-tasks.md (section E8-S3)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/integrations/payments.md
```

Read these task packets:

```
agents/epics/packets/epic-08/E8-S3-T1.md
agents/epics/packets/epic-08/E8-S3-T2.md
agents/epics/packets/epic-08/E8-S3-T3.md
agents/epics/packets/epic-08/E8-S3-T4.md
```

Read dependency handoffs from prompts 13 and 15:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S1-*.md (payment connection and provider types)
agents/epics/handoffs/YYYY-MM-DD-E8-S2-*.md (payment transaction model)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (payment entities from E8-S1, E8-S2)
platform/apps/api/src/ (payment services)
platform/apps/worker/src/ (queue infrastructure)
```

## Implementation Scope

### E8-S3-T1: Webhook Ingress Endpoints
- Implement webhook ingress endpoints with signature verification and provider routing.
- Each provider (Stripe, Square) has its own signature verification method.
- Route incoming webhooks to the correct provider handler.

### E8-S3-T2: Raw Event Storage
- Store raw webhook events for replay and idempotent processing.
- Event store must capture: provider, event type, raw payload, processing status, idempotency key, received timestamp.
- Events must be retrievable by idempotency key for deduplication.

### E8-S3-T3: Retry-Safe Event Processors
- Implement retry-safe event processors that update transactions and domain state.
- Processors must be idempotent — reprocessing the same event produces no additional side effects.
- Map provider events to internal transaction state changes (payment.succeeded → captured, refund.created → refunded).

### E8-S3-T4: Operational Tooling
- Create operational tooling or read models for webhook failure inspection and replay.
- Platform admins can view failed webhooks, inspect payloads, and trigger replay.
- Replay must reprocess from stored event payloads, not re-fetch from providers.

## Constraints

- **SECURITY CRITICAL**: Webhook signature verification is mandatory — reject unsigned or invalid webhooks.
- **RELIABILITY CRITICAL**: Duplicate webhooks must not cause duplicate side effects.
- **RELIABILITY CRITICAL**: Failed processing must be retryable from stored payloads.
- Raw webhook payloads must be stored for audit and replay.
- Do NOT call provider APIs during webhook processing — process only from the received payload.
- Do NOT expose raw webhook payloads to tenant views — only platform admins see operational details.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

Security and reliability test expectations:
- Verify signature verification rejects invalid webhooks.
- Verify duplicate webhook delivery does not create duplicate side effects.
- Verify failed processing can be replayed safely.

Playwright impact: none (webhook processing is backend-only; operational tooling may be platform-admin visible).

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S3-T1.md
agents/epics/handoffs/YYYY-MM-DD-E8-S3-T2.md
agents/epics/handoffs/YYYY-MM-DD-E8-S3-T3.md
agents/epics/handoffs/YYYY-MM-DD-E8-S3-T4.md
```

Each handoff must include:
- Task ID and status
- Webhook event store contract documented
- Idempotency rules documented
- Replay procedure documented
- Signature verification evidence

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 17** (E8-S6): Integration failure handling monitors webhook failures

## Stop Conditions

- STOP if E8-S2 (payment transactions) handoffs are not available — write a blocked handoff.
- STOP if signature verification cannot be validated with tests.
- STOP if idempotency cannot be proven with integration tests.
- STOP if the work expands into provider API calls during webhook processing.
