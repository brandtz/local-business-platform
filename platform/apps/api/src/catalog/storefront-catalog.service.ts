import { Injectable } from "@nestjs/common";
import type {
	StorefrontCatalogResponse,
	StorefrontCategory,
	StorefrontItem,
	StorefrontItemModifier,
	StorefrontItemVariant,
	StorefrontMediaReference
} from "@platform/types";

import { CatalogRepository } from "./catalog.repository";

// ---------------------------------------------------------------------------
// Storefront read-model service
// ---------------------------------------------------------------------------

@Injectable()
export class StorefrontCatalogService {
	constructor(
		private readonly repository: CatalogRepository = new CatalogRepository()
	) {}

	getActiveCatalog(tenantId: string): StorefrontCatalogResponse {
		const categoriesResult = this.repository.listCategories(tenantId, {
			status: "active",
			pageSize: 100
		});

		const categories: StorefrontCategory[] = categoriesResult.items.map(
			(category) => {
				const itemsResult = this.repository.listItems(tenantId, {
					categoryId: category.id,
					status: "active",
					pageSize: 100
				});

				const storefrontItems: StorefrontItem[] = itemsResult.items.map(
					(item) => this.mapItem(tenantId, item.id, item.name, item.slug, item.description, item.displayOrder)
				);

				return {
					description: category.description,
					displayOrder: category.displayOrder,
					id: category.id,
					imageUrl: category.imageUrl,
					items: storefrontItems,
					name: category.name,
					slug: category.slug
				};
			}
		);

		categories.sort((a, b) => a.displayOrder - b.displayOrder);

		return { categories };
	}

	getActiveItem(
		tenantId: string,
		itemSlug: string
	): StorefrontItem | undefined {
		const allItems = this.repository.listItems(tenantId, {
			status: "active",
			pageSize: 100
		});

		const item = allItems.items.find((i) => i.slug === itemSlug);
		if (!item) return undefined;

		return this.mapItem(tenantId, item.id, item.name, item.slug, item.description, item.displayOrder);
	}

	private mapItem(
		tenantId: string,
		itemId: string,
		name: string,
		slug: string,
		description: string | undefined,
		displayOrder: number
	): StorefrontItem {
		const variants = this.repository.listVariants(tenantId, itemId);
		const modifiers = this.repository.listModifiers(tenantId, itemId);
		const media = this.repository.listMedia(tenantId, itemId);

		const storefrontVariants: StorefrontItemVariant[] = variants.map((v) => ({
			displayOrder: v.displayOrder,
			id: v.id,
			isDefault: v.isDefault,
			name: v.name,
			priceCents: v.priceCents
		}));

		const storefrontModifiers: StorefrontItemModifier[] = modifiers.map((m) => ({
			displayOrder: m.displayOrder,
			id: m.id,
			isRequired: m.isRequired,
			name: m.name,
			priceCents: m.priceCents
		}));

		const storefrontMedia: StorefrontMediaReference[] = media.map((m) => ({
			altText: m.altText,
			displayOrder: m.displayOrder,
			id: m.id,
			url: m.url
		}));

		return {
			description,
			displayOrder,
			id: itemId,
			media: storefrontMedia,
			modifiers: storefrontModifiers,
			name,
			slug,
			variants: storefrontVariants
		};
	}
}
