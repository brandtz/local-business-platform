// E13-S6-T1/T2: Catalog view-model helpers — category tree building,
// product display rows, price formatting, slug generation, and status badges.

import type {
	Category,
	CategoryStatus,
	CatalogItemRecord,
	CatalogItemStatus,
	CatalogItemVisibility,
} from "@platform/types";

// ── Display types ────────────────────────────────────────────────────────────

export type StatusBadge = {
	colorClass: string;
	label: string;
};

export type CategoryDisplayRow = {
	depth: number;
	description: string;
	displayOrder: number;
	id: string;
	imageUrl: string;
	name: string;
	parentCategoryId: string;
	slug: string;
	status: CategoryStatus;
};

export type ProductDisplayRow = {
	categoryId: string;
	compareAtPrice: number | null;
	compareAtPriceFormatted: string;
	id: string;
	name: string;
	price: number;
	priceFormatted: string;
	slug: string;
	status: CatalogItemStatus;
	statusBadge: StatusBadge;
	visibility: CatalogItemVisibility;
	visibilityBadge: StatusBadge;
};

// ── Category tabs ────────────────────────────────────────────────────────────

export const catalogTabs = ["categories", "products", "services"] as const;
export type CatalogTab = (typeof catalogTabs)[number];

export function getCatalogTabLabel(tab: CatalogTab): string {
	switch (tab) {
		case "categories":
			return "Categories";
		case "products":
			return "Products";
		case "services":
			return "Services";
	}
}

// ── Price formatting ─────────────────────────────────────────────────────────

export function formatPriceCents(cents: number): string {
	const dollars = cents / 100;
	return `$${dollars.toFixed(2)}`;
}

// ── Slug generation ──────────────────────────────────────────────────────────

export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 128);
}

// ── Status badges ────────────────────────────────────────────────────────────

export function getCategoryStatusBadge(status: CategoryStatus): StatusBadge {
	switch (status) {
		case "active":
			return { label: "Active", colorClass: "success" };
		case "archived":
			return { label: "Archived", colorClass: "muted" };
	}
}

export function getCatalogItemStatusBadge(status: CatalogItemStatus): StatusBadge {
	switch (status) {
		case "active":
			return { label: "Active", colorClass: "success" };
		case "inactive":
			return { label: "Inactive", colorClass: "muted" };
	}
}

export function getCatalogVisibilityBadge(visibility: CatalogItemVisibility): StatusBadge {
	switch (visibility) {
		case "published":
			return { label: "Published", colorClass: "success" };
		case "draft":
			return { label: "Draft", colorClass: "warning" };
	}
}

// ── Category tree ────────────────────────────────────────────────────────────

export function buildCategoryDisplayRow(
	cat: Category,
	depth: number,
): CategoryDisplayRow {
	return {
		depth,
		description: cat.description ?? "",
		displayOrder: cat.displayOrder,
		id: cat.id,
		imageUrl: cat.imageUrl ?? "",
		name: cat.name,
		parentCategoryId: cat.parentCategoryId ?? "",
		slug: cat.slug,
		status: cat.status,
	};
}

export function buildCategoryTree(categories: Category[]): CategoryDisplayRow[] {
	const byParent = new Map<string, Category[]>();

	for (const cat of categories) {
		const key = cat.parentCategoryId ?? "";
		const list = byParent.get(key) ?? [];
		list.push(cat);
		byParent.set(key, list);
	}

	const result: CategoryDisplayRow[] = [];

	function walk(parentId: string, depth: number) {
		const children = byParent.get(parentId) ?? [];
		const sorted = [...children].sort((a, b) => a.displayOrder - b.displayOrder);
		for (const child of sorted) {
			result.push(buildCategoryDisplayRow(child, depth));
			walk(child.id, depth + 1);
		}
	}

	walk("", 0);
	return result;
}

// ── Product display ──────────────────────────────────────────────────────────

export function buildProductDisplayRow(item: CatalogItemRecord): ProductDisplayRow {
	return {
		categoryId: item.categoryId,
		compareAtPrice: item.compareAtPrice,
		compareAtPriceFormatted: item.compareAtPrice != null
			? formatPriceCents(item.compareAtPrice)
			: "",
		id: item.id,
		name: item.name,
		price: item.price,
		priceFormatted: formatPriceCents(item.price),
		slug: item.slug,
		status: item.status,
		statusBadge: getCatalogItemStatusBadge(item.status),
		visibility: item.visibility,
		visibilityBadge: getCatalogVisibilityBadge(item.visibility),
	};
}

// ── Bulk actions ─────────────────────────────────────────────────────────────

export const productBulkActions = ["activate", "deactivate", "delete"] as const;
export type ProductBulkAction = (typeof productBulkActions)[number];

export function getProductBulkActionLabel(action: ProductBulkAction): string {
	switch (action) {
		case "activate":
			return "Activate";
		case "deactivate":
			return "Deactivate";
		case "delete":
			return "Delete";
	}
}

export function getProductBulkActionConfirmMessage(
	action: ProductBulkAction,
	count: number,
): string {
	switch (action) {
		case "activate":
			return `Activate ${count} product${count === 1 ? "" : "s"}?`;
		case "deactivate":
			return `Deactivate ${count} product${count === 1 ? "" : "s"}?`;
		case "delete":
			return `Delete ${count} product${count === 1 ? "" : "s"}? This cannot be undone.`;
	}
}
