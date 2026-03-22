import {
	portfolioMediaTags,
	portfolioProjectStatuses,
	type CreatePortfolioMediaRequest,
	type CreatePortfolioProjectRequest,
	type PortfolioAdminListQuery,
	type ReorderPortfolioMediaRequest,
	type UpdatePortfolioMediaRequest,
	type UpdatePortfolioProjectRequest
} from "@platform/types";

// ---------------------------------------------------------------------------
// Contract validation error
// ---------------------------------------------------------------------------

export class PortfolioApiContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PortfolioApiContractError";
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
	return value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}

// ---------------------------------------------------------------------------
// Project contracts
// ---------------------------------------------------------------------------

export function assertValidCreatePortfolioProjectRequest(
	payload: unknown
): asserts payload is CreatePortfolioProjectRequest {
	if (!isRecord(payload)) {
		throw new PortfolioApiContractError("Create project payload must be an object.");
	}
	if (!isNonEmptyString(payload.title)) {
		throw new PortfolioApiContractError("Create project payload requires a non-empty title.");
	}
	if (payload.description === undefined || payload.description === null) {
		throw new PortfolioApiContractError("Create project payload requires a description.");
	}
	if (!isOptionalString(payload.location)) {
		throw new PortfolioApiContractError("Create project location must be a string when provided.");
	}
	if (!isOptionalString(payload.projectDate)) {
		throw new PortfolioApiContractError("Create project projectDate must be a string when provided.");
	}
	if (payload.serviceCategories !== undefined && !Array.isArray(payload.serviceCategories)) {
		throw new PortfolioApiContractError("Create project serviceCategories must be an array when provided.");
	}
	if (!isOptionalString(payload.testimonialQuote)) {
		throw new PortfolioApiContractError("Create project testimonialQuote must be a string when provided.");
	}
	if (!isOptionalString(payload.testimonialAttribution)) {
		throw new PortfolioApiContractError("Create project testimonialAttribution must be a string when provided.");
	}
	if (
		payload.testimonialRating !== undefined &&
		payload.testimonialRating !== null &&
		(typeof payload.testimonialRating !== "number" ||
			!Number.isInteger(payload.testimonialRating) ||
			payload.testimonialRating < 1 ||
			payload.testimonialRating > 5)
	) {
		throw new PortfolioApiContractError(
			"Create project testimonialRating must be an integer between 1 and 5 when provided."
		);
	}
	if (payload.isFeatured !== undefined && typeof payload.isFeatured !== "boolean") {
		throw new PortfolioApiContractError("Create project isFeatured must be a boolean when provided.");
	}
}

export function assertValidUpdatePortfolioProjectRequest(
	payload: unknown
): asserts payload is UpdatePortfolioProjectRequest {
	if (!isRecord(payload)) {
		throw new PortfolioApiContractError("Update project payload must be an object.");
	}
	if (payload.title !== undefined && !isNonEmptyString(payload.title)) {
		throw new PortfolioApiContractError("Update project title must be a non-empty string when provided.");
	}
	if (!isOptionalString(payload.location)) {
		throw new PortfolioApiContractError("Update project location must be a string when provided.");
	}
	if (!isOptionalString(payload.projectDate)) {
		throw new PortfolioApiContractError("Update project projectDate must be a string when provided.");
	}
	if (payload.serviceCategories !== undefined && !Array.isArray(payload.serviceCategories)) {
		throw new PortfolioApiContractError("Update project serviceCategories must be an array when provided.");
	}
	if (!isOptionalString(payload.testimonialQuote)) {
		throw new PortfolioApiContractError("Update project testimonialQuote must be a string when provided.");
	}
	if (!isOptionalString(payload.testimonialAttribution)) {
		throw new PortfolioApiContractError("Update project testimonialAttribution must be a string when provided.");
	}
	if (
		payload.testimonialRating !== undefined &&
		payload.testimonialRating !== null &&
		(typeof payload.testimonialRating !== "number" ||
			!Number.isInteger(payload.testimonialRating) ||
			payload.testimonialRating < 1 ||
			payload.testimonialRating > 5)
	) {
		throw new PortfolioApiContractError(
			"Update project testimonialRating must be an integer between 1 and 5 when provided."
		);
	}
	if (payload.isFeatured !== undefined && typeof payload.isFeatured !== "boolean") {
		throw new PortfolioApiContractError("Update project isFeatured must be a boolean when provided.");
	}
}

// ---------------------------------------------------------------------------
// Publish state toggle contract
// ---------------------------------------------------------------------------

