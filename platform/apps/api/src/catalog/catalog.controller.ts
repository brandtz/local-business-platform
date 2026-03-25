import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpCode, HttpException, HttpStatus } from "@nestjs/common";

import { CatalogService, CatalogNotFoundError, CatalogValidationError, CatalogSlugConflictError } from "./catalog.service";
import { assertValidCatalogListQuery, assertValidCreateCategoryRequest, assertValidUpdateCategoryRequest, assertValidCreateItemRequest, assertValidUpdateItemRequest, CatalogApiContractError } from "./catalog-api-contracts";

const DEV_TENANT_ID = "dev-tenant-001";

// Seed prices for dev items (maps item ID → price in cents)
const seedPrices: Record<string, number> = {
	"item-1": 895, "item-2": 695, "item-3": 2495, "item-4": 1895,
	"item-5": 3495, "item-6": 995, "item-7": 1195, "item-8": 495, "item-9": 595,
};

function enrichItem(item: Record<string, unknown>): Record<string, unknown> {
	const id = item.id as string;
	return {
		...item,
		price: item.price ?? seedPrices[id] ?? 0,
		compareAtPrice: item.compareAtPrice ?? null,
		sortOrder: item.sortOrder ?? item.displayOrder ?? 0,
		visibility: item.visibility ?? "published",
		stockQuantity: item.stockQuantity ?? null,
		lowStockThreshold: item.lowStockThreshold ?? null,
	};
}

@Controller("catalog")
export class CatalogController {
	private readonly catalogService = new CatalogService();

	// ── Categories ──────────────────────────────────────────────────────

	@Get("categories")
	listCategories(@Query() query: Record<string, string>) {
		try {
			const validated = query && Object.keys(query).length > 0
				? (() => { assertValidCatalogListQuery(query); return query; })()
				: undefined;
			return this.catalogService.listCategories(DEV_TENANT_ID, validated);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Get("categories/:id")
	getCategory(@Param("id") id: string) {
		try {
			return this.catalogService.getCategory(DEV_TENANT_ID, id);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post("categories")
	createCategory(@Body() body: unknown) {
		try {
			assertValidCreateCategoryRequest(body);
			return this.catalogService.createCategory(DEV_TENANT_ID, body as any);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Put("categories/:id")
	updateCategory(@Param("id") id: string, @Body() body: unknown) {
		try {
			assertValidUpdateCategoryRequest(body);
			return this.catalogService.updateCategory(DEV_TENANT_ID, id, body as any);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Delete("categories/:id")
	@HttpCode(204)
	deleteCategory(@Param("id") id: string) {
		try {
			this.catalogService.deleteCategory(DEV_TENANT_ID, id);
		} catch (err) {
			throw mapError(err);
		}
	}

	// ── Items ───────────────────────────────────────────────────────────

	@Get("items")
	listItems(@Query() query: Record<string, string>) {
		try {
			const validated = query && Object.keys(query).length > 0
				? (() => { assertValidCatalogListQuery(query); return query; })()
				: undefined;
			const result = this.catalogService.listItems(DEV_TENANT_ID, validated);
			return { ...result, items: result.items.map((i: any) => enrichItem(i)) };
		} catch (err) {
			throw mapError(err);
		}
	}

	@Get("items/:id")
	getItem(@Param("id") id: string) {
		try {
			return enrichItem(this.catalogService.getItem(DEV_TENANT_ID, id) as any);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post("items")
	createItem(@Body() body: unknown) {
		try {
			assertValidCreateItemRequest(body);
			return this.catalogService.createItem(DEV_TENANT_ID, body as any);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Put("items/:id")
	updateItem(@Param("id") id: string, @Body() body: unknown) {
		try {
			assertValidUpdateItemRequest(body);
			return this.catalogService.updateItem(DEV_TENANT_ID, id, body as any);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Delete("items/:id")
	@HttpCode(204)
	deleteItem(@Param("id") id: string) {
		try {
			this.catalogService.deleteItem(DEV_TENANT_ID, id);
		} catch (err) {
			throw mapError(err);
		}
	}
}

function mapError(err: unknown): HttpException {
	if (err instanceof CatalogNotFoundError) {
		return new HttpException(err.message, HttpStatus.NOT_FOUND);
	}
	if (err instanceof CatalogValidationError || err instanceof CatalogApiContractError) {
		return new HttpException(err.message, HttpStatus.BAD_REQUEST);
	}
	if (err instanceof CatalogSlugConflictError) {
		return new HttpException(err.message, HttpStatus.CONFLICT);
	}
	if (err instanceof HttpException) return err;
	return new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
}
