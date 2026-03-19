import { describe, it, expect } from "vitest";
import {
	createInitialLogState,
	createDefaultFilters,
	toEntryDisplay,
	formatRelativeTime,
	buildEventDetails,
	getCategoryBadge,
	hasActiveFilters,
	clearFilters,
	toggleEntryExpansion,
	appendEntries,
	canViewActivityLog
} from "./activity-log-views.js";
import type { AuditLogEntry } from "./../../api/src/audit-query.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
	return {
		id: "entry-1",
		tenantId: "tenant-1",
		eventKind: "staff_created",
		category: "team_changes",
		actorId: "user-1",
		actorDisplayName: "Alice",
		entityId: "staff-1",
		entityType: "staff",
		summary: "Created staff member Alice",
		metadata: {},
		timestamp: "2024-06-01T12:00:00Z",
		...overrides
	};
}

// ── Initial State ────────────────────────────────────────────────────────────

describe("createInitialLogState", () => {
	it("creates empty state", () => {
		const state = createInitialLogState();
		expect(state.entries).toEqual([]);
		expect(state.isLoading).toBe(false);
		expect(state.hasMore).toBe(false);
		expect(state.expandedEntryId).toBeNull();
	});
});

// ── Entry Display ────────────────────────────────────────────────────────────

describe("toEntryDisplay", () => {
	it("maps entry to display shape", () => {
		const entry = makeEntry();
		const now = new Date("2024-06-01T12:05:00Z");
		const display = toEntryDisplay(entry, null, now);
		expect(display.id).toBe("entry-1");
		expect(display.actorName).toBe("Alice");
		expect(display.categoryLabel).toBe("Team");
		expect(display.isExpanded).toBe(false);
		expect(display.relativeTime).toBe("5m ago");
	});

	it("marks as expanded when ID matches", () => {
		const display = toEntryDisplay(makeEntry(), "entry-1");
		expect(display.isExpanded).toBe(true);
	});
});

// ── Relative Time ────────────────────────────────────────────────────────────

describe("formatRelativeTime", () => {
	const base = new Date("2024-06-01T12:00:00Z");

	it("returns 'just now' for < 60 seconds", () => {
		expect(
			formatRelativeTime("2024-06-01T11:59:30Z", base)
		).toBe("just now");
	});

	it("returns minutes for < 60 minutes", () => {
		expect(
			formatRelativeTime("2024-06-01T11:45:00Z", base)
		).toBe("15m ago");
	});

	it("returns hours for < 24 hours", () => {
		expect(
			formatRelativeTime("2024-06-01T09:00:00Z", base)
		).toBe("3h ago");
	});

	it("returns days for < 7 days", () => {
		expect(
			formatRelativeTime("2024-05-30T12:00:00Z", base)
		).toBe("2d ago");
	});

	it("returns date string for >= 7 days", () => {
		const result = formatRelativeTime("2024-05-01T12:00:00Z", base);
		// Should be a date string (locale-dependent, just check it's not relative)
		expect(result).not.toContain("ago");
	});
});

// ── Event Details ────────────────────────────────────────────────────────────

describe("buildEventDetails", () => {
	it("includes base fields", () => {
		const details = buildEventDetails(makeEntry());
		const labels = details.map((d) => d.label);
		expect(labels).toContain("Event ID");
		expect(labels).toContain("Event Type");
		expect(labels).toContain("Actor");
		expect(labels).toContain("Timestamp");
	});

	it("includes entity fields when present", () => {
		const details = buildEventDetails(makeEntry());
		expect(details.find((d) => d.label === "Entity ID")!.value).toBe(
			"staff-1"
		);
	});

	it("omits entity fields when null", () => {
		const details = buildEventDetails(
			makeEntry({ entityId: null, entityType: null })
		);
		expect(details.find((d) => d.label === "Entity ID")).toBeUndefined();
	});

	it("includes metadata entries", () => {
		const details = buildEventDetails(
			makeEntry({ metadata: { role: "admin", count: 3 } })
		);
		expect(details.find((d) => d.label === "role")!.value).toBe("admin");
		expect(details.find((d) => d.label === "count")!.value).toBe("3");
	});
});

// ── Category Badge ───────────────────────────────────────────────────────────

describe("getCategoryBadge", () => {
	it("returns badge for each category", () => {
		expect(getCategoryBadge("team_changes").variant).toBe("success");
		expect(getCategoryBadge("settings_changes").variant).toBe("info");
		expect(getCategoryBadge("location_changes").variant).toBe("warning");
		expect(getCategoryBadge("order_events").variant).toBe("neutral");
	});
});

// ── Filter Helpers ───────────────────────────────────────────────────────────

describe("hasActiveFilters", () => {
	it("returns false for default filters", () => {
		expect(hasActiveFilters(createDefaultFilters())).toBe(false);
	});

	it("returns true when a category is selected", () => {
		expect(
			hasActiveFilters({
				...createDefaultFilters(),
				selectedCategories: ["team_changes"]
			})
		).toBe(true);
	});

	it("returns true when search query is set", () => {
		expect(
			hasActiveFilters({
				...createDefaultFilters(),
				searchQuery: "alice"
			})
		).toBe(true);
	});
});

describe("clearFilters", () => {
	it("resets filters and entries", () => {
		const state = {
			...createInitialLogState(),
			entries: [makeEntry()],
			hasMore: true,
			filters: {
				...createDefaultFilters(),
				selectedCategories: ["team_changes" as const]
			}
		};
		const cleared = clearFilters(state);
		expect(cleared.entries).toEqual([]);
		expect(cleared.hasMore).toBe(false);
		expect(cleared.filters.selectedCategories).toEqual([]);
	});
});

// ── Expand/Collapse ──────────────────────────────────────────────────────────

describe("toggleEntryExpansion", () => {
	it("expands an entry", () => {
		const state = createInitialLogState();
		const toggled = toggleEntryExpansion(state, "entry-1");
		expect(toggled.expandedEntryId).toBe("entry-1");
	});

	it("collapses when toggling same entry", () => {
		const state = { ...createInitialLogState(), expandedEntryId: "entry-1" };
		const toggled = toggleEntryExpansion(state, "entry-1");
		expect(toggled.expandedEntryId).toBeNull();
	});

	it("switches to different entry", () => {
		const state = { ...createInitialLogState(), expandedEntryId: "entry-1" };
		const toggled = toggleEntryExpansion(state, "entry-2");
		expect(toggled.expandedEntryId).toBe("entry-2");
	});
});

// ── Load More ────────────────────────────────────────────────────────────────

describe("appendEntries", () => {
	it("appends new entries", () => {
		const state = {
			...createInitialLogState(),
			entries: [makeEntry({ id: "e1" })]
		};
		const updated = appendEntries(
			state,
			[makeEntry({ id: "e2" })],
			{ afterId: "e2", afterTimestamp: "2024-06-01T12:00:00Z" },
			true
		);
		expect(updated.entries).toHaveLength(2);
		expect(updated.hasMore).toBe(true);
		expect(updated.cursor).toBeTruthy();
		expect(updated.isLoading).toBe(false);
	});
});

// ── Access Check ─────────────────────────────────────────────────────────────

describe("canViewActivityLog", () => {
	it("allows owner", () => {
		expect(canViewActivityLog("owner")).toBe(true);
	});

	it("allows admin", () => {
		expect(canViewActivityLog("admin")).toBe(true);
	});

	it("denies manager", () => {
		expect(canViewActivityLog("manager")).toBe(false);
	});

	it("denies staff", () => {
		expect(canViewActivityLog("staff")).toBe(false);
	});
});
