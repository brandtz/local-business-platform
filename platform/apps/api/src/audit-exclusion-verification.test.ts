// E5-S6-T4: Platform-internal data exclusion verification.
// Security-oriented test suite confirming that every platform-internal event kind
// is excluded from tenant-visible APIs, filters, and query surfaces.

import { describe, it, expect } from "vitest";
import {
	platformInternalEventKinds,
	isTenantVisible,
	isPlatformInternal,
	classifyEventKind,
	getAllVisibleEventKinds,
	resolveFilterEventKinds,
	getEventKindsForCategory,
	auditCategories,
	createEmptyFilter
} from "./audit-categories.js";
import type { AuditFilterCriteria } from "./audit-categories.js";
import { validateTenantScope } from "./audit-query.js";

// ── Exhaustive per-kind exclusion ────────────────────────────────────────────

describe("platform-internal event exclusion (per kind)", () => {
	it.each(platformInternalEventKinds.map((k) => [k]))(
		"%s is platform-internal",
		(kind) => {
			expect(isPlatformInternal(kind)).toBe(true);
		}
	);

	it.each(platformInternalEventKinds.map((k) => [k]))(
		"%s is never tenant-visible",
		(kind) => {
			expect(isTenantVisible(kind)).toBe(false);
		}
	);

	it.each(platformInternalEventKinds.map((k) => [k]))(
		"%s classifies to null (no category)",
		(kind) => {
			expect(classifyEventKind(kind)).toBeNull();
		}
	);
});

// ── All 10 platform-internal kinds accounted for ─────────────────────────────

describe("platform-internal kind completeness", () => {
	it("contains exactly 10 platform-internal event kinds", () => {
		expect(platformInternalEventKinds).toHaveLength(10);
	});

	const expectedKinds = [
		"tenant_provisioned",
		"tenant_suspended",
		"tenant_deleted",
		"platform_admin_login",
		"platform_admin_impersonation",
		"system_health_check",
		"infrastructure_scaling",
		"database_migration",
		"billing_sync",
		"feature_flag_changed"
	];

	it.each(expectedKinds.map((k) => [k]))(
		"includes %s in the platform-internal list",
		(kind) => {
			expect(
				(platformInternalEventKinds as readonly string[]).includes(kind)
			).toBe(true);
		}
	);
});

// ── Visible-event list never contains platform events ────────────────────────

describe("getAllVisibleEventKinds exclusion", () => {
	it("returns no platform-internal events", () => {
		const visible = getAllVisibleEventKinds();
		for (const kind of platformInternalEventKinds) {
			expect(visible).not.toContain(kind);
		}
	});
});

// ── Category mapping rejects platform events ─────────────────────────────────

describe("category mapping exclusion", () => {
	it("no category contains a platform-internal event kind", () => {
		for (const category of auditCategories) {
			const kinds = getEventKindsForCategory(category);
			for (const internal of platformInternalEventKinds) {
				expect(kinds).not.toContain(internal);
			}
		}
	});
});

// ── Filter resolution never returns platform events ──────────────────────────

describe("resolveFilterEventKinds exclusion", () => {
	it("empty filter returns only tenant-visible kinds", () => {
		const resolved = resolveFilterEventKinds(createEmptyFilter());
		for (const kind of platformInternalEventKinds) {
			expect(resolved).not.toContain(kind);
		}
	});

	it("category-based filter never includes platform events", () => {
		for (const category of auditCategories) {
			const filter: AuditFilterCriteria = {
				...createEmptyFilter(),
				categories: [category]
			};
			const resolved = resolveFilterEventKinds(filter);
			for (const internal of platformInternalEventKinds) {
				expect(resolved).not.toContain(internal);
			}
		}
	});

	it("all-categories filter never includes platform events", () => {
		const filter: AuditFilterCriteria = {
			...createEmptyFilter(),
			categories: [...auditCategories]
		};
		const resolved = resolveFilterEventKinds(filter);
		for (const internal of platformInternalEventKinds) {
			expect(resolved).not.toContain(internal);
		}
	});

	it("explicit platform-internal event kinds produce empty result when intersected with categories", () => {
		const filter: AuditFilterCriteria = {
			...createEmptyFilter(),
			categories: [...auditCategories],
			eventKinds: [...platformInternalEventKinds]
		};
		const resolved = resolveFilterEventKinds(filter);
		expect(resolved).toHaveLength(0);
	});

	it("mixing platform-internal and valid kinds filters out internals", () => {
		const filter: AuditFilterCriteria = {
			...createEmptyFilter(),
			categories: ["team_changes"],
			eventKinds: ["staff_created", "tenant_provisioned"]
		};
		const resolved = resolveFilterEventKinds(filter);
		expect(resolved).toContain("staff_created");
		expect(resolved).not.toContain("tenant_provisioned");
	});
});

// ── Tenant scope validation ──────────────────────────────────────────────────

describe("validateTenantScope", () => {
	it("rejects mismatched tenant IDs", () => {
		expect(validateTenantScope("tenant-a", "tenant-b")).toBe(false);
	});

	it("rejects when queried tenant is empty", () => {
		expect(validateTenantScope("", "tenant-a")).toBe(false);
	});

	it("accepts matching tenant IDs", () => {
		expect(validateTenantScope("tenant-abc", "tenant-abc")).toBe(true);
	});
});

// ── Boundary: unknown events treated as non-visible ──────────────────────────

describe("unknown event kind handling", () => {
	it("unknown event is not tenant-visible", () => {
		expect(isTenantVisible("totally_unknown_event")).toBe(false);
	});

	it("unknown event is not platform-internal", () => {
		expect(isPlatformInternal("totally_unknown_event")).toBe(false);
	});

	it("unknown event classifies to null", () => {
		expect(classifyEventKind("totally_unknown_event")).toBeNull();
	});
});

// ── No overlap between platform-internal and any tenant category ─────────────

describe("disjointness guarantee", () => {
	it("platform-internal set and visible set are completely disjoint", () => {
		const visible = new Set(getAllVisibleEventKinds());
		const internal = new Set<string>(platformInternalEventKinds);
		const overlap = [...visible].filter((k) => internal.has(k));
		expect(overlap).toEqual([]);
	});
});
