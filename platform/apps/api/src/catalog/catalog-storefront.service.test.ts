import { describe, expect, it } from "vitest";

import type {
	CatalogCategoryRecord,
	CatalogItemMediaRecord,
	CatalogItemRecord,
	ModifierGroupRecord,
	ModifierOptionRecord
} from "@platform/types";

import { CatalogStorefrontService } from "./catalog-storefront.service";

const service = new CatalogStorefrontService();

const tenantId = "tenant-1";

const categories: CatalogCategoryRecord[] = [
	{ id: "cat-1", tenantId, name: "Pizza", slug: "pizza", sortOrder: 0, description: "Fresh pizza", imageUrl: "/pizza.jpg" },
	{ id: "cat-2", tenantId, name: "Salads", slug: "salads", sortOrder: 1, description: null, imageUrl: null },
];

const items: CatalogItemRecord[] = [
	{
		id: "item-1", tenantId, categoryId: "cat-1", name: "Margherita",
		slug: "margherita", description: "Classic", price: 1299,
		compareAtPrice: 1599, sortOrder: 0, status: "active", visibility: "published",
		stockQuantity: 50, lowStockThreshold: 5
	},
	{
		id: "item-2", tenantId, categoryId: "cat-1", name: "Pepperoni",
		slug: "pepperoni", description: null, price: 1499,
		compareAtPrice: null, sortOrder: 1, status: "active", visibility: "published",
		stockQuantity: null, lowStockThreshold: null
	},
	{
		id: "item-3", tenantId, categoryId: "cat-2", name: "Draft Salad",
		slug: "draft-salad", description: null, price: 899,
		compareAtPrice: null, sortOrder: 0, status: "active", visibility: "draft",
		stockQuantity: null, lowStockThreshold: null
	},
	{
		id: "item-4", tenantId, categoryId: "cat-1", name: "Inactive Pizza",
		slug: "inactive-pizza", description: null, price: 999,
		compareAtPrice: null, sortOrder: 2, status: "inactive", visibility: "published",
		stockQuantity: null, lowStockThreshold: null
	},
];

const media: CatalogItemMediaRecord[] = [
	{ id: "media-1", itemId: "item-1", url: "/img/m1.jpg", altText: "Margherita photo", sortOrder: 0 },
	{ id: "media-2", itemId: "item-1", url: "/img/m2.jpg", altText: null, sortOrder: 1 },
];

const modifierGroups: ModifierGroupRecord[] = [
	{
		id: "mg-1", tenantId, itemId: "item-1", name: "Size",
		selectionMode: "single", isRequired: true, minSelections: 1,
		maxSelections: 1, sortOrder: 0
	},
];

const modifierOptions: ModifierOptionRecord[] = [
	{ id: "mo-1", groupId: "mg-1", name: "Small", priceAdjustment: 0, isDefault: true, sortOrder: 0 },
	{ id: "mo-2", groupId: "mg-1", name: "Large", priceAdjustment: 300, isDefault: false, sortOrder: 1 },
];

describe("catalog storefront service", () => {
	describe("assembleStorefrontItems", () => {
		it("returns only active+published items with assembled media and modifiers", () => {
			const result = service.assembleStorefrontItems(
				items, categories, media, modifierGroups, modifierOptions, tenantId
			);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("Margherita");
			expect(result[0].categoryName).toBe("Pizza");
			expect(result[0].media).toHaveLength(2);
			expect(result[0].modifierGroups).toHaveLength(1);
			expect(result[0].modifierGroups[0].options).toHaveLength(2);
			expect(result[0].compareAtPrice).toBe(1599);
		});

		it("excludes draft and inactive items", () => {
			const result = service.assembleStorefrontItems(
				items, categories, media, modifierGroups, modifierOptions, tenantId
			);
			const ids = result.map((i) => i.id);
			expect(ids).not.toContain("item-3"); // draft
			expect(ids).not.toContain("item-4"); // inactive
		});

		it("scopes to tenant", () => {
			const otherTenantItem: CatalogItemRecord = {
				...items[0], id: "item-other", tenantId: "tenant-2"
			};
			const result = service.assembleStorefrontItems(
				[...items, otherTenantItem], categories, media, modifierGroups, modifierOptions, tenantId
			);
			expect(result.every((i) => !i.id.includes("other"))).toBe(true);
		});
	});

	describe("assembleCategoryListings", () => {
		it("returns categories with active+published item counts", () => {
			const result = service.assembleCategoryListings(categories, items, tenantId);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("Pizza");
			expect(result[0].itemCount).toBe(2); // item-1 and item-2 (not item-4 inactive)
			expect(result[1].name).toBe("Salads");
			expect(result[1].itemCount).toBe(0); // item-3 is draft
		});

		it("preserves sort order", () => {
			const result = service.assembleCategoryListings(categories, items, tenantId);
			expect(result[0].slug).toBe("pizza");
			expect(result[1].slug).toBe("salads");
		});
	});
});
