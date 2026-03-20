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

export type VerticalTemplateConfig = {
	defaultBusinessHours: readonly WeeklyHoursEntry[];
	description: string;
	modules: VerticalModuleConfig;
	starterCategories: readonly string[];
	starterContentPages: readonly string[];
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
			starterCategories: ["Haircuts", "Color Services", "Treatments"],
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
			starterCategories: [
				"Roofing",
				"Gutters",
				"General Contracting",
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
			starterCategories: [
				"Appetizers",
				"Entrees",
				"Desserts",
				"Beverages",
			],
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
			starterCategories: [
				"New Arrivals",
				"Sale",
				"Featured",
			],
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
