// E12-S2-T4: Tests for downgrade protection service.
// Verifies no data loss on downgrade — data becomes read-only, not deleted.

import { describe, expect, it } from "vitest";
import type {
	PackageEntitlementMap,
	TenantSubscriptionContext,
} from "@platform/types";
import { DowngradeProtectionService } from "./downgrade-protection.service";

// ─── Helpers ────────────────────────────────────────────────────────

const starterEntitlements: PackageEntitlementMap = {
	modules: { catalog: true, ordering: true, content: true, operations: true },
	premiumFeatures: [],
	usageLimits: {
		orders_per_month: { softLimit: 100, hardLimit: 150, resetPeriod: "monthly" },
		storage_gb: { softLimit: null, hardLimit: 5, resetPeriod: "none" },
		staff_seats: { softLimit: null, hardLimit: 3, resetPeriod: "none" },
	},
};

const proEntitlements: PackageEntitlementMap = {
	modules: {
		catalog: true,
		ordering: true,
		bookings: true,
		content: true,
		operations: true,
	},
	premiumFeatures: ["advanced-analytics", "api-access"],
	usageLimits: {
		orders_per_month: { softLimit: 1000, hardLimit: 1500, resetPeriod: "monthly" },
		storage_gb: { softLimit: null, hardLimit: 50, resetPeriod: "none" },
		staff_seats: { softLimit: null, hardLimit: 20, resetPeriod: "none" },
	},
};

function createGracePeriodSubscription(
	moduleEntitlements: Record<string, boolean>,
): TenantSubscriptionContext {
	return {
		tenantId: "t-1",
		packageId: "pkg-starter",
		packageName: "Starter",
		packageVersionNumber: 1,
		status: "grace_period",
		entitlements: {
			modules: moduleEntitlements,
			premiumFeatures: [],
			usageLimits: {},
		},
		gracePeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		subscribedAt: "2026-01-01T00:00:00Z",
	};
}

function createService(): DowngradeProtectionService {
	return new DowngradeProtectionService();
}

// ─── assessDowngradeImpact ──────────────────────────────────────────

