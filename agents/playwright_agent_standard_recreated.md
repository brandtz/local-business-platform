# Playwright Agent Standard

## Purpose

This standard defines how agent-driven development work should implement, test, validate, and document UI changes using Playwright. The goal is to make feature delivery repeatable, reviewable, and safe for unattended or overnight agent execution.

This document is intended to live in the repository under:

`agents/PLAYWRIGHT_AGENT_STANDARD.md`

It should be treated as a working contract for all contributors, including GitHub Copilot coding agents, VS Code agents, and human developers.

---

## Core Principles

1. **Every UI change should be testable.**
2. **Every important user flow should have repeatable Playwright coverage.**
3. **Tests should verify behavior, not implementation trivia.**
4. **Stories should be scoped so an agent can complete code + tests in one pull request.**
5. **A feature is not done until the related automated tests pass.**

---

## What Agents Should Build

Agents should prefer tasks that are:

- narrowly scoped
- tied to a clear user outcome
- limited to a contained area of the application
- supported by explicit acceptance criteria
- feasible to implement and test in a single branch/PR

Good examples:

- add client-side validation to a login form and create Playwright coverage
- build a search filter and add tests for default, filtered, and empty states
- create a settings page and add navigation + save-success tests
- fix an accessibility regression and add a Playwright test to protect against recurrence

Poor examples:

- build the whole admin portal
- refactor the entire frontend architecture
- redesign all authentication flows without specific boundaries

---

## Definition of Done for UI Stories

A UI story is considered complete only when all of the following are true:

- the feature behavior matches the story requirements
- the code follows repository conventions
- Playwright tests exist for the primary success path
- Playwright tests exist for key failure or validation paths where relevant
- existing tests still pass
- lint/typecheck/build pass if applicable
- selectors used in tests are stable and intentional
- the PR includes a concise summary of what changed and what was tested

---

## Required Test Coverage Expectations

### Minimum expectation for any user-facing change

At least one Playwright test must cover the core user journey introduced or modified by the story.

### Additional coverage required when relevant

Add tests for:

- validation errors
- empty states
- loading states that affect UX
- permission or role-based visibility
- navigation success
- save/update/delete confirmation
- retry or error states for async actions
- regressions previously reported as bugs

### Smoke coverage

The application should maintain a small set of high-value smoke tests that cover:

- app loads
- login/auth entry point
- navigation to primary areas
- one representative form submission
- one representative read/search/view flow

These smoke tests should remain fast and stable enough to run on every PR.

---

## Locator Standard

Agents must prefer user-facing, resilient locators.

### Preferred order

1. `getByRole()`
2. `getByLabel()`
3. `getByPlaceholder()`
4. `getByText()` when text is stable and meaningful
5. `getByTestId()` for cases where semantic locators are insufficient or ambiguous

### Rules

- Prefer accessible roles and names whenever possible.
- Do not rely on brittle CSS selectors for core interactions.
- Do not target styling classes, generated DOM structure, or nth-child selectors unless no better option exists.
- Use `data-testid` only when needed to provide a stable testing contract.
- If `data-testid` is introduced, its naming should be intentional and human-readable.

### Example `data-testid` naming

Good:

- `login-submit-button`
- `invoice-row-total`
- `settings-save-button`
- `user-search-input`

Avoid:

- `button1`
- `row3`
- `temp-div`

---

## Test Design Rules

### Write tests around behavior

Tests should describe what the user can do and what they should observe.

Good:

- user can save profile changes and sees confirmation
- invalid email blocks submission and shows inline error

Bad:

- component state variable changes to true
- div exists inside another div

### Keep tests independent

- Tests should not depend on execution order.
- Each test should prepare its own state or use shared setup intentionally.
- Avoid cross-test data coupling.

### Keep tests focused

A test should validate one meaningful workflow, not every possible system behavior at once.

### Use explicit assertions

- Assert visible success/failure outcomes.
- Assert URL/navigation changes only when meaningful.
- Assert key persisted behavior where appropriate.

### Avoid arbitrary waits

- Do not use `waitForTimeout()` except for rare debugging scenarios.
- Prefer Playwright’s built-in waiting through locators and assertions.

---

## Authentication and Setup Standard

When the application requires authentication:

- Prefer reusable authenticated setup rather than repeating login steps in every test.
- Use Playwright setup projects or shared auth state where appropriate.
- Keep test accounts and seed data predictable.
- Do not hardcode secrets in tests.

If multiple roles exist, define role-specific fixtures or storage states for:

- admin
- standard user
- read-only or limited user

