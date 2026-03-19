// E5-S4-T2: Staff member management — non-login operational profiles.
// CRUD for staff members with name, title, location assignments, contact info.
// Staff are distinct from authenticated tenant users (no login capability).
// Downstream: E5-S4-T3 admin UI, E8 booking/scheduling.

// ── Staff Member Types ───────────────────────────────────────────────────────

export type StaffMemberData = {
	id: string;
	tenantId: string;
	displayName: string;
	jobTitle: string;
	email: string;
	phone: string;
	locationIds: string[];
	isBookable: boolean;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type CreateStaffPayload = {
	tenantId: string;
	displayName: string;
	jobTitle: string;
	email: string;
	phone: string;
	locationIds: string[];
	isBookable: boolean;
};

export type UpdateStaffPayload = {
	displayName?: string;
	jobTitle?: string;
	email?: string;
	phone?: string;
	locationIds?: string[];
	isBookable?: boolean;
	isActive?: boolean;
};

// ── Staff List View ──────────────────────────────────────────────────────────

export type StaffListItem = {
	id: string;
	displayName: string;
	jobTitle: string;
	locationIds: string[];
	isBookable: boolean;
	isActive: boolean;
};

export function toStaffListItem(staff: StaffMemberData): StaffListItem {
	return {
		id: staff.id,
		displayName: staff.displayName,
		jobTitle: staff.jobTitle,
		locationIds: [...staff.locationIds],
		isBookable: staff.isBookable,
		isActive: staff.isActive
	};
}

// ── Validation ───────────────────────────────────────────────────────────────

export type StaffValidationError = {
	field: string;
	code: "required" | "max-length" | "format" | "invalid-location";
	message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_LENGTHS: Record<string, number> = {
	displayName: 200,
	jobTitle: 200,
	email: 254,
	phone: 30
};

export function validateCreateStaff(
	payload: CreateStaffPayload
): StaffValidationError[] {
	const errors: StaffValidationError[] = [];

	if (!payload.displayName.trim()) {
		errors.push({
			field: "displayName",
			code: "required",
			message: "Display name is required."
		});
	}

	if (!payload.jobTitle.trim()) {
		errors.push({
			field: "jobTitle",
			code: "required",
			message: "Job title is required."
		});
	}

	// Max-length checks
	for (const [field, max] of Object.entries(MAX_LENGTHS)) {
		const value = payload[field as keyof typeof payload];
		if (typeof value === "string" && value.length > max) {
			errors.push({
				field,
				code: "max-length",
				message: `${field} must be at most ${max} characters.`
			});
		}
	}

	// Email format (optional but must be valid if provided)
	if (payload.email.trim() && !EMAIL_PATTERN.test(payload.email)) {
		errors.push({
			field: "email",
			code: "format",
			message: "Email format is invalid."
		});
	}

	return errors;
}

export function validateUpdateStaff(
	payload: UpdateStaffPayload
): StaffValidationError[] {
	const errors: StaffValidationError[] = [];

	if (payload.displayName !== undefined && !payload.displayName.trim()) {
		errors.push({
			field: "displayName",
			code: "required",
			message: "Display name cannot be empty."
		});
	}

	if (payload.jobTitle !== undefined && !payload.jobTitle.trim()) {
		errors.push({
			field: "jobTitle",
			code: "required",
			message: "Job title cannot be empty."
		});
	}

	// Max-length checks for provided fields
	for (const [field, max] of Object.entries(MAX_LENGTHS)) {
		const value = payload[field as keyof typeof payload];
		if (typeof value === "string" && value.length > max) {
			errors.push({
				field,
				code: "max-length",
				message: `${field} must be at most ${max} characters.`
			});
		}
	}

	if (
		payload.email !== undefined &&
		payload.email.trim() &&
		!EMAIL_PATTERN.test(payload.email)
	) {
		errors.push({
			field: "email",
			code: "format",
			message: "Email format is invalid."
		});
	}

	return errors;
}

// ── Location Assignment Validation ───────────────────────────────────────────

/**
 * Validates that all assigned location IDs belong to the same tenant.
 * tenantLocationIds is the set of valid location IDs for the tenant.
 */
export function validateLocationAssignments(
	assignedLocationIds: string[],
	tenantLocationIds: string[]
): StaffValidationError[] {
	const errors: StaffValidationError[] = [];
	const validSet = new Set(tenantLocationIds);

	for (const locId of assignedLocationIds) {
		if (!validSet.has(locId)) {
			errors.push({
				field: "locationIds",
				code: "invalid-location",
				message: `Location ${locId} does not belong to this tenant.`
			});
		}
	}

	return errors;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function createEmptyStaffPayload(tenantId: string): CreateStaffPayload {
	return {
		tenantId,
		displayName: "",
		jobTitle: "",
		email: "",
		phone: "",
		locationIds: [],
		isBookable: true
	};
}

/**
 * Filters a list of staff members to only those assigned to a given location.
 */
export function filterStaffByLocation(
	staff: StaffMemberData[],
	locationId: string
): StaffMemberData[] {
	return staff.filter((s) => s.locationIds.includes(locationId));
}

/**
 * Returns bookable staff members that are active.
 */
export function getBookableStaff(
	staff: StaffMemberData[]
): StaffMemberData[] {
	return staff.filter((s) => s.isBookable && s.isActive);
}
