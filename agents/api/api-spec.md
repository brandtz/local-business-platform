
# API Surface Outline

The backend is organized as a REST API with tenant-aware routing and strict authorization boundaries.

## Platform Admin API

### Tenants

- POST /platform/tenants
- GET /platform/tenants
- GET /platform/tenants/{tenantId}
- PATCH /platform/tenants/{tenantId}
- POST /platform/tenants/{tenantId}/suspend
- POST /platform/tenants/{tenantId}/activate
- POST /platform/tenants/{tenantId}/impersonation-sessions

### Domains

- POST /platform/tenants/{tenantId}/domains
- POST /platform/tenants/{tenantId}/domains/{domainId}/verify
- POST /platform/tenants/{tenantId}/domains/{domainId}/promote

### Modules and Templates

- GET /platform/templates
- POST /platform/templates
- GET /platform/tenants/{tenantId}/modules
- PUT /platform/tenants/{tenantId}/modules

### Operations

- GET /platform/audit-logs
- GET /platform/jobs
- GET /platform/webhooks
- POST /platform/tenants/{tenantId}/publish

## Identity API

- POST /auth/login
- POST /auth/logout
- POST /auth/refresh
- POST /auth/password/forgot
- POST /auth/password/reset
- POST /auth/mfa/challenge
- POST /auth/mfa/verify

## Tenant Admin API

### Tenant Profile and Settings

- GET /admin/me
- GET /admin/tenant
- PATCH /admin/tenant
- GET /admin/tenant/theme
- PUT /admin/tenant/theme
- GET /admin/locations
- POST /admin/locations

### Users and Staff

- GET /admin/users
- POST /admin/users
- PATCH /admin/users/{userId}
- GET /admin/staff
- POST /admin/staff
- PATCH /admin/staff/{staffId}

### Catalog and Services

- GET /admin/catalog/categories
- POST /admin/catalog/categories
- GET /admin/catalog/items
- POST /admin/catalog/items
- PATCH /admin/catalog/items/{itemId}
- GET /admin/services
- POST /admin/services
- PATCH /admin/services/{serviceId}

### Scheduling

- GET /admin/availability
- PUT /admin/availability
- GET /admin/bookings
- PATCH /admin/bookings/{bookingId}

### Commerce

- GET /admin/orders
- GET /admin/orders/{orderId}
- PATCH /admin/orders/{orderId}
- POST /admin/orders/{orderId}/refunds

### Customers and Content

- GET /admin/customers
- GET /admin/content/pages
- POST /admin/content/pages
- PATCH /admin/content/pages/{pageId}

### Integrations and Imports

- GET /admin/payment-connections
- POST /admin/payment-connections
- POST /admin/import-jobs
- GET /admin/import-jobs
- POST /admin/import-jobs/{jobId}/publish

## Customer API

### Storefront

- GET /storefront
- GET /catalog
- GET /catalog/items/{itemId}
- GET /services
- GET /content/pages/{slug}

### Customer Account

- POST /customers/register
- POST /customers/login
- GET /customers/me
- GET /customers/orders
- GET /customers/bookings

### Cart, Checkout, and Orders

- GET /cart
- POST /cart/items
- PATCH /cart/items/{itemId}
- DELETE /cart/items/{itemId}
- POST /checkout/session
- POST /orders
- GET /orders/{orderId}

### Bookings

- GET /booking/slots
- POST /bookings
- PATCH /bookings/{bookingId}/cancel

## Cross-Cutting Rules

- all admin endpoints require authenticated tenant membership and permission checks
- all platform endpoints require platform admin role and enhanced authentication controls
- tenant context is resolved before controller execution and enforced in service queries
- idempotency keys required for payment-sensitive customer writes
- webhook endpoints must bypass browser auth but require signature verification
