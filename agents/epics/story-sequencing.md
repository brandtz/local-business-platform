# Story Sequencing Map

This file summarizes the critical delivery path across all epics.

## Wave 1: Engineering and Security Foundation

Stories:
- E1-S1 Workspace and Package Management Baseline
- E1-S2 Shared TypeScript and Quality Toolchain
- E1-S3 Application Shell Bootstraps
- E1-S4 Shared Packages and Contract Boundaries
- E1-S5 CI Pipeline and Repository Guardrails
- E1-S6 Engineering Conventions and Decision Records
- E2-S1 Unified User and Session Model
- E2-S2 Tenant Membership and Role Enforcement
- E2-S3 Platform Admin Role Separation
- E2-S4 Request-Scoped Tenant Resolution and Guards
- E2-S5 MFA, Password Recovery, and Security Events
- E2-S6 Impersonation and Privileged Audit Trail

Exit condition:
- the platform can boot, authenticate actors, resolve tenant context, and enforce security boundaries consistently

## Wave 2: Tenancy, Platform Control, and Shared Frontend System

Stories:
- E3-S1 Tenant Lifecycle State Machine
- E3-S2 Platform Tenant Provisioning Workflow
- E3-S3 Managed Subdomain and Preview Routing
- E3-S4 Custom Domain Verification and Promotion
- E3-S5 Module Assignment and Template Registry
- E3-S6 Platform Operations Console Foundations
- E4-S1 Shared Design Tokens and Layout System
- E4-S2 Tenant-Aware Frontend Bootstrapping
- E4-S3 Storefront Navigation and Template Regions
- E4-S4 Customer Account Shell
- E4-S5 PWA and Device Capability Baseline
- E4-S6 Cross-App Frontend Conventions
- E5-S1 Tenant Admin Shell and Navigation
- E5-S2 Business Profile and Brand Configuration
- E5-S3 Locations, Hours, and Operating Rules
- E5-S4 Tenant User and Staff Administration
- E5-S5 Tenant Settings Propagation and Validation
- E5-S6 Tenant Activity and Audit Visibility

Exit condition:
- the platform can provision and operate tenant shells across platform, tenant admin, and storefront surfaces

## Wave 3: Core Business Domains and Transaction Workflows

Stories:
- E6-S1 Catalog Domain Model
- E6-S2 Service and Booking Domain Model
- E6-S3 Staff and Assignment Domain Model
- E6-S4 Content and SEO Domain Model
- E6-S5 Vertical Template Defaults
- E6-S6 Domain Contract Stabilization
- E7-S1 Cart and Pricing Engine Foundations
- E7-S2 Order Lifecycle and Fulfillment Operations
- E7-S3 Availability and Slot Computation
- E7-S4 Booking Lifecycle Management
- E7-S5 Customer Identity and Account History
- E7-S6 Hybrid Tenant Operating Modes

Exit condition:
- tenants can run ordering, bookings, or both using shared domain and transaction services

## Wave 4: Integrations, Onboarding, and Publishing

Stories:
- E8-S1 Payment Connection Management
- E8-S2 Payment Intent, Capture, and Refund Abstraction
- E8-S3 Webhook Ingestion and Replay Safety
- E8-S4 Notification Delivery Framework
- E8-S5 Domain Activation Integrated with Publish State
- E8-S6 Integration Failure Handling and Operational Alerts
- E9-S1 Guided Onboarding Workflow
- E9-S2 Import Artifact Intake and Job Orchestration
- E9-S3 OCR, Extraction, and Domain Mapping Pipeline
- E9-S4 Review Workspace and Approval Controls
- E9-S5 Template Application and Preview Generation
- E9-S6 Versioned Publish and Rollback Control

Exit condition:
- a tenant can be configured, connected, populated, previewed, and published with strong operational safety

## Wave 5: Hardening and Sustainable Operations

Stories:
- E10-S1 Structured Logging, Metrics, and Trace Correlation
- E10-S2 Audit Search and Operational Diagnostics
- E10-S3 Rate Limiting, Abuse Controls, and Boundary Protection
- E10-S4 Backup, Recovery, and Rollback Procedures
- E10-S5 Security Review and Dependency Governance
- E10-S6 Performance and Capacity Validation

Exit condition:
- the platform is observable, defensible, and supportable under real operational load and failure conditions

## Critical Path Highlights

The highest-dependency story chain is:
- E1-S1 through E1-S5
- E2-S1 through E2-S4
- E3-S1 through E3-S5
- E4-S2 and E5-S1
- E6-S1, E6-S2, and E6-S5
- E7-S1 through E7-S4
- E8-S1 through E8-S3
- E9-S2 through E9-S6
- E10-S1 through E10-S4

These stories form the backbone of the platform because they establish runtime structure, security, tenancy, transaction models, external integration safety, publish control, and operational resilience.
