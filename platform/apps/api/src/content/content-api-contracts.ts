import {
	announcementPlacements,
	contentPageStatuses,
	type CreateAnnouncementRequest,
	type CreateContentPageRequest,
	type UpdateAnnouncementRequest,
	type UpdateContentPageRequest,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Contract validation error
// ---------------------------------------------------------------------------

export class ContentApiContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ContentApiContractError";
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
	return value === undefined || value === null || typeof value === "string";
}

function isOptionalNonNegativeInteger(value: unknown): boolean {
	return (
		value === undefined ||
		(typeof value === "number" && Number.isInteger(value) && value >= 0)
	);
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidSlug(value: string): boolean {
	return slugPattern.test(value) && value.length <= 128;
}

// ---------------------------------------------------------------------------
// Content page contracts
// ---------------------------------------------------------------------------

export function assertValidCreateContentPageRequest(
	payload: unknown
): asserts payload is CreateContentPageRequest {
	if (!isRecord(payload)) {
		throw new ContentApiContractError(
			"Create content page payload must be an object."
		);
	}
	if (!isNonEmptyString(payload.title)) {
		throw new ContentApiContractError(
			"Create content page payload requires a non-empty title."
		);
	}
	if (!isNonEmptyString(payload.slug)) {
		throw new ContentApiContractError(
			"Create content page payload requires a non-empty slug."
		);
	}
	if (!isValidSlug(payload.slug as string)) {
		throw new ContentApiContractError(
			"Create content page slug must be lowercase alphanumeric with hyphens, 1-128 characters."
		);
	}
	if (payload.body === null || payload.body === undefined) {
		throw new ContentApiContractError(
			"Create content page payload requires a body."
		);
	}
	if (!isOptionalString(payload.seoTitle)) {
		throw new ContentApiContractError(
			"Create content page seoTitle must be a string when provided."
		);
	}
	if (!isOptionalString(payload.seoDescription)) {
		throw new ContentApiContractError(
			"Create content page seoDescription must be a string when provided."
		);
	}
	if (!isOptionalString(payload.ogImageUrl)) {
		throw new ContentApiContractError(
			"Create content page ogImageUrl must be a string when provided."
		);
	}
	if (!isOptionalString(payload.templateRegion)) {
		throw new ContentApiContractError(
			"Create content page templateRegion must be a string when provided."
		);
	}
}

export function assertValidUpdateContentPageRequest(
	payload: unknown
): asserts payload is UpdateContentPageRequest {
	if (!isRecord(payload)) {
		throw new ContentApiContractError(
			"Update content page payload must be an object."
		);
	}
	if (payload.title !== undefined && !isNonEmptyString(payload.title)) {
		throw new ContentApiContractError(
			"Update content page title must be a non-empty string when provided."
		);
	}
	if (payload.slug !== undefined) {
		if (!isNonEmptyString(payload.slug)) {
			throw new ContentApiContractError(
				"Update content page slug must be a non-empty string when provided."
			);
		}
		if (!isValidSlug(payload.slug as string)) {
			throw new ContentApiContractError(
				"Update content page slug must be lowercase alphanumeric with hyphens, 1-128 characters."
			);
		}
	}
	if (!isOptionalString(payload.seoTitle)) {
		throw new ContentApiContractError(
			"Update content page seoTitle must be a string when provided."
		);
	}
	if (!isOptionalString(payload.seoDescription)) {
		throw new ContentApiContractError(
			"Update content page seoDescription must be a string when provided."
		);
	}
	if (!isOptionalString(payload.ogImageUrl)) {
		throw new ContentApiContractError(
			"Update content page ogImageUrl must be a string when provided."
		);
	}
	if (!isOptionalString(payload.templateRegion)) {
		throw new ContentApiContractError(
			"Update content page templateRegion must be a string when provided."
		);
	}
}

// ---------------------------------------------------------------------------
// Content page list query
// ---------------------------------------------------------------------------

export type ContentListQuery = {
	page?: number;
	pageSize?: number;
	search?: string;
	status?: string;
};

export function assertValidContentListQuery(
	query: unknown
): asserts query is ContentListQuery {
	if (!isRecord(query)) {
		throw new ContentApiContractError(
			"Content list query must be an object."
		);
	}
	if (query.page !== undefined) {
		if (
			typeof query.page !== "number" ||
			!Number.isInteger(query.page) ||
			query.page < 1
		) {
			throw new ContentApiContractError(
				"Content list query page must be a positive integer."
			);
		}
	}
	if (query.pageSize !== undefined) {
		if (
			typeof query.pageSize !== "number" ||
			!Number.isInteger(query.pageSize) ||
			query.pageSize < 1 ||
			query.pageSize > 100
		) {
			throw new ContentApiContractError(
				"Content list query pageSize must be an integer between 1 and 100."
			);
		}
	}
	if (
		query.status !== undefined &&
		!contentPageStatuses.includes(
			query.status as (typeof contentPageStatuses)[number]
		)
	) {
		throw new ContentApiContractError(
			"Content list query status must be a valid content page status."
		);
	}
	if (query.search !== undefined && typeof query.search !== "string") {
		throw new ContentApiContractError(
			"Content list query search must be a string when provided."
		);
	}
}

// ---------------------------------------------------------------------------
// Storefront slug contract
// ---------------------------------------------------------------------------

export function assertValidStorefrontSlug(slug: unknown): asserts slug is string {
	if (!isNonEmptyString(slug)) {
		throw new ContentApiContractError(
			"Storefront content slug must be a non-empty string."
		);
	}
	if (!isValidSlug(slug)) {
		throw new ContentApiContractError(
			"Storefront content slug must be lowercase alphanumeric with hyphens, 1-128 characters."
		);
	}
}

// ---------------------------------------------------------------------------
// Announcement contracts
// ---------------------------------------------------------------------------

export function assertValidCreateAnnouncementRequest(
	payload: unknown
): asserts payload is CreateAnnouncementRequest {
	if (!isRecord(payload)) {
		throw new ContentApiContractError(
			"Create announcement payload must be an object."
		);
	}
	if (!isNonEmptyString(payload.title)) {
		throw new ContentApiContractError(
			"Create announcement payload requires a non-empty title."
		);
	}
	if (!isNonEmptyString(payload.body)) {
		throw new ContentApiContractError(
			"Create announcement payload requires a non-empty body."
		);
	}
	if (
		payload.placement !== undefined &&
		!announcementPlacements.includes(
			payload.placement as (typeof announcementPlacements)[number]
		)
	) {
		throw new ContentApiContractError(
			"Create announcement placement must be a valid placement type."
		);
	}
	if (!isOptionalNonNegativeInteger(payload.displayPriority)) {
		throw new ContentApiContractError(
			"Create announcement displayPriority must be a non-negative integer when provided."
		);
	}
	if (!isOptionalString(payload.startDate)) {
		throw new ContentApiContractError(
			"Create announcement startDate must be a string when provided."
		);
	}
	if (!isOptionalString(payload.endDate)) {
		throw new ContentApiContractError(
			"Create announcement endDate must be a string when provided."
		);
	}
	if (
		isNonEmptyString(payload.startDate) &&
		isNonEmptyString(payload.endDate) &&
		new Date(payload.endDate as string) < new Date(payload.startDate as string)
	) {
		throw new ContentApiContractError(
			"Create announcement endDate must not be before startDate."
		);
	}
}

export function assertValidUpdateAnnouncementRequest(
	payload: unknown
): asserts payload is UpdateAnnouncementRequest {
	if (!isRecord(payload)) {
		throw new ContentApiContractError(
			"Update announcement payload must be an object."
		);
	}
	if (payload.title !== undefined && !isNonEmptyString(payload.title)) {
		throw new ContentApiContractError(
			"Update announcement title must be a non-empty string when provided."
		);
	}
	if (payload.body !== undefined && !isNonEmptyString(payload.body)) {
		throw new ContentApiContractError(
			"Update announcement body must be a non-empty string when provided."
		);
	}
	if (
		payload.placement !== undefined &&
		!announcementPlacements.includes(
			payload.placement as (typeof announcementPlacements)[number]
		)
	) {
		throw new ContentApiContractError(
			"Update announcement placement must be a valid placement type."
		);
	}
	if (!isOptionalNonNegativeInteger(payload.displayPriority)) {
		throw new ContentApiContractError(
			"Update announcement displayPriority must be a non-negative integer when provided."
		);
	}
	if (payload.isActive !== undefined && typeof payload.isActive !== "boolean") {
		throw new ContentApiContractError(
			"Update announcement isActive must be a boolean when provided."
		);
	}
	if (!isOptionalString(payload.startDate)) {
		throw new ContentApiContractError(
			"Update announcement startDate must be a string when provided."
		);
	}
	if (!isOptionalString(payload.endDate)) {
		throw new ContentApiContractError(
			"Update announcement endDate must be a string when provided."
		);
	}
}
