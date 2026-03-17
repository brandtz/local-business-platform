
# Local Business SaaS Agentic Build Suite

This repository is the planning and scaffolding foundation for a multi-tenant SaaS platform serving local businesses across ordering, bookings, content, and customer engagement.

Supported business types:
- restaurants
- cafes
- salons
- barbershops
- gyms
- spas
- retail stores
- auto service businesses

Platform characteristics:
- modular monolith backend with clear bounded modules
- shared multi-tenant runtime with strict tenant isolation
- customer-facing storefront and account portal
- tenant business admin portal
- platform owner admin portal
- template-based site and app generation
- payment provider abstraction
- AI-assisted onboarding and import workflows

This repo now contains two things:
- agent guidance and planning documents under agents/
- an initial monorepo scaffold under platform/ for implementation work

Repository guardrails now include a GitHub Actions workflow at `.github/workflows/platform-ci.yml` that validates the platform workspace with the same root commands used locally.

Implementation sequencing is foundation-first, security-first, and quality-first.
