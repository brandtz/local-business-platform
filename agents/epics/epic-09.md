
# Epic 9: AI Onboarding, Import Review, and Template-Based Publishing

## Objective

Enable rapid creation of full tenant experiences from structured onboarding plus AI-assisted ingestion.

## Scope

- onboarding wizard and setup checkpoints
- import jobs, artifact management, OCR, extraction, and mapping
- review workspace with confidence scoring and staged publish
- storefront generation from templates and tenant configuration
- preview environments and final publish orchestration

## Deliverables

- onboarding flow across platform and tenant admin surfaces
- import engine pipeline and review UI
- publish service with last-known-good rollback protection
- template application engine for tenant theme and page generation

## Acceptance Criteria

- a platform admin or tenant owner can provision, configure, ingest, review, and publish a tenant without bespoke engineering work
- low-confidence extraction results are blocked from silent publication
- publish is reproducible, versioned, and reversible

## Story Decomposition

### E9-S1: Guided Onboarding Workflow

Outcome:
- a structured onboarding flow coordinates tenant provisioning, configuration checkpoints, and completion state across platform and tenant actors

Dependencies:
- Epics 3 and 5

Acceptance Signals:
- onboarding tracks incomplete, blocked, and completed stages explicitly
- actors can resume onboarding without losing progress

### E9-S2: Import Artifact Intake and Job Orchestration

Outcome:
- uploaded business artifacts become tracked import jobs with storage, status, and retry context

Dependencies:
- Epic 1
- Epic 5

Acceptance Signals:
- import jobs are created for supported artifact types with tenant-scoped storage references
- failed jobs can be retried without duplicating imported data silently

### E9-S3: OCR, Extraction, and Domain Mapping Pipeline

Outcome:
- the platform can transform raw uploaded artifacts into staged domain candidates with confidence metadata

Dependencies:
- E9-S2
- Epic 6

Acceptance Signals:
- extracted candidates preserve source traceability
- mapping supports catalog, services, content, and operational settings where applicable

### E9-S4: Review Workspace and Approval Controls

Outcome:
- staged import results can be inspected, corrected, approved, or rejected before publication

Dependencies:
- E9-S3
- Epic 5

Acceptance Signals:
- low-confidence or invalid fields are visually distinguishable and require review
- reviewers can edit staged data without mutating already-published tenant data

### E9-S5: Template Application and Preview Generation

Outcome:
- tenant configuration and imported data can produce a previewable storefront and admin-ready configuration from reusable templates

Dependencies:
- Epic 4
- Epic 6
- E9-S4

Acceptance Signals:
- preview generation produces a deterministic tenant experience from stored configuration
- template application remains configuration-driven across all supported verticals

### E9-S6: Versioned Publish and Rollback Control

Outcome:
- tenant publication creates versioned releases with validation, health checks, and last-known-good rollback capability

Dependencies:
- E9-S5
- Epic 3

Acceptance Signals:
- each publish produces a release record with status and summary metadata
- failed publish attempts do not corrupt the currently live configuration

## Dependencies

- Epics 1 through 8
