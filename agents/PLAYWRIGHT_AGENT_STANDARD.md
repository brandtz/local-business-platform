# Playwright Agent Standard

This file is the canonical browser-test contract for agent-delivered UI work in this repository.

It supersedes draft or recreated copies of the same guidance by binding the standard to the current platform runtime, scripts, and artifact locations.

## Scope

Apply this standard to any task that changes behavior in:
- platform/apps/web-customer
- platform/apps/web-admin
- platform/apps/web-platform-admin

## Required Commands

Run from platform/ unless the task packet says otherwise:
- install browser runtime: pnpm playwright:install
- run all maintained smoke coverage: pnpm test:e2e:smoke
- run the full maintained browser suite: pnpm test:e2e
- open the latest local HTML report when debugging: pnpm exec playwright show-report

## Maintained Smoke Projects

The baseline smoke suite currently covers:
- web-customer-smoke
- web-admin-smoke
- web-platform-admin-smoke

If a task changes shell bootstrap, auth gating, impersonation indicators, route access, or shared navigation behavior, update the nearest smoke project before closing the task.

## Completion Rules

A UI-affecting task is not done unless:
- the implementation is complete
- relevant unit and integration coverage is updated
- Playwright coverage is added or updated for the changed user flow
- the exact Playwright command is recorded in the handoff note
- artifact paths are recorded when failures occurred or when CI evidence is required

## Planning Rules

Every UI-affecting task packet must declare one of the following:
- Playwright required
- Playwright required in downstream dependent UI task
- Playwright impact: none

Use Playwright required by default. Only defer coverage when the current task does not ship a user-visible behavior on its own.

## Artifact Contract

Playwright outputs are kept in:
- platform/playwright-report/
- platform/test-results/

CI must retain these artifacts on failure, and agent handoffs must mention them whenever a browser test failed, flaked, or required follow-up analysis.

## Locator and Flow Rules

- prefer getByRole and other user-facing locators over CSS selectors
- test real behavior, not implementation structure
- avoid waitForTimeout unless debugging a transient issue locally
- keep seeded browser state deterministic and explicit
- if a UI route needs authenticated state, use stable seeded auth hooks or shared storage state instead of brittle manual setup

## Failure Handling

When Playwright fails:
- inspect the HTML report, trace, screenshot, or video before changing code
- fix the regression or the test in the same task if the failure is within scope
- if the failure is out of scope, write a blocked or partial handoff with artifact paths and the smallest reproducible explanation
- do not disable required browser coverage to get a task over the line