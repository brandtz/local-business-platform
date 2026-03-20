import { describe, expect, it } from "vitest";

import type { CatalogItemRecord } from "@platform/types";

import { CatalogInventoryService } from "./catalog-inventory.service";

const service = new CatalogInventoryService();

const tenantId = "tenant-1";

const makeItem = (overrides: Partial<CatalogItemRecord> & { id: string }): CatalogItemRecord => ({
	tenantId,
	categoryId: "cat-1",
	name: "Test Item",
	slug: "test-item",
	description: null,
	price: 999,
	compareAtPrice: null,
	sortOrder: 0,
	status: "active",
	visibility: "published",
	stockQuantity: null,
	lowStockThreshold: null,
	...overrides,
});

describe("catalog inventory service", () => {
	describe("getInventoryStatus", () => {
		it("returns untracked when stock is null", () => {
			expect(service.getInventoryStatus(makeItem({ id: "i1" }))).toBe("untracked");
		});

		it("returns out-of-stock when quantity is 0", () => {
			expect(service.getInventoryStatus(makeItem({ id: "i1", stockQuantity: 0 }))).toBe("out-of-stock");
		});

		it("returns low-stock when at or below threshold", () => {
			expect(
				service.getInventoryStatus(makeItem({ id: "i1", stockQuantity: 3, lowStockThreshold: 5 }))
			).toBe("low-stock");
		});

		it("returns in-stock when above threshold", () => {
			expect(
				service.getInventoryStatus(makeItem({ id: "i1", stockQuantity: 50, lowStockThreshold: 5 }))
			).toBe("in-stock");
		});

		it("returns in-stock when no threshold set but quantity > 0", () => {
			expect(
				service.getInventoryStatus(makeItem({ id: "i1", stockQuantity: 10 }))
			).toBe("in-stock");
		});
	});

	describe("findLowStockItems", () => {
		it("returns items at or below their threshold", () => {
			const items = [
				makeItem({ id: "i1", stockQuantity: 3, lowStockThreshold: 5 }),
				makeItem({ id: "i2", stockQuantity: 50, lowStockThreshold: 5 }),
				makeItem({ id: "i3", stockQuantity: null, lowStockThreshold: null }),
				makeItem({ id: "i4", stockQuantity: 0, lowStockThreshold: 5 }), // out of stock, not low
			];
			const result = service.findLowStockItems(items, tenantId);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("i1");
			expect(result[0].stockQuantity).toBe(3);
		});

		it("scopes to tenant", () => {
			const items = [
				makeItem({ id: "i1", stockQuantity: 3, lowStockThreshold: 5 }),
				makeItem({ id: "i2", tenantId: "tenant-2", stockQuantity: 2, lowStockThreshold: 5 }),
			];
			const result = service.findLowStockItems(items, tenantId);
			expect(result).toHaveLength(1);
		});
	});

	describe("findOutOfStockItems", () => {
		it("returns items with zero or negative stock", () => {
			const items = [
				makeItem({ id: "i1", stockQuantity: 0 }),
				makeItem({ id: "i2", stockQuantity: -1 }),
				makeItem({ id: "i3", stockQuantity: 10 }),
				makeItem({ id: "i4", stockQuantity: null }),
			];
			const result = service.findOutOfStockItems(items, tenantId);
			expect(result).toHaveLength(2);
			expect(result.map((i) => i.id)).toEqual(["i1", "i2"]);
		});
	});
});
