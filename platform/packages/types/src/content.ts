// ---------------------------------------------------------------------------
// Content & SEO domain types (E6-S4)
// ---------------------------------------------------------------------------

export const contentPageStatuses = ["draft", "published", "archived"] as const;

export type ContentPageStatus = (typeof contentPageStatuses)[number];

export const announcementPlacements = ["banner", "popup", "inline"] as const;

export type AnnouncementPlacement = (typeof announcementPlacements)[number];

// ---------------------------------------------------------------------------
// Core domain records
// ---------------------------------------------------------------------------

export type ContentPageRecord = {
	archivedAt?: string | null;
	body: unknown; // structured JSON block content
	createdAt: string;
	id: string;
	ogImageUrl?: string | null;
	publishedAt?: string | null;
	seoDescription?: string | null;
	seoTitle?: string | null;
	slug: string;
	sortOrder: number;
	status: ContentPageStatus;
	templateRegion?: string | null;
	tenantId: string;
	title: string;
	updatedAt: string;
};

export type AnnouncementRecord = {
	body: string;
	createdAt: string;
	displayPriority: number;
	endDate?: string | null;
	id: string;
	isActive: boolean;
	placement: AnnouncementPlacement;
	startDate?: string | null;
	tenantId: string;
	title: string;
	updatedAt: string;
};

// ---------------------------------------------------------------------------
// Admin request types
// ---------------------------------------------------------------------------

export type CreateContentPageRequest = {
	body: unknown;
	ogImageUrl?: string | null;
	seoDescription?: string | null;
	seoTitle?: string | null;
	slug: string;
	templateRegion?: string | null;
	title: string;
};

export type UpdateContentPageRequest = {
	body?: unknown;
	ogImageUrl?: string | null;
	seoDescription?: string | null;
	seoTitle?: string | null;
	slug?: string;
	templateRegion?: string | null;
	title?: string;
};

export type CreateAnnouncementRequest = {
	body: string;
	displayPriority?: number;
	endDate?: string | null;
	placement?: AnnouncementPlacement;
	startDate?: string | null;
	title: string;
};

export type UpdateAnnouncementRequest = {
	body?: string;
	displayPriority?: number;
	endDate?: string | null;
	isActive?: boolean;
	placement?: AnnouncementPlacement;
	startDate?: string | null;
	title?: string;
};

// ---------------------------------------------------------------------------
// Storefront read models
// ---------------------------------------------------------------------------

export type StorefrontContentPage = {
	body: unknown;
	ogImageUrl?: string | null;
	seoDescription?: string | null;
	seoTitle?: string | null;
	slug: string;
	templateRegion?: string | null;
	title: string;
};

export type StorefrontAnnouncement = {
	body: string;
	id: string;
	placement: AnnouncementPlacement;
	title: string;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ContentValidationError =
	| { field: "body"; reason: "empty" }
	| { field: "endDate"; reason: "before-start" }
	| { field: "slug"; reason: "duplicate" | "empty" | "invalid-format" }
	| { field: "title"; reason: "empty" };

export type ContentValidationResult =
	| { errors: readonly ContentValidationError[]; valid: false }
	| { valid: true };

export function validateContentPageInput(input: {
	body: unknown;
	slug: string;
	title: string;
}): ContentValidationResult {
	const errors: ContentValidationError[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push({ field: "title", reason: "empty" });
	}
	if (!input.slug || input.slug.trim().length === 0) {
		errors.push({ field: "slug", reason: "empty" });
	} else if (!slugPattern.test(input.slug)) {
		errors.push({ field: "slug", reason: "invalid-format" });
	}
	if (input.body === null || input.body === undefined) {
		errors.push({ field: "body", reason: "empty" });
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

export function validateAnnouncementInput(input: {
	endDate?: string | null;
	startDate?: string | null;
	title: string;
}): ContentValidationResult {
	const errors: ContentValidationError[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push({ field: "title", reason: "empty" });
	}
	if (input.startDate && input.endDate) {
		if (new Date(input.endDate) < new Date(input.startDate)) {
			errors.push({ field: "endDate", reason: "before-start" });
		}
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
