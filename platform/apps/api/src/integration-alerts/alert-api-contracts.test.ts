// ---------------------------------------------------------------------------
// E8-S6-T3: Integration failure API contract tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
	validateAlertListQuery,
	assertNoSecretsInAlertView,
	assertPlatformAdminRole,
} from "./alert-api-contracts";
import type { OperationalAlertSummary, OperationalAlertDetail } from "@platform/types";

// ---------------------------------------------------------------------------
// Validation tests
// ---------------------------------------------------------------------------

describe("validateAlertListQuery", () => {
	it("accepts empty query (no filters)", () => {
		const result = validateAlertListQuery({});
		expect(result.valid).toBe(true);
		expect(result.query).toEqual({});
	});

	it("accepts valid category filter", () => {
		const result = validateAlertListQuery({
			category: "payment-connection-failure",
		});
		expect(result.valid).toBe(true);
		expect(result.query!.category).toBe("payment-connection-failure");
	});

	it("rejects invalid category", () => {
		const result = validateAlertListQuery({ category: "unknown" });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("category");
	});

	it("accepts valid severity filter", () => {
		const result = validateAlertListQuery({ severity: "critical" });
		expect(result.valid).toBe(true);
		expect(result.query!.severity).toBe("critical");
	});

	it("rejects invalid severity", () => {
		const result = validateAlertListQuery({ severity: "extreme" });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("severity");
	});

	it("accepts valid tenantId filter", () => {
		const result = validateAlertListQuery({ tenantId: "tenant-1" });
		expect(result.valid).toBe(true);
		expect(result.query!.tenantId).toBe("tenant-1");
	});

	it("rejects empty tenantId", () => {
		const result = validateAlertListQuery({ tenantId: "" });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("tenantId");
	});

	it("accepts boolean acknowledged filter", () => {
		const result = validateAlertListQuery({ acknowledged: true });
		expect(result.valid).toBe(true);
		expect(result.query!.acknowledged).toBe(true);
	});

	it("rejects non-boolean acknowledged", () => {
		const result = validateAlertListQuery({ acknowledged: "yes" });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("acknowledged");
	});

	it("accepts valid date range", () => {
		const result = validateAlertListQuery({
			startDate: "2026-03-01T00:00:00.000Z",
			endDate: "2026-03-22T23:59:59.999Z",
		});
		expect(result.valid).toBe(true);
		expect(result.query!.startDate).toBe("2026-03-01T00:00:00.000Z");
		expect(result.query!.endDate).toBe("2026-03-22T23:59:59.999Z");
	});

	it("rejects invalid startDate", () => {
		const result = validateAlertListQuery({ startDate: "not-a-date" });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("startDate");
	});

	it("rejects invalid endDate", () => {
		const result = validateAlertListQuery({ endDate: "not-a-date" });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("endDate");
	});

	it("accepts valid limit and offset", () => {
		const result = validateAlertListQuery({ limit: 25, offset: 50 });
		expect(result.valid).toBe(true);
		expect(result.query!.limit).toBe(25);
		expect(result.query!.offset).toBe(50);
	});

	it("rejects limit out of range", () => {
		expect(validateAlertListQuery({ limit: 0 }).valid).toBe(false);
		expect(validateAlertListQuery({ limit: 200 }).valid).toBe(false);
	});

	it("rejects negative offset", () => {
		const result = validateAlertListQuery({ offset: -1 });
		expect(result.valid).toBe(false);
		expect(result.error).toContain("offset");
	});

	it("accepts all valid filters combined", () => {
		const result = validateAlertListQuery({
			category: "webhook-processing-failure",
			severity: "warning",
			tenantId: "tenant-1",
			acknowledged: false,
			startDate: "2026-03-01T00:00:00.000Z",
			endDate: "2026-03-22T23:59:59.999Z",
			limit: 10,
			offset: 0,
		});
		expect(result.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Security assertion tests
// ---------------------------------------------------------------------------

describe("assertNoSecretsInAlertView", () => {
	it("passes for clean summary data", () => {
		const summary: OperationalAlertSummary = {
			id: "alert-1",
			category: "payment-connection-failure",
			severity: "warning",
			tenantId: "tenant-1",
			summary: "Credential verification failed",
			occurrenceCount: 1,
			acknowledged: false,
			timestamp: "2026-03-22T12:00:00.000Z",
		};
		expect(assertNoSecretsInAlertView(summary)).toBe(true);
	});

	it("passes for clean detail data", () => {
		const detail: OperationalAlertDetail = {
			id: "alert-1",
			category: "payment-connection-failure",
			severity: "warning",
			tenantId: "tenant-1",
			summary: "Credential verification failed",
			occurrenceCount: 1,
			acknowledged: false,
			timestamp: "2026-03-22T12:00:00.000Z",
			context: {
				sourceModule: "payment",
				entityId: "conn-1",
				entityType: "payment-connection",
				provider: "stripe",
				errorMessage: "API returned 401",
			},
			resolutionHint: "Re-verify credentials.",
		};
		expect(assertNoSecretsInAlertView(detail)).toBe(true);
	});

	it("fails if encryptedCredentials appears in data", () => {
		const bad = {
			id: "alert-1",
			encryptedCredentials: "abc123",
		};
		expect(assertNoSecretsInAlertView(bad)).toBe(false);
	});

	it("fails if secretKey appears in data", () => {
		const bad = {
			id: "alert-1",
			context: { secretKey: "sk_test_xxx" },
		};
		expect(assertNoSecretsInAlertView(bad)).toBe(false);
	});

	it("fails if PII fields appear in data", () => {
		const bad = {
			id: "alert-1",
			context: { email: "user@example.com" },
		};
		expect(assertNoSecretsInAlertView(bad)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Authorization tests
// ---------------------------------------------------------------------------

describe("assertPlatformAdminRole", () => {
	it("allows platform-admin role", () => {
		expect(assertPlatformAdminRole("platform-admin")).toBe(true);
	});

	it("rejects tenant-admin role", () => {
		expect(assertPlatformAdminRole("tenant-admin")).toBe(false);
	});

	it("rejects customer role", () => {
		expect(assertPlatformAdminRole("customer")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(assertPlatformAdminRole("")).toBe(false);
	});
});
