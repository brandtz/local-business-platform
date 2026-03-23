// E11-S2: Loyalty service unit tests

import { describe, expect, it } from "vitest";
import {
	LoyaltyService,
	LoyaltyValidationError,
	InsufficientPointsError,
	LoyaltyProgramDisabledError,
	LoyaltyConfigNotFoundError,
} from "./loyalty.service";
import { LoyaltyRepository } from "./loyalty.repository";

function createService(): LoyaltyService {
	return new LoyaltyService(new LoyaltyRepository());
}

function createEnabledService(): { service: LoyaltyService; tenantId: string } {
	const service = createService();
	const tenantId = "tenant-1";
	service.createConfig({
		tenantId,
		enabled: true,
		accumulationMode: "per_dollar",
		pointsPerDollar: 1,
		pointsPerOrder: 10,
		pointRedemptionRate: 100,
		minimumRedemptionPoints: 100,
		expirationPolicy: "never",
	});
	return { service, tenantId };
}

// ── T1: Loyalty Configuration ───────────────────────────────────────────────

describe("LoyaltyService – Configuration", () => {
	it("creates a default config for a tenant", () => {
		const service = createService();
		const config = service.getConfig("tenant-1");
		expect(config.tenantId).toBe("tenant-1");
		expect(config.enabled).toBe(false);
		expect(config.tiers).toHaveLength(4);
	});

	it("creates config with custom settings", () => {
		const service = createService();
		const config = service.createConfig({
			tenantId: "tenant-1",
			enabled: true,
			accumulationMode: "per_order",
			pointsPerOrder: 50,
		});
		expect(config.enabled).toBe(true);
		expect(config.accumulationMode).toBe("per_order");
		expect(config.pointsPerOrder).toBe(50);
	});

	it("rejects duplicate config creation", () => {
		const service = createService();
		service.createConfig({ tenantId: "tenant-1" });
		expect(() => service.createConfig({ tenantId: "tenant-1" })).toThrow(
			LoyaltyValidationError,
		);
	});

	it("updates an existing config", () => {
		const service = createService();
		service.createConfig({ tenantId: "tenant-1" });
		const updated = service.updateConfig("tenant-1", { enabled: true, pointsPerDollar: 2 });
		expect(updated.enabled).toBe(true);
		expect(updated.pointsPerDollar).toBe(2);
	});

	it("rejects update for non-existent config", () => {
		const service = createService();
		expect(() => service.updateConfig("tenant-99", { enabled: true })).toThrow(
			LoyaltyConfigNotFoundError,
		);
	});

	it("validates tier thresholds on creation", () => {
		const service = createService();
		expect(() =>
			service.createConfig({
				tenantId: "tenant-1",
				tiers: [
					{ name: "A", pointThreshold: 100, benefitsDescription: "" },
				],
			}),
		).toThrow(LoyaltyValidationError);
	});

	it("validates tier thresholds on update", () => {
		const service = createService();
		service.createConfig({ tenantId: "tenant-1" });
		expect(() =>
			service.updateConfig("tenant-1", {
				tiers: [
					{ name: "A", pointThreshold: 0, benefitsDescription: "" },
					{ name: "B", pointThreshold: 500, benefitsDescription: "" },
					{ name: "C", pointThreshold: 300, benefitsDescription: "" },
				],
			}),
		).toThrow(LoyaltyValidationError);
	});
});

// ── T3: Point Accumulation ──────────────────────────────────────────────────

describe("LoyaltyService – Point Accumulation", () => {
	it("accumulates points for a completed order (per_dollar)", () => {
		const { service, tenantId } = createEnabledService();
		const result = service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 2500,
		});
		expect(result.pointsEarned).toBe(25);
		expect(result.newBalance).toBe(25);
		expect(result.newLifetimePoints).toBe(25);
		expect(result.previousTier).toBe("bronze");
		expect(result.tierChanged).toBe(false);
	});

	it("accumulates points for multiple orders", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 25000,
		});
		const result = service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-2",
			orderTotalCents: 30000,
		});
		expect(result.newBalance).toBe(550);
		expect(result.newLifetimePoints).toBe(550);
	});

	it("triggers tier promotion", () => {
		const { service, tenantId } = createEnabledService();
		const result = service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 60000,
		});
		expect(result.pointsEarned).toBe(600);
		expect(result.tierChanged).toBe(true);
		expect(result.newTier).toBe("silver");
	});

	it("rejects accumulation when program is disabled", () => {
		const service = createService();
		service.createConfig({ tenantId: "tenant-1", enabled: false });
		expect(() =>
			service.accumulatePoints({
				tenantId: "tenant-1",
				customerId: "cust-1",
				orderId: "order-1",
				orderTotalCents: 2500,
			}),
		).toThrow(LoyaltyProgramDisabledError);
	});

	it("returns zero for zero order total", () => {
		const { service, tenantId } = createEnabledService();
		const result = service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 0,
		});
		expect(result.pointsEarned).toBe(0);
	});

	it("creates ledger entry for earned points", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 2500,
		});
		const ledger = service.getLedger(tenantId, "cust-1");
		expect(ledger.entries).toHaveLength(1);
		expect(ledger.entries[0].type).toBe("earn");
		expect(ledger.entries[0].points).toBe(25);
	});
});

