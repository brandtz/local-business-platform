
# AI Import Engine

## Purpose

Transform uploaded business artifacts into structured platform entities that can be reviewed and published safely.

## Supported Inputs

- PDF menus
- image menus and flyers
- CSV product or service exports
- pricing sheets
- staff or service lists
- plain text content for about, FAQ, and policy pages

## Pipeline

### 1. Upload

- accept artifact
- validate file type, size, and malware scan result
- store artifact in tenant-scoped object path
- create import job and artifact records

### 2. Classification

- classify artifact type
- choose extraction strategy based on artifact and vertical context

### 3. OCR and Preprocessing

- extract text and layout metadata
- normalize encoding, line breaks, and page grouping

### 4. LLM and Rules-Based Extraction

- identify categories, items, services, modifiers, prices, durations, hours, and policies
- assign field-level confidence scores
- preserve source-to-entity traceability for review

### 5. Domain Mapping

- map candidates to catalog, service, content, location, and operational settings models
- detect duplicates and probable merges against existing tenant data

### 6. Validation

- validate required fields, numeric ranges, duration rules, policy constraints, and unsupported constructs
- produce blocking errors and non-blocking warnings

### 7. Review Workspace

- present staged changes with source previews and diff summaries
- require human approval when confidence is below threshold or validation fails

### 8. Publish

- create or update canonical tenant entities
- version publish set
- emit events for storefront rebuild, cache invalidation, and audit logs

## Design Requirements

- import jobs are resumable and idempotent
- every extracted value can be traced back to source artifact and page or section
- low-confidence output never auto-publishes without policy approval
- prompts and extraction strategies are versioned for reproducibility
- import engine remains provider-agnostic so OCR or LLM vendors can change later
