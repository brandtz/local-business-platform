// E5-S3-T3: Tax, tipping, cancellation, and lead-time policy configuration model.
// Per-location or tenant-wide policies for commerce and scheduling.
// Downstream consumers: E7-S1 cart pricing engine, E7-S2 order lifecycle.

// ── Tax Configuration ────────────────────────────────────────────────────────

export type TaxScope = "tenant" | "location";

export type TaxConfig = {
	scope: TaxScope;
	/** Percentage rate as a number, e.g. 8.25 for 8.25%. */
	rate: number;
	label: string;
	isIncludedInPrice: boolean;
};

// ── Tipping Configuration ────────────────────────────────────────────────────

export type TippingConfig = {
	enabled: boolean;
	presetPercentages: number[];
	allowCustomAmount: boolean;
	defaultPercentage: number | null;
};

// ── Cancellation Policy ──────────────────────────────────────────────────────

export type CancellationPenaltyType = "none" | "flat" | "percentage";

export type CancellationPolicy = {
	/** Minutes before the scheduled time in which cancellation is free. 0 = no free window. */
	freeWindowMinutes: number;
	penaltyType: CancellationPenaltyType;
	/** Flat fee (when penaltyType is "flat") or percentage (when "percentage"). */
	penaltyValue: number;
};

// ── Lead Time / Prep Time ────────────────────────────────────────────────────

export type LeadTimeConfig = {
	/** Minimum minutes required to prepare an order. */
	minPrepTimeMinutes: number;
	/** Minimum advance notice in minutes required before order placement. */
	advanceNoticeMinutes: number;
	/** Maximum number of days ahead an order/booking can be placed. null = unlimited. */
	maxAdvanceDays: number | null;
};

// ── Composite Policy ─────────────────────────────────────────────────────────

export type LocationPolicies = {
	locationId: string | null; // null = tenant-wide default
	tax: TaxConfig;
	tipping: TippingConfig;
	cancellation: CancellationPolicy;
	leadTime: LeadTimeConfig;
};

// ── Validation ───────────────────────────────────────────────────────────────

export type PolicyValidationError = {
	field: string;
	code:
		| "required"
		| "invalid-value"
		| "out-of-range"
		| "format";
	message: string;
};

export function validateTaxConfig(
	tax: TaxConfig
): PolicyValidationError[] {
	const errors: PolicyValidationError[] = [];

	if (tax.rate < 0) {
		errors.push({
			field: "tax.rate",
			code: "out-of-range",
			message: "Tax rate must be non-negative."
		});
	}
	if (tax.rate > 100) {
		errors.push({
			field: "tax.rate",
			code: "out-of-range",
			message: "Tax rate must not exceed 100%."
		});
	}

	if (!tax.label.trim()) {
		errors.push({
			field: "tax.label",
			code: "required",
			message: "Tax label is required."
		});
	}

	return errors;
}

export function validateTippingConfig(
	tipping: TippingConfig
): PolicyValidationError[] {
	const errors: PolicyValidationError[] = [];

	for (const pct of tipping.presetPercentages) {
		if (pct < 0 || pct > 100) {
			errors.push({
				field: "tipping.presetPercentages",
				code: "out-of-range",
				message: `Tipping preset ${pct}% is out of range (0-100).`
			});
		}
	}

	if (
		tipping.defaultPercentage !== null &&
		(tipping.defaultPercentage < 0 || tipping.defaultPercentage > 100)
	) {
		errors.push({
			field: "tipping.defaultPercentage",
			code: "out-of-range",
			message: "Default tipping percentage must be 0-100."
		});
	}

	return errors;
}

export function validateCancellationPolicy(
	policy: CancellationPolicy
): PolicyValidationError[] {
	const errors: PolicyValidationError[] = [];

	if (policy.freeWindowMinutes < 0) {
		errors.push({
			field: "cancellation.freeWindowMinutes",
			code: "out-of-range",
			message: "Free cancellation window must be non-negative."
		});
	}

	if (policy.penaltyType === "flat" && policy.penaltyValue < 0) {
		errors.push({
			field: "cancellation.penaltyValue",
			code: "out-of-range",
			message: "Flat cancellation penalty must be non-negative."
		});
	}

	if (policy.penaltyType === "percentage") {
		if (policy.penaltyValue < 0 || policy.penaltyValue > 100) {
			errors.push({
				field: "cancellation.penaltyValue",
				code: "out-of-range",
				message: "Percentage penalty must be 0-100."
			});
		}
	}

	return errors;
}

export function validateLeadTimeConfig(
	leadTime: LeadTimeConfig
): PolicyValidationError[] {
	const errors: PolicyValidationError[] = [];

	if (leadTime.minPrepTimeMinutes < 0) {
		errors.push({
			field: "leadTime.minPrepTimeMinutes",
			code: "out-of-range",
			message: "Minimum prep time must be non-negative."
		});
	}

	if (leadTime.advanceNoticeMinutes < 0) {
		errors.push({
			field: "leadTime.advanceNoticeMinutes",
			code: "out-of-range",
			message: "Advance notice must be non-negative."
		});
	}

	if (
		leadTime.maxAdvanceDays !== null &&
		leadTime.maxAdvanceDays < 1
	) {
		errors.push({
			field: "leadTime.maxAdvanceDays",
			code: "out-of-range",
			message: "Maximum advance days must be at least 1."
		});
	}

	return errors;
}

export function validateLocationPolicies(
	policies: LocationPolicies
): PolicyValidationError[] {
	return [
		...validateTaxConfig(policies.tax),
		...validateTippingConfig(policies.tipping),
		...validateCancellationPolicy(policies.cancellation),
		...validateLeadTimeConfig(policies.leadTime)
	];
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export function createDefaultTaxConfig(): TaxConfig {
	return {
		scope: "tenant",
		rate: 0,
		label: "Tax",
		isIncludedInPrice: false
	};
}

export function createDefaultTippingConfig(): TippingConfig {
	return {
		enabled: false,
		presetPercentages: [15, 18, 20],
		allowCustomAmount: true,
		defaultPercentage: null
	};
}

export function createDefaultCancellationPolicy(): CancellationPolicy {
	return {
		freeWindowMinutes: 60,
		penaltyType: "none",
		penaltyValue: 0
	};
}

export function createDefaultLeadTimeConfig(): LeadTimeConfig {
	return {
		minPrepTimeMinutes: 15,
		advanceNoticeMinutes: 0,
		maxAdvanceDays: null
	};
}

export function createDefaultLocationPolicies(
	locationId: string | null
): LocationPolicies {
	return {
		locationId,
		tax: createDefaultTaxConfig(),
		tipping: createDefaultTippingConfig(),
		cancellation: createDefaultCancellationPolicy(),
		leadTime: createDefaultLeadTimeConfig()
	};
}