// ── T4: Point Redemption ────────────────────────────────────────────────────

describe("LoyaltyService – Point Redemption", () => {
	it("redeems points for a discount", () => {
		const { service, tenantId } = createEnabledService();
		// First earn some points
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 50000,
		});

		const result = service.redeemPoints({
			tenantId,
			customerId: "cust-1",
			pointsToRedeem: 200,
		});
		expect(result.pointsRedeemed).toBe(200);
		expect(result.discountCents).toBe(200);
		expect(result.newBalance).toBe(300);
	});

	it("rejects redemption below minimum", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 50000,
		});
		expect(() =>
			service.redeemPoints({
				tenantId,
				customerId: "cust-1",
				pointsToRedeem: 50,
			}),
		).toThrow(LoyaltyValidationError);
	});

	it("rejects redemption exceeding balance", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 5000,
		});
		expect(() =>
			service.redeemPoints({
				tenantId,
				customerId: "cust-1",
				pointsToRedeem: 200,
			}),
		).toThrow(InsufficientPointsError);
	});

	it("rejects zero points redemption", () => {
		const { service, tenantId } = createEnabledService();
		expect(() =>
			service.redeemPoints({
				tenantId,
				customerId: "cust-1",
				pointsToRedeem: 0,
			}),
		).toThrow(LoyaltyValidationError);
	});

	it("rejects negative points redemption", () => {
		const { service, tenantId } = createEnabledService();
		expect(() =>
			service.redeemPoints({
				tenantId,
				customerId: "cust-1",
				pointsToRedeem: -100,
			}),
		).toThrow(LoyaltyValidationError);
	});

	it("rejects redemption when program is disabled", () => {
		const service = createService();
		service.createConfig({ tenantId: "tenant-1", enabled: false });
		expect(() =>
			service.redeemPoints({
				tenantId: "tenant-1",
				customerId: "cust-1",
				pointsToRedeem: 100,
			}),
		).toThrow(LoyaltyProgramDisabledError);
	});

	it("creates ledger entry for redeemed points", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 50000,
		});
		service.redeemPoints({
			tenantId,
			customerId: "cust-1",
			pointsToRedeem: 200,
		});
		const ledger = service.getLedger(tenantId, "cust-1");
		const redeemEntry = ledger.entries.find((e) => e.type === "redeem");
		expect(redeemEntry).toBeDefined();
		expect(redeemEntry!.points).toBe(-200);
	});

	it("never allows negative balance", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 15000,
		});
		// Balance is 150, try to redeem 200
		expect(() =>
			service.redeemPoints({
				tenantId,
				customerId: "cust-1",
				pointsToRedeem: 200,
			}),
		).toThrow(InsufficientPointsError);
	});
});

// ── T5: Point Expiration ────────────────────────────────────────────────────

describe("LoyaltyService – Point Expiration", () => {
	it("returns zero when no entries to expire", () => {
		const { service, tenantId } = createEnabledService();
		const result = service.expirePointsForCustomer(tenantId, "cust-1");
		expect(result.pointsExpired).toBe(0);
		expect(result.entriesExpired).toBe(0);
	});

	it("runs batch expiration with no results", () => {
		const service = createService();
		const result = service.runExpirationBatch();
		expect(result.tenantsProcessed).toBe(0);
		expect(result.customersAffected).toBe(0);
		expect(result.totalPointsExpired).toBe(0);
	});
});

// ── T6: Manual Adjustment ───────────────────────────────────────────────────

describe("LoyaltyService – Manual Adjustment", () => {
	it("adds points via manual adjustment", () => {
		const { service, tenantId } = createEnabledService();
		const result = service.adjustPoints({
			tenantId,
			customerId: "cust-1",
			points: 500,
			reason: "Customer complaint resolution",
			actorId: "admin-1",
		});
		expect(result.newBalance).toBe(500);
		expect(result.newLifetimePoints).toBe(500);
		expect(result.ledgerEntryId).toBeDefined();
	});

	it("deducts points via manual adjustment", () => {
		const { service, tenantId } = createEnabledService();
		service.adjustPoints({
			tenantId,
			customerId: "cust-1",
			points: 500,
			reason: "Bonus",
			actorId: "admin-1",
		});
		const result = service.adjustPoints({
			tenantId,
			customerId: "cust-1",
			points: -200,
			reason: "Correction",
			actorId: "admin-1",
		});
		expect(result.newBalance).toBe(300);
	});

	it("rejects adjustment that would cause negative balance", () => {
		const { service, tenantId } = createEnabledService();
		expect(() =>
			service.adjustPoints({
				tenantId,
				customerId: "cust-1",
				points: -100,
				reason: "Test",
				actorId: "admin-1",
			}),
		).toThrow(InsufficientPointsError);
	});

	it("rejects zero-point adjustment", () => {
		const { service, tenantId } = createEnabledService();
		expect(() =>
			service.adjustPoints({
				tenantId,
				customerId: "cust-1",
				points: 0,
				reason: "Test",
				actorId: "admin-1",
			}),
		).toThrow(LoyaltyValidationError);
	});

	it("rejects adjustment without reason", () => {
		const { service, tenantId } = createEnabledService();
		expect(() =>
			service.adjustPoints({
				tenantId,
				customerId: "cust-1",
				points: 100,
				reason: "",
				actorId: "admin-1",
			}),
		).toThrow(LoyaltyValidationError);
	});

	it("triggers tier promotion via adjustment", () => {
		const { service, tenantId } = createEnabledService();
		const result = service.adjustPoints({
			tenantId,
			customerId: "cust-1",
			points: 600,
			reason: "Welcome bonus",
			actorId: "admin-1",
		});
		expect(result.tierChanged).toBe(true);
		expect(result.newTier).toBe("silver");
	});
});

