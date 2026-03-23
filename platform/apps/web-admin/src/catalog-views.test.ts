import { describe, expect, it } from "vitest";

import {
	buildCategoryDisplayRow,
	buildCategoryTree,
	buildProductDisplayRow,
	formatPriceCents,
	generateSlug,
	getCatalogItemStatusBadge,
	getCatalogVisibilityBadge,
	getCategoryStatusBadge,
	getCatalogTabLabel,
	getProductBulkActionLabel,
	getProductBulkActionConfirmMessage,
	type CatalogTab,
} from "./catalog-views";
import type { Category, CatalogItemRecord } from "@platform/types";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const sampleCategory: Category = {
	createdAt: "2025-01-01T00:00:00Z",
	description: "Test description",
	displayOrder: 1,
	id: "cat-1",
	imageUrl: "https://example.com/img.jpg",
	name: "Beverages",
	parentCategoryId: undefined,
	slug: "beverages",
	status: "active",
	tenantId: "t-1",
	updatedAt: "2025-01-01T00:00:00Z",
};

const childCategory: Category = {
	...sampleCategory,
	id: "cat-2",
	name: "Hot Drinks",
	parentCategoryId: "cat-1",
	slug: "hot-drinks",
	displayOrder: 1,
};

const childCategory2: Category = {
	...sampleCategory,
	id: "cat-3",
	name: "Cold Drinks",
	parentCategoryId: "cat-1",
	slug: "cold-drinks",
	displayOrder: 2,
};

