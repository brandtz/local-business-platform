
# Epic 1: Platform Foundation and Monorepo Setup

## Objective

Create the sustainable engineering foundation for the platform so every later module ships on stable tooling, shared contracts, and enforceable conventions.

## Scope

- initialize monorepo structure for apps, packages, and infrastructure
- establish TypeScript, linting, formatting, testing, and CI standards
- define shared environment configuration and secret management approach
- set up design tokens, shared contracts, and common utility packages
- define architecture decision record process and module ownership conventions

## Deliverables

- workspace package management and pipeline configuration
- base NestJS API app, worker app, and three Vue frontend shells
- shared packages for config, types, ui, utils, and sdk
- baseline CI pipeline for lint, typecheck, test, and build
- contributor and agent guidance updated to match real repo shape

## Acceptance Criteria

- all apps build in CI from a clean checkout
- shared type contracts can be imported without circular dependency issues
- test, lint, and typecheck commands run from repo root
- environment loading is standardized and documented

## Story Decomposition

### E1-S1: Workspace and Package Management Baseline

Outcome:
- the repository has a stable workspace structure, package manager, root scripts, and repeatable local setup path

Dependencies:
- none

Acceptance Signals:
- root workspace config resolves all apps and packages
- a new contributor can install dependencies and discover standard commands from documentation

### E1-S2: Shared TypeScript and Quality Toolchain

Outcome:
- TypeScript, linting, formatting, and testing conventions are enforced consistently across all applications and packages

Dependencies:
- E1-S1

Acceptance Signals:
- shared tsconfig, lint, and format settings are consumed by all workspaces
- quality commands fail predictably on violations in any app or package

### E1-S3: Application Shell Bootstraps

Outcome:
- API, worker, customer web, tenant admin, and platform admin applications all have real framework bootstraps and health-check startup paths

Dependencies:
- E1-S1
- E1-S2

Acceptance Signals:
- each app starts with a minimal but valid framework runtime
- shared environment loading works across all application entry points

### E1-S4: Shared Packages and Contract Boundaries

Outcome:
- config, types, ui, utils, and sdk packages exist with clear ownership and import boundaries

Dependencies:
- E1-S2

Acceptance Signals:
- shared packages expose stable public entry points
- cross-package imports do not create circular references

### E1-S5: CI Pipeline and Repository Guardrails

Outcome:
- pull-request quality gates exist for install, lint, typecheck, test, and build

Dependencies:
- E1-S2
- E1-S3
- E1-S4

Acceptance Signals:
- CI runs the same core commands used locally
- failures clearly identify which workspace or package broke the pipeline

### E1-S6: Engineering Conventions and Decision Records

Outcome:
- architectural conventions, module ownership rules, and decision-record workflow are documented and enforced socially before feature work begins

Dependencies:
- E1-S1

Acceptance Signals:
- contributor guidance explains module boundaries, testing expectations, and change-management rules
- the repository has a standard format for architecture decisions and implementation notes

## Dependencies

- none
