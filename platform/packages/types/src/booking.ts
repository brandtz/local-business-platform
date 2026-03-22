// ─── Booking Availability & Slot Types ───────────────────────────────────────
// E7-S3: Availability inputs, slot computation results, and API contracts.
// Consumes location hours, staff schedules, blackouts, and service durations.

// ─── Day of Week Mapping ─────────────────────────────────────────────────────
// Location hours use string names; staff schedules use numeric (0=Sunday).

const DAY_NAME_TO_NUMBER: Record<string, number> = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
};

const DAY_NUMBER_TO_NAME: Record<number, string> = {
	0: "sunday",
	1: "monday",
	2: "tuesday",
	3: "wednesday",
	4: "thursday",
	5: "friday",
	6: "saturday",
};

export function dayNameToNumber(name: string): number {
	const num = DAY_NAME_TO_NUMBER[name.toLowerCase()];
	if (num === undefined) throw new Error(`Invalid day name: ${name}`);
	return num;
}

export function dayNumberToName(num: number): string {
	const name = DAY_NUMBER_TO_NAME[num];
	if (name === undefined) throw new Error(`Invalid day number: ${num}`);
	return name;
}

// ─── Availability Input Types ────────────────────────────────────────────────
// Unified input contract consumed by slot computation (E7-S3-T2).

export type LocationHoursInput = {
	/** Day of week as number: 0 = Sunday, 6 = Saturday */
	dayOfWeek: number;
	/** Whether the location is closed on this day */
	isClosed: boolean;
	/** HH:mm open time, null if closed */
	openTime: string | null;
	/** HH:mm close time, null if closed */
	closeTime: string | null;
};

export type BookableStaffMember = {
	staffId: string;
	displayName: string;
	/** Weekly schedule windows for this staff member */
	scheduleWindows: readonly {
		dayOfWeek: number;
		startTime: string; // HH:mm
		endTime: string; // HH:mm
	}[];
	/** Blackout dates for this staff member (YYYY-MM-DD) */
	blackoutDates: readonly string[];
};

export type ExistingBooking = {
	id: string;
	staffId: string;
	serviceId: string;
	startTime: string; // ISO 8601
	endTime: string; // ISO 8601
};

export type AvailabilityInput = {
	tenantId: string;
	locationId: string;
	timezone: string;
	/** Service being booked */
	serviceId: string;
	serviceName: string;
	/** Duration of the service in minutes */
	durationMinutes: number;
	/** Buffer time between appointments in minutes */
	bufferMinutes: number;
	/** Minimum advance booking notice in hours */
	minAdvanceHours: number;
	/** Maximum advance booking window in days */
	maxAdvanceDays: number;
	/** Location operating hours per day of week */
	locationHours: readonly LocationHoursInput[];
	/** Location-level blackout windows (YYYY-MM-DD ranges) */
	locationBlackouts: readonly {
		startDate: string;
		endDate: string;
	}[];
	/** Bookable staff assigned to this service */
	staff: readonly BookableStaffMember[];
	/** Existing bookings that may conflict */
	existingBookings: readonly ExistingBooking[];
};

// ─── Slot Computation Result Types ───────────────────────────────────────────

export type ComputedSlot = {
	startTime: string; // ISO 8601
	endTime: string; // ISO 8601
	staffId: string;
	staffName: string;
	serviceId: string;
};

export type SlotComputationResult = {
	tenantId: string;
	locationId: string;
	serviceId: string;
	date: string; // YYYY-MM-DD
	slots: readonly ComputedSlot[];
};

// ─── Booking Slot Query Types ────────────────────────────────────────────────
// API query parameters for storefront and admin endpoints.

export type BookingSlotQuery = {
	tenantId: string;
	locationId: string;
	serviceId: string;
	/** Optional: filter to a specific staff member */
	staffId?: string;
	/** Start of date range (YYYY-MM-DD) */
	startDate: string;
	/** End of date range (YYYY-MM-DD) */
	endDate: string;
};