const sampleProduct: CatalogItemRecord = {
	categoryId: "cat-1",
	compareAtPrice: 1500,
	description: "A great product",
	id: "item-1",
	lowStockThreshold: 5,
	name: "Espresso",
	price: 999,
	slug: "espresso",
	sortOrder: 1,
	status: "active",
	stockQuantity: 100,
	tenantId: "t-1",
	visibility: "published",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("catalog-views", () => {
	describe("formatPriceCents", () => {
		it("formats zero cents", () => {
			expect(formatPriceCents(0)).toBe("$0.00");
		});

		it("formats whole dollars", () => {
			expect(formatPriceCents(1000)).toBe("$10.00");
		});

		it("formats cents correctly", () => {
			expect(formatPriceCents(999)).toBe("$9.99");
		});

		it("formats large amounts", () => {
			expect(formatPriceCents(123456)).toBe("$1234.56");
		});
	});

	describe("generateSlug", () => {
		it("converts name to lowercase slug", () => {
			expect(generateSlug("Hot Drinks")).toBe("hot-drinks");
		});

		it("strips special characters", () => {
			expect(generateSlug("Coffee & Tea!")).toBe("coffee-tea");
		});

		it("handles leading/trailing dashes", () => {
			expect(generateSlug("--hello--")).toBe("hello");
		});

		it("truncates to 128 chars", () => {
			const longName = "a".repeat(200);
			expect(generateSlug(longName).length).toBeLessThanOrEqual(128);
		});
	});

	describe("getCategoryStatusBadge", () => {
		it("returns success for active", () => {
			const badge = getCategoryStatusBadge("active");
			expect(badge.label).toBe("Active");
			expect(badge.colorClass).toBe("success");
		});

		it("returns muted for archived", () => {
			const badge = getCategoryStatusBadge("archived");
			expect(badge.label).toBe("Archived");
			expect(badge.colorClass).toBe("muted");
		});
	});

	describe("getCatalogItemStatusBadge", () => {
		it("returns success for active", () => {
			const badge = getCatalogItemStatusBadge("active");
			expect(badge.label).toBe("Active");
			expect(badge.colorClass).toBe("success");
		});

		it("returns muted for inactive", () => {
			const badge = getCatalogItemStatusBadge("inactive");
			expect(badge.label).toBe("Inactive");
			expect(badge.colorClass).toBe("muted");
		});
	});

	describe("getCatalogVisibilityBadge", () => {
		it("returns success for published", () => {
			const badge = getCatalogVisibilityBadge("published");
			expect(badge.label).toBe("Published");
			expect(badge.colorClass).toBe("success");
		});

		it("returns warning for draft", () => {
			const badge = getCatalogVisibilityBadge("draft");
			expect(badge.label).toBe("Draft");
			expect(badge.colorClass).toBe("warning");
		});
	});

	describe("getCatalogTabLabel", () => {
		it("returns correct labels for each tab", () => {
			const tabs: CatalogTab[] = ["categories", "products", "services"];
			const labels = tabs.map(getCatalogTabLabel);
			expect(labels).toEqual(["Categories", "Products", "Services"]);
		});
	});

	describe("buildCategoryDisplayRow", () => {
		it("transforms a category into a display row", () => {
			const row = buildCategoryDisplayRow(sampleCategory, 0);
			expect(row.id).toBe("cat-1");
			expect(row.name).toBe("Beverages");
			expect(row.depth).toBe(0);
			expect(row.description).toBe("Test description");
		});

		it("preserves depth for nested categories", () => {
			const row = buildCategoryDisplayRow(childCategory, 2);
			expect(row.depth).toBe(2);
		});

		it("defaults empty strings for missing optional fields", () => {
			const cat: Category = { ...sampleCategory, description: undefined, imageUrl: undefined, parentCategoryId: undefined };
			const row = buildCategoryDisplayRow(cat, 0);
			expect(row.description).toBe("");
			expect(row.imageUrl).toBe("");
			expect(row.parentCategoryId).toBe("");
		});
	});

	describe("buildCategoryTree", () => {
		it("returns flat list for root-only categories", () => {
			const tree = buildCategoryTree([sampleCategory]);
			expect(tree).toHaveLength(1);
			expect(tree[0]!.depth).toBe(0);
		});

		it("nests children under parents", () => {
			const tree = buildCategoryTree([sampleCategory, childCategory, childCategory2]);
			expect(tree).toHaveLength(3);
			expect(tree[0]!.id).toBe("cat-1");
			expect(tree[0]!.depth).toBe(0);
			expect(tree[1]!.id).toBe("cat-2");
			expect(tree[1]!.depth).toBe(1);
			expect(tree[2]!.id).toBe("cat-3");
			expect(tree[2]!.depth).toBe(1);
		});

		it("sorts by displayOrder within same level", () => {
			const reversed = [childCategory2, childCategory, sampleCategory];
			const tree = buildCategoryTree(reversed);
			expect(tree[1]!.name).toBe("Hot Drinks");
			expect(tree[2]!.name).toBe("Cold Drinks");
		});

		it("returns empty array for empty input", () => {
			expect(buildCategoryTree([])).toEqual([]);
		});
	});

	describe("buildProductDisplayRow", () => {
		it("transforms a catalog item into a display row", () => {
			const row = buildProductDisplayRow(sampleProduct);
			expect(row.id).toBe("item-1");
			expect(row.name).toBe("Espresso");
			expect(row.priceFormatted).toBe("$9.99");
			expect(row.compareAtPriceFormatted).toBe("$15.00");
			expect(row.statusBadge.label).toBe("Active");
			expect(row.visibilityBadge.label).toBe("Published");
		});

		it("handles null compare-at price", () => {
			const item: CatalogItemRecord = { ...sampleProduct, compareAtPrice: null };
			const row = buildProductDisplayRow(item);
			expect(row.compareAtPriceFormatted).toBe("");
		});
	});

	describe("bulk actions", () => {
		it("returns correct labels", () => {
			expect(getProductBulkActionLabel("activate")).toBe("Activate");
			expect(getProductBulkActionLabel("deactivate")).toBe("Deactivate");
			expect(getProductBulkActionLabel("delete")).toBe("Delete");
		});

		it("returns singular confirm message", () => {
			expect(getProductBulkActionConfirmMessage("activate", 1)).toBe("Activate 1 product?");
		});

		it("returns plural confirm message", () => {
			expect(getProductBulkActionConfirmMessage("delete", 5)).toBe("Delete 5 products? This cannot be undone.");
		});
	});
});
