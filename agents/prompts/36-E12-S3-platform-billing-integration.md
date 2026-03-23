# Prompt 36: E12-S3 Platform Billing Integration (with UI)

## Sequence Position

- Prompt: 36 of 46
- Epic: 12 — SaaS Subscription Management & Platform Billing
- Story: E12-S3
- Tasks: E12-S3-T1 through E12-S3-T6
- Phase: Enhanced Backend + UI (can run parallel with prompt 35)

## Prerequisites

- E12-S1 (subscription packages) — completed
- E12-S2 (feature gating) — completed (or in-flight)
- E8-S2 (payment processing) — completed
- E13-S1 (prompt 27) — shared UI components and SDK
- E13-S8 (prompt 34) — platform admin portal

## Context for the Agent

You are building the **platform billing integration** — connecting the platform to Stripe Billing for managing tenant subscriptions, processing invoices, and handling billing webhooks. This is the platform-level billing system (distinct from E11-S6 which is customer-facing subscriptions).

**This prompt requires both backend AND frontend implementation.** Build the billing provider abstraction, webhook ingestion, and payment management backend, THEN build the UI for billing visibility in the Platform Admin portal.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-12.md (section E12-S3)
agents/epics/epic-12-tasks.md (section E12-S3)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### Billing Provider Abstraction
- `BillingProviderAdapter` interface: create/update/cancel subscriptions, retrieve invoices, manage payment methods
- Stripe Billing implementation: Stripe customer creation, subscription CRUD, invoice retrieval
- Payment-method management: add/update via Stripe Elements token, set default

### Webhook Ingestion
- Billing webhook endpoint: signature verification, idempotent event processing
- Handle events: invoice.paid, payment_failed, subscription.updated, subscription.deleted
- Event → domain action mapping: update tenant subscription status, trigger dunning on payment failure

### Invoice Services
- Invoice list for tenant with pagination
- Invoice PDF retrieval or generation link

## Implementation Scope — Frontend (REQUIRED)

### Platform Admin — Billing Operations
- **Billing Webhook Health** page or section in Operations (`/platform/operations/billing`):
  - DataTable of recent webhook events: event type, tenant, status (processed/failed/pending), timestamp
  - Failed webhook retry action
  - Webhook health MetricCards: total processed (24h), failure rate, queue depth
- Add billing KPI cards to platform dashboard if not already present

### Platform Admin — Billing Configuration
- **Billing Provider Settings** in Config section (`/platform/config/billing`):
  - Stripe connection status card: connected/disconnected, API key status (masked), webhook URL display
  - Test connection button
  - Webhook secret configuration

## Constraints

- Stripe API keys must be stored securely — never exposed to frontend. Only masked display (last 4 chars).
- Webhook endpoint must verify Stripe signatures — no unverified event processing
- Use `@platform/ui` components for all UI
- Use `@platform/sdk` — add billing methods to platform namespace
- All UI pages integrate into platform admin portal from E13-S8

## Validation Commands

```bash
pnpm --filter @platform/api typecheck
pnpm --filter @platform/api test
pnpm --filter web-platform-admin typecheck
pnpm --filter web-platform-admin build
npx playwright test --project=web-platform-admin-smoke
```

## Handoff Instructions

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E12-S3-*.md`. Include:
- Billing provider adapter interface and Stripe implementation
- Webhook event processing pipeline
- Frontend: Vue components, routes, SDK methods added
- Security: key storage, signature verification approach
- Files created/modified

## Stop Conditions

- STOP if Stripe SDK is not installable or configured — document and implement mock provider
- STOP if webhook signature verification cannot be tested locally — document manual verification steps
- STOP if E13-S8 platform admin shell not available — build backend only, blocked handoff for UI
