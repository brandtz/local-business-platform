import { describe, expect, it } from "vitest";

import {
	buildNormalizedOperatingRules,
	getBlackoutsInRange,
	getScheduleForDay,
	isDateBlackedOut,
	isEffectivelyOpen,
	isRulesContractComplete,
	type OperatingRulesInput
} from "./operating-rules";
import { getAllDays, type BlackoutWindow, type DayHoursEntry } from "./location-hours";
import { createDefaultLocationPolicies } from "./location-policies";
import type { LocationFulfillmentType } from "./location-management";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function weekdaySchedule(): DayHoursEntry[] {
	return getAllDays().map((day) => ({
		day,
		isClosed: day === "sunday",
		openTime: day === "sunday" ? null : "09:00",
		closeTime: day === "sunday" ? null : "17:00"
	}));
}

function testBlackouts(): BlackoutWindow[] {
	return [
		{
			id: "b1",
			locationId: "loc-1",
			label: "Christmas",
			startDate: "2025-12-24",
			endDate: "2025-12-26",
			reason: "Holiday"
		},
		{
			id: "b2",
			locationId: "loc-1",
			label: "New Year",
			startDate: "2025-12-31",
			endDate: "2026-01-01",
			reason: "Holiday"
		}
	];
}

function testFulfillmentModes(): LocationFulfillmentType[] {
	return ["pickup", "dine_in"];
}

function fullInput(): OperatingRulesInput {
	return {
		locationId: "loc-1",
		tenantId: "tenant-1",
		hours: {
			locationId: "loc-1",
			timezone: "America/Chicago",
			entries: weekdaySchedule()
		},
		blackouts: testBlackouts(),
		fulfillmentModes: testFulfillmentModes(),
		policies: createDefaultLocationPolicies("loc-1")
	};
}

// ── Aggregation ──────────────────────────────────────────────────────────────

describe("buildNormalizedOperatingRules", () => {
	it("combines hours, blackouts, fulfillment, and policies into a single contract", () => {
		const rules = buildNormalizedOperatingRules(fullInput());

		expect(rules.locationId).toBe("loc-1");
		expect(rules.tenantId).toBe("tenant-1");
		expect(rules.timezone).toBe("America/Chicago");
		expect(rules.schedule).toHaveLength(7);
		expect(rules.blackouts).toHaveLength(2);
		expect(rules.fulfillmentModes).toEqual(["pickup", "dine_in"]);
		expect(rules.tax.rate).toBe(0);
		expect(rules.tipping.presetPercentages).toEqual([15, 18, 20]);
		expect(rules.cancellation.penaltyType).toBe("none");
		expect(rules.leadTime.minPrepTimeMinutes).toBe(15);
	});

	it("normalizes schedule entries correctly", () => {
		const rules = buildNormalizedOperatingRules(fullInput());

		const monday = rules.schedule.find((s) => s.day === "monday");
		expect(monday?.isOpen).toBe(true);
		expect(monday?.openTime).toBe("09:00");
		expect(monday?.closeTime).toBe("17:00");

		const sunday = rules.schedule.find((s) => s.day === "sunday");
		expect(sunday?.isOpen).toBe(false);
		expect(sunday?.openTime).toBeNull();
	});

	it("sorts blackouts by start date", () => {
		const input = fullInput();
		// Reverse blackouts input to verify sorting
		input.blackouts = [input.blackouts[1], input.blackouts[0]];
		const rules = buildNormalizedOperatingRules(input);

		expect(rules.blackouts[0].startDate).toBe("2025-12-24");
		expect(rules.blackouts[1].startDate).toBe("2025-12-31");
	});

	it("deep copies policies to prevent mutation", () => {
		const input = fullInput();
		const rules = buildNormalizedOperatingRules(input);

		// Mutate original policies
		input.policies.tax.rate = 99;
		input.policies.tipping.presetPercentages.push(50);
		input.fulfillmentModes.push("delivery");

		expect(rules.tax.rate).toBe(0);
		expect(rules.tipping.presetPercentages).toEqual([15, 18, 20]);
		expect(rules.fulfillmentModes).toEqual(["pickup", "dine_in"]);
	});
});

// ── Multi-Location ───────────────────────────────────────────────────────────

describe("multi-location rules", () => {
	it("produces independent rules for different locations", () => {
		const input1 = fullInput();
		const input2 = {
			...fullInput(),
			locationId: "loc-2",
			fulfillmentModes: ["delivery" as const]
		};
		input2.hours.locationId = "loc-2";

		const rules1 = buildNormalizedOperatingRules(input1);
		const rules2 = buildNormalizedOperatingRules(input2);

		expect(rules1.locationId).toBe("loc-1");
		expect(rules2.locationId).toBe("loc-2");
		expect(rules1.fulfillmentModes).toEqual(["pickup", "dine_in"]);
		expect(rules2.fulfillmentModes).toEqual(["delivery"]);
	});
});

// ── Schedule Queries ─────────────────────────────────────────────────────────

describe("getScheduleForDay", () => {
	it("returns schedule for a specific day", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		const friday = getScheduleForDay(rules, "friday");
		expect(friday?.isOpen).toBe(true);
		expect(friday?.openTime).toBe("09:00");
	});

	it("returns undefined for a missing day", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		// Remove schedule entries to force missing
		rules.schedule = [];
		expect(getScheduleForDay(rules, "monday")).toBeUndefined();
	});
});

// ── Blackout Queries ─────────────────────────────────────────────────────────

describe("isDateBlackedOut", () => {
	it("returns true for a date within a blackout", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		expect(isDateBlackedOut(rules, "2025-12-25")).toBe(true);
	});

	it("returns false for a date outside blackouts", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		expect(isDateBlackedOut(rules, "2025-12-20")).toBe(false);
	});
});

describe("isEffectivelyOpen", () => {
	it("returns true for an open day outside blackouts", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		// A Monday in December that isn't blacked out
		expect(isEffectivelyOpen(rules, "monday", "2025-12-15")).toBe(true);
	});

	it("returns false for a blacked-out date even if day is open", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		// Christmas Day - Wednesday, which is normally open but blacked out
		expect(isEffectivelyOpen(rules, "wednesday", "2025-12-25")).toBe(false);
	});

	it("returns false for a closed day outside blackouts", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		expect(isEffectivelyOpen(rules, "sunday", "2025-12-14")).toBe(false);
	});
});

describe("getBlackoutsInRange", () => {
	it("returns blackouts that overlap a date range", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		const inRange = getBlackoutsInRange(rules, "2025-12-20", "2025-12-28");
		expect(inRange).toHaveLength(1);
		expect(inRange[0].label).toBe("Christmas");
	});

	it("returns all blackouts for a wide range", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		const inRange = getBlackoutsInRange(rules, "2025-01-01", "2026-12-31");
		expect(inRange).toHaveLength(2);
	});

	it("returns empty for a range with no blackouts", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		const inRange = getBlackoutsInRange(rules, "2025-06-01", "2025-06-30");
		expect(inRange).toEqual([]);
	});
});

// ── Contract Completeness ────────────────────────────────────────────────────

describe("isRulesContractComplete", () => {
	it("returns true for a complete contract", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		expect(isRulesContractComplete(rules)).toBe(true);
	});

	it("returns false when schedule is incomplete", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		rules.schedule = rules.schedule.slice(0, 5);
		expect(isRulesContractComplete(rules)).toBe(false);
	});

	it("returns false when no fulfillment modes", () => {
		const rules = buildNormalizedOperatingRules(fullInput());
		rules.fulfillmentModes = [];
		expect(isRulesContractComplete(rules)).toBe(false);
	});
});
