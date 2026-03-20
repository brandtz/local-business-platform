// ─── Service Domain Types ────────────────────────────────────────────────

export const serviceStatuses = ["active", "inactive"] as const;
export type ServiceStatus = (typeof serviceStatuses)[number];

export type ServiceRecord = {
	bufferMinutes: number;
	description?: string | null;
	durationMinutes: number;
	id: string;
	isBookable: boolean;
	maxAdvanceDays: number;
	minAdvanceHours: number;
	name: string;
	price: number;
	slug: string;
	sortOrder: number;
	status: ServiceStatus;
	tenantId: string;
};

// ─── Storefront Read Models ──────────────────────────────────────────────

export type StorefrontServiceListing = {
	description?: string | null;
	durationMinutes: number;
	id: string;
	name: string;
	price: number;
	slug: string;
};

export type ServiceAvailabilitySlot = {
	endTime: string; // ISO 8601
	staffId: string;
	staffName: string;
	startTime: string; // ISO 8601
};

export type ServiceAvailabilityQuery = {
	date: string; // YYYY-MM-DD
	serviceId: string;
	tenantId: string;
};

// ─── Admin Query Models ──────────────────────────────────────────────────

export type ServiceListFilter = {
	isBookable?: boolean;
	search?: string;
	status?: ServiceStatus;
};

// ─── Validation ──────────────────────────────────────────────────────────

export type ServiceValidationError =
	| { field: "name"; reason: "empty" }
	| { field: "slug"; reason: "invalid-format" }
	| { field: "slug"; reason: "duplicate" }
	| { field: "price"; reason: "negative" }
	| { field: "durationMinutes"; reason: "non-positive" }
	| { field: "bufferMinutes"; reason: "negative" }
	| { field: "maxAdvanceDays"; reason: "non-positive" }
	| { field: "minAdvanceHours"; reason: "negative" };

export type ServiceValidationResult =
	| { valid: true }
	| { valid: false; errors: readonly ServiceValidationError[] };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateServiceInput(input: {
	bufferMinutes: number;
	durationMinutes: number;
	maxAdvanceDays: number;
	minAdvanceHours: number;
	name: string;
	price: number;
	slug: string;
}): ServiceValidationResult {
	const errors: ServiceValidationError[] = [];

	if (!input.name || input.name.trim().length === 0) {
		errors.push({ field: "name", reason: "empty" });
	}
	if (!SLUG_PATTERN.test(input.slug)) {
		errors.push({ field: "slug", reason: "invalid-format" });
	}
	if (input.price < 0) {
		errors.push({ field: "price", reason: "negative" });
	}
	if (input.durationMinutes <= 0) {
		errors.push({ field: "durationMinutes", reason: "non-positive" });
	}
	if (input.bufferMinutes < 0) {
		errors.push({ field: "bufferMinutes", reason: "negative" });
	}
	if (input.maxAdvanceDays <= 0) {
		errors.push({ field: "maxAdvanceDays", reason: "non-positive" });
	}
	if (input.minAdvanceHours < 0) {
		errors.push({ field: "minAdvanceHours", reason: "negative" });
	}

	return errors.length === 0 ? { valid: true } : { valid: false, errors };
}
