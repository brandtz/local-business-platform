import { describe, expect, it } from "vitest";

import type {
	PublishedReleaseSnapshot,
	TenantCustomDomainRecord,
	TenantSummary
} from "@platform/types";

import {
	DomainActivationGateService,
	type DomainActivationGateRequest
} from "./domain-activation-gate.service";

function createTenant(
	overrides: Partial<TenantSummary> = {}
): TenantSummary {
	return {
		displayName: "Test Tenant",
		id: "t-1",
		slug: "test-tenant",
		status: "active",
		...overrides
	};
}

function createDomainRecord(
	overrides: Partial<TenantCustomDomainRecord> = {}
): TenantCustomDomainRecord {
	return {
		createdAt: "2026-01-01T00:00:00Z",
		hostname: "example.com",
		id: "dom-1",
		promotionState: "not-requested",
		tenantId: "t-1",
		updatedAt: "2026-01-01T00:00:00Z",
		verificationState: "verified",
		...overrides
	};
}

function createHealthyRelease(): PublishedReleaseSnapshot {
	return {
		releaseId: "rel-1",
		status: "healthy",
		publishedAt: "2026-03-20T00:00:00Z",
		version: 1
	};
}

function createGateRequest(
	overrides: Partial<DomainActivationGateRequest> = {}
): DomainActivationGateRequest {
	return {
		tenant: createTenant(),
		domainRecord: createDomainRecord(),
		publishedRelease: createHealthyRelease(),
		hasValidRoutingConfig: true,
		...overrides
	};
}

describe("DomainActivationGateService", () => {
	const service = new DomainActivationGateService();

	describe("evaluate", () => {
		it("allows activation when all checks pass", () => {
			const result = service.evaluate(createGateRequest());

			expect(result.kind).toBe("allowed");
			expect(result.readinessReport.ready).toBe(true);
			expect(result.readinessReport.checks.every((c) => c.passed)).toBe(true);
		});

		it("denies activation when tenant is not active", () => {
			const result = service.evaluate(
				createGateRequest({
					tenant: createTenant({ status: "draft" })
				})
			);

			expect(result.kind).toBe("denied");

			if (result.kind === "denied") {
				expect(result.denialReasons).toContain("tenant-not-active");
			}
		});

		it("denies activation when domain is not verified", () => {
			const result = service.evaluate(
				createGateRequest({
					domainRecord: createDomainRecord({ verificationState: "pending" })
				})
			);

			expect(result.kind).toBe("denied");

			if (result.kind === "denied") {
				expect(result.denialReasons).toContain("domain-not-verified");
			}
		});

		it("denies activation when routing config is invalid", () => {
			const result = service.evaluate(
				createGateRequest({ hasValidRoutingConfig: false })
			);

			expect(result.kind).toBe("denied");

			if (result.kind === "denied") {
				expect(result.denialReasons).toContain("routing-config-invalid");
			}
		});

		it("denies activation when no published release exists", () => {
			const result = service.evaluate(
				createGateRequest({ publishedRelease: null })
			);

			expect(result.kind).toBe("denied");

			if (result.kind === "denied") {
				expect(result.denialReasons).toContain("no-published-release");
				expect(result.denialReasons).toContain("release-health-not-green");
			}
		});

		it("denies activation when release health is not green", () => {
			const result = service.evaluate(
				createGateRequest({
					publishedRelease: {
						releaseId: "rel-1",
						status: "degraded",
						publishedAt: "2026-03-20T00:00:00Z",
						version: 1
					}
				})
			);

			expect(result.kind).toBe("denied");

			if (result.kind === "denied") {
				expect(result.denialReasons).toContain("release-health-not-green");
				expect(result.denialReasons).not.toContain("no-published-release");
			}
		});

		it("denies activation when release status is missing", () => {
			const result = service.evaluate(
				createGateRequest({
					publishedRelease: {
						releaseId: null,
						status: "missing",
						publishedAt: null,
						version: null
					}
				})
			);

			expect(result.kind).toBe("denied");

			if (result.kind === "denied") {
				expect(result.denialReasons).toContain("no-published-release");
			}
		});

		it("collects multiple denial reasons when multiple checks fail", () => {
			const result = service.evaluate(
				createGateRequest({
					tenant: createTenant({ status: "suspended" }),
					domainRecord: createDomainRecord({ verificationState: "failed" }),
					publishedRelease: null,
					hasValidRoutingConfig: false
				})
			);

			expect(result.kind).toBe("denied");

			if (result.kind === "denied") {
				expect(result.denialReasons).toHaveLength(5);
				expect(result.denialReasons).toContain("tenant-not-active");
				expect(result.denialReasons).toContain("domain-not-verified");
				expect(result.denialReasons).toContain("routing-config-invalid");
				expect(result.denialReasons).toContain("no-published-release");
				expect(result.denialReasons).toContain("release-health-not-green");
			}
		});

		it("includes readiness report in both allowed and denied results", () => {
			const allowedResult = service.evaluate(createGateRequest());
			expect(allowedResult.readinessReport).toBeDefined();
			expect(allowedResult.readinessReport.tenantId).toBe("t-1");

			const deniedResult = service.evaluate(
				createGateRequest({ publishedRelease: null })
			);
			expect(deniedResult.readinessReport).toBeDefined();
			expect(deniedResult.readinessReport.tenantId).toBe("t-1");
		});

		it("includes evaluatedAt timestamp in report", () => {
			const result = service.evaluate(createGateRequest());

			expect(result.readinessReport.evaluatedAt).toBeTruthy();
			expect(() => new Date(result.readinessReport.evaluatedAt)).not.toThrow();
		});

		it("provides machine-readable reasons in check results", () => {
			const result = service.evaluate(
				createGateRequest({
					tenant: createTenant({ status: "draft" })
				})
			);

			const tenantCheck = result.readinessReport.checks.find(
				(c) => c.checkId === "tenant-active"
			);

			expect(tenantCheck).toBeDefined();
			expect(tenantCheck!.passed).toBe(false);
			expect(tenantCheck!.reason).toContain("draft");
		});
	});

	describe("tenant isolation", () => {
		it("operates only on the provided tenant context", () => {
			const resultA = service.evaluate(
				createGateRequest({
					tenant: createTenant({ id: "t-a" }),
					domainRecord: createDomainRecord({ tenantId: "t-a", id: "dom-a" })
				})
			);

			const resultB = service.evaluate(
				createGateRequest({
					tenant: createTenant({ id: "t-b", status: "draft" }),
					domainRecord: createDomainRecord({ tenantId: "t-b", id: "dom-b" })
				})
			);

			expect(resultA.tenantId).toBe("t-a");
			expect(resultA.kind).toBe("allowed");
			expect(resultB.tenantId).toBe("t-b");
			expect(resultB.kind).toBe("denied");
		});
	});
});
