# Prompt 38: E10-S1 Structured Logging and Telemetry

## Sequence Position

- Prompt: 38 of 38
- Epic: 10
- Story: E10-S1
- Tasks: E10-S1-T1, E10-S1-T2, E10-S1-T3, E10-S1-T4
- Phase: Operations Foundation (must wait for prompts 35 and 36 to complete; can run parallel with prompt 37)

## Prerequisites

- E9 (onboarding and import pipeline) — prompts 20, 29, 30, 32, 34, 36 must all be completed. Telemetry instruments the full import flow.
- E8 (deployment and infrastructure) — completed. Telemetry instruments domain resolution, SSL, and storefront rendering.
- E2 (authentication and authorization) — completed. Telemetry correlates logs with authenticated user context.

## Context for the Agent

You are implementing the structured logging and telemetry foundation — the observability layer that all downstream E10 stories (audit search, rate limiting, performance validation) will depend on.

This story establishes: a consistent structured log format across all API services, request-scoped trace correlation (trace ID propagated through BullMQ jobs, HTTP requests, and WebSocket events), basic metrics (request latency, error rates, queue depths), and a telemetry configuration that works in development (console) and production (external collector).

## Required Reading

Read these files before writing any code:

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-10.md
agents/epics/epic-10-tasks.md (section E10-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
agents/architecture/tech-stack.md
agents/architecture/system-overview.md
```

Read these task packets:

```
agents/epics/packets/epic-10/E10-S1-T1.md
agents/epics/packets/epic-10/E10-S1-T2.md
agents/epics/packets/epic-10/E10-S1-T3.md
agents/epics/packets/epic-10/E10-S1-T4.md
```

Read key dependency handoffs for instrumentation targets:

```
agents/epics/handoffs/2026-03-19-E8-S1-*.md (SSL, DNS services to instrument)
agents/epics/handoffs/2026-03-19-E8-S2-*.md (payment processing to instrument)
agents/epics/handoffs/YYYY-MM-DD-E9-S6-*.md (publish pipeline to instrument — from prompt 36)
```

Inspect these code surfaces:

```
platform/apps/api/src/main.ts (NestJS bootstrap — global middleware)
platform/apps/api/src/app.module.ts (module registration)
platform/packages/ (shared packages for logging utilities)
platform/infra/ (deployment config for telemetry endpoints)
```

## Implementation Scope

### E10-S1-T1: Structured Log Schema
- Define a JSON log format: timestamp, level, message, traceId, spanId, userId, tenantId, module, duration, metadata.
- NestJS LoggerService implementation that outputs this schema.
- Replace any existing `console.log` calls with structured logger.
- Log levels: error, warn, info, debug, verbose.

### E10-S1-T2: Request-Scoped Trace Correlation
- Generate or propagate trace ID for every HTTP request (via header `x-trace-id`).
- Propagate trace ID through BullMQ job data.
- AsyncLocalStorage-based context for automatic trace ID injection.
- Include trace ID in all log entries and API error responses.

### E10-S1-T3: Basic Metrics Collection
- Request latency histogram (by route, method, status code).
- Error rate counter.
- BullMQ queue depth and job processing time.
- Active WebSocket connections gauge (if applicable).
- Expose metrics endpoint for scraping (Prometheus-compatible or equivalent).

### E10-S1-T4: Telemetry Configuration
- Environment-based configuration: development (console pretty-print), staging/production (JSON to stdout for log aggregator).
- Configurable log level via environment variable.
- Health check endpoint that exposes basic telemetry status.
- Documentation for connecting to external collectors (OpenTelemetry, Datadog, etc.).

## Constraints

- Log format must be JSON in production — no unstructured text logs.
- Trace ID must survive async boundaries (use AsyncLocalStorage, not thread-local).
- Do NOT add a specific vendor SDK (Datadog, New Relic) — keep the telemetry layer vendor-agnostic with OpenTelemetry-compatible interfaces.
- Metrics endpoint must NOT expose sensitive data (no PII in metric labels).
- Do NOT instrument every single function — focus on service boundaries, queue operations, and external calls.
- Never log sensitive data: passwords, tokens, card numbers, PII. Sanitize before logging.

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
agents/epics/handoffs/YYYY-MM-DD-E10-S1-T1.md
agents/epics/handoffs/YYYY-MM-DD-E10-S1-T2.md
agents/epics/handoffs/YYYY-MM-DD-E10-S1-T3.md
agents/epics/handoffs/YYYY-MM-DD-E10-S1-T4.md
```

Each handoff must include:
- Task ID and status
- Structured log schema specification
- Trace correlation mechanism (AsyncLocalStorage integration point)
- Metrics endpoint location and format
- Configuration environment variables added
- Migration notes for existing log calls
- Playwright projects run and artifact paths
- Files changed and validation commands run

Update the active task board accordingly.

## Downstream Consumers

- E10-S2 (Audit Trail Search) — depends on structured logs and trace IDs for audit correlation.
- E10-S3 (Rate Limiting) — uses metrics for rate monitoring.
- E10-S5 (Security Review) — audits logging for sensitive data leaks.
- E10-S6 (Performance Validation) — uses latency metrics and trace data.

## Stop Conditions

- STOP if NestJS application bootstrap is not accessible or has been significantly restructured since E8 — escalate.
- STOP if the work expands into vendor-specific integrations or APM agent installation.
- STOP if adding telemetry causes test failures in existing modules — fix and document, do not skip tests.
