import { describe, expect, it } from "vitest";

import {
	computeLoyaltyTier,
	createDefaultNotificationPreferences,
	DEFAULT_TIER_THRESHOLDS,
	getNextTierThreshold,
	getPreferenceForCategory,
	getProfileForTenant,
	isChannelEnabled,
	isCustomerInTenant,
	loyaltyTiers,
	notificationCategories,
	notificationChannels,
} from "./customer";

// ── Loyalty Tier Computation ─────────────────────────────────────────────────

describe("computeLoyaltyTier", () => {
	it("returns bronze for 0 points", () => {
		expect(computeLoyaltyTier(0)).toBe("bronze");
	});

	it("returns bronze for points below silver threshold", () => {
		expect(computeLoyaltyTier(499)).toBe("bronze");
	});

	it("returns silver at 500 points", () => {
		expect(computeLoyaltyTier(500)).toBe("silver");
	});

	it("returns gold at 2000 points", () => {
		expect(computeLoyaltyTier(2000)).toBe("gold");
	});

	it("returns platinum at 5000 points", () => {
		expect(computeLoyaltyTier(5000)).toBe("platinum");
	});

	it("returns platinum for very high points", () => {
		expect(computeLoyaltyTier(100000)).toBe("platinum");
	});
});

describe("getNextTierThreshold", () => {
	it("returns silver threshold for bronze tier", () => {
		const next = getNextTierThreshold("bronze");
		expect(next).toEqual({ tier: "silver", requiredPoints: 500 });
	});

	it("returns gold threshold for silver tier", () => {
		const next = getNextTierThreshold("silver");
		expect(next).toEqual({ tier: "gold", requiredPoints: 2000 });
	});

	it("returns platinum threshold for gold tier", () => {
		const next = getNextTierThreshold("gold");
		expect(next).toEqual({ tier: "platinum", requiredPoints: 5000 });
	});

	it("returns null for platinum tier (highest)", () => {
		const next = getNextTierThreshold("platinum");
		expect(next).toBeNull();
	});
});

describe("loyaltyTiers constant", () => {
	it("has exactly 4 tiers", () => {
		expect(loyaltyTiers).toHaveLength(4);
	});

	it("is ordered from lowest to highest", () => {
		expect(loyaltyTiers).toEqual(["bronze", "silver", "gold", "platinum"]);
	});
});

describe("DEFAULT_TIER_THRESHOLDS", () => {
	it("has a threshold for each tier", () => {
		expect(DEFAULT_TIER_THRESHOLDS).toHaveLength(4);
		const tierNames = DEFAULT_TIER_THRESHOLDS.map((t) => t.tier);
		expect(tierNames).toEqual(["bronze", "silver", "gold", "platinum"]);
	});

	it("thresholds are in ascending order", () => {
		for (let i = 1; i < DEFAULT_TIER_THRESHOLDS.length; i++) {
			expect(DEFAULT_TIER_THRESHOLDS[i].requiredPoints).toBeGreaterThan(
				DEFAULT_TIER_THRESHOLDS[i - 1].requiredPoints
			);
		}
	});
});

// ── Notification Preferences ─────────────────────────────────────────────────

describe("createDefaultNotificationPreferences", () => {
	it("creates preferences for all categories", () => {
		const prefs = createDefaultNotificationPreferences();
		expect(prefs).toHaveLength(notificationCategories.length);
		const categories = prefs.map((p) => p.category);
		expect(categories).toEqual([...notificationCategories]);
	});

	it("enables email for all categories", () => {
		const prefs = createDefaultNotificationPreferences();
		for (const pref of prefs) {
			expect(pref.email).toBe(true);
		}
	});

	it("enables SMS for orders and bookings only", () => {
		const prefs = createDefaultNotificationPreferences();
		const ordersPref = prefs.find((p) => p.category === "orders");
		const bookingsPref = prefs.find((p) => p.category === "bookings");
		const promoPref = prefs.find((p) => p.category === "promotions");
		const accountPref = prefs.find((p) => p.category === "account");

		expect(ordersPref?.sms).toBe(true);
		expect(bookingsPref?.sms).toBe(true);
		expect(promoPref?.sms).toBe(false);
		expect(accountPref?.sms).toBe(false);
	});

	it("enables push for all categories", () => {
		const prefs = createDefaultNotificationPreferences();
		for (const pref of prefs) {
			expect(pref.push).toBe(true);
		}
	});
});

describe("getPreferenceForCategory", () => {
	it("returns the matching preference entry", () => {
		const prefs = createDefaultNotificationPreferences();
		const result = getPreferenceForCategory(prefs, "orders");
		expect(result).toBeDefined();
		expect(result?.category).toBe("orders");
	});

	it("returns undefined for non-existent category", () => {
		const result = getPreferenceForCategory([], "orders");
		expect(result).toBeUndefined();
	});
});

describe("isChannelEnabled", () => {
	it("returns true when channel is enabled", () => {
		const prefs = createDefaultNotificationPreferences();
		expect(isChannelEnabled(prefs, "orders", "email")).toBe(true);
		expect(isChannelEnabled(prefs, "orders", "sms")).toBe(true);
		expect(isChannelEnabled(prefs, "orders", "push")).toBe(true);
	});

	it("returns false when channel is disabled", () => {
		const prefs = createDefaultNotificationPreferences();
		expect(isChannelEnabled(prefs, "promotions", "sms")).toBe(false);
	});

	it("returns false when category not found", () => {
		expect(isChannelEnabled([], "orders", "email")).toBe(false);
	});
});

