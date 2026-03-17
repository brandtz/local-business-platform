# Cloud Agent Prompt Pack: Epics 3 Through 7

Use these prompts for unattended cloud-agent execution.

Important:
- Epic 3 is implementation-ready now.
- Epics 4 through 7 should not be treated as wide-open implementation epics yet. Their prompts below are written to keep agents inside dependency-safe scope.
- Every agent must still follow `agents/cloud-agent-overnight-runbook.md`, `agents/README.md`, `agents/PLAYWRIGHT_AGENT_STANDARD.md` when UI is affected, and `agents/epics/handoffs/active-task-board.md`.

## Epic 3 Prompt

```text
Task: Execute one ready Epic 3 task from the active board.

Read:
- agents/cloud-agent-overnight-runbook.md
- agents/README.md
- agents/epics/task-plan-index.md
- agents/epics/handoffs/active-task-board.md
- agents/epics/overnight-priority-queue.md
- the specific Epic 3 packet you are claiming
- the latest dependency handoff named in that packet
- agents/PLAYWRIGHT_AGENT_STANDARD.md only if your claimed task changes browser-visible behavior

Do:
- Claim exactly one Ready task from Epic 3 and move it to In Progress in agents/epics/handoffs/active-task-board.md before editing.
- Implement only the scoped packet objective.
- Preserve tenant isolation, platform-only control semantics, preview-route fail-closed behavior, and deterministic configuration contracts.
- Do not absorb downstream work from dependent tasks.

Priority claim order:
1. E3-S3-T2
2. E3-S4-T1
3. E3-S5-T1
4. E3-S6-T1

Validate:
- Run the exact validation commands named in the packet.
- If browser-visible behavior changes, also run the required Playwright command and record the project names.

Handoff:
- Create the required handoff note in agents/epics/handoffs/.
- Update the active task board to Completed, Blocked, or Partially Completed.
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
- Update the active board only if you created and claimed a packeted task in repo.

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

1. Launch up to four Epic 3 agents first, one per Ready task.
2. Launch one Epic 4 agent only on a dependency-safe shared-frontend slice.
3. Hold broader Epic 5 through Epic 7 implementation until the first Epic 3 handoffs land, unless you deliberately want contract-prep-only work.

## Practical Recommendation

If the goal is to maximize completed implementation instead of speculative prep, prioritize:
- four Epic 3 agents in parallel now
- one Epic 4 shared-frontend agent after that
- keep Epic 5 through Epic 7 in contract-prep or packet-prep mode overnight unless new dependency outputs arrive