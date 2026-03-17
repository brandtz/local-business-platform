# Platform Monorepo

This directory contains the implementation workspace for the multi-tenant local business platform.

## Local Bootstrap

Prerequisites:
- Node.js 22.12.0 or newer
- pnpm 9.15.9 or newer

Common commands:
- `pnpm setup`: install workspace dependencies
- `pnpm dev`: run all app dev entry points in parallel
- `pnpm dev:customer`: run only the customer app entry point
- `pnpm dev:admin`: run only the tenant admin app entry point
- `pnpm dev:platform`: run only the platform admin app entry point
- `pnpm dev:api`: run only the API entry point
- `pnpm dev:worker`: run only the worker entry point
- `pnpm start:api`: run the built API service
- `pnpm start:worker`: run the built worker service
- `pnpm preview:customer`: preview the customer frontend build
- `pnpm preview:admin`: preview the tenant admin frontend build
- `pnpm preview:platform`: preview the platform admin frontend build
- `pnpm typecheck:contracts`: validate cross-workspace public entrypoint consumption
- `pnpm lint`: run lint across the workspace
- `pnpm format`: check formatting across the workspace
- `pnpm format:write`: apply formatting across the workspace
- `pnpm typecheck`: run type checking across the workspace
- `pnpm test`: run tests across the workspace
- `pnpm build`: run builds across the workspace
- `pnpm check`: run lint, typecheck, test, and build in sequence

CI contract:
- `.github/workflows/platform-ci.yml` partitions validation into `quality`, `test`, and `build` jobs
- the workflow runs `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:contracts`, `pnpm test`, and `pnpm build`
- the `build` job uploads workspace dist outputs as `platform-build-artifacts` when files are present
- local command parity matters: update the workflow when root workspace command names change

Environment expectations:
- keep local environment files inside the relevant app when runtime configuration becomes app-specific
- do not commit real secrets into this repository
- use `.env.example` files as contracts when environment requirements are introduced
- app shell env contracts currently live beside each app and define only the minimal startup variables needed for scaffolding

Workspace package consumption:
- import shared packages through their public package names such as `@platform/utils`
- do not import another workspace's private `src` files directly
- use the shared TypeScript project references and `pnpm typecheck:contracts` to validate local package wiring

## Applications

- apps/web-customer: tenant storefront and customer account portal
- apps/web-admin: tenant business administration portal
- apps/web-platform-admin: platform owner control plane
- apps/api: NestJS modular monolith HTTP API
- apps/worker: asynchronous jobs, imports, notifications, and webhook processing

## Shared Packages

- packages/ui: shared UI primitives, tokens, and layout building blocks
- packages/types: shared domain contracts and enums
- packages/config: shared build and runtime configuration helpers
- packages/utils: common utilities and guards
- packages/sdk: typed API client and domain helpers

## Infrastructure

- infra/terraform: infrastructure as code for shared runtime, data, storage, and edge routing

## Docs

- docs/engineering-conventions.md: module boundaries, layering rules, and naming expectations
- docs/feature-delivery-standard.md: minimum delivery surface for implementation work
- docs/access-control-model.md: role-based versus module-based access decisions for identity and tenant authorization

## Ownership Rules

- `apps/` contains deployable application entry points only
- `packages/` contains reusable code shared between applications
- `infra/` contains deployment and infrastructure definitions only
- app-specific business logic should not be placed in shared packages unless it is intentionally cross-app
- packages must expose stable public entry points and avoid importing from app directories

This scaffold is intentionally minimal. It establishes the durable boundaries that the implementation should grow into.
