# Web Customer

Tenant storefront and customer account portal.

Primary concerns:
- domain-based tenant resolution
- template-driven storefront rendering
- account, ordering, booking, and content surfaces
- PWA installation and notification opt-in

Ownership boundary:
- owns customer-facing routes, storefront composition, and account shell behavior
- consumes shared contracts from `packages/` and tenant configuration from the API
- must not contain platform-admin or tenant-admin operational logic
