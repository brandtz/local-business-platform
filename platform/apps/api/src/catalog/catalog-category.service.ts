import { Injectable } from "@nestjs/common";

import type {
	CatalogCategoryRecord,
	CatalogValidationError,
	CatalogValidationResult
} from "@platform/types";

export class CatalogCategoryError extends Error {
	constructor(
		public readonly reason: "duplicate-slug" | "not-found",
		message: string
	) {
		super(message);
		this.name = "CatalogCategoryError";
	}
}

export type CreateCategoryInput = {
	description?: string | null;
	imageUrl?: string | null;
	name: string;
	slug: string;
	tenantId: string;
};

export type UpdateCategoryInput = {
	description?: string | null;
	imageUrl?: string | null;
	name?: string;
	slug?: string;
	sortOrder?: number;
};

export type ReorderCategoryInput = {
	categoryId: string;
	newSortOrder: number;
};

@Injectable()
export class CatalogCategoryService {
	validateCreate(
		input: CreateCategoryInput,
		existingSlugs: readonly string[]
	): CatalogValidationResult {
		const errors: CatalogValidationError[] = [];

		if (!input.name || input.name.trim().length === 0) {
			errors.push({ field: "name", reason: "empty" });
		}
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
			errors.push({ field: "slug", reason: "invalid-format" });
		} else if (existingSlugs.includes(input.slug)) {
			errors.push({ field: "slug", reason: "duplicate" });
		}

		return errors.length === 0 ? { valid: true } : { valid: false, errors };
	}

	computeSortOrderForAppend(existing: readonly CatalogCategoryRecord[]): number {
		if (existing.length === 0) return 0;
		return Math.max(...existing.map((c) => c.sortOrder)) + 1;
	}

	reorderCategories(
		categories: readonly CatalogCategoryRecord[],
		moves: readonly ReorderCategoryInput[]
	): CatalogCategoryRecord[] {
		const mutable = categories.map((c) => ({ ...c }));
		for (const move of moves) {
			const target = mutable.find((c) => c.id === move.categoryId);
			if (!target) {
				throw new CatalogCategoryError("not-found", `Category ${move.categoryId} not found`);
			}
			target.sortOrder = move.newSortOrder;
		}
		return mutable.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	filterByTenant(
		categories: readonly CatalogCategoryRecord[],
		tenantId: string
	): CatalogCategoryRecord[] {
		return categories
			.filter((c) => c.tenantId === tenantId)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}
}
