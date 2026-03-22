import { describe, expect, it } from "vitest";

import {
	AUTOCOMPLETE_DEFAULT_LIMIT,
	AUTOCOMPLETE_MAX_LIMIT,
	AUTOCOMPLETE_MIN_PREFIX_LENGTH,
	DEFAULT_RELEVANCE_WEIGHTS,
	indexedEntityTypes,
	isValidIndexedEntityType,
	isValidSearchFilterType,
	isValidSortDirection,
	SEARCH_DEFAULT_PAGE_SIZE,
	SEARCH_MAX_PAGE_SIZE,
	searchFilterTypes,
	sortDirections,
	validateAutocompleteQuery,
	validateSearchQuery,
	type AutocompleteQuery,
	type AutocompleteResult,
	type AutocompleteSuggestion,
	type EntityIndexConfig,
	type EntitySearchQuery,
	type FilterToolbarDefinition,
	type IndexedDocument,
	type IndexedEntityType,
	type RelevanceWeights,
	type SearchFilterValue,
	type SearchQuery,
	type SearchResult,
	type SearchResultItem,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("search types", () => {
	describe("constants", () => {
		it("exposes search filter types", () => {
			expect(searchFilterTypes).toEqual([
				"enum",
				"range",
				"date",
				"text",
				"boolean",
			]);
		});

		it("exposes sort directions", () => {
			expect(sortDirections).toEqual(["asc", "desc"]);
		});

		it("exposes indexed entity types", () => {
			expect(indexedEntityTypes).toEqual([
				"catalog-item",
				"service",
				"order",
				"booking",
				"customer",
				"staff",
				"content-page",
			]);
		});

		it("exposes pagination defaults", () => {
			expect(SEARCH_DEFAULT_PAGE_SIZE).toBe(20);
			expect(SEARCH_MAX_PAGE_SIZE).toBe(100);
		});

		it("exposes autocomplete defaults", () => {
			expect(AUTOCOMPLETE_DEFAULT_LIMIT).toBe(5);
			expect(AUTOCOMPLETE_MAX_LIMIT).toBe(20);
			expect(AUTOCOMPLETE_MIN_PREFIX_LENGTH).toBe(1);
		});

		it("exposes default relevance weights", () => {
			expect(DEFAULT_RELEVANCE_WEIGHTS).toEqual({
				fieldWeights: { name: 1.0, description: 0.5 },
				exactMatchBoost: 0.3,
				prefixMatchBoost: 0.15,
				freshnessWeight: 0.1,
			});
		});
	});

	// -----------------------------------------------------------------------
	// Type guards
	// -----------------------------------------------------------------------

	describe("isValidSearchFilterType", () => {
		it("returns true for valid filter types", () => {
			expect(isValidSearchFilterType("enum")).toBe(true);
			expect(isValidSearchFilterType("range")).toBe(true);
			expect(isValidSearchFilterType("date")).toBe(true);
			expect(isValidSearchFilterType("text")).toBe(true);
			expect(isValidSearchFilterType("boolean")).toBe(true);
		});

		it("returns false for invalid filter types", () => {
			expect(isValidSearchFilterType("invalid")).toBe(false);
			expect(isValidSearchFilterType("")).toBe(false);
			expect(isValidSearchFilterType("ENUM")).toBe(false);
		});
	});

	describe("isValidSortDirection", () => {
		it("returns true for valid sort directions", () => {
			expect(isValidSortDirection("asc")).toBe(true);
			expect(isValidSortDirection("desc")).toBe(true);
		});

		it("returns false for invalid sort directions", () => {
			expect(isValidSortDirection("ASC")).toBe(false);
			expect(isValidSortDirection("up")).toBe(false);
			expect(isValidSortDirection("")).toBe(false);
		});
	});

	describe("isValidIndexedEntityType", () => {
		it("returns true for all valid entity types", () => {
			for (const et of indexedEntityTypes) {
				expect(isValidIndexedEntityType(et)).toBe(true);
			}
		});

		it("returns false for invalid entity types", () => {
			expect(isValidIndexedEntityType("unknown")).toBe(false);
			expect(isValidIndexedEntityType("")).toBe(false);
			expect(isValidIndexedEntityType("catalog")).toBe(false);
		});
	});

	// -----------------------------------------------------------------------
	// validateSearchQuery
	// -----------------------------------------------------------------------

	describe("validateSearchQuery", () => {
		it("accepts a valid minimal query", () => {
			const result = validateSearchQuery({ tenantId: "t-1" });
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("accepts a fully populated query", () => {
			const q: SearchQuery = {
				tenantId: "t-1",
				query: "pizza",
				filters: [
					{ type: "enum", field: "status", values: ["active"] },
					{ type: "range", field: "price", min: 0, max: 1000 },
					{ type: "date", field: "createdAt", from: "2024-01-01" },
					{ type: "text", field: "name", value: "test" },
					{ type: "boolean", field: "isBookable", value: true },
				],
				sort: [{ field: "name", direction: "asc" }],
				cursor: "abc123",
				pageSize: 50,
			};
			const result = validateSearchQuery(q);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("rejects empty tenantId", () => {
			const result = validateSearchQuery({ tenantId: "" });
			expect(result.valid).toBe(false);
			expect(result.errors).toContain("tenantId is required");
		});

		it("rejects whitespace-only tenantId", () => {
			const result = validateSearchQuery({ tenantId: "   " });
			expect(result.valid).toBe(false);
			expect(result.errors).toContain("tenantId is required");
		});

		it("rejects pageSize below 1", () => {
			const result = validateSearchQuery({
				tenantId: "t-1",
				pageSize: 0,
			});
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("pageSize");
		});

		it("rejects pageSize above max", () => {
			const result = validateSearchQuery({
				tenantId: "t-1",
				pageSize: 101,
			});
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("pageSize");
		});

		it("accepts pageSize at boundaries", () => {
			expect(
				validateSearchQuery({ tenantId: "t-1", pageSize: 1 }).valid
			).toBe(true);
			expect(
				validateSearchQuery({ tenantId: "t-1", pageSize: 100 }).valid
			).toBe(true);
		});

		it("rejects filter with empty field", () => {
			const result = validateSearchQuery({
				tenantId: "t-1",
				filters: [
					{ type: "enum", field: "", values: ["active"] },
				],
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Filter field is required");
		});

		it("rejects sort with empty field", () => {
			const result = validateSearchQuery({
				tenantId: "t-1",
				sort: [{ field: "", direction: "asc" }],
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Sort field is required");
		});

		it("collects multiple errors", () => {
			const result = validateSearchQuery({
				tenantId: "",
				pageSize: 0,
				filters: [
					{ type: "enum", field: "", values: [] },
				],
			});
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(3);
		});
	});

	// -----------------------------------------------------------------------
	// validateAutocompleteQuery
	// -----------------------------------------------------------------------

	describe("validateAutocompleteQuery", () => {
		it("accepts a valid minimal autocomplete query", () => {
			const result = validateAutocompleteQuery({
				tenantId: "t-1",
				prefix: "p",
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("accepts a full autocomplete query", () => {
			const q: AutocompleteQuery = {
				tenantId: "t-1",
				prefix: "piz",
				entityTypes: ["catalog-item", "service"],
				limit: 10,
			};
			const result = validateAutocompleteQuery(q);
			expect(result.valid).toBe(true);
		});

		it("rejects empty tenantId", () => {
			const result = validateAutocompleteQuery({
				tenantId: "",
				prefix: "test",
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain("tenantId is required");
		});

		it("rejects empty prefix", () => {
			const result = validateAutocompleteQuery({
				tenantId: "t-1",
				prefix: "",
			});
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("prefix");
		});

		it("rejects limit below 1", () => {
			const result = validateAutocompleteQuery({
				tenantId: "t-1",
				prefix: "a",
				limit: 0,
			});
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("limit");
		});

		it("rejects limit above max", () => {
			const result = validateAutocompleteQuery({
				tenantId: "t-1",
				prefix: "a",
				limit: 21,
			});
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("limit");
		});

		it("rejects invalid entity types", () => {
			const result = validateAutocompleteQuery({
				tenantId: "t-1",
				prefix: "a",
				entityTypes: ["invalid" as IndexedEntityType],
			});
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("Invalid entity type");
		});
	});

	// -----------------------------------------------------------------------
	// Type structure assertions (compile-time + runtime shape checks)
	// -----------------------------------------------------------------------

	describe("type structures", () => {
		it("SearchResultItem has item, score, and optional highlights", () => {
			const item: SearchResultItem<{ id: string; name: string }> = {
				item: { id: "1", name: "Test" },
				score: 0.95,
				highlights: { name: ["<em>Test</em>"] },
			};
			expect(item.score).toBe(0.95);
			expect(item.highlights?.name).toEqual(["<em>Test</em>"]);
		});

		it("SearchResult has items, totalCount, nextCursor, hasMore", () => {
			const result: SearchResult<{ id: string }> = {
				items: [{ item: { id: "1" }, score: 1.0 }],
				totalCount: 1,
				nextCursor: null,
				hasMore: false,
			};
			expect(result.totalCount).toBe(1);
			expect(result.hasMore).toBe(false);
			expect(result.nextCursor).toBeNull();
		});

		it("IndexedDocument has required fields for tenant isolation", () => {
			const doc: IndexedDocument = {
				id: "item-1",
				tenantId: "t-1",
				entityType: "catalog-item",
				searchableText: ["Pizza Margherita"],
				facets: { status: "active", price: 999 },
				sortFields: { name: "pizza margherita", price: 999 },
				indexedAt: "2024-01-01T00:00:00Z",
			};
			expect(doc.tenantId).toBe("t-1");
			expect(doc.entityType).toBe("catalog-item");
		});

		it("EntityIndexConfig describes how an entity is indexed", () => {
			const config: EntityIndexConfig = {
				entityType: "catalog-item",
				searchableFields: ["name", "description"],
				filterableFields: ["status", "categoryId", "visibility"],
				sortableFields: ["name", "price", "sortOrder"],
			};
			expect(config.searchableFields).toContain("name");
		});

		it("FilterToolbarDefinition describes a complete filter toolbar", () => {
			const toolbar: FilterToolbarDefinition = {
				entityType: "catalog-item",
				filters: [
					{
						field: "status",
						label: "Status",
						type: "enum",
						options: [
							{ value: "active", label: "Active" },
							{ value: "inactive", label: "Inactive" },
						],
					},
					{
						field: "price",
						label: "Price",
						type: "range",
						rangeMin: 0,
						rangeMax: 10000,
					},
				],
				defaultSort: { field: "sortOrder", direction: "asc" },
				sortOptions: [
					{ field: "name", label: "Name" },
					{ field: "price", label: "Price" },
					{ field: "sortOrder", label: "Sort Order" },
				],
			};
			expect(toolbar.filters).toHaveLength(2);
			expect(toolbar.defaultSort.field).toBe("sortOrder");
			expect(toolbar.sortOptions).toHaveLength(3);
		});

		it("AutocompleteSuggestion has text, entityType, entityId, score", () => {
			const suggestion: AutocompleteSuggestion = {
				text: "Pizza Margherita",
				entityType: "catalog-item",
				entityId: "item-1",
				score: 0.9,
			};
			expect(suggestion.entityType).toBe("catalog-item");
		});

		it("AutocompleteResult contains suggestions", () => {
			const result: AutocompleteResult = {
				suggestions: [
					{
						text: "Pizza",
						entityType: "catalog-item",
						entityId: "item-1",
						score: 0.9,
					},
				],
			};
			expect(result.suggestions).toHaveLength(1);
		});

		it("EntitySearchQuery extends SearchQuery with entityType", () => {
			const query: EntitySearchQuery = {
				tenantId: "t-1",
				query: "pizza",
				entityType: "catalog-item",
			};
			expect(query.entityType).toBe("catalog-item");
			expect(query.tenantId).toBe("t-1");
		});

		it("RelevanceWeights configures per-field boosting", () => {
			const weights: RelevanceWeights = {
				fieldWeights: { name: 2.0, description: 0.5, sku: 1.5 },
				exactMatchBoost: 0.4,
				prefixMatchBoost: 0.2,
				freshnessWeight: 0.05,
			};
			expect(weights.fieldWeights.name).toBe(2.0);
		});

		it("filter value types are correctly discriminated", () => {
			const filters: SearchFilterValue[] = [
				{ type: "enum", field: "status", values: ["active"] },
				{ type: "range", field: "price", min: 100, max: 500 },
				{ type: "date", field: "createdAt", from: "2024-01-01" },
				{ type: "text", field: "name", value: "test" },
				{ type: "boolean", field: "isBookable", value: true },
			];

			expect(filters).toHaveLength(5);

			// Verify discriminated union narrowing
			for (const filter of filters) {
				switch (filter.type) {
					case "enum":
						expect(Array.isArray(filter.values)).toBe(true);
						break;
					case "range":
						expect(typeof filter.min === "number" || typeof filter.max === "number").toBe(true);
						break;
					case "date":
						expect(typeof filter.from === "string" || typeof filter.to === "string").toBe(true);
						break;
					case "text":
						expect(typeof filter.value).toBe("string");
						break;
					case "boolean":
						expect(typeof filter.value).toBe("boolean");
						break;
				}
			}
		});
	});
});
