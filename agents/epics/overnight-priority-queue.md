# Overnight Priority Queue

Use this file to seed safe parallel work for unattended cloud-agent execution.

## Current Queue

1. E3-S3-T2 | preview route resolution for storefront and admin surfaces
2. E3-S4-T1 | custom domain state model and verification record foundations
3. E3-S5-T1 | module registry and enablement configuration model
4. E3-S6-T1 | cross-tenant operational summary query foundations

## Claim Notes

- each task already has a packet path and a compatible dependency chain
- agents must still move the task through Ready to In Progress on the active board before editing
- if one task finishes early, promote only the next dependency-safe task instead of self-expanding scope

## Validation Notes

- E3-S3-T2 is routing-sensitive and should preserve preview access isolation and fallback behavior
- E3-S4-T1 is schema and contract-sensitive and should leave room for verification and promotion logic without forcing full workflow implementation
- E3-S5-T1 must preserve future module gating and frontend capability propagation assumptions
- E3-S6-T1 should keep query contracts operator-focused and safe for cross-tenant summaries under platform-admin auth only