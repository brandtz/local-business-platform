# Test Requirements Standard

This file defines the minimum test expectations for task-level implementation.

## Test Layers

Every story should identify the relevant layers from below.

- unit tests: pure logic, validation, calculators, policies, guards, and adapters
- integration tests: module-to-module behavior, database interactions, queue behavior, and persistence correctness
- API contract tests: request and response behavior for public or admin endpoints
- UI interaction tests: route rendering, state transitions, form validation, and access gating
- end-to-end tests: high-value cross-surface flows such as login, checkout, booking, onboarding, publish, and refunds
- operational tests: job retries, webhook idempotency, logging, alerting, and rollback behavior

## Playwright Baseline

Use Playwright as the browser-test runner for maintained UI surfaces.

Current baseline projects:
- web-customer-smoke
- web-admin-smoke
- web-platform-admin-smoke

Apply these rules:
- shell, route-access, auth-state, impersonation, onboarding, publish, and other user-visible flow changes should update or add Playwright coverage
- when a change affects shared shell or auth behavior, prefer extending smoke coverage first and then add story-specific flows as needed
- do not close a UI-affecting task without recording the exact Playwright command that passed

## Story-Type Expectations

Foundation stories should include:
- build validation
- workspace integration checks
- configuration loading checks

Security stories should include:
- authorization denial cases
- authentication success and failure cases
- audit and traceability verification

Domain model stories should include:
- persistence correctness
- validation and state transition rules
- API contract coverage for CRUD or query surfaces

Frontend shell stories should include:
- route access behavior
- state and rendering under allowed and denied contexts
- responsive and error-state handling where relevant
- Playwright coverage for shell bootstrap or navigation behavior when the story changes browser-visible behavior

Integration stories should include:
- adapter unit coverage
- webhook or provider retry behavior
- failure-path and degraded-mode coverage

Publishing and onboarding stories should include:
- resumability
- idempotency
- review and approval controls
- rollback or last-known-good behavior

## Test Output Requirements for Handoff

A completed task should report:
- which test layers were added or updated
- what key cases were covered
- which Playwright projects and commands were run when applicable
- where Playwright artifacts were written when failures or CI evidence mattered
- what remains intentionally uncovered and why
