import {
	categoryStatuses,
	isValidPriceCents,
	isValidSlug,
	itemStatuses,
	type CatalogListQuery,
	type CreateCategoryRequest,
	type CreateItemModifierRequest,
	type CreateItemRequest,
	type CreateItemVariantRequest,
	type UpdateCategoryRequest,
	type UpdateItemModifierRequest,
	type UpdateItemRequest,
	type UpdateItemVariantRequest
} from "@platform/types";

// ---------------------------------------------------------------------------
// Contract validation error
// ---------------------------------------------------------------------------

export class CatalogApiContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CatalogApiContractError";
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
	return value === undefined || typeof value === "string";
}

function isOptionalNonNegativeInteger(value: unknown): boolean {
	return value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}

// ---------------------------------------------------------------------------
// Category contracts
// ---------------------------------------------------------------------------

export function assertValidCreateCategoryRequest(
	payload: unknown
): asserts payload is CreateCategoryRequest {
	if (!isRecord(payload)) {
		throw new CatalogApiContractError("Create category payload must be an object.");
	}
	if (!isNonEmptyString(payload.name)) {
		throw new CatalogApiContractError("Create category payload requires a non-empty name.");
	}
	if (!isNonEmptyString(payload.slug)) {
		throw new CatalogApiContractError("Create category payload requires a non-empty slug.");
	}
	if (!isValidSlug(payload.slug as string)) {
		throw new CatalogApiContractError(
			"Create category slug must be lowercase alphanumeric with hyphens, 1-128 characters."
		);
	}
	if (payload.description !== undefined && typeof payload.description !== "string") {
		throw new CatalogApiContractError(
			"Create category description must be a string when provided."
		);
	}
	if (!isOptionalNonNegativeInteger(payload.displayOrder)) {
		throw new CatalogApiContractError(
			"Create category displayOrder must be a non-negative integer when provided."
		);
	}
	if (payload.parentCategoryId !== undefined && !isNonEmptyString(payload.parentCategoryId)) {
		throw new CatalogApiContractError(
			"Create category parentCategoryId must be a non-empty string when provided."
		);
	}
	if (!isOptionalString(payload.imageUrl)) {
		throw new CatalogApiContractError(
			"Create category imageUrl must be a string when provided."
		);
	}
}

export function assertValidUpdateCategoryRequest(
	payload: unknown
): asserts payload is UpdateCategoryRequest {
	if (!isRecord(payload)) {
		throw new CatalogApiContractError("Update category payload must be an object.");
	}
	if (payload.name !== undefined && !isNonEmptyString(payload.name)) {
		throw new CatalogApiContractError("Update category name must be a non-empty string when provided.");
	}
	if (payload.slug !== undefined) {
		if (!isNonEmptyString(payload.slug)) {
			throw new CatalogApiContractError("Update category slug must be a non-empty string when provided.");
		}
		if (!isValidSlug(payload.slug as string)) {
			throw new CatalogApiContractError(
				"Update category slug must be lowercase alphanumeric with hyphens, 1-128 characters."
			);
		}
	}
	if (payload.description !== undefined && typeof payload.description !== "string") {
		throw new CatalogApiContractError(
			"Update category description must be a string when provided."
		);
	}
	if (!isOptionalNonNegativeInteger(payload.displayOrder)) {
		throw new CatalogApiContractError(
			"Update category displayOrder must be a non-negative integer when provided."
		);
	}
	if (payload.parentCategoryId !== undefined && !isNonEmptyString(payload.parentCategoryId)) {
		throw new CatalogApiContractError(
			"Update category parentCategoryId must be a non-empty string when provided."
		);
	}
	if (!isOptionalString(payload.imageUrl)) {
		throw new CatalogApiContractError(
			"Update category imageUrl must be a string when provided."
		);
	}
	if (
		payload.status !== undefined &&
		!categoryStatuses.includes(payload.status as (typeof categoryStatuses)[number])
	) {
		throw new CatalogApiContractError(
			"Update category status must be a valid category status."
		);
	}
}

// ---------------------------------------------------------------------------
// Item contracts
// ---------------------------------------------------------------------------

