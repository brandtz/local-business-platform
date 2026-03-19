// E5-S3-T2: Operating hours, blackout windows, and fulfillment-mode configuration per location.
// Per-day open/close, timezone-aware, blackout date ranges, fulfillment mode toggles.
// Downstream consumers: E5-S3-T4 normalized operating rules, E7-S3 availability computation.

import type { LocationFulfillmentType } from "./location-management";

// ── Days of Week ─────────────────────────────────────────────────────────────

export type DayOfWeek =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday";

const ALL_DAYS: readonly DayOfWeek[] = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday"
];

export function getAllDays(): readonly DayOfWeek[] {
	return ALL_DAYS;
}

export function isValidDay(value: string): value is DayOfWeek {
	return (ALL_DAYS as readonly string[]).includes(value);
}

// ── Time Slot ────────────────────────────────────────────────────────────────

/** HH:MM in 24-hour format. */
export type TimeString = string;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeString(value: string): boolean {
	return TIME_PATTERN.test(value);
}

/**
 * Returns true if `open` is strictly before `close` (24-hour string comparison).
 * Does NOT support overnight spans (use two entries for that).
 */
export function isOpenBeforeClose(open: TimeString, close: TimeString): boolean {
	return open < close;
}

// ── Operating Hours ──────────────────────────────────────────────────────────

export type DayHoursEntry = {
	day: DayOfWeek;
	isClosed: boolean;
	openTime: TimeString | null;
	closeTime: TimeString | null;
};

export type LocationOperatingHours = {
	locationId: string;
	timezone: string;
	entries: DayHoursEntry[];
};

// ── Blackout Windows ─────────────────────────────────────────────────────────

export type BlackoutWindow = {
	id: string;
	locationId: string;
	label: string;
	startDate: string; // ISO date YYYY-MM-DD
	endDate: string; // ISO date YYYY-MM-DD
	reason: string;
};

// ── Fulfillment Mode Config ──────────────────────────────────────────────────

export type FulfillmentModeConfig = {
	locationId: string;
	enabledModes: LocationFulfillmentType[];
};

// ── Validation ───────────────────────────────────────────────────────────────

export type HoursValidationError = {
	field: string;
	code:
		| "required"
		| "invalid-time"
		| "invalid-day"
		| "open-after-close"
		| "missing-days"
		| "duplicate-day"
		| "invalid-date"
		| "end-before-start"
		| "overlap"
		| "no-modes";
	message: string;
};

export function validateOperatingHours(
	hours: LocationOperatingHours
): HoursValidationError[] {
	const errors: HoursValidationError[] = [];

	// Check for all 7 days present
	const daysPresent = new Set<DayOfWeek>();
	for (const entry of hours.entries) {
		if (!isValidDay(entry.day)) {
			errors.push({
				field: `entries.${entry.day}`,
				code: "invalid-day",
				message: `Invalid day: ${entry.day}`
			});
			continue;
		}

		if (daysPresent.has(entry.day)) {
			errors.push({
				field: `entries.${entry.day}`,
				code: "duplicate-day",
				message: `Duplicate entry for ${entry.day}`
			});
			continue;
		}
		daysPresent.add(entry.day);

		if (!entry.isClosed) {
			if (entry.openTime === null || entry.closeTime === null) {
				errors.push({
					field: `entries.${entry.day}`,
					code: "required",
					message: `Open and close times are required for ${entry.day}.`
				});
				continue;
			}

			if (!isValidTimeString(entry.openTime)) {
				errors.push({
					field: `entries.${entry.day}.openTime`,
					code: "invalid-time",
					message: `Invalid open time for ${entry.day}: ${entry.openTime}`
				});
			}

			if (!isValidTimeString(entry.closeTime)) {
				errors.push({
					field: `entries.${entry.day}.closeTime`,
					code: "invalid-time",
					message: `Invalid close time for ${entry.day}: ${entry.closeTime}`
				});
			}

			if (
				isValidTimeString(entry.openTime ?? "") &&
				isValidTimeString(entry.closeTime ?? "") &&
				entry.openTime !== null &&
				entry.closeTime !== null &&
				!isOpenBeforeClose(entry.openTime, entry.closeTime)
			) {
				errors.push({
					field: `entries.${entry.day}`,
					code: "open-after-close",
					message: `Open time must be before close time on ${entry.day}.`
				});
			}
		}
	}

	// Check that all 7 days are covered
	const missingDays = ALL_DAYS.filter((d) => !daysPresent.has(d));
	if (missingDays.length > 0) {
		errors.push({
			field: "entries",
			code: "missing-days",
			message: `Missing hours entries for: ${missingDays.join(", ")}`
		});
	}

	return errors;
}

