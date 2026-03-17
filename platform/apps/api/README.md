# API

NestJS modular monolith.

Core modules planned:
- identity
- tenancy
- platform-admin
- catalog
- services
- commerce
- scheduling
- crm
- content
- payments
- onboarding
- notifications
- analytics
- operations

Ownership boundary:
- owns synchronous HTTP APIs, authorization enforcement, and domain orchestration
- exposes stable contracts to frontend apps and worker processes
- must preserve module boundaries and tenant isolation in every read and write path

Current contract anchors:
- `prisma/schema.prisma` defines the evolving application data model starting with identity and session primitives
- `src/` contains runtime bootstrap and contract tests that should stay aligned with the schema surface
- `../../docs/access-control-model.md` documents the current tenant-role capability baseline and where future module gating will apply


