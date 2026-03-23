// E12-S1: Unit tests for subscription package types, validation,
// entitlement extraction, comparison model, and versioning helpers.
// E12-S2: Tests for feature gating types, entitlement resolution,
// frontend state builders, navigation gating, and usage limit checks.

import { describe, expect, it } from "vitest";
import {
	buildPackageComparisonModel,
	extractEntitlementMap,
	hasEntitlementChanges,
	isValidBillingInterval,
	isValidPackageStatus,
	isValidPremiumFeatureFlag,
	isValidUsageLimitType,
	validateSubscriptionPackageInput,
	resolveEffectiveModules,
	buildFrontendEntitlementState,
	evaluateNavigationGating,
	checkUsageLimit,
} from "./subscription";
import type {
	CreateSubscriptionPackageInput,
	PackageEntitlementMap,
	SubscriptionPackageWithEntitlements,
	TenantSubscriptionContext,
	FrontendEntitlementState,
} from "./subscription";

// ─── Helpers ────────────────────────────────────────────────────────

function sampleCreateInput(
	overrides?: Partial<CreateSubscriptionPackageInput>,
): CreateSubscriptionPackageInput {
	return {
		name: "Starter",
		description: "Basic plan",
		billingInterval: "monthly",
		basePriceCents: 2900,
		trialDurationDays: 14,
		displayOrder: 1,
		modules: { catalog: true, ordering: true, content: true },
		premiumFeatures: [],
		usageLimits: [
			{ limitType: "orders_per_month", softLimit: 100, hardLimit: 150 },
			{ limitType: "storage_gb", hardLimit: 5 },
		],
		...overrides,
	};
}

function samplePackageWithEntitlements(
	id: string,
	name: string,
	displayOrder: number,
	modules: Record<string, boolean>,
	premiumFlags: string[],
	limits: { limitType: string; softLimit: number | null; hardLimit: number }[],
): SubscriptionPackageWithEntitlements {
	return {
		package: {
			id,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
			name,
			description: `${name} plan`,
			billingInterval: "monthly",
			basePriceCents: 2900,
			trialDurationDays: 14,
			status: "active",
			deprecatedAt: null,
			displayOrder,
		},
		entitlements: Object.entries(modules).map(([key, enabled], i) => ({
			id: `ent-${id}-${i}`,
			createdAt: "2026-01-01T00:00:00.000Z",
			packageId: id,
			moduleKey: key,
			enabled,
		})),
		usageLimits: limits.map((l, i) => ({
			id: `lim-${id}-${i}`,
			createdAt: "2026-01-01T00:00:00.000Z",
			packageId: id,
			limitType: l.limitType as "orders_per_month" | "storage_gb" | "staff_seats",
			softLimit: l.softLimit,
			hardLimit: l.hardLimit,
			resetPeriod: "monthly" as const,
		})),
		premiumFeatures: premiumFlags.map((flag, i) => ({
			id: `pf-${id}-${i}`,
			createdAt: "2026-01-01T00:00:00.000Z",
			packageId: id,
			featureFlag: flag as "advanced-analytics" | "api-access",
		})),
	};
}

// ─── Type guard tests ───────────────────────────────────────────────

describe("BillingInterval type guard", () => {
	it("accepts monthly", () => {
		expect(isValidBillingInterval("monthly")).toBe(true);
	});
	it("accepts annual", () => {
		expect(isValidBillingInterval("annual")).toBe(true);
	});
	it("rejects unknown", () => {
		expect(isValidBillingInterval("weekly")).toBe(false);
	});
});

describe("PackageStatus type guard", () => {
	it("accepts active", () => {
		expect(isValidPackageStatus("active")).toBe(true);
	});
	it("accepts deprecated", () => {
		expect(isValidPackageStatus("deprecated")).toBe(true);
	});
	it("rejects unknown", () => {
		expect(isValidPackageStatus("deleted")).toBe(false);
	});
});

