# Comprehensive UX Design Brief — Three Portal System

> **Purpose:** Provide a Figma-ready specification with enough detail for a UX designer to generate wireframes, user flows, and high-fidelity prototypes for every planned screen across all three portals.
>
> **Source of truth:** Epics 01–10 task plans, architecture docs, workflow specs, API spec, Prisma schema, and tenant lifecycle state machine.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Design Tokens & Shared Vocabulary](#design-tokens--shared-vocabulary)
3. [Portal 1 — Customer Portal (web-customer)](#portal-1--customer-portal-web-customer)
4. [Portal 2 — Business Admin Portal (web-admin)](#portal-2--business-admin-portal-web-admin)
5. [Portal 3 — Platform Admin Portal (web-platform-admin)](#portal-3--platform-admin-portal-web-platform-admin)
6. [Cross-Portal Patterns](#cross-portal-patterns)
7. [Tenant Lifecycle & Operational Workflows](#tenant-lifecycle--operational-workflows)
8. [Security & Audit Requirements](#security--audit-requirements)
9. [Deployment & Publishing Workflow](#deployment--publishing-workflow)
10. [Technical Infrastructure Notes for UX](#technical-infrastructure-notes-for-ux)
11. [Acceptance Criteria Summary](#acceptance-criteria-summary)

---

## System Overview

### Product Scope

A **multi-tenant, template-driven commerce and service operating system** for local businesses (restaurants, retail, services) with three primary user-facing portals operating against a modular monolith backend.

### Five Primary Product Surfaces

| # | Surface | App Key | Default Port |
|---|---------|---------|-------------|
| 1 | Customer Portal | `web-customer` | 4173 |
| 2 | Business Admin Portal | `web-admin` | 4174 |
| 3 | Platform Admin Portal | `web-platform-admin` | 4175 |
| 4 | Customer App Shell | (PWA infra shared across tenants) | — |
| 5 | AI Onboarding & Import Engine | (background worker) | — |

### Supported Business Verticals

- **Restaurant** — ordering + optional booking
- **Retail** — ordering
- **Service / Salon / Spa** — booking + optional ordering
- **Fitness** — booking (classes)
- **Hybrid / Custom** — any combination of modules

### Module System

Tenant features are toggled by modules. Navigation, capabilities, and UI sections dynamically show/hide based on enabled modules:

| Module | Controls |
|--------|----------|
| Ordering | Cart, checkout, fulfillment, order management |
| Booking | Availability, slot selection, booking management |
| Loyalty | Points, tiers, rewards |
| Content | Pages, SEO, announcements |
| Analytics | Dashboards, reporting |

---

## Design Tokens & Shared Vocabulary

The platform uses a centralized design token system (`@platform/ui`) that provides:

| Token Category | Examples |
|----------------|----------|
| Colors | `--color-primary`, `--color-surface`, `--color-error`, `--color-success` |
| Typography | `--font-heading`, `--font-body`, `--font-mono` |
| Spacing | 4 px grid: `--space-1` (4 px) through `--space-8` (32 px) |
| Radii | `--radius-sm` (4 px), `--radius-md` (8 px), `--radius-lg` (16 px) |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |

### Shell States (all portals)

Every portal renders one of five mutually exclusive shell states. Designers should create a screen for each:

| State | When | Visual |
|-------|------|--------|
| `loading` | Bootstrap in progress | Centered spinner / skeleton |
| `error` | Bootstrap failure | Error message + retry CTA |
| `anonymous` | No auth token | Login / register form |
| `authenticated` | Logged in, ready | Full app chrome + router outlet |
| `maintenance` | Platform-wide downtime | Maintenance banner |

### Component Primitives (shared)

- **AppShell** — Top bar + sidebar nav + content area
- **DataTable** — Sortable, filterable, paginated table with bulk-select
- **FormSection** — Grouped form fields with validation states
- **StatusBadge** — Colored pill (`draft`, `active`, `suspended`, `archived`, etc.)
- **ConfirmDialog** — Modal confirmation for destructive actions
- **Toast** — Success / error / info auto-dismiss
- **EmptyState** — Illustration + CTA for first-time screens
- **SkeletonLoader** — Shimmer placeholder during data fetch

---

## Portal 1 — Customer Portal (web-customer)

### Purpose

Tenant-scoped, customer-facing experience for browsing products/services, making purchases/reservations, and managing accounts. Each tenant's storefront loads via **custom domain** or **managed subdomain** with correct branding and configuration.

### Information Architecture

```
/ (Storefront Home)
├── /menu (or /catalog)
│   └── /menu/:categorySlug
│       └── /menu/:categorySlug/:itemSlug      → Item detail
├── /services
│   └── /services/:serviceSlug                  → Service detail + book CTA
├── /cart                                        → Cart summary
│   └── /checkout                               → Checkout flow
│       └── /checkout/confirmation/:orderId     → Order confirmation
├── /book
│   └── /book/:serviceSlug                      → Availability picker
│       └── /book/confirmation/:bookingId       → Booking confirmation
├── /account
│   ├── /account/profile                         → Edit profile
│   ├── /account/orders                          → Order history list
│   │   └── /account/orders/:orderId             → Order detail
│   ├── /account/bookings                        → Booking history list
│   │   └── /account/bookings/:bookingId         → Booking detail
│   ├── /account/loyalty                         → Points & rewards
│   ├── /account/payment-methods                 → Saved cards
│   └── /account/notifications                   → Notification preferences
├── /pages/:slug                                 → Content page (About, FAQ, etc.)
├── /login
├── /register
└── /reset-password
```

### Screen Inventory & Wireframe Specs

---

#### CP-01: Storefront Home

| Attribute | Detail |
|-----------|--------|
| **Route** | `/` |
| **Purpose** | Landing page for tenant storefront |
| **Dynamic elements** | Tenant logo, hero image, brand colors, typography — all pulled from tenant config |
| **Sections** | Hero banner, featured categories/services, announcements/promotions (if any), business info (hours, address), navigation to catalog/services/booking |
| **Module gating** | If ordering disabled → hide catalog CTA. If booking disabled → hide services/book CTA. |
| **Responsive** | Mobile-first. Hero stacks vertically. Categories become horizontal scroll. |

---

#### CP-02: Catalog / Menu Browse

| Attribute | Detail |
|-----------|--------|
| **Route** | `/menu`, `/menu/:categorySlug` |
| **Purpose** | Browse products organized by categories |
| **Layout** | Category sidebar (desktop) / horizontal tabs (mobile) + item grid/list |
| **Item card** | Image, name, short description, base price, "Add to Cart" button |
| **Search** | Search bar filtering by item name |
| **Filters** | Category, availability (in stock), price range |
| **Empty state** | "No items found" with suggestion to browse all |

---

#### CP-03: Item Detail

| Attribute | Detail |
|-----------|--------|
| **Route** | `/menu/:categorySlug/:itemSlug` |
| **Purpose** | Full item view with modifiers and add-to-cart |
| **Sections** | Image gallery, name, full description, base price, modifier groups (size, add-ons, etc.), quantity selector, "Add to Cart" CTA |
| **Modifier UX** | Each modifier group rendered as radio (choice), checkbox (multi-select), or stepper (quantity) based on group type. Required modifiers show validation. Price adjustments shown inline. |
| **Price display** | Running total updates as modifiers change |

---

#### CP-04: Cart

| Attribute | Detail |
|-----------|--------|
| **Route** | `/cart` |
| **Purpose** | Review cart before checkout |
| **Line items** | Item name, selected modifiers, quantity, line total, remove/edit buttons |
| **Running total** | Subtotal (server-side calculations — no client-side arithmetic trusted) |
| **Actions** | "Continue Shopping", "Proceed to Checkout" |
| **Empty state** | "Your cart is empty" + CTA to browse menu |

---

#### CP-05: Checkout

| Attribute | Detail |
|-----------|--------|
| **Route** | `/checkout` |
| **Purpose** | Complete purchase |
| **Sections (sequential)** | |
| 1. Fulfillment type | Radio: Pickup / Delivery / In-store (based on tenant & location capabilities) |
| 2. Fulfillment details | Pickup: select location + time. Delivery: enter address + delivery time. |
| 3. Pricing breakdown | Subtotal, modifiers, discounts, tax(location-based), service charges, fees, tip selector (preset %, custom), total |
| 4. Payment | Saved payment method selector **or** new card entry (Stripe/Square embeds). Display tokens only — never show full card numbers. |
| 5. Confirm | Order summary + "Place Order" CTA |
| **Validation** | All required fields validated in real-time. Submission blocked until valid. Server revalidation on submit. |

---

#### CP-06: Order Confirmation

| Attribute | Detail |
|-----------|--------|
| **Route** | `/checkout/confirmation/:orderId` |
| **Purpose** | Post-purchase confirmation |
| **Content** | Order number, timestamp, itemized receipt (items + modifiers + pricing breakdown), fulfillment details (location, estimated ready/delivery time), payment confirmation, "View Order Status" link |

---

#### CP-07: Services Browse

| Attribute | Detail |
|-----------|--------|
| **Route** | `/services` |
| **Purpose** | Browse available services |
| **Layout** | Card grid of services |
| **Card content** | Service name, description snippet, duration, base price, "Book Now" CTA |
| **Filters** | Category/type, staff, availability |

---

#### CP-08: Service Detail

| Attribute | Detail |
|-----------|--------|
| **Route** | `/services/:serviceSlug` |
| **Purpose** | Full service info + booking entry point |
| **Sections** | Images, full description, duration, pricing (base + add-ons), available staff, cancellation policy, "Book This Service" CTA |

---

#### CP-09: Booking Availability Picker

| Attribute | Detail |
|-----------|--------|
| **Route** | `/book/:serviceSlug` |
| **Purpose** | Select date, time, staff, location |
| **Step 1** | Date picker (calendar widget) |
| **Step 2** | Available time slots (computed from location hours, service duration, staff availability, blackout windows, lead time). Unavailable slots shown greyed with reason tooltip. |
| **Step 3** | Staff preference (optional or required depending on service config) |
| **Step 4** | Location selector (if multi-location) |
| **Step 5** | Add-ons selection |
| **Confirmation panel** | Service name, date/time, staff, location, pricing, deposit/prepayment terms, cancellation policy |
| **CTA** | "Confirm Booking" |

---

#### CP-10: Booking Confirmation

| Attribute | Detail |
|-----------|--------|
| **Route** | `/book/confirmation/:bookingId` |
| **Content** | Booking ID, service details, date/time, assigned staff, location, cancellation policy + deadline, pricing/deposit info, "View Booking" link |

---

#### CP-11: Account Dashboard

| Attribute | Detail |
|-----------|--------|
| **Route** | `/account` |
| **Purpose** | Account overview |
| **Sections** | Profile summary, quick links (orders, bookings, loyalty, payment methods), recent activity |

---

#### CP-12: Profile Settings

| Attribute | Detail |
|-----------|--------|
| **Route** | `/account/profile` |
| **Fields** | Name, email, phone, address(es), communication preferences (email/SMS/push opt-in per category) |
| **Actions** | Save, change password link |

---

#### CP-13: Order History

| Attribute | Detail |
|-----------|--------|
| **Route** | `/account/orders` |
| **Layout** | Paginated list with: order ID, date, items summary, total, status badge |
| **Filters** | Status filter, date range |
| **Actions** | View detail, re-order |

---

#### CP-14: Order Detail

| Attribute | Detail |
|-----------|--------|
| **Route** | `/account/orders/:orderId` |
| **Content** | Full receipt, item breakdown with modifiers, pricing detail (subtotal, tax, fees, tip), fulfillment status timeline (visual stepper), contact/support link |

---

#### CP-15: Booking History

| Attribute | Detail |
|-----------|--------|
| **Route** | `/account/bookings` |
| **Layout** | List with: booking ID, service name, date/time, staff, status badge |
| **Sections** | Upcoming (top), Past (below) |
| **Actions** | View detail, cancel (if within policy window) |

---

#### CP-16: Booking Detail

| Attribute | Detail |
|-----------|--------|
| **Route** | `/account/bookings/:bookingId` |
| **Content** | Service info, date/time, duration, staff, location, pricing, cancellation policy + deadline, check-in status |
| **Actions** | Cancel (if within window), reschedule |

---

#### CP-17: Loyalty & Rewards

| Attribute | Detail |
|-----------|--------|
| **Route** | `/account/loyalty` |
| **Sections** | Points balance (large display), tier status + progress bar, points history (earning/redemption log), available rewards catalog with redemption CTAs, tier benefits list |
| **Module gating** | Only visible if loyalty module enabled for tenant |

---

#### CP-18: Payment Methods

| Attribute | Detail |
|-----------|--------|
| **Route** | `/account/payment-methods` |
| **Content** | List of saved payment tokens (last 4 digits, brand icon, expiry), default indicator, add/remove actions |
| **Security** | Display tokens only. Never show full card numbers. |

---

#### CP-19: Content Page

| Attribute | Detail |
|-----------|--------|
| **Route** | `/pages/:slug` |
| **Content** | Rich text rendered from CMS (About, FAQ, Policies, etc.) |
| **SEO** | Meta title, description, OG image applied per page |

---

#### CP-20: Login / Register / Password Reset

| Attribute | Detail |
|-----------|--------|
| **Routes** | `/login`, `/register`, `/reset-password` |
| **Login** | Email + password, MFA prompt (if enabled), "Forgot password" link, "Register" link |
| **Register** | Name, email, phone, password (with strength indicator), terms acceptance |
| **Reset** | Email input → confirmation → new password form |

---

#### CP-PWA: Progressive Web App

| Feature | Detail |
|---------|--------|
| Installation prompt | Show on supported devices after engagement threshold |
| Offline support | Cache storefront, catalog (read-only), past orders/bookings |
| Home screen icon | Tenant-branded app icon |
| Push notifications | Order status, booking reminders, promotions (opt-in) |
| Service worker | Static assets, tenant content, user data (last-known-good) |

---

## Portal 2 — Business Admin Portal (web-admin)

### Purpose

Tenant-scoped operational console for business owners and staff to manage inventory, process transactions, and operate the business.

### User Roles & Capabilities

| Role | Capabilities |
|------|-------------|
| **Owner** | All capabilities |
| **Admin** | `catalog:write`, `orders:manage`, `staff:manage`, `content:publish` |
| **Manager** | `catalog:write`, `orders:manage`, `content:publish` |
| **Staff** | `orders:manage` (limited order processing only) |

> **Module-based narrowing:** Disabled modules further restrict role capabilities. If ordering is disabled, even owners cannot access order management.

### Information Architecture

```
/ (Dashboard)
├── /dashboard                                   → Overview & key metrics
├── /catalog
│   ├── /catalog/categories                      → Category list + CRUD
│   ├── /catalog/items                           → Item list + CRUD
│   │   └── /catalog/items/:id                   → Item edit
│   ├── /catalog/modifiers                       → Modifier groups
│   └── /catalog/import                          → Bulk import/export
├── /services
│   ├── /services/list                           → Service list + CRUD
│   │   └── /services/list/:id                   → Service edit
│   └── /services/availability                   → Availability rules
├── /orders
│   ├── /orders/active                           → Active orders queue
│   ├── /orders/history                          → Past orders
│   └── /orders/:id                              → Order detail + processing
├── /bookings
│   ├── /bookings/calendar                       → Calendar view
│   ├── /bookings/list                           → Bookings list
│   └── /bookings/:id                            → Booking detail
├── /customers
│   ├── /customers/list                          → Customer list + CRM
│   │   └── /customers/:id                       → Customer profile
│   └── /customers/loyalty                       → Loyalty program config
├── /staff
│   ├── /staff/list                              → Staff member list
│   │   └── /staff/:id                           → Staff detail + schedule
│   └── /staff/scheduling                        → Team availability view
├── /content
│   ├── /content/pages                           → Page list + editor
│   │   └── /content/pages/:id                   → Page edit
│   └── /content/announcements                   → Promos & announcements
├── /locations
│   ├── /locations/list                          → Location list
│   │   └── /locations/:id                       → Location detail + hours
│   └── /locations/fulfillment                   → Fulfillment settings
├── /settings
│   ├── /settings/business-profile               → Business identity & brand
│   ├── /settings/payments                       → Payment gateway config
│   ├── /settings/notifications                  → Email/SMS config
│   ├── /settings/domain                         → Custom domain
│   ├── /settings/users                          → Tenant user management
│   │   └── /settings/users/invite               → Invite user
│   └── /settings/integrations                   → Third-party integrations
├── /activity                                     → Audit / activity log
└── /analytics                                    → Analytics dashboard
```

### Screen Inventory & Wireframe Specs

---

#### BA-01: Dashboard Overview

| Attribute | Detail |
|-----------|--------|
| **Route** | `/dashboard` |
| **Layout** | KPI cards (top) + activity widgets (below) + quick-action cards |
| **KPI cards** | Today's sales/orders, pending orders count, upcoming bookings, staff availability status |
| **Widgets** | Recent orders list (last 5), recent bookings list (last 5), operational alerts (payment failures, pending approvals) |
| **Quick actions** | "Add Item", "Create Booking", "View Orders" |
| **Module gating** | Hide ordering widgets if ordering disabled. Hide booking widgets if booking disabled. |

---

#### BA-02: Business Profile & Brand Configuration

| Attribute | Detail |
|-----------|--------|
| **Route** | `/settings/business-profile` |
| **Tabs/Sections** | Identity, Brand, Media Library |
| **Identity** | Business name, legal name, description, contact phone/email, website URL, social media links |
| **Brand** | Logo upload + preview, hero image upload, primary & secondary color pickers, typography preset selector, layout template choice |
| **Media Library** | Grid of uploaded assets, upload/delete/replace, set featured images |
| **Theme Preview** | Live preview panel showing theme changes in real time |
| **Actions** | Save, revert to last saved, publish to storefront |

---

#### BA-03: Location Management

| Attribute | Detail |
|-----------|--------|
| **Route** | `/locations/list`, `/locations/:id` |
| **List view** | Table of locations: name, address, phone, status, fulfillment modes |
| **Detail form sections** | |
| Basic info | Name, address (street/city/state/zip), phone, timezone |
| Hours | Day-by-day open/close times, closed-day toggle, blackout windows (date range + reason) |
| Fulfillment | Supported types per location (pickup/delivery/in-store/dine-in). Delivery radius, fee model (flat/percentage/zone), estimated times. |
| Operating rules | Tax config, service charges, tipping defaults, cancellation policy, payment policy (cash/prepay), lead time, advance ordering window |

---

#### BA-04: Category Management

| Attribute | Detail |
|-----------|--------|
| **Route** | `/catalog/categories` |
| **Layout** | Tree/list view with drag-to-reorder |
| **Category fields** | Name (unique within tenant), description, display order, featured image, active/inactive toggle, parent category (for hierarchy) |
| **Actions** | Create, edit, delete (with child-handling logic), bulk operations |

---

#### BA-05: Item / Product Management

| Attribute | Detail |
|-----------|--------|
| **Route** | `/catalog/items`, `/catalog/items/:id` |
| **List view** | DataTable: name, category, price, status, last edited. Sortable, filterable (category, status, price range, search by name/SKU). Bulk select + bulk edit/delete/export. |
| **Create/Edit form** | |
| Basic info | Name, description (rich text), SKU, product code |
| Pricing | Base price, cost (for reporting), status (available/sold-out/discontinued), stock hint |
| Media | Multiple product images, primary image selector, alt text |
| Categories | Assign to one or more categories, set featured |
| Modifiers | Add modifier groups (name, type: choice/checkbox/quantity, required flag). Each group has options (name, price adjustment, available toggle). Display order within group. |
| **Actions** | Save, activate/deactivate toggle, clone item, preview in storefront |
| **Bulk import** | CSV upload with validation report + conflict resolution (duplicate SKUs) |

---

#### BA-06: Services Management

| Attribute | Detail |
|-----------|--------|
| **Route** | `/services/list`, `/services/list/:id` |
| **Service form** | |
| Basic info | Name, description, category/type |
| Duration | Standard duration (minutes), min/max if variable, buffer time between bookings |
| Pricing | Base price, duration-based pricing (if variable) |
| Booking settings | Staff assignment (required/optional), deposit (yes/no + amount), prepayment (yes/no), cancellation window (hours), refund policy |
| Availability | Bookable locations, max daily bookings per location, lead time, blackout windows |
| Add-ons | Name, price, required/optional |
| Media | Service images |
| Status | Active/inactive |

---

#### BA-07: Staff Management

| Attribute | Detail |
|-----------|--------|
| **Route** | `/staff/list`, `/staff/:id` |
| **Staff form** | Name, email, phone, role/title, bio/specialization, assigned locations, services they can provide, max bookings/day, profile photo, status (active/inactive/on-leave) |
| **Availability calendar** | Week/month view. Mark available/unavailable times, working hours per day, time off blocks, recurring patterns. |
| **Booking load** | Visual calendar showing booked slots per staff member. Prevent overbooking. |

---

#### BA-08: Orders Dashboard & List

| Attribute | Detail |
|-----------|--------|
| **Route** | `/orders/active`, `/orders/history` |
| **Active queue** | Grouped by fulfillment type (pickup/delivery). Sorted by promised time. Count badges for pending. |
| **List columns** | Order ID, customer name, date/time, fulfillment type, status badge, total, actions |
| **Filters** | Date range, status (pending/confirmed/ready/out-for-delivery/delivered/cancelled), fulfillment type, customer search, order ID search |
| **Sorting** | By any column |

---

#### BA-09: Order Detail & Processing

| Attribute | Detail |
|-----------|--------|
| **Route** | `/orders/:id` |
| **Sections** | |
| Header | Order ID, date, status badge |
| Customer info | Name, phone, email, delivery address, notes |
| Items | Line items with quantities, modifiers, unit prices, line totals, special requests |
| Pricing breakdown | Subtotal, discounts, tax, delivery fee, service charge, tip, total |
| Fulfillment | Type, requested time, location, delivery address + instructions, estimated times |
| Payment | Method, status, transaction ID |
| **Status workflow** | Buttons progressing: Pending → Confirmed → Ready/Preparing → Out for Delivery → Delivered. Cancel at any stage (with reason). Each transition timestamped. |
| **Refunds** | Full or partial refund. Reason selection + notes. Refund method (original payment, credit). Audit trail. Confirmation. |
| **Communication** | Send status update (SMS/email). View communication history. |

---

#### BA-10: Bookings Calendar & List

| Attribute | Detail |
|-----------|--------|
| **Route** | `/bookings/calendar`, `/bookings/list` |
| **Calendar view** | Week/day/month toggle. Color-coded by service or staff. Drag-and-drop cards. Click to open detail. Staff-centric vs. service-centric view toggle. |
| **List view** | Booking ID, customer, service, date/time, duration, staff, status badge. Filters: date range, service, staff, status, customer search. |

---

#### BA-11: Booking Detail & Management

| Attribute | Detail |
|-----------|--------|
| **Route** | `/bookings/:id` |
| **Sections** | |
| Header | Booking ID, date, status badge |
| Service | Name, duration, estimated end time |
| Customer | Name, phone, email, previous booking history |
| Staff | Assigned staff, reassign option |
| Location | Where service occurs |
| Pricing | Service price, add-ons, deposit, total |
| Notes | Customer special requests, internal admin notes, communication history |
| **Status workflow** | Pending → Confirmed → Check-in → Completed. Cancel at any stage (within policy window + reason). Auto-notify customer on status change. |
| **Rescheduling** | View available slots, drag-and-drop in calendar, reassign staff. Auto-notify customer. |

---

#### BA-12: Customers List & CRM

| Attribute | Detail |
|-----------|--------|
| **Route** | `/customers/list`, `/customers/:id` |
| **List** | Name, email, phone, registration date, last activity, loyalty tier. Search by name/phone/email. Filter by date, loyalty tier, segment. Export CSV. |
| **Profile** | Basic info, order history (total spent, avg order value, favorites), booking history (frequency, favorite services), loyalty (points, tier, history), communication preferences, admin actions (update info, reset password, adjust points with audit trail, add notes, block/unblock, archive) |

---

#### BA-13: Loyalty Program Configuration

| Attribute | Detail |
|-----------|--------|
| **Route** | `/customers/loyalty` |
| **Program config** | Points earning rate (per dollar/per transaction), redemption values, tier definitions (name, threshold, benefits, duration), rewards catalog (redemption name, points required, availability, terms) |
| **Management** | Batch award points, manual adjustment with reason, promotion creation (bonus points event) |

---

#### BA-14: Content Pages Editor

| Attribute | Detail |
|-----------|--------|
| **Route** | `/content/pages`, `/content/pages/:id` |
| **Page list** | Title, slug, status (draft/published), last edited, type (about/policy/FAQ/announcement). Filter and sort. |
| **Editor** | Title, slug, meta description, rich text editor with media library integration, draft/publish toggle, page type, visibility (public/login-required/staff-only) |
| **SEO fields** | Meta title, meta description, slug, OG image, canonical URL |
| **Draft workflow** | Save as draft, auto-save, preview, change history |
| **Publishing** | Publish live, schedule future publication, unpublish/archive |

---

#### BA-15: Announcements & Promotions

| Attribute | Detail |
|-----------|--------|
| **Route** | `/content/announcements` |
| **Creation** | Title, rich text body, image/video, scheduling (start/end date), visibility toggle, target segment (if enabled) |

---

#### BA-16: Payment Gateway Settings

| Attribute | Detail |
|-----------|--------|
| **Route** | `/settings/payments` |
| **Connection list** | Provider (Stripe/Square), mode (sandbox/production), status (healthy/warning/error), account ID (masked), last verified |
| **Add connection** | Select provider → choose environment → secure credential input (API keys or OAuth) → verify (test transaction) → confirm |
| **Connection detail** | Status, supported payment methods, recent transaction summary, verify health, disconnect (with confirmation) |

---

#### BA-17: Tenant User Management

| Attribute | Detail |
|-----------|--------|
| **Route** | `/settings/users`, `/settings/users/invite` |
| **User list** | Name, email, role, status, invited date, last login. Filter by role/status. Search by name/email. |
| **Invite** | Email, role selection, permissions preview, send invitation |
| **Edit user** | Name, email, role, status (active/suspended), custom module restrictions |
| **Pending invitations** | List with resend/cancel actions |
| **Actions** | Deactivate (revokes access, keeps records), delete (if no transaction history), view activity trail |

---

#### BA-18: Activity & Audit Log

| Attribute | Detail |
|-----------|--------|
| **Route** | `/activity` |
| **Log entries** | Settings changes, user/staff management, catalog/service changes, order/booking changes, content publishing, integration changes |
| **Filters** | Action type, actor, entity type, date range |
| **Detail** | What changed, who, when, before/after diff |
| **Scope** | Tenant-visible events only. No platform-internal or cross-tenant data. |

---

## Portal 3 — Platform Admin Portal (web-platform-admin)

### Purpose

Platform-owner control plane for creating tenants, managing infrastructure, monitoring health, and operating the multi-tenant platform.

### User Roles & Capabilities

| Role | Capabilities |
|------|-------------|
| **Owner** | All platform capabilities |
| **Admin** | `tenants:read`, `tenants:write`, `domains:manage`, `analytics:read` |
| **Support** | `tenants:read`, `impersonation:manage` |
| **Analyst** | `tenants:read`, `analytics:read` |

> **Key separation:** Platform access ≠ automatic tenant access. Impersonation is explicit, time-bound, and fully audited. Tenant data access only through impersonation or support flows.

### Information Architecture

```
/ (Dashboard)
├── /dashboard                                   → Platform overview & stats
├── /tenants
│   ├── /tenants/list                            → Tenant list + search
│   │   └── /tenants/:id                         → Tenant detail + lifecycle
│   ├── /tenants/create                          → Provisioning wizard
│   └── /tenants/:id/impersonate                 → Impersonation session
├── /domains
│   ├── /domains/list                            → All domains
│   │   └── /domains/:id                         → Domain detail + verification
│   └── /domains/add                             → Register custom domain
├── /publishing
│   ├── /publishing/releases                     → Release list
│   │   └── /publishing/releases/:id             → Release detail + rollback
│   └── /publishing/deploy                       → Initiate publish
├── /imports
│   ├── /imports/list                            → Import jobs list
│   │   └── /imports/:id                         → Import detail + review
│   └── /imports/:id/review                      → Review workspace
├── /payments
│   ├── /payments/connections                    → Gateway connections
│   │   └── /payments/connections/:id            → Connection detail
│   └── /payments/webhooks                       → Webhook management
├── /notifications
│   ├── /notifications/queue                     → Notification delivery queue
│   └── /notifications/webhooks                  → Webhook event queue
├── /operations
│   ├── /operations/health                       → System health dashboard
│   ├── /operations/alerts                       → Active alerts + history
│   ├── /operations/jobs                         → Job queue monitoring
│   └── /operations/logs                         → Structured log viewer
├── /audit
│   └── /audit/search                            → Audit log search
├── /analytics
│   ├── /analytics/platform                      → Platform-wide analytics
│   └── /analytics/tenants/:id                   → Tenant-specific analytics
└── /config
    ├── /config/templates                        → Vertical template library
    │   └── /config/templates/:id                → Template detail/edit
    └── /config/settings                         → Platform-wide settings
```

### Screen Inventory & Wireframe Specs

---

#### PA-01: Platform Dashboard

| Attribute | Detail |
|-----------|--------|
| **Route** | `/dashboard` |
| **KPI cards** | Total active tenants, failed payments/webhooks count, pending imports/publishes, system health status (green/yellow/red) |
| **Widgets** | Recent tenant activity, active alerts, upcoming renewals, quick links to common actions |

---

#### PA-02: Tenant List

| Attribute | Detail |
|-----------|--------|
| **Route** | `/tenants/list` |
| **Columns** | Tenant name, owner email, status badge (draft/active/suspended/archived), created date, last activity, managed domain, custom domain, modules, release version |
| **Filters** | Status, vertical type, date range, custom domain yes/no, payment configured yes/no |
| **Search** | By tenant name, owner email |

---

#### PA-03: Create Tenant (Provisioning Wizard)

| Attribute | Detail |
|-----------|--------|
| **Route** | `/tenants/create` |
| **Step 1 — Business Info** | Business name, owner email, vertical/type selection (restaurant, retail, service, salon, fitness, custom) |
| **Step 2 — Modules** | Toggle: Ordering, Booking, Loyalty, Content, Analytics |
| **Step 3 — Configuration** | Currency, timezone, region |
| **On submit** | Creates tenant in `draft` state, assigns owner, generates managed subdomain (`businessname.platform.local`), initializes defaults (theme, nav, tax), creates empty catalog/services, sends owner invitation email |

---

#### PA-04: Tenant Detail & Lifecycle

| Attribute | Detail |
|-----------|--------|
| **Route** | `/tenants/:id` |
| **Tabs** | Summary, Configuration, Domains, Releases, Analytics, Impersonation, Audit |
| **Summary** | All basic info, contact, vertical, modules, current state |
| **Lifecycle controls** | Status badge + transition buttons: Draft→Activate, Draft→Archive, Active→Suspend, Active→Archive, Suspended→Activate, Suspended→Archive. Reason field for suspension/archival. Status change log. |
| **Configuration** | Theme info, modules, payment gateway status, custom domain status, last publish date/version |

---

#### PA-05: Tenant Impersonation

| Attribute | Detail |
|-----------|--------|
| **Route** | `/tenants/:id/impersonate` |
| **Start session** | Duration selector (1h / 8h / 24h), large confirmation dialog with clear "You are about to impersonate [Tenant Name]" warning |
| **Active session** | Launches tenant-admin portal as that tenant. Persistent banner: "IMPERSONATING: [Tenant Name] — Expires in [time]". Easy terminate button. |
| **Tracking** | List of active impersonation sessions (who, when, until when). Full audit trail of all actions during impersonation. |

---

#### PA-06: Domain List

| Attribute | Detail |
|-----------|--------|
| **Route** | `/domains/list` |
| **Columns** | Domain name, tenant, verification status (pending/verified/failed), SSL status (pending/active/error), created date |

---

#### PA-07: Add Custom Domain

| Attribute | Detail |
|-----------|--------|
| **Route** | `/domains/add` |
| **Form** | Domain name input, select associated tenant |
| **Verification instructions** | Show required DNS record (CNAME or TXT) with copy-to-clipboard. Step-by-step instructions. Verify button (polls DNS propagation). |

---

#### PA-08: Domain Detail & Activation

| Attribute | Detail |
|-----------|--------|
| **Route** | `/domains/:id` |
| **Verification** | Status (pending/in-progress/verified/failed) with reason on failure. Retry button. |
| **SSL** | Certificate status, expiration date, auto-renewal, issuer details, force renewal button |
| **Pre-activation checks** | Verification: ✓/✗, tenant publish health: ✓/✗, tenant status: ✓/✗, payment gateway: ✓/✗. All checks shown with pass/fail. |
| **Promote** | Confirmation dialog → activate → monitor → success (primary domain) or fail (rollback + error detail) |
| **Rollback** | Revert to prior domain if post-activation health check fails |

---

#### PA-09: Releases Dashboard

| Attribute | Detail |
|-----------|--------|
| **Route** | `/publishing/releases` |
| **List** | Tenant name, version, status (pending/active/failed/archived), created date, creator, release notes, validation result |

---

#### PA-10: Publish Workflow

| Attribute | Detail |
|-----------|--------|
| **Route** | `/publishing/deploy` |
| **Steps** | |
| 1. Select tenant | Tenant picker |
| 2. Review changes | Staged catalog/service/content/settings/import changes. Preview. |
| 3. Release notes | Text field |
| 4. Pre-flight checks | Data integrity, config validity, required fields, payment gateway health, domain cert. All pass/fail displayed. |
| 5. Approve | Launch publish. Real-time status stream: validation → building → staging → health check → production. |
| **Result** | Success: release live. Failure: error logs + rollback to previous. Notification sent to tenant. |

---

#### PA-11: Release Detail & Rollback

| Attribute | Detail |
|-----------|--------|
| **Route** | `/publishing/releases/:id` |
| **Content** | Version, status, created date/by, release notes, full changelog from previous, validation report, publishing event log |
| **Rollback** | Select prior release → confirmation → rollback → verify restoration. Audit trail recorded. |

---

#### PA-12: Imports List

| Attribute | Detail |
|-----------|--------|
| **Route** | `/imports/list` |
| **Columns** | Tenant, artifact type (PDF/CSV/image), upload date, status (uploaded/processing/review-required/approved/published/failed), progress indicator |
| **Dashboard widgets** | Active count, failed count, recent imports |

---

#### PA-13: Import Detail & Processing

| Attribute | Detail |
|-----------|--------|
| **Route** | `/imports/:id` |
| **Pipeline status** | Step-by-step: Upload ✓ → Malware scan ✓/✗ → Classification → OCR (progress %) → Extraction → Mapping → Validation |
| **Extracted preview** | Source artifact viewer (PDF/image with OCR overlay). Extracted candidates: catalog items, services, staff, content. Confidence scores per field. Source trace (page/section). Errors and warnings. |

---

#### PA-14: Import Review Workspace

| Attribute | Detail |
|-----------|--------|
| **Route** | `/imports/:id/review` |
| **Layout** | Split-pane: source artifact (left) + staged data (right) |
| **Staged data** | Diff view (before/after if updating existing). Low-confidence fields highlighted yellow/orange. Error fields highlighted red. Inline editing. |
| **Quality gates** | Block approval if: blocking errors present, confidence below threshold for critical fields, required fields missing. Show specific reasons. |
| **Actions** | Approve all, approve partial (select items), reject, mark for revision. Reviewer notes. Confirmation dialog. |

---

#### PA-15: Payment Connections

| Attribute | Detail |
|-----------|--------|
| **Route** | `/payments/connections`, `/payments/connections/:id` |
| **List** | Tenant, provider, mode, status, last verified, account ID (masked), last transaction |
| **Detail** | Provider, mode, account ID (masked), created/verified dates, supported methods, health indicator, recent transaction summary (count, revenue, failures, refunds over 30 days), performance metrics (avg time, volume, failure rate) |
| **Actions** | Verify health, re-setup, disconnect |

---

#### PA-16: Webhook Management

| Attribute | Detail |
|-----------|--------|
| **Route** | `/payments/webhooks` |
| **Subscriptions** | Event types, endpoint URL, last delivery status, delivery success rate |
| **Failures** | Event type, timestamp, reason (timeout/auth/5xx), retry attempts, status (pending-retry/permanent-fail). Retry button. Manual resolution. |

---

#### PA-17: Notification Queue

| Attribute | Detail |
|-----------|--------|
| **Route** | `/notifications/queue` |
| **Queue** | Recipient, type (order confirmation/booking reminder/etc.), status (pending/sent/failed/bounced), scheduled time, retry count |
| **Failures** | Bounces, SMS failures, push failures, provider errors. Manual retry. View reason. Mark resolved. |

---

#### PA-18: Webhook Event Queue

| Attribute | Detail |
|-----------|--------|
| **Route** | `/notifications/webhooks` |
| **Queue** | Event type, source tenant, timestamp, processing status, retry count |
| **Detail** | Raw JSON payload view. Retry processing. Mark resolved/ignore. |
| **Failures** | Signature verification, handler errors, provider errors. Detailed logs. |

---

#### PA-19: Health Dashboard

| Attribute | Detail |
|-----------|--------|
| **Route** | `/operations/health` |
| **System status** | API health (green/yellow/red), worker process, database, Redis/cache, external integrations (Stripe, Square, email, SMS) — each with status, last check, response time. Domain DNS/SSL health. |
| **Performance** | API response times (p50, p95, p99), throughput (req/sec), error rate, DB query performance, cache hit rate, queue depths (imports, publishes, notifications, webhooks) |
| **Resources** | DB connection count, memory utilization, storage by tenant/artifact type, worker load |

---

#### PA-20: Alerts & Incidents

| Attribute | Detail |
|-----------|--------|
| **Route** | `/operations/alerts` |
| **Active alerts** | Severity (critical/warning/info), description, affected tenant(s) or global, time started, acknowledge + detail buttons |
| **Alert types** | Payment failure threshold, webhook delivery failures, high error rate, performance degradation, resource exhaustion, cert expiration |
| **History** | Last 30 days, acknowledge status, duration, resolution actions |

---

#### PA-21: Job Queue Monitoring

| Attribute | Detail |
|-----------|--------|
| **Route** | `/operations/jobs` |
| **Queue depths** | Imports, publishes, notifications, webhooks, exports/backups — count + oldest job age |
| **Job history** | Status (pending/running/completed/failed), progress, estimated time, error logs for failures |

---

#### PA-22: Structured Log Viewer

| Attribute | Detail |
|-----------|--------|
| **Route** | `/operations/logs` |
| **Filters** | Severity (error/warn/info/debug), component (API/worker/auth/payments), tenant, time range |
| **Search** | Keyword search |
| **Export** | Download for external analysis |
| **Request tracing** | Trace by correlation ID. Timeline of components hit. Latency breakdown. Errors in trace chain. |

---

#### PA-23: Audit Log Search

| Attribute | Detail |
|-----------|--------|
| **Route** | `/audit/search` |
| **Filters** | Action (create tenant, publish, impersonate, modify gateway), actor (email), tenant, entity type, status (success/denied/failure), date range, IP address |
| **Results** | Timestamp, actor, action, affected entity, result badge, detail button |
| **Detail** | Full entry: actor email + ID, action, entity + ID, before/after state, IP/user agent, request ID for tracing, denial reason (if denied) |
| **Sensitive actions** | Money movement (refunds, payments, chargebacks), role/permission changes, impersonation sessions, password resets, integration setup/teardown, publish approvals, rollbacks |

---

#### PA-24: Platform Analytics

| Attribute | Detail |
|-----------|--------|
| **Route** | `/analytics/platform` |
| **Tenant metrics** | Active count by status, new per period, churn, vertical distribution, module usage % |
| **Transaction metrics** | Total orders (count + revenue), bookings (count + value), payment success rate, failed transactions, refund rate, top payment methods |
| **Customer metrics** | Total unique, new per period, repeat rate, lifetime value, segmentation |
| **Operational metrics** | Import/publish/webhook/notification success rates, avg time to publish, avg time to first order |
| **Performance** | API latency (p50/p95/p99), throughput, error rate, DB performance, storage trend |

---

#### PA-25: Tenant-Specific Analytics

| Attribute | Detail |
|-----------|--------|
| **Route** | `/analytics/tenants/:id` |
| **Content** | Orders per week/month, revenue trend, customer acquisition, popular products/services, peak hours/days, payment method breakdown, refund rate, booking utilization, retention |
| **Export** | CSV/JSON download, scheduled reports |

---

#### PA-26: Template Library

| Attribute | Detail |
|-----------|--------|
| **Route** | `/config/templates`, `/config/templates/:id` |
| **List** | Template name, description, default modules, themes, created/modified dates |
| **Detail** | Name, description, default modules, starter theme, sample catalog/services, sample pages, default settings (tax, tipping). Edit all fields. |
| **Create template** | Save current tenant config as new template. Select which modules/config to include. |
| **Apply** | Used during tenant provisioning (PA-03) |

---

#### PA-27: Platform Settings

| Attribute | Detail |
|-----------|--------|
| **Route** | `/config/settings` |
| **Sections** | Default currency/timezone, supported payment providers, notification providers, analytics provider, security (MFA requirements, session timeout), rate limiting thresholds, feature flags |

---

## Cross-Portal Patterns

### Authentication Flows

| Portal | Method | Details |
|--------|--------|---------|
| Platform Admin | Strong auth required | MFA support/enforcement, API tokens with scopes, shorter session timeouts, failed-login rate limiting |
| Tenant Admin | Standard email/password | MFA optional, auto-logout on inactivity, "remember this device" |
| Customer | Email or phone registration | Password reset, optional MFA, session tokens for mobile/PWA |

### Validation & Error Handling

| Pattern | Behavior |
|---------|----------|
| Field validation | Real-time, clear messages, field-level + cross-field, prevent submission until valid, server revalidation |
| Error states | Plain language (not technical jargon), actionable next steps, contact support link, error codes for support, retry where appropriate, fallback for non-critical failures |

### Loading & Progress

| Pattern | Usage |
|---------|-------|
| Skeleton screens | Initial page loads |
| Progress indicators | Long operations (imports, publishes) |
| Real-time status | WebSocket or polling for order/booking/job status |
| Estimated time | Shown where calculable |
| Cancel option | Available for long-running operations |

### Empty States

Every list/table screen needs a designed empty state:
- Helpful message explaining what will appear here
- Contextual CTA ("Create your first item", "Upload first artifact")
- Explanatory graphic/illustration
- Link to documentation

### Mobile Responsiveness

| Aspect | Approach |
|--------|----------|
| Layout | Mobile-first across all portals |
| Touch | Touch-friendly elements (min 44 px tap targets) |
| Tables | Collapsible/card view on mobile |
| Navigation | Sidebar → hamburger drawer |
| Parity | Full feature parity on mobile where practical |

### Accessibility (WCAG 2.1 AA)

- Keyboard navigation throughout
- Screen reader support
- Color contrast ratios meeting AA
- Visible focus indicators
- ARIA labels
- Form labels properly associated with inputs

### Notifications

| Channel | Use Cases |
|---------|-----------|
| Toast (in-app) | Action feedback (success/error/info), auto-dismiss or manual close |
| Modal alert | Critical confirmations (delete, cancel, refund) |
| Email | Order confirmations, booking confirmations, status updates, admin alerts |
| SMS | Order status, booking reminders, account alerts |
| Push (PWA) | Order status, booking reminders, promotions (opt-in) |

### Search & Filtering

- Global search within current scope
- Quick filters (most common visible by default)
- Advanced search with multiple criteria
- Filter persistence (remember last used)
- Saved searches (where applicable)
- Export results

---

## Tenant Lifecycle & Operational Workflows

### State Machine

```
┌───────┐     activate      ┌────────┐
│ Draft │──────────────────▶│ Active │
│       │                   │        │
└───┬───┘                   └───┬──┬─┘
    │                           │  │
    │ archive     suspend ──────┘  │ archive
    │              │               │
    ▼              ▼               ▼
┌──────────┐  ┌───────────┐  ┌──────────┐
│ Archived │  │ Suspended │  │ Archived │
│(terminal)│  │           │  │(terminal)│
└──────────┘  └─────┬─┬───┘  └──────────┘
                    │ │
          activate ─┘ └─ archive
                          │
                          ▼
                    ┌──────────┐
                    │ Archived │
                    │(terminal)│
                    └──────────┘
```

**Operational rules:**
- Draft tenants: allowed through setup flows, blocked from live routing
- Suspended/archived tenants: fail closed before data access
- All lifecycle mutations are audit-logged
- Dependent modules don't invent their own transitions

---

## Security & Audit Requirements

### Data Protection

- Payment gateway secrets encrypted at rest
- Webhook secrets encrypted at rest
- Never echo back sensitive values in UI
- Customer PII redacted in logs
- Database passwords and API keys never in logs
- Audit trails record sensitive actions without exposing values

### Access Control Evaluation

**Tenant-Admin path:** Actor type = tenant → User ID present → Active membership → Role allows capability → Module doesn't narrow further

**Platform-Admin path:** Actor type = platform → User ID present → Valid platform role → Role allows capability → Tenant access denied unless explicit impersonation

### Security Events to Surface in UI

- Failed authentication attempts
- Rate limiting triggers
- Unauthorized access attempts
- Suspicious activity detection

---

## Deployment & Publishing Workflow

### Create Business End-to-End Flow (10 Stages)

| Stage | Owner | Key Actions |
|-------|-------|-------------|
| 1. Provisioning | Platform Admin | Create tenant (draft), select template/modules, generate subdomain, send owner invite |
| 2. Brand & Identity | Tenant Owner | Upload logo/assets, configure colors/typography, define legal metadata |
| 3. Operational Config | Tenant Owner | Configure locations/hours, set fulfillment, define tax/pricing, invite staff |
| 4. Payments | Tenant Owner | Connect gateway, verify credentials, configure payouts |
| 5. Data Ingestion | Tenant Owner / Auto | Upload menu/catalog/services (PDF, CSV, image, form) |
| 6. AI Extraction | Automation | OCR, classification, entity extraction, confidence scoring, conflict detection |
| 7. Review & Approval | Reviewer / Owner | Staged data review workspace, corrections, approval gate |
| 8. Publish | Automation / Owner | Generate storefront config, publish to preview, smoke checks, publish to production, elevate to active |
| 9. Domain Activation | Platform Admin / Owner | Verify custom domain, health check, promote domain, verify routing + cert |
| 10. Post-Publish | Automation | Seed analytics, schedule backups, enable monitoring, record completion |

### Failure Handling Principles

- Import failures → resumable jobs
- Publish failures → preserve last known good config
- Domain activation failures → don't block managed subdomain
- All failures are observable in operator views

---

## Technical Infrastructure Notes for UX

### Request Routing Model

| Domain | Resolves To |
|--------|------------|
| Platform admin domain | Platform admin portal |
| Verified custom domain | Customer portal (correct tenant) |
| Managed subdomain | Customer portal (correct tenant) |
| Preview environment | Access-controlled preview |
| Admin portals | Always require authentication + tenant membership |

### Asynchronous Workflows

Designers should plan for async status patterns:
- Import processing → background job → real-time progress + results
- Publishing → async pipeline → status stream
- Notification delivery → queued → delivery status
- Webhook processing → idempotent queue → processing status

### Real-Time Features

- WebSocket for status updates (orders, bookings, jobs)
- Polling fallback for unsupported browsers
- Push notifications for critical events
- Real-time analytics dashboards

---

## Acceptance Criteria Summary

### Customer Portal

- [ ] Tenants render branded storefronts without code forks
- [ ] Customer ordering and booking flows work end-to-end
- [ ] Account history and loyalties persist correctly per tenant
- [ ] App shell is installable as PWA with offline support
- [ ] Authentication and session management are secure

### Business Admin Portal

- [ ] Tenant owners configure business without platform intervention
- [ ] Admins only see their own tenant data
- [ ] Configuration changes propagate to storefront safely
- [ ] Order and booking operations are intuitive and complete
- [ ] Staff and customer management are full-featured

### Platform Admin Portal

- [ ] Platform admins can provision tenants and manage infrastructure
- [ ] Impersonation is explicit, auditable, and time-bounded
- [ ] Publishing is versioned, reproducible, and reversible
- [ ] Integration failures (payments, webhooks, domains) are observable
- [ ] Audit trails cover all privileged actions and money movement

---

## Screen Count Summary

| Portal | Screen Count | Key Wireframes |
|--------|-------------|----------------|
| Customer Portal | 20 + PWA | CP-01 through CP-20 |
| Business Admin Portal | 18 | BA-01 through BA-18 |
| Platform Admin Portal | 27 | PA-01 through PA-27 |
| **Total** | **65+** | |

---

*Generated from platform specification (Epics 01–10, architecture docs, workflow specs, Prisma schema, API spec, and tenant lifecycle state machine).*