export function assertValidCreateItemRequest(
	payload: unknown
): asserts payload is CreateItemRequest {
	if (!isRecord(payload)) {
		throw new CatalogApiContractError("Create item payload must be an object.");
	}
	if (!isNonEmptyString(payload.categoryId)) {
		throw new CatalogApiContractError("Create item payload requires a non-empty categoryId.");
	}
	if (!isNonEmptyString(payload.name)) {
		throw new CatalogApiContractError("Create item payload requires a non-empty name.");
	}
	if (!isNonEmptyString(payload.slug)) {
		throw new CatalogApiContractError("Create item payload requires a non-empty slug.");
	}
	if (!isValidSlug(payload.slug as string)) {
		throw new CatalogApiContractError(
			"Create item slug must be lowercase alphanumeric with hyphens, 1-128 characters."
		);
	}
	if (payload.description !== undefined && typeof payload.description !== "string") {
		throw new CatalogApiContractError(
			"Create item description must be a string when provided."
		);
	}
	if (!isOptionalNonNegativeInteger(payload.displayOrder)) {
		throw new CatalogApiContractError(
			"Create item displayOrder must be a non-negative integer when provided."
		);
	}
	if (!Array.isArray(payload.variants) || payload.variants.length === 0) {
		throw new CatalogApiContractError(
			"Create item payload requires a non-empty variants array."
		);
	}
	(payload.variants as unknown[]).forEach((v, i) => {
		if (!isRecord(v)) {
			throw new CatalogApiContractError(`Create item variants[${i}] must be an object.`);
		}
		if (!isNonEmptyString(v.name)) {
			throw new CatalogApiContractError(`Create item variants[${i}] requires a non-empty name.`);
		}
		if (!isValidPriceCents(v.priceCents as number)) {
			throw new CatalogApiContractError(
				`Create item variants[${i}] priceCents must be a non-negative integer.`
			);
		}
		if (typeof v.isDefault !== "boolean") {
			throw new CatalogApiContractError(`Create item variants[${i}] isDefault must be a boolean.`);
		}
	});
	if (payload.modifiers !== undefined) {
		if (!Array.isArray(payload.modifiers)) {
			throw new CatalogApiContractError("Create item modifiers must be an array when provided.");
		}
		(payload.modifiers as unknown[]).forEach((m, i) => {
			if (!isRecord(m)) {
				throw new CatalogApiContractError(`Create item modifiers[${i}] must be an object.`);
			}
			if (!isNonEmptyString(m.name)) {
				throw new CatalogApiContractError(`Create item modifiers[${i}] requires a non-empty name.`);
			}
			if (!isValidPriceCents(m.priceCents as number)) {
				throw new CatalogApiContractError(
					`Create item modifiers[${i}] priceCents must be a non-negative integer.`
				);
			}
			if (typeof m.isRequired !== "boolean") {
				throw new CatalogApiContractError(`Create item modifiers[${i}] isRequired must be a boolean.`);
			}
		});
	}
}

export function assertValidUpdateItemRequest(
	payload: unknown
): asserts payload is UpdateItemRequest {
	if (!isRecord(payload)) {
		throw new CatalogApiContractError("Update item payload must be an object.");
	}
	if (payload.categoryId !== undefined && !isNonEmptyString(payload.categoryId)) {
		throw new CatalogApiContractError("Update item categoryId must be a non-empty string when provided.");
	}
	if (payload.name !== undefined && !isNonEmptyString(payload.name)) {
		throw new CatalogApiContractError("Update item name must be a non-empty string when provided.");
	}
	if (payload.slug !== undefined) {
		if (!isNonEmptyString(payload.slug)) {
			throw new CatalogApiContractError("Update item slug must be a non-empty string when provided.");
		}
		if (!isValidSlug(payload.slug as string)) {
			throw new CatalogApiContractError(
				"Update item slug must be lowercase alphanumeric with hyphens, 1-128 characters."
			);
		}
	}
	if (payload.description !== undefined && typeof payload.description !== "string") {
		throw new CatalogApiContractError(
			"Update item description must be a string when provided."
		);
	}
	if (!isOptionalNonNegativeInteger(payload.displayOrder)) {
		throw new CatalogApiContractError(
			"Update item displayOrder must be a non-negative integer when provided."
		);
	}
	if (
		payload.status !== undefined &&
		!itemStatuses.includes(payload.status as (typeof itemStatuses)[number])
	) {
		throw new CatalogApiContractError(
			"Update item status must be a valid item status."
		);
	}
}

// ---------------------------------------------------------------------------
// Variant contracts
// ---------------------------------------------------------------------------

