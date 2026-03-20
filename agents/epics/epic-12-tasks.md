# Epic 12 Technical Task Plan

> **Context:** This epic covers SaaS-level billing — tenants paying the platform for subscription packages. This is distinct from E11-S6 (end-customer recurring orders within a tenant). Platform billing patterns should reuse the provider-abstraction approach from E8-S1/S2 but target a separate billing-subscription concern.

## E12-S1 Subscription Package and Tier Model

Technical Tasks:
- E12-S1-T1: define subscription package schema — name, description, billing interval (monthly/annual), base price, trial duration, status (active/deprecated), and sort order for display
- E12-S1-T2: define feature entitlement schema — per-package list of enabled modules (catalog, services, bookings, quotes, portfolio, loyalty, analytics), transaction/usage limits (orders per month, storage GB, staff seats), and premium feature flags
- E12-S1-T3: implement package CRUD services for platform admin — create, update, deprecate (soft-disable for new subscriptions while grandfathering existing), and list with entitlement details
- E12-S1-T4: define package comparison read model — structured contract for displaying plan comparison tables (feature × tier matrix) in both platform admin and tenant admin contexts
- E12-S1-T5: implement package versioning strategy — when a package's entitlements change, existing subscribers retain their contracted entitlements until they explicitly upgrade or their renewal cycle applies the new terms

Test Requirements:
- unit: package validation rejects invalid pricing, missing entitlements, and conflicting module combinations; deprecation logic prevents new subscriptions while preserving existing
- integration: package CRUD persists correctly; entitlement schema is consumable by E3-S5 module gating
- API contract: platform admin package endpoints validate required fields; comparison read model provides all data needed for plan-picker UI

Handoff Focus:
- package schema, entitlement mapping contract, versioning/grandfathering rules, and comparison read model

## E12-S2 Feature Gating by Subscription Tier

Technical Tasks:
- E12-S2-T1: extend E3-S5 module assignment to consume subscription-tier entitlements as the authoritative source of feature availability — subscription entitlements override or merge with any manual module assignments
- E12-S2-T2: implement backend feature-gate middleware — API endpoints and service methods check the tenant's active subscription entitlements before processing; return structured denial (HTTP 403 with upgrade-prompt payload) for unentitled features
- E12-S2-T3: implement frontend feature-gating contract — navigation items, route guards, and call-to-action components consume entitlement state to show/hide/disable/upgrade-prompt for unentitled features
- E12-S2-T4: define grace-period and downgrade behavior — when downgrading, determine which data becomes read-only vs hidden vs archived; ensure no data loss on downgrade
- E12-S2-T5: implement usage-limit enforcement — if a package has transaction limits (e.g., 100 orders/month), enforce soft and hard limits with warning notifications before hard cutoff

Test Requirements:
- unit: feature-gate middleware correctly blocks unentitled API calls and returns structured denial; usage-limit enforcement triggers at correct thresholds
- integration: subscribing to a higher tier immediately unlocks features; downgrading restricts features without data loss; frontend navigation reflects entitlement state
- security: feature gating cannot be bypassed by direct API calls to restricted endpoints

Handoff Focus:
- entitlement consumption contract, denial response schema, downgrade data-preservation rules, usage-limit thresholds, and frontend gating integration points

## E12-S3 Platform Billing Integration

Technical Tasks:
- E12-S3-T1: define billing provider abstraction interface — create subscription, update subscription (plan change), cancel subscription, update payment method, retrieve invoices, and process webhooks; initially implement Stripe Billing adapter
- E12-S3-T2: implement tenant billing account provisioning — when a tenant subscribes, create the corresponding billing customer and subscription in the provider; store provider references (customer ID, subscription ID) encrypted and tenant-scoped
- E12-S3-T3: implement billing webhook ingestion — signature verification, idempotent processing for: invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted; reuse E8-S3 webhook patterns
- E12-S3-T4: implement payment-method management for tenants — add, update, remove payment methods through the billing provider's secure flow (Stripe Checkout or Elements for PCI compliance)
- E12-S3-T5: implement invoice retrieval service — fetch invoice history and PDF/receipt links from the billing provider for display in tenant admin billing views

Test Requirements:
- unit: billing provider adapter handles success, failure, and edge cases (card decline, expired card, insufficient funds) correctly
- integration: subscription creation provisions billing customer; webhooks update subscription state; payment-method updates reflect in provider
- security: billing provider credentials are stored securely; webhook signatures are verified; PCI-sensitive data never touches our servers directly
- operational: billing webhook failures are logged and retryable per E8-S3 patterns

Handoff Focus:
- billing provider abstraction interface, webhook event mapping, payment-method flow, and PCI compliance boundaries

## E12-S4 Subscription Lifecycle Management

