// E11-S2: Loyalty types unit tests

import { describe, expect, it } from "vitest";

import {
	buildLoyaltyTabData,
	calculatePointsForOrder,
	computeRedemptionDiscount,
	customerTagTypes,
	DEFAULT_LOYALTY_PROGRAM_CONFIG,
	deriveCustomerTags,
	isValidAccumulationMode,
	isValidExpirationPolicy,
	isValidLedgerEntryType,
	ledgerEntryTypes,
	pointAccumulationModes,
	pointExpirationPolicies,
	pointsToDiscountCents,
	validateLoyaltyProgramConfig,
} from "./loyalty";
import type {
	LoyaltyProgramConfig,
	LoyaltyTabData,
	PointLedgerEntry,
} from "./loyalty";

// ── Constants ───────────────────────────────────────────────────────────────

describe("pointAccumulationModes", () => {
	it("has exactly 2 modes", () => {
		expect(pointAccumulationModes).toHaveLength(2);
	});

	it("includes per_dollar and per_order", () => {
		expect(pointAccumulationModes).toEqual(["per_dollar", "per_order"]);
	});
});

describe("pointExpirationPolicies", () => {
	it("has exactly 3 policies", () => {
		expect(pointExpirationPolicies).toHaveLength(3);
	});

	it("includes time_based, rolling, and never", () => {
		expect(pointExpirationPolicies).toEqual(["time_based", "rolling", "never"]);
	});
});

describe("ledgerEntryTypes", () => {
	it("has exactly 4 types", () => {
		expect(ledgerEntryTypes).toHaveLength(4);
	});

	it("includes earn, redeem, expire, and adjust", () => {
		expect(ledgerEntryTypes).toEqual(["earn", "redeem", "expire", "adjust"]);
	});
});

describe("customerTagTypes", () => {
	it("has exactly 3 tag types", () => {
		expect(customerTagTypes).toHaveLength(3);
	});

	it("includes vip, loyalty, and new", () => {
		expect(customerTagTypes).toEqual(["vip", "loyalty", "new"]);
	});
});

// ── DEFAULT_LOYALTY_PROGRAM_CONFIG ──────────────────────────────────────────

describe("DEFAULT_LOYALTY_PROGRAM_CONFIG", () => {
	it("is disabled by default", () => {
		expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.enabled).toBe(false);
	});

	it("has 4 default tiers", () => {
		expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers).toHaveLength(4);
	});

	it("tiers are in ascending threshold order", () => {
		const tiers = DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers;
		for (let i = 1; i < tiers.length; i++) {
			expect(tiers[i].pointThreshold).toBeGreaterThan(tiers[i - 1].pointThreshold);
		}
	});

	it("first tier starts at 0", () => {
		expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers[0].pointThreshold).toBe(0);
	});

	it("default accumulation is per_dollar", () => {
		expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.accumulationMode).toBe("per_dollar");
	});

	it("default expiration policy is rolling", () => {
		expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.expirationPolicy).toBe("rolling");
	});
});

// ── calculatePointsForOrder ─────────────────────────────────────────────────

describe("calculatePointsForOrder", () => {
	it("calculates points per dollar", () => {
		expect(calculatePointsForOrder(2500, {
			accumulationMode: "per_dollar",
			pointsPerDollar: 1,
			pointsPerOrder: 10,
		})).toBe(25);
	});

	it("calculates points per dollar with higher rate", () => {
		expect(calculatePointsForOrder(1050, {
			accumulationMode: "per_dollar",
			pointsPerDollar: 2,
			pointsPerOrder: 10,
		})).toBe(20);
	});

	it("calculates points per order", () => {
		expect(calculatePointsForOrder(2500, {
			accumulationMode: "per_order",
			pointsPerDollar: 1,
			pointsPerOrder: 10,
		})).toBe(10);
	});

	it("returns 0 for zero total", () => {
		expect(calculatePointsForOrder(0, {
			accumulationMode: "per_dollar",
			pointsPerDollar: 1,
			pointsPerOrder: 10,
		})).toBe(0);
	});

	it("returns 0 for negative total", () => {
		expect(calculatePointsForOrder(-100, {
			accumulationMode: "per_dollar",
			pointsPerDollar: 1,
			pointsPerOrder: 10,
		})).toBe(0);
	});

	it("floors partial dollars", () => {
		expect(calculatePointsForOrder(199, {
			accumulationMode: "per_dollar",
			pointsPerDollar: 1,
			pointsPerOrder: 10,
		})).toBe(1);
	});
});