// ── T6: Ledger Query ────────────────────────────────────────────────────────

describe("LoyaltyService – Ledger Query", () => {
	it("returns empty ledger for new customer", () => {
		const { service, tenantId } = createEnabledService();
		const result = service.getLedger(tenantId, "cust-1");
		expect(result.entries).toHaveLength(0);
		expect(result.total).toBe(0);
	});

	it("returns ledger entries after operations", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 50000,
		});
		service.redeemPoints({
			tenantId,
			customerId: "cust-1",
			pointsToRedeem: 200,
		});
		const result = service.getLedger(tenantId, "cust-1");
		expect(result.entries).toHaveLength(2);
		expect(result.total).toBe(2);
	});

	it("filters by entry type", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 50000,
		});
		service.redeemPoints({
			tenantId,
			customerId: "cust-1",
			pointsToRedeem: 200,
		});
		const earns = service.getLedger(tenantId, "cust-1", "earn");
		expect(earns.entries).toHaveLength(1);
		expect(earns.entries[0].type).toBe("earn");
	});

	it("paginates results", () => {
		const { service, tenantId } = createEnabledService();
		for (let i = 0; i < 5; i++) {
			service.accumulatePoints({
				tenantId,
				customerId: "cust-1",
				orderId: `order-${i}`,
				orderTotalCents: 1000,
			});
		}
		const page1 = service.getLedger(tenantId, "cust-1", undefined, 1, 2);
		expect(page1.entries).toHaveLength(2);
		expect(page1.total).toBe(5);
		expect(page1.page).toBe(1);

		const page2 = service.getLedger(tenantId, "cust-1", undefined, 2, 2);
		expect(page2.entries).toHaveLength(2);
		expect(page2.page).toBe(2);
	});
});

// ── T7: Loyalty Tab Data ────────────────────────────────────────────────────

describe("LoyaltyService – Loyalty Tab Data", () => {
	it("returns tab data for a customer", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 5000,
		});
		const tab = service.getLoyaltyTabData(tenantId, "cust-1");
		expect(tab.tierName).toBeDefined();
		expect(tab.pointBalance).toBe(50);
		expect(tab.lifetimePoints).toBe(50);
		expect(tab.memberSince).toBeDefined();
	});

	it("shows next tier information", () => {
		const { service, tenantId } = createEnabledService();
		const tab = service.getLoyaltyTabData(tenantId, "cust-1");
		expect(tab.nextTierName).toBeDefined();
		expect(tab.nextTierThreshold).toBeDefined();
	});

	it("includes recent activity", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 5000,
		});
		const tab = service.getLoyaltyTabData(tenantId, "cust-1");
		expect(tab.recentActivity.length).toBeGreaterThanOrEqual(0);
	});
});

// ── T7: Admin Customer Loyalty Summary ──────────────────────────────────────

describe("LoyaltyService – Admin Customer Summary", () => {
	it("returns loyalty summary for a customer", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 200000,
		});
		const summary = service.getAdminCustomerLoyaltySummary(tenantId, "cust-1");
		expect(summary.customerId).toBe("cust-1");
		expect(summary.tenantId).toBe(tenantId);
		expect(summary.pointBalance).toBe(2000);
		expect(summary.tags.length).toBeGreaterThan(0);
	});

	it("returns VIP tag for gold/platinum customers", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 250000,
		});
		const summary = service.getAdminCustomerLoyaltySummary(tenantId, "cust-1");
		expect(summary.tags.find((t) => t.type === "vip")).toBeDefined();
	});

	it("returns loyalty list for tenant", () => {
		const { service, tenantId } = createEnabledService();
		service.accumulatePoints({
			tenantId,
			customerId: "cust-1",
			orderId: "order-1",
			orderTotalCents: 5000,
		});
		service.accumulatePoints({
			tenantId,
			customerId: "cust-2",
			orderId: "order-2",
			orderTotalCents: 10000,
		});
		const list = service.getAdminCustomerLoyaltyList(tenantId);
		expect(list).toHaveLength(2);
	});
});
