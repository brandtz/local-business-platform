# Contributing

This repository contains two surfaces:
- `agents/` for planning, execution packets, and handoff records
- `platform/` for implementation code, build tooling, and runtime contracts

## Pull Request Quality Gates

Every pull request that changes `platform/` should pass these checks:
- `quality`: lint, workspace typecheck, and contract typecheck
- `test`: workspace test suite
- `build`: workspace build commands

Pull requests should explain:
- what changed
- why the change was required
- what was validated locally
- what remains intentionally out of scope

When a check fails:
- link the failing job name in the pull request description or discussion
- identify the broken workspace or package explicitly
- include the first actionable error, not only a generic failure statement

## Merge Requirements

Minimum merge requirements for `platform/` changes:
- all required CI jobs are green
- no unresolved review comments remain on affected areas
- any architecture-impacting change has an ADR or explicitly states why one was not needed
- documentation changes accompany any new workspace contract, command, or review rule

Recommended merge rule:
- prefer squash merges so the handoff-driven task history stays readable

## Artifact Visibility

Build outputs should stay easy to inspect from CI:
- frontend and package dist outputs should be visible as CI artifacts from the `build` job
- generated declaration outputs from shared packages should remain reproducible locally
- failing jobs should name the workspace that produced the failure

## Module Ownership

Ownership defaults:
- `agents/epics/` defines execution scope, task packets, and handoff flow
- `platform/apps/` contains deployable entry points only
- `platform/packages/` contains reusable cross-app code only
- `platform/infra/` contains infrastructure definitions only
- `platform/docs/` contains engineering standards and ADRs

Do not place:
- tenant-specific workflow logic in shared packages without a clear cross-app need
- private `src` imports across workspace boundaries
- CI-only conventions in app-local docs when they apply to the whole workspace

## Naming Conventions

Use these defaults unless an existing pattern already governs the area:
- package names: `@platform/<name>`
- app ids: kebab-case such as `web-customer`
- files: kebab-case for docs, PascalCase only when framework conventions require it later
- exported types: PascalCase
- exported functions and variables: camelCase

## Feature Delivery Expectations

Changes should ship with the full contract surface they affect:
- schema or data contract changes
- API or transport surface updates
- UI or route updates when user-visible behavior changes
- tests for the changed boundary
- observability or operational notes when runtime behavior changes

## ADR Workflow

Use `platform/docs/adr/0000-template.md` for any decision that changes:
- architecture boundaries
- cross-package contracts
- deployment or CI policy
- data isolation or security posture

## Agent Execution Norms

Agents should:
- read the active task packet and latest dependency handoff before editing
- keep tasks narrow and artifact-focused
- update the handoff note and task board when a task completes or blocks
- preserve local and CI command parity
