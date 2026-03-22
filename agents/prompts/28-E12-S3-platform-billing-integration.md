# Prompt 28: E12-S3 Platform Billing Integration

## Sequence Position

- Prompt: 28 of 38
- Epic: 12
- Story: E12-S3
- Tasks: E12-S3-T1, E12-S3-T2, E12-S3-T3, E12-S3-T4, E12-S3-T5
- Phase: Epic 12 Billing (must wait for prompt 19 to complete; can run parallel with prompt 27)

## Prerequisites

- E12-S1 (subscription package and tier model) must be completed — prompt 19.
- E8-S1 (payment connection management) — completed. Provider abstraction patterns to reuse.
- E8-S3 (webhook ingestion and replay) — completed. Webhook patterns to reuse for billing webhooks.

## Context for the Agent

You are implementing the platform billing integration — connecting the subscription package model (E12-S1) to an external billing provider (Stripe Billing). When a tenant subscribes to a package, the system creates a corresponding billing customer and subscription in the provider. The integration handles webhooks for payment success/failure, subscription updates, and cancellations.

This reuses the provider-abstraction approach from E8-S1/S2 but targets a separate billing-subscription concern (platform billing, not tenant commerce). PCI compliance is critical — payment method handling must go through the provider's secure flow (Stripe Checkout/Elements), and sensitive billing data must never touch our servers directly.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md
agents/epics/epic-12-tasks.md (section E12-S3)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
```

Read these task packets:

```
agents/epics/packets/epic-12/E12-S3-T1.md
agents/epics/packets/epic-12/E12-S3-T2.md
agents/epics/packets/epic-12/E12-S3-T3.md
agents/epics/packets/epic-12/E12-S3-T4.md
agents/epics/packets/epic-12/E12-S3-T5.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S1-*.md (package schema — from prompt 19)
agents/epics/handoffs/2026-03-22-E8-S1-*.md (payment provider abstraction patterns)
agents/epics/handoffs/2026-03-22-E8-S3-*.md (webhook ingestion patterns)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (E12-S1 package entities, E8 payment entities)
platform/packages/types/src/ (payment types from E8)
platform/apps/api/src/ (payment service, webhook processing from E8)
```

## Implementation Scope

### E12-S3-T1: Billing Provider Abstraction
- Define interface: create subscription, update subscription (plan change), cancel subscription, update payment method, retrieve invoices, and process webhooks.
- Implement Stripe Billing adapter initially.

### E12-S3-T2: Tenant Billing Account Provisioning
- On tenant subscription, create billing customer and subscription in provider.
- Store provider references (customer ID, subscription ID) encrypted and tenant-scoped.

### E12-S3-T3: Billing Webhook Ingestion
- Signature verification, idempotent processing.
- Handle events: invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted.
- Reuse E8-S3 webhook patterns.

### E12-S3-T4: Payment Method Management
- Add, update, remove payment methods through provider's secure flow (Stripe Checkout or Elements for PCI compliance).
- Never handle raw card data server-side.

### E12-S3-T5: Invoice Retrieval Service
- Fetch invoice history and PDF/receipt links from billing provider.
- Display in tenant admin billing views (E12-S6).

## Constraints

- PCI-sensitive data must NEVER touch our servers directly — use provider's secure UI flow.
- Billing provider credentials must be stored securely (encrypted, not in code).
- Webhook signatures must be verified — reject unsigned or tampered webhooks.
- Provider abstraction must allow future swap to non-Stripe providers.
- Billing webhook failures must be logged and retryable per E8-S3 patterns.
- Do NOT implement subscription lifecycle state management — that is E12-S4.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
```

Playwright impact: none (no browser-visible changes in this story — payment method UI is E12-S6).

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E12-S3-T1.md
agents/epics/handoffs/YYYY-MM-DD-E12-S3-T2.md
agents/epics/handoffs/YYYY-MM-DD-E12-S3-T3.md
agents/epics/handoffs/YYYY-MM-DD-E12-S3-T4.md
agents/epics/handoffs/YYYY-MM-DD-E12-S3-T5.md
```

Each handoff must include:
- Task ID and status
- Billing provider abstraction interface contract
- Webhook event mapping (Stripe event → internal state change)
- Payment-method flow (secure UI component integration)
- PCI compliance boundaries documented
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

The following prompts depend on output from this one:
- **Prompt 31** (E12-S4): Subscription lifecycle uses billing provider for plan changes, cancellations, retries
- **Prompt 33** (E12-S5): Platform admin views show billing data from provider
- **Prompt 35** (E12-S6): Tenant admin billing uses payment method and invoice retrieval

## Stop Conditions

- STOP if E12-S1 package model is not available — write a blocked handoff.
- STOP if E8 payment/webhook patterns are not reusable for billing — escalate.
- STOP if PCI compliance requirements cannot be met with the provider's secure flow.
- STOP if the work expands into subscription lifecycle management — that is E12-S4.
