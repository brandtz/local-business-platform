# Cloud Agent Prompt Pack: Epics 3 Through 7

Use these prompts for unattended VS Code agent execution.

Important:
- Epic 3 is implementation-ready now.
- Epics 4 through 7 should not be treated as wide-open implementation epics yet. Their prompts below are written to keep agents inside dependency-safe scope.
- Additional non-dependency operations lanes are included at the end for overnight agents that should improve repo readiness without waiting on unfinished product contracts.
- Every agent must still follow `agents/cloud-agent-overnight-runbook.md`, `agents/README.md`, and `agents/PLAYWRIGHT_AGENT_STANDARD.md` when UI is affected.
- For VS Code parallel runs, assign exact task IDs before launch. Do not tell multiple agents to self-claim from the active board.
- Implementation agents should write handoff notes but should not update `agents/epics/handoffs/active-task-board.md` unless they are the designated coordinator.

## Epic 3 Prompt

```text
Task: Execute one assigned Epic 3 task.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/epics/task-plan-index.md
- the specific Epic 3 packet for the assigned task
- the latest dependency handoff named in that packet
- agents/PLAYWRIGHT_AGENT_STANDARD.md only if your claimed task changes browser-visible behavior

Do:
- Work only on the assigned task ID.
- Implement only the scoped packet objective.
- Preserve tenant isolation, platform-only control semantics, preview-route fail-closed behavior, and deterministic configuration contracts.
- Do not absorb downstream work from dependent tasks.

Validate:
- Run the exact validation commands named in the packet.
- If browser-visible behavior changes, also run the required Playwright command and record the project names.

Handoff:
- Create the required handoff note in agents/epics/handoffs/.
- Do not update the active task board unless you were explicitly assigned as coordinator.
- Record exact commands run, changed surfaces, Playwright evidence if any, and next dependency-safe tasks.

Stop conditions:
- Stop if the task expands across more than two lanes.
- Stop if schema, API, and UI all become required in one packet.
- Stop if required dependency output is missing or contradicts the packet.
```

## Epic 4 Prompt

```text
Task: Prepare and execute only the earliest dependency-safe Epic 4 frontend foundation slice.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/PLAYWRIGHT_AGENT_STANDARD.md
- agents/epics/task-plan-index.md
- agents/epics/epic-04.md
- agents/epics/epic-04-tasks.md
- agents/epics/execution-strategy.md
- agents/epics/test-requirements-standard.md
- current Epic 3 handoffs relevant to tenant lifecycle, provisioning, routing, and module/template contracts

Do:
- Work only on dependency-safe Epic 4 foundation concerns.
- Safe scope tonight is E4-S1 and E4-S6 style shared frontend substrate work that does not assume unfinished Epic 3 routing or unfinished tenant bootstrap APIs.
- If you need a task packet before implementation, create or refine a narrowly scoped packet first and then execute only that packet.
- Do not implement tenant-aware storefront bootstrap that depends on unfinished Epic 3 routing or domain contracts unless those outputs are already completed and cited.

Preferred slices:
1. E4-S1-T1 visual tokens
2. E4-S1-T2 reusable layout and feedback primitives
3. E4-S6-T1 shared frontend routing and API-client conventions
4. E4-S6-T3 shared package usage alignment

Validate:
- Run relevant frontend package lint, test, and typecheck commands.
- Run Playwright for any changed browser-visible shell behavior.

Handoff:
- Write a handoff note with exact commands, changed packages, design-system or shell contract decisions, and remaining dependency gates for E4-S2 through E4-S5.
- Do not update the active board unless you were explicitly assigned as coordinator.

Stop conditions:
- Stop if the work requires unfinished Epic 3 tenant bootstrap or route-resolution outputs.
- Stop if the work turns into a broad redesign rather than a narrow shared-frontend slice.
```

## Epic 5 Prompt

