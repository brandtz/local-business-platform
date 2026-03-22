import { describe, expect, it } from "vitest";

import type { TenantCustomDomainRecord } from "@platform/types";

import { DomainPromotionWorkflowService } from "./domain-promotion-workflow.service";
import { TenantCustomDomainPolicyService } from "./tenant-custom-domain-policy.service";
import {
	DomainActivationRollbackService,
	type DomainActivationRollbackContext
} from "./domain-activation-rollback.service";

function createDomainRecord(
	overrides: Partial<TenantCustomDomainRecord> = {}
): TenantCustomDomainRecord {
	return {
		createdAt: "2026-01-01T00:00:00Z",
		hostname: "example.com",
		id: "dom-1",
		promotionState: "promoted",
		tenantId: "t-1",
		updatedAt: "2026-01-01T00:00:00Z",
		verificationState: "verified",
		...overrides
	};
}

function createService(): DomainActivationRollbackService {
	const policyService = new TenantCustomDomainPolicyService();
	const promotionWorkflow = new DomainPromotionWorkflowService(policyService);

	return new DomainActivationRollbackService(promotionWorkflow);
}

describe("DomainActivationRollbackService", () => {
	describe("rollback", () => {
		it("successfully rolls back a promoted domain on route validation failure", () => {
			const service = createService();
			const context: DomainActivationRollbackContext = {
				domainRecord: createDomainRecord(),
				trigger: "post-promotion-route-validation-failed",
				reason: "Route validation failed after promotion"
			};

			const result = service.rollback(context);

			expect(result.kind).toBe("rolled-back");

			if (result.kind === "rolled-back") {
				expect(result.tenantId).toBe("t-1");
				expect(result.domainId).toBe("dom-1");
				expect(result.restoredState).toBe("rolled-back");
				expect(result.trigger).toBe("post-promotion-route-validation-failed");
			}
		});

		it("successfully rolls back on health check failure", () => {
			const service = createService();
			const context: DomainActivationRollbackContext = {
				domainRecord: createDomainRecord(),
				trigger: "post-promotion-health-check-failed",
				reason: "Health check failed after promotion"
			};

			const result = service.rollback(context);

			expect(result.kind).toBe("rolled-back");
		});

		it("successfully rolls back on manual request", () => {
			const service = createService();
			const context: DomainActivationRollbackContext = {
				domainRecord: createDomainRecord(),
				trigger: "manual-rollback-requested",
				reason: "Admin requested rollback"
			};

			const result = service.rollback(context);

			expect(result.kind).toBe("rolled-back");
		});

		it("fails rollback when domain is not in promoted state", () => {
			const service = createService();
			const context: DomainActivationRollbackContext = {
				domainRecord: createDomainRecord({ promotionState: "not-requested" }),
				trigger: "post-promotion-route-validation-failed",
				reason: "Route validation failed"
			};

			const result = service.rollback(context);

			expect(result.kind).toBe("rollback-failed");

			if (result.kind === "rollback-failed") {
				expect(result.failureReason).toBeTruthy();
				expect(result.trigger).toBe("post-promotion-route-validation-failed");
			}
		});

		it("fails rollback when domain is in ready state", () => {
			const service = createService();
			const context: DomainActivationRollbackContext = {
				domainRecord: createDomainRecord({ promotionState: "ready" }),
				trigger: "manual-rollback-requested",
				reason: "Manual request"
			};

			const result = service.rollback(context);

			expect(result.kind).toBe("rollback-failed");
		});

		it("fails rollback when domain is already rolled back", () => {
			const service = createService();
			const context: DomainActivationRollbackContext = {
				domainRecord: createDomainRecord({ promotionState: "rolled-back" }),
				trigger: "manual-rollback-requested",
				reason: "Retry rollback"
			};

			const result = service.rollback(context);

			expect(result.kind).toBe("rollback-failed");
		});
	});

	describe("canRollback", () => {
		it("returns true for promoted domains", () => {
			const service = createService();

			expect(service.canRollback(createDomainRecord())).toBe(true);
		});

		it("returns false for non-promoted domains", () => {
			const service = createService();

			expect(
				service.canRollback(createDomainRecord({ promotionState: "not-requested" }))
			).toBe(false);
			expect(
				service.canRollback(createDomainRecord({ promotionState: "ready" }))
			).toBe(false);
			expect(
				service.canRollback(createDomainRecord({ promotionState: "rolled-back" }))
			).toBe(false);
			expect(
				service.canRollback(createDomainRecord({ promotionState: "failed" }))
			).toBe(false);
		});
	});

	describe("tenant isolation", () => {
		it("preserves tenant context in rollback results", () => {
			const service = createService();

			const resultA = service.rollback({
				domainRecord: createDomainRecord({ tenantId: "t-a", id: "dom-a" }),
				trigger: "manual-rollback-requested",
				reason: "test"
			});

			const resultB = service.rollback({
				domainRecord: createDomainRecord({ tenantId: "t-b", id: "dom-b" }),
				trigger: "post-promotion-health-check-failed",
				reason: "test"
			});

			expect(resultA.tenantId).toBe("t-a");
			expect(resultA.domainId).toBe("dom-a");
			expect(resultB.tenantId).toBe("t-b");
			expect(resultB.domainId).toBe("dom-b");
		});
	});
});
