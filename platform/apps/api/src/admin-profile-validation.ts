// E5-S2-T3: Backend validation rules for tenant profile and theme configuration.
// Rejects invalid or unsafe input; validation errors return structured payloads.
// Security: text fields are validated to reject HTML/script injection.

// ── Validation Error Types ───────────────────────────────────────────────────

export type ProfileFieldValidationError = {
	field: string;
	message: string;
	code: "required" | "max-length" | "format" | "injection" | "invalid-value";
};

export type ProfileValidationResult =
	| { valid: true }
	| { valid: false; errors: ProfileFieldValidationError[] };

// ── Injection Detection ──────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
	/<script[\s>]/i,
	/<\/script>/i,
	/javascript:/i,
	/on\w+\s*=/i,
	/<iframe[\s>]/i,
	/<object[\s>]/i,
	/<embed[\s>]/i
];

function containsInjection(value: string): boolean {
	return INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

// ── Format Validators ────────────────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s\-().]{7,20}$/;
const URL_PATTERN = /^https?:\/\/.+/;
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// ── Field Constraint Map ─────────────────────────────────────────────────────

type FieldConstraint = {
	required?: boolean;
	maxLength?: number;
	format?: "email" | "phone" | "url" | "hex-color";
};

const profileFieldConstraints: Record<string, FieldConstraint> = {
	businessName: { required: true, maxLength: 200 },
	businessDescription: { maxLength: 2000 },
	contactEmail: { required: true, maxLength: 254, format: "email" },
	contactPhone: { maxLength: 30, format: "phone" },
	addressLine1: { maxLength: 200 },
	addressLine2: { maxLength: 200 },
	city: { maxLength: 100 },
	stateOrProvince: { maxLength: 100 },
	postalCode: { maxLength: 20 },
	country: { maxLength: 100 },
	websiteUrl: { maxLength: 500, format: "url" }
};

const socialLinkFields = [
	"facebook",
	"instagram",
	"twitter",
	"linkedIn",
	"yelp"
];

const themeColorFields = ["brandPrimary", "brandPrimaryHover"];

// ── Profile Validation ───────────────────────────────────────────────────────

function validateTextField(
	fieldName: string,
	value: unknown,
	constraint: FieldConstraint
): ProfileFieldValidationError[] {
	const errors: ProfileFieldValidationError[] = [];

	if (typeof value !== "string") {
		if (constraint.required) {
			errors.push({
				field: fieldName,
				message: `${fieldName} is required.`,
				code: "required"
			});
		}

		return errors;
	}

	const trimmed = value.trim();

	if (constraint.required && !trimmed) {
		errors.push({
			field: fieldName,
			message: `${fieldName} is required.`,
			code: "required"
		});

		return errors;
	}

	if (containsInjection(value)) {
		errors.push({
			field: fieldName,
			message: `${fieldName} contains disallowed content.`,
			code: "injection"
		});

		return errors;
	}

	if (constraint.maxLength && value.length > constraint.maxLength) {
		errors.push({
			field: fieldName,
			message: `${fieldName} must be at most ${constraint.maxLength} characters.`,
			code: "max-length"
		});
	}

	if (trimmed && constraint.format) {
		let valid = true;

		switch (constraint.format) {
			case "email":
				valid = EMAIL_PATTERN.test(trimmed);
				break;
			case "phone":
				valid = PHONE_PATTERN.test(trimmed);
				break;
			case "url":
				valid = URL_PATTERN.test(trimmed);
				break;
			case "hex-color":
				valid = HEX_COLOR_PATTERN.test(trimmed);
				break;
		}

		if (!valid) {
			errors.push({
				field: fieldName,
				message: `${fieldName} has invalid format.`,
				code: "format"
			});
		}
	}

	return errors;
}

/**
 * Validates a tenant profile update payload from the API layer.
 * Covers required fields, max lengths, format validation, and injection detection.
 */
export function validateProfileUpdatePayload(
	payload: Record<string, unknown>
): ProfileValidationResult {
	const errors: ProfileFieldValidationError[] = [];

	// Profile fields
	for (const [field, constraint] of Object.entries(profileFieldConstraints)) {
		errors.push(...validateTextField(field, payload[field], constraint));
	}

	// Social links
	const socialLinks = payload.socialLinks;

	if (socialLinks && typeof socialLinks === "object" && socialLinks !== null) {
		for (const linkField of socialLinkFields) {
			const value = (socialLinks as Record<string, unknown>)[linkField];

			if (typeof value === "string" && value.trim()) {
				errors.push(
					...validateTextField(`socialLinks.${linkField}`, value, {
						maxLength: 500,
						format: "url"
					})
				);
			}
		}
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

/**
 * Validates tenant theme configuration from the API layer.
 */
export function validateThemeUpdatePayload(
	payload: Record<string, unknown>
): ProfileValidationResult {
	const errors: ProfileFieldValidationError[] = [];

	const colorOverrides = payload.colorOverrides;

	if (
		colorOverrides &&
		typeof colorOverrides === "object" &&
		colorOverrides !== null
	) {
		for (const field of themeColorFields) {
			const value = (colorOverrides as Record<string, unknown>)[field];

			if (typeof value === "string" && value.trim()) {
				errors.push(
					...validateTextField(field, value, { format: "hex-color" })
				);
			}
		}

		// Reject unknown color keys
		for (const key of Object.keys(
			colorOverrides as Record<string, unknown>
		)) {
			if (!themeColorFields.includes(key)) {
				errors.push({
					field: key,
					message: `${key} is not a valid theme color key.`,
					code: "invalid-value"
				});
			}
		}
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
