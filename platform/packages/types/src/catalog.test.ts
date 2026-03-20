import { describe, expect, it } from "vitest";

import {
	categoryStatuses,
	isValidCategoryStatus,
	isValidItemStatus,
	isValidPriceCents,
	isValidSlug,
	itemStatuses,
	MAX_SLUG_LENGTH,
	type CatalogListResponse,
	type Category,
	type CreateCategoryRequest,
	type CreateItemRequest,
	type Item,
	type ItemModifier,
	type ItemVariant,
	type MediaReference,
	type StorefrontCatalogResponse,
	type StorefrontCategory,
	type StorefrontItem,
	type StorefrontItemModifier,
	type StorefrontItemVariant,
	type StorefrontMediaReference
} from "@platform/types";

describe("catalog types", () => {
	it("exposes item status const array and type guard", () => {
		expect(itemStatuses).toEqual(["draft", "active", "archived"]);
		expect(isValidItemStatus("draft")).toBe(true);
		expect(isValidItemStatus("active")).toBe(true);
		expect(isValidItemStatus("archived")).toBe(true);
		expect(isValidItemStatus("invalid")).toBe(false);
		expect(isValidItemStatus("")).toBe(false);
	});

	it("exposes category status const array and type guard", () => {
		expect(categoryStatuses).toEqual(["active", "archived"]);
		expect(isValidCategoryStatus("active")).toBe(true);
		expect(isValidCategoryStatus("archived")).toBe(true);
		expect(isValidCategoryStatus("draft")).toBe(false);
		expect(isValidCategoryStatus("")).toBe(false);
	});

	it("validates slugs correctly", () => {
		expect(isValidSlug("my-slug")).toBe(true);
		expect(isValidSlug("a")).toBe(true);
		expect(isValidSlug("a-b-c")).toBe(true);
		expect(isValidSlug("abc123")).toBe(true);
		expect(isValidSlug("my-slug-123")).toBe(true);
		expect(isValidSlug("")).toBe(false);
		expect(isValidSlug("-leading")).toBe(false);
		expect(isValidSlug("trailing-")).toBe(false);
		expect(isValidSlug("UPPER")).toBe(false);
		expect(isValidSlug("has space")).toBe(false);
		expect(isValidSlug("special!char")).toBe(false);
		expect(isValidSlug("a".repeat(MAX_SLUG_LENGTH))).toBe(true);
		expect(isValidSlug("a".repeat(MAX_SLUG_LENGTH + 1))).toBe(false);
	});

	it("validates price cents correctly", () => {
		expect(isValidPriceCents(0)).toBe(true);
		expect(isValidPriceCents(100)).toBe(true);
		expect(isValidPriceCents(999999)).toBe(true);
		expect(isValidPriceCents(-1)).toBe(false);
		expect(isValidPriceCents(1.5)).toBe(false);
		expect(isValidPriceCents(NaN)).toBe(false);
	});

	it("category type shape includes required fields", () => {
		const category: Category = {
			createdAt: "2026-01-01T00:00:00.000Z",
			displayOrder: 0,
			id: "cat-1",
			name: "Appetizers",
			slug: "appetizers",
			status: "active",
			tenantId: "t-1",
			updatedAt: "2026-01-01T00:00:00.000Z"
		};
		expect(category.tenantId).toBe("t-1");
		expect(category.status).toBe("active");
	});

	it("item type shape includes required fields", () => {
		const item: Item = {
			categoryId: "cat-1",
			createdAt: "2026-01-01T00:00:00.000Z",
			displayOrder: 0,
			id: "item-1",
			name: "Bruschetta",
			slug: "bruschetta",
			status: "draft",
			tenantId: "t-1",
			updatedAt: "2026-01-01T00:00:00.000Z"
		};
		expect(item.tenantId).toBe("t-1");
		expect(item.categoryId).toBe("cat-1");
	});

	it("item variant type shape includes required fields", () => {
		const variant: ItemVariant = {
			createdAt: "2026-01-01T00:00:00.000Z",
			displayOrder: 0,
			id: "var-1",
			isDefault: true,
			itemId: "item-1",
			name: "Regular",
			priceCents: 1200,
			tenantId: "t-1",
			updatedAt: "2026-01-01T00:00:00.000Z"
		};
		expect(variant.priceCents).toBe(1200);
		expect(variant.isDefault).toBe(true);
	});

	it("item modifier type shape includes required fields", () => {
		const modifier: ItemModifier = {
			createdAt: "2026-01-01T00:00:00.000Z",
			displayOrder: 0,
			id: "mod-1",
			isRequired: false,
			itemId: "item-1",
			name: "Extra Cheese",
			priceCents: 150,
			tenantId: "t-1",
			updatedAt: "2026-01-01T00:00:00.000Z"
		};
		expect(modifier.priceCents).toBe(150);
		expect(modifier.isRequired).toBe(false);
	});

	it("media reference type shape includes required fields", () => {
		const media: MediaReference = {
			createdAt: "2026-01-01T00:00:00.000Z",
			displayOrder: 0,
			id: "media-1",
			itemId: "item-1",
			tenantId: "t-1",
			updatedAt: "2026-01-01T00:00:00.000Z",
			url: "https://cdn.example.com/image.jpg"
		};
		expect(media.url).toBe("https://cdn.example.com/image.jpg");
		expect(media.tenantId).toBe("t-1");
	});

	it("storefront types omit tenant-internal fields", () => {
		const variant: StorefrontItemVariant = {
			displayOrder: 0,
			id: "var-1",
			isDefault: true,
			name: "Regular",
			priceCents: 1200
		};
		const modifier: StorefrontItemModifier = {
			displayOrder: 0,
			id: "mod-1",
			isRequired: false,
			name: "Extra Cheese",
			priceCents: 150
		};
		const media: StorefrontMediaReference = {
			displayOrder: 0,
			id: "media-1",
			url: "https://cdn.example.com/image.jpg"
		};
		const item: StorefrontItem = {
			displayOrder: 0,
			id: "item-1",
			media: [media],
			modifiers: [modifier],
			name: "Bruschetta",
			slug: "bruschetta",
			variants: [variant]
		};
		const category: StorefrontCategory = {
			displayOrder: 0,
			id: "cat-1",
			items: [item],
			name: "Appetizers",
			slug: "appetizers"
		};
		const response: StorefrontCatalogResponse = {
			categories: [category]
		};

		expect(response.categories).toHaveLength(1);
		expect(response.categories[0].items[0].variants).toHaveLength(1);
		expect(response.categories[0].items[0].modifiers).toHaveLength(1);
		expect(response.categories[0].items[0].media).toHaveLength(1);
	});

	it("create category request type shape matches contract", () => {
		const request: CreateCategoryRequest = {
			name: "Appetizers",
			slug: "appetizers"
		};
		expect(request.name).toBe("Appetizers");
	});

	it("create item request type shape matches contract", () => {
		const request: CreateItemRequest = {
			categoryId: "cat-1",
			name: "Bruschetta",
			slug: "bruschetta",
			variants: [{ isDefault: true, name: "Regular", priceCents: 1200 }]
		};
		expect(request.variants).toHaveLength(1);
	});

	it("catalog list response generic type works", () => {
		const response: CatalogListResponse<Category> = {
			items: [],
			page: 1,
			pageSize: 20,
			total: 0
		};
		expect(response.total).toBe(0);
	});
});