// ─── Storefront Response (no staff identity) ─────────────────────────────────

export type StorefrontBookingSlot = {
	startTime: string; // ISO 8601
	endTime: string; // ISO 8601
};

export type StorefrontBookingSlotsResponse = {
	serviceId: string;
	date: string;
	slots: readonly StorefrontBookingSlot[];
};

// ─── Admin Response (includes staff assignment) ──────────────────────────────

export type AdminBookingSlot = {
	startTime: string; // ISO 8601
	endTime: string; // ISO 8601
	staffId: string;
	staffName: string;
};

export type AdminBookingSlotsResponse = {
	serviceId: string;
	date: string;
	slots: readonly AdminBookingSlot[];
};

// ─── Slot Query Validation ───────────────────────────────────────────────────

export type BookingSlotValidationError =
	| { field: "serviceId"; reason: "required" }
	| { field: "locationId"; reason: "required" }
	| { field: "startDate"; reason: "required" }
	| { field: "startDate"; reason: "invalid-format" }
	| { field: "endDate"; reason: "required" }
	| { field: "endDate"; reason: "invalid-format" }
	| { field: "dateRange"; reason: "end-before-start" }
	| { field: "dateRange"; reason: "exceeds-max-range" }
	| { field: "staffId"; reason: "invalid-format" };

export type BookingSlotValidationResult =
	| { valid: true }
	| { valid: false; errors: readonly BookingSlotValidationError[] };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_QUERY_RANGE_DAYS = 31;

export function validateBookingSlotQuery(
	query: Partial<BookingSlotQuery>
): BookingSlotValidationResult {
	const errors: BookingSlotValidationError[] = [];

	if (!query.serviceId || query.serviceId.trim().length === 0) {
		errors.push({ field: "serviceId", reason: "required" });
	}
	if (!query.locationId || query.locationId.trim().length === 0) {
		errors.push({ field: "locationId", reason: "required" });
	}

	if (!query.startDate || query.startDate.trim().length === 0) {
		errors.push({ field: "startDate", reason: "required" });
	} else if (!DATE_PATTERN.test(query.startDate)) {
		errors.push({ field: "startDate", reason: "invalid-format" });
	}

	if (!query.endDate || query.endDate.trim().length === 0) {
		errors.push({ field: "endDate", reason: "required" });
	} else if (!DATE_PATTERN.test(query.endDate)) {
		errors.push({ field: "endDate", reason: "invalid-format" });
	}

	// Date range checks (only if both dates are valid)
	if (
		query.startDate && DATE_PATTERN.test(query.startDate) &&
		query.endDate && DATE_PATTERN.test(query.endDate)
	) {
		if (query.endDate < query.startDate) {
			errors.push({ field: "dateRange", reason: "end-before-start" });
		} else {
			const start = new Date(query.startDate + "T00:00:00Z");
			const end = new Date(query.endDate + "T00:00:00Z");
			const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
			if (diffDays > MAX_QUERY_RANGE_DAYS) {
				errors.push({ field: "dateRange", reason: "exceeds-max-range" });
			}
		}
	}

	if (query.staffId !== undefined && query.staffId.trim().length === 0) {
		errors.push({ field: "staffId", reason: "invalid-format" });
	}

	return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

// ─── Slot Cache Types ────────────────────────────────────────────────────────
// E7-S3-T4: Cache key structure and invalidation triggers.

export type SlotCacheKey = {
	tenantId: string;
	locationId: string;
	serviceId: string;
	date: string; // YYYY-MM-DD
	staffId?: string;
};

export type SlotCacheInvalidationTrigger =
	| "booking-created"
	| "booking-cancelled"
	| "schedule-changed"
	| "blackout-updated"
	| "hours-changed";

export function buildSlotCacheKey(key: SlotCacheKey): string {
	const parts = [
		"slots",
		key.tenantId,
		key.locationId,
		key.serviceId,
		key.date,
	];
	if (key.staffId) {
		parts.push(key.staffId);
	}
	return parts.join(":");
}
