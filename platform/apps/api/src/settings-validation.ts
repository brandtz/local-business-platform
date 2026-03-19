// E5-S5-T1: Centralized settings validation layer with cross-field consistency,
// module-aware validation, and go-live readiness checks.
// Validates that tenant settings are internally consistent and meet minimum
// requirements before a business can go live on the platform.

import type { TenantModuleKey } from "@platform/types";

// ── Validation Error Shape ───────────────────────────────────────────────────

export type SettingsValidationError = {
	/** Dot-path to the field, e.g. "profile.businessName" or "locations[0].hours" */
	fieldPath: string;
	code: SettingsValidationErrorCode;
	message: string;
	/** Which settings section this error belongs to. */
	section: SettingsSection;
};

export type SettingsValidationErrorCode =
	| "required"
	| "cross-field-conflict"
	| "module-requires"
	| "go-live-minimum"
	| "invalid-value"
	| "range-error"
	| "duplicate";

export type SettingsSection =
	| "profile"
	| "branding"
	| "locations"
	| "hours"
	| "policies"
	| "modules"
	| "fulfillment";

// ── Settings Snapshot (for validation) ───────────────────────────────────────

export type SettingsSnapshot = {
	profile: ProfileSettings;
	locations: LocationSettingsSummary[];
	modules: TenantModuleKey[];
	fulfillment: FulfillmentSettings;
};

export type ProfileSettings = {
	businessName: string;
	contactEmail: string;
	contactPhone: string;
	timezone: string;
};

export type LocationSettingsSummary = {
	locationId: string;
	name: string;
	hasAddress: boolean;
	hasTimezone: boolean;
	hasHours: boolean;
	fulfillmentModes: string[];
	isActive: boolean;
};

export type FulfillmentSettings = {
	enabledModes: FulfillmentMode[];
	deliveryConfig: DeliveryConfig | null;
};

export type FulfillmentMode = "pickup" | "delivery" | "dine-in" | "shipping";

export type DeliveryConfig = {
	maxRadiusMiles: number;
	minimumOrderCents: number;
	estimatedMinutes: number;
};

// ── Validation Result ────────────────────────────────────────────────────────

export type SettingsValidationResult = {
	valid: boolean;
	errors: SettingsValidationError[];
	goLiveReady: boolean;
	goLiveBlockers: SettingsValidationError[];
};

// ── Cross-Field Validators ───────────────────────────────────────────────────

function validateProfileSettings(
	profile: ProfileSettings
): SettingsValidationError[] {
	const errors: SettingsValidationError[] = [];

	if (!profile.businessName.trim()) {
		errors.push({
			fieldPath: "profile.businessName",
			code: "required",
			message: "Business name is required.",
			section: "profile"
		});
	}

	if (!profile.contactEmail.trim()) {
		errors.push({
			fieldPath: "profile.contactEmail",
			code: "required",
			message: "Contact email is required.",
			section: "profile"
		});
	}

	if (!profile.timezone.trim()) {
		errors.push({
			fieldPath: "profile.timezone",
			code: "required",
			message: "Timezone is required.",
			section: "profile"
		});
	}

	return errors;
}

function validateFulfillmentSettings(
	fulfillment: FulfillmentSettings
): SettingsValidationError[] {
	const errors: SettingsValidationError[] = [];

	// If delivery is enabled, delivery config must be present
	if (fulfillment.enabledModes.includes("delivery")) {
		if (!fulfillment.deliveryConfig) {
			errors.push({
				fieldPath: "fulfillment.deliveryConfig",
				code: "cross-field-conflict",
				message:
					"Delivery mode is enabled but delivery configuration is missing.",
				section: "fulfillment"
			});
		} else {
			if (fulfillment.deliveryConfig.maxRadiusMiles <= 0) {
				errors.push({
					fieldPath: "fulfillment.deliveryConfig.maxRadiusMiles",
					code: "range-error",
					message: "Delivery radius must be greater than zero.",
					section: "fulfillment"
				});
			}
			if (fulfillment.deliveryConfig.estimatedMinutes <= 0) {
				errors.push({
					fieldPath: "fulfillment.deliveryConfig.estimatedMinutes",
					code: "range-error",
					message: "Estimated delivery time must be greater than zero.",
					section: "fulfillment"
				});
			}
		}
	}

	// Check for duplicate modes
	const modeSet = new Set<string>();
	for (const mode of fulfillment.enabledModes) {
		if (modeSet.has(mode)) {
			errors.push({
				fieldPath: "fulfillment.enabledModes",
				code: "duplicate",
				message: `Duplicate fulfillment mode: ${mode}`,
				section: "fulfillment"
			});
		}
		modeSet.add(mode);
	}

	return errors;
}

function validateLocations(
	locations: LocationSettingsSummary[]
): SettingsValidationError[] {
	const errors: SettingsValidationError[] = [];

	for (let i = 0; i < locations.length; i++) {
		const loc = locations[i]!;
		if (!loc.name.trim()) {
			errors.push({
				fieldPath: `locations[${i}].name`,
				code: "required",
				message: `Location at index ${i} must have a name.`,
				section: "locations"
			});
		}
		if (loc.isActive && !loc.hasAddress) {
			errors.push({
				fieldPath: `locations[${i}].address`,
				code: "cross-field-conflict",
				message: `Active location "${loc.name}" requires an address.`,
				section: "locations"
			});
		}
		if (loc.isActive && !loc.hasTimezone) {
			errors.push({
				fieldPath: `locations[${i}].timezone`,
				code: "cross-field-conflict",
				message: `Active location "${loc.name}" requires a timezone.`,
				section: "locations"
			});
		}
	}

	// Check for duplicate names
	const names = locations.map((l) => l.name.trim().toLowerCase());
	const seen = new Set<string>();
	for (let i = 0; i < names.length; i++) {
		if (names[i] && seen.has(names[i]!)) {
			errors.push({
				fieldPath: `locations[${i}].name`,
				code: "duplicate",
				message: `Duplicate location name: "${locations[i]!.name}"`,
				section: "locations"
			});
		}
		if (names[i]) seen.add(names[i]!);
	}

	return errors;
}