---

## Test Data Standard

Agents should use deterministic data whenever possible.

### Preferred order

1. seeded local/dev data
2. factory-generated test data
3. mocked or controlled API responses when appropriate
4. shared environment data only when stable and unavoidable

### Rules

- Avoid tests that depend on random existing production-like data.
- Use unique identifiers when creating records to prevent collisions.
- Clean up created records when the environment requires it.

---

## When to Mock vs Use Real Flows

### Prefer real flows for:

- critical user journeys
- navigation and rendering checks
- form submission workflows
- auth/session flows when stable test accounts are available

### Prefer mocking for:

- third-party failures that are hard to reproduce
- unstable or rate-limited dependencies
- edge-case UI states that are difficult to trigger reliably
- narrow UI logic validation where backend behavior is not under test

If mocking is used, document what is mocked and why.

---

## CI Expectations

All Playwright-enabled PRs should aim to produce the following in CI:

- pass/fail test result
- trace on failure or retry
- screenshot on failure when configured
- HTML or structured report artifact when feasible

### Baseline CI expectations

- smoke tests run on every PR
- broader Playwright suite runs on PR or protected branches as appropriate
- flaky tests are treated as defects, not wallpaper

### Failure artifact policy

When a Playwright test fails in CI, the workflow should preserve enough information to diagnose it without re-running blindly. Preferred artifacts include:

- Playwright trace
- screenshot
- video if already enabled
- concise test log output

---

## Agent Pull Request Expectations

Every agent-created PR for UI work should include:

- what feature/fix was implemented
- which files or modules were changed
- what Playwright tests were added or updated
- what commands were run
- any known limitations, assumptions, or follow-up items

### Example PR summary

- Added client-side validation for account settings form
- Updated save flow in `SettingsPage.tsx`
- Added Playwright coverage for valid save, invalid email, and server error toast
- Verified lint, typecheck, and Playwright smoke tests

---

## Story Template for Agent Work

Use the following format when assigning UI tasks to agents.

```md
## Goal
Describe the exact user-facing outcome.

## Scope
State what is in scope and what is out of scope.

## Acceptance Criteria
- [ ] User can ...
- [ ] User sees ...
- [ ] Validation prevents ...
- [ ] Existing flow still works ...

## Files / Areas Likely Involved
- `src/...`
- `components/...`
- `tests/e2e/...`

## Playwright Expectations
- Add or update Playwright coverage for the main success path
- Add validation/error-path coverage where relevant
- Prefer role/label/text locators before `data-testid`

## Constraints
- Do not change API contract
- Do not redesign unrelated UI
- Keep styling aligned with current design system

## Validation Commands
- `npm test`
- `npx playwright test`
- `npm run lint`
- `npm run build`
```

---

## Review Checklist

Before merging, reviewers should ask:

- Does the implementation actually satisfy the story?
- Are the Playwright tests meaningful and stable?
- Are selectors resilient?
- Did the agent avoid brittle waits and brittle selectors?
- Are failure states covered where appropriate?
- Does the PR create maintainable tests rather than noisy ones?

---

## Anti-Patterns

Agents and developers should avoid the following:

- writing tests that rely on arbitrary sleeps
- using deeply nested CSS selectors for important flows
- creating UI without adding or updating test coverage
- packing multiple unrelated features into one PR
- testing only the happy path when validation/error states are essential
- ignoring flaky tests instead of fixing them
- introducing `data-testid` everywhere when semantic locators would work

---

## Recommended Folder Conventions

Example structure:

```text
agents/
  PLAYWRIGHT_AGENT_STANDARD.md

tests/
  e2e/
    smoke/
    auth/
    settings/
    invoices/
  fixtures/
  utils/
```

Suggested conventions:

- keep end-to-end tests grouped by domain or feature
- keep reusable helpers in a shared utility area
- separate smoke tests from broader regression coverage when useful

---

## Standard Commands

Adjust these to your repo, but keep the intent consistent.

```bash
npm run lint
npm run build
npx playwright test
npx playwright test tests/e2e/smoke
npx playwright show-report
```

---

## Minimum Expectations for New UI Components

When an agent creates a new user-facing component or page, it should:

- use accessible names/roles where possible
- expose stable interaction points
- avoid unnecessary DOM complexity
- include Playwright coverage for the intended user path
- include validation or error coverage when applicable

---

## Final Rule

If an agent changes user-facing behavior and does not update or add Playwright coverage where reasonable, the task is incomplete.

This standard exists to ensure the repository can support repeatable, unattended development and testing with co