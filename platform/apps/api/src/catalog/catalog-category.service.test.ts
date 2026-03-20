import { describe, expect, it } from "vitest";

import type { CatalogCategoryRecord } from "@platform/types";

import { CatalogCategoryError, CatalogCategoryService } from "./catalog-category.service";

const service = new CatalogCategoryService();

const tenantId = "tenant-1";

const categories: CatalogCategoryRecord[] = [
	{ id: "cat-1", tenantId, name: "Appetizers", slug: "appetizers", sortOrder: 0, description: null, imageUrl: null },
	{ id: "cat-2", tenantId, name: "Entrees", slug: "entrees", sortOrder: 1, description: null, imageUrl: null },
	{ id: "cat-3", tenantId, name: "Desserts", slug: "desserts", sortOrder: 2, description: null, imageUrl: null },
];

describe("catalog category service", () => {
	describe("validateCreate", () => {
		it("accepts valid category input with unique slug", () => {
			const result = service.validateCreate(
				{ name: "Drinks", slug: "drinks", tenantId },
				["appetizers", "entrees"]
			);
			expect(result).toEqual({ valid: true });
		});

		it("rejects empty name", () => {
			const result = service.validateCreate(
				{ name: "", slug: "drinks", tenantId },
				[]
			);
			expect(result).toEqual({
				valid: false,
				errors: [{ field: "name", reason: "empty" }]
			});
		});

		it("rejects invalid slug format", () => {
			const result = service.validateCreate(
				{ name: "Drinks", slug: "DRINKS WITH SPACES", tenantId },
				[]
			);
			expect(result).toEqual({
				valid: false,
				errors: [{ field: "slug", reason: "invalid-format" }]
			});
		});

		it("rejects duplicate slug", () => {
			const result = service.validateCreate(
				{ name: "Appetizers Two", slug: "appetizers", tenantId },
				["appetizers"]
			);
			expect(result).toEqual({
				valid: false,
				errors: [{ field: "slug", reason: "duplicate" }]
			});
		});
	});

	describe("computeSortOrderForAppend", () => {
		it("returns 0 for empty list", () => {
			expect(service.computeSortOrderForAppend([])).toBe(0);
		});

		it("returns max + 1 for non-empty list", () => {
			expect(service.computeSortOrderForAppend(categories)).toBe(3);
		});
	});

	describe("reorderCategories", () => {
		it("applies sort-order changes and returns sorted result", () => {
			const result = service.reorderCategories(categories, [
				{ categoryId: "cat-3", newSortOrder: 0 },
				{ categoryId: "cat-1", newSortOrder: 2 },
			]);
			expect(result.map((c) => c.id)).toEqual(["cat-3", "cat-2", "cat-1"]);
			expect(result[0].sortOrder).toBe(0);
			expect(result[2].sortOrder).toBe(2);
		});

		it("throws CatalogCategoryError for unknown category id", () => {
			expect(() =>
				service.reorderCategories(categories, [
					{ categoryId: "cat-99", newSortOrder: 0 }
				])
			).toThrow(CatalogCategoryError);
		});
	});

	describe("filterByTenant", () => {
		it("returns only categories for the specified tenant, sorted", () => {
			const mixed = [
				...categories,
				{ id: "cat-other", tenantId: "tenant-2", name: "Other", slug: "other", sortOrder: 0, description: null, imageUrl: null },
			];
			const result = service.filterByTenant(mixed, tenantId);
			expect(result).toHaveLength(3);
			expect(result.every((c) => c.tenantId === tenantId)).toBe(true);
		});
	});
});
