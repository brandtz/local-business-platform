# Vertical Extension Guide

> Developer guide for adding new business verticals to the Local Business SaaS Platform.

## Overview

The vertical template system provides industry-specific configuration bundles that seed a new tenant with appropriate categories, services, content pages, business hours, theme defaults, and inquiry form configuration. Each vertical is defined declaratively as a configuration bundle, validated at build time, and applied during tenant onboarding.

### Architecture at a Glance

```
VerticalTemplateConfig (types)
        │
        ▼
VerticalDomainMappingService  ──►  VerticalSeedPlan
        │
        ▼
TemplateApplicationService    ──►  ApplyTemplateResult
        │
        ▼
  Tenant Database (seeded entities)
```

**Key files:**

| File | Purpose |
|------|---------|
| `platform/packages/types/src/vertical.ts` | Type definitions and bundle validation |
| `platform/apps/api/src/vertical/vertical-domain-mapping.service.ts` | Maps config bundles to tenant-scoped seed entities |
| `platform/apps/api/src/vertical/template-application.service.ts` | Applies seed plans with idempotency checks |
| `platform/apps/api/src/vertical/inquiry-lead.service.ts` | Inquiry form configuration per vertical |
| `platform/apps/api/src/vertical/vertical-extension-validation.test.ts` | Validation test suite for all bundles |

## Step-by-Step: Adding a New Vertical

### Step 1 — Define the Vertical Identifier

Add the new vertical slug to the `businessVerticals` array in `platform/packages/types/src/vertical.ts`:

```typescript
export const businessVerticals = [
  'restaurant',
  'retail',
  'appointment',
  'contractor',
  'fitness',        // ← new vertical
] as const;
```

This automatically extends the `BusinessVertical` union type used throughout the platform.

### Step 2 — Create the Configuration Bundle

Add a new entry to the `verticalConfigs` record in the same file. The bundle must satisfy the `VerticalTemplateConfig` interface:

```typescript
fitness: {
  vertical: 'fitness',
  description: 'Gyms, studios, and personal training businesses',

  theme: {
    themePreset: 'starter-energetic',
    brandPreset: 'starter-fitness',
    navigationPreset: 'fitness-default',
  },

  modules: {
    bookings: true,
    cart: false,
    catalog: false,
    content: true,
    inquiryForm: true,
    loyalty: true,
    portfolio: false,
    quotes: false,
    services: true,
  },

  starterCategories: [
    'Group Classes',
    'Personal Training',
    'Memberships',
  ],

  starterServices: [
    {
      name: 'Drop-In Class',
      slug: 'drop-in-class',
      durationMinutes: 60,
      price: 2000,
      isBookable: true,
    },
    {
      name: '1-on-1 Training Session',
      slug: 'one-on-one-training',
      durationMinutes: 60,
      price: 7500,
      isBookable: true,
    },
    {
      name: 'Monthly Unlimited',
      slug: 'monthly-unlimited',
      durationMinutes: 30,
      price: 9900,
      isBookable: false,
    },
  ],

  starterContentPages: ['about', 'class-schedule'],

  defaultBusinessHours: [
    { dayOfWeek: 1, openTime: '05:30', closeTime: '21:00' },
    { dayOfWeek: 2, openTime: '05:30', closeTime: '21:00' },
    { dayOfWeek: 3, openTime: '05:30', closeTime: '21:00' },
    { dayOfWeek: 4, openTime: '05:30', closeTime: '21:00' },
    { dayOfWeek: 5, openTime: '05:30', closeTime: '21:00' },
    { dayOfWeek: 6, openTime: '07:00', closeTime: '18:00' },
    { dayOfWeek: 0, openTime: '08:00', closeTime: '14:00' },
  ],

  inquiryForm: {
    enabled: true,
    heading: 'Get Started Today',
    submitLabel: 'Submit Inquiry',
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'phone', required: false },
      { name: 'interest', label: 'What are you interested in?', type: 'select', required: true },
      { name: 'message', label: 'Tell us about your goals', type: 'textarea', required: false },
    ],
  },
},
```

### Step 3 — Validate the Bundle

Run the validation function and the existing test suite to confirm bundle integrity:

```bash
# Run the extension validation tests
pnpm --filter @platform/api test -- --grep "vertical-extension-validation"

# Run type checking
pnpm --filter @platform/api typecheck

# Run contract type checking
pnpm typecheck:contracts
```

The validation suite automatically picks up all entries in `verticalConfigs` and checks:

