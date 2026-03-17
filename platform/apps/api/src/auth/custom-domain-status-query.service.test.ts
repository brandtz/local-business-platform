import { describe, expect, it } from "vitest";

import type { TenantCustomDomainRecord } from "@platform/types";

import {
	CustomDomainStatusQueryService,
	type CustomDomainStatusSummary,
	type TenantDomainStatusResult
} from "./custom-domain-status-query.service";

function createRecord(
	overrides: Partial<TenantCustomDomainRecord> = {}
): TenantCustomDomainRecord {
	return {
		createdAt: "2026-01-01T00:00:00Z",
		hostname: "example.com",
		id: "dom-1",
		promotionState: "not-requested",
		tenantId: "t-1",
		updatedAt: "2026-01-01T00:00:00Z",
		verificationState: "pending",
		...overrides
	};
}

function createService(): CustomDomainStatusQueryService {
	return new CustomDomainStatusQueryService();
}

describe("CustomDomainStatusQueryService", () => {
	describe("getTenantDomainStatus", () => {
		it("returns domains belonging to the requested tenant", () => {
			const service = createService();
			const result = service.getTenantDomainStatus({
				tenantId: "t-1",
				domainRecords: [
					createRecord({ id: "dom-1", tenantId: "t-1", hostname: "a.com" }),
					createRecord({ id: "dom-2", tenantId: "t-1", hostname: "b.com" })
				]
			});

			expect(result.tenantId).toBe("t-1");
			expect(result.domains).toHaveLength(2);
			expect(result.domains[0].hostname).toBe("a.com");
			expect(result.domains[1].hostname).toBe("b.com");
		});

		it("filters out domains belonging to other tenants", () => {
			const service = createService();
			const result = service.getTenantDomainStatus({
				tenantId: "t-1",
				domainRecords: [
					createRecord({ id: "dom-1", tenantId: "t-1", hostname: "mine.com" }),
					createRecord({ id: "dom-2", tenantId: "t-2", hostname: "other.com" })
				]
			});

			expect(result.domains).toHaveLength(1);
			expect(result.domains[0].hostname).toBe("mine.com");
		});

		it("returns empty domains array when no records match", () => {
			const service = createService();
			const result = service.getTenantDomainStatus({
				tenantId: "t-1",
				domainRecords: [
					createRecord({ id: "dom-1", tenantId: "t-2" })
				]
			});

			expect(result.domains).toHaveLength(0);
			expect(result.tenantId).toBe("t-1");
		});

		it("exposes verification and promotion states in summary", () => {
			const service = createService();
			const result = service.getTenantDomainStatus({
				tenantId: "t-1",
				domainRecords: [
					createRecord({
						verificationState: "verified",
						promotionState: "promoted",
						hostname: "live.com"
					})
				]
			});

			const domain = result.domains[0];
			expect(domain.verificationState).toBe("verified");
			expect(domain.promotionState).toBe("promoted");
		});

		it("includes failure reasons when present", () => {
			const service = createService();
			const result = service.getTenantDomainStatus({
				tenantId: "t-1",
				domainRecords: [
					createRecord({
						verificationState: "failed",
						verificationFailureReason: "DNS check failed",
						promotionState: "failed",
						promotionFailureReason: "CDN config error"
					})
				]
			});

			const domain = result.domains[0];
			expect(domain.verificationFailureReason).toBe("DNS check failed");
			expect(domain.promotionFailureReason).toBe("CDN config error");
		});

		it("normalizes missing failure reasons to null", () => {
			const service = createService();
			const result = service.getTenantDomainStatus({
				tenantId: "t-1",
				domainRecords: [createRecord()]
			});

			const domain = result.domains[0];
			expect(domain.verificationFailureReason).toBeNull();
			expect(domain.promotionFailureReason).toBeNull();
		});
	});

	describe("getPlatformDomainStatus", () => {
		it("returns domain summaries for multiple tenants", () => {
			const service = createService();
			const result = service.getPlatformDomainStatus({
				tenants: [
					{
						tenantId: "t-1",
						domainRecords: [
							createRecord({ id: "dom-1", tenantId: "t-1", hostname: "a.com" })
						]
					},
					{
						tenantId: "t-2",
						domainRecords: [
							createRecord({ id: "dom-2", tenantId: "t-2", hostname: "b.com" }),
							createRecord({ id: "dom-3", tenantId: "t-2", hostname: "c.com" })
						]
					}
				]
			});

			expect(result.tenants).toHaveLength(2);
			expect(result.tenants[0].tenantId).toBe("t-1");
			expect(result.tenants[0].domains).toHaveLength(1);
			expect(result.tenants[1].tenantId).toBe("t-2");
			expect(result.tenants[1].domains).toHaveLength(2);
		});

		it("returns empty tenants array when given no tenants", () => {
			const service = createService();
			const result = service.getPlatformDomainStatus({ tenants: [] });

			expect(result.tenants).toHaveLength(0);
		});

		it("isolates domain records per tenant — no cross-tenant leakage", () => {
			const service = createService();
			const result = service.getPlatformDomainStatus({
				tenants: [
					{
						tenantId: "t-1",
						domainRecords: [
							createRecord({ id: "dom-1", tenantId: "t-1" }),
							createRecord({ id: "dom-2", tenantId: "t-2" })
						]
					},
					{
						tenantId: "t-2",
						domainRecords: [
							createRecord({ id: "dom-2", tenantId: "t-2" }),
							createRecord({ id: "dom-1", tenantId: "t-1" })
						]
					}
				]
			});

			expect(result.tenants[0].domains).toHaveLength(1);
			expect(result.tenants[0].domains[0].tenantId).toBe("t-1");
			expect(result.tenants[1].domains).toHaveLength(1);
			expect(result.tenants[1].domains[0].tenantId).toBe("t-2");
		});
	});

	describe("contract stability", () => {
		it("summary shape has all required fields", () => {
			const service = createService();
			const result = service.getTenantDomainStatus({
				tenantId: "t-1",
				domainRecords: [
					createRecord({
						verificationState: "verified",
						promotionState: "ready",
						hostname: "test.com"
					})
				]
			});

			const domain = result.domains[0];
			const expectedKeys: (keyof CustomDomainStatusSummary)[] = [
				"hostname",
				"id",
				"promotionState",
				"promotionFailureReason",
				"tenantId",
				"verificationState",
				"verificationFailureReason"
			];

			for (const key of expectedKeys) {
				expect(domain).toHaveProperty(key);
			}
		});

		it("tenant result shape has tenantId and domains", () => {
			const service = createService();
			const result = service.getTenantDomainStatus({
				tenantId: "t-1",
				domainRecords: []
			});

			const expectedKeys: (keyof TenantDomainStatusResult)[] = [
				"tenantId",
				"domains"
			];

			for (const key of expectedKeys) {
				expect(result).toHaveProperty(key);
			}
		});

		it("does not expose internal timestamps in summary shape", () => {
			const service = createService();
			const result = service.getTenantDomainStatus({
				tenantId: "t-1",
				domainRecords: [
					createRecord({
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-02T00:00:00Z"
					})
				]
			});

			const domain = result.domains[0] as Record<string, unknown>;
			expect(domain).not.toHaveProperty("createdAt");
			expect(domain).not.toHaveProperty("updatedAt");
			expect(domain).not.toHaveProperty("verificationEvidence");
			expect(domain).not.toHaveProperty("promotionStateChangedAt");
		});
	});
});