// ── Blackout Validation ──────────────────────────────────────────────────────

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value: string): boolean {
	if (!DATE_PATTERN.test(value)) return false;
	const d = new Date(value + "T00:00:00Z");
	return !isNaN(d.getTime());
}

export function validateBlackoutWindow(
	window: Omit<BlackoutWindow, "id">
): HoursValidationError[] {
	const errors: HoursValidationError[] = [];

	if (!window.label.trim()) {
		errors.push({
			field: "label",
			code: "required",
			message: "Blackout label is required."
		});
	}

	if (!isValidDateString(window.startDate)) {
		errors.push({
			field: "startDate",
			code: "invalid-date",
			message: "Start date is not a valid YYYY-MM-DD date."
		});
	}

	if (!isValidDateString(window.endDate)) {
		errors.push({
			field: "endDate",
			code: "invalid-date",
			message: "End date is not a valid YYYY-MM-DD date."
		});
	}

	if (
		isValidDateString(window.startDate) &&
		isValidDateString(window.endDate) &&
		window.startDate > window.endDate
	) {
		errors.push({
			field: "endDate",
			code: "end-before-start",
			message: "End date must be on or after start date."
		});
	}

	return errors;
}

export function detectBlackoutOverlaps(
	windows: BlackoutWindow[]
): HoursValidationError[] {
	const errors: HoursValidationError[] = [];
	const sorted = [...windows].sort((a, b) =>
		a.startDate.localeCompare(b.startDate)
	);

	for (let i = 1; i < sorted.length; i++) {
		const prev = sorted[i - 1];
		const curr = sorted[i];
		if (curr.startDate <= prev.endDate) {
			errors.push({
				field: `blackouts.${curr.id}`,
				code: "overlap",
				message: `Blackout "${curr.label}" overlaps with "${prev.label}".`
			});
		}
	}

	return errors;
}

// ── Fulfillment Mode Validation ──────────────────────────────────────────────

export function validateFulfillmentModeConfig(
	config: FulfillmentModeConfig
): HoursValidationError[] {
	const errors: HoursValidationError[] = [];

	if (config.enabledModes.length === 0) {
		errors.push({
			field: "enabledModes",
			code: "no-modes",
			message: "At least one fulfillment mode must be enabled."
		});
	}

	return errors;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function createDefaultOperatingHours(
	locationId: string,
	timezone: string
): LocationOperatingHours {
	return {
		locationId,
		timezone,
		entries: ALL_DAYS.map((day) => ({
			day,
			isClosed: day === "sunday",
			openTime: day === "sunday" ? null : "09:00",
			closeTime: day === "sunday" ? null : "17:00"
		}))
	};
}

export function isLocationOpenOnDay(
	hours: LocationOperatingHours,
	day: DayOfWeek
): boolean {
	const entry = hours.entries.find((e) => e.day === day);
	return entry !== undefined && !entry.isClosed;
}

export function isDateInBlackout(
	dateStr: string,
	windows: BlackoutWindow[]
): boolean {
	return windows.some((w) => dateStr >= w.startDate && dateStr <= w.endDate);
}