Technical Tasks:
- E12-S4-T1: define tenant subscription schema — tenant reference, package reference, status (trialing/active/past_due/cancelled/suspended), current period start/end, trial end date, cancellation date, and billing provider references
- E12-S4-T2: implement subscription state machine — Trial → Active (on payment or trial conversion), Active → Past Due (on failed payment), Past Due → Active (on successful retry), Active → Cancelled (on cancellation request, enters grace period), Cancelled → Suspended (after grace period expiry), Suspended → Active (on reactivation with payment), any → Suspended (platform admin override)
- E12-S4-T3: implement upgrade/downgrade services — calculate proration (or next-cycle application), update billing provider subscription, and trigger entitlement recalculation; provide proration preview API for tenant admin UI
- E12-S4-T4: implement dunning sequence for failed payments — configurable retry schedule (e.g., retry at day 1, 3, 7), warning notifications to tenant admin at each stage (E8-S4), grace period duration before suspension, and automatic suspension trigger
- E12-S4-T5: implement trial management — trial creation on tenant provisioning (E3-S2), trial-to-paid conversion flow, trial expiration handling (prompt to subscribe or suspend)
- E12-S4-T6: connect subscription state to tenant lifecycle state machine (E3-S1) — suspended subscriptions can trigger tenant suspension; reactivated subscriptions restore tenant active state

Test Requirements:
- unit: state machine rejects invalid transitions; dunning retry schedule fires at correct intervals; proration calculation is correct for mid-cycle changes
- integration: upgrade/downgrade flows update both local subscription and billing provider; dunning sequence progresses through retry → warning → grace → suspension; trial conversion creates billing subscription
- operational: failed dunning retries are observable; subscription state changes are auditable

Handoff Focus:
- subscription state machine, dunning sequence configuration, proration logic, trial management, and tenant-lifecycle integration

## E12-S5 Platform Admin Subscription and Revenue Views

UX References: `Portal Design - Platform Admin - dashboard.html` (KPI integration), `Portal Design - Platform Admin - operations.html` (tenant list context)

Technical Tasks:
- E12-S5-T1: define platform subscription KPIs — total MRR (monthly recurring revenue), active subscriber count, trial count, churn rate (monthly), failed-payment count, and ARPU (average revenue per user); implement aggregation queries
- E12-S5-T2: build platform admin subscription list view — tenant name, plan name, subscription status, MRR contribution, next billing date, payment health indicator; with search, status filter, and plan filter
- E12-S5-T3: build platform admin tenant billing detail view — subscription history, invoice list, payment attempts, dunning state, and override actions (extend trial, apply credit, comp plan, force-cancel)
- E12-S5-T4: integrate subscription KPIs into E3-S6 platform dashboard — MRR card, subscriber count card, churn rate card, and MRR trend chart
- E12-S5-T5: implement platform admin override actions with audit logging — every manual subscription change records the platform admin actor, reason, and before/after state

Test Requirements:
- integration: KPI aggregation queries produce correct MRR, churn, and subscriber counts; override actions update subscription state and log audit entries
- UI interaction: subscription list search/filter works correctly; billing detail shows complete history; override confirms before executing
- audit: all platform admin subscription actions are traceable

Handoff Focus:
- KPI aggregation queries, subscription list/detail data contracts, override action semantics, and dashboard integration

## E12-S6 Tenant Admin Billing Self-Service

UX References: `Portal Design - Business Admin - settings and activity log.html` (Settings area — new Billing section)

Technical Tasks:
- E12-S6-T1: add Billing section to tenant admin settings — current plan card (name, features summary, price, billing interval), next invoice date and estimated amount, and payment method on file
- E12-S6-T2: implement plan-change flow — browse available plans (using E12-S1 comparison model), select upgrade/downgrade, view proration preview, confirm change
- E12-S6-T3: implement payment-method update flow — add or replace card via billing provider's secure UI component (Stripe Elements or equivalent), display current method with last-4 and expiry
- E12-S6-T4: implement invoice history view — list of past invoices with date, amount, status (paid/failed/pending), and PDF download link
- E12-S6-T5: implement cancellation flow — cancel button with confirmation dialog explaining grace period, data retention policy, and re-subscription options; cancellation reason capture (optional)

Test Requirements:
- integration: plan-change flow updates subscription and billing provider; payment-method update reflects immediately; invoice list shows all historical invoices
- UI interaction: billing section renders current plan, next invoice, and payment method correctly; plan-change shows accurate proration preview; cancellation flow explains consequences clearly
- security: payment-method flow never exposes full card numbers; billing provider handles PCI compliance

Handoff Focus:
- billing settings UI contract, plan-change proration preview, cancellation flow messaging, and billing provider UI integration

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