describe("UsageLimitType type guard", () => {
	it("accepts orders_per_month", () => {
		expect(isValidUsageLimitType("orders_per_month")).toBe(true);
	});
	it("accepts storage_gb", () => {
		expect(isValidUsageLimitType("storage_gb")).toBe(true);
	});
	it("accepts staff_seats", () => {
		expect(isValidUsageLimitType("staff_seats")).toBe(true);
	});
	it("rejects unknown", () => {
		expect(isValidUsageLimitType("bandwidth_tb")).toBe(false);
	});
});

describe("PremiumFeatureFlag type guard", () => {
	it("accepts advanced-analytics", () => {
		expect(isValidPremiumFeatureFlag("advanced-analytics")).toBe(true);
	});
	it("accepts api-access", () => {
		expect(isValidPremiumFeatureFlag("api-access")).toBe(true);
	});
	it("rejects unknown", () => {
		expect(isValidPremiumFeatureFlag("teleportation")).toBe(false);
	});
});

// ─── Package validation tests ───────────────────────────────────────

describe("validateSubscriptionPackageInput", () => {
	it("accepts a valid input", () => {
		const result = validateSubscriptionPackageInput(sampleCreateInput());
		expect(result).toEqual({ valid: true });
	});

	it("rejects empty name", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ name: "" }),
		);
		expect(result).toEqual({ valid: false, reason: "missing-name" });
	});

	it("rejects whitespace-only name", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ name: "   " }),
		);
		expect(result).toEqual({ valid: false, reason: "missing-name" });
	});

	it("rejects invalid billing interval", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ billingInterval: "weekly" as "monthly" }),
		);
		expect(result).toEqual({
			valid: false,
			reason: "invalid-billing-interval",
			value: "weekly",
		});
	});

	it("rejects negative price", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ basePriceCents: -100 }),
		);
		expect(result).toEqual({
			valid: false,
			reason: "invalid-price",
			value: -100,
		});
	});

	it("rejects non-integer price", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ basePriceCents: 29.99 }),
		);
		expect(result).toEqual({
			valid: false,
			reason: "invalid-price",
			value: 29.99,
		});
	});

	it("rejects negative trial duration", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ trialDurationDays: -1 }),
		);
		expect(result).toEqual({
			valid: false,
			reason: "invalid-trial-duration",
			value: -1,
		});
	});

	it("accepts zero price (free plan)", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ basePriceCents: 0 }),
		);
		expect(result).toEqual({ valid: true });
	});

	it("rejects empty modules", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ modules: {} }),
		);
		expect(result).toEqual({ valid: false, reason: "no-modules" });
	});

	it("rejects invalid module key", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ modules: { teleportation: true } }),
		);
		expect(result).toEqual({
			valid: false,
			reason: "invalid-module-key",
			invalidKey: "teleportation",
		});
	});

	it("rejects module dependency violations", () => {
		// ordering requires catalog
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ modules: { ordering: true } }),
		);
		expect(result).toEqual({
			valid: false,
			reason: "module-dependency-violation",
			module: "ordering",
			missingDependency: "catalog",
		});
	});

	it("rejects invalid premium feature flag", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({ premiumFeatures: ["invalid-flag"] }),
		);
		expect(result).toEqual({
			valid: false,
			reason: "invalid-premium-feature",
			invalidFlag: "invalid-flag",
		});
	});

	it("rejects invalid usage limit type", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({
				usageLimits: [
					{ limitType: "bandwidth_tb" as "orders_per_month", hardLimit: 100 },
				],
			}),
		);
		expect(result).toEqual({
			valid: false,
			reason: "invalid-usage-limit-type",
			invalidType: "bandwidth_tb",
		});
	});

	it("rejects negative hard limit", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({
				usageLimits: [
					{ limitType: "orders_per_month", hardLimit: -10 },
				],
			}),
		);
		expect(result).toEqual({
			valid: false,
			reason: "invalid-usage-limit-value",
			limitType: "orders_per_month",
			field: "hardLimit",
			value: -10,
		});
	});

	it("rejects soft limit greater than hard limit", () => {
		const result = validateSubscriptionPackageInput(
			sampleCreateInput({
				usageLimits: [
					{ limitType: "orders_per_month", softLimit: 200, hardLimit: 100 },
				],
			}),
		);
		expect(result).toEqual({
			valid: false,
			reason: "invalid-usage-limit-value",
			limitType: "orders_per_month",
			field: "softLimit",
			value: 200,
		});
	});
});