describe("notificationCategories constant", () => {
	it("has exactly 4 categories", () => {
		expect(notificationCategories).toHaveLength(4);
	});

	it("includes all expected categories", () => {
		expect(notificationCategories).toEqual([
			"orders",
			"bookings",
			"promotions",
			"account",
		]);
	});
});

describe("notificationChannels constant", () => {
	it("has exactly 3 channels", () => {
		expect(notificationChannels).toHaveLength(3);
	});

	it("includes email, sms, and push", () => {
		expect(notificationChannels).toEqual(["email", "sms", "push"]);
	});
});

// ── Cross-Tenant Identity ────────────────────────────────────────────────────

describe("isCustomerInTenant", () => {
	it("returns true when profile tenant matches", () => {
		expect(
			isCustomerInTenant({ tenantId: "tenant-1" }, "tenant-1")
		).toBe(true);
	});

	it("returns false when profile tenant does not match", () => {
		expect(
			isCustomerInTenant({ tenantId: "tenant-1" }, "tenant-2")
		).toBe(false);
	});
});

describe("getProfileForTenant", () => {
	const mapping = {
		userId: "user-1",
		email: "test@example.com",
		tenantProfiles: [
			{
				tenantId: "tenant-a",
				tenantName: "Business A",
				customerId: "cust-a",
				displayName: "Alice at A",
				createdAt: "2026-01-01T00:00:00Z",
			},
			{
				tenantId: "tenant-b",
				tenantName: "Business B",
				customerId: "cust-b",
				displayName: "Alice at B",
				createdAt: "2026-02-01T00:00:00Z",
			},
		],
	};

	it("returns the profile for the matching tenant", () => {
		const profile = getProfileForTenant(mapping, "tenant-a");
		expect(profile?.customerId).toBe("cust-a");
		expect(profile?.tenantName).toBe("Business A");
	});

	it("returns undefined for non-existent tenant", () => {
		const profile = getProfileForTenant(mapping, "tenant-c");
		expect(profile).toBeUndefined();
	});

	it("isolates profiles between tenants", () => {
		const profileA = getProfileForTenant(mapping, "tenant-a");
		const profileB = getProfileForTenant(mapping, "tenant-b");
		expect(profileA?.customerId).not.toBe(profileB?.customerId);
		expect(profileA?.tenantId).not.toBe(profileB?.tenantId);
	});
});

// ── Type Shape Contracts ─────────────────────────────────────────────────────

describe("CustomerProfile shape", () => {
	it("has all required fields", () => {
		const profile = {
			id: "cust-1",
			tenantId: "t-1",
			userId: "u-1",
			email: "test@example.com",
			displayName: "Test User",
			phone: null,
			avatarUrl: null,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		} satisfies import("./customer").CustomerProfile;

		expect(profile.id).toBe("cust-1");
		expect(profile.tenantId).toBe("t-1");
	});
});

describe("SavedAddress shape", () => {
	it("has all required fields", () => {
		const addr = {
			id: "addr-1",
			customerId: "cust-1",
			tenantId: "t-1",
			label: "Home",
			line1: "123 Main St",
			line2: null,
			city: "Anytown",
			state: "CA",
			zip: "90210",
			isDefault: true,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		} satisfies import("./customer").SavedAddress;

		expect(addr.isDefault).toBe(true);
		expect(addr.line2).toBeNull();
	});
});

describe("SavedPaymentMethod shape", () => {
	it("has only gateway token, never raw card number", () => {
		const pm = {
			id: "pm-1",
			customerId: "cust-1",
			tenantId: "t-1",
			gatewayToken: "tok_1234567890",
			cardBrand: "visa",
			lastFour: "4242",
			expiryMonth: 12,
			expiryYear: 2028,
			isDefault: true,
			createdAt: "2026-01-01T00:00:00Z",
		} satisfies import("./customer").SavedPaymentMethod;

		expect(pm.gatewayToken).toBe("tok_1234567890");
		expect(pm.lastFour).toBe("4242");
		// Verify shape has NO raw card number field
		expect(Object.keys(pm)).not.toContain("cardNumber");
		expect(Object.keys(pm)).not.toContain("rawCardNumber");
		expect(Object.keys(pm)).not.toContain("number");
	});
});

describe("LoyaltyAccount shape", () => {
	it("has all required fields", () => {
		const acct = {
			customerId: "cust-1",
			tenantId: "t-1",
			currentTier: "silver" as const,
			pointBalance: 750,
			lifetimePoints: 1200,
			tierProgressionThresholds: [...DEFAULT_TIER_THRESHOLDS],
			memberSince: "2026-01-01T00:00:00Z",
		} satisfies import("./customer").LoyaltyAccount;

		expect(acct.currentTier).toBe("silver");
		expect(acct.pointBalance).toBe(750);
	});
});

describe("NotificationPreferences shape", () => {
	it("has all required fields", () => {
		const np = {
			customerId: "cust-1",
			tenantId: "t-1",
			preferences: createDefaultNotificationPreferences(),
			updatedAt: "2026-01-01T00:00:00Z",
		} satisfies import("./customer").NotificationPreferences;

		expect(np.preferences).toHaveLength(4);
	});
});
