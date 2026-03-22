import { describe, expect, it } from "vitest";

import type {
	TenantCustomDomainRecord,
	TenantSummary
} from "@platform/types";

import { DomainActivationGateService } from "./domain-activation-gate.service";
import {
	DomainActivationReadinessViewService,
	type PlatformActivationViewTenant,
	type TenantActivationViewRequest
} from "./domain-activation-readiness-view.service";

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

function createService(): DomainActivationReadinessViewService {
	const gateService = new DomainActivationGateService();

	return new DomainActivationReadinessViewService(gateService);
}

describe("DomainActivationReadinessViewService", () => {
	describe("buildTenantView", () => {
		it("returns empty view when no domain is configured", () => {
			const service = createService();
			const request: TenantActivationViewRequest = {
				tenant: createTenant(),
				domainRecord: null,
				hasValidRoutingConfig: false
			};

			const view = service.buildTenantView(request);

			expect(view.tenantId).toBe("t-1");
			expect(view.domainHostname).toBeNull();
			expect(view.domainVerificationState).toBeNull();
			expect(view.domainPromotionState).toBeNull();
			expect(view.readinessReport).toBeNull();
			expect(view.activationAllowed).toBe(false);
			expect(view.denialReasons).toHaveLength(0);
			expect(view.guidance).toHaveLength(0);
		});

		it("returns denied view with guidance when domain exists but publish not available", () => {
			const service = createService();
			const request: TenantActivationViewRequest = {
				tenant: createTenant(),
				domainRecord: createDomainRecord(),
				hasValidRoutingConfig: true
			};

			const view = service.buildTenantView(request);

			expect(view.tenantId).toBe("t-1");
			expect(view.domainHostname).toBe("example.com");
			expect(view.domainVerificationState).toBe("verified");
			expect(view.activationAllowed).toBe(false);

			// Epic 9 not available, so publish checks fail
			expect(view.denialReasons).toContain("no-published-release");
			expect(view.denialReasons).toContain("release-health-not-green");
			expect(view.readinessReport).toBeDefined();
			expect(view.guidance.length).toBeGreaterThan(0);
		});

		it("includes actionable guidance for failing checks", () => {
			const service = createService();
			const request: TenantActivationViewRequest = {
				tenant: createTenant(),
				domainRecord: createDomainRecord(),
				hasValidRoutingConfig: true
			};

			const view = service.buildTenantView(request);

			const failingGuidance = view.guidance.filter((g) => !g.passed);
			expect(failingGuidance.length).toBeGreaterThan(0);

			for (const item of failingGuidance) {
				expect(item.actionRequired).toBeTruthy();
				expect(item.label.length).toBeGreaterThan(0);
			}
		});

		it("includes passing checks in guidance", () => {
			const service = createService();
			const request: TenantActivationViewRequest = {
				tenant: createTenant(),
				domainRecord: createDomainRecord(),
				hasValidRoutingConfig: true
			};

			const view = service.buildTenantView(request);

			const passingGuidance = view.guidance.filter((g) => g.passed);
			expect(passingGuidance.length).toBeGreaterThan(0);

			for (const item of passingGuidance) {
				expect(item.actionRequired).toBeNull();
			}
		});

		it("includes routing denial when routing config is invalid", () => {
			const service = createService();
			const request: TenantActivationViewRequest = {
				tenant: createTenant(),
				domainRecord: createDomainRecord(),
				hasValidRoutingConfig: false
			};

			const view = service.buildTenantView(request);

			expect(view.denialReasons).toContain("routing-config-invalid");
		});

		it("includes tenant denial when tenant is not active", () => {
			const service = createService();
			const request: TenantActivationViewRequest = {
				tenant: createTenant({ status: "draft" }),
				domainRecord: createDomainRecord(),
				hasValidRoutingConfig: true
			};

			const view = service.buildTenantView(request);

			expect(view.denialReasons).toContain("tenant-not-active");
		});
	});

	describe("buildPlatformView", () => {
		it("returns platform view with correct counts", () => {
			const service = createService();
			const tenants: PlatformActivationViewTenant[] = [
				{
					tenant: createTenant({ id: "t-1", displayName: "Alpha" }),
					domainRecord: createDomainRecord({ tenantId: "t-1" }),
					hasValidRoutingConfig: true,
					lastRollbackAt: null,
					lastRollbackTrigger: null
				},
				{
					tenant: createTenant({ id: "t-2", displayName: "Bravo", status: "draft" }),
					domainRecord: createDomainRecord({ tenantId: "t-2" }),
					hasValidRoutingConfig: true,
					lastRollbackAt: null,
					lastRollbackTrigger: null
				}
			];

			const view = service.buildPlatformView({ tenants });

			expect(view.totalCount).toBe(2);
			// Both blocked because Epic 9 publish not available
			expect(view.blockedCount).toBe(2);
			expect(view.entries).toHaveLength(2);
		});

		it("handles tenants without domains", () => {
			const service = createService();
			const tenants: PlatformActivationViewTenant[] = [
				{
					tenant: createTenant({ id: "t-1" }),
					domainRecord: null,
					hasValidRoutingConfig: false,
					lastRollbackAt: null,
					lastRollbackTrigger: null
				}
			];

			const view = service.buildPlatformView({ tenants });

			expect(view.totalCount).toBe(1);
			expect(view.entries[0].domainHostname).toBeNull();
			expect(view.entries[0].activationAllowed).toBe(false);
		});

		it("preserves rollback history in platform entries", () => {
			const service = createService();
			const tenants: PlatformActivationViewTenant[] = [
				{
					tenant: createTenant({ id: "t-1" }),
					domainRecord: createDomainRecord({ tenantId: "t-1" }),
					hasValidRoutingConfig: true,
					lastRollbackAt: "2026-03-20T12:00:00Z",
					lastRollbackTrigger: "post-promotion-route-validation-failed"
				}
			];

			const view = service.buildPlatformView({ tenants });

			expect(view.entries[0].lastRollbackAt).toBe("2026-03-20T12:00:00Z");
			expect(view.entries[0].lastRollbackTrigger).toBe(
				"post-promotion-route-validation-failed"
			);
		});

		it("shows correct tenant metadata in platform entries", () => {
			const service = createService();
			const tenants: PlatformActivationViewTenant[] = [
				{
					tenant: createTenant({
						id: "t-1",
						displayName: "Alpha Corp",
						status: "active"
					}),
					domainRecord: createDomainRecord({ tenantId: "t-1", hostname: "alpha.com" }),
					hasValidRoutingConfig: true,
					lastRollbackAt: null,
					lastRollbackTrigger: null
				}
			];

			const view = service.buildPlatformView({ tenants });

			expect(view.entries[0].tenantDisplayName).toBe("Alpha Corp");
			expect(view.entries[0].tenantStatus).toBe("active");
			expect(view.entries[0].domainHostname).toBe("alpha.com");
		});
	});

	describe("tenant isolation", () => {
		it("does not leak data between tenant views", () => {
			const service = createService();

			const viewA = service.buildTenantView({
				tenant: createTenant({ id: "t-a" }),
				domainRecord: createDomainRecord({ tenantId: "t-a", hostname: "a.com" }),
				hasValidRoutingConfig: true
			});

			const viewB = service.buildTenantView({
				tenant: createTenant({ id: "t-b" }),
				domainRecord: createDomainRecord({ tenantId: "t-b", hostname: "b.com" }),
				hasValidRoutingConfig: false
			});

			expect(viewA.tenantId).toBe("t-a");
			expect(viewA.domainHostname).toBe("a.com");
			expect(viewB.tenantId).toBe("t-b");
			expect(viewB.domainHostname).toBe("b.com");
		});
	});
});
