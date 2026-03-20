// ─── Staff Domain Types ──────────────────────────────────────────────────

export const staffStatuses = ["active", "inactive"] as const;
export type StaffStatus = (typeof staffStatuses)[number];

export type StaffProfileRecord = {
	displayName: string;
	email?: string | null;
	id: string;
	isBookable: boolean;
	locationId?: string | null;
	phone?: string | null;
	photoUrl?: string | null;
	role?: string | null;
	status: StaffStatus;
	tenantId: string;
	userId?: string | null;
};

export type StaffScheduleWindowRecord = {
	dayOfWeek: number; // 0 = Sunday, 6 = Saturday
	endTime: string; // "HH:mm"
	id: string;
	staffId: string;
	startTime: string; // "HH:mm"
};

export type StaffBlackoutDateRecord = {
	date: string; // YYYY-MM-DD
	id: string;
	reason?: string | null;
	staffId: string;
};

export type StaffServiceAssignmentRecord = {
	id: string;
	serviceId: string;
	staffId: string;
};

// ─── Admin Query / Command Models ────────────────────────────────────────

export type StaffListFilter = {
	isBookable?: boolean;
	search?: string;
	serviceId?: string;
	status?: StaffStatus;
};

export type StaffScheduleInput = {
	dayOfWeek: number;
	endTime: string;
	startTime: string;
};

// ─── Conflict Detection ──────────────────────────────────────────────────

export type ScheduleConflict = {
	existingEnd: string;
	existingStart: string;
	newEnd: string;
	newStart: string;
	overlappingDay: number;
};

// ─── Storefront Read Models ──────────────────────────────────────────────

export type StorefrontStaffListing = {
	displayName: string;
	id: string;
	photoUrl?: string | null;
	role?: string | null;
	serviceIds: readonly string[];
};

// ─── Validation ──────────────────────────────────────────────────────────

export type StaffValidationError =
	| { field: "displayName"; reason: "empty" }
	| { field: "email"; reason: "invalid-format" }
	| { field: "dayOfWeek"; reason: "out-of-range" }
	| { field: "time"; reason: "invalid-format" }
	| { field: "time"; reason: "end-before-start" }
	| { field: "schedule"; reason: "overlap" };

export type StaffValidationResult =
	| { valid: true }
	| { valid: false; errors: readonly StaffValidationError[] };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStaffProfileInput(input: {
	displayName: string;
	email?: string | null;
}): StaffValidationResult {
	const errors: StaffValidationError[] = [];

	if (!input.displayName || input.displayName.trim().length === 0) {
		errors.push({ field: "displayName", reason: "empty" });
	}
	if (input.email != null && !EMAIL_PATTERN.test(input.email)) {
		errors.push({ field: "email", reason: "invalid-format" });
	}

	return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export function validateScheduleWindow(input: {
	dayOfWeek: number;
	endTime: string;
	startTime: string;
}): StaffValidationResult {
	const errors: StaffValidationError[] = [];

	if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
		errors.push({ field: "dayOfWeek", reason: "out-of-range" });
	}
	if (!TIME_PATTERN.test(input.startTime) || !TIME_PATTERN.test(input.endTime)) {
		errors.push({ field: "time", reason: "invalid-format" });
	} else if (input.startTime >= input.endTime) {
		errors.push({ field: "time", reason: "end-before-start" });
	}

	return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export function detectScheduleConflicts(
	existing: readonly { dayOfWeek: number; endTime: string; startTime: string }[],
	newWindow: { dayOfWeek: number; endTime: string; startTime: string },
): ScheduleConflict | null {
	for (const window of existing) {
		if (window.dayOfWeek !== newWindow.dayOfWeek) continue;
		if (newWindow.startTime < window.endTime && newWindow.endTime > window.startTime) {
			return {
				existingEnd: window.endTime,
				existingStart: window.startTime,
				newEnd: newWindow.endTime,
				newStart: newWindow.startTime,
				overlappingDay: window.dayOfWeek,
			};
		}
	}
	return null;
}
