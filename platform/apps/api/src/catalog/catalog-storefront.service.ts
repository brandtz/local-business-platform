import { Injectable } from "@nestjs/common";

import type {
	CatalogItemMediaRecord,
	CatalogItemRecord,
	ModifierGroupRecord,
	ModifierOptionRecord,
	StorefrontCatalogItem,
	StorefrontCategoryListing,
	StorefrontModifierGroup,
	CatalogCategoryRecord
} from "@platform/types";

@Injectable()
export class CatalogStorefrontService {
	/**
	 * Assemble storefront catalog items from active, published items with their
	 * media and modifier data. Only tenant-scoped, active+published items are included.
	 */
	assembleStorefrontItems(
		items: readonly CatalogItemRecord[],
		categories: readonly CatalogCategoryRecord[],
		media: readonly CatalogItemMediaRecord[],
		modifierGroups: readonly ModifierGroupRecord[],
		modifierOptions: readonly ModifierOptionRecord[],
		tenantId: string
	): StorefrontCatalogItem[] {
		const activePublished = items.filter(
			(i) =>
				i.tenantId === tenantId &&
				i.status === "active" &&
				i.visibility === "published"
		);

		return activePublished
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((item) => {
				const category = categories.find((c) => c.id === item.categoryId);
				const itemMedia = media
					.filter((m) => m.itemId === item.id)
					.sort((a, b) => a.sortOrder - b.sortOrder);
				const itemGroups = modifierGroups
					.filter((g) => g.itemId === item.id)
					.sort((a, b) => a.sortOrder - b.sortOrder);

				const storefrontGroups: StorefrontModifierGroup[] = itemGroups.map((group) => ({
					id: group.id,
					isRequired: group.isRequired,
					maxSelections: group.maxSelections,
					minSelections: group.minSelections,
					name: group.name,
					options: modifierOptions
						.filter((o) => o.groupId === group.id)
						.sort((a, b) => a.sortOrder - b.sortOrder),
					selectionMode: group.selectionMode,
				}));

				return {
					categoryId: item.categoryId,
					categoryName: category?.name ?? "",
					compareAtPrice: item.compareAtPrice,
					description: item.description,
					id: item.id,
					media: itemMedia,
					modifierGroups: storefrontGroups,
					name: item.name,
					price: item.price,
					slug: item.slug,
				};
			});
	}

	assembleCategoryListings(
		categories: readonly CatalogCategoryRecord[],
		items: readonly CatalogItemRecord[],
		tenantId: string
	): StorefrontCategoryListing[] {
		const tenantCategories = categories
			.filter((c) => c.tenantId === tenantId)
			.sort((a, b) => a.sortOrder - b.sortOrder);

		return tenantCategories.map((cat) => ({
			description: cat.description,
			id: cat.id,
			imageUrl: cat.imageUrl,
			itemCount: items.filter(
				(i) =>
					i.categoryId === cat.id &&
					i.status === "active" &&
					i.visibility === "published"
			).length,
			name: cat.name,
			slug: cat.slug,
		}));
	}
}
