# Prompt 37: E8-S5 Domain Activation Full Implementation

## Sequence Position

- Prompt: 37 of 38
- Epic: 8
- Story: E8-S5 (full implementation — follows design-only prompt 18)
- Tasks: E8-S5-T1, E8-S5-T2, E8-S5-T3, E8-S5-T4, E8-S5-T5
- Phase: Post-E9 Integration (must wait for prompts 35 and 36 to complete; can run parallel with prompt 38)

## Prerequisites

- E8-S5 design handoffs — the prior prompt 18 produced design-only artifacts. Use those as implementation spec.
- E9-S6 (versioned publish) — prompt 36 must be completed. Domain activation requires published content.
- E8-S1 (SSL/TLS and DNS validation) — completed. Provides certificate management and DNS verification flows.
- E8-S3 (content versioning) — completed. Domain serves versioned content.
- E8-S4 (storefront rendering) — completed. Provides domain-aware storefront resolution.

## Context for the Agent

You are implementing the FULL domain activation flow that was deferred during prompt 18 due to E9 dependencies. Prompt 18 produced design handoffs (API contracts, route structures, component wireframes) but could not implement the activation because there was no publishable content to serve.

Now that E9 is complete (import pipeline through versioned publish), domain activation can work end-to-end: verify DNS → provision SSL → activate domain → resolve incoming requests to the correct tenant's published storefront.

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-08.md
agents/epics/epic-08-tasks.md (section E8-S5)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

Read these task packets:

```
agents/epics/packets/epic-08/E8-S5-T1.md
agents/epics/packets/epic-08/E8-S5-T2.md
agents/epics/packets/epic-08/E8-S5-T3.md
agents/epics/packets/epic-08/E8-S5-T4.md
agents/epics/packets/epic-08/E8-S5-T5.md
```

Read design-only handoffs from prompt 18:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T1.md (design handoff — use as implementation spec)
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T2.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T3.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T4.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T5.md
```

Read dependency handoffs:

```
agents/epics/handoffs/YYYY-MM-DD-E9-S6-*.md (versioned publish — from prompt 36)
agents/epics/handoffs/2026-03-19-E8-S1-*.md (SSL/TLS, DNS validation)
agents/epics/handoffs/2026-03-19-E8-S3-*.md (content versioning)
agents/epics/handoffs/2026-03-19-E8-S4-*.md (storefront rendering)
```

Inspect these code surfaces:

```
platform/apps/api/prisma/schema.prisma (domain, tenant entities)
platform/packages/types/src/ (domain types, storefront resolution)
platform/apps/api/src/ (domain services, storefront module)
```

## Implementation Scope

### E8-S5-T1: Domain Lifecycle Service
- Implement domain state machine: pending → verifying → verified → activating → active → suspended.
- DNS verification check (CNAME or A record validation).
- Integration with E8-S1 SSL certificate provisioning.

### E8-S5-T2: Domain Activation Orchestration
- BullMQ job that: verifies DNS → provisions SSL → marks domain active.
- Retry logic with exponential backoff for DNS propagation delays.
- Webhook/event for domain-activated notification.

### E8-S5-T3: Domain Resolution Middleware
- Request middleware that resolves incoming hostname → tenant.
- Loads correct published content version for the resolved tenant.
- Fallback to platform default for unknown domains.

### E8-S5-T4: Tenant Admin Domain Management UI
- Add/remove custom domain.
- DNS instructions display (what CNAME/A record to set).
- Domain status indicator (pending, verifying, active, error).
- SSL certificate status indicator.

### E8-S5-T5: Platform Admin Domain Overview
- List all domains across tenants.
- Domain health dashboard (SSL expiry, DNS status).
- Suspend/unsuspend domain action.

## Constraints

- Follow the API contracts and component structures from the design-only handoffs — do not redesign.
- Domain resolution must be performant — cache resolved tenant mappings.
- SSL provisioning must be async — do not block domain activation on certificate issuance.
- Do NOT implement wildcard SSL or multi-domain certificates — one cert per domain.
- Domain activation must require published content (E9-S6) — block activation if tenant has no published release.

## Validation Commands

Run these exact commands before handoff:

```bash
pnpm --filter @platform/api typecheck
pnpm typecheck:contracts
pnpm --filter @platform/api test
npx playwright test --project=web-admin-smoke
```

## Handoff Instructions

When complete, create handoff notes at:

```
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T1-impl.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T2-impl.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T3-impl.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T4-impl.md
agents/epics/handoffs/YYYY-MM-DD-E8-S5-T5-impl.md
```

Use the `-impl` suffix to distinguish from the design-only handoffs from prompt 18.

Each handoff must include:
- Task ID and status (full implementation, not design-only)
- Domain state machine implementation details
- Resolution middleware caching strategy
- SSL provisioning async flow
- Published content gate enforcement
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

- E10-S1 (prompt 38) — telemetry will instrument domain resolution performance.
- E10-S5 (future) — security review will audit domain resolution and SSL flows.

## Stop Conditions

- STOP if E9-S6 versioned publish is not available — write a blocked handoff.
- STOP if E8-S1 SSL provisioning APIs are not accessible — escalate.
- STOP if design handoffs from prompt 18 are missing or contradictory — use task packets as source of truth.
