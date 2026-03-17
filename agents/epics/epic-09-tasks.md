# Epic 9 Technical Task Plan

## E9-S1 Guided Onboarding Workflow

Technical Tasks:
- E9-S1-T1: define onboarding stage model, resume state, and actor responsibilities across platform and tenant contexts
- E9-S1-T2: implement onboarding orchestration service and progress-tracking persistence
- E9-S1-T3: create platform-admin and tenant-admin views for onboarding state and next actions
- E9-S1-T4: define blocking, warning, and complete states for each onboarding checkpoint

Test Requirements:
- unit: onboarding stage transition rules handle resume, skip, and block conditions correctly
- integration: onboarding progress persists and resumes without losing prior stage data
- UI interaction: onboarding views surface current state, blockers, and next actions consistently

Handoff Focus:
- onboarding state machine, checkpoint identifiers, and actor-responsibility model

## E9-S2 Import Artifact Intake and Job Orchestration

Technical Tasks:
- E9-S2-T1: implement upload intake flow with artifact metadata, malware scanning hook, and tenant-scoped storage
- E9-S2-T2: create import-job model with retry, failure, and staged-output state
- E9-S2-T3: define worker job dispatch for import processing and resumability behavior
- E9-S2-T4: expose admin views and APIs for import-job creation and status inspection

Test Requirements:
- integration: artifacts are stored and linked to import jobs safely by tenant
- operational test: import jobs can retry without silently duplicating staged outputs
- API contract: upload and job-status endpoints validate file metadata and status transitions correctly

Handoff Focus:
- import job lifecycle, artifact storage contract, and retry semantics

## E9-S3 OCR, Extraction, and Domain Mapping Pipeline

Technical Tasks:
- E9-S3-T1: define provider-agnostic OCR and extraction interfaces plus prompt or rules versioning model
- E9-S3-T2: implement raw text extraction, document classification, and field candidate generation pipeline
- E9-S3-T3: map extracted candidates into staged catalog, service, content, and operational-setting entities
- E9-S3-T4: persist confidence scores and source-trace metadata for review workflows

Test Requirements:
- unit: mapping logic handles ambiguous, missing, and duplicate field cases predictably
- integration: import jobs produce staged domain candidates with traceable source references
- operational test: extraction provider failure degrades cleanly and marks job state explicitly

Handoff Focus:
- staged extraction schema, confidence model, and source-trace contract

## E9-S4 Review Workspace and Approval Controls

Technical Tasks:
- E9-S4-T1: define staged-review data model for proposed changes, warnings, and blocking errors
- E9-S4-T2: build review APIs for fetching staged changes, editing corrections, and approval actions
- E9-S4-T3: build tenant-admin review screens with diff views, source previews, and approval controls
- E9-S4-T4: enforce low-confidence and validation failure gating before publish eligibility

Test Requirements:
- integration: staged corrections do not mutate already-published canonical data
- UI interaction: review views clearly distinguish approved, rejected, edited, and blocked items
- policy test: low-confidence or invalid fields cannot bypass approval gating

Handoff Focus:
- staged review model, approval state semantics, and canonical-versus-staged data separation

## E9-S5 Template Application and Preview Generation

Technical Tasks:
- E9-S5-T1: implement template application service that combines tenant config, domain data, and layout rules
- E9-S5-T2: generate preview-ready storefront and admin configuration payloads deterministically
- E9-S5-T3: define preview validation checks for navigation, content, and required transactional modules
- E9-S5-T4: expose preview URLs and readiness state to platform and tenant actors

Test Requirements:
- integration: the same input configuration yields the same preview output consistently
- UI interaction: preview links and readiness states surface correctly in onboarding or publish workflows
- validation test: incomplete required inputs block preview readiness with actionable reasons

Handoff Focus:
- preview generation inputs, deterministic output guarantees, and readiness-check contract

## E9-S6 Versioned Publish and Rollback Control

Technical Tasks:
- E9-S6-T1: finalize publish-release model, version numbering, and release status transitions
- E9-S6-T2: implement publish orchestration service with validation, release creation, and activation handoff
- E9-S6-T3: implement last-known-good rollback selection and restore behavior
- E9-S6-T4: expose publish history, current live release, and rollback actions in operator views

Test Requirements:
- integration: publish creates versioned release records and preserves live-state integrity on failure
- operational test: rollback restores the last known good configuration without corrupting newer staged work
- audit test: publish and rollback actions record actor, release, and result metadata

Handoff Focus:
- release state machine, last-known-good selection logic, and publish-versus-live data boundaries

## Playwright Delivery Overlay

- Any task in this epic that changes browser-visible behavior in web-customer, web-admin, or web-platform-admin must add or update Playwright coverage before handoff.
- At minimum, extend the nearest maintained smoke flow and record the exact Playwright command that passed.
- If a task has no browser-visible impact, the handoff must say Playwright impact: none.
