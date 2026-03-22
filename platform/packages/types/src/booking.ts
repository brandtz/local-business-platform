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

// ─── Booking Lifecycle Types (E7-S4) ─────────────────────────────────────────
// Booking status state machine, domain records, and lifecycle management.

// ─── Booking Status Enum ─────────────────────────────────────────────────────

export const bookingStatuses = [
	"requested",
	"confirmed",
	"checked-in",
	"completed",
	"cancelled",
	"no-show",
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

/**
 * Valid transitions from each booking status.
 * requested → confirmed | cancelled
 * confirmed → checked-in | cancelled | no-show
 * checked-in → completed | no-show
 * completed, cancelled, no-show → (terminal)
 */
export const bookingStatusTransitions: Record<BookingStatus, readonly BookingStatus[]> = {
	requested: ["confirmed", "cancelled"],
	confirmed: ["checked-in", "cancelled", "no-show"],
	"checked-in": ["completed", "no-show"],
	completed: [],
	cancelled: [],
	"no-show": [],
};

export function isValidBookingTransition(from: BookingStatus, to: BookingStatus): boolean {
	return (bookingStatusTransitions[from] as readonly string[]).includes(to);
}

export function getNextBookingStatuses(status: BookingStatus): readonly BookingStatus[] {
	return bookingStatusTransitions[status];
}

export const terminalBookingStatuses: readonly BookingStatus[] = ["completed", "cancelled", "no-show"];

export function isTerminalBookingStatus(status: BookingStatus): boolean {
	return (terminalBookingStatuses as readonly string[]).includes(status);
}

export function isValidBookingStatus(status: string): status is BookingStatus {
	return (bookingStatuses as readonly string[]).includes(status);
}

/**
 * Statuses from which a booking can be cancelled.
 * Cancellation is allowed from requested and confirmed only.
 */
export const cancellableBookingStatuses: readonly BookingStatus[] = [
	"requested",
	"confirmed",
];

export function isBookingCancellable(status: BookingStatus): boolean {
	return (cancellableBookingStatuses as readonly string[]).includes(status);
}

// ─── Cancellation Policy ─────────────────────────────────────────────────────

export type CancellationPolicy = {
	/** Hours before the booking start time that free cancellation is allowed */
	freeWindowHours: number;
	/** Whether late cancellations (within the window) are allowed with penalty */
	allowLateCancellation: boolean;
	/** Optional penalty description for late cancellations */
	lateCancellationPenalty: string | null;
};

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
	freeWindowHours: 24,
	allowLateCancellation: true,
	lateCancellationPenalty: null,
};

export type CancellationWindowResult =
	| { allowed: true; isLate: false }
	| { allowed: true; isLate: true; penalty: string | null }
	| { allowed: false; reason: string };

/**
 * Checks whether cancellation is allowed based on the cancellation policy.
 * @param bookingStartTime ISO 8601 timestamp of the booking start
 * @param policy Cancellation policy rules
 * @param now Current time (injectable for testing)
 */
export function evaluateCancellationWindow(
	bookingStartTime: string,
	policy: CancellationPolicy,
	now: Date = new Date()
): CancellationWindowResult {
	const startMs = new Date(bookingStartTime).getTime();
	const nowMs = now.getTime();
	const hoursUntilStart = (startMs - nowMs) / (1000 * 60 * 60);

	if (hoursUntilStart <= 0) {
		return { allowed: false, reason: "Booking start time has already passed." };
	}

	if (hoursUntilStart >= policy.freeWindowHours) {
		return { allowed: true, isLate: false };
	}

	if (policy.allowLateCancellation) {
		return { allowed: true, isLate: true, penalty: policy.lateCancellationPenalty };
	}

	return {
		allowed: false,
		reason: `Cancellation must be at least ${policy.freeWindowHours} hours before the booking.`,
	};
}

// ─── Booking Domain Record ───────────────────────────────────────────────────

export type BookingRecord = {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	customerId: string | null;
	customerName: string | null;
	customerEmail: string | null;
	customerPhone: string | null;
	serviceId: string;
	serviceName: string;
	staffId: string;
	staffName: string;
	locationId: string;
	startTime: string; // ISO 8601
	endTime: string; // ISO 8601
	durationMinutes: number;
	status: BookingStatus;
	notes: string | null;
	cancellationReason: string | null;
	requestedAt: string | null;
	confirmedAt: string | null;
	checkedInAt: string | null;
	completedAt: string | null;
	cancelledAt: string | null;
	noShowAt: string | null;
};

// ─── Booking Creation Input ──────────────────────────────────────────────────

export type CreateBookingInput = {
	tenantId: string;
	locationId: string;
	customerId: string | null;
	customerName: string | null;
	customerEmail: string | null;
	customerPhone: string | null;
	serviceId: string;
	serviceName: string;
	staffId: string;
	staffName: string;
	startTime: string; // ISO 8601
	endTime: string; // ISO 8601
	durationMinutes: number;
	notes: string | null;
};

// ─── Admin Booking Response Types ────────────────────────────────────────────

export type AdminBookingSummary = {
	id: string;
	createdAt: string;
	status: BookingStatus;
	customerName: string | null;
	serviceName: string;
	staffName: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
};

export type AdminBookingDetail = {
	id: string;
	createdAt: string;
	updatedAt: string;
	status: BookingStatus;
	customerName: string | null;
	customerEmail: string | null;
	customerPhone: string | null;
	serviceId: string;
	serviceName: string;
	staffId: string;
	staffName: string;
	locationId: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	notes: string | null;
	cancellationReason: string | null;
	requestedAt: string | null;
	confirmedAt: string | null;
	checkedInAt: string | null;
	completedAt: string | null;
	cancelledAt: string | null;
	noShowAt: string | null;
	allowedTransitions: readonly BookingStatus[];
};

