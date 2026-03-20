import type {
	CatalogListQuery,
	CatalogListResponse,
	Category,
	CreateCategoryRequest,
	CreateItemModifierRequest,
	CreateItemRequest,
	CreateItemVariantRequest,
	Item,
	ItemModifier,
	ItemVariant,
	MediaReference,
	UpdateCategoryRequest,
	UpdateItemModifierRequest,
	UpdateItemRequest,
	UpdateItemVariantRequest
} from "@platform/types";

// ---------------------------------------------------------------------------
// In-memory catalog repository for tenant-scoped CRUD
// ---------------------------------------------------------------------------

const categoryCounter = { value: 0 };
const itemCounter = { value: 0 };
const variantCounter = { value: 0 };
const modifierCounter = { value: 0 };
const mediaCounter = { value: 0 };

function nextId(prefix: string, counter: { value: number }): string {
	counter.value += 1;
	return `${prefix}-${counter.value}`;
}

function now(): string {
	return new Date().toISOString();
}

function applyPagination<T>(
	all: T[],
	query: CatalogListQuery
): CatalogListResponse<T> {
	const page = query.page ?? 1;
	const pageSize = query.pageSize ?? 20;
	const start = (page - 1) * pageSize;
	return {
		items: all.slice(start, start + pageSize),
		page,
		pageSize,
		total: all.length
	};
}

export class CatalogRepository {
	private categories: Category[] = [];
	private itemRecords: Item[] = [];
	private variants: ItemVariant[] = [];
	private modifiers: ItemModifier[] = [];
	private media: MediaReference[] = [];

	// -----------------------------------------------------------------------
	// Categories
	// -----------------------------------------------------------------------

	listCategories(tenantId: string, query: CatalogListQuery): CatalogListResponse<Category> {
		let filtered = this.categories.filter((c) => c.tenantId === tenantId);
		if (query.status) {
			filtered = filtered.filter((c) => c.status === query.status);
		}
		if (query.search) {
			const term = query.search.toLowerCase();
			filtered = filtered.filter(
				(c) =>
					c.name.toLowerCase().includes(term) ||
					c.slug.toLowerCase().includes(term)
			);
		}
		filtered.sort((a, b) => a.displayOrder - b.displayOrder);
		return applyPagination(filtered, query);
	}

	getCategoryById(tenantId: string, categoryId: string): Category | undefined {
		return this.categories.find(
			(c) => c.tenantId === tenantId && c.id === categoryId
		);
	}

	getCategoryBySlug(tenantId: string, slug: string): Category | undefined {
		return this.categories.find(
			(c) => c.tenantId === tenantId && c.slug === slug
		);
	}

	createCategory(tenantId: string, request: CreateCategoryRequest): Category {
		const timestamp = now();
		const category: Category = {
			createdAt: timestamp,
			description: request.description,
			displayOrder: request.displayOrder ?? 0,
			id: nextId("cat", categoryCounter),
			imageUrl: request.imageUrl,
			name: request.name,
			parentCategoryId: request.parentCategoryId,
			slug: request.slug,
			status: "active",
			tenantId,
			updatedAt: timestamp
		};
		this.categories.push(category);
		return category;
	}

	updateCategory(
		tenantId: string,
		categoryId: string,
		request: UpdateCategoryRequest
	): Category | undefined {
		const category = this.getCategoryById(tenantId, categoryId);
		if (!category) return undefined;

		if (request.name !== undefined) category.name = request.name;
		if (request.slug !== undefined) category.slug = request.slug;
		if (request.description !== undefined) category.description = request.description;
		if (request.displayOrder !== undefined) category.displayOrder = request.displayOrder;
		if (request.parentCategoryId !== undefined) category.parentCategoryId = request.parentCategoryId;
		if (request.imageUrl !== undefined) category.imageUrl = request.imageUrl;
		if (request.status !== undefined) category.status = request.status;
		category.updatedAt = now();

		return category;
	}

	deleteCategory(tenantId: string, categoryId: string): boolean {
		const index = this.categories.findIndex(
			(c) => c.tenantId === tenantId && c.id === categoryId
		);
		if (index === -1) return false;
		this.categories.splice(index, 1);
		return true;
	}