// ── Module-Aware Validation ──────────────────────────────────────────────────

type ModuleRequirement = {
	module: TenantModuleKey;
	check: (snapshot: SettingsSnapshot) => SettingsValidationError[];
};

const moduleRequirements: ModuleRequirement[] = [
	{
		module: "ordering",
		check: (s) => {
			const errors: SettingsValidationError[] = [];
			if (s.fulfillment.enabledModes.length === 0) {
				errors.push({
					fieldPath: "fulfillment.enabledModes",
					code: "module-requires",
					message:
						"Ordering module requires at least one fulfillment mode.",
					section: "fulfillment"
				});
			}
			return errors;
		}
	},
	{
		module: "bookings",
		check: (s) => {
			const errors: SettingsValidationError[] = [];
			const activeWithHours = s.locations.filter(
				(l) => l.isActive && l.hasHours
			);
			if (activeWithHours.length === 0) {
				errors.push({
					fieldPath: "locations",
					code: "module-requires",
					message:
						"Bookings module requires at least one active location with hours.",
					section: "locations"
				});
			}
			return errors;
		}
	}
];

function validateModuleRequirements(
	snapshot: SettingsSnapshot
): SettingsValidationError[] {
	const errors: SettingsValidationError[] = [];
	for (const req of moduleRequirements) {
		if (snapshot.modules.includes(req.module)) {
			errors.push(...req.check(snapshot));
		}
	}
	return errors;
}

// ── Go-Live Readiness ────────────────────────────────────────────────────────

function computeGoLiveBlockers(
	snapshot: SettingsSnapshot
): SettingsValidationError[] {
	const blockers: SettingsValidationError[] = [];

	// Must have at least 1 active location
	const activeLocations = snapshot.locations.filter((l) => l.isActive);
	if (activeLocations.length === 0) {
		blockers.push({
			fieldPath: "locations",
			code: "go-live-minimum",
			message: "At least one active location is required to go live.",
			section: "locations"
		});
	}

	// Active locations must have hours configured
	for (const loc of activeLocations) {
		if (!loc.hasHours) {
			blockers.push({
				fieldPath: `locations.${loc.locationId}.hours`,
				code: "go-live-minimum",
				message: `Location "${loc.name}" must have operating hours configured.`,
				section: "hours"
			});
		}
	}

	// Need at least 1 fulfillment mode if ordering is enabled
	if (
		snapshot.modules.includes("ordering") &&
		snapshot.fulfillment.enabledModes.length === 0
	) {
		blockers.push({
			fieldPath: "fulfillment.enabledModes",
			code: "go-live-minimum",
			message:
				"At least one fulfillment mode must be configured to go live with ordering.",
			section: "fulfillment"
		});
	}

	// Profile must be complete
	if (!snapshot.profile.businessName.trim()) {
		blockers.push({
			fieldPath: "profile.businessName",
			code: "go-live-minimum",
			message: "Business name is required to go live.",
			section: "profile"
		});
	}

	if (!snapshot.profile.contactEmail.trim()) {
		blockers.push({
			fieldPath: "profile.contactEmail",
			code: "go-live-minimum",
			message: "Contact email is required to go live.",
			section: "profile"
		});
	}

	return blockers;
}

// ── Main Validation Entry Point ──────────────────────────────────────────────

export function validateSettings(
	snapshot: SettingsSnapshot
): SettingsValidationResult {
	const errors: SettingsValidationError[] = [
		...validateProfileSettings(snapshot.profile),
		...validateLocations(snapshot.locations),
		...validateFulfillmentSettings(snapshot.fulfillment),
		...validateModuleRequirements(snapshot)
	];

	const goLiveBlockers = computeGoLiveBlockers(snapshot);

	return {
		valid: errors.length === 0,
		errors,
		goLiveReady: errors.length === 0 && goLiveBlockers.length === 0,
		goLiveBlockers
	};
}

// ── Section-Specific Validation ──────────────────────────────────────────────

export function validateProfileSection(
	profile: ProfileSettings
): SettingsValidationError[] {
	return validateProfileSettings(profile);
}

export function validateLocationsSection(
	locations: LocationSettingsSummary[]
): SettingsValidationError[] {
	return validateLocations(locations);
}

export function validateFulfillmentSection(
	fulfillment: FulfillmentSettings
): SettingsValidationError[] {
	return validateFulfillmentSettings(fulfillment);
}

// ── Error Filtering ──────────────────────────────────────────────────────────

export function getErrorsForSection(
	errors: SettingsValidationError[],
	section: SettingsSection
): SettingsValidationError[] {
	return errors.filter((e) => e.section === section);
}

export function getErrorsForField(
	errors: SettingsValidationError[],
	fieldPath: string
): SettingsValidationError[] {
	return errors.filter((e) => e.fieldPath === fieldPath);
}

export function hasErrorsInSection(
	errors: SettingsValidationError[],
	section: SettingsSection
): boolean {
	return errors.some((e) => e.section === section);
}