export type AdminBookingListQuery = {
	tenantId: string;
	status?: BookingStatus;
	staffId?: string;
	serviceId?: string;
	dateFrom?: string;
	dateTo?: string;
	search?: string;
	page?: number;
	pageSize?: number;
};

export type AdminBookingListResponse = {
	bookings: AdminBookingSummary[];
	total: number;
	page: number;
	pageSize: number;
};

// ─── Customer Booking Response Types ─────────────────────────────────────────

export type CustomerBookingSummary = {
	id: string;
	createdAt: string;
	status: BookingStatus;
	serviceName: string;
	staffName: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
};

export type CustomerBookingDetail = {
	id: string;
	createdAt: string;
	status: BookingStatus;
	serviceName: string;
	staffName: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	notes: string | null;
	cancelledAt: string | null;
};

// ─── Booking Tracking (E7-S4-T6) ────────────────────────────────────────────

export const bookingTrackingSteps = [
	"requested",
	"confirmed",
	"checked-in",
	"completed",
] as const;
export type BookingTrackingStep = (typeof bookingTrackingSteps)[number];

export type BookingTrackingStepState = "completed" | "current" | "upcoming" | "skipped";

export type BookingTrackingStepInfo = {
	step: BookingTrackingStep;
	label: string;
	state: BookingTrackingStepState;
	timestamp: string | null;
};

export type BookingTrackingData = {
	bookingId: string;
	status: BookingStatus;
	isCancelled: boolean;
	isNoShow: boolean;
	steps: BookingTrackingStepInfo[];
	currentStepIndex: number;
	serviceName: string;
	staffName: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
};

const bookingStepLabels: Record<BookingTrackingStep, string> = {
	requested: "Requested",
	confirmed: "Confirmed",
	"checked-in": "Checked In",
	completed: "Completed",
};

/**
 * Maps a booking status to tracking step states for progress bar rendering.
 */
export function computeBookingTrackingSteps(
	status: BookingStatus,
	timestamps: {
		requestedAt: string | null;
		confirmedAt: string | null;
		checkedInAt: string | null;
		completedAt: string | null;
	}
): BookingTrackingStepInfo[] {
	const stepTimestamps: Record<BookingTrackingStep, string | null> = {
		requested: timestamps.requestedAt,
		confirmed: timestamps.confirmedAt,
		"checked-in": timestamps.checkedInAt,
		completed: timestamps.completedAt,
	};

	const isCancelled = status === "cancelled";
	const isNoShow = status === "no-show";
	const statusIndex = (isCancelled || isNoShow)
		? -1
		: bookingTrackingSteps.indexOf(status as BookingTrackingStep);

	return bookingTrackingSteps.map((step, index) => {
		let state: BookingTrackingStepState;

		if (isCancelled || isNoShow) {
			state = stepTimestamps[step] ? "completed" : "skipped";
		} else if (index < statusIndex) {
			state = "completed";
		} else if (index === statusIndex) {
			state = "current";
		} else {
			state = "upcoming";
		}

		return {
			step,
			label: bookingStepLabels[step],
			state,
			timestamp: stepTimestamps[step],
		};
	});
}

export function getCurrentBookingTrackingStepIndex(status: BookingStatus): number {
	if (status === "cancelled" || status === "no-show") return -1;
	return bookingTrackingSteps.indexOf(status as BookingTrackingStep);
}

// ─── Booking Quick Actions (Admin) ───────────────────────────────────────────

export type BookingQuickAction = {
	targetStatus: BookingStatus;
	label: string;
	confirmationMessage: string;
};

export function getBookingQuickActions(status: BookingStatus): BookingQuickAction[] {
	const actions: BookingQuickAction[] = [];
	const transitions = bookingStatusTransitions[status];

	for (const target of transitions) {
		if (target === "cancelled") continue; // cancel is a separate action
		actions.push(getBookingQuickActionForTransition(target));
	}

	return actions;
}

function getBookingQuickActionForTransition(target: BookingStatus): BookingQuickAction {
	switch (target) {
		case "confirmed":
			return {
				targetStatus: "confirmed",
				label: "Confirm Booking",
				confirmationMessage: "Confirm this booking and notify the customer?",
			};
		case "checked-in":
			return {
				targetStatus: "checked-in",
				label: "Check In",
				confirmationMessage: "Check in this customer?",
			};
		case "completed":
			return {
				targetStatus: "completed",
				label: "Complete",
				confirmationMessage: "Mark this booking as completed?",
			};
		case "no-show":
			return {
				targetStatus: "no-show",
				label: "Mark No-Show",
				confirmationMessage: "Mark this booking as no-show? This cannot be undone.",
			};
		default:
			return {
				targetStatus: target,
				label: target,
				confirmationMessage: `Transition booking to ${target}?`,
			};
	}
}

// ─── Calendar View Types (E7-S4-T4) ─────────────────────────────────────────

export type CalendarBookingBlock = {
	bookingId: string;
	status: BookingStatus;
	customerName: string | null;
	serviceName: string;
	staffId: string;
	staffName: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
};

export type CalendarViewQuery = {
	tenantId: string;
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	staffId?: string;
	serviceId?: string;
};

export type CalendarDayData = {
	date: string; // YYYY-MM-DD
	blocks: CalendarBookingBlock[];
};

export type CalendarViewResponse = {
	days: CalendarDayData[];
	query: CalendarViewQuery;
};

// ─── Booking Status Count Aggregation ────────────────────────────────────────

export type BookingStatusCount = {
	status: BookingStatus;
	count: number;
};

export type BookingPipelineCounts = {
	counts: BookingStatusCount[];
	total: number;
};
