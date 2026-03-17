import { describe, expect, it } from "vitest";

import type {
	CustomDomainVerificationEvidence,
	TenantCustomDomainRecord
} from "@platform/types";

import { TenantCustomDomainPolicyService } from "./tenant-custom-domain-policy.service";

import {
	DomainVerificationWorkflowService,
	type DomainVerificationCheckAdapter,
	type DomainVerificationCheckResult
} from "./domain-verification-workflow.service";

function makeEvidence(
	overrides: Partial<CustomDomainVerificationEvidence> = {}
): CustomDomainVerificationEvidence {
	return {
		checkedAt: "2026-03-17T12:00:00.000Z",
		method: "dns-cname",
		observedValue: "cname-target.platform.local",
		...overrides
	};
}

function makeDomainRecord(
	overrides: Partial<TenantCustomDomainRecord> = {}
): TenantCustomDomainRecord {
	return {
		createdAt: "2026-03-17T10:00:00.000Z",
		hostname: "shop.example.com",
		id: "domain-1",
		promotionState: "not-requested",
		tenantId: "tenant-1",
		updatedAt: "2026-03-17T10:00:00.000Z",
		verificationState: "pending",
		...overrides
	};
}

function makePassingAdapter(): DomainVerificationCheckAdapter {
	return {
		check: () => ({
			evidence: makeEvidence(),
			passed: true
		})
	};
}

function makeFailingAdapter(): DomainVerificationCheckAdapter {
	return {
		check: () => ({
			evidence: makeEvidence({ observedValue: null }),
			passed: false
		})
	};
}

function createService(
	adapter: DomainVerificationCheckAdapter = makePassingAdapter()
): DomainVerificationWorkflowService {
	return new DomainVerificationWorkflowService(
		new TenantCustomDomainPolicyService(),
		adapter
	);
}

