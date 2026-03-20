import { Injectable } from "@nestjs/common";
import {
	isValidCategoryStatus,
	isValidItemStatus,
	isValidPriceCents,
	isValidSlug,
	type CatalogListQuery,
	type CatalogListResponse,
	type Category,
	type CreateCategoryRequest,
	type CreateItemModifierRequest,
	type CreateItemRequest,
	type CreateItemVariantRequest,
	type Item,
	type ItemModifier,
	type ItemVariant,
	type MediaReference,
	type UpdateCategoryRequest,
	type UpdateItemModifierRequest,
	type UpdateItemRequest,
	type UpdateItemVariantRequest
} from "@platform/types";

import { CatalogRepository } from "./catalog.repository";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class CatalogValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CatalogValidationError";
	}
}

export class CatalogNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CatalogNotFoundError";
	}
}

export class CatalogSlugConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CatalogSlugConflictError";
	}
}

// ---------------------------------------------------------------------------
// Domain service
// ---------------------------------------------------------------------------

@Injectable()
export class CatalogService {
	constructor(
		private readonly repository: CatalogRepository = new CatalogRepository()
	) {}

	// -----------------------------------------------------------------------
	// Categories
	// -----------------------------------------------------------------------

	listCategories(
		tenantId: string,
		query: CatalogListQuery = {}
	): CatalogListResponse<Category> {
		return this.repository.listCategories(tenantId, query);
	}

	getCategory(tenantId: string, categoryId: string): Category {
		const category = this.repository.getCategoryById(tenantId, categoryId);
		if (!category) {
			throw new CatalogNotFoundError(`Category ${categoryId} not found.`);
		}
		return category;
	}

	createCategory(tenantId: string, request: CreateCategoryRequest): Category {
		if (!request.name || request.name.trim().length === 0) {
			throw new CatalogValidationError("Category name is required.");
		}
		if (!isValidSlug(request.slug)) {
			throw new CatalogValidationError(
				"Category slug must be lowercase alphanumeric with hyphens, 1-128 characters."
			);
		}

		const existing = this.repository.getCategoryBySlug(tenantId, request.slug);
		if (existing) {
			throw new CatalogSlugConflictError(
				`Category slug '${request.slug}' already exists for this tenant.`
			);
		}

		return this.repository.createCategory(tenantId, request);
	}

	updateCategory(
		tenantId: string,
		categoryId: string,
		request: UpdateCategoryRequest
	): Category {
		if (request.name !== undefined && request.name.trim().length === 0) {
			throw new CatalogValidationError("Category name cannot be empty.");
		}
		if (request.slug !== undefined && !isValidSlug(request.slug)) {
			throw new CatalogValidationError(
				"Category slug must be lowercase alphanumeric with hyphens, 1-128 characters."
			);
		}
		if (request.status !== undefined && !isValidCategoryStatus(request.status)) {
			throw new CatalogValidationError(
				`Invalid category status: ${request.status}.`
			);
		}

		if (request.slug !== undefined) {
			const existing = this.repository.getCategoryBySlug(tenantId, request.slug);
			if (existing && existing.id !== categoryId) {
				throw new CatalogSlugConflictError(
					`Category slug '${request.slug}' already exists for this tenant.`
				);
			}
		}

		const updated = this.repository.updateCategory(tenantId, categoryId, request);
		if (!updated) {
			throw new CatalogNotFoundError(`Category ${categoryId} not found.`);
		}
		return updated;
	}

	deleteCategory(tenantId: string, categoryId: string): void {
		const deleted = this.repository.deleteCategory(tenantId, categoryId);
		if (!deleted) {
			throw new CatalogNotFoundError(`Category ${categoryId} not found.`);
		}
	}

	// -----------------------------------------------------------------------
	// Items
	// -----------------------------------------------------------------------

	listItems(
		tenantId: string,
		query: CatalogListQuery & { categoryId?: string } = {}
	): CatalogListResponse<Item> {
		return this.repository.listItems(tenantId, query);
	}

