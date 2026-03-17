# Agentic Implementation Pack

This document defines the **full markdown file set** that should exist in the repository to guide agentic AI models (Copilot, Codex, etc.) in implementing the Local Business SaaS Platform.

Agents must treat each file as a **bounded context specification**.

All implementation work should reference these files.

---

# Repository Structure (Monorepo)

Agents must initialize the repository with the following structure.

```
platform/

apps/
  web-customer/
  web-admin/
  api/

packages/
  ui/
  config/
  types/
  utils/
  eslint-config/

infra/
  terraform/

agents/
  epics/
  architecture/
  api/
  database/
  workflows/
  integrations/
  ai/

scripts/

```

All documents described below live inside `/agents`.

---

# agents/README.md

## Purpose

Defines rules for AI agents contributing to the repository.

## Development Rules

Agents must follow these constraints.

### Code Standards

- TypeScript required
- No `any` without justification
- Strict null checks enabled
- All new entities include tenant_id if tenant scoped

### Architecture

- Modular monolith
- NestJS backend
- Vue 3 frontend

### Testing

Each feature must include

- unit tests
- integration tests
- API contract tests

### Database

All schema changes require

- Prisma migration
- updated schema docs

---

# agents/architecture/system-overview.md

## Core System Components

The platform consists of four primary surfaces.

### Customer App

Customer-facing PWA.

Capabilities

- browse catalog
- place order
- make booking
- loyalty
- push notifications


### Business Admin Portal

Tenant management console.

Capabilities

- menu/services
- order/booking management
- analytics
- staff management


### Platform Admin

Internal control plane.

Capabilities

- create tenants
- attach domains
- enable modules
- connect integrations


### AI Onboarding Engine

Automated business setup pipeline.

---

# agents/architecture/tech-stack.md

## Frontend

Framework

Vue 3

Tooling

Vite
Pinia
Vue Router
Tailwind

PWA

vite-plugin-pwa


## Backend

NestJS

Language

TypeScript


## Database

PostgreSQL

ORM

Prisma


## Messaging / Jobs

BullMQ
Redis


## Storage

S3 compatible storage


## Notifications

Firebase Cloud Messaging

Email
Resend

SMS
Twilio


## Hosting

Frontend
Vercel

Backend
Fly.io

Database
Supabase


## Observability

Sentry
PostHog

---

# agents/database/schema.md

This document defines the **core database entities**.

All tables must include

- id (UUID)
- created_at
- updated_at

Tenant tables include

- tenant_id


## Tenant

Fields

- id
- name
- display_name
- vertical
- timezone
- currency


## TenantDomain

Fields

- tenant_id
- domain
- verified


## User

Fields

- id
- email
- password_hash


## TenantUser

Fields

- tenant_id
- user_id
- role


## CatalogCategory

Fields

- tenant_id
- name
- sort_order


## CatalogItem

Fields

- tenant_id
- category_id
- name
- description
- price
- image_url


## Order

Fields

- tenant_id
- customer_id
- status
- total


## OrderItem

Fields

- order_id
- catalog_item_id
- quantity


## Customer

Fields

- tenant_id
- name
- email


## Reservation

Fields

- tenant_id
- customer_id
- date
- party_size

---

# agents/api/api-spec.md

All APIs are RESTful.

## Tenant APIs

POST /tenants

Create tenant.

GET /tenants/{id}

Retrieve tenant.


## Catalog APIs

GET /catalog

POST /catalog/items

PUT /catalog/items/{id}


## Orders

POST /orders

GET /orders

PUT /orders/{id}


## Booking

POST /appointments

GET /appointments


## Payments

POST /checkout


---

# agents/workflows/create-business.md

Defines the super admin workflow for creating a new tenant.

## Step 1

Create tenant


## Step 2

Upload logo


## Step 3

Select vertical preset


## Step 4

Connect payment provider


## Step 5

Upload menu or services


## Step 6

AI parsing


## Step 7

Human review


## Step 8

Publish site


---

# agents/integrations/payments.md

Defines payment abstraction layer.

Interface

```
createCheckoutSession()
refundPayment()
getTransactionStatus()
```

Adapters

StripeAdapter
SquareAdapter

---

# agents/ai/import-engine.md

Defines the AI pipeline for ingesting business data.

Pipeline

1 upload
2 OCR
3 LLM extraction
4 JSON validation
5 human review


Output schema

```
{
  "category": "Burgers",
  "item": "Classic Burger",
  "price": 12.99
}
```

---

# agents/epics/epic-1-platform-foundation.md

Goal

Initialize monorepo and baseline infrastructure.

Tasks

- create turborepo
- setup typescript
- configure eslint
- configure CI


# agents/epics/epic-2-auth-tenants.md

Goal

Implement authentication and tenant RBAC.

Tasks

- user login
- tenant membership
- role permissions


# agents/epics/epic-3-business-onboarding.md

Goal

Super-admin onboarding workflow.

Tasks

- tenant creation UI
- logo upload
- domain attach
- module selection


# agents/epics/epic-4-catalog.md

Goal

Restaurant catalog system.

Tasks

- categories
- items
- modifiers


# agents/epics/epic-5-ordering.md

Goal

Customer ordering engine.

Tasks

- cart
- checkout
- payment integration


# agents/epics/epic-6-bookings.md

Goal

Service business booking system.

Tasks

- service catalog
- staff availability
- appointment booking


# agents/epics/epic-7-import-engine.md

Goal

AI powered catalog import.

Tasks

- file upload
- OCR
- LLM extraction


# agents/epics/epic-8-notifications.md

Goal

Messaging system.

Tasks

- email
- sms
- push


# agents/epics/epic-9-analytics.md

Goal

Tenant analytics dashboard.

Tasks

- revenue charts
- order metrics


# agents/epics/epic-10-mobile-packaging.md

Goal

Capacitor mobile builds.

Tasks

- ios wrapper
- android wrapper

---

# Final Directive For AI Agents

Agents must implement the system in the following order.

1 platform foundation
2 auth and tenants
3 onboarding workflow
4 catalog
5 ordering
6 payment adapters
7 AI import
8 notifications
9 analytics
10 mobile packaging

Agents must not skip architectural constraints defined in the architecture folder.