```text
Task: Prepare and execute only the earliest dependency-safe Epic 5 tenant-admin portal foundation slice.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/PLAYWRIGHT_AGENT_STANDARD.md
- agents/epics/task-plan-index.md
- agents/epics/epic-05.md
- agents/epics/epic-05-tasks.md
- agents/epics/test-requirements-standard.md
- Epic 2 handoffs for tenant membership, tenant access, platform separation, and impersonation indicators
- any completed Epic 4 shared-frontend handoffs if they exist

Do:
- Work only on dependency-safe tenant-admin shell and contract foundations.
- Safe scope tonight is route-map, information architecture, placeholder dashboard structure, and role-aware navigation contracts that reuse current admin shell patterns.
- Do not build deep business-profile, location, user-admin, or audit screens that depend on unfinished Epic 3 and Epic 4 contracts unless those dependencies are complete and cited.

Preferred slices:
1. E5-S1-T1 tenant-admin route map and IA
2. E5-S1-T4 dashboard placeholders
3. E5-S1-T3 module-aware nav gating contract, only if module registry output exists

Validate:
- Run relevant web-admin lint, test, and typecheck commands.
- Run Playwright if navigation, auth gating, or visible shell behavior changes.

Handoff:
- Record exact routes, gating assumptions, module dependency assumptions, and Playwright evidence.
- Explicitly note any Epic 3 or Epic 4 dependencies that still block broader tenant-admin implementation.

Stop conditions:
- Stop if the task requires unfinished module registry, tenant bootstrap payloads, or operational settings APIs.
- Stop if the task drifts into implementing all admin screens instead of one shell slice.
```

## Epic 6 Prompt

```text
Task: Prepare and execute only the earliest dependency-safe Epic 6 domain-contract slice.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/epics/task-plan-index.md
- agents/epics/epic-06.md
- agents/epics/epic-06-tasks.md
- agents/epics/test-requirements-standard.md
- Epic 3 handoffs for module/template provisioning outputs
- Epic 5 handoffs for tenant operational settings and staff/user distinctions if available

Do:
- Work only on foundational domain contracts that can land without assuming unfinished admin UI or transaction flows.
- Safe scope tonight is schema-contract or shared-type preparation for E6-S1 through E6-S4, provided the work remains tenant-scoped, storage-aware, and contract-first.
- Prefer thin, stable domain contracts over broad CRUD or UI work.
- Do not start pricing, cart, checkout, availability, or booking lifecycle logic from Epic 7.

Preferred slices:
1. E6-S1-T1 catalog schema contract
2. E6-S2-T1 service schema contract
3. E6-S4-T1 content and SEO schema contract
4. E6-S6-T2 stable shared package types after one domain slice is complete

Validate:
- Run targeted API tests, shared types tests, and typecheck commands.
- Keep changes schema-safe and contract-focused.

Handoff:
- Record exact schema or shared-type contracts introduced, command evidence, and downstream consumers in Epic 6 and Epic 7.
- Call out any migration or persistence assumptions explicitly.

Stop conditions:
- Stop if the slice requires unfinished tenant-admin CRUD screens or transaction workflow assumptions.
- Stop if multiple domain modules become coupled in one packet.
```

## Epic 7 Prompt

```text
Task: Prepare only the earliest safe Epic 7 transaction-foundation design slice, and implement code only if all upstream domain contracts already exist.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/PLAYWRIGHT_AGENT_STANDARD.md if any UI surface is touched
- agents/epics/task-plan-index.md
- agents/epics/epic-07.md
- agents/epics/epic-07-tasks.md
- Epic 6 handoffs for catalog, services, staff, content, and shared domain contracts
- Epic 5 handoffs for operating rules and tenant settings if available

Do:
- Default to design-contract or packet-prep work unless Epic 6 dependencies are fully implemented and cited.
- If dependencies are complete, take only one narrow foundational slice such as pricing-engine inputs, order state machine design, or slot-computation input contracts.
- Do not attempt full checkout, booking, or customer-account implementation in one task.

Preferred slices:
1. E7-S1-T1 cart model and pricing inputs, only if catalog contracts are stable
2. E7-S3-T1 availability inputs, only if service, staff, and location contracts are stable
3. E7-S5-T4 cross-tenant identity behavior definition, only as a contract/doc slice

Validate:
- Run targeted unit and contract checks for whichever narrow slice is claimed.
- Run Playwright only if a browser-visible shell or customer-account surface actually changed.

Handoff:
- Record which upstream Epic 6 contracts were relied on.
- Record exact invariants for pricing, slot computation, tenant isolation, or customer-history scoping.
- If dependencies were not sufficient, leave a precise blocked or packet-prep handoff rather than guessing.

Stop conditions:
- Stop immediately if required Epic 6 contracts are incomplete.
- Stop if the work expands into both commerce and booking flows at once.
```

## Recommended Overnight Launch Order

Use this order if you want maximum safe throughput:

1. Launch up to three Epic 3 implementation agents first, each with a pre-assigned task ID.
2. Launch one Epic 4 agent only on a dependency-safe shared-frontend slice.
3. Hold broader Epic 5 through Epic 7 implementation until the first Epic 3 handoffs land, unless you deliberately want contract-prep-only work.