export function assertValidCreateItemVariantRequest(
	payload: unknown
): asserts payload is CreateItemVariantRequest {
	if (!isRecord(payload)) {
		throw new CatalogApiContractError("Create variant payload must be an object.");
	}
	if (!isNonEmptyString(payload.name)) {
		throw new CatalogApiContractError("Create variant payload requires a non-empty name.");
	}
	if (!isValidPriceCents(payload.priceCents as number)) {
		throw new CatalogApiContractError(
			"Create variant priceCents must be a non-negative integer."
		);
	}
	if (typeof payload.isDefault !== "boolean") {
		throw new CatalogApiContractError("Create variant isDefault must be a boolean.");
	}
	if (!isOptionalNonNegativeInteger(payload.displayOrder)) {
		throw new CatalogApiContractError(
			"Create variant displayOrder must be a non-negative integer when provided."
		);
	}
}

export function assertValidUpdateItemVariantRequest(
	payload: unknown
): asserts payload is UpdateItemVariantRequest {
	if (!isRecord(payload)) {
		throw new CatalogApiContractError("Update variant payload must be an object.");
	}
	if (payload.name !== undefined && !isNonEmptyString(payload.name)) {
		throw new CatalogApiContractError("Update variant name must be a non-empty string when provided.");
	}
	if (payload.priceCents !== undefined && !isValidPriceCents(payload.priceCents as number)) {
		throw new CatalogApiContractError(
			"Update variant priceCents must be a non-negative integer when provided."
		);
	}
	if (payload.isDefault !== undefined && typeof payload.isDefault !== "boolean") {
		throw new CatalogApiContractError("Update variant isDefault must be a boolean when provided.");
	}
	if (!isOptionalNonNegativeInteger(payload.displayOrder)) {
		throw new CatalogApiContractError(
			"Update variant displayOrder must be a non-negative integer when provided."
		);
	}
}

// ---------------------------------------------------------------------------
// Modifier contracts
// ---------------------------------------------------------------------------

export function assertValidCreateItemModifierRequest(
	payload: unknown
): asserts payload is CreateItemModifierRequest {
	if (!isRecord(payload)) {
		throw new CatalogApiContractError("Create modifier payload must be an object.");
	}
	if (!isNonEmptyString(payload.name)) {
		throw new CatalogApiContractError("Create modifier payload requires a non-empty name.");
	}
	if (!isValidPriceCents(payload.priceCents as number)) {
		throw new CatalogApiContractError(
			"Create modifier priceCents must be a non-negative integer."
		);
	}
	if (typeof payload.isRequired !== "boolean") {
		throw new CatalogApiContractError("Create modifier isRequired must be a boolean.");
	}
	if (!isOptionalNonNegativeInteger(payload.displayOrder)) {
		throw new CatalogApiContractError(
			"Create modifier displayOrder must be a non-negative integer when provided."
		);
	}
}

export function assertValidUpdateItemModifierRequest(
	payload: unknown
): asserts payload is UpdateItemModifierRequest {
	if (!isRecord(payload)) {
		throw new CatalogApiContractError("Update modifier payload must be an object.");
	}
	if (payload.name !== undefined && !isNonEmptyString(payload.name)) {
		throw new CatalogApiContractError("Update modifier name must be a non-empty string when provided.");
	}
	if (payload.priceCents !== undefined && !isValidPriceCents(payload.priceCents as number)) {
		throw new CatalogApiContractError(
			"Update modifier priceCents must be a non-negative integer when provided."
		);
	}
	if (payload.isRequired !== undefined && typeof payload.isRequired !== "boolean") {
		throw new CatalogApiContractError("Update modifier isRequired must be a boolean when provided.");
	}
	if (!isOptionalNonNegativeInteger(payload.displayOrder)) {
		throw new CatalogApiContractError(
			"Update modifier displayOrder must be a non-negative integer when provided."
		);
	}
}

// ---------------------------------------------------------------------------
// List query contract
// ---------------------------------------------------------------------------

export function assertValidCatalogListQuery(
	query: unknown
): asserts query is CatalogListQuery {
	if (!isRecord(query)) {
		throw new CatalogApiContractError("Catalog list query must be an object.");
	}
	if (query.page !== undefined) {
		if (typeof query.page !== "number" || !Number.isInteger(query.page) || query.page < 1) {
			throw new CatalogApiContractError("Catalog list query page must be a positive integer.");
		}
	}
	if (query.pageSize !== undefined) {
		if (typeof query.pageSize !== "number" || !Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) {
			throw new CatalogApiContractError("Catalog list query pageSize must be an integer between 1 and 100.");
		}
	}
	if (query.status !== undefined && !isNonEmptyString(query.status)) {
		throw new CatalogApiContractError("Catalog list query status must be a non-empty string when provided.");
	}
	if (query.search !== undefined && typeof query.search !== "string") {
		throw new CatalogApiContractError("Catalog list query search must be a string when provided.");
	}
}
