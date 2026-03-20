// E5-S3-T1: Location CRUD types and validation for tenant-scoped business locations.
// Provides types for address, timezone, contact fields, and CRUD operation shapes.
// Downstream consumers: E5-S3-T2 hours config, E7-S2 order fulfillment location selection.

// ── Supported Timezones ──────────────────────────────────────────────────────

export const COMMON_TIMEZONES = [
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"America/Anchorage",
	"Pacific/Honolulu",
	"America/Phoenix",
	"America/Toronto",
	"America/Vancouver",
	"America/Edmonton",
	"America/Winnipeg",
	"America/Halifax",
	"America/St_Johns",
	"Europe/London",
	"Europe/Berlin",
	"Europe/Paris",
	"Europe/Madrid",
	"Europe/Rome",
	"Europe/Amsterdam",
	"Asia/Tokyo",
	"Asia/Shanghai",
	"Asia/Kolkata",
	"Asia/Dubai",
	"Australia/Sydney",
	"Australia/Melbourne",
	"Pacific/Auckland",
	"UTC"
] as const;

export type CommonTimezone = (typeof COMMON_TIMEZONES)[number];

export function isValidTimezone(tz: string): boolean {
	try {
		Intl.DateTimeFormat(undefined, { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

// ── Fulfillment Types ────────────────────────────────────────────────────────

export type LocationFulfillmentType =
	| "pickup"
	| "delivery"
	| "dine_in"
	| "shipping"
	| "onsite";

const ALL_FULFILLMENT_TYPES: readonly LocationFulfillmentType[] = [
	"pickup",
	"delivery",
	"dine_in",
	"shipping",
	"onsite"
];

export function isValidFulfillmentType(
	value: string
): value is LocationFulfillmentType {
	return (ALL_FULFILLMENT_TYPES as readonly string[]).includes(value);
}

// ── Location Data Types ──────────────────────────────────────────────────────

export type LocationAddress = {
	line1: string;
	line2: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
};

export type LocationContact = {
	phone: string;
	email: string;
};

export type LocationData = {
	id: string;
	tenantId: string;
	name: string;
	slug: string;
	address: LocationAddress;
	timezone: string;
	contact: LocationContact;
	supportsOrdering: boolean;
	supportsBookings: boolean;
	fulfillmentTypes: LocationFulfillmentType[];
	bookingLeadTimeMins: number | null;
	cancellationPolicy: string | null;
	createdAt: string;
	updatedAt: string;
};

// ── CRUD Payloads ────────────────────────────────────────────────────────────

export type CreateLocationPayload = {
	name: string;
	slug: string;
	address: LocationAddress;
	timezone: string;
	contact: LocationContact;
	supportsOrdering?: boolean;
	supportsBookings?: boolean;
	fulfillmentTypes?: LocationFulfillmentType[];
};

export type UpdateLocationPayload = {
	name?: string;
	slug?: string;
	address?: Partial<LocationAddress>;
	timezone?: string;
	contact?: Partial<LocationContact>;
	supportsOrdering?: boolean;
	supportsBookings?: boolean;
	fulfillmentTypes?: LocationFulfillmentType[];
};

// ── Validation ───────────────────────────────────────────────────────────────

export type LocationValidationError = {
	field: string;
	code:
		| "required"
		| "max-length"
		| "format"
		| "invalid-value"
		| "duplicate-slug";
	message: string;
};

const MAX_LENGTHS: Record<string, number> = {
	name: 200,
	slug: 100,
	"address.line1": 300,
	"address.line2": 300,
	"address.city": 200,
	"address.state": 200,
	"address.postalCode": 20,
	"address.country": 100,
	"contact.phone": 30,
	"contact.email": 254,
	cancellationPolicy: 2000
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreateLocationPayload(
	payload: CreateLocationPayload
): LocationValidationError[] {
	const errors: LocationValidationError[] = [];

	// Required fields
	if (!payload.name.trim()) {
		errors.push({
			field: "name",
			code: "required",
			message: "Location name is required."
		});
	}

	if (!payload.slug.trim()) {
		errors.push({
			field: "slug",
			code: "required",
			message: "Location slug is required."
		});
	} else if (!SLUG_PATTERN.test(payload.slug)) {
		errors.push({
			field: "slug",
			code: "format",
			message:
				"Slug must be lowercase alphanumeric with hyphens only."
		});
	}

	if (!payload.timezone.trim()) {
		errors.push({
			field: "timezone",
			code: "required",
			message: "Timezone is required."
		});
	} else if (!isValidTimezone(payload.timezone)) {
		errors.push({
			field: "timezone",
			code: "invalid-value",
			message: "Timezone is not recognized."
		});
	}

	if (!payload.address.line1.trim()) {
		errors.push({
			field: "address.line1",
			code: "required",
			message: "Address line 1 is required."
		});
	}

	if (!payload.address.city.trim()) {
		errors.push({
			field: "address.city",
			code: "required",
			message: "City is required."
		});
	}

	if (!payload.address.country.trim()) {
		errors.push({
			field: "address.country",
			code: "required",
			message: "Country is required."
		});
	}

	// Max length checks
	checkMaxLength(errors, "name", payload.name);
	checkMaxLength(errors, "slug", payload.slug);
	checkMaxLength(errors, "address.line1", payload.address.line1);
	checkMaxLength(errors, "address.line2", payload.address.line2);
	checkMaxLength(errors, "address.city", payload.address.city);
	checkMaxLength(errors, "address.state", payload.address.state);
	checkMaxLength(errors, "address.postalCode", payload.address.postalCode);
	checkMaxLength(errors, "address.country", payload.address.country);
	checkMaxLength(errors, "contact.phone", payload.contact.phone);
	checkMaxLength(errors, "contact.email", payload.contact.email);

	// Contact email format (optional, but if provided must be valid)
	if (
		payload.contact.email.trim() &&
		!EMAIL_PATTERN.test(payload.contact.email)
	) {
		errors.push({
			field: "contact.email",
			code: "format",
			message: "Contact email format is invalid."
		});
	}

	// Fulfillment types validation
	if (payload.fulfillmentTypes) {
		for (const ft of payload.fulfillmentTypes) {
			if (!isValidFulfillmentType(ft)) {
				errors.push({
					field: "fulfillmentTypes",
					code: "invalid-value",
					message: `Unknown fulfillment type: ${ft}`
				});
			}
		}
	}

	return errors;
}

export function validateUpdateLocationPayload(
	payload: UpdateLocationPayload
): LocationValidationError[] {
	const errors: LocationValidationError[] = [];

	if (payload.name !== undefined && !payload.name.trim()) {
		errors.push({
			field: "name",
			code: "required",
			message: "Location name cannot be empty."
		});
	}

	if (payload.slug !== undefined) {
		if (!payload.slug.trim()) {
			errors.push({
				field: "slug",
				code: "required",
				message: "Slug cannot be empty."
			});
		} else if (!SLUG_PATTERN.test(payload.slug)) {
			errors.push({
				field: "slug",
				code: "format",
				message:
					"Slug must be lowercase alphanumeric with hyphens only."
			});
		}
	}

	if (payload.timezone !== undefined) {
		if (!payload.timezone.trim()) {
			errors.push({
				field: "timezone",
				code: "required",
				message: "Timezone cannot be empty."
			});
		} else if (!isValidTimezone(payload.timezone)) {
			errors.push({
				field: "timezone",
				code: "invalid-value",
				message: "Timezone is not recognized."
			});
		}
	}

	// Max length checks for provided fields
	if (payload.name !== undefined) {
		checkMaxLength(errors, "name", payload.name);
	}
	if (payload.slug !== undefined) {
		checkMaxLength(errors, "slug", payload.slug);
	}
	if (payload.address) {
		if (payload.address.line1 !== undefined) {
			checkMaxLength(errors, "address.line1", payload.address.line1);
		}
		if (payload.address.line2 !== undefined) {
			checkMaxLength(errors, "address.line2", payload.address.line2);
		}
		if (payload.address.city !== undefined) {
			checkMaxLength(errors, "address.city", payload.address.city);
		}
		if (payload.address.state !== undefined) {
			checkMaxLength(errors, "address.state", payload.address.state);
		}
		if (payload.address.postalCode !== undefined) {
			checkMaxLength(
				errors,
				"address.postalCode",
				payload.address.postalCode
			);
		}
		if (payload.address.country !== undefined) {
			checkMaxLength(
				errors,
				"address.country",
				payload.address.country
			);
		}
	}
	if (payload.contact) {
		if (payload.contact.phone !== undefined) {
			checkMaxLength(errors, "contact.phone", payload.contact.phone);
		}
		if (payload.contact.email !== undefined) {
			checkMaxLength(errors, "contact.email", payload.contact.email);
			if (
				payload.contact.email.trim() &&
				!EMAIL_PATTERN.test(payload.contact.email)
			) {
				errors.push({
					field: "contact.email",
					code: "format",
					message: "Contact email format is invalid."
				});
			}
		}
	}

	if (payload.fulfillmentTypes) {
		for (const ft of payload.fulfillmentTypes) {
			if (!isValidFulfillmentType(ft)) {
				errors.push({
					field: "fulfillmentTypes",
					code: "invalid-value",
					message: `Unknown fulfillment type: ${ft}`
				});
			}
		}
	}

	return errors;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function checkMaxLength(
	errors: LocationValidationError[],
	field: string,
	value: string
): void {
	const max = MAX_LENGTHS[field];
	if (max !== undefined && value.length > max) {
		errors.push({
			field,
			code: "max-length",
			message: `${field} must be at most ${max} characters.`
		});
	}
}

// ── Multi-Location List ──────────────────────────────────────────────────────

export type LocationListItem = {
	id: string;
	name: string;
	slug: string;
	city: string;
	state: string;
	timezone: string;
	supportsOrdering: boolean;
	supportsBookings: boolean;
};

export function toLocationListItem(location: LocationData): LocationListItem {
	return {
		id: location.id,
		name: location.name,
		slug: location.slug,
		city: location.address.city,
		state: location.address.state,
		timezone: location.timezone,
		supportsOrdering: location.supportsOrdering,
		supportsBookings: location.supportsBookings
	};
}

export function createEmptyLocationAddress(): LocationAddress {
	return {
		line1: "",
		line2: "",
		city: "",
		state: "",
		postalCode: "",
		country: ""
	};
}

export function createEmptyLocationContact(): LocationContact {
	return { phone: "", email: "" };
}