// ─── Entitlement extraction tests ───────────────────────────────────

describe("extractEntitlementMap", () => {
	it("extracts modules, premium features, and usage limits", () => {
		const pkg = samplePackageWithEntitlements(
			"pkg-1",
			"Pro",
			1,
			{ catalog: true, ordering: true, bookings: false },
			["advanced-analytics"],
			[{ limitType: "orders_per_month", softLimit: 100, hardLimit: 150 }],
		);

		const map = extractEntitlementMap(pkg);

		expect(map.modules).toEqual({
			catalog: true,
			ordering: true,
			bookings: false,
		});
		expect(map.premiumFeatures).toEqual(["advanced-analytics"]);
		expect(map.usageLimits.orders_per_month).toEqual({
			softLimit: 100,
			hardLimit: 150,
			resetPeriod: "monthly",
		});
	});
});

// ─── Comparison model tests ─────────────────────────────────────────

describe("buildPackageComparisonModel", () => {
	it("builds a comparison model sorted by displayOrder", () => {
		const starter = samplePackageWithEntitlements(
			"starter",
			"Starter",
			1,
			{ catalog: true, ordering: true },
			[],
			[{ limitType: "orders_per_month", softLimit: 100, hardLimit: 150 }],
		);
		const pro = samplePackageWithEntitlements(
			"pro",
			"Professional",
			2,
			{ catalog: true, ordering: true, bookings: true },
			["advanced-analytics"],
			[{ limitType: "orders_per_month", softLimit: 1000, hardLimit: 1500 }],
		);

		const model = buildPackageComparisonModel([pro, starter]);

		// Sorted by displayOrder
		expect(model.packages[0].name).toBe("Starter");
		expect(model.packages[1].name).toBe("Professional");

		// Module rows
		const moduleRows = model.features.filter(
			(f) => f.featureCategory === "module",
		);
		expect(moduleRows.length).toBeGreaterThanOrEqual(2);

		// Usage limit rows
		const limitRows = model.features.filter(
			(f) => f.featureCategory === "usage-limit",
		);
		expect(limitRows.length).toBe(1);
		expect(limitRows[0].featureName).toBe("Orders per Month");

		// Premium feature rows
		const premiumRows = model.features.filter(
			(f) => f.featureCategory === "premium-feature",
		);
		expect(premiumRows.length).toBe(1);
		expect(premiumRows[0].featureName).toBe("Advanced Analytics");
		expect(premiumRows[0].values["starter"].included).toBe(false);
		expect(premiumRows[0].values["pro"].included).toBe(true);
	});

	it("generates CTA label based on trial and price", () => {
		const withTrial = samplePackageWithEntitlements(
			"t1",
			"Trial Plan",
			1,
			{ catalog: true },
			[],
			[],
		);
		const model = buildPackageComparisonModel([withTrial]);
		expect(model.packages[0].ctaLabel).toBe("Start Free Trial");
	});
});

// ─── Version change detection tests ─────────────────────────────────

