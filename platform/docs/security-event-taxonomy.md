# Security Event Taxonomy

## Purpose

This document defines the initial security-event vocabulary for authentication, MFA, and password recovery flows.

## Event Kinds

- `auth.login_succeeded`
- `auth.login_failed`
- `auth.impersonation_started`
- `auth.impersonation_revoked`
- `auth.mfa_challenge_issued`
- `auth.mfa_challenge_verified`
- `auth.mfa_challenge_failed`
- `auth.password_reset_requested`
- `auth.password_reset_completed`
- `auth.password_reset_failed`

## Severity Baseline

- `info`: normal successful auth and challenge issue flows
- `warning`: login anomalies, MFA failures, and reset failures
- `critical`: password reset completion and impersonation start because they change credential or operator trust state

## Guardrails

- security events must preserve user, actor, tenant, and operation context where available
- security events must not include plaintext secrets, reset tokens, MFA codes, or gateway credentials
- later persistence and alerting layers should consume these event kinds instead of introducing parallel auth-security vocabularies