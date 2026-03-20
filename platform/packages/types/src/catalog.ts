export const itemStatuses = ["draft", "active", "archived"] as const;

export type ItemStatus = (typeof itemStatuses)[number];

export const categoryStatuses = ["active", "archived"] as const;

export type CategoryStatus = (typeof categoryStatuses)[number];

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

export type Category = {
	createdAt: string;
	description?: string;
	displayOrder: number;
	id: string;
	imageUrl?: string;
	name: string;
	parentCategoryId?: string;
	slug: string;
	status: CategoryStatus;
	tenantId: string;
	updatedAt: string;
};

export type Item = {
	categoryId: string;
	createdAt: string;
	description?: string;
	displayOrder: number;
	id: string;
	name: string;
	slug: string;
	status: ItemStatus;
	tenantId: string;
	updatedAt: string;
};

export type ItemVariant = {
	createdAt: string;
	displayOrder: number;
	id: string;
	isDefault: boolean;
	itemId: string;
	name: string;
	priceCents: number;
	tenantId: string;
	updatedAt: string;
};

export type ItemModifier = {
	createdAt: string;
	displayOrder: number;
	id: string;
	isRequired: boolean;
	itemId: string;
	name: string;
	priceCents: number;
	tenantId: string;
	updatedAt: string;
};

export type MediaReference = {
	altText?: string;
	createdAt: string;
	displayOrder: number;
	id: string;
	itemId: string;
	tenantId: string;
	updatedAt: string;
	url: string;
};

// ---------------------------------------------------------------------------
// Admin request / response types
// ---------------------------------------------------------------------------

export type CreateCategoryRequest = {
	description?: string;
	displayOrder?: number;
	imageUrl?: string;
	name: string;
	parentCategoryId?: string;
	slug: string;
};

export type UpdateCategoryRequest = {
	description?: string;
	displayOrder?: number;
	imageUrl?: string;
	name?: string;
	parentCategoryId?: string;
	slug?: string;
	status?: CategoryStatus;
};

export type CreateItemRequest = {
	categoryId: string;
	description?: string;
	displayOrder?: number;
	modifiers?: {
		displayOrder?: number;
		isRequired: boolean;
		name: string;
		priceCents: number;
	}[];
	name: string;
	slug: string;
	variants: {
		displayOrder?: number;
		isDefault: boolean;
		name: string;
		priceCents: number;
	}[];
};

export type UpdateItemRequest = {
	categoryId?: string;
	description?: string;
	displayOrder?: number;
	name?: string;
	slug?: string;
	status?: ItemStatus;
};

export type CreateItemVariantRequest = {
	displayOrder?: number;
	isDefault: boolean;
	name: string;
	priceCents: number;
};

export type UpdateItemVariantRequest = {
	displayOrder?: number;
	isDefault?: boolean;
	name?: string;
	priceCents?: number;
};

export type CreateItemModifierRequest = {
	displayOrder?: number;
	isRequired: boolean;
	name: string;
	priceCents: number;
};

export type UpdateItemModifierRequest = {
	displayOrder?: number;
	isRequired?: boolean;
	name?: string;
	priceCents?: number;
};

export type CatalogListQuery = {
	page?: number;
	pageSize?: number;
	search?: string;
	status?: string;
};

export type CatalogListResponse<T> = {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
};

// ---------------------------------------------------------------------------
// Storefront read-model types
// ---------------------------------------------------------------------------

export type StorefrontItemVariant = {
	displayOrder: number;
	id: string;
	isDefault: boolean;
	name: string;
	priceCents: number;
};

export type StorefrontItemModifier = {
	displayOrder: number;
	id: string;
	isRequired: boolean;
	name: string;
	priceCents: number;
};

export type StorefrontMediaReference = {
	altText?: string;
	displayOrder: number;
	id: string;
	url: string;
};

export type StorefrontItem = {
	description?: string;
	displayOrder: number;
	id: string;
	media: StorefrontMediaReference[];
	modifiers: StorefrontItemModifier[];
	name: string;
	slug: string;
	variants: StorefrontItemVariant[];
};

