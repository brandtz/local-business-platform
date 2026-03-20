import { describe, expect, it } from "vitest";

import {
	assertValidCatalogListQuery,
	assertValidCreateCategoryRequest,
	assertValidCreateItemModifierRequest,
	assertValidCreateItemRequest,
	assertValidCreateItemVariantRequest,
	assertValidUpdateCategoryRequest,
	assertValidUpdateItemModifierRequest,
	assertValidUpdateItemRequest,
	assertValidUpdateItemVariantRequest,
	CatalogApiContractError
} from "./catalog-api-contracts";

describe("catalog API contracts", () => {
	// -----------------------------------------------------------------------
	// Create category
	// -----------------------------------------------------------------------

	describe("assertValidCreateCategoryRequest", () => {
		it("accepts a valid create category payload", () => {
			expect(() =>
				assertValidCreateCategoryRequest({
					name: "Appetizers",
					slug: "appetizers"
				})
			).not.toThrow();
		});

		it("accepts optional fields", () => {
			expect(() =>
				assertValidCreateCategoryRequest({
					description: "Starter dishes",
					displayOrder: 1,
					imageUrl: "https://cdn.example.com/image.jpg",
					name: "Appetizers",
					parentCategoryId: "parent-1",
					slug: "appetizers"
				})
			).not.toThrow();
		});

		it("rejects non-object payload", () => {
			expect(() => assertValidCreateCategoryRequest("string")).toThrow(CatalogApiContractError);
			expect(() => assertValidCreateCategoryRequest(null)).toThrow(CatalogApiContractError);
		});

		it("rejects missing name", () => {
			expect(() =>
				assertValidCreateCategoryRequest({ slug: "test" })
			).toThrow(CatalogApiContractError);
		});

		it("rejects missing slug", () => {
			expect(() =>
				assertValidCreateCategoryRequest({ name: "Test" })
			).toThrow(CatalogApiContractError);
		});

		it("rejects invalid slug format", () => {
			expect(() =>
				assertValidCreateCategoryRequest({ name: "Test", slug: "INVALID SLUG" })
			).toThrow(CatalogApiContractError);
		});

		it("rejects invalid displayOrder", () => {
			expect(() =>
				assertValidCreateCategoryRequest({ displayOrder: -1, name: "Test", slug: "test" })
			).toThrow(CatalogApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Update category
	// -----------------------------------------------------------------------

	describe("assertValidUpdateCategoryRequest", () => {
		it("accepts a valid update category payload", () => {
			expect(() =>
				assertValidUpdateCategoryRequest({ name: "Updated" })
			).not.toThrow();
		});

		it("accepts status update", () => {
			expect(() =>
				assertValidUpdateCategoryRequest({ status: "archived" })
			).not.toThrow();
		});

		it("rejects invalid status", () => {
			expect(() =>
				assertValidUpdateCategoryRequest({ status: "invalid" })
			).toThrow(CatalogApiContractError);
		});

		it("rejects empty name", () => {
			expect(() =>
				assertValidUpdateCategoryRequest({ name: "" })
			).toThrow(CatalogApiContractError);
		});

		it("rejects invalid slug format on update", () => {
			expect(() =>
				assertValidUpdateCategoryRequest({ slug: "BAD SLUG" })
			).toThrow(CatalogApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Create item
	// -----------------------------------------------------------------------

	describe("assertValidCreateItemRequest", () => {
		it("accepts a valid create item payload", () => {
			expect(() =>
				assertValidCreateItemRequest({
					categoryId: "cat-1",
					name: "Burger",
					slug: "burger",
					variants: [
						{ isDefault: true, name: "Regular", priceCents: 1200 }
					]
				})
			).not.toThrow();
		});

		it("accepts item with modifiers", () => {
			expect(() =>
				assertValidCreateItemRequest({
					categoryId: "cat-1",
					modifiers: [
						{ isRequired: false, name: "Extra Cheese", priceCents: 200 }
					],
					name: "Pizza",
					slug: "pizza",
					variants: [
						{ isDefault: true, name: "Regular", priceCents: 1200 }
					]
				})
			).not.toThrow();
		});

		it("rejects empty variants array", () => {
			expect(() =>
				assertValidCreateItemRequest({
					categoryId: "cat-1",
					name: "Burger",
					slug: "burger",
					variants: []
				})
			).toThrow(CatalogApiContractError);
		});

		it("rejects variant with negative price", () => {
			expect(() =>
				assertValidCreateItemRequest({
					categoryId: "cat-1",
					name: "Burger",
					slug: "burger",
					variants: [
						{ isDefault: true, name: "Regular", priceCents: -100 }
					]
				})
			).toThrow(CatalogApiContractError);
		});

		it("rejects variant missing isDefault", () => {
			expect(() =>
				assertValidCreateItemRequest({
					categoryId: "cat-1",
					name: "Burger",
					slug: "burger",
					variants: [
						{ name: "Regular", priceCents: 1200 }
					]
				})
			).toThrow(CatalogApiContractError);
		});

		it("rejects modifier with non-boolean isRequired", () => {
			expect(() =>
				assertValidCreateItemRequest({
					categoryId: "cat-1",
					modifiers: [
						{ isRequired: "yes", name: "Extra", priceCents: 200 }
					],
					name: "Pizza",
					slug: "pizza",
					variants: [
						{ isDefault: true, name: "Regular", priceCents: 1200 }
					]
				})
			).toThrow(CatalogApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Update item
	// -----------------------------------------------------------------------

	describe("assertValidUpdateItemRequest", () => {
		it("accepts a valid update item payload", () => {
			expect(() =>
				assertValidUpdateItemRequest({ name: "Updated Burger" })
			).not.toThrow();
		});

		it("accepts status transition", () => {
			expect(() =>
				assertValidUpdateItemRequest({ status: "active" })
			).not.toThrow();
		});

		it("rejects invalid status", () => {
			expect(() =>
				assertValidUpdateItemRequest({ status: "invalid" })
			).toThrow(CatalogApiContractError);
		});

		it("rejects invalid slug format", () => {
			expect(() =>
				assertValidUpdateItemRequest({ slug: "INVALID" })
			).toThrow(CatalogApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Variant contracts
	// -----------------------------------------------------------------------

	describe("assertValidCreateItemVariantRequest", () => {
		it("accepts a valid create variant payload", () => {
			expect(() =>
				assertValidCreateItemVariantRequest({
					isDefault: true,
					name: "Large",
					priceCents: 1800
				})
			).not.toThrow();
		});

		it("rejects negative price", () => {
			expect(() =>
				assertValidCreateItemVariantRequest({
					isDefault: true,
					name: "Large",
					priceCents: -1
				})
			).toThrow(CatalogApiContractError);
		});
	});

	describe("assertValidUpdateItemVariantRequest", () => {
		it("accepts a valid update variant payload", () => {
			expect(() =>
				assertValidUpdateItemVariantRequest({ priceCents: 2000 })
			).not.toThrow();
		});

		it("rejects non-integer price", () => {
			expect(() =>
				assertValidUpdateItemVariantRequest({ priceCents: 19.99 })
			).toThrow(CatalogApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Modifier contracts
	// -----------------------------------------------------------------------

	describe("assertValidCreateItemModifierRequest", () => {
		it("accepts a valid create modifier payload", () => {
			expect(() =>
				assertValidCreateItemModifierRequest({
					isRequired: false,
					name: "Extra Cheese",
					priceCents: 200
				})
			).not.toThrow();
		});

		it("rejects missing isRequired", () => {
			expect(() =>
				assertValidCreateItemModifierRequest({
					name: "Extra Cheese",
					priceCents: 200
				})
			).toThrow(CatalogApiContractError);
		});
	});

	describe("assertValidUpdateItemModifierRequest", () => {
		it("accepts a valid update modifier payload", () => {
			expect(() =>
				assertValidUpdateItemModifierRequest({ name: "Updated" })
			).not.toThrow();
		});

		it("rejects empty name", () => {
			expect(() =>
				assertValidUpdateItemModifierRequest({ name: "" })
			).toThrow(CatalogApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// List query
	// -----------------------------------------------------------------------

	describe("assertValidCatalogListQuery", () => {
		it("accepts a valid query", () => {
			expect(() =>
				assertValidCatalogListQuery({ page: 1, pageSize: 20 })
			).not.toThrow();
		});

		it("accepts empty query", () => {
			expect(() => assertValidCatalogListQuery({})).not.toThrow();
		});

		it("rejects page less than 1", () => {
			expect(() =>
				assertValidCatalogListQuery({ page: 0 })
			).toThrow(CatalogApiContractError);
		});

		it("rejects pageSize greater than 100", () => {
			expect(() =>
				assertValidCatalogListQuery({ pageSize: 200 })
			).toThrow(CatalogApiContractError);
		});

		it("rejects non-object query", () => {
			expect(() => assertValidCatalogListQuery("string")).toThrow(CatalogApiContractError);
		});
	});
});