## Practical Recommendation

If the goal is to maximize completed implementation instead of speculative prep, prioritize:
- three Epic 3 implementation agents with fixed assignments
- one Epic 4 shared-frontend agent after that
- keep Epic 5 through Epic 7 in contract-prep or packet-prep mode overnight unless new dependency outputs arrive

## Additional Non-Dependency Overnight Prompts

Use these when you want extra VS Code agents working on repo hardening, ops readiness, or testing governance without consuming unfinished product dependencies.

### Epic 10 Security Governance Prompt

```text
Task: Execute a narrow Epic 10 security-governance slice that improves delivery safety without depending on unfinished feature epics.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/epics/task-plan-index.md
- agents/epics/epic-10.md
- agents/epics/epic-10-tasks.md
- .github/workflows/platform-ci.yml
- existing docs and CI steps related to dependency checks, secret hygiene, auth, imports, payments, and publish controls

Do:
- Stay inside E10-S5 only.
- Prefer one narrow slice such as security review checklist, dependency review automation, secret scanning, or remediation workflow documentation.
- Reuse existing CI structure rather than redesigning the pipeline.
- Do not add provider-specific security assumptions for unfinished payments, imports, or domain integrations.

Preferred slices:
1. E10-S5-T1 security review checklist
2. E10-S5-T2 dependency review and secret-scan workflow steps
3. E10-S5-T4 remediation workflow documentation

Validate:
- Run the relevant CI, lint, docs, or validation commands for any touched files.
- If workflow files change, confirm the modified workflow syntax remains valid.

Handoff:
- Record exact CI or local commands, new review gates, scan steps, and any still-manual security checks.
- Call out unresolved areas that still depend on Epics 8 and 9 implementation.

Stop conditions:
- Stop if the work expands into full infrastructure provisioning.
- Stop if the change requires implementing payments, onboarding imports, or publish features that do not yet exist.
```

### Epic 10 Recovery Runbook Prompt

```text
Task: Execute a narrow Epic 10 backup, recovery, or rollback readiness slice that can land tonight without waiting on unfinished business flows.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/epics/task-plan-index.md
- agents/epics/epic-10.md
- agents/epics/epic-10-tasks.md
- platform/apps/api/src/health.controller.ts
- platform/apps/worker/src/runtime.ts
- existing docs for tenant lifecycle, publish behavior, and operational standards

Do:
- Stay inside E10-S4 only.
- Prefer documentation-first work with narrowly scoped runtime or health-check hardening only where clearly supported by current code.
- Define recovery priority order, restore assumptions, worker drain expectations, rollback checklists, or operator runbooks.
- Do not invent restore procedures for systems not yet implemented.

Preferred slices:
1. E10-S4-T1 backup scope and recovery priorities
2. E10-S4-T2 recovery procedures for current API and worker runtime
3. E10-S4-T4 operator checklists and incident runbooks

Validate:
- Run relevant docs, lint, test, or typecheck commands for touched files.
- If runtime code changes, run the affected package tests.

Handoff:
- Record exact assumptions, rehearsal gaps, verification steps, and which recovery areas remain blocked by future Epics 8 and 9 work.

Stop conditions:
- Stop if the task turns into implementing a full backup platform.
- Stop if the procedure depends on payment, domain, or publish systems that are not implemented yet.
```

### Epic 10 Telemetry Schema Prompt

```text
Task: Execute a narrow Epic 10 telemetry-schema slice that standardizes observability contracts without waiting on unfinished product features.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/epics/task-plan-index.md
- agents/epics/epic-10.md
- agents/epics/epic-10-tasks.md
- platform/apps/api/src/app.module.ts
- platform/apps/api/src/health.controller.ts
- platform/apps/worker/src/runtime.ts
- existing audit and security-event services in platform/apps/api/src/auth/

Do:
- Stay inside E10-S1 only.
- Prefer telemetry schema, correlation-field, and redaction-rule work over broad instrumentation.
- If code is changed, keep it to thin API or worker entrypoint instrumentation that matches current scaffolding.
- Do not try to instrument unfinished commerce, booking, import, or publish pipelines.

Preferred slices:
1. E10-S1-T1 shared telemetry schema
2. E10-S1-T4 correlation and redaction documentation
3. a narrow part of E10-S1-T2 limited to current API and worker bootstrap paths

Validate:
- Run relevant API or worker lint, test, and typecheck commands.
- Keep any emitted fields tenant-safe and secret-safe.

Handoff:
- Record the telemetry schema, required correlation identifiers, redaction rules, and which runtime surfaces were actually instrumented.

Stop conditions:
- Stop if the task requires tracing across unfinished async workflows.
- Stop if the change starts assuming specific payment, import, or publish event schemas.
```

