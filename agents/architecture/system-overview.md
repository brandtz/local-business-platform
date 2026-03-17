
# System Overview

## Product Surfaces

The platform is a multi-tenant, template-driven commerce and service operating system for local businesses.

It is composed of five primary surfaces.

### Customer Portal

Customer-facing web experience for each tenant domain.

Capabilities:
- browse products, services, and content
- place pickup, delivery, and in-store orders
- make, manage, and cancel bookings
- manage account, loyalty, saved payment methods, and communication preferences
- install as PWA and receive push notifications when enabled

### Customer App Shell

PWA shell shared across tenants and customized with tenant branding, modules, and navigation.

Capabilities:
- tenant-aware rendering based on domain or tenant slug
- template-driven theming and layout composition
- offline caching for storefront and account views
- notification subscription and device registration

### Business Admin Portal

Tenant-scoped operational console.

Capabilities:
- manage locations, hours, blackout dates, and fulfillment settings
- manage catalog, services, modifiers, staff, availability, and media
- process orders, bookings, refunds, cancellations, and customer support flows
- configure promotions, loyalty, SEO content, and customer communications
- manage tenant users, roles, integrations, and deployment preferences

### Platform Admin Portal

Platform-owner control plane across all tenants.

Capabilities:
- provision, suspend, archive, and impersonate tenant environments
- manage custom domains, certificates, routing, webhooks, and deployment state
- oversee payment gateway connections, plan configuration, and module access
- operate queues, imports, observability, incident response, and audit logs
- manage template library, onboarding automation, and publishing workflows

### AI Onboarding and Import Engine

Automation subsystem used during tenant creation and ongoing content ingestion.

Capabilities:
- upload menu, services, pricing sheets, and business collateral
- run OCR and extraction pipelines
- map extracted content into platform entities
- present review tasks with confidence scoring and validation errors
- publish approved content into tenant storefront and admin modules

## Architectural Style

The system is a modular monolith first, designed so modules can be extracted later if scale or isolation requirements justify it.

Primary architectural principles:
- strict tenant isolation at the application, data, cache, queue, and storage layers
- domain-driven module boundaries inside a single deployable backend
- frontend composition through shared packages and tenant configuration, not per-tenant forks
- asynchronous workflows for import, publish, notification, and webhook processing
- platform-owned infrastructure and deployment orchestration with tenant-specific runtime configuration
- secure-by-default controls with auditability for every privileged action

## Logical Backend Modules

The backend is organized into bounded modules.

- identity: authentication, MFA, sessions, password reset, device trust
- tenancy: tenant lifecycle, modules, branding, routing, and feature access
- platform-admin: impersonation, support tooling, audit access, global controls
- catalog: products, categories, modifiers, bundles, inventory hints, media
- services: services, duration rules, staff assignment, availability, booking policies
- commerce: carts, orders, order items, taxes, discounts, fulfillment, refunds
- scheduling: calendars, bookings, blackouts, capacity, reminders
- crm: customers, loyalty, segments, communication preferences, notes
- content: pages, announcements, SEO metadata, FAQs, legal content
- payments: gateway abstraction, checkout sessions, webhooks, ledger events
- onboarding: setup wizard, import jobs, extraction review, publish orchestration
- notifications: email, SMS, push, templates, delivery records
- analytics: event capture, tenant KPIs, platform KPIs, exports
- operations: jobs, webhooks, audit logs, health, observability hooks

## Request Routing Model

Tenant resolution must support all of the following:
- platform admin route space
- tenant admin route space
- tenant storefront by custom domain
- preview environments before domain cutover

Resolution order:
1. Match known platform admin domain.
2. Match verified tenant custom domain.
3. Match managed subdomain.
4. Reject unresolved domains with a safe fallback.

Resolved tenant context is propagated through request scope, authorization checks, queue payloads, object storage paths, and audit metadata.

## Deployment Model

The platform uses a shared runtime with tenant-aware configuration.

- one customer web application deployed globally
- one business admin application deployed globally
- one platform admin application deployed globally
- one backend API deployed as a modular monolith
- one worker process tier for queues and long-running jobs
- one PostgreSQL cluster with tenant-aware schema design and row-level enforcement at the application layer
- one Redis deployment for queues, cache, rate limiting, and transient coordination
- one object storage bucket namespace partitioned by tenant and artifact class

## Security Model

Security is a primary system requirement.

- all privileged actions are audit logged
- platform admin actions require stronger authentication controls than tenant users
- tenant access checks are mandatory for every tenant-scoped read and write path
- gateway secrets, webhook secrets, and domain credentials are encrypted at rest
- customer PII and operational secrets are classified and access-limited
- import artifacts are malware scanned and content-type validated before processing
- admin impersonation is explicit, time-bound, and fully recorded

## Delivery Strategy

The delivery plan is foundation-first rather than market-first.

Build order is driven by dependency and risk:
1. monorepo and platform foundations
2. identity, tenancy, and platform controls
3. domain models for content, commerce, and scheduling
4. customer and tenant-admin application shells
5. integration, automation, and operational hardening

This sequence supports the long-term goal of generating and publishing complete tenant experiences from templates without sacrificing maintainability or control.
