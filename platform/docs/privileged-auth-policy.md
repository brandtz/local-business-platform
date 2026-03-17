# Privileged Authentication Policy

## Purpose

This document defines when an already authenticated session must satisfy a fresher, stronger step-up requirement before high-trust actions can proceed.

## Current Step-Up Triggers

- `platform:write`: platform-admin write operations require fresh multifactor verification within 10 minutes
- `impersonation:start`: impersonation start requires fresh multifactor verification within 5 minutes
- `tenant:settings-write`: tenant owner and admin settings changes require fresh multifactor verification within 15 minutes
- `tenant:staff-write`: tenant owner and admin staff-management writes require fresh multifactor verification within 15 minutes
- `tenant:payment-write`: payment credential and connection changes require fresh multifactor verification within 5 minutes
- `tenant:refund-write`: refund initiation requires fresh multifactor verification within 5 minutes

## Current Non-Triggers

- low-risk platform reads such as analytics review remain single-factor for now
- lower-privilege tenant actions that do not manage tenant settings, staff, payment credentials, or refunds remain single-factor for now
- customer flows are not covered by this privileged step-up policy yet

## Policy Boundaries

- step-up policy strengthens privileged access but does not replace role or tenant membership checks
- step-up policy does not bypass tenant suspended or archived failure-state handling
- later MFA implementation should consume these policy outputs instead of inventing endpoint-specific rules