// ── pointsToDiscountCents ───────────────────────────────────────────────────

describe("pointsToDiscountCents", () => {
	it("converts points at 100:1 rate", () => {
		expect(pointsToDiscountCents(500, 100)).toBe(500);
	});

	it("converts points at 50:1 rate", () => {
		expect(pointsToDiscountCents(100, 50)).toBe(200);
	});

	it("returns 0 for zero points", () => {
		expect(pointsToDiscountCents(0, 100)).toBe(0);
	});

	it("returns 0 for negative points", () => {
		expect(pointsToDiscountCents(-10, 100)).toBe(0);
	});

	it("returns 0 for zero rate", () => {
		expect(pointsToDiscountCents(100, 0)).toBe(0);
	});

	it("floors partial conversions", () => {
		expect(pointsToDiscountCents(50, 100)).toBe(0);
	});
});

// ── computeRedemptionDiscount ───────────────────────────────────────────────

describe("computeRedemptionDiscount", () => {
	it("computes discount for 500 points at 100 rate", () => {
		expect(computeRedemptionDiscount(500, 100)).toBe(500);
	});

	it("computes discount for 250 points at 100 rate", () => {
		expect(computeRedemptionDiscount(250, 100)).toBe(250);
	});

	it("returns 0 for zero points", () => {
		expect(computeRedemptionDiscount(0, 100)).toBe(0);
	});

	it("returns 0 for negative points", () => {
		expect(computeRedemptionDiscount(-50, 100)).toBe(0);
	});

	it("returns 0 for zero rate", () => {
		expect(computeRedemptionDiscount(100, 0)).toBe(0);
	});
});

// ── deriveCustomerTags ──────────────────────────────────────────────────────

describe("deriveCustomerTags", () => {
	it("returns VIP tag for gold tier", () => {
		const tags = deriveCustomerTags(3000, "gold", 90);
		expect(tags).toContainEqual({ type: "vip", label: "VIP" });
	});

	it("returns VIP tag for platinum tier", () => {
		const tags = deriveCustomerTags(6000, "platinum", 90);
		expect(tags).toContainEqual({ type: "vip", label: "VIP" });
	});

	it("does not return VIP tag for silver tier", () => {
		const tags = deriveCustomerTags(600, "silver", 90);
		expect(tags.find((t) => t.type === "vip")).toBeUndefined();
	});

	it("returns Loyalty tag when lifetime points > 0", () => {
		const tags = deriveCustomerTags(100, "bronze", 90);
		expect(tags).toContainEqual({ type: "loyalty", label: "Loyalty" });
	});

	it("does not return Loyalty tag when lifetime points is 0", () => {
		const tags = deriveCustomerTags(0, "bronze", 90);
		expect(tags.find((t) => t.type === "loyalty")).toBeUndefined();
	});

	it("returns New tag when member < 30 days", () => {
		const tags = deriveCustomerTags(0, "bronze", 15);
		expect(tags).toContainEqual({ type: "new", label: "New" });
	});

	it("does not return New tag when member > 30 days", () => {
		const tags = deriveCustomerTags(0, "bronze", 60);
		expect(tags.find((t) => t.type === "new")).toBeUndefined();
	});

	it("can return multiple tags", () => {
		const tags = deriveCustomerTags(3000, "gold", 15);
		expect(tags).toHaveLength(3);
	});
});

// ── buildLoyaltyTabData ─────────────────────────────────────────────────────

