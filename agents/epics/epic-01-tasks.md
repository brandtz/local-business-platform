# Epic 1 Technical Task Plan

## E1-S1 Workspace and Package Management Baseline

Technical Tasks:
- E1-S1-T1: create root workspace manifests, package manager settings, and workspace package discovery
- E1-S1-T2: define application and shared-package directory contracts with owner-facing README guidance
- E1-S1-T3: add root scripts for install, build, lint, test, and typecheck orchestration
- E1-S1-T4: document local bootstrap prerequisites such as Node, pnpm, and environment file expectations

Test Requirements:
- integration: workspace resolution works from the root for all apps and packages
- operational: a clean checkout can install and discover the standard commands
- documentation check: bootstrap instructions match actual root scripts and folder structure

Handoff Focus:
- root workspace files, package manager version, directory contract, and bootstrap assumptions

## E1-S2 Shared TypeScript and Quality Toolchain

Technical Tasks:
- E1-S2-T1: create shared tsconfig hierarchy for apps and packages
- E1-S2-T2: add shared lint and formatting configuration with repo-wide conventions
- E1-S2-T3: establish baseline unit and integration test runner configuration
- E1-S2-T4: wire quality commands into root orchestration so failures report by workspace

Test Requirements:
- integration: each workspace consumes the shared config without local divergence
- unit: sample lint and type failures are caught predictably
- operational: root quality commands fail and pass with deterministic output

Handoff Focus:
- shared config entry points, expected override rules, and quality command contract

## E1-S3 Application Shell Bootstraps

Technical Tasks:
- E1-S3-T1: initialize the NestJS API shell with config loading, baseline HTTP security hooks, and health route scaffolding
- E1-S3-T2: initialize the worker shell with queue bootstrap, health signaling pattern, and graceful shutdown/drain contract
- E1-S3-T3: initialize the three Vue application shells with routing and environment bootstrap
- E1-S3-T4: standardize startup scripts and app-level environment validation behavior

Test Requirements:
- integration: all application shells start with valid bootstraps
- API contract: API health endpoint responds predictably and leaves room for readiness expansion without breaking consumers
- operational: worker startup and shutdown behavior preserve a durable path for later queue drain semantics
- UI interaction: frontend shells render a minimal app frame without runtime config errors

Handoff Focus:
- app startup contracts, baseline hardening hooks, health-check conventions, and shared environment loading points

## E1-S4 Shared Packages and Contract Boundaries

Technical Tasks:
- E1-S4-T1: create public entry points for config, types, ui, utils, and sdk packages
- E1-S4-T2: define package dependency rules to prevent circular imports and layer inversion
- E1-S4-T3: add starter exports and package-level README guidance for intended usage
- E1-S4-T4: wire path aliases and package references for consistent local consumption

Test Requirements:
- integration: all applications can import shared packages through stable public entry points
- unit: package exports resolve correctly and do not depend on private internals
- static validation: circular dependency detection or review guard exists

Handoff Focus:
- public package APIs, import boundaries, and allowed dependency directions

## E1-S5 CI Pipeline and Repository Guardrails

Technical Tasks:
- E1-S5-T1: create CI workflow for install, lint, typecheck, test, and build
- E1-S5-T2: add caching and job partitioning strategy that matches workspace structure
- E1-S5-T3: add pull-request quality gate expectations and failure reporting guidance
- E1-S5-T4: define minimum merge requirements for green checks and artifact visibility

Test Requirements:
- operational: CI executes the same root commands used locally
- integration: failures identify the broken workspace clearly
- documentation check: merge gate documentation reflects the implemented pipeline

Handoff Focus:
- CI workflow names, required checks, cache assumptions, and merge gate rules

## E1-S6 Engineering Conventions and Decision Records

Technical Tasks:
- E1-S6-T1: define module ownership, layering rules, and naming conventions
- E1-S6-T2: create ADR template and repository location for major architecture decisions
- E1-S6-T3: document feature delivery expectations for schema, API, UI, tests, and observability
- E1-S6-T4: define agent execution norms for task scoping, handoffs, and follow-up references

Test Requirements:
- documentation check: contributor instructions cover module boundaries and review expectations
- process validation: ADR template is usable without additional interpretation
- consistency check: standards align with epic and story planning docs

Handoff Focus:
- engineering invariants that downstream agents must preserve

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
