
# Create Business Workflow

## Goal

Provision a new tenant, configure its operational profile, generate a branded storefront and admin environment, and publish it safely.

## Actors

- platform admin
- tenant owner
- onboarding automation engine
- review operator when confidence or compliance thresholds fail

## Workflow Stages

### 1. Tenant Provisioning

- create tenant record
- assign primary owner user
- select default vertical template and enabled modules
- generate managed subdomain and preview environment
- initialize default theme, navigation, content, tax, currency, and timezone settings

### 2. Brand and Identity Setup

- upload logo, brand assets, and optional hero media
- define brand colors, typography preset, and layout template
- configure business name, short description, contact channels, and legal metadata

### 3. Operational Configuration

- configure locations, business hours, blackout windows, and fulfillment methods
- choose ordering, booking, or hybrid operating modes per tenant
- define tax behavior, service charge rules, tipping behavior, and cancellation policies
- invite initial staff and tenant admins

### 4. Payments and Integrations

- connect payment gateway provider
- validate webhook endpoints and credential storage
- configure refunds, capture strategy, payout metadata, and supported payment methods
- optionally connect email, SMS, push, and analytics providers if tenant-scoped configuration is supported

### 5. Data Ingestion

- upload menu, catalog, service list, pricing sheets, and media assets
- accept manual entry, CSV import, PDF/image upload, or guided form completion
- create import job and attach uploaded artifacts

### 6. AI Extraction and Mapping

- run OCR and document classification
- extract candidate entities, prices, durations, categories, modifiers, and policies
- map extracted content into catalog, service, content, and operating configuration models
- score confidence and flag ambiguities for review

### 7. Review and Approval

- present staged data in tenant admin review workspace
- require approval for low-confidence fields, policy mismatches, or unsupported constructs
- run validation checks for pricing integrity, schedule validity, and required legal/business fields

### 8. Publish

- generate storefront configuration from chosen template and tenant data
- publish content to preview environment
- run smoke checks for storefront, admin access, payments, and notifications
- if checks pass, allow production publish and domain cutover

### 9. Domain Activation

- connect custom domain or keep managed subdomain
- verify ownership and certificate issuance
- switch tenant primary domain only after publish is healthy

### 10. Post-Publish Hardening

- seed analytics dashboards
- schedule backup/export jobs where applicable
- enable monitoring alerts
- create onboarding completion audit record

## Failure Handling

- import failures create resumable jobs, never silent drops
- publish failures preserve last known good live config
- domain activation failures do not block tenant usage on managed subdomain
- payment connection failures block checkout but not admin configuration work

## Security Controls

- all onboarding actions tied to acting user and tenant
- uploads scanned and content-typed before processing
- secrets stored encrypted and never echoed back to client
- preview links are access-controlled and expire
