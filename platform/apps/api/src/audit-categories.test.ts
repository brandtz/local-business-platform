import { describe, it, expect } from "vitest";
import {
	classifyEventKind,
	getEventKindsForCategory,
	getAllVisibleEventKinds,
	isTenantVisible,
	isPlatformInternal,
	resolveFilterEventKinds,
	createEmptyFilter,
	getCategoryLabel,
	auditCategories,
	platformInternalEventKinds
} from "./audit-categories.js";

// ── Category Classification ──────────────────────────────────────────────────

describe("classifyEventKind", () => {
	it("classifies team events", () => {
		expect(classifyEventKind("invitation_created")).toBe("team_changes");
		expect(classifyEventKind("role_changed")).toBe("team_changes");
		expect(classifyEventKind("staff_created")).toBe("team_changes");
	});

	it("classifies settings events", () => {
		expect(classifyEventKind("profile_updated")).toBe("settings_changes");
		expect(classifyEventKind("branding_updated")).toBe("settings_changes");
		expect(classifyEventKind("module_enabled")).toBe("settings_changes");
	});

	it("classifies location events", () => {
		expect(classifyEventKind("location_created")).toBe("location_changes");
		expect(classifyEventKind("hours_updated")).toBe("location_changes");
	});

	it("returns null for platform-internal events", () => {
		expect(classifyEventKind("tenant_provisioned")).toBeNull();
		expect(classifyEventKind("platform_admin_login")).toBeNull();
		expect(classifyEventKind("system_health_check")).toBeNull();
	});

	it("returns null for unknown events", () => {
		expect(classifyEventKind("some_unknown_event")).toBeNull();
	});
});

// ── Visibility Checks ────────────────────────────────────────────────────────

describe("isTenantVisible", () => {
	it("returns true for tenant events", () => {
		expect(isTenantVisible("invitation_created")).toBe(true);
		expect(isTenantVisible("profile_updated")).toBe(true);
	});

	it("returns false for platform events", () => {
		expect(isTenantVisible("tenant_provisioned")).toBe(false);
		expect(isTenantVisible("infrastructure_scaling")).toBe(false);
	});
});

describe("isPlatformInternal", () => {
	it("returns true for platform events", () => {
		expect(isPlatformInternal("tenant_provisioned")).toBe(true);
		expect(isPlatformInternal("database_migration")).toBe(true);
	});

	it("returns false for tenant events", () => {
		expect(isPlatformInternal("staff_created")).toBe(false);
	});
});

// ── Event Kind Retrieval ─────────────────────────────────────────────────────

describe("getEventKindsForCategory", () => {
	it("returns team event kinds", () => {
		const kinds = getEventKindsForCategory("team_changes");
		expect(kinds).toContain("invitation_created");
		expect(kinds).toContain("staff_deleted");
		expect(kinds.length).toBeGreaterThanOrEqual(10);
	});

	it("returns settings event kinds", () => {
		const kinds = getEventKindsForCategory("settings_changes");
		expect(kinds).toContain("profile_updated");
		expect(kinds).toContain("module_disabled");
	});

	it("returns location event kinds", () => {
		const kinds = getEventKindsForCategory("location_changes");
		expect(kinds).toContain("location_created");
		expect(kinds).toContain("hours_updated");
	});
});

describe("getAllVisibleEventKinds", () => {
	it("returns all visible kinds", () => {
		const all = getAllVisibleEventKinds();
		expect(all.length).toBeGreaterThanOrEqual(20);
	});

	it("does not include platform-internal events", () => {
		const all = new Set(getAllVisibleEventKinds());
		for (const internal of platformInternalEventKinds) {
			expect(all.has(internal)).toBe(false);
		}
	});
});

// ── Filter Resolution ────────────────────────────────────────────────────────

describe("resolveFilterEventKinds", () => {
	it("returns all visible kinds when no filter", () => {
		const kinds = resolveFilterEventKinds(createEmptyFilter());
		expect(kinds.length).toBeGreaterThan(0);
	});

	it("expands category filter to event kinds", () => {
		const filter = { ...createEmptyFilter(), categories: ["team_changes" as const] };
		const kinds = resolveFilterEventKinds(filter);
		expect(kinds).toContain("invitation_created");
		expect(kinds).not.toContain("profile_updated");
	});

	it("uses specific event kinds when provided", () => {
		const filter = {
			...createEmptyFilter(),
			eventKinds: ["staff_created", "staff_deleted"]
		};
		const kinds = resolveFilterEventKinds(filter);
		expect(kinds).toEqual(["staff_created", "staff_deleted"]);
	});

	it("intersects event kinds with category when both provided", () => {
		const filter = {
			...createEmptyFilter(),
			categories: ["team_changes" as const],
			eventKinds: ["staff_created", "profile_updated"]
		};
		const kinds = resolveFilterEventKinds(filter);
		// profile_updated is settings, not team_changes, so filtered out
		expect(kinds).toEqual(["staff_created"]);
	});
});

// ── Labels ───────────────────────────────────────────────────────────────────

describe("getCategoryLabel", () => {
	it("returns human-readable labels", () => {
		expect(getCategoryLabel("settings_changes")).toBe("Settings Changes");
		expect(getCategoryLabel("team_changes")).toBe("Team Changes");
		expect(getCategoryLabel("location_changes")).toBe("Location Changes");
		expect(getCategoryLabel("order_events")).toBe("Order Events");
	});
});

describe("auditCategories", () => {
	it("contains all 4 categories", () => {
		expect(auditCategories).toHaveLength(4);
	});
});