### Epic 10 Performance Budget Prompt

```text
Task: Execute a narrow Epic 10 performance-budget and capacity-planning slice that prepares future validation without requiring unfinished feature flows.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/epics/task-plan-index.md
- agents/epics/epic-10.md
- agents/epics/epic-10-tasks.md
- .github/workflows/platform-ci.yml
- current platform package scripts and existing health or smoke coverage

Do:
- Stay inside E10-S6 only.
- Prefer budget definitions, load-test planning, degradation expectations, and scaling-signal documentation.
- If harness code is added, keep it generic and detached from unfinished checkout, booking, import, or publish logic.
- Do not fabricate benchmark numbers; declare them as initial targets or placeholders with rationale.

Preferred slices:
1. E10-S6-T1 baseline latency and throughput budget table
2. E10-S6-T2 load or stress validation plan
3. E10-S6-T3 degradation expectations and operator actions
4. E10-S6-T4 capacity assumptions and scaling signals

Validate:
- Run relevant docs or workspace validation commands for any touched files.
- If scripts or harness files change, validate they are wired correctly.

Handoff:
- Record the declared budgets, confidence level, measurement gaps, and which flows remain placeholders until later epics are implemented.

Stop conditions:
- Stop if the task requires live payment, checkout, booking, or publish traffic generation.
- Stop if the work drifts from budget definition into broad infrastructure tuning.
```

### Epic 10 Playwright Governance Prompt

```text
Task: Execute a narrow Epic 10 Playwright-governance slice that improves browser-test reliability and reporting without depending on new product features.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/PLAYWRIGHT_AGENT_STANDARD.md
- agents/epics/task-plan-index.md
- agents/epics/epic-10.md
- agents/epics/epic-10-tasks.md
- .github/workflows/platform-ci.yml
- platform/playwright.config.ts
- platform/tests/e2e/support/

Do:
- Stay inside E10-S7 only.
- Prefer artifact reporting, command-reporting rules, flaky-test triage rules, and smoke-suite governance.
- Preserve the current required smoke coverage for web-customer, web-admin, and web-platform-admin.
- Do not remove required browser coverage to make CI look green.

Preferred slices:
1. E10-S7-T3 enforce command and artifact reporting in packets and handoffs
2. E10-S7-T4 flaky-test triage and quarantine rules
3. a narrow maintenance pass on E10-S7-T1 if smoke ownership or artifact naming needs tightening

Validate:
- Run the relevant Playwright smoke command if browser harness behavior changes.
- Run any touched docs or config validation commands.

Handoff:
- Record exact Playwright commands, project names, artifact paths, and any governance rule changes.
- Explicitly note whether Playwright impact was config-only or behavior-affecting.

Stop conditions:
- Stop if the task starts adding broad new product journeys that depend on unfinished epics.
- Stop if the change reduces required smoke coverage instead of strengthening governance.
```

## Expanded Overnight Launch Order

Use this order if you want more than four agents running safely:

1. Launch up to three Epic 3 implementation agents first, each with a fixed task ID.
2. Launch one Epic 4 agent only on a dependency-safe shared-frontend slice.
3. Then launch one or more Epic 10 ops agents on security governance, recovery runbooks, telemetry schema, performance budgets, or Playwright governance.
4. Hold broad Epic 8 and Epic 9 implementation until upstream product contracts exist.

## Expanded Practical Recommendation

If the goal is maximum safe overnight throughput, prioritize:
- three Epic 3 implementation agents with fixed assignments
- one Epic 4 shared-frontend foundation agent
- one to three Epic 10 hardening or ops-readiness agents
- keep Epic 5 through Epic 9 in contract-prep, packet-prep, or explicitly constrained work unless new dependency outputs arrive

## Fixed Assignment Recommendation

For the current ready queue, use fixed VS Code agent assignments instead of self-claiming prompts:

1. Agent 1: E3-S4-T1
2. Agent 2: E3-S5-T1
3. Agent 3: E3-S6-T1
4. Agent 4: one Epic 4 or Epic 10 narrow ops slice

Coordinator rule:
- only the human operator or one dedicated coordinator agent updates `agents/epics/handoffs/active-task-board.md`
- implementation agents should deliver code plus handoff notes only