	// -----------------------------------------------------------------------
	// Items
	// -----------------------------------------------------------------------

	listItems(tenantId: string, query: CatalogListQuery & { categoryId?: string }): CatalogListResponse<Item> {
		let filtered = this.itemRecords.filter((i) => i.tenantId === tenantId);
		if (query.categoryId) {
			filtered = filtered.filter((i) => i.categoryId === query.categoryId);
		}
		if (query.status) {
			filtered = filtered.filter((i) => i.status === query.status);
		}
		if (query.search) {
			const term = query.search.toLowerCase();
			filtered = filtered.filter(
				(i) =>
					i.name.toLowerCase().includes(term) ||
					i.slug.toLowerCase().includes(term)
			);
		}
		filtered.sort((a, b) => a.displayOrder - b.displayOrder);
		return applyPagination(filtered, query);
	}

	getItemById(tenantId: string, itemId: string): Item | undefined {
		return this.itemRecords.find((i) => i.tenantId === tenantId && i.id === itemId);
	}

	getItemBySlug(tenantId: string, slug: string): Item | undefined {
		return this.itemRecords.find((i) => i.tenantId === tenantId && i.slug === slug);
	}

	createItem(tenantId: string, request: CreateItemRequest): Item {
		const timestamp = now();
		const item: Item = {
			categoryId: request.categoryId,
			createdAt: timestamp,
			description: request.description,
			displayOrder: request.displayOrder ?? 0,
			id: nextId("item", itemCounter),
			name: request.name,
			slug: request.slug,
			status: "draft",
			tenantId,
			updatedAt: timestamp
		};
		this.itemRecords.push(item);

		for (const v of request.variants) {
			this.createVariant(tenantId, item.id, v);
		}

		if (request.modifiers) {
			for (const m of request.modifiers) {
				this.createModifier(tenantId, item.id, m);
			}
		}

		return item;
	}

	updateItem(
		tenantId: string,
		itemId: string,
		request: UpdateItemRequest
	): Item | undefined {
		const item = this.getItemById(tenantId, itemId);
		if (!item) return undefined;

		if (request.categoryId !== undefined) item.categoryId = request.categoryId;
		if (request.name !== undefined) item.name = request.name;
		if (request.slug !== undefined) item.slug = request.slug;
		if (request.description !== undefined) item.description = request.description;
		if (request.displayOrder !== undefined) item.displayOrder = request.displayOrder;
		if (request.status !== undefined) item.status = request.status;
		item.updatedAt = now();

		return item;
	}

	deleteItem(tenantId: string, itemId: string): boolean {
		const index = this.itemRecords.findIndex(
			(i) => i.tenantId === tenantId && i.id === itemId
		);
		if (index === -1) return false;
		this.itemRecords.splice(index, 1);
		this.variants = this.variants.filter(
			(v) => !(v.tenantId === tenantId && v.itemId === itemId)
		);
		this.modifiers = this.modifiers.filter(
			(m) => !(m.tenantId === tenantId && m.itemId === itemId)
		);
		this.media = this.media.filter(
			(m) => !(m.tenantId === tenantId && m.itemId === itemId)
		);
		return true;
	}

	// -----------------------------------------------------------------------
	// Variants
	// -----------------------------------------------------------------------

	listVariants(tenantId: string, itemId: string): ItemVariant[] {
		return this.variants
			.filter((v) => v.tenantId === tenantId && v.itemId === itemId)
			.sort((a, b) => a.displayOrder - b.displayOrder);
	}

	getVariantById(tenantId: string, variantId: string): ItemVariant | undefined {
		return this.variants.find(
			(v) => v.tenantId === tenantId && v.id === variantId
		);
	}

	createVariant(
		tenantId: string,
		itemId: string,
		request: CreateItemVariantRequest
	): ItemVariant {
		const timestamp = now();
		const variant: ItemVariant = {
			createdAt: timestamp,
			displayOrder: request.displayOrder ?? 0,
			id: nextId("var", variantCounter),
			isDefault: request.isDefault,
			itemId,
			name: request.name,
			priceCents: request.priceCents,
			tenantId,
			updatedAt: timestamp
		};
		this.variants.push(variant);
		return variant;
	}

