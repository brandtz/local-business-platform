// E5-S2-T1: Tenant profile forms — business identity and contact data with schema-backed validation.
// Profile data is tenant-scoped; forms only load/save the authenticated tenant's data.

// ── Profile Field Types ──────────────────────────────────────────────────────

export type TenantProfileData = {
	businessName: string;
	businessDescription: string;
	contactEmail: string;
	contactPhone: string;
	addressLine1: string;
	addressLine2: string;
	city: string;
	stateOrProvince: string;
	postalCode: string;
	country: string;
	websiteUrl: string;
	socialLinks: TenantSocialLinks;
};

export type TenantSocialLinks = {
	facebook: string;
	instagram: string;
	twitter: string;
	linkedIn: string;
	yelp: string;
};

// ── Validation ───────────────────────────────────────────────────────────────

export type ProfileValidationError = {
	field: keyof TenantProfileData | `socialLinks.${keyof TenantSocialLinks}`;
	message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s\-().]{7,20}$/;
const URL_PATTERN = /^https?:\/\/.+/;

const FIELD_MAX_LENGTHS: Partial<Record<keyof TenantProfileData, number>> = {
	businessName: 200,
	businessDescription: 2000,
	contactEmail: 254,
	contactPhone: 30,
	addressLine1: 200,
	addressLine2: 200,
	city: 100,
	stateOrProvince: 100,
	postalCode: 20,
	country: 100,
	websiteUrl: 500
};

const SOCIAL_LINK_MAX_LENGTH = 500;

/**
 * Validates a tenant profile data object. Returns an array of errors (empty = valid).
 */
export function validateTenantProfile(
	data: TenantProfileData
): ProfileValidationError[] {
	const errors: ProfileValidationError[] = [];

	// Required fields
	if (!data.businessName.trim()) {
		errors.push({ field: "businessName", message: "Business name is required." });
	}

	if (!data.contactEmail.trim()) {
		errors.push({ field: "contactEmail", message: "Contact email is required." });
	} else if (!EMAIL_PATTERN.test(data.contactEmail.trim())) {
		errors.push({ field: "contactEmail", message: "Contact email format is invalid." });
	}

	// Phone validation (optional but must be valid if provided)
	if (data.contactPhone.trim() && !PHONE_PATTERN.test(data.contactPhone.trim())) {
		errors.push({ field: "contactPhone", message: "Phone number format is invalid." });
	}

	// URL validation (optional but must be valid if provided)
	if (data.websiteUrl.trim() && !URL_PATTERN.test(data.websiteUrl.trim())) {
		errors.push({ field: "websiteUrl", message: "Website URL must start with http:// or https://." });
	}

	// Max length checks
	for (const [field, maxLen] of Object.entries(FIELD_MAX_LENGTHS)) {
		const value = data[field as keyof TenantProfileData];

		if (typeof value === "string" && value.length > maxLen) {
			errors.push({
				field: field as keyof TenantProfileData,
				message: `${field} must be at most ${maxLen} characters.`
			});
		}
	}

	// Social link validation
	for (const [key, value] of Object.entries(data.socialLinks)) {
		if (value.trim() && !URL_PATTERN.test(value.trim())) {
			errors.push({
				field: `socialLinks.${key}` as ProfileValidationError["field"],
				message: `${key} link must start with http:// or https://.`
			});
		}

		if (value.length > SOCIAL_LINK_MAX_LENGTH) {
			errors.push({
				field: `socialLinks.${key}` as ProfileValidationError["field"],
				message: `${key} link must be at most ${SOCIAL_LINK_MAX_LENGTH} characters.`
			});
		}
	}

	return errors;
}

// ── Empty Profile Factory ────────────────────────────────────────────────────

export function createEmptyTenantProfile(): TenantProfileData {
	return {
		businessName: "",
		businessDescription: "",
		contactEmail: "",
		contactPhone: "",
		addressLine1: "",
		addressLine2: "",
		city: "",
		stateOrProvince: "",
		postalCode: "",
		country: "",
		websiteUrl: "",
		socialLinks: {
			facebook: "",
			instagram: "",
			twitter: "",
			linkedIn: "",
			yelp: ""
		}
	};
}

// ── Profile Form State ───────────────────────────────────────────────────────

export type ProfileFormStatus = "idle" | "saving" | "saved" | "error";

export type ProfileFormState = {
	data: TenantProfileData;
	validationErrors: readonly ProfileValidationError[];
	status: ProfileFormStatus;
	apiError: string | null;
};

export function createInitialProfileFormState(
	data: TenantProfileData = createEmptyTenantProfile()
): ProfileFormState {
	return {
		data,
		validationErrors: [],
		status: "idle",
		apiError: null
	};
}

/**
 * Applies validation and returns updated form state.
 * Returns null if validation passes (caller can proceed to save).
 */
export function validateProfileFormState(
	state: ProfileFormState
): ProfileFormState {
	const errors = validateTenantProfile(state.data);

	return {
		...state,
		validationErrors: errors,
		status: errors.length > 0 ? "error" : state.status,
		apiError: null
	};
}