describe("buildLoyaltyTabData", () => {
	const config = {
		tiers: DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers,
		minimumRedemptionPoints: 100,
	};

	it("builds tab data for bronze member", () => {
		const result = buildLoyaltyTabData(
			{ currentTier: "bronze", pointBalance: 50, lifetimePoints: 50, memberSince: "2026-01-01T00:00:00Z" },
			config,
			[],
		);
		expect(result.tierName).toBe("Bronze");
		expect(result.nextTierName).toBe("Silver");
		expect(result.nextTierThreshold).toBe(500);
		expect(result.pointsToNextTier).toBe(450);
		expect(result.progressPercent).toBe(10);
		expect(result.canRedeem).toBe(false);
	});

	it("builds tab data for gold member", () => {
		const result = buildLoyaltyTabData(
			{ currentTier: "gold", pointBalance: 2450, lifetimePoints: 2450, memberSince: "2026-01-01T00:00:00Z" },
			config,
			[],
		);
		expect(result.tierName).toBe("Gold");
		expect(result.nextTierName).toBe("Platinum");
		expect(result.nextTierThreshold).toBe(5000);
		expect(result.pointsToNextTier).toBe(2550);
		expect(result.canRedeem).toBe(true);
	});

	it("builds tab data for platinum member (highest)", () => {
		const result = buildLoyaltyTabData(
			{ currentTier: "platinum", pointBalance: 7000, lifetimePoints: 7000, memberSince: "2026-01-01T00:00:00Z" },
			config,
			[],
		);
		expect(result.tierName).toBe("Platinum");
		expect(result.nextTierName).toBeNull();
		expect(result.nextTierThreshold).toBeNull();
		expect(result.pointsToNextTier).toBeNull();
		expect(result.progressPercent).toBe(100);
	});

	it("includes recent activity", () => {
		const activity: PointLedgerEntry[] = [
			{
				id: "entry-1",
				tenantId: "t-1",
				customerId: "c-1",
				type: "earn",
				points: 25,
				balanceAfter: 75,
				description: "Order #123",
				referenceType: "order",
				referenceId: "order-123",
				expiresAt: null,
				createdAt: "2026-03-01T00:00:00Z",
			},
		];
		const result = buildLoyaltyTabData(
			{ currentTier: "bronze", pointBalance: 75, lifetimePoints: 75, memberSince: "2026-01-01T00:00:00Z" },
			config,
			activity,
		);
		expect(result.recentActivity).toHaveLength(1);
		expect(result.recentActivity[0].type).toBe("earn");
	});
});

// ── validateLoyaltyProgramConfig ────────────────────────────────────────────

describe("validateLoyaltyProgramConfig", () => {
	it("returns no errors for valid config", () => {
		const errors = validateLoyaltyProgramConfig(DEFAULT_LOYALTY_PROGRAM_CONFIG);
		expect(errors).toHaveLength(0);
	});

	it("rejects empty tiers", () => {
		const errors = validateLoyaltyProgramConfig({
			...DEFAULT_LOYALTY_PROGRAM_CONFIG,
			tiers: [],
		});
		expect(errors).toContain("At least one tier is required.");
	});

	it("rejects non-ascending thresholds", () => {
		const errors = validateLoyaltyProgramConfig({
			...DEFAULT_LOYALTY_PROGRAM_CONFIG,
			tiers: [
				{ name: "A", pointThreshold: 0, benefitsDescription: "" },
				{ name: "B", pointThreshold: 500, benefitsDescription: "" },
				{ name: "C", pointThreshold: 300, benefitsDescription: "" },
			],
		});
		expect(errors).toContain("Tier thresholds must be in ascending order.");
	});

	it("rejects first tier not starting at 0", () => {
		const errors = validateLoyaltyProgramConfig({
			...DEFAULT_LOYALTY_PROGRAM_CONFIG,
			tiers: [
				{ name: "A", pointThreshold: 100, benefitsDescription: "" },
			],
		});
		expect(errors).toContain("First tier must have a threshold of 0.");
	});

	it("rejects negative pointsPerDollar", () => {
		const errors = validateLoyaltyProgramConfig({
			...DEFAULT_LOYALTY_PROGRAM_CONFIG,
			pointsPerDollar: -1,
		});
		expect(errors).toContain("pointsPerDollar must be non-negative.");
	});

	it("rejects zero pointRedemptionRate", () => {
		const errors = validateLoyaltyProgramConfig({
			...DEFAULT_LOYALTY_PROGRAM_CONFIG,
			pointRedemptionRate: 0,
		});
		expect(errors).toContain("pointRedemptionRate must be positive.");
	});

	it("rejects negative expirationDays", () => {
		const errors = validateLoyaltyProgramConfig({
			...DEFAULT_LOYALTY_PROGRAM_CONFIG,
			expirationDays: -1,
		});
		expect(errors).toContain("expirationDays must be non-negative.");
	});
});

