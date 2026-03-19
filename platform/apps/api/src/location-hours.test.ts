import { describe, expect, it } from "vitest";

import {
	createDefaultOperatingHours,
	detectBlackoutOverlaps,
	getAllDays,
	isDateInBlackout,
	isLocationOpenOnDay,
	isOpenBeforeClose,
	isValidDay,
	isValidTimeString,
	validateBlackoutWindow,
	validateFulfillmentModeConfig,
	validateOperatingHours,
	type BlackoutWindow,
	type DayHoursEntry,
	type DayOfWeek,
	type LocationOperatingHours
} from "./location-hours";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function fullWeekHours(locationId = "loc-1"): LocationOperatingHours {
	return {
		locationId,
		timezone: "America/Chicago",
		entries: getAllDays().map((day) => ({
			day,
			isClosed: false,
			openTime: "09:00",
			closeTime: "17:00"
		}))
	};
}

function closedEntry(day: DayOfWeek): DayHoursEntry {
	return { day, isClosed: true, openTime: null, closeTime: null };
}

// ── Time Helpers ─────────────────────────────────────────────────────────────

describe("isValidTimeString", () => {
	it("accepts valid HH:MM times", () => {
		expect(isValidTimeString("00:00")).toBe(true);
		expect(isValidTimeString("23:59")).toBe(true);
		expect(isValidTimeString("12:30")).toBe(true);
	});

	it("rejects invalid formats", () => {
		expect(isValidTimeString("24:00")).toBe(false);
		expect(isValidTimeString("9:00")).toBe(false);
		expect(isValidTimeString("noon")).toBe(false);
		expect(isValidTimeString("")).toBe(false);
	});
});

describe("isOpenBeforeClose", () => {
	it("returns true when open is before close", () => {
		expect(isOpenBeforeClose("08:00", "17:00")).toBe(true);
	});

	it("returns false when open equals close", () => {
		expect(isOpenBeforeClose("09:00", "09:00")).toBe(false);
	});

	it("returns false when open is after close", () => {
		expect(isOpenBeforeClose("18:00", "09:00")).toBe(false);
	});
});

describe("isValidDay", () => {
	it("accepts valid days", () => {
		expect(isValidDay("monday")).toBe(true);
		expect(isValidDay("sunday")).toBe(true);
	});

	it("rejects invalid days", () => {
		expect(isValidDay("funday")).toBe(false);
	});
});

// ── Operating Hours Validation ───────────────────────────────────────────────

describe("validateOperatingHours", () => {
	it("returns no errors for a valid full-week schedule", () => {
		expect(validateOperatingHours(fullWeekHours())).toEqual([]);
	});

	it("allows closed days with null times", () => {
		const hours = fullWeekHours();
		hours.entries[6] = closedEntry("sunday");
		expect(validateOperatingHours(hours)).toEqual([]);
	});

	it("detects missing days", () => {
		const hours = fullWeekHours();
		hours.entries = hours.entries.filter((e) => e.day !== "saturday");
		const errors = validateOperatingHours(hours);
		expect(errors.some((e) => e.code === "missing-days")).toBe(true);
	});

	it("detects duplicate days", () => {
		const hours = fullWeekHours();
		hours.entries.push({
			day: "monday",
			isClosed: false,
			openTime: "10:00",
			closeTime: "16:00"
		});
		const errors = validateOperatingHours(hours);
		expect(errors.some((e) => e.code === "duplicate-day")).toBe(true);
	});

	it("requires times for open days", () => {
		const hours = fullWeekHours();
		hours.entries[0] = {
			day: "monday",
			isClosed: false,
			openTime: null,
			closeTime: null
		};
		const errors = validateOperatingHours(hours);
		expect(errors.some((e) => e.code === "required")).toBe(true);
	});

	it("detects open after close", () => {
		const hours = fullWeekHours();
		hours.entries[0] = {
			day: "monday",
			isClosed: false,
			openTime: "18:00",
			closeTime: "09:00"
		};
		const errors = validateOperatingHours(hours);
		expect(errors.some((e) => e.code === "open-after-close")).toBe(true);
	});

	it("detects invalid time format", () => {
		const hours = fullWeekHours();
		hours.entries[0] = {
			day: "monday",
			isClosed: false,
			openTime: "9am",
			closeTime: "5pm"
		};
		const errors = validateOperatingHours(hours);
		expect(errors.some((e) => e.code === "invalid-time")).toBe(true);
	});
});

// ── Blackout Validation ──────────────────────────────────────────────────────

