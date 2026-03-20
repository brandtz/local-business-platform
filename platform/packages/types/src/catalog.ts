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