	updateVariant(
		tenantId: string,
		variantId: string,
		request: UpdateItemVariantRequest
	): ItemVariant | undefined {
		const variant = this.getVariantById(tenantId, variantId);
		if (!variant) return undefined;

		if (request.name !== undefined) variant.name = request.name;
		if (request.priceCents !== undefined) variant.priceCents = request.priceCents;
		if (request.isDefault !== undefined) variant.isDefault = request.isDefault;
		if (request.displayOrder !== undefined) variant.displayOrder = request.displayOrder;
		variant.updatedAt = now();

		return variant;
	}

	deleteVariant(tenantId: string, variantId: string): boolean {
		const index = this.variants.findIndex(
			(v) => v.tenantId === tenantId && v.id === variantId
		);
		if (index === -1) return false;
		this.variants.splice(index, 1);
		return true;
	}

	// -----------------------------------------------------------------------
	// Modifiers
	// -----------------------------------------------------------------------

	listModifiers(tenantId: string, itemId: string): ItemModifier[] {
		return this.modifiers
			.filter((m) => m.tenantId === tenantId && m.itemId === itemId)
			.sort((a, b) => a.displayOrder - b.displayOrder);
	}

	getModifierById(tenantId: string, modifierId: string): ItemModifier | undefined {
		return this.modifiers.find(
			(m) => m.tenantId === tenantId && m.id === modifierId
		);
	}

	createModifier(
		tenantId: string,
		itemId: string,
		request: CreateItemModifierRequest
	): ItemModifier {
		const timestamp = now();
		const modifier: ItemModifier = {
			createdAt: timestamp,
			displayOrder: request.displayOrder ?? 0,
			id: nextId("mod", modifierCounter),
			isRequired: request.isRequired,
			itemId,
			name: request.name,
			priceCents: request.priceCents,
			tenantId,
			updatedAt: timestamp
		};
		this.modifiers.push(modifier);
		return modifier;
	}

	updateModifier(
		tenantId: string,
		modifierId: string,
		request: UpdateItemModifierRequest
	): ItemModifier | undefined {
		const modifier = this.getModifierById(tenantId, modifierId);
		if (!modifier) return undefined;

		if (request.name !== undefined) modifier.name = request.name;
		if (request.priceCents !== undefined) modifier.priceCents = request.priceCents;
		if (request.isRequired !== undefined) modifier.isRequired = request.isRequired;
		if (request.displayOrder !== undefined) modifier.displayOrder = request.displayOrder;
		modifier.updatedAt = now();

		return modifier;
	}

	deleteModifier(tenantId: string, modifierId: string): boolean {
		const index = this.modifiers.findIndex(
			(m) => m.tenantId === tenantId && m.id === modifierId
		);
		if (index === -1) return false;
		this.modifiers.splice(index, 1);
		return true;
	}

	// -----------------------------------------------------------------------
	// Media References
	// -----------------------------------------------------------------------

	listMedia(tenantId: string, itemId: string): MediaReference[] {
		return this.media
			.filter((m) => m.tenantId === tenantId && m.itemId === itemId)
			.sort((a, b) => a.displayOrder - b.displayOrder);
	}

	createMedia(
		tenantId: string,
		itemId: string,
		request: { url: string; altText?: string; displayOrder?: number }
	): MediaReference {
		const timestamp = now();
		const ref: MediaReference = {
			altText: request.altText,
			createdAt: timestamp,
			displayOrder: request.displayOrder ?? 0,
			id: nextId("media", mediaCounter),
			itemId,
			tenantId,
			updatedAt: timestamp,
			url: request.url
		};
		this.media.push(ref);
		return ref;
	}

	deleteMedia(tenantId: string, mediaId: string): boolean {
		const index = this.media.findIndex(
			(m) => m.tenantId === tenantId && m.id === mediaId
		);
		if (index === -1) return false;
		this.media.splice(index, 1);
		return true;
	}
}
