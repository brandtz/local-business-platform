import { describe, expect, it } from "vitest";

import {
	createDefaultCancellationPolicy,
	createDefaultLeadTimeConfig,
	createDefaultLocationPolicies,
	createDefaultTaxConfig,
	createDefaultTippingConfig,
	validateCancellationPolicy,
	validateLeadTimeConfig,
	validateLocationPolicies,
	validateTaxConfig,
	validateTippingConfig,
	type CancellationPolicy,
	type LeadTimeConfig,
	type TaxConfig,
	type TippingConfig
} from "./location-policies";

// ── Tax Validation ───────────────────────────────────────────────────────────

describe("validateTaxConfig", () => {
	it("accepts a valid tax config", () => {
		const tax: TaxConfig = {
			scope: "tenant",
			rate: 8.25,
			label: "Sales Tax",
			isIncludedInPrice: false
		};
		expect(validateTaxConfig(tax)).toEqual([]);
	});

	it("rejects negative rate", () => {
		const tax: TaxConfig = {
			scope: "location",
			rate: -1,
			label: "Tax",
			isIncludedInPrice: false
		};
		const errors = validateTaxConfig(tax);
		expect(
			errors.some(
				(e) => e.field === "tax.rate" && e.code === "out-of-range"
			)
		).toBe(true);
	});

	it("rejects rate above 100", () => {
		const tax: TaxConfig = {
			scope: "tenant",
			rate: 101,
			label: "Tax",
			isIncludedInPrice: false
		};
		const errors = validateTaxConfig(tax);
		expect(
			errors.some(
				(e) => e.field === "tax.rate" && e.code === "out-of-range"
			)
		).toBe(true);
	});

	it("requires label", () => {
		const tax: TaxConfig = {
			scope: "tenant",
			rate: 5,
			label: "  ",
			isIncludedInPrice: false
		};
		const errors = validateTaxConfig(tax);
		expect(
			errors.some(
				(e) => e.field === "tax.label" && e.code === "required"
			)
		).toBe(true);
	});

	it("accepts zero rate", () => {
		const tax: TaxConfig = {
			scope: "tenant",
			rate: 0,
			label: "No Tax",
			isIncludedInPrice: false
		};
		expect(validateTaxConfig(tax)).toEqual([]);
	});
});

// ── Tipping Validation ───────────────────────────────────────────────────────

describe("validateTippingConfig", () => {
	it("accepts valid tipping config", () => {
		const tipping: TippingConfig = {
			enabled: true,
			presetPercentages: [15, 18, 20],
			allowCustomAmount: true,
			defaultPercentage: 18
		};
		expect(validateTippingConfig(tipping)).toEqual([]);
	});

	it("rejects preset percentage out of range", () => {
		const tipping: TippingConfig = {
			enabled: true,
			presetPercentages: [15, -5, 150],
			allowCustomAmount: false,
			defaultPercentage: null
		};
		const errors = validateTippingConfig(tipping);
		expect(
			errors.filter(
				(e) => e.field === "tipping.presetPercentages"
			).length
		).toBe(2); // -5 and 150
	});

	it("rejects default percentage out of range", () => {
		const tipping: TippingConfig = {
			enabled: true,
			presetPercentages: [15],
			allowCustomAmount: true,
			defaultPercentage: -10
		};
		const errors = validateTippingConfig(tipping);
		expect(
			errors.some(
				(e) => e.field === "tipping.defaultPercentage"
			)
		).toBe(true);
	});

	it("allows null default percentage", () => {
		const tipping: TippingConfig = {
			enabled: true,
			presetPercentages: [15, 20],
			allowCustomAmount: true,
			defaultPercentage: null
		};
		expect(validateTippingConfig(tipping)).toEqual([]);
	});
});

// ── Cancellation Validation ──────────────────────────────────────────────────