export function assertValidPublishStateToggle(
	payload: unknown
): asserts payload is { status: "draft" | "published" } {
	if (!isRecord(payload)) {
		throw new PortfolioApiContractError("Publish state toggle payload must be an object.");
	}
	if (
		typeof payload.status !== "string" ||
		!(portfolioProjectStatuses as readonly string[]).includes(payload.status)
	) {
		throw new PortfolioApiContractError(
			"Publish state toggle status must be 'draft' or 'published'."
		);
	}
}

// ---------------------------------------------------------------------------
// Media contracts
// ---------------------------------------------------------------------------

export function assertValidCreatePortfolioMediaRequest(
	payload: unknown
): asserts payload is CreatePortfolioMediaRequest {
	if (!isRecord(payload)) {
		throw new PortfolioApiContractError("Create media payload must be an object.");
	}
	if (!isNonEmptyString(payload.url)) {
		throw new PortfolioApiContractError("Create media payload requires a non-empty url.");
	}
	if (!isOptionalString(payload.altText)) {
		throw new PortfolioApiContractError("Create media altText must be a string when provided.");
	}
	if (!isOptionalString(payload.caption)) {
		throw new PortfolioApiContractError("Create media caption must be a string when provided.");
	}
	if (!isOptionalNonNegativeInteger(payload.sortOrder)) {
		throw new PortfolioApiContractError(
			"Create media sortOrder must be a non-negative integer when provided."
		);
	}
	if (
		payload.tag !== undefined &&
		(typeof payload.tag !== "string" ||
			!(portfolioMediaTags as readonly string[]).includes(payload.tag))
	) {
		throw new PortfolioApiContractError(
			"Create media tag must be 'before', 'after', or 'general' when provided."
		);
	}
}

export function assertValidUpdatePortfolioMediaRequest(
	payload: unknown
): asserts payload is UpdatePortfolioMediaRequest {
	if (!isRecord(payload)) {
		throw new PortfolioApiContractError("Update media payload must be an object.");
	}
	if (!isOptionalString(payload.altText)) {
		throw new PortfolioApiContractError("Update media altText must be a string when provided.");
	}
	if (!isOptionalString(payload.caption)) {
		throw new PortfolioApiContractError("Update media caption must be a string when provided.");
	}
	if (!isOptionalNonNegativeInteger(payload.sortOrder)) {
		throw new PortfolioApiContractError(
			"Update media sortOrder must be a non-negative integer when provided."
		);
	}
	if (
		payload.tag !== undefined &&
		(typeof payload.tag !== "string" ||
			!(portfolioMediaTags as readonly string[]).includes(payload.tag))
	) {
		throw new PortfolioApiContractError(
			"Update media tag must be 'before', 'after', or 'general' when provided."
		);
	}
}

export function assertValidReorderPortfolioMediaRequest(
	payload: unknown
): asserts payload is ReorderPortfolioMediaRequest {
	if (!isRecord(payload)) {
		throw new PortfolioApiContractError("Reorder media payload must be an object.");
	}
	if (!Array.isArray(payload.mediaIds) || payload.mediaIds.length === 0) {
		throw new PortfolioApiContractError("Reorder media payload requires a non-empty mediaIds array.");
	}
	for (const id of payload.mediaIds) {
		if (!isNonEmptyString(id)) {
			throw new PortfolioApiContractError("Reorder media mediaIds must contain non-empty strings.");
		}
	}
}

// ---------------------------------------------------------------------------
// Admin list query contract
// ---------------------------------------------------------------------------

export function assertValidPortfolioAdminListQuery(
	query: unknown
): asserts query is PortfolioAdminListQuery {
	if (!isRecord(query)) {
		throw new PortfolioApiContractError("Portfolio admin list query must be an object.");
	}
	if (query.page !== undefined) {
		if (typeof query.page !== "number" || !Number.isInteger(query.page) || query.page < 1) {
			throw new PortfolioApiContractError("Portfolio admin list query page must be a positive integer.");
		}
	}
	if (query.pageSize !== undefined) {
		if (typeof query.pageSize !== "number" || !Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) {
			throw new PortfolioApiContractError("Portfolio admin list query pageSize must be an integer between 1 and 100.");
		}
	}
	if (
		query.status !== undefined &&
		(typeof query.status !== "string" ||
			!(portfolioProjectStatuses as readonly string[]).includes(query.status))
	) {
		throw new PortfolioApiContractError("Portfolio admin list query status must be 'draft' or 'published'.");
	}
	if (query.search !== undefined && typeof query.search !== "string") {
		throw new PortfolioApiContractError("Portfolio admin list query search must be a string when provided.");
	}
}
