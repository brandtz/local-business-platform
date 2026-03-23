# Prompt 46: E10-S1 Structured Logging and Telemetry (with UI)

## Sequence Position

- Prompt: 46 of 46
- Epic: 10 — Security, Observability, Reliability & Platform Operations
- Story: E10-S1
- Tasks: E10-S1-T1 through E10-S1-T8
- Phase: Enhanced Backend + UI (can run parallel with prompt 45)

## Prerequisites

- E2 (auth) — completed
- E7 (orders, bookings) — completed
- E8-S4 (notifications) — completed
- E9-S6 (prompt 44 — publish) — completed or available
- E13-S1 (prompt 27) — shared UI components
- E13-S8 (prompt 34) — platform admin portal (Operations section)

## Context for the Agent

You are building the **structured logging and telemetry instrumentation** — the observability foundation that makes the platform operationally manageable. This includes structured log schemas, API route instrumentation, worker job telemetry, health probe endpoints, and critical flow metrics.

**This prompt requires both backend AND frontend implementation.** The backend is the primary focus (instrumentation), but the frontend must surface operational data in the Platform Admin portal's Operations section.

## Required Reading

```
agents/README.md
agents/cloud-agent-overnight-runbook.md
agents/epics/epic-10.md (section E10-S1)
agents/epics/epic-10-tasks.md (section E10-S1)
agents/epics/agent-handoff-standard.md
agents/epics/test-requirements-standard.md
agents/PLAYWRIGHT_AGENT_STANDARD.md
```

## Implementation Scope — Backend

### Shared Telemetry Schema
- Structured log format: timestamp, level, message, service, correlation_id, tenant_id, actor_id, request_id, job_id, duration_ms, metadata
- Correlation ID propagation across request→service→queue boundaries
- Tenant and actor context preserved in all logs

### API Route Instrumentation
- Request/response logging middleware: method, path, status code, duration, tenant, actor
- Error logging with stack trace, request context
- Sensitive field redaction: passwords, tokens, card numbers, PII marked fields

### Worker Job Telemetry
- Job start/complete/fail logging with job type, tenant, duration
- Queue depth metrics per queue
- Failed job detail logging with error context
- Cross-queue traceability: preserve correlation ID when one job spawns another

### Health and Readiness Probes
- `/health` endpoint: checks API, database, Redis, BullMQ connectivity
- `/readiness` endpoint: checks if service is ready to accept traffic
- Per-dependency health with latency measurement

### Critical Flow Instrumentation
- Auth flows: login success/failure count, token refresh, registration
- Checkout flow: cart→checkout→payment→confirmation with abandonment tracking
- Booking flow: service→availability→confirm with drop-off tracking
- Publish flow: validate→build→publish with duration and success/failure
- Webhook processing: received/processed/failed count by type

### Metrics Definitions
- Counter metrics: requests by route, auth events, order completions, booking completions, webhook events
- Histogram metrics: response times by route, job durations by type
- Gauge metrics: active connections, queue depth, health status

## Implementation Scope — Frontend (REQUIRED)

### Platform Admin — Enhanced Operations Dashboard
- Extend E13-S8 Operations section (PA-09, PA-10):

#### System Health Enhancement
- **Health dashboard** (`/platform/operations`):
  - Service health cards with real-time data from `/health` endpoint: API status, DB latency, Redis latency, Queue depth
  - Health history sparkline for each service (last 24h)
  - Active alerts from health probe failures

#### Enhanced Logs Explorer
- **Logs viewer** (`/platform/operations/logs`):
  - Structured log display: timestamp, level (color-coded), service, message, correlation ID
  - Filters: service dropdown, level dropdown, tenant search, correlation ID search, date range
  - Log detail: click row → expand with full metadata (all telemetry schema fields)
  - Correlation trace: click correlation ID → show all related log entries across services (request → worker chain)
  - Auto-scroll with pause, search within results

#### Metrics Dashboard
- **Telemetry metrics** (`/platform/operations/metrics`):
  - Request rate chart: requests/minute over time
  - Error rate chart: 4xx and 5xx by route
  - Response time P50/P95/P99 chart
  - Top slow routes table
  - Queue health: depth, processing rate, failure rate per queue
  - Critical flow metrics: checkout conversion funnel, booking conversion funnel

## Constraints

- Structured logs MUST redact sensitive fields — never log passwords, tokens, raw card numbers, or PII
- Correlation IDs must propagate across async boundaries (queue jobs)
- Health probes must be lightweight — no heavy queries
- Log volume: implement log level configuration per service/module
- Use `@platform/ui` components for dashboard: MetricCard, DataTable, charts
- Use `@platform/sdk` — add health and metrics methods to platform namespace
- Log viewer must handle high volume — consider virtual scrolling
- Frontend integrates into E13-S8 Operations section

## Validation Commands

```bash
pnpm --filter @platform/api typecheck
pnpm --filter @platform/api test
pnpm --filter web-platform-admin typecheck
pnpm --filter web-platform-admin build
npx playwright test --project=web-platform-admin-smoke
```

## Handoff Instructions

Create handoff notes at `agents/epics/handoffs/YYYY-MM-DD-E10-S1-*.md`. Include:
- Telemetry schema definition
- Instrumentation points (which routes, jobs, flows)
- Correlation ID propagation mechanism
- Redaction rules and implementation
- Health/readiness probe contracts
- Frontend: operations dashboard, log viewer, metrics visualization
- Files created/modified

## Stop Conditions

- STOP if structured logging requires a log aggregation service not configured — implement with console/file output and document aggregation needs
- STOP if metrics collection requires Prometheus/Grafana not available — implement metrics collection with in-memory counters and API endpoints
- STOP if health probe dependencies (Redis, BullMQ) are not running in dev — implement graceful degradation in health checks
- STOP if log volume becomes a performance concern — implement sampling and document configuration