	getItem(tenantId: string, itemId: string): Item {
		const item = this.repository.getItemById(tenantId, itemId);
		if (!item) {
			throw new CatalogNotFoundError(`Item ${itemId} not found.`);
		}
		return item;
	}

	createItem(tenantId: string, request: CreateItemRequest): Item {
		if (!request.name || request.name.trim().length === 0) {
			throw new CatalogValidationError("Item name is required.");
		}
		if (!isValidSlug(request.slug)) {
			throw new CatalogValidationError(
				"Item slug must be lowercase alphanumeric with hyphens, 1-128 characters."
			);
		}
		if (!request.categoryId || request.categoryId.trim().length === 0) {
			throw new CatalogValidationError("Item categoryId is required.");
		}
		if (!request.variants || request.variants.length === 0) {
			throw new CatalogValidationError("Item must have at least one variant.");
		}

		for (const v of request.variants) {
			if (!v.name || v.name.trim().length === 0) {
				throw new CatalogValidationError("Variant name is required.");
			}
			if (!isValidPriceCents(v.priceCents)) {
				throw new CatalogValidationError(
					"Variant priceCents must be a non-negative integer."
				);
			}
		}

		if (request.modifiers) {
			for (const m of request.modifiers) {
				if (!m.name || m.name.trim().length === 0) {
					throw new CatalogValidationError("Modifier name is required.");
				}
				if (!isValidPriceCents(m.priceCents)) {
					throw new CatalogValidationError(
						"Modifier priceCents must be a non-negative integer."
					);
				}
			}
		}

		const existing = this.repository.getItemBySlug(tenantId, request.slug);
		if (existing) {
			throw new CatalogSlugConflictError(
				`Item slug '${request.slug}' already exists for this tenant.`
			);
		}

		const category = this.repository.getCategoryById(tenantId, request.categoryId);
		if (!category) {
			throw new CatalogNotFoundError(
				`Category ${request.categoryId} not found.`
			);
		}

		return this.repository.createItem(tenantId, request);
	}

	updateItem(
		tenantId: string,
		itemId: string,
		request: UpdateItemRequest
	): Item {
		if (request.name !== undefined && request.name.trim().length === 0) {
			throw new CatalogValidationError("Item name cannot be empty.");
		}
		if (request.slug !== undefined && !isValidSlug(request.slug)) {
			throw new CatalogValidationError(
				"Item slug must be lowercase alphanumeric with hyphens, 1-128 characters."
			);
		}
		if (request.status !== undefined && !isValidItemStatus(request.status)) {
			throw new CatalogValidationError(
				`Invalid item status: ${request.status}.`
			);
		}

		if (request.slug !== undefined) {
			const existing = this.repository.getItemBySlug(tenantId, request.slug);
			if (existing && existing.id !== itemId) {
				throw new CatalogSlugConflictError(
					`Item slug '${request.slug}' already exists for this tenant.`
				);
			}
		}

		const updated = this.repository.updateItem(tenantId, itemId, request);
		if (!updated) {
			throw new CatalogNotFoundError(`Item ${itemId} not found.`);
		}
		return updated;
	}

	deleteItem(tenantId: string, itemId: string): void {
		const deleted = this.repository.deleteItem(tenantId, itemId);
		if (!deleted) {
			throw new CatalogNotFoundError(`Item ${itemId} not found.`);
		}
	}

	// -----------------------------------------------------------------------
	// Variants
	// -----------------------------------------------------------------------

	listVariants(tenantId: string, itemId: string): ItemVariant[] {
		return this.repository.listVariants(tenantId, itemId);
	}

	createVariant(
		tenantId: string,
		itemId: string,
		request: CreateItemVariantRequest
	): ItemVariant {
		if (!request.name || request.name.trim().length === 0) {
			throw new CatalogValidationError("Variant name is required.");
		}
		if (!isValidPriceCents(request.priceCents)) {
			throw new CatalogValidationError(
				"Variant priceCents must be a non-negative integer."
			);
		}

		const item = this.repository.getItemById(tenantId, itemId);
		if (!item) {
			throw new CatalogNotFoundError(`Item ${itemId} not found.`);
		}

		return this.repository.createVariant(tenantId, itemId, request);
	}