describe("hasEntitlementChanges", () => {
	const base: PackageEntitlementMap = {
		modules: { catalog: true, ordering: true },
		premiumFeatures: ["advanced-analytics"],
		usageLimits: {
			orders_per_month: { softLimit: 100, hardLimit: 150, resetPeriod: "monthly" },
		},
	};

	it("returns false when entitlements are identical", () => {
		expect(hasEntitlementChanges(base, { ...base })).toBe(false);
	});

	it("detects module changes", () => {
		const changed: PackageEntitlementMap = {
			...base,
			modules: { catalog: true, ordering: true, bookings: true },
		};
		expect(hasEntitlementChanges(base, changed)).toBe(true);
	});

	it("detects premium feature additions", () => {
		const changed: PackageEntitlementMap = {
			...base,
			premiumFeatures: ["advanced-analytics", "api-access"],
		};
		expect(hasEntitlementChanges(base, changed)).toBe(true);
	});

	it("detects premium feature removals", () => {
		const changed: PackageEntitlementMap = {
			...base,
			premiumFeatures: [],
		};
		expect(hasEntitlementChanges(base, changed)).toBe(true);
	});

	it("detects usage limit changes", () => {
		const changed: PackageEntitlementMap = {
			...base,
			usageLimits: {
				orders_per_month: { softLimit: 200, hardLimit: 300, resetPeriod: "monthly" },
			},
		};
		expect(hasEntitlementChanges(base, changed)).toBe(true);
	});

	it("detects new usage limit type", () => {
		const changed: PackageEntitlementMap = {
			...base,
			usageLimits: {
				...base.usageLimits,
				storage_gb: { softLimit: null, hardLimit: 50, resetPeriod: "none" },
			},
		};
		expect(hasEntitlementChanges(base, changed)).toBe(true);
	});

	it("detects removed usage limit type", () => {
		const changed: PackageEntitlementMap = {
			...base,
			usageLimits: {},
		};
		expect(hasEntitlementChanges(base, changed)).toBe(true);
	});
});

// ─── E12-S2-T1: resolveEffectiveModules ─────────────────────────────

describe("resolveEffectiveModules", () => {
	it("uses manual modules when no subscription entitlements", () => {
		const result = resolveEffectiveModules(null, ["catalog", "ordering"]);
		expect(result.source).toBe("manual");
		expect(result.effectiveModules).toEqual(["catalog", "ordering"]);
	});

	it("subscription is authoritative source", () => {
		const entitlements: PackageEntitlementMap = {
			modules: { catalog: true, ordering: true },
			premiumFeatures: [],
			usageLimits: {},
		};
		const result = resolveEffectiveModules(entitlements, ["catalog", "ordering"]);
		expect(result.source).toBe("subscription");
		expect(result.effectiveModules).toEqual(["catalog", "ordering"]);
	});

	it("identifies restricted modules", () => {
		const entitlements: PackageEntitlementMap = {
			modules: { catalog: true },
			premiumFeatures: [],
			usageLimits: {},
		};
		const result = resolveEffectiveModules(entitlements, ["catalog", "ordering"]);
		expect(result.restrictedModules).toEqual(["ordering"]);
		expect(result.upgradeSuggestion).toContain("ordering");
	});
});

// ─── E12-S2-T3: buildFrontendEntitlementState ───────────────────────

describe("buildFrontendEntitlementState", () => {
	const testSubscription: TenantSubscriptionContext = {
		tenantId: "t-1",
		packageId: "pkg-starter",
		packageName: "Starter",
		packageVersionNumber: 1,
		status: "active",
		entitlements: {
			modules: { catalog: true, ordering: true },
			premiumFeatures: ["advanced-analytics"],
			usageLimits: {
				orders_per_month: { softLimit: 100, hardLimit: 150, resetPeriod: "monthly" },
			},
		},
		gracePeriodEnd: null,
		subscribedAt: "2026-01-01T00:00:00Z",
	};

	it("builds state from subscription", () => {
		const state = buildFrontendEntitlementState(testSubscription, { orders_per_month: 50 });
		expect(state.modules.catalog).toBe(true);
		expect(state.modules.ordering).toBe(true);
		expect(state.premiumFeatures).toContain("advanced-analytics");
		expect(state.subscriptionStatus).toBe("active");
	});

	it("returns empty state when no subscription", () => {
		const state = buildFrontendEntitlementState(null, {});
		expect(state.modules).toEqual({});
		expect(state.premiumFeatures).toEqual([]);
		expect(state.subscriptionStatus).toBeNull();
	});

	it("tracks usage limit state", () => {
		const state = buildFrontendEntitlementState(testSubscription, { orders_per_month: 120 });
		expect(state.usageLimits.orders_per_month.isAtSoftLimit).toBe(true);
		expect(state.usageLimits.orders_per_month.isAtHardLimit).toBe(false);
	});

	it("detects grace period", () => {
		const gpSub: TenantSubscriptionContext = {
			...testSubscription,
			status: "grace_period",
			gracePeriodEnd: "2026-04-01T00:00:00Z",
		};
		const state = buildFrontendEntitlementState(gpSub, {});
		expect(state.isInGracePeriod).toBe(true);
		expect(state.gracePeriodEnd).toBe("2026-04-01T00:00:00Z");
	});
});

