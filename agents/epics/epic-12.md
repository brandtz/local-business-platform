# Epic 12: SaaS Subscription Management and Platform Billing

## Objective

Establish the platform-level subscription, packaging, and billing infrastructure so tenant businesses pay for the SaaS platform based on feature tiers and usage, and so the Platform Admin can manage the commercial lifecycle of every tenant.

## Context

The platform operator (you) needs to charge tenant businesses for their use of the platform. Tenants subscribe to packages (e.g., Starter, Professional, Enterprise) that determine which features are enabled. This epic covers: defining subscription tiers and packages, feature-gating by subscription level, integrating platform billing (Stripe Billing or equivalent), managing the tenant subscription lifecycle (trial → active → upgrade/downgrade → cancel → churn), and providing platform admin and tenant admin visibility into subscription state and invoicing.

This is distinct from Epic 11-S6 (customer-facing recurring orders) — E12 is about **tenants paying the platform**, while E11-S6 is about **end-customers subscribing to a tenant's products**.

## Scope

- subscription package and tier model with feature entitlement mapping
- feature-gating enforcement across backend API, frontend navigation, and module availability
- platform billing integration (Stripe Billing or equivalent) for recurring tenant charges
- subscription lifecycle management: trial periods, activation, upgrades, downgrades, cancellation, grace periods, and reactivation
- platform admin views for subscription management, revenue tracking, and tenant billing health
- tenant admin billing self-service: view plan, usage, invoices, and upgrade/downgrade actions

## Deliverables

- subscription package configuration schema and admin management interface
- feature entitlement engine consumed by existing module-gating in E3-S5
- billing provider integration for automated recurring invoicing and payment collection
- platform admin subscription dashboard and tenant-level billing details
- tenant admin billing page with plan/invoice visibility and plan-change actions
- churn, MRR, and subscription analytics for the platform admin dashboard

## Acceptance Criteria

- platform admin can create and modify subscription packages with feature entitlements
- when a tenant subscribes to a package, only the entitled features are accessible in their admin and storefront
- upgrading or downgrading a subscription changes feature availability within the current billing period (or next, depending on policy)
- platform billing integration charges tenants automatically on their billing cycle
- failed payments trigger dunning flows (retry, warning, grace period, suspension)
- platform admin can view MRR, active subscriptions, churn rate, and billing health
- tenant admin can view their current plan, upcoming invoice, invoice history, and trigger upgrade/downgrade

## Story Decomposition

### E12-S1: Subscription Package and Tier Model

Outcome:
- the platform has a configurable package model where each tier defines a name, price, billing interval, feature entitlement set, and usage limits

Dependencies:
- E3-S5 (module registry — packages map to module combinations)

Acceptance Signals:
- packages define which modules, transaction limits, storage limits, and premium features are included
- package changes take effect according to proration or next-billing-cycle rules
- packages can be created, modified, and deprecated by platform admin without code changes

### E12-S2: Feature Gating by Subscription Tier

Outcome:
- the existing module-gating system (E3-S5) is extended to consume subscription-tier entitlements, so that a tenant's available features reflect their current active subscription

Dependencies:
- E12-S1
- E3-S5 (module assignment)
- E5-S1 (admin navigation gating)
- E4-S3 (storefront navigation gating)

Acceptance Signals:
- backend APIs reject requests for features not included in the tenant's current subscription
- admin and storefront navigation hide or mark unavailable features not in the current tier
- upgrading a subscription immediately (or on next cycle) unlocks the additional features
- downgrading a subscription restricts features but preserves existing data in a read-only or archived state

### E12-S3: Platform Billing Integration

Outcome:
- the platform integrates with a billing provider (Stripe Billing or equivalent) to manage subscription creation, recurring invoicing, payment collection, and payment-method management for tenant businesses

Dependencies:
- E12-S1
- E8-S1 (payment connection patterns — reuse provider-abstraction approach)

Acceptance Signals:
- tenant subscription creation provisions a billing subscription with the provider
- recurring invoices are generated and collected automatically on schedule
- payment-method updates by the tenant are reflected in the billing provider
- the platform receives and processes billing webhooks for payment success, failure, and subscription state changes

### E12-S4: Subscription Lifecycle Management

Outcome:
- the platform manages the full lifecycle of a tenant's subscription including trial, activation, upgrade, downgrade, cancellation, grace period, suspension, and reactivation

Dependencies:
- E12-S1
- E12-S3
- E3-S1 (tenant lifecycle state machine — subscription state feeds into tenant state)

Acceptance Signals:
- new tenants can start with a trial period that converts to paid on expiration or upgrade
- upgrades and downgrades follow defined proration or next-cycle rules
- cancellation initiates a grace period before feature restriction or tenant suspension
- failed payments trigger a dunning sequence: retry schedule → warning notification → grace period → suspension
- reactivation after cancellation or suspension restores the tenant to their chosen plan

### E12-S5: Platform Admin Subscription and Revenue Views

Outcome:
- platform admins can view and manage all tenant subscriptions, track platform revenue metrics, and intervene in billing issues

Dependencies:
- E12-S1 through E12-S4
- E3-S6 (platform console shell)

Acceptance Signals:
- platform admin can view a subscription list with tenant name, plan, status, MRR contribution, and next billing date
- platform dashboard integrates subscription KPIs: total MRR, active subscribers, trial count, churn rate, failed-payment count
- platform admin can override subscription state (extend trial, apply credit, force-cancel, comp a plan) with audit logging
- revenue trend chart shows MRR growth over time

### E12-S6: Tenant Admin Billing Self-Service

Outcome:
- tenant admins can view their subscription details, invoice history, and initiate plan changes without contacting platform support

Dependencies:
- E12-S1 through E12-S4
- E5-S2 (tenant admin settings area)

Acceptance Signals:
- tenant admin settings includes a Billing section showing: current plan name and features, next invoice date and amount, payment method on file, and invoice history with PDF download
- tenant admin can initiate an upgrade or downgrade and see a proration preview before confirming
- tenant admin can update their payment method
- tenant admin can request cancellation with clear messaging about grace period and data retention

## Dependencies

- Epics 1 through 5 (platform infrastructure, auth, tenant lifecycle, module system, admin shell)
- E8-S1 (payment infrastructure patterns)
- Epic 11 is a sibling but independent — E12 is platform-level billing, E11-S6 is end-customer subscriptions
