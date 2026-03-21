// ---------------------------------------------------------------------------
// Vertical Template types (E6-S5)
// ---------------------------------------------------------------------------

export const businessVerticals = [
	"restaurant",
	"retail",
	"appointment",
	"contractor",
] as const;

export type BusinessVertical = (typeof businessVerticals)[number];

// ---------------------------------------------------------------------------
// Module feature flags per vertical
// ---------------------------------------------------------------------------

export type VerticalModuleConfig = {
	bookings: boolean;
	cart: boolean;
	catalog: boolean;
	content: boolean;
	inquiryForm: boolean;
	loyalty: boolean;
	portfolio: boolean;
	quotes: boolean;
	services: boolean;
};

// ---------------------------------------------------------------------------
// Theme defaults
// ---------------------------------------------------------------------------

export type VerticalThemeDefaults = {
	brandPreset: string;
	navigationPreset: string;
	themePreset: string;
};

// ---------------------------------------------------------------------------
// Starter service seed
// ---------------------------------------------------------------------------

export type StarterServiceSeed = {
	durationMinutes: number;
	isBookable: boolean;
	name: string;
	price: number; // cents
	slug: string;
};

// ---------------------------------------------------------------------------
// Inquiry form configuration (E6-S5-T4)
// ---------------------------------------------------------------------------

export type InquiryFormFieldConfig = {
	label: string;
	name: string;
	required: boolean;
	type: "email" | "phone" | "select" | "text" | "textarea";
};

export type InquiryFormConfig = {
	enabled: boolean;
	fields: readonly InquiryFormFieldConfig[];
	heading: string;
	submitLabel: string;
};

// ---------------------------------------------------------------------------
// Full vertical template config
// ---------------------------------------------------------------------------

export type VerticalTemplateConfig = {
	defaultBusinessHours: readonly WeeklyHoursEntry[];
	description: string;
	inquiryForm: InquiryFormConfig;
	modules: VerticalModuleConfig;
	starterCategories: readonly string[];
	starterContentPages: readonly string[];
	starterServices: readonly StarterServiceSeed[];
	theme: VerticalThemeDefaults;
	vertical: BusinessVertical;
};

export type WeeklyHoursEntry = {
	closeTime: string; // "HH:mm"
	dayOfWeek: number; // 0=Sunday … 6=Saturday
	openTime: string; // "HH:mm"
};

// ---------------------------------------------------------------------------
// Inquiry / Lead model (contractor vertical)
// ---------------------------------------------------------------------------

export type InquiryLeadRecord = {
	createdAt: string;
	email: string;
	id: string;
	message?: string | null;
	name: string;
	phone?: string | null;
	serviceInterest?: string | null;
	tenantId: string;
};

export type CreateInquiryLeadRequest = {
	email: string;
	message?: string | null;
	name: string;
	phone?: string | null;
	serviceInterest?: string | null;
};

// ---------------------------------------------------------------------------
// Predefined vertical configurations
// ---------------------------------------------------------------------------

const defaultWeekdayHours: readonly WeeklyHoursEntry[] = [
	{ dayOfWeek: 1, openTime: "09:00", closeTime: "17:00" },
	{ dayOfWeek: 2, openTime: "09:00", closeTime: "17:00" },
	{ dayOfWeek: 3, openTime: "09:00", closeTime: "17:00" },
	{ dayOfWeek: 4, openTime: "09:00", closeTime: "17:00" },
	{ dayOfWeek: 5, openTime: "09:00", closeTime: "17:00" },
];

const restaurantHours: readonly WeeklyHoursEntry[] = [
	{ dayOfWeek: 1, openTime: "11:00", closeTime: "22:00" },
	{ dayOfWeek: 2, openTime: "11:00", closeTime: "22:00" },
	{ dayOfWeek: 3, openTime: "11:00", closeTime: "22:00" },
	{ dayOfWeek: 4, openTime: "11:00", closeTime: "22:00" },
	{ dayOfWeek: 5, openTime: "11:00", closeTime: "23:00" },
	{ dayOfWeek: 6, openTime: "11:00", closeTime: "23:00" },
	{ dayOfWeek: 0, openTime: "12:00", closeTime: "21:00" },
];

const disabledInquiryForm: InquiryFormConfig = {
	enabled: false,
	heading: "",
	submitLabel: "",
	fields: [],
};