export type StorefrontCategory = {
	description?: string;
	displayOrder: number;
	id: string;
	imageUrl?: string;
	items: StorefrontItem[];
	name: string;
	slug: string;
};

export type StorefrontCatalogResponse = {
	categories: StorefrontCategory[];
};

// ---------------------------------------------------------------------------
// Extended domain record types (admin / service layer)
// ---------------------------------------------------------------------------

export const catalogItemStatuses = ["active", "inactive"] as const;
export type CatalogItemStatus = (typeof catalogItemStatuses)[number];

export const catalogItemVisibilities = ["draft", "published"] as const;
export type CatalogItemVisibility = (typeof catalogItemVisibilities)[number];

export type CatalogItemRecord = {
	categoryId: string;
	compareAtPrice: number | null;
	description: string | null;
	id: string;
	lowStockThreshold: number | null;
	name: string;
	price: number;
	slug: string;
	sortOrder: number;
	status: CatalogItemStatus;
	stockQuantity: number | null;
	tenantId: string;
	visibility: CatalogItemVisibility;
};

export type CatalogListFilter = {
	categoryId?: string;
	search?: string;
	status?: CatalogItemStatus;
	visibility?: CatalogItemVisibility;
};

export type CatalogSortField = "name" | "price" | "sortOrder" | "createdAt";
export type SortDirection = "asc" | "desc";

export const modifierSelectionModes = ["single", "multiple"] as const;
export type ModifierSelectionMode = (typeof modifierSelectionModes)[number];

export type ModifierGroupRecord = {
	id: string;
	isRequired: boolean;
	itemId: string;
	maxSelections: number | null;
	minSelections: number;
	name: string;
	selectionMode: ModifierSelectionMode;
	sortOrder: number;
	tenantId: string;
};

export type ModifierOptionRecord = {
	groupId: string;
	id: string;
	isDefault: boolean;
	name: string;
	priceAdjustment: number;
	sortOrder: number;
};

// ---------------------------------------------------------------------------
// Validation functions
// ---------------------------------------------------------------------------

export function isValidItemStatus(
	status: string
): status is ItemStatus {
	return (itemStatuses as readonly string[]).includes(status);
}

export function isValidCategoryStatus(
	status: string
): status is CategoryStatus {
	return (categoryStatuses as readonly string[]).includes(status);
}

export const MAX_SLUG_LENGTH = 128;

export function isValidSlug(slug: string): boolean {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= MAX_SLUG_LENGTH;
}

export function isValidPriceCents(price: number): boolean {
	return Number.isInteger(price) && price >= 0;
}

type ValidationError = { field: string; reason: string };
type ValidationResult =
	| { valid: true }
	| { valid: false; errors: ValidationError[] };

export function validateCatalogItemInput(input: {
	compareAtPrice?: number | null;
	name: string;
	price: number;
	slug: string;
}): ValidationResult {
	const errors: ValidationError[] = [];

	if (!input.name || input.name.trim().length === 0) {
		errors.push({ field: "name", reason: "required" });
	}
	if (!isValidSlug(input.slug)) {
		errors.push({ field: "slug", reason: "invalid" });
	}
	if (!isValidPriceCents(input.price)) {
		errors.push({ field: "price", reason: "invalid" });
	}
	if (input.compareAtPrice != null && input.compareAtPrice <= input.price) {
		errors.push({ field: "compareAtPrice", reason: "must-exceed-price" });
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

export function validateModifierGroupInput(input: {
	maxSelections?: number | null;
	minSelections: number;
	name: string;
}): ValidationResult {
	const errors: ValidationError[] = [];

	if (!input.name || input.name.trim().length === 0) {
		errors.push({ field: "name", reason: "required" });
	}
	if (input.maxSelections != null && input.minSelections > input.maxSelections) {
		errors.push({ field: "minSelections", reason: "exceeds-max" });
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
