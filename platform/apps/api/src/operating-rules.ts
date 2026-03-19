// E5-S3-T4: Normalized operating rules — aggregates location hours, blackouts,
// fulfillment modes, and policies into a single queryable contract for downstream
// ordering, booking, and storefront services.
// Downstream consumers: E7-S1 cart pricing, E7-S2 order fulfillment, E7-S3 availability.

import type { LocationFulfillmentType } from "./location-management";
import type {
	BlackoutWindow,
	DayHoursEntry,
	DayOfWeek,
	LocationOperatingHours
} from "./location-hours";
import type {
	CancellationPolicy,
	LeadTimeConfig,
	LocationPolicies,
	TaxConfig,
	TippingConfig
} from "./location-policies";

// ── Normalized Types ─────────────────────────────────────────────────────────

export type NormalizedDaySchedule = {
	day: DayOfWeek;
	isOpen: boolean;
	openTime: string | null;
	closeTime: string | null;
};

export type NormalizedBlackout = {
	id: string;
	label: string;
	startDate: string;
	endDate: string;
};

export type NormalizedOperatingRules = {
	locationId: string;
	tenantId: string;
	timezone: string;
	schedule: NormalizedDaySchedule[];
	blackouts: NormalizedBlackout[];
	fulfillmentModes: LocationFulfillmentType[];
	tax: TaxConfig;
	tipping: TippingConfig;
	cancellation: CancellationPolicy;
	leadTime: LeadTimeConfig;
};

// ── Input Types (from stored data) ───────────────────────────────────────────

export type OperatingRulesInput = {
	locationId: string;
	tenantId: string;
	hours: LocationOperatingHours;
	blackouts: BlackoutWindow[];
	fulfillmentModes: LocationFulfillmentType[];
	policies: LocationPolicies;
};

// ── Aggregation ──────────────────────────────────────────────────────────────

function normalizeDayEntry(entry: DayHoursEntry): NormalizedDaySchedule {
	return {
		day: entry.day,
		isOpen: !entry.isClosed,
		openTime: entry.isClosed ? null : entry.openTime,
		closeTime: entry.isClosed ? null : entry.closeTime
	};
}

function normalizeBlackout(window: BlackoutWindow): NormalizedBlackout {
	return {
		id: window.id,
		label: window.label,
		startDate: window.startDate,
		endDate: window.endDate
	};
}

/**
 * Aggregates all location configuration into a single normalized operating rules
 * contract consumable by ordering, booking, and storefront services.
 */
export function buildNormalizedOperatingRules(
	input: OperatingRulesInput
): NormalizedOperatingRules {
	return {
		locationId: input.locationId,
		tenantId: input.tenantId,
		timezone: input.hours.timezone,
		schedule: input.hours.entries.map(normalizeDayEntry),
		blackouts: input.blackouts
			.slice()
			.sort((a, b) => a.startDate.localeCompare(b.startDate))
			.map(normalizeBlackout),
		fulfillmentModes: [...input.fulfillmentModes],
		tax: { ...input.policies.tax },
		tipping: {
			...input.policies.tipping,
			presetPercentages: [...input.policies.tipping.presetPercentages]
		},
		cancellation: { ...input.policies.cancellation },
		leadTime: { ...input.policies.leadTime }
	};
}

// ── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the schedule for a specific day from the normalized operating rules.
 */
export function getScheduleForDay(
	rules: NormalizedOperatingRules,
	day: DayOfWeek
): NormalizedDaySchedule | undefined {
	return rules.schedule.find((s) => s.day === day);
}

/**
 * Checks whether a given ISO date (YYYY-MM-DD) falls within any blackout window.
 */
export function isDateBlackedOut(
	rules: NormalizedOperatingRules,
	dateStr: string
): boolean {
	return rules.blackouts.some(
		(b) => dateStr >= b.startDate && dateStr <= b.endDate
	);
}

/**
 * Returns true if the location is effectively open on a given day AND the date
 * is not within a blackout window.
 */
export function isEffectivelyOpen(
	rules: NormalizedOperatingRules,
	day: DayOfWeek,
	dateStr: string
): boolean {
	if (isDateBlackedOut(rules, dateStr)) {
		return false;
	}
	const schedule = getScheduleForDay(rules, day);
	return schedule !== undefined && schedule.isOpen;
}

/**
 * Returns blackout windows that overlap with a given date range.
 */
export function getBlackoutsInRange(
	rules: NormalizedOperatingRules,
	startDate: string,
	endDate: string
): NormalizedBlackout[] {
	return rules.blackouts.filter(
		(b) => b.startDate <= endDate && b.endDate >= startDate
	);
}

/**
 * Validates that the normalized rules contract is structurally complete.
 */
export function isRulesContractComplete(
	rules: NormalizedOperatingRules
): boolean {
	return (
		rules.schedule.length === 7 &&
		rules.fulfillmentModes.length > 0 &&
		rules.timezone.length > 0
	);
}