const contractorInquiryForm: InquiryFormConfig = {
	enabled: true,
	heading: "Request a Free Estimate",
	submitLabel: "Submit Inquiry",
	fields: [
		{ name: "name", label: "Full Name", type: "text", required: true },
		{ name: "email", label: "Email Address", type: "email", required: true },
		{ name: "phone", label: "Phone Number", type: "phone", required: false },
		{ name: "serviceInterest", label: "Service Needed", type: "select", required: false },
		{ name: "message", label: "Project Details", type: "textarea", required: false },
	],
};

export const verticalConfigs: Record<BusinessVertical, VerticalTemplateConfig> =
	{
		appointment: {
			vertical: "appointment",
			description: "Salon, spa, and appointment-based service businesses",
			modules: {
				bookings: true,
				cart: false,
				catalog: false,
				content: true,
				inquiryForm: false,
				loyalty: true,
				portfolio: false,
				quotes: false,
				services: true,
			},
			theme: {
				themePreset: "starter-clean",
				brandPreset: "starter-services",
				navigationPreset: "services-default",
			},
			inquiryForm: disabledInquiryForm,
			starterCategories: ["Haircuts", "Color Services", "Treatments"],
			starterServices: [
				{ name: "Haircut", slug: "haircut", durationMinutes: 30, price: 3500, isBookable: true },
				{ name: "Color Treatment", slug: "color-treatment", durationMinutes: 90, price: 12000, isBookable: true },
				{ name: "Deep Conditioning", slug: "deep-conditioning", durationMinutes: 45, price: 5000, isBookable: true },
			],
			starterContentPages: ["about", "services"],
			defaultBusinessHours: defaultWeekdayHours,
		},
		contractor: {
			vertical: "contractor",
			description:
				"Roofing, gutters, general contracting, and home services",
			modules: {
				bookings: true,
				cart: false,
				catalog: false,
				content: true,
				inquiryForm: true,
				loyalty: false,
				portfolio: true,
				quotes: true,
				services: true,
			},
			theme: {
				themePreset: "starter-professional",
				brandPreset: "starter-contractor",
				navigationPreset: "contractor-default",
			},
			inquiryForm: contractorInquiryForm,
			starterCategories: [
				"Roofing",
				"Gutters",
				"General Contracting",
			],
			starterServices: [
				{ name: "Free Consultation", slug: "free-consultation", durationMinutes: 60, price: 0, isBookable: true },
				{ name: "Roof Inspection", slug: "roof-inspection", durationMinutes: 90, price: 15000, isBookable: true },
				{ name: "Gutter Cleaning", slug: "gutter-cleaning", durationMinutes: 120, price: 20000, isBookable: true },
			],
			starterContentPages: ["about", "services", "gallery"],
			defaultBusinessHours: defaultWeekdayHours,
		},
		restaurant: {
			vertical: "restaurant",
			description: "Restaurants, cafes, food trucks, and catering",
			modules: {
				bookings: false,
				cart: true,
				catalog: true,
				content: true,
				inquiryForm: false,
				loyalty: true,
				portfolio: false,
				quotes: false,
				services: false,
			},
			theme: {
				themePreset: "starter-warm",
				brandPreset: "starter-restaurant",
				navigationPreset: "restaurant-default",
			},
			inquiryForm: disabledInquiryForm,
			starterCategories: [
				"Appetizers",
				"Entrees",
				"Desserts",
				"Beverages",
			],
			starterServices: [],
			starterContentPages: ["about", "menu"],
			defaultBusinessHours: restaurantHours,
		},
		retail: {
			vertical: "retail",
			description: "Retail shops, boutiques, and e-commerce stores",
			modules: {
				bookings: false,
				cart: true,
				catalog: true,
				content: true,
				inquiryForm: false,
				loyalty: true,
				portfolio: false,
				quotes: false,
				services: false,
			},
			theme: {
				themePreset: "starter-modern",
				brandPreset: "starter-retail",
				navigationPreset: "retail-default",
			},
			inquiryForm: disabledInquiryForm,
			starterCategories: [
				"New Arrivals",
				"Sale",
				"Featured",
			],
			starterServices: [],
			starterContentPages: ["about", "shipping-returns"],
			defaultBusinessHours: defaultWeekdayHours,
		},
	};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type VerticalValidationError =
	| { field: "email"; reason: "invalid" }
	| { field: "name"; reason: "empty" }
	| { field: "vertical"; reason: "unsupported" };

