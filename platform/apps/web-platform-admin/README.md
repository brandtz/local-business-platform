# Web Platform Admin

Platform owner control plane.

Primary concerns:
- tenant lifecycle and impersonation
- domains, deployment, templates, and module controls
- cross-tenant observability, audit, jobs, and incident workflows

Ownership boundary:
- owns platform-global operator workflows and support tooling
- may inspect cross-tenant state only through platform-authorized contracts
- must keep impersonation and privileged actions explicit and auditable