describe("DowngradeProtectionService", () => {
	describe("assessDowngradeImpact", () => {
		it("identifies modules lost in downgrade", () => {
			const service = createService();
			const impact = service.assessDowngradeImpact(
				"t-1",
				proEntitlements,
				starterEntitlements,
				"pkg-pro",
				"pkg-starter",
				{},
			);

			expect(impact.affectedModules.length).toBe(1);
			expect(impact.affectedModules[0].moduleKey).toBe("bookings");
		});

		it("identifies premium features lost in downgrade", () => {
			const service = createService();
			const impact = service.assessDowngradeImpact(
				"t-1",
				proEntitlements,
				starterEntitlements,
				"pkg-pro",
				"pkg-starter",
				{},
			);

			expect(impact.affectedPremiumFeatures).toEqual([
				"advanced-analytics",
				"api-access",
			]);
		});

		it("identifies usage limits that will be exceeded", () => {
			const service = createService();
			const impact = service.assessDowngradeImpact(
				"t-1",
				proEntitlements,
				starterEntitlements,
				"pkg-pro",
				"pkg-starter",
				{ orders_per_month: 200, staff_seats: 10 },
			);

			const ordersImpact = impact.affectedUsageLimits.find(
				(l) => l.limitType === "orders_per_month",
			);
			expect(ordersImpact).toBeDefined();
			expect(ordersImpact!.willExceed).toBe(true);
			expect(ordersImpact!.newHardLimit).toBe(150);

			const staffImpact = impact.affectedUsageLimits.find(
				(l) => l.limitType === "staff_seats",
			);
			expect(staffImpact).toBeDefined();
			expect(staffImpact!.willExceed).toBe(true);
			expect(staffImpact!.newHardLimit).toBe(3);
		});

		it("all affected module policies preserve data (never delete)", () => {
			const service = createService();
			const impact = service.assessDowngradeImpact(
				"t-1",
				proEntitlements,
				starterEntitlements,
				"pkg-pro",
				"pkg-starter",
				{},
			);

			for (const module of impact.affectedModules) {
				expect(module.preserveData).toBe(true);
			}
		});

		it("sets grace period in assessment", () => {
			const service = createService();
			const impact = service.assessDowngradeImpact(
				"t-1",
				proEntitlements,
				starterEntitlements,
				"pkg-pro",
				"pkg-starter",
				{},
			);

			expect(impact.gracePeriodDays).toBe(14);
			expect(impact.gracePeriodEnd).toBeTruthy();
		});

		it("returns empty affected lists when no changes", () => {
			const service = createService();
			const impact = service.assessDowngradeImpact(
				"t-1",
				starterEntitlements,
				starterEntitlements,
				"pkg-starter",
				"pkg-starter",
				{},
			);

			expect(impact.affectedModules).toEqual([]);
			expect(impact.affectedPremiumFeatures).toEqual([]);
			expect(impact.affectedUsageLimits).toEqual([]);
		});
	});

	// ─── getModuleDowngradePolicy ──────────────────────────────────

	describe("getModuleDowngradePolicy", () => {
		it("returns read-only policy for commerce modules", () => {
			const service = createService();
			const policy = service.getModuleDowngradePolicy("ordering");

			expect(policy.dataPolicy).toBe("read-only");
			expect(policy.accessLevel).toBe("read-only");
			expect(policy.preserveData).toBe(true);
		});

		it("returns archived policy for content modules", () => {
			const service = createService();
			const policy = service.getModuleDowngradePolicy("content");

			expect(policy.dataPolicy).toBe("archived");
			expect(policy.preserveData).toBe(true);
		});

		it("returns archived policy for portfolio module", () => {
			const service = createService();
			const policy = service.getModuleDowngradePolicy("portfolio");

			expect(policy.dataPolicy).toBe("archived");
			expect(policy.preserveData).toBe(true);
		});

		it("never has preserve data as false", () => {
			const service = createService();
			const modules = ["catalog", "ordering", "bookings", "content", "operations", "portfolio"];
			for (const key of modules) {
				expect(service.getModuleDowngradePolicy(key).preserveData).toBe(true);
			}
		});
	});

	// ─── isWriteBlockedDuringGracePeriod ────────────────────────────

	describe("isWriteBlockedDuringGracePeriod", () => {
		it("blocks writes for non-entitled module during grace period", () => {
			const service = createService();
			const sub = createGracePeriodSubscription({
				catalog: true,
				ordering: true,
			});
			expect(
				service.isWriteBlockedDuringGracePeriod(sub, "bookings"),
			).toBe(true);
		});

		it("allows writes for entitled module during grace period", () => {
			const service = createService();
			const sub = createGracePeriodSubscription({
				catalog: true,
				ordering: true,
			});
			expect(
				service.isWriteBlockedDuringGracePeriod(sub, "catalog"),
			).toBe(false);
		});

		it("allows writes when not in grace period", () => {
			const service = createService();
			const sub: TenantSubscriptionContext = {
				tenantId: "t-1",
				packageId: "pkg-starter",
				packageName: "Starter",
				packageVersionNumber: 1,
				status: "active",
				entitlements: {
					modules: { catalog: true },
					premiumFeatures: [],
					usageLimits: {},
				},
				gracePeriodEnd: null,
				subscribedAt: "2026-01-01T00:00:00Z",
			};
			expect(
				service.isWriteBlockedDuringGracePeriod(sub, "bookings"),
			).toBe(false);
		});

		it("blocks all writes when no subscription", () => {
			const service = createService();
			expect(
				service.isWriteBlockedDuringGracePeriod(null, "catalog"),
			).toBe(true);
		});
	});

	// ─── getGracePeriodDaysRemaining ────────────────────────────────

	describe("getGracePeriodDaysRemaining", () => {
		it("returns 0 when not in grace period", () => {
			const service = createService();
			const sub: TenantSubscriptionContext = {
				tenantId: "t-1",
				packageId: "pkg-starter",
				packageName: "Starter",
				packageVersionNumber: 1,
				status: "active",
				entitlements: { modules: {}, premiumFeatures: [], usageLimits: {} },
				gracePeriodEnd: null,
				subscribedAt: "2026-01-01T00:00:00Z",
			};
			expect(service.getGracePeriodDaysRemaining(sub)).toBe(0);
		});

		it("returns positive days when in grace period", () => {
			const service = createService();
			const sub = createGracePeriodSubscription({});
			const days = service.getGracePeriodDaysRemaining(sub);
			expect(days).toBeGreaterThan(0);
			expect(days).toBeLessThanOrEqual(14);
		});

		it("returns 0 when no subscription", () => {
			const service = createService();
			expect(service.getGracePeriodDaysRemaining(null)).toBe(0);
		});
	});
});