describe("validateBlackoutWindow", () => {
	it("returns no errors for a valid blackout", () => {
		const errors = validateBlackoutWindow({
			locationId: "loc-1",
			label: "Holiday closure",
			startDate: "2025-12-24",
			endDate: "2025-12-26",
			reason: "Christmas"
		});
		expect(errors).toEqual([]);
	});

	it("requires a label", () => {
		const errors = validateBlackoutWindow({
			locationId: "loc-1",
			label: "",
			startDate: "2025-12-24",
			endDate: "2025-12-26",
			reason: ""
		});
		expect(errors.some((e) => e.code === "required")).toBe(true);
	});

	it("detects invalid dates", () => {
		const errors = validateBlackoutWindow({
			locationId: "loc-1",
			label: "Test",
			startDate: "not-a-date",
			endDate: "2025-12-26",
			reason: ""
		});
		expect(errors.some((e) => e.code === "invalid-date")).toBe(true);
	});

	it("detects end before start", () => {
		const errors = validateBlackoutWindow({
			locationId: "loc-1",
			label: "Test",
			startDate: "2025-12-30",
			endDate: "2025-12-24",
			reason: ""
		});
		expect(errors.some((e) => e.code === "end-before-start")).toBe(true);
	});
});

describe("detectBlackoutOverlaps", () => {
	it("returns no errors for non-overlapping windows", () => {
		const windows: BlackoutWindow[] = [
			{
				id: "b1",
				locationId: "loc-1",
				label: "Holiday",
				startDate: "2025-12-24",
				endDate: "2025-12-26",
				reason: ""
			},
			{
				id: "b2",
				locationId: "loc-1",
				label: "New Year",
				startDate: "2025-12-31",
				endDate: "2026-01-01",
				reason: ""
			}
		];
		expect(detectBlackoutOverlaps(windows)).toEqual([]);
	});

	it("detects overlapping windows", () => {
		const windows: BlackoutWindow[] = [
			{
				id: "b1",
				locationId: "loc-1",
				label: "Holiday",
				startDate: "2025-12-24",
				endDate: "2025-12-28",
				reason: ""
			},
			{
				id: "b2",
				locationId: "loc-1",
				label: "Overlap",
				startDate: "2025-12-27",
				endDate: "2025-12-30",
				reason: ""
			}
		];
		const errors = detectBlackoutOverlaps(windows);
		expect(errors.some((e) => e.code === "overlap")).toBe(true);
	});
});

// ── Fulfillment Mode Validation ──────────────────────────────────────────────

describe("validateFulfillmentModeConfig", () => {
	it("returns no errors when at least one mode enabled", () => {
		const errors = validateFulfillmentModeConfig({
			locationId: "loc-1",
			enabledModes: ["pickup"]
		});
		expect(errors).toEqual([]);
	});

	it("requires at least one mode", () => {
		const errors = validateFulfillmentModeConfig({
			locationId: "loc-1",
			enabledModes: []
		});
		expect(errors.some((e) => e.code === "no-modes")).toBe(true);
	});
});

// ── Helper Functions ─────────────────────────────────────────────────────────

describe("createDefaultOperatingHours", () => {
	it("creates 7-day schedule with Sunday closed", () => {
		const hours = createDefaultOperatingHours("loc-1", "America/Chicago");
		expect(hours.entries).toHaveLength(7);
		expect(hours.timezone).toBe("America/Chicago");

		const sunday = hours.entries.find((e) => e.day === "sunday");
		expect(sunday?.isClosed).toBe(true);
		expect(sunday?.openTime).toBeNull();

		const monday = hours.entries.find((e) => e.day === "monday");
		expect(monday?.isClosed).toBe(false);
		expect(monday?.openTime).toBe("09:00");
	});
});

describe("isLocationOpenOnDay", () => {
	it("returns true for an open day", () => {
		const hours = fullWeekHours();
		expect(isLocationOpenOnDay(hours, "monday")).toBe(true);
	});

	it("returns false for a closed day", () => {
		const hours = fullWeekHours();
		hours.entries[6] = closedEntry("sunday");
		expect(isLocationOpenOnDay(hours, "sunday")).toBe(false);
	});
});

describe("isDateInBlackout", () => {
	const windows: BlackoutWindow[] = [
		{
			id: "b1",
			locationId: "loc-1",
			label: "Holiday",
			startDate: "2025-12-24",
			endDate: "2025-12-26",
			reason: ""
		}
	];

	it("returns true for a date within a blackout", () => {
		expect(isDateInBlackout("2025-12-25", windows)).toBe(true);
	});

	it("returns false for a date outside blackouts", () => {
		expect(isDateInBlackout("2025-12-30", windows)).toBe(false);
	});

	it("returns true for boundary dates", () => {
		expect(isDateInBlackout("2025-12-24", windows)).toBe(true);
		expect(isDateInBlackout("2025-12-26", windows)).toBe(true);
	});
});
