import { Injectable } from "@nestjs/common";

import type {
	CatalogItemRecord,
	CatalogItemStatus,
	CatalogItemVisibility,
	CatalogListFilter,
	CatalogSortField,
	SortDirection
} from "@platform/types";
import { validateCatalogItemInput } from "@platform/types";

export class CatalogItemError extends Error {
	constructor(
		public readonly reason: "not-found" | "validation-failed" | "invalid-transition",
		message: string
	) {
		super(message);
		this.name = "CatalogItemError";
	}
}

export type CreateCatalogItemInput = {
	categoryId: string;
	compareAtPrice?: number | null;
	description?: string | null;
	lowStockThreshold?: number | null;
	name: string;
	price: number;
	slug: string;
	stockQuantity?: number | null;
	tenantId: string;
};

const allowedStatusTransitions: Record<CatalogItemStatus, readonly CatalogItemStatus[]> = {
	active: ["inactive"],
	inactive: ["active"],
};

const allowedVisibilityTransitions: Record<CatalogItemVisibility, readonly CatalogItemVisibility[]> = {
	draft: ["published"],
	published: ["draft"],
};

@Injectable()
export class CatalogItemService {
	validateCreate(input: CreateCatalogItemInput, existingSlugs: readonly string[]) {
		const result = validateCatalogItemInput(input);
		if (!result.valid) return result;

		if (existingSlugs.includes(input.slug)) {
			return { valid: false as const, errors: [{ field: "slug" as const, reason: "duplicate" as const }] };
		}

		return { valid: true as const };
	}

	validateStatusTransition(
		current: CatalogItemStatus,
		target: CatalogItemStatus
	): boolean {
		return allowedStatusTransitions[current]?.includes(target) ?? false;
	}

	validateVisibilityTransition(
		current: CatalogItemVisibility,
		target: CatalogItemVisibility
	): boolean {
		return allowedVisibilityTransitions[current]?.includes(target) ?? false;
	}

	requireStatusTransition(
		current: CatalogItemStatus,
		target: CatalogItemStatus
	): void {
		if (!this.validateStatusTransition(current, target)) {
			throw new CatalogItemError(
				"invalid-transition",
				`Cannot transition status from ${current} to ${target}`
			);
		}
	}

	requireVisibilityTransition(
		current: CatalogItemVisibility,
		target: CatalogItemVisibility
	): void {
		if (!this.validateVisibilityTransition(current, target)) {
			throw new CatalogItemError(
				"invalid-transition",
				`Cannot transition visibility from ${current} to ${target}`
			);
		}
	}

	computeSortOrderForAppend(existing: readonly CatalogItemRecord[]): number {
		if (existing.length === 0) return 0;
		return Math.max(...existing.map((i) => i.sortOrder)) + 1;
	}

	filterItems(
		items: readonly CatalogItemRecord[],
		tenantId: string,
		filter?: CatalogListFilter
	): CatalogItemRecord[] {
		let result = items.filter((i) => i.tenantId === tenantId);

		if (filter?.categoryId) {
			result = result.filter((i) => i.categoryId === filter.categoryId);
		}
		if (filter?.status) {
			result = result.filter((i) => i.status === filter.status);
		}
		if (filter?.visibility) {
			result = result.filter((i) => i.visibility === filter.visibility);
		}
		if (filter?.search) {
			const searchLower = filter.search.toLowerCase();
			result = result.filter(
				(i) =>
					i.name.toLowerCase().includes(searchLower) ||
					i.description?.toLowerCase().includes(searchLower)
			);
		}

		return result;
	}

	sortItems(
		items: CatalogItemRecord[],
		field: CatalogSortField = "sortOrder",
		direction: SortDirection = "asc"
	): CatalogItemRecord[] {
		const sorted = [...items];
		const multiplier = direction === "asc" ? 1 : -1;

		sorted.sort((a, b) => {
			switch (field) {
				case "name":
					return multiplier * a.name.localeCompare(b.name);
				case "price":
					return multiplier * (a.price - b.price);
				case "sortOrder":
					return multiplier * (a.sortOrder - b.sortOrder);
				case "createdAt":
					return multiplier * (a.sortOrder - b.sortOrder); // fallback to sortOrder
				default:
					return 0;
			}
		});

		return sorted;
	}
}
