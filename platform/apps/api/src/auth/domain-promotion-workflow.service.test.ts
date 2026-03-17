import { describe, expect, it } from "vitest";

import type { TenantCustomDomainRecord } from "@platform/types";

import {
	DomainPromotionWorkflowService,
	type DomainPromotionWorkflowResult
} from "./domain-promotion-workflow.service";
import {
	TenantCustomDomainPolicyError,
	TenantCustomDomainPolicyService
} from "./tenant-custom-domain-policy.service";

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
		verificationState: "verified",
		...overrides
	};
}

function createService(): DomainPromotionWorkflowService {
	return new DomainPromotionWorkflowService(
		new TenantCustomDomainPolicyService()
	);
}

describe("DomainPromotionWorkflowService", () => {
	describe("requestReady", () => {
		it("transitions not-requested → ready for a verified domain", () => {
			const service = createService();
			const result = service.requestReady({
				domainRecord: createRecord()
			});

			expect(result.kind).toBe("ready");
			expect((result as Extract<DomainPromotionWorkflowResult, { kind: "ready" }>).newState).toBe("ready");
			expect((result as Extract<DomainPromotionWorkflowResult, { kind: "ready" }>).decision.from).toBe("not-requested");
			expect((result as Extract<DomainPromotionWorkflowResult, { kind: "ready" }>).decision.to).toBe("ready");
		});

		it("returns ineligible when domain is not verified", () => {
			const service = createService();
			const result = service.requestReady({
				domainRecord: createRecord({ verificationState: "pending" })
			});

			expect(result.kind).toBe("ineligible");
			expect((result as Extract<DomainPromotionWorkflowResult, { kind: "ineligible" }>).reason).toContain("pending");
		});

		it("returns ineligible when domain verification failed", () => {
			const service = createService();
			const result = service.requestReady({
				domainRecord: createRecord({ verificationState: "failed" })
			});

			expect(result.kind).toBe("ineligible");
		});

		it("transitions rolled-back → ready for re-promotion", () => {
			const service = createService();
			const result = service.requestReady({
				domainRecord: createRecord({ promotionState: "rolled-back" })
			});

			expect(result.kind).toBe("ready");
		});

		it("transitions failed → ready for retry", () => {
			const service = createService();
			const result = service.requestReady({
				domainRecord: createRecord({ promotionState: "failed" })
			});

			expect(result.kind).toBe("ready");
		});

		it("rejects already-ready domain", () => {
			const service = createService();

			expect(() =>
				service.requestReady({
					domainRecord: createRecord({ promotionState: "ready" })
				})
			).toThrow(TenantCustomDomainPolicyError);
		});
	});

	describe("promote", () => {
		it("transitions ready → promoted for a verified domain", () => {
			const service = createService();
			const result = service.promote({
				domainRecord: createRecord({ promotionState: "ready" })
			});

			expect(result.kind).toBe("promoted");
			expect((result as Extract<DomainPromotionWorkflowResult, { kind: "promoted" }>).newState).toBe("promoted");
			expect((result as Extract<DomainPromotionWorkflowResult, { kind: "promoted" }>).decision.from).toBe("ready");
		});

		it("returns ineligible when domain is not verified", () => {
			const service = createService();
			const result = service.promote({
				domainRecord: createRecord({
					promotionState: "ready",
					verificationState: "pending"
				})
			});

			expect(result.kind).toBe("ineligible");
		});

		it("rejects promotion from not-requested state", () => {
			const service = createService();

			expect(() =>
				service.promote({
					domainRecord: createRecord({ promotionState: "not-requested" })
				})
			).toThrow(TenantCustomDomainPolicyError);
		});
	});

	describe("initiateRollback", () => {
		it("transitions promoted → rollback-pending", () => {
			const service = createService();
			const result = service.initiateRollback({
				domainRecord: createRecord({ promotionState: "promoted" })
			});

			expect(result.kind).toBe("rollback-initiated");
			expect((result as Extract<DomainPromotionWorkflowResult, { kind: "rollback-initiated" }>).newState).toBe("rollback-pending");
		});

		it("rejects rollback from non-promoted state", () => {
			const service = createService();

			expect(() =>
				service.initiateRollback({
					domainRecord: createRecord({ promotionState: "ready" })
				})
			).toThrow(TenantCustomDomainPolicyError);
		});
	});

	describe("completeRollback", () => {
		it("transitions rollback-pending → rolled-back and restores managed subdomain", () => {
			const service = createService();
			const result = service.completeRollback({
				domainRecord: createRecord({ promotionState: "rollback-pending" })
			});

			expect(result.kind).toBe("rolled-back");
			expect((result as Extract<DomainPromotionWorkflowResult, { kind: "rolled-back" }>).restoreManagedSubdomain).toBe(true);
		});

		it("rejects completion from non-rollback-pending state", () => {
			const service = createService();

			expect(() =>
				service.completeRollback({
					domainRecord: createRecord({ promotionState: "promoted" })
				})
			).toThrow(TenantCustomDomainPolicyError);
		});
	});

	describe("failPromotion", () => {
		it("transitions ready → failed with reason", () => {
			const service = createService();
			const result = service.failPromotion({
				domainRecord: createRecord({ promotionState: "ready" }),
				reason: "CDN configuration failed"
			});

			expect(result.kind).toBe("failed");
			const failed = result as Extract<DomainPromotionWorkflowResult, { kind: "failed" }>;
			expect(failed.reason).toBe("CDN configuration failed");
			expect(failed.restoreManagedSubdomain).toBe(false);
		});

		it("transitions rollback-pending → failed and restores managed subdomain", () => {
			const service = createService();
			const result = service.failPromotion({
				domainRecord: createRecord({ promotionState: "rollback-pending" }),
				reason: "Rollback process failed"
			});

			expect(result.kind).toBe("failed");
			const failed = result as Extract<DomainPromotionWorkflowResult, { kind: "failed" }>;
			expect(failed.restoreManagedSubdomain).toBe(true);
		});

		it("rejects failure from not-requested state", () => {
			const service = createService();

			expect(() =>
				service.failPromotion({
					domainRecord: createRecord({ promotionState: "not-requested" }),
					reason: "test"
				})
			).toThrow(TenantCustomDomainPolicyError);
		});
	});

	describe("canRequestReady", () => {
		it("returns true for verified + not-requested", () => {
			const service = createService();
			expect(service.canRequestReady(createRecord())).toBe(true);
		});

		it("returns true for verified + rolled-back", () => {
			const service = createService();
			expect(service.canRequestReady(createRecord({ promotionState: "rolled-back" }))).toBe(true);
		});

		it("returns true for verified + failed", () => {
			const service = createService();
			expect(service.canRequestReady(createRecord({ promotionState: "failed" }))).toBe(true);
		});

		it("returns false for unverified domain", () => {
			const service = createService();
			expect(service.canRequestReady(createRecord({ verificationState: "pending" }))).toBe(false);
		});

		it("returns false for already-promoted domain", () => {
			const service = createService();
			expect(service.canRequestReady(createRecord({ promotionState: "promoted" }))).toBe(false);
		});

		it("returns false for ready domain", () => {
			const service = createService();
			expect(service.canRequestReady(createRecord({ promotionState: "ready" }))).toBe(false);
		});
	});

	describe("tenant isolation", () => {
		it("operates only on the provided domain record without cross-tenant leakage", () => {
			const service = createService();
			const tenantA = createRecord({ tenantId: "t-a", promotionState: "not-requested" });
			const tenantB = createRecord({ tenantId: "t-b", promotionState: "promoted" });

			const resultA = service.requestReady({ domainRecord: tenantA });
			const resultB = service.initiateRollback({ domainRecord: tenantB });

			expect(resultA.kind).toBe("ready");
			expect(resultB.kind).toBe("rollback-initiated");
			expect(tenantA.promotionState).toBe("not-requested");
			expect(tenantB.promotionState).toBe("promoted");
		});
	});

	describe("full promotion lifecycle", () => {
		it("not-requested → ready → promoted → rollback-pending → rolled-back", () => {
			const service = createService();
			let record = createRecord();

			const readyResult = service.requestReady({ domainRecord: record });
			expect(readyResult.kind).toBe("ready");
			record = { ...record, promotionState: "ready" };

			const promotedResult = service.promote({ domainRecord: record });
			expect(promotedResult.kind).toBe("promoted");
			record = { ...record, promotionState: "promoted" };

			const rollbackResult = service.initiateRollback({ domainRecord: record });
			expect(rollbackResult.kind).toBe("rollback-initiated");
			record = { ...record, promotionState: "rollback-pending" };

			const completedResult = service.completeRollback({ domainRecord: record });
			expect(completedResult.kind).toBe("rolled-back");
			expect((completedResult as Extract<DomainPromotionWorkflowResult, { kind: "rolled-back" }>).restoreManagedSubdomain).toBe(true);
		});

		it("ready → failed → ready → promoted (retry after failure)", () => {
			const service = createService();
			let record = createRecord({ promotionState: "ready" });

			const failResult = service.failPromotion({ domainRecord: record, reason: "setup failed" });
			expect(failResult.kind).toBe("failed");
			record = { ...record, promotionState: "failed" };

			const retryReady = service.requestReady({ domainRecord: record });
			expect(retryReady.kind).toBe("ready");
			record = { ...record, promotionState: "ready" };

			const promoteResult = service.promote({ domainRecord: record });
			expect(promoteResult.kind).toBe("promoted");
		});
	});
});