- All required fields are present and non-empty
- Slugs are lowercase with hyphens only (pattern: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`)
- Time formats are valid `HH:MM` (24-hour)
- Prices are non-negative integers (cents)
- Category slugs referenced by services actually exist
- Vertical identifiers are unique across the platform

### Step 4 — Verify Domain Mapping

The `VerticalDomainMappingService.buildSeedPlan()` method automatically handles any valid bundle. No code changes are needed in the mapping layer unless the new vertical requires custom mapping logic.

Verify by running:

```bash
pnpm --filter @platform/api test -- --grep "domain-mapping"
```

### Step 5 — Verify Template Application

The `TemplateApplicationService` is also generic across verticals. It will apply the seed plan with idempotency: if a tenant already has entities matching by name/slug, those are skipped.

No changes required unless the new vertical needs custom application logic.

### Step 6 — Update the Board

After merging, update the project board to reflect the new vertical availability.

## Bundle Schema Requirements

### VerticalTemplateConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vertical` | `BusinessVertical` | ✅ | Unique vertical identifier from `businessVerticals` array |
| `description` | `string` | ✅ | Short description of the vertical |
| `theme` | `VerticalThemeDefaults` | ✅ | Theme, brand, and navigation presets |
| `modules` | `VerticalModuleConfig` | ✅ | Feature flags: bookings, cart, catalog, content, inquiryForm, loyalty, portfolio, quotes, services |
| `starterCategories` | `readonly string[]` | ✅ | At least one category name (slugs are generated automatically by the mapping service) |
| `starterServices` | `readonly StarterServiceSeed[]` | ✅ | Starter services with name, slug, duration, price, bookability |
| `starterContentPages` | `readonly string[]` | ✅ | Content page slugs (titles and template regions resolved by domain mapping) |
| `defaultBusinessHours` | `readonly WeeklyHoursEntry[]` | ✅ | Default business hours (dayOfWeek 0–6) |
| `inquiryForm` | `InquiryFormConfig` | ✅ | Inquiry form definition (can be disabled with `enabled: false`) |

### StarterServiceSeed

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | `string` | Non-empty |
| `slug` | `string` | Lowercase with hyphens (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`) |
| `durationMinutes` | `number` | Positive integer |
| `price` | `number` | Non-negative integer (cents) |
| `isBookable` | `boolean` | Whether the service can be booked online |

### InquiryFormConfig

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Whether the inquiry form is active for this vertical |
| `heading` | `string` | Form heading text (required when enabled) |
| `submitLabel` | `string` | Submit button label (required when enabled) |
| `fields` | `readonly InquiryFormFieldConfig[]` | Field definitions (must be non-empty when enabled) |

### InquiryFormFieldConfig

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Field identifier (used as form field name) |
| `label` | `string` | Display label |
| `type` | `string` | Input type: `text`, `email`, `phone`, `select`, `textarea` |
| `required` | `boolean` | Whether the field is required for submission |

## Mapping Conventions

The domain mapping layer follows these conventions when converting configuration bundles to seed entities:

- **Categories**: Defined as plain string names in `starterCategories`. Slug generation and display ordering happen automatically in the domain mapping layer.
- **Content pages**: Defined as slug strings in `starterContentPages`. Titles and template regions are resolved by the domain mapping service using built-in content page defaults. Pages always start with `draft` status.
- **Business hours**: Defined in `defaultBusinessHours`. Days of week use JavaScript convention (0 = Sunday, 6 = Saturday). Times are `HH:MM` in 24-hour format.
- **Prices**: Stored as integers in cents (e.g., `2000` = $20.00) in the `price` field.
- **Tenant scoping**: All seed entities include the tenant ID. The mapping service requires a tenant ID parameter.
- **Service slugs**: Must match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`.

## Validation Process

Bundle validation runs through `validateVerticalBundle()` and checks:

1. **Completeness** — All required fields are present and non-empty.
2. **Slug format** — All service slugs match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`.
3. **Time format** — Business hours in `defaultBusinessHours` use valid `HH:MM` 24-hour format.
4. **Price integrity** — All `price` values are non-negative integers.
5. **Duration integrity** — All `durationMinutes` values are positive.
6. **Inquiry form** — When enabled, `heading`, `submitLabel`, and `fields` must be non-empty.
7. **Uniqueness** — Vertical identifiers are unique across the platform.

Validation errors are returned as `BundleValidationError[]` within a `BundleValidationResult`, making it easy to surface all problems at once rather than failing on the first error.

## Example: Adding a "Fitness" Vertical

The full example above in Step 2 demonstrates adding a hypothetical "fitness" vertical. Here is a summary of the complete process:

1. **Add identifier**: Add `'fitness'` to `businessVerticals` array.
2. **Add bundle**: Add the `fitness` configuration object to `verticalConfigs`.
3. **Run validation**: Execute `pnpm --filter @platform/api test` — the extension validation suite will automatically verify the new bundle.
4. **Run type checks**: Execute `pnpm --filter @platform/api typecheck` and `pnpm typecheck:contracts`.
5. **No mapping/application changes needed**: The domain mapping and template application services are generic and handle any valid bundle.
6. **Update board**: Mark the new vertical as available on the project board.

The entire process requires changes to a single file (`platform/packages/types/src/vertical.ts`) and no changes to service logic, making vertical additions low-risk and highly repeatable.
