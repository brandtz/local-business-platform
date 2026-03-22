// ---------------------------------------------------------------------------
// Portfolio & Showcase domain types (E11-S5)
// ---------------------------------------------------------------------------

export const portfolioProjectStatuses = ["draft", "published"] as const;

export type PortfolioProjectStatus = (typeof portfolioProjectStatuses)[number];

export const portfolioMediaTags = ["before", "after", "general"] as const;

export type PortfolioMediaTag = (typeof portfolioMediaTags)[number];

// ---------------------------------------------------------------------------
// Core domain records
// ---------------------------------------------------------------------------

export type PortfolioProjectRecord = {
	createdAt: string;
	description: unknown; // rich text JSON
	id: string;
	isFeatured: boolean;
	location?: string | null;
	projectDate?: string | null;
	serviceCategories: readonly string[];
	sortOrder: number;
	status: PortfolioProjectStatus;
	tenantId: string;
	testimonialAttribution?: string | null;
	testimonialQuote?: string | null;
	testimonialRating?: number | null;
	title: string;
	updatedAt: string;
};

export type PortfolioProjectMediaRecord = {
	altText: string | null;
	caption: string | null;
	id: string;
	projectId: string;
	sortOrder: number;
	tag: PortfolioMediaTag;
	url: string;
};

// ---------------------------------------------------------------------------
// Admin request types
// ---------------------------------------------------------------------------

export type CreatePortfolioProjectRequest = {
	description: unknown;
	isFeatured?: boolean;
	location?: string | null;
	projectDate?: string | null;
	serviceCategories?: readonly string[];
	testimonialAttribution?: string | null;
	testimonialQuote?: string | null;
	testimonialRating?: number | null;
	title: string;
};

export type UpdatePortfolioProjectRequest = {
	description?: unknown;
	isFeatured?: boolean;
	location?: string | null;
	projectDate?: string | null;
	serviceCategories?: readonly string[];
	testimonialAttribution?: string | null;
	testimonialQuote?: string | null;
	testimonialRating?: number | null;
	title?: string;
};

export type CreatePortfolioMediaRequest = {
	altText?: string | null;
	caption?: string | null;
	sortOrder?: number;
	tag?: PortfolioMediaTag;
	url: string;
};

export type UpdatePortfolioMediaRequest = {
	altText?: string | null;
	caption?: string | null;
	sortOrder?: number;
	tag?: PortfolioMediaTag;
};

export type ReorderPortfolioMediaRequest = {
	mediaIds: readonly string[];
};

// ---------------------------------------------------------------------------
// Storefront read models
// ---------------------------------------------------------------------------

export type StorefrontPortfolioMedia = {
	altText: string | null;
	caption: string | null;
	id: string;
	sortOrder: number;
	tag: PortfolioMediaTag;
	url: string;
};

export type StorefrontPortfolioTestimonial = {
	attribution: string;
	quote: string;
	rating?: number | null;
};

export type StorefrontPortfolioProject = {
	description: unknown;
	id: string;
	location?: string | null;
	media: StorefrontPortfolioMedia[];
	projectDate?: string | null;
	serviceCategories: readonly string[];
	testimonial?: StorefrontPortfolioTestimonial | null;
	title: string;
};

export type StorefrontPortfolioListQuery = {
	category?: string;
	page?: number;
	pageSize?: number;
};

export type StorefrontPortfolioListResponse = {
	items: StorefrontPortfolioProject[];
	page: number;
	pageSize: number;
	total: number;
};

export type StorefrontFeaturedProject = {
	description: unknown;
	id: string;
	media: StorefrontPortfolioMedia[];
	serviceCategories: readonly string[];
	title: string;
};

// ---------------------------------------------------------------------------
// Admin API contracts
// ---------------------------------------------------------------------------

export type PortfolioAdminListQuery = {
	page?: number;
	pageSize?: number;
	search?: string;
	status?: PortfolioProjectStatus;
};

export type PortfolioAdminListResponse = {
	items: PortfolioProjectRecord[];
	page: number;
	pageSize: number;
	total: number;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type PortfolioValidationError = { field: string; reason: string };

export type PortfolioValidationResult =
	| { errors: readonly PortfolioValidationError[]; valid: false }
	| { valid: true };

export function validatePortfolioProjectInput(input: {
	description: unknown;
	testimonialRating?: number | null;
	title: string;
}): PortfolioValidationResult {
	const errors: PortfolioValidationError[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push({ field: "title", reason: "required" });
	}
	if (input.description === null || input.description === undefined) {
		errors.push({ field: "description", reason: "required" });
	}
	if (
		input.testimonialRating != null &&
		(input.testimonialRating < 1 || input.testimonialRating > 5 || !Number.isInteger(input.testimonialRating))
	) {
		errors.push({ field: "testimonialRating", reason: "invalid-range" });
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

export function validatePortfolioMediaInput(input: {
	tag?: string;
	url: string;
}): PortfolioValidationResult {
	const errors: PortfolioValidationError[] = [];

	if (!input.url || input.url.trim().length === 0) {
		errors.push({ field: "url", reason: "required" });
	}
	if (input.tag && !(portfolioMediaTags as readonly string[]).includes(input.tag)) {
		errors.push({ field: "tag", reason: "invalid" });
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