	updateVariant(
		tenantId: string,
		variantId: string,
		request: UpdateItemVariantRequest
	): ItemVariant {
		if (request.name !== undefined && request.name.trim().length === 0) {
			throw new CatalogValidationError("Variant name cannot be empty.");
		}
		if (request.priceCents !== undefined && !isValidPriceCents(request.priceCents)) {
			throw new CatalogValidationError(
				"Variant priceCents must be a non-negative integer."
			);
		}

		const updated = this.repository.updateVariant(tenantId, variantId, request);
		if (!updated) {
			throw new CatalogNotFoundError(`Variant ${variantId} not found.`);
		}
		return updated;
	}

	deleteVariant(tenantId: string, variantId: string): void {
		const deleted = this.repository.deleteVariant(tenantId, variantId);
		if (!deleted) {
			throw new CatalogNotFoundError(`Variant ${variantId} not found.`);
		}
	}

	// -----------------------------------------------------------------------
	// Modifiers
	// -----------------------------------------------------------------------

	listModifiers(tenantId: string, itemId: string): ItemModifier[] {
		return this.repository.listModifiers(tenantId, itemId);
	}

	createModifier(
		tenantId: string,
		itemId: string,
		request: CreateItemModifierRequest
	): ItemModifier {
		if (!request.name || request.name.trim().length === 0) {
			throw new CatalogValidationError("Modifier name is required.");
		}
		if (!isValidPriceCents(request.priceCents)) {
			throw new CatalogValidationError(
				"Modifier priceCents must be a non-negative integer."
			);
		}

		const item = this.repository.getItemById(tenantId, itemId);
		if (!item) {
			throw new CatalogNotFoundError(`Item ${itemId} not found.`);
		}

		return this.repository.createModifier(tenantId, itemId, request);
	}

	updateModifier(
		tenantId: string,
		modifierId: string,
		request: UpdateItemModifierRequest
	): ItemModifier {
		if (request.name !== undefined && request.name.trim().length === 0) {
			throw new CatalogValidationError("Modifier name cannot be empty.");
		}
		if (request.priceCents !== undefined && !isValidPriceCents(request.priceCents)) {
			throw new CatalogValidationError(
				"Modifier priceCents must be a non-negative integer."
			);
		}

		const updated = this.repository.updateModifier(tenantId, modifierId, request);
		if (!updated) {
			throw new CatalogNotFoundError(`Modifier ${modifierId} not found.`);
		}
		return updated;
	}

	deleteModifier(tenantId: string, modifierId: string): void {
		const deleted = this.repository.deleteModifier(tenantId, modifierId);
		if (!deleted) {
			throw new CatalogNotFoundError(`Modifier ${modifierId} not found.`);
		}
	}

	// -----------------------------------------------------------------------
	// Media
	// -----------------------------------------------------------------------

	listMedia(tenantId: string, itemId: string): MediaReference[] {
		return this.repository.listMedia(tenantId, itemId);
	}

	createMedia(
		tenantId: string,
		itemId: string,
		request: { url: string; altText?: string; displayOrder?: number }
	): MediaReference {
		if (!request.url || request.url.trim().length === 0) {
			throw new CatalogValidationError("Media URL is required.");
		}

		const item = this.repository.getItemById(tenantId, itemId);
		if (!item) {
			throw new CatalogNotFoundError(`Item ${itemId} not found.`);
		}

		return this.repository.createMedia(tenantId, itemId, request);
	}

	deleteMedia(tenantId: string, mediaId: string): void {
		const deleted = this.repository.deleteMedia(tenantId, mediaId);
		if (!deleted) {
			throw new CatalogNotFoundError(`Media ${mediaId} not found.`);
		}
	}
}
