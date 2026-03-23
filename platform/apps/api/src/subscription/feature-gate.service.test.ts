// E12-S2-T2: Tests for backend feature-gate service.
// Verifies that API endpoints and service methods correctly check tenant's
// active subscription entitlements and return structured denial payloads.

import { describe, expect, it } from "vitest";
import type {
	TenantSubscriptionContext,
} from "@platform/types";
import { FeatureGateError, FeatureGateService } from "./feature-gate.service";

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
			usageLimits: {
				orders_per_month: {
					softLimit: 100,
					hardLimit: 150,
					resetPeriod: "monthly",
				},
			},
		},
		gracePeriodEnd: null,
		subscribedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

function createService(): FeatureGateService {
	return new FeatureGateService();
}

// ─── checkModuleAccess ──────────────────────────────────────────────

describe("FeatureGateService", () => {
	describe("checkModuleAccess", () => {
		it("allows access to entitled module", () => {
			const service = createService();
			const result = service.checkModuleAccess(
				createSubscription(),
				"catalog",
			);
			expect(result).toBeNull();
		});

		it("denies access to non-entitled module", () => {
			const service = createService();
			const result = service.checkModuleAccess(
				createSubscription(),
				"bookings",
			);
			expect(result).not.toBeNull();
			expect(result!.denied).toBe(true);
			expect(result!.reason).toBe("module-not-entitled");
			expect(result!.requiredFeature).toBe("bookings");
		});

		it("returns upgrade prompt in denial", () => {
			const service = createService();
			const result = service.checkModuleAccess(
				createSubscription(),
				"bookings",
			);
			expect(result!.upgradePrompt).not.toBeNull();
			expect(result!.upgradePrompt!.ctaLabel).toBe("Upgrade Plan");
			expect(result!.upgradePrompt!.ctaUrl).toBe("/settings/billing/upgrade");
		});

		it("denies when no subscription (expired)", () => {
			const service = createService();
			const result = service.checkModuleAccess(null, "catalog");
			expect(result!.reason).toBe("subscription-expired");
		});

		it("denies with canceled status", () => {
			const service = createService();
			const result = service.checkModuleAccess(
				createSubscription({ status: "canceled" }),
				"catalog",
			);
			expect(result!.reason).toBe("subscription-canceled");
		});

		it("returns grace-period-read-only for grace period status", () => {
			const service = createService();
			const result = service.checkModuleAccess(
				createSubscription({ status: "grace_period" }),
				"catalog",
			);
			expect(result!.reason).toBe("grace-period-read-only");
		});

		it("includes current package name in denial", () => {
			const service = createService();
			const result = service.checkModuleAccess(
				createSubscription(),
				"bookings",
			);
			expect(result!.currentPackage).toBe("Starter");
		});
	});

	// ─── checkPremiumFeatureAccess ──────────────────────────────────

	describe("checkPremiumFeatureAccess", () => {
		it("allows access to entitled premium feature", () => {
			const service = createService();
			const sub = createSubscription({
				entitlements: {
					modules: {},
					premiumFeatures: ["advanced-analytics", "api-access"],
					usageLimits: {},
				},
			});
			expect(
				service.checkPremiumFeatureAccess(sub, "advanced-analytics"),
			).toBeNull();
		});

		it("denies access to non-entitled premium feature", () => {
			const service = createService();
			const result = service.checkPremiumFeatureAccess(
				createSubscription(),
				"sso",
			);
			expect(result!.reason).toBe("premium-feature-not-entitled");
			expect(result!.requiredFeature).toBe("sso");
		});

		it("denies when no subscription", () => {
			const service = createService();
			const result = service.checkPremiumFeatureAccess(
				null,
				"advanced-analytics",
			);
			expect(result!.reason).toBe("subscription-expired");
		});
	});

	// ─── checkUsageLimitAccess ──────────────────────────────────────

	describe("checkUsageLimitAccess", () => {
		it("allows when under hard limit", () => {
			const service = createService();
			const result = service.checkUsageLimitAccess(
				createSubscription(),
				"orders_per_month",
				50,
			);
			expect(result).toBeNull();
		});

		it("allows when at soft limit (warning only, no block)", () => {
			const service = createService();
			const result = service.checkUsageLimitAccess(
				createSubscription(),
				"orders_per_month",
				100,
			);
			expect(result).toBeNull();
		});

		it("denies when at hard limit", () => {
			const service = createService();
			const result = service.checkUsageLimitAccess(
				createSubscription(),
				"orders_per_month",
				150,
			);
			expect(result!.reason).toBe("usage-limit-exceeded");
		});

		it("denies when over hard limit", () => {
			const service = createService();
			const result = service.checkUsageLimitAccess(
				createSubscription(),
				"orders_per_month",
				200,
			);
			expect(result!.reason).toBe("usage-limit-exceeded");
		});

		it("allows when no limit configured (unlimited)", () => {
			const service = createService();
			const result = service.checkUsageLimitAccess(
				createSubscription(),
				"storage_gb",
				1000,
			);
			expect(result).toBeNull();
		});

		it("denies when no subscription", () => {
			const service = createService();
			const result = service.checkUsageLimitAccess(
				null,
				"orders_per_month",
				0,
			);
			expect(result!.reason).toBe("subscription-expired");
		});
	});

	// ─── requireModuleAccess ────────────────────────────────────────

	describe("requireModuleAccess", () => {
		it("does not throw for entitled module", () => {
			const service = createService();
			expect(() =>
				service.requireModuleAccess(createSubscription(), "catalog"),
			).not.toThrow();
		});

		it("throws FeatureGateError for non-entitled module", () => {
			const service = createService();
			expect(() =>
				service.requireModuleAccess(createSubscription(), "bookings"),
			).toThrow(FeatureGateError);
		});

		it("thrown error contains denial payload", () => {
			const service = createService();
			try {
				service.requireModuleAccess(createSubscription(), "bookings");
			} catch (error) {
				const fgError = error as FeatureGateError;
				expect(fgError.denial.denied).toBe(true);
				expect(fgError.denial.reason).toBe("module-not-entitled");
				expect(fgError.statusCode).toBe(403);
			}
		});
	});

	// ─── requirePremiumFeatureAccess ────────────────────────────────

	describe("requirePremiumFeatureAccess", () => {
		it("does not throw for entitled feature", () => {
			const service = createService();
			const sub = createSubscription({
				entitlements: {
					modules: {},
					premiumFeatures: ["advanced-analytics"],
					usageLimits: {},
				},
			});
			expect(() =>
				service.requirePremiumFeatureAccess(sub, "advanced-analytics"),
			).not.toThrow();
		});

		it("throws for non-entitled feature", () => {
			const service = createService();
			expect(() =>
				service.requirePremiumFeatureAccess(createSubscription(), "sso"),
			).toThrow(FeatureGateError);
		});
	});

	// ─── requireUsageLimitAccess ────────────────────────────────────

	describe("requireUsageLimitAccess", () => {
		it("does not throw when under limit", () => {
			const service = createService();
			expect(() =>
				service.requireUsageLimitAccess(
					createSubscription(),
					"orders_per_month",
					50,
				),
			).not.toThrow();
		});

		it("throws when at hard limit", () => {
			const service = createService();
			expect(() =>
				service.requireUsageLimitAccess(
					createSubscription(),
					"orders_per_month",
					150,
				),
			).toThrow(FeatureGateError);
		});
	});

	// ─── Security: feature gating cannot be bypassed ────────────────

	describe("security: cannot bypass feature gate", () => {
		it("denies non-entitled module even with direct API call", () => {
			const service = createService();
			const denial = service.checkModuleAccess(
				createSubscription(),
				"bookings",
			);
			expect(denial).not.toBeNull();
			expect(denial!.denied).toBe(true);
		});

		it("denies non-entitled premium feature even with direct API call", () => {
			const service = createService();
			const denial = service.checkPremiumFeatureAccess(
				createSubscription(),
				"custom-branding",
			);
			expect(denial).not.toBeNull();
			expect(denial!.denied).toBe(true);
		});

		it("blocks at hard limit even with direct API call", () => {
			const service = createService();
			const denial = service.checkUsageLimitAccess(
				createSubscription(),
				"orders_per_month",
				200,
			);
			expect(denial).not.toBeNull();
			expect(denial!.reason).toBe("usage-limit-exceeded");
		});
	});
});
