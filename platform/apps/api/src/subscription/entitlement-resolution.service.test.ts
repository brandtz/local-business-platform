// E12-S2-T1: Tests for entitlement resolution — subscription entitlements
// override or merge with manual module assignments.

import { describe, expect, it } from "vitest";
import type {
	PackageEntitlementMap,
	TenantSubscriptionContext,
} from "@platform/types";
import { resolveEffectiveModules } from "@platform/types";
import { EntitlementResolutionService } from "./entitlement-resolution.service";

// ─── Helpers ────────────────────────────────────────────────────────

function createSubscription(
	overrides: Partial<TenantSubscriptionContext> = {},
): TenantSubscriptionContext {
	return {
		tenantId: "t-1",
		packageId: "pkg-starter",
		packageName: "Starter",
		packageVersionNumber: 1,
		status: "active",
		entitlements: {
			modules: { catalog: true, ordering: true, content: true, operations: true },
			premiumFeatures: [],
			usageLimits: {},
		},
		gracePeriodEnd: null,
		subscribedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

function createProSubscription(): TenantSubscriptionContext {
	return createSubscription({
		packageId: "pkg-pro",
		packageName: "Professional",
		entitlements: {
			modules: {
				catalog: true,
				ordering: true,
				bookings: true,
				content: true,
				operations: true,
			},
			premiumFeatures: ["advanced-analytics", "api-access"],
			usageLimits: {
				orders_per_month: {
					softLimit: 1000,
					hardLimit: 1500,
					resetPeriod: "monthly",
				},
			},
		},
	});
}

// ─── resolveEffectiveModules ────────────────────────────────────────

describe("resolveEffectiveModules", () => {
	it("uses manual modules when no subscription", () => {
		const result = resolveEffectiveModules(null, ["catalog", "ordering"]);
		expect(result.source).toBe("manual");
		expect(result.effectiveModules).toEqual(["catalog", "ordering"]);
		expect(result.restrictedModules).toEqual([]);
	});

	it("subscription is authoritative — overrides manual modules", () => {
		const entitlements: PackageEntitlementMap = {
			modules: { catalog: true, ordering: true, content: true, operations: true },
			premiumFeatures: [],
			usageLimits: {},
		};
		const result = resolveEffectiveModules(
			entitlements,
			["catalog", "ordering", "bookings"],
		);
		expect(result.source).toBe("merged");
		expect(result.effectiveModules).toEqual([
			"catalog", "ordering", "content", "operations",
		]);
		expect(result.restrictedModules).toEqual(["bookings"]);
	});

	it("identifies restricted modules not in subscription", () => {
		const entitlements: PackageEntitlementMap = {
			modules: { catalog: true },
			premiumFeatures: [],
			usageLimits: {},
		};
		const result = resolveEffectiveModules(
			entitlements,
			["catalog", "ordering", "bookings"],
		);
		expect(result.restrictedModules).toEqual(["ordering", "bookings"]);
		expect(result.upgradeSuggestion).toContain("ordering");
		expect(result.upgradeSuggestion).toContain("bookings");
	});

	it("returns subscription source when all manual modules match", () => {
		const entitlements: PackageEntitlementMap = {
			modules: { catalog: true, ordering: true },
			premiumFeatures: [],
			usageLimits: {},
		};
		const result = resolveEffectiveModules(
			entitlements,
			["catalog", "ordering"],
		);
		expect(result.source).toBe("subscription");
		expect(result.restrictedModules).toEqual([]);
	});
});

// ─── EntitlementResolutionService ───────────────────────────────────

describe("EntitlementResolutionService", () => {
	function createService(): EntitlementResolutionService {
		return new EntitlementResolutionService();
	}

	describe("resolveModules", () => {
		it("resolves from subscription when available", () => {
			const service = createService();
			const result = service.resolveModules({
				tenantId: "t-1",
				subscription: createSubscription(),
				manualModules: ["catalog", "ordering", "bookings"],
			});
			expect(result.source).toBe("merged");
			expect(result.restrictedModules).toContain("bookings");
		});

		it("falls back to manual modules when no subscription", () => {
			const service = createService();
			const result = service.resolveModules({
				tenantId: "t-1",
				subscription: null,
				manualModules: ["catalog", "ordering"],
			});
			expect(result.source).toBe("manual");
			expect(result.effectiveModules).toEqual(["catalog", "ordering"]);
		});
	});

	describe("isModuleEntitled", () => {
		it("returns true for entitled module", () => {
			const service = createService();
			expect(
				service.isModuleEntitled(createSubscription(), "catalog"),
			).toBe(true);
		});

		it("returns false for non-entitled module", () => {
			const service = createService();
			expect(
				service.isModuleEntitled(createSubscription(), "bookings"),
			).toBe(false);
		});

		it("returns false when no subscription", () => {
			const service = createService();
			expect(service.isModuleEntitled(null, "catalog")).toBe(false);
		});
	});

	describe("isPremiumFeatureEntitled", () => {
		it("returns true for entitled feature", () => {
			const service = createService();
			expect(
				service.isPremiumFeatureEntitled(
					createProSubscription(),
					"advanced-analytics",
				),
			).toBe(true);
		});

		it("returns false for non-entitled feature", () => {
			const service = createService();
			expect(
				service.isPremiumFeatureEntitled(createSubscription(), "sso"),
			).toBe(false);
		});

		it("returns false when no subscription", () => {
			const service = createService();
			expect(
				service.isPremiumFeatureEntitled(null, "advanced-analytics"),
			).toBe(false);
		});
	});

	describe("getEntitlementMap", () => {
		it("returns entitlement map from subscription", () => {
			const service = createService();
			const sub = createSubscription();
			const map = service.getEntitlementMap(sub);
			expect(map).toBe(sub.entitlements);
		});

		it("returns null when no subscription", () => {
			const service = createService();
			expect(service.getEntitlementMap(null)).toBeNull();
		});
	});
});
