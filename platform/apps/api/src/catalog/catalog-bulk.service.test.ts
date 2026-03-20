import { describe, expect, it } from "vitest";

import type { CatalogItemRecord } from "@platform/types";

import { CatalogBulkError, CatalogBulkService } from "./catalog-bulk.service";

const service = new CatalogBulkService();

const tenantId = "tenant-1";

const items: CatalogItemRecord[] = [
	{
		id: "item-1", tenantId, categoryId: "cat-1", name: "Item A",
		slug: "item-a", description: null, price: 999, compareAtPrice: null,
		sortOrder: 0, status: "active", visibility: "published",
		stockQuantity: null, lowStockThreshold: null
	},
	{
		id: "item-2", tenantId, categoryId: "cat-1", name: "Item B",
		slug: "item-b", description: null, price: 1299, compareAtPrice: null,
		sortOrder: 1, status: "active", visibility: "draft",
		stockQuantity: null, lowStockThreshold: null
	},
	{
		id: "item-3", tenantId, categoryId: "cat-2", name: "Item C",
		slug: "item-c", description: null, price: 599, compareAtPrice: null,
		sortOrder: 0, status: "inactive", visibility: "draft",
		stockQuantity: null, lowStockThreshold: null
	},
];

describe("catalog bulk service", () => {
	describe("validateBulkSelection", () => {
		it("throws on empty selection", () => {
			expect(() => service.validateBulkSelection(items, tenantId, [])).toThrow(CatalogBulkError);
		});

		it("throws on cross-tenant selection", () => {
			const crossTenantItems = [
				...items,
				{ ...items[0], id: "item-other", tenantId: "tenant-2" }
			];
			expect(() =>
				service.validateBulkSelection(crossTenantItems, tenantId, ["item-1", "item-other"])
			).toThrow(CatalogBulkError);
		});

		it("passes for valid same-tenant selection", () => {
			expect(() =>
				service.validateBulkSelection(items, tenantId, ["item-1", "item-2"])
			).not.toThrow();
		});
	});

	describe("prepareBulkStatusChange", () => {
		it("identifies items that can transition", () => {
			const result = service.prepareBulkStatusChange(items, tenantId, ["item-1", "item-2", "item-3"], "inactive");
			expect(result.successIds).toEqual(["item-1", "item-2"]);
			expect(result.failedIds).toEqual(["item-3"]); // already inactive
			expect(result.affectedCount).toBe(2);
		});

		it("fails items not found in tenant", () => {
			const result = service.prepareBulkStatusChange(items, tenantId, ["item-1", "item-missing"], "inactive");
			expect(result.successIds).toEqual(["item-1"]);
			expect(result.failedIds).toEqual(["item-missing"]);
		});
	});

	describe("prepareBulkVisibilityChange", () => {
		it("identifies items that can change visibility", () => {
			const result = service.prepareBulkVisibilityChange(items, tenantId, ["item-1", "item-2", "item-3"], "published");
			expect(result.successIds).toEqual(["item-2", "item-3"]);
			expect(result.failedIds).toEqual(["item-1"]); // already published
		});
	});

	describe("prepareBulkDelete", () => {
		it("marks all found items as deletable", () => {
			const result = service.prepareBulkDelete(items, tenantId, ["item-1", "item-2"]);
			expect(result.successIds).toEqual(["item-1", "item-2"]);
			expect(result.failedIds).toEqual([]);
			expect(result.affectedCount).toBe(2);
		});

		it("fails items not found", () => {
			const result = service.prepareBulkDelete(items, tenantId, ["item-1", "item-999"]);
			expect(result.failedIds).toEqual(["item-999"]);
		});
	});
});