export type VerticalValidationResult =
	| { errors: readonly VerticalValidationError[]; valid: false }
	| { valid: true };

export function validateVerticalSelection(
	vertical: string
): VerticalValidationResult {
	if (
		!businessVerticals.includes(vertical as BusinessVertical)
	) {
		return {
			valid: false,
			errors: [{ field: "vertical", reason: "unsupported" }],
		};
	}
	return { valid: true };
}

export function validateInquiryLeadInput(input: {
	email: string;
	name: string;
}): VerticalValidationResult {
	const errors: VerticalValidationError[] = [];
	if (!input.name || input.name.trim().length === 0) {
		errors.push({ field: "name", reason: "empty" });
	}
	if (!input.email || !input.email.includes("@")) {
		errors.push({ field: "email", reason: "invalid" });
	}
	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

// ---------------------------------------------------------------------------
// Bundle validation (E6-S5-T1)
// ---------------------------------------------------------------------------

export type BundleValidationError = {
	field: string;
	reason: string;
};

export type BundleValidationResult =
	| { errors: readonly BundleValidationError[]; valid: false }
	| { valid: true };

const timePattern = /^\d{2}:\d{2}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validate that a VerticalTemplateConfig has structurally correct data.
 * Used when registering new verticals to ensure configuration integrity.
 */
export function validateVerticalBundle(
	bundle: VerticalTemplateConfig
): BundleValidationResult {
	const errors: BundleValidationError[] = [];

	if (!bundle.vertical || bundle.vertical.trim().length === 0) {
		errors.push({ field: "vertical", reason: "empty" });
	}

	if (!bundle.description || bundle.description.trim().length === 0) {
		errors.push({ field: "description", reason: "empty" });
	}

	if (!bundle.modules) {
		errors.push({ field: "modules", reason: "missing" });
	}

	if (!bundle.theme) {
		errors.push({ field: "theme", reason: "missing" });
	} else {
		if (!bundle.theme.themePreset) {
			errors.push({ field: "theme.themePreset", reason: "empty" });
		}
		if (!bundle.theme.brandPreset) {
			errors.push({ field: "theme.brandPreset", reason: "empty" });
		}
		if (!bundle.theme.navigationPreset) {
			errors.push({ field: "theme.navigationPreset", reason: "empty" });
		}
	}

	if (!bundle.starterCategories || bundle.starterCategories.length === 0) {
		errors.push({ field: "starterCategories", reason: "empty" });
	}

	if (!bundle.starterContentPages || bundle.starterContentPages.length === 0) {
		errors.push({ field: "starterContentPages", reason: "empty" });
	}

	for (const entry of bundle.defaultBusinessHours) {
		if (entry.dayOfWeek < 0 || entry.dayOfWeek > 6) {
			errors.push({ field: "defaultBusinessHours.dayOfWeek", reason: "out-of-range" });
		}
		if (!timePattern.test(entry.openTime)) {
			errors.push({ field: "defaultBusinessHours.openTime", reason: "invalid-format" });
		}
		if (!timePattern.test(entry.closeTime)) {
			errors.push({ field: "defaultBusinessHours.closeTime", reason: "invalid-format" });
		}
	}

	for (const svc of bundle.starterServices) {
		if (!svc.name || svc.name.trim().length === 0) {
			errors.push({ field: "starterServices.name", reason: "empty" });
		}
		if (!slugPattern.test(svc.slug)) {
			errors.push({ field: "starterServices.slug", reason: "invalid-format" });
		}
		if (svc.durationMinutes <= 0) {
			errors.push({ field: "starterServices.durationMinutes", reason: "non-positive" });
		}
		if (svc.price < 0) {
			errors.push({ field: "starterServices.price", reason: "negative" });
		}
	}

	if (bundle.inquiryForm.enabled) {
		if (!bundle.inquiryForm.heading || bundle.inquiryForm.heading.trim().length === 0) {
			errors.push({ field: "inquiryForm.heading", reason: "empty" });
		}
		if (!bundle.inquiryForm.submitLabel || bundle.inquiryForm.submitLabel.trim().length === 0) {
			errors.push({ field: "inquiryForm.submitLabel", reason: "empty" });
		}
		if (bundle.inquiryForm.fields.length === 0) {
			errors.push({ field: "inquiryForm.fields", reason: "empty" });
		}
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
