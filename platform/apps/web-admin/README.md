# Web Admin

Tenant business administration portal.

Primary concerns:
- tenant-scoped settings and operations
- catalog, services, staff, content, bookings, and orders
- onboarding review and publish workflow
- integration and payment connection management

Ownership boundary:
- owns tenant-admin routes, forms, dashboards, and operational workflows
- consumes shared UI, config, and SDK packages rather than duplicating infrastructure code
- must not expose platform-global capabilities or cross-tenant data access
