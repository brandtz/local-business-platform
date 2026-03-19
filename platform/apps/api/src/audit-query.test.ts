import { describe, it, expect } from "vitest";
import {
	clampPageSize,
	buildQueryClauses,
	buildPaginatedResponse,
	validateTenantScope,
	validateDateRange,
	validateAuditQuery,
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE,
	type AuditLogEntry,
	type PaginatedRequest
} from "./audit-query.js";
import { createEmptyFilter } from "./audit-categories.js";

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
		summary: "Created staff member",
		metadata: {},
		timestamp: "2024-06-01T12:00:00Z",
		...overrides
	};
}

function makeRequest(
	overrides: Partial<PaginatedRequest> = {}
): PaginatedRequest {
	return {
		tenantId: "tenant-1",
		filter: createEmptyFilter(),
		cursor: null,
		limit: 25,
		...overrides
	};
}

// ── Page Size ────────────────────────────────────────────────────────────────

describe("clampPageSize", () => {
	it("returns DEFAULT for < 1", () => {
		expect(clampPageSize(0)).toBe(DEFAULT_PAGE_SIZE);
		expect(clampPageSize(-5)).toBe(DEFAULT_PAGE_SIZE);
	});

	it("caps at MAX_PAGE_SIZE", () => {
		expect(clampPageSize(500)).toBe(MAX_PAGE_SIZE);
	});

	it("passes through valid values", () => {
		expect(clampPageSize(50)).toBe(50);
	});
});

// ── Query Clauses ────────────────────────────────────────────────────────────

describe("buildQueryClauses", () => {
	it("builds clauses from request", () => {
		const request = makeRequest({ limit: 30 });
		const clauses = buildQueryClauses(request, ["staff_created"]);
		expect(clauses.tenantId).toBe("tenant-1");
		expect(clauses.eventKinds).toEqual(["staff_created"]);
		expect(clauses.limit).toBe(30);
		expect(clauses.cursor).toBeNull();
	});

	it("sets eventKinds null when empty", () => {
		const clauses = buildQueryClauses(makeRequest(), []);
		expect(clauses.eventKinds).toBeNull();
	});

	it("clamps the limit", () => {
		const clauses = buildQueryClauses(makeRequest({ limit: 999 }), []);
		expect(clauses.limit).toBe(MAX_PAGE_SIZE);
	});

	it("passes through filter fields", () => {
		const filter = {
			...createEmptyFilter(),
			actorId: "user-5",
			dateFrom: "2024-01-01"
		};
		const clauses = buildQueryClauses(makeRequest({ filter }), []);
		expect(clauses.actorId).toBe("user-5");
		expect(clauses.dateFrom).toBe("2024-01-01");
	});
});

// ── Paginated Response ───────────────────────────────────────────────────────

describe("buildPaginatedResponse", () => {
	it("builds response with no more pages", () => {
		const items = [makeEntry({ id: "e1" }), makeEntry({ id: "e2" })];
		const response = buildPaginatedResponse(items, 25, 2);
		expect(response.items).toHaveLength(2);
		expect(response.hasMore).toBe(false);
		expect(response.nextCursor).toBeNull();
		expect(response.totalEstimate).toBe(2);
	});

	it("detects more pages when items exceed limit", () => {
		const items = Array.from({ length: 26 }, (_, i) =>
			makeEntry({ id: `e${i}`, timestamp: `2024-06-01T${String(i).padStart(2, "0")}:00:00Z` })
		);
		const response = buildPaginatedResponse(items, 25, null);
		expect(response.items).toHaveLength(25);
		expect(response.hasMore).toBe(true);
		expect(response.nextCursor).toBeTruthy();
		expect(response.nextCursor!.afterId).toBe("e24");
	});

	it("handles empty result", () => {
		const response = buildPaginatedResponse([], 25, 0);
		expect(response.items).toEqual([]);
		expect(response.hasMore).toBe(false);
		expect(response.nextCursor).toBeNull();
	});
});

// ── Tenant Scope ─────────────────────────────────────────────────────────────

describe("validateTenantScope", () => {
	it("passes when tenant IDs match", () => {
		expect(validateTenantScope("t1", "t1")).toBe(true);
	});

	it("fails when tenant IDs differ", () => {
		expect(validateTenantScope("t1", "t2")).toBe(false);
	});
});

// ── Date Range Validation ────────────────────────────────────────────────────

describe("validateDateRange", () => {
	it("passes when both null", () => {
		expect(validateDateRange(null, null).valid).toBe(true);
	});

	it("passes when only one is set", () => {
		expect(validateDateRange("2024-01-01", null).valid).toBe(true);
		expect(validateDateRange(null, "2024-12-31").valid).toBe(true);
	});

	it("passes for valid range", () => {
		expect(
			validateDateRange("2024-01-01", "2024-12-31").valid
		).toBe(true);
	});

	it("fails when from > to", () => {
		const result = validateDateRange("2024-12-31", "2024-01-01");
		expect(result.valid).toBe(false);
	});

	it("fails for invalid date format", () => {
		const result = validateDateRange("not-a-date", "2024-01-01");
		expect(result.valid).toBe(false);
	});
});

// ── Query Validation ─────────────────────────────────────────────────────────

describe("validateAuditQuery", () => {
	it("passes for valid query", () => {
		const result = validateAuditQuery(makeRequest(), "tenant-1");
		expect(result.valid).toBe(true);
	});

	it("fails for tenant mismatch", () => {
		const result = validateAuditQuery(makeRequest(), "tenant-other");
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.messages[0]).toContain("Tenant mismatch");
		}
	});

	it("fails for invalid date range", () => {
		const filter = {
			...createEmptyFilter(),
			dateFrom: "2024-12-01",
			dateTo: "2024-01-01"
		};
		const result = validateAuditQuery(
			makeRequest({ filter }),
			"tenant-1"
		);
		expect(result.valid).toBe(false);
	});

	it("fails for invalid limit", () => {
		const result = validateAuditQuery(
			makeRequest({ limit: 0 }),
			"tenant-1"
		);
		expect(result.valid).toBe(false);
	});

	it("collects multiple validation errors", () => {
		const filter = {
			...createEmptyFilter(),
			dateFrom: "2024-12-01",
			dateTo: "2024-01-01"
		};
		const result = validateAuditQuery(
			makeRequest({ tenantId: "wrong", filter, limit: -1 }),
			"tenant-1"
		);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.messages.length).toBeGreaterThanOrEqual(2);
		}
	});
});