// ─── E12-S2-T3: evaluateNavigationGating ────────────────────────────

describe("evaluateNavigationGating", () => {
	const entitlementState: FrontendEntitlementState = {
		modules: { catalog: true, ordering: true },
		premiumFeatures: ["advanced-analytics"],
		usageLimits: {},
		subscriptionStatus: "active",
		isInGracePeriod: false,
		gracePeriodEnd: null,
	};

	it("returns visible+enabled when no requirements", () => {
		const result = evaluateNavigationGating(entitlementState, null, null);
		expect(result.visible).toBe(true);
		if (result.visible) {
			expect(result.enabled).toBe(true);
		}
	});

	it("returns visible+enabled for entitled module", () => {
		const result = evaluateNavigationGating(entitlementState, "catalog", null);
		expect(result.visible).toBe(true);
		if (result.visible) {
			expect(result.enabled).toBe(true);
		}
	});

	it("returns visible+disabled with upgrade prompt for non-entitled module", () => {
		const result = evaluateNavigationGating(entitlementState, "bookings", null);
		expect(result.visible).toBe(true);
		if (result.visible && !result.enabled) {
			expect(result.upgradePrompt.ctaLabel).toBe("Upgrade Plan");
		}
	});

	it("returns visible+enabled for entitled premium feature", () => {
		const result = evaluateNavigationGating(entitlementState, null, "advanced-analytics");
		expect(result.visible).toBe(true);
		if (result.visible) {
			expect(result.enabled).toBe(true);
		}
	});

	it("returns visible+disabled for non-entitled premium feature", () => {
		const result = evaluateNavigationGating(entitlementState, null, "sso");
		expect(result.visible).toBe(true);
		if (result.visible) {
			expect(result.enabled).toBe(false);
		}
	});
});

// ─── E12-S2-T5: checkUsageLimit ─────────────────────────────────────

describe("checkUsageLimit", () => {
	const limitConfig = { softLimit: 100, hardLimit: 150, resetPeriod: "monthly" as const };

	it("returns within-limits when under soft limit", () => {
		const result = checkUsageLimit("orders_per_month", 50, limitConfig);
		expect(result.status).toBe("within-limits");
		expect(result.warningMessage).toBeNull();
	});

	it("returns soft-limit-warning at soft limit", () => {
		const result = checkUsageLimit("orders_per_month", 100, limitConfig);
		expect(result.status).toBe("soft-limit-warning");
		expect(result.warningMessage).toBeTruthy();
	});

	it("returns hard-limit-reached at hard limit", () => {
		const result = checkUsageLimit("orders_per_month", 150, limitConfig);
		expect(result.status).toBe("hard-limit-reached");
		expect(result.remainingBeforeHard).toBe(0);
	});

	it("returns remaining count before hard limit", () => {
		const result = checkUsageLimit("orders_per_month", 120, limitConfig);
		expect(result.remainingBeforeHard).toBe(30);
	});

	it("handles no soft limit", () => {
		const noSoftLimit = { softLimit: null, hardLimit: 50, resetPeriod: "none" as const };
		const result = checkUsageLimit("staff_seats", 30, noSoftLimit);
		expect(result.status).toBe("within-limits");
	});
});
