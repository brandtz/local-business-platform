# Feature Delivery Standard

Every non-trivial feature should leave behind a complete change surface, not only code.

## Required Delivery Areas

- data or schema impact
- service or API contract impact
- UI or route impact when behavior is user-facing
- automated test impact
- observability or operational impact

## Minimum Expectation by Change Type

Backend or schema changes should include:
- domain contract update
- tests for happy path and at least one negative path
- operational note if runtime behavior or resource usage changes

Frontend changes should include:
- route or UI contract update
- tests for changed rendering or configuration behavior
- note on any dependency on backend contract readiness

Cross-package changes should include:
- public entrypoint validation
- dependency-boundary review
- docs update if consumers need to change import or usage patterns

## Observability Expectation

Before feature-complete is claimed, define:
- how failure will be detected
- where operators will look first
- what contract should fail loudly versus degrade gracefully
