import { describe, expect, it } from "vitest";

import type { CatalogItemRecord } from "@platform/types";

import { CatalogItemError, CatalogItemService } from "./catalog-item.service";

const service = new CatalogItemService();

const tenantId = "tenant-1";

const items: CatalogItemRecord[] = [
	{
		id: "item-1", tenantId, categoryId: "cat-1", name: "Margherita Pizza",
		slug: "margherita-pizza", description: "Classic pizza", price: 1299,
		compareAtPrice: null, sortOrder: 0, status: "active", visibility: "published",
		stockQuantity: 50, lowStockThreshold: 5
	},
	{
		id: "item-2", tenantId, categoryId: "cat-1", name: "Pepperoni Pizza",
		slug: "pepperoni-pizza", description: "Spicy pepperoni", price: 1499,
		compareAtPrice: 1799, sortOrder: 1, status: "active", visibility: "published",
		stockQuantity: 3, lowStockThreshold: 5
	},
	{
		id: "item-3", tenantId, categoryId: "cat-2", name: "Caesar Salad",
		slug: "caesar-salad", description: null, price: 899,
		compareAtPrice: null, sortOrder: 0, status: "inactive", visibility: "draft",
		stockQuantity: null, lowStockThreshold: null
	},
];

describe("catalog item service", () => {
	describe("validateCreate", () => {
		it("accepts valid item input with unique slug", () => {
			const result = service.validateCreate(
				{ name: "New Item", slug: "new-item", price: 999, tenantId, categoryId: "cat-1" },
				["margherita-pizza"]
			);
			expect(result.valid).toBe(true);
		});

		it("rejects negative price", () => {
			const result = service.validateCreate(
				{ name: "Bad Item", slug: "bad-item", price: -100, tenantId, categoryId: "cat-1" },
				[]
			);
			expect(result.valid).toBe(false);
		});

		it("rejects duplicate slug", () => {
			const result = service.validateCreate(
				{ name: "Dupe", slug: "margherita-pizza", price: 999, tenantId, categoryId: "cat-1" },
				["margherita-pizza"]
			);
			expect(result.valid).toBe(false);
		});

		it("rejects compare-at price less than or equal to regular price", () => {
			const result = service.validateCreate(
				{ name: "Item", slug: "item", price: 1000, compareAtPrice: 500, tenantId, categoryId: "cat-1" },
				[]
			);
			expect(result.valid).toBe(false);
		});
	});

	describe("status transitions", () => {
		it("allows active to inactive", () => {
			expect(service.validateStatusTransition("active", "inactive")).toBe(true);
		});

		it("allows inactive to active", () => {
			expect(service.validateStatusTransition("inactive", "active")).toBe(true);
		});

		it("rejects same-state transition", () => {
			expect(service.validateStatusTransition("active", "active")).toBe(false);
		});

		it("requireStatusTransition throws for invalid transition", () => {
			expect(() => service.requireStatusTransition("active", "active")).toThrow(CatalogItemError);
		});
	});

	describe("visibility transitions", () => {
		it("allows draft to published and back", () => {
			expect(service.validateVisibilityTransition("draft", "published")).toBe(true);
			expect(service.validateVisibilityTransition("published", "draft")).toBe(true);
		});

		it("rejects same-state transition", () => {
			expect(service.validateVisibilityTransition("draft", "draft")).toBe(false);
		});
	});

	describe("filterItems", () => {
		it("filters by tenant", () => {
			const otherTenant = { ...items[0], id: "item-other", tenantId: "tenant-2" };
			const result = service.filterItems([...items, otherTenant], tenantId);
			expect(result).toHaveLength(3);
		});

		it("filters by category", () => {
			const result = service.filterItems(items, tenantId, { categoryId: "cat-1" });
			expect(result).toHaveLength(2);
		});

		it("filters by status", () => {
			const result = service.filterItems(items, tenantId, { status: "inactive" });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("item-3");
		});

		it("filters by search term in name and description", () => {
			const result = service.filterItems(items, tenantId, { search: "pepperoni" });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("item-2");
		});
	});

	describe("sortItems", () => {
		it("sorts by price ascending", () => {
			const result = service.sortItems([...items], "price", "asc");
			expect(result.map((i) => i.id)).toEqual(["item-3", "item-1", "item-2"]);
		});

		it("sorts by name descending", () => {
			const result = service.sortItems([...items], "name", "desc");
			expect(result[0].name).toBe("Pepperoni Pizza");
		});
	});

	describe("computeSortOrderForAppend", () => {
		it("returns 0 for empty list", () => {
			expect(service.computeSortOrderForAppend([])).toBe(0);
		});

		it("returns max + 1", () => {
			expect(service.computeSortOrderForAppend(items)).toBe(2);
		});
	});
});
