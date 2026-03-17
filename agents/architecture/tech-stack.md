
# Technology Stack

## Monorepo Tooling

- package manager: pnpm
- workspace orchestration: Turborepo
- language: TypeScript
- linting: ESLint
- formatting: Prettier
- testing: Vitest, Playwright, Supertest

## Frontend

- Vue 3
- Vite
- Vue Router
- Pinia
- Tailwind CSS
- VueUse
- vite-plugin-pwa
- Zod for client-side contract validation where needed

Frontend applications:
- web-customer: tenant storefront and customer account portal
- web-admin: tenant business admin portal
- web-platform-admin: platform owner control plane

## Backend

- NestJS modular monolith
- REST API first
- OpenAPI generation from source contracts
- Zod or class-validator at the boundary layer
- BullMQ workers for asynchronous jobs

Backend services:
- api: synchronous HTTP surface
- worker: async jobs, imports, webhooks, notifications, publish pipeline

## Data and Persistence

- PostgreSQL as primary relational store
- Prisma ORM and migrations
- Redis for queues, cache, rate limiting, and transient coordination
- S3-compatible object storage for uploads, generated assets, and exports

## Infrastructure and Delivery

- Vercel or equivalent edge hosting for frontend apps
- Fly.io, Render, or container platform for API and workers
- Supabase-managed or cloud-managed PostgreSQL
- Terraform for infrastructure as code
- GitHub Actions for CI and deployment orchestration

## External Integrations

- Stripe and Square for payment processing abstractions
- Resend for transactional email
- Twilio for SMS and OTP delivery where required
- Firebase Cloud Messaging for push notifications
- Cloudflare for DNS, WAF, and domain management if adopted

## Observability and Security

- Sentry for error tracking and tracing
- PostHog for product analytics and feature analytics
- structured logging with request and tenant correlation IDs
- secret management through platform environment provider
- dependency scanning and container scanning in CI

## Shared Packages

- packages/ui: design system components and tokens
- packages/types: shared contracts and enums
- packages/config: shared tsconfig, eslint, env, and runtime config helpers
- packages/utils: shared utilities, formatting, and guards
- packages/sdk: typed API client and domain helpers

## Non-Functional Standards

- no implicit cross-module database access
- all external integrations behind adapters
- all background jobs idempotent and retry-safe
- every write path emits audit events where privilege or money is involved
- production readiness requires tests, observability, rollback safety, and migration safety