// ── Type guards ─────────────────────────────────────────────────────────────

describe("isValidAccumulationMode", () => {
	it("returns true for valid modes", () => {
		expect(isValidAccumulationMode("per_dollar")).toBe(true);
		expect(isValidAccumulationMode("per_order")).toBe(true);
	});

	it("returns false for invalid modes", () => {
		expect(isValidAccumulationMode("per_item")).toBe(false);
		expect(isValidAccumulationMode("")).toBe(false);
	});
});

describe("isValidExpirationPolicy", () => {
	it("returns true for valid policies", () => {
		expect(isValidExpirationPolicy("time_based")).toBe(true);
		expect(isValidExpirationPolicy("rolling")).toBe(true);
		expect(isValidExpirationPolicy("never")).toBe(true);
	});

	it("returns false for invalid policies", () => {
		expect(isValidExpirationPolicy("monthly")).toBe(false);
	});
});

describe("isValidLedgerEntryType", () => {
	it("returns true for valid types", () => {
		expect(isValidLedgerEntryType("earn")).toBe(true);
		expect(isValidLedgerEntryType("redeem")).toBe(true);
		expect(isValidLedgerEntryType("expire")).toBe(true);
		expect(isValidLedgerEntryType("adjust")).toBe(true);
	});

	it("returns false for invalid types", () => {
		expect(isValidLedgerEntryType("bonus")).toBe(false);
	});
});

// ── Type Shape Contracts ────────────────────────────────────────────────────

describe("LoyaltyProgramConfig shape", () => {
	it("has all required fields", () => {
		const config: LoyaltyProgramConfig = {
			id: "cfg-1",
			tenantId: "t-1",
			enabled: true,
			tiers: [{ name: "Bronze", pointThreshold: 0, benefitsDescription: "Basic" }],
			accumulationMode: "per_dollar",
			pointsPerDollar: 1,
			pointsPerOrder: 10,
			pointRedemptionRate: 100,
			minimumRedemptionPoints: 100,
			expirationPolicy: "rolling",
			expirationDays: 365,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		};
		expect(config.id).toBe("cfg-1");
		expect(config.tenantId).toBe("t-1");
	});
});

describe("PointLedgerEntry shape", () => {
	it("has all required fields", () => {
		const entry: PointLedgerEntry = {
			id: "entry-1",
			tenantId: "t-1",
			customerId: "c-1",
			type: "earn",
			points: 25,
			balanceAfter: 125,
			description: "Order completed",
			referenceType: "order",
			referenceId: "order-1",
			expiresAt: "2027-01-01T00:00:00Z",
			createdAt: "2026-01-01T00:00:00Z",
		};
		expect(entry.type).toBe("earn");
		expect(entry.points).toBe(25);
	});
});

describe("LoyaltyTabData shape", () => {
	it("has all required fields", () => {
		const tab: LoyaltyTabData = {
			tierName: "Gold",
			pointBalance: 2450,
			lifetimePoints: 2450,
			nextTierName: "Platinum",
			nextTierThreshold: 5000,
			progressPercent: 49,
			pointsToNextTier: 2550,
			memberSince: "2026-01-01T00:00:00Z",
			canRedeem: true,
			minimumRedemptionPoints: 100,
			recentActivity: [],
		};
		expect(tab.tierName).toBe("Gold");
		expect(tab.canRedeem).toBe(true);
	});
});
