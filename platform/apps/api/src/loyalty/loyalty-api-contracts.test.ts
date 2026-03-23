// E11-S2-T6: Loyalty API contract assertion tests

import { describe, expect, it } from "vitest";
import {
	assertCreateLoyaltyProgramInput,
	assertUpdateLoyaltyProgramInput,
	assertPointRedemptionInput,
	assertManualPointAdjustmentInput,
	assertPointLedgerQuery,
} from "./loyalty-api-contracts";

describe("assertCreateLoyaltyProgramInput", () => {
	it("accepts valid input", () => {
		expect(() =>
			assertCreateLoyaltyProgramInput({
				tenantId: "tenant-1",
				enabled: true,
				accumulationMode: "per_dollar",
			}),
		).not.toThrow();
	});

	it("rejects non-object input", () => {
		expect(() => assertCreateLoyaltyProgramInput("string")).toThrow();
	});

	it("rejects null input", () => {
		expect(() => assertCreateLoyaltyProgramInput(null)).toThrow();
	});

	it("rejects missing tenantId", () => {
		expect(() => assertCreateLoyaltyProgramInput({})).toThrow("tenantId");
	});

	it("rejects invalid accumulationMode", () => {
		expect(() =>
			assertCreateLoyaltyProgramInput({
				tenantId: "t-1",
				accumulationMode: "per_item",
			}),
		).toThrow("accumulationMode");
	});

	it("rejects invalid expirationPolicy", () => {
		expect(() =>
			assertCreateLoyaltyProgramInput({
				tenantId: "t-1",
				expirationPolicy: "monthly",
			}),
		).toThrow("expirationPolicy");
	});

	it("rejects negative pointsPerDollar", () => {
		expect(() =>
			assertCreateLoyaltyProgramInput({
				tenantId: "t-1",
				pointsPerDollar: -1,
			}),
		).toThrow("pointsPerDollar");
	});

	it("rejects zero pointRedemptionRate", () => {
		expect(() =>
			assertCreateLoyaltyProgramInput({
				tenantId: "t-1",
				pointRedemptionRate: 0,
			}),
		).toThrow("pointRedemptionRate");
	});

	it("rejects non-array tiers", () => {
		expect(() =>
			assertCreateLoyaltyProgramInput({
				tenantId: "t-1",
				tiers: "not-an-array",
			}),
		).toThrow("tiers");
	});
});

describe("assertUpdateLoyaltyProgramInput", () => {
	it("accepts valid update input", () => {
		expect(() =>
			assertUpdateLoyaltyProgramInput({ enabled: true }),
		).not.toThrow();
	});

	it("rejects non-object", () => {
		expect(() => assertUpdateLoyaltyProgramInput(null)).toThrow();
	});

	it("rejects invalid accumulationMode", () => {
		expect(() =>
			assertUpdateLoyaltyProgramInput({ accumulationMode: "bad" }),
		).toThrow("accumulationMode");
	});

	it("rejects negative pointsPerDollar", () => {
		expect(() =>
			assertUpdateLoyaltyProgramInput({ pointsPerDollar: -5 }),
		).toThrow("pointsPerDollar");
	});
});

describe("assertPointRedemptionInput", () => {
	it("accepts valid redemption input", () => {
		expect(() =>
			assertPointRedemptionInput({
				tenantId: "t-1",
				customerId: "c-1",
				pointsToRedeem: 100,
			}),
		).not.toThrow();
	});

	it("rejects missing tenantId", () => {
		expect(() =>
			assertPointRedemptionInput({ customerId: "c-1", pointsToRedeem: 100 }),
		).toThrow("tenantId");
	});

	it("rejects missing customerId", () => {
		expect(() =>
			assertPointRedemptionInput({ tenantId: "t-1", pointsToRedeem: 100 }),
		).toThrow("customerId");
	});

	it("rejects zero points", () => {
		expect(() =>
			assertPointRedemptionInput({
				tenantId: "t-1",
				customerId: "c-1",
				pointsToRedeem: 0,
			}),
		).toThrow("pointsToRedeem");
	});

	it("rejects negative points", () => {
		expect(() =>
			assertPointRedemptionInput({
				tenantId: "t-1",
				customerId: "c-1",
				pointsToRedeem: -50,
			}),
		).toThrow("pointsToRedeem");
	});
});

describe("assertManualPointAdjustmentInput", () => {
	it("accepts valid adjustment input", () => {
		expect(() =>
			assertManualPointAdjustmentInput({
				tenantId: "t-1",
				customerId: "c-1",
				points: 100,
				reason: "Customer complaint",
				actorId: "admin-1",
			}),
		).not.toThrow();
	});

	it("accepts negative points (deduction)", () => {
		expect(() =>
			assertManualPointAdjustmentInput({
				tenantId: "t-1",
				customerId: "c-1",
				points: -50,
				reason: "Correction",
				actorId: "admin-1",
			}),
		).not.toThrow();
	});

	it("rejects zero points", () => {
		expect(() =>
			assertManualPointAdjustmentInput({
				tenantId: "t-1",
				customerId: "c-1",
				points: 0,
				reason: "Test",
				actorId: "admin-1",
			}),
		).toThrow("points");
	});

	it("rejects empty reason", () => {
		expect(() =>
			assertManualPointAdjustmentInput({
				tenantId: "t-1",
				customerId: "c-1",
				points: 100,
				reason: "",
				actorId: "admin-1",
			}),
		).toThrow("reason");
	});

	it("rejects missing actorId", () => {
		expect(() =>
			assertManualPointAdjustmentInput({
				tenantId: "t-1",
				customerId: "c-1",
				points: 100,
				reason: "Test",
			}),
		).toThrow("actorId");
	});
});

describe("assertPointLedgerQuery", () => {
	it("accepts valid query", () => {
		expect(() =>
			assertPointLedgerQuery({
				tenantId: "t-1",
				customerId: "c-1",
			}),
		).not.toThrow();
	});

	it("accepts query with pagination", () => {
		expect(() =>
			assertPointLedgerQuery({
				tenantId: "t-1",
				customerId: "c-1",
				page: 1,
				pageSize: 20,
			}),
		).not.toThrow();
	});

	it("rejects missing tenantId", () => {
		expect(() => assertPointLedgerQuery({ customerId: "c-1" })).toThrow("tenantId");
	});

	it("rejects missing customerId", () => {
		expect(() => assertPointLedgerQuery({ tenantId: "t-1" })).toThrow("customerId");
	});

	it("rejects invalid page", () => {
		expect(() =>
			assertPointLedgerQuery({
				tenantId: "t-1",
				customerId: "c-1",
				page: 0,
			}),
		).toThrow("page");
	});

	it("rejects invalid pageSize", () => {
		expect(() =>
			assertPointLedgerQuery({
				tenantId: "t-1",
				customerId: "c-1",
				pageSize: 200,
			}),
		).toThrow("pageSize");
	});
});