describe("validateCancellationPolicy", () => {
	it("accepts a valid policy with no penalty", () => {
		const policy: CancellationPolicy = {
			freeWindowMinutes: 60,
			penaltyType: "none",
			penaltyValue: 0
		};
		expect(validateCancellationPolicy(policy)).toEqual([]);
	});

	it("rejects negative free window", () => {
		const policy: CancellationPolicy = {
			freeWindowMinutes: -30,
			penaltyType: "none",
			penaltyValue: 0
		};
		const errors = validateCancellationPolicy(policy);
		expect(
			errors.some(
				(e) =>
					e.field === "cancellation.freeWindowMinutes" &&
					e.code === "out-of-range"
			)
		).toBe(true);
	});

	it("rejects negative flat penalty", () => {
		const policy: CancellationPolicy = {
			freeWindowMinutes: 0,
			penaltyType: "flat",
			penaltyValue: -10
		};
		const errors = validateCancellationPolicy(policy);
		expect(
			errors.some(
				(e) => e.field === "cancellation.penaltyValue"
			)
		).toBe(true);
	});

	it("rejects percentage penalty out of range", () => {
		const policy: CancellationPolicy = {
			freeWindowMinutes: 0,
			penaltyType: "percentage",
			penaltyValue: 150
		};
		const errors = validateCancellationPolicy(policy);
		expect(
			errors.some(
				(e) => e.field === "cancellation.penaltyValue"
			)
		).toBe(true);
	});

	it("accepts valid flat penalty", () => {
		const policy: CancellationPolicy = {
			freeWindowMinutes: 30,
			penaltyType: "flat",
			penaltyValue: 25
		};
		expect(validateCancellationPolicy(policy)).toEqual([]);
	});
});

// ── Lead Time Validation ─────────────────────────────────────────────────────

describe("validateLeadTimeConfig", () => {
	it("accepts valid lead time config", () => {
		const lt: LeadTimeConfig = {
			minPrepTimeMinutes: 15,
			advanceNoticeMinutes: 30,
			maxAdvanceDays: 14
		};
		expect(validateLeadTimeConfig(lt)).toEqual([]);
	});

	it("rejects negative prep time", () => {
		const lt: LeadTimeConfig = {
			minPrepTimeMinutes: -5,
			advanceNoticeMinutes: 0,
			maxAdvanceDays: null
		};
		const errors = validateLeadTimeConfig(lt);
		expect(
			errors.some(
				(e) => e.field === "leadTime.minPrepTimeMinutes"
			)
		).toBe(true);
	});

	it("rejects negative advance notice", () => {
		const lt: LeadTimeConfig = {
			minPrepTimeMinutes: 0,
			advanceNoticeMinutes: -10,
			maxAdvanceDays: null
		};
		const errors = validateLeadTimeConfig(lt);
		expect(
			errors.some(
				(e) => e.field === "leadTime.advanceNoticeMinutes"
			)
		).toBe(true);
	});

	it("rejects zero maxAdvanceDays", () => {
		const lt: LeadTimeConfig = {
			minPrepTimeMinutes: 0,
			advanceNoticeMinutes: 0,
			maxAdvanceDays: 0
		};
		const errors = validateLeadTimeConfig(lt);
		expect(
			errors.some(
				(e) => e.field === "leadTime.maxAdvanceDays"
			)
		).toBe(true);
	});

	it("allows null maxAdvanceDays (unlimited)", () => {
		const lt: LeadTimeConfig = {
			minPrepTimeMinutes: 10,
			advanceNoticeMinutes: 0,
			maxAdvanceDays: null
		};
		expect(validateLeadTimeConfig(lt)).toEqual([]);
	});
});

// ── Composite Validation ─────────────────────────────────────────────────────

describe("validateLocationPolicies", () => {
	it("returns no errors for valid default policies", () => {
		const policies = createDefaultLocationPolicies(null);
		expect(validateLocationPolicies(policies)).toEqual([]);
	});

	it("aggregates errors from all sub-validators", () => {
		const policies = createDefaultLocationPolicies("loc-1");
		policies.tax.rate = -1;
		policies.tipping.defaultPercentage = 200;
		policies.cancellation.freeWindowMinutes = -5;
		policies.leadTime.minPrepTimeMinutes = -1;

		const errors = validateLocationPolicies(policies);
		expect(errors.length).toBeGreaterThanOrEqual(4);
	});
});

// ── Defaults ─────────────────────────────────────────────────────────────────

describe("defaults", () => {
	it("createDefaultTaxConfig returns zero-rate tenant-scoped tax", () => {
		const tax = createDefaultTaxConfig();
		expect(tax.rate).toBe(0);
		expect(tax.scope).toBe("tenant");
	});

	it("createDefaultTippingConfig is disabled with standard presets", () => {
		const tipping = createDefaultTippingConfig();
		expect(tipping.enabled).toBe(false);
		expect(tipping.presetPercentages).toEqual([15, 18, 20]);
	});

	it("createDefaultCancellationPolicy has 60-minute free window and no penalty", () => {
		const policy = createDefaultCancellationPolicy();
		expect(policy.freeWindowMinutes).toBe(60);
		expect(policy.penaltyType).toBe("none");
	});

	it("createDefaultLeadTimeConfig has 15-min prep and unlimited advance days", () => {
		const lt = createDefaultLeadTimeConfig();
		expect(lt.minPrepTimeMinutes).toBe(15);
		expect(lt.maxAdvanceDays).toBeNull();
	});
});