describe("domain verification workflow service", () => {
	describe("verify — pending to verified", () => {
		it("transitions pending domain to verified when check passes", () => {
			const service = createService(makePassingAdapter());
			const record = makeDomainRecord({ verificationState: "pending" });

			const result = service.verify({ domainRecord: record });

			expect(result.kind).toBe("verified");
			if (result.kind !== "verified") throw new Error("Expected verified");
			expect(result.newState).toBe("verified");
			expect(result.evidence.method).toBe("dns-cname");
			expect(result.decision.from).toBe("pending");
			expect(result.decision.to).toBe("verified");
		});
	});

	describe("verify — pending to failed", () => {
		it("transitions pending domain to failed when check fails", () => {
			const service = createService(makeFailingAdapter());
			const record = makeDomainRecord({ verificationState: "pending" });

			const result = service.verify({ domainRecord: record });

			expect(result.kind).toBe("failed");
			if (result.kind !== "failed") throw new Error("Expected failed");
			expect(result.newState).toBe("failed");
			expect(result.evidence).toBeDefined();
			expect(result.decision.from).toBe("pending");
			expect(result.decision.to).toBe("failed");
		});
	});

	describe("verify — re-verification from failed", () => {
		it("transitions failed domain to verified when re-check passes", () => {
			const service = createService(makePassingAdapter());
			const record = makeDomainRecord({ verificationState: "failed" });

			const result = service.verify({ domainRecord: record });

			expect(result.kind).toBe("verified");
			if (result.kind !== "verified") throw new Error("Expected verified");
			expect(result.newState).toBe("verified");
			expect(result.decision.from).toBe("failed");
			expect(result.decision.to).toBe("verified");
		});

		it("transitions failed domain to failed again when re-check fails", () => {
			const service = createService(makeFailingAdapter());
			const record = makeDomainRecord({ verificationState: "failed" });

			const result = service.verify({ domainRecord: record });

			expect(result.kind).toBe("no-transition");
		});
	});

	describe("verify — denied state", () => {
		it("returns no-transition for denied domains", () => {
			const service = createService(makePassingAdapter());
			const record = makeDomainRecord({ verificationState: "denied" });

			const result = service.verify({ domainRecord: record });

			expect(result.kind).toBe("no-transition");
		});
	});

	describe("verify — verified state re-check", () => {
		it("transitions verified domain to failed when check fails", () => {
			const service = createService(makeFailingAdapter());
			const record = makeDomainRecord({ verificationState: "verified" });

			const result = service.verify({ domainRecord: record });

			expect(result.kind).toBe("failed");
			if (result.kind !== "failed") throw new Error("Expected failed");
			expect(result.newState).toBe("failed");
			expect(result.decision.from).toBe("verified");
		});
	});

	describe("deny", () => {
		it("transitions pending domain to denied", () => {
			const service = createService();
			const record = makeDomainRecord({ verificationState: "pending" });

			const result = service.deny({ domainRecord: record });

			expect(result.kind).toBe("denied");
			if (result.kind !== "denied") throw new Error("Expected denied");
			expect(result.newState).toBe("denied");
			expect(result.decision.from).toBe("pending");
			expect(result.decision.to).toBe("denied");
		});

		it("transitions verified domain to denied", () => {
			const service = createService();
			const record = makeDomainRecord({ verificationState: "verified" });

			const result = service.deny({ domainRecord: record });

			expect(result.kind).toBe("denied");
		});

		it("transitions failed domain to denied", () => {
			const service = createService();
			const record = makeDomainRecord({ verificationState: "failed" });

			const result = service.deny({ domainRecord: record });

			expect(result.kind).toBe("denied");
		});

		it("rejects denial of already-denied domain", () => {
			const service = createService();
			const record = makeDomainRecord({ verificationState: "denied" });

			expect(() => service.deny({ domainRecord: record })).toThrow();
		});
	});

	describe("adapter interface contract", () => {
		it("passes hostname and tenantId to the adapter", () => {
			let capturedHostname = "";
			let capturedTenantId = "";

			const adapter: DomainVerificationCheckAdapter = {
				check: (hostname, tenantId) => {
					capturedHostname = hostname;
					capturedTenantId = tenantId;
					return { evidence: makeEvidence(), passed: true };
				}
			};

			const service = createService(adapter);
			const record = makeDomainRecord({
				hostname: "custom.example.com",
				tenantId: "tenant-42"
			});

			service.verify({ domainRecord: record });

			expect(capturedHostname).toBe("custom.example.com");
			expect(capturedTenantId).toBe("tenant-42");
		});

		it("adapter can be replaced without changing workflow logic", () => {
			const customAdapter: DomainVerificationCheckAdapter = {
				check: () => ({
					evidence: makeEvidence({
						method: "http-token",
						observedValue: "token-abc"
					}),
					passed: true
				})
			};

			const service = createService(customAdapter);
			const record = makeDomainRecord({ verificationState: "pending" });

			const result = service.verify({ domainRecord: record });

			expect(result.kind).toBe("verified");
			if (result.kind !== "verified") throw new Error("Expected verified");
			expect(result.evidence.method).toBe("http-token");
		});
	});

	describe("tenant isolation", () => {
		it("adapter receives correct tenant scope per domain record", () => {
			const calls: Array<{ hostname: string; tenantId: string }> = [];

			const adapter: DomainVerificationCheckAdapter = {
				check: (hostname, tenantId) => {
					calls.push({ hostname, tenantId });
					return { evidence: makeEvidence(), passed: true };
				}
			};

			const service = createService(adapter);

			service.verify({
				domainRecord: makeDomainRecord({
					hostname: "a.example.com",
					tenantId: "tenant-a"
				})
			});
			service.verify({
				domainRecord: makeDomainRecord({
					hostname: "b.example.com",
					tenantId: "tenant-b"
				})
			});

			expect(calls).toHaveLength(2);
			expect(calls[0]).toEqual({
				hostname: "a.example.com",
				tenantId: "tenant-a"
			});
			expect(calls[1]).toEqual({
				hostname: "b.example.com",
				tenantId: "tenant-b"
			});
		});
	});
});
