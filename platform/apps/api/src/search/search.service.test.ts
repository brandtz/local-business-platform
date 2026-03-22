import { beforeEach, describe, expect, it } from "vitest";

import type {
	EntitySearchQuery,
	IndexedDocument,
} from "@platform/types";

import { SearchService, SearchError } from "./search.service";
import { SearchIndexRepository } from "./search-index.repository";
import {
	buildCatalogItemDocument,
	buildOrderDocument,
	buildCustomerDocument,
	buildServiceDocument,
	buildBookingDocument,
	buildStaffDocument,
	buildContentPageDocument,
} from "./search-consumer-contracts";
import {
	ENTITY_INDEX_CONFIGS,
	FILTER_TOOLBAR_DEFINITIONS,
} from "./search-entity-configs";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function createService(): SearchService {
	return new SearchService();
}

function sampleCatalogDoc(
	overrides?: Partial<IndexedDocument>
): IndexedDocument {
	return {
		id: "item-1",
		tenantId: TENANT_A,
		entityType: "catalog-item",
		searchableText: ["Margherita Pizza", "Classic Italian pizza"],
		facets: {
			status: "active",
			visibility: "published",
			categoryId: "cat-1",
			price: 999,
			name: "Margherita Pizza",
		},
		sortFields: {
			name: "margherita pizza",
			price: 999,
			sortOrder: 1,
		},
		indexedAt: new Date().toISOString(),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Repository tests
// ---------------------------------------------------------------------------

describe("SearchIndexRepository", () => {
	let repo: SearchIndexRepository;

	beforeEach(() => {
		repo = new SearchIndexRepository();
	});

	it("inserts and retrieves a document", () => {
		const doc = sampleCatalogDoc();
		repo.upsert(doc);

		const found = repo.findById(TENANT_A, "catalog-item", "item-1");
		expect(found).toBeDefined();
		expect(found!.id).toBe("item-1");
	});

	it("updates an existing document", () => {
		repo.upsert(sampleCatalogDoc());
		repo.upsert(
			sampleCatalogDoc({ searchableText: ["Updated Pizza"] })
		);

		const found = repo.findById(TENANT_A, "catalog-item", "item-1");
		expect(found!.searchableText).toEqual(["Updated Pizza"]);
	});

	it("removes a document", () => {
		repo.upsert(sampleCatalogDoc());
		const removed = repo.remove(TENANT_A, "catalog-item", "item-1");
		expect(removed).toBe(true);

		const found = repo.findById(TENANT_A, "catalog-item", "item-1");
		expect(found).toBeUndefined();
	});

	it("returns false when removing nonexistent document", () => {
		const removed = repo.remove(TENANT_A, "catalog-item", "nope");
		expect(removed).toBe(false);
	});

	it("isolates documents by tenant", () => {
		repo.upsert(sampleCatalogDoc({ tenantId: TENANT_A }));
		repo.upsert(
			sampleCatalogDoc({ id: "item-2", tenantId: TENANT_B })
		);

		const tenantADocs = repo.findByTenantAndType(
			TENANT_A,
			"catalog-item"
		);
		expect(tenantADocs).toHaveLength(1);
		expect(tenantADocs[0].tenantId).toBe(TENANT_A);

		const tenantBDocs = repo.findByTenantAndType(
			TENANT_B,
			"catalog-item"
		);
		expect(tenantBDocs).toHaveLength(1);
		expect(tenantBDocs[0].tenantId).toBe(TENANT_B);
	});

	it("isolates documents by entity type", () => {
		repo.upsert(sampleCatalogDoc());
		repo.upsert({
			...sampleCatalogDoc(),
			id: "svc-1",
			entityType: "service",
		});

		expect(
			repo.findByTenantAndType(TENANT_A, "catalog-item")
		).toHaveLength(1);
		expect(
			repo.findByTenantAndType(TENANT_A, "service")
		).toHaveLength(1);
	});

	it("counts documents correctly", () => {
		repo.upsert(sampleCatalogDoc({ id: "item-1" }));
		repo.upsert(sampleCatalogDoc({ id: "item-2" }));
		repo.upsert(sampleCatalogDoc({ id: "item-3" }));

		expect(repo.count(TENANT_A, "catalog-item")).toBe(3);
		expect(repo.count(TENANT_B, "catalog-item")).toBe(0);
	});

	it("clears all documents for a tenant", () => {
		repo.upsert(sampleCatalogDoc({ tenantId: TENANT_A }));
		repo.upsert(
			sampleCatalogDoc({ id: "item-2", tenantId: TENANT_B })
		);

		repo.clearTenant(TENANT_A);
		expect(
			repo.findByTenantAndType(TENANT_A, "catalog-item")
		).toHaveLength(0);
		expect(
			repo.findByTenantAndType(TENANT_B, "catalog-item")
		).toHaveLength(1);
	});

	it("clears all documents", () => {
		repo.upsert(sampleCatalogDoc({ tenantId: TENANT_A }));
		repo.upsert(
			sampleCatalogDoc({ id: "item-2", tenantId: TENANT_B })
		);

		repo.clearAll();
		expect(
			repo.findByTenantAndType(TENANT_A, "catalog-item")
		).toHaveLength(0);
		expect(
			repo.findByTenantAndType(TENANT_B, "catalog-item")
		).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// SearchService tests
// ---------------------------------------------------------------------------

describe("SearchService", () => {
	let service: SearchService;

	beforeEach(() => {
		service = createService();
	});

	// -------------------------------------------------------------------
	// Indexing (E11-S3-T2)
	// -------------------------------------------------------------------

	describe("indexing", () => {
		it("indexes and retrieves a document", () => {
			const doc = sampleCatalogDoc();
			service.indexDocument(doc);

			const result = service.search<Record<string, unknown>>({
				tenantId: TENANT_A,
				entityType: "catalog-item",
			});

			expect(result.totalCount).toBe(1);
			expect(result.items[0].item).toBeDefined();
		});

		it("rejects documents without tenantId", () => {
			expect(() =>
				service.indexDocument({
					...sampleCatalogDoc(),
					tenantId: "",
				})
			).toThrow(SearchError);
		});

		it("removes a document on delete trigger", () => {
			service.indexDocument(sampleCatalogDoc());
			service.handleIndexTrigger("delete", sampleCatalogDoc());

			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
			});
			expect(result.totalCount).toBe(0);
		});

		it("updates a document on update trigger", () => {
			service.indexDocument(sampleCatalogDoc());
			service.handleIndexTrigger("update", {
				...sampleCatalogDoc(),
				searchableText: ["Updated Pizza"],
			});

			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				query: "Updated",
			});
			expect(result.totalCount).toBe(1);
		});
	});

	// -------------------------------------------------------------------
	// Search (E11-S3-T1, T5)
	// -------------------------------------------------------------------

	describe("search", () => {
		beforeEach(() => {
			// Seed test data
			service.indexDocument(
				sampleCatalogDoc({
					id: "item-1",
					tenantId: TENANT_A,
					searchableText: ["Margherita Pizza", "Classic Italian pizza with tomato and mozzarella"],
					facets: {
						status: "active",
						visibility: "published",
						categoryId: "cat-1",
						price: 999,
						name: "Margherita Pizza",
					},
					sortFields: { name: "margherita pizza", price: 999, sortOrder: 1 },
				})
			);
			service.indexDocument(
				sampleCatalogDoc({
					id: "item-2",
					tenantId: TENANT_A,
					searchableText: ["Pepperoni Pizza", "Pepperoni with extra cheese"],
					facets: {
						status: "active",
						visibility: "published",
						categoryId: "cat-1",
						price: 1199,
						name: "Pepperoni Pizza",
					},
					sortFields: { name: "pepperoni pizza", price: 1199, sortOrder: 2 },
				})
			);
			service.indexDocument(
				sampleCatalogDoc({
					id: "item-3",
					tenantId: TENANT_A,
					searchableText: ["Caesar Salad", "Fresh romaine with Caesar dressing"],
					facets: {
						status: "inactive",
						visibility: "draft",
						categoryId: "cat-2",
						price: 799,
						name: "Caesar Salad",
					},
					sortFields: { name: "caesar salad", price: 799, sortOrder: 3 },
				})
			);
			// Different tenant
			service.indexDocument(
				sampleCatalogDoc({
					id: "item-4",
					tenantId: TENANT_B,
					searchableText: ["Tenant B Pizza"],
					facets: { status: "active", name: "Tenant B Pizza" },
					sortFields: { name: "tenant b pizza", price: 500, sortOrder: 1 },
				})
			);
		});

		it("returns all documents for a tenant when no query", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
			});
			expect(result.totalCount).toBe(3);
		});

		it("enforces tenant isolation — no cross-tenant leakage", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
			});
			// TENANT_A should not see TENANT_B data
			expect(result.totalCount).toBe(3);
			for (const item of result.items) {
				expect(item.item).toBeDefined();
			}

			const resultB = service.search({
				tenantId: TENANT_B,
				entityType: "catalog-item",
			});
			expect(resultB.totalCount).toBe(1);
		});

		it("full-text search filters by query term", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				query: "pizza",
			});
			expect(result.totalCount).toBe(2);
		});

		it("full-text search is case-insensitive", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				query: "PIZZA",
			});
			expect(result.totalCount).toBe(2);
		});

		it("applies enum filters", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				filters: [
					{ type: "enum", field: "status", values: ["active"] },
				],
			});
			expect(result.totalCount).toBe(2);
		});

		it("applies range filters", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				filters: [
					{
						type: "range",
						field: "price",
						min: 800,
						max: 1000,
					},
				],
			});
			expect(result.totalCount).toBe(1);
		});

		it("applies combined full-text and filters", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				query: "pizza",
				filters: [
					{ type: "enum", field: "status", values: ["active"] },
				],
			});
			expect(result.totalCount).toBe(2);
		});

		it("applies boolean filters", () => {
			// Index a service with isBookable
			service.indexDocument({
				id: "svc-1",
				tenantId: TENANT_A,
				entityType: "service",
				searchableText: ["Haircut"],
				facets: { status: "active", isBookable: true },
				sortFields: { name: "haircut" },
				indexedAt: new Date().toISOString(),
			});
			service.indexDocument({
				id: "svc-2",
				tenantId: TENANT_A,
				entityType: "service",
				searchableText: ["Walk-in only"],
				facets: { status: "active", isBookable: false },
				sortFields: { name: "walk-in" },
				indexedAt: new Date().toISOString(),
			});

			const result = service.search({
				tenantId: TENANT_A,
				entityType: "service",
				filters: [
					{ type: "boolean", field: "isBookable", value: true },
				],
			});
			expect(result.totalCount).toBe(1);
		});

		it("applies text filters on facet fields", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				filters: [
					{ type: "text", field: "name", value: "Margherita" },
				],
			});
			expect(result.totalCount).toBe(1);
		});

		it("sorts by field ascending", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				sort: [{ field: "price", direction: "asc" }],
			});
			expect(result.items).toHaveLength(3);
			const prices = result.items.map(
				(i) => (i.item as Record<string, unknown>).price
			);
			expect(prices[0]).toBeLessThanOrEqual(prices[1] as number);
		});

		it("sorts by field descending", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				sort: [{ field: "price", direction: "desc" }],
			});
			const prices = result.items.map(
				(i) => (i.item as Record<string, unknown>).price
			);
			expect(prices[0]).toBeGreaterThanOrEqual(prices[1] as number);
		});

		it("returns relevance scores for search queries", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				query: "Margherita Pizza",
			});
			expect(result.items.length).toBeGreaterThan(0);
			// The exact match should score higher
			expect(result.items[0].score).toBeGreaterThan(0);
		});

		it("rejects invalid search queries", () => {
			expect(() =>
				service.search({
					tenantId: "",
					entityType: "catalog-item",
				})
			).toThrow(SearchError);
		});

		it("rejects invalid page size", () => {
			expect(() =>
				service.search({
					tenantId: TENANT_A,
					entityType: "catalog-item",
					pageSize: 0,
				})
			).toThrow(SearchError);
		});
	});

	// -------------------------------------------------------------------
	// Cursor-based pagination
	// -------------------------------------------------------------------

	describe("cursor-based pagination", () => {
		beforeEach(() => {
			// Seed 10 items
			for (let i = 1; i <= 10; i++) {
				service.indexDocument(
					sampleCatalogDoc({
						id: `item-${i}`,
						tenantId: TENANT_A,
						searchableText: [`Item ${i}`],
						facets: { status: "active", name: `Item ${i}` },
						sortFields: { name: `item ${i}`, sortOrder: i },
					})
				);
			}
		});

		it("returns first page with cursor", () => {
			const result = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				pageSize: 3,
			});
			expect(result.items).toHaveLength(3);
			expect(result.totalCount).toBe(10);
			expect(result.hasMore).toBe(true);
			expect(result.nextCursor).not.toBeNull();
		});

		it("fetches next page using cursor", () => {
			const page1 = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				pageSize: 3,
			});

			const page2 = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				pageSize: 3,
				cursor: page1.nextCursor!,
			});
			expect(page2.items).toHaveLength(3);
			expect(page2.hasMore).toBe(true);
		});

		it("returns last page correctly", () => {
			const page1 = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				pageSize: 8,
			});
			const page2 = service.search({
				tenantId: TENANT_A,
				entityType: "catalog-item",
				pageSize: 8,
				cursor: page1.nextCursor!,
			});
			expect(page2.items).toHaveLength(2);
			expect(page2.hasMore).toBe(false);
			expect(page2.nextCursor).toBeNull();
		});

		it("paginates through all items without duplicates", () => {
			const allIds = new Set<string>();
			let cursor: string | undefined = undefined;
			let iterations = 0;
			let hasMore = true;

			while (hasMore) {
				const query: EntitySearchQuery = {
					tenantId: TENANT_A,
					entityType: "catalog-item",
					pageSize: 3,
				};
				if (cursor) {
					query.cursor = cursor;
				}
				const result = service.search<Record<string, unknown>>(query);
				for (const item of result.items) {
					allIds.add(item.item.name as string);
				}
				cursor = result.nextCursor ?? undefined;
				hasMore = result.hasMore;
				iterations++;
			}

			expect(allIds.size).toBe(10);
			expect(iterations).toBe(4); // 10 items / 3 per page = 4 pages
		});
	});

	// -------------------------------------------------------------------
	// Autocomplete (E11-S3-T3)
	// -------------------------------------------------------------------

	describe("autocomplete", () => {
		beforeEach(() => {
			service.indexDocument(
				sampleCatalogDoc({
					id: "item-1",
					searchableText: ["Margherita Pizza"],
				})
			);
			service.indexDocument(
				sampleCatalogDoc({
					id: "item-2",
					searchableText: ["Marinara Pizza"],
				})
			);
			service.indexDocument(
				sampleCatalogDoc({
					id: "item-3",
					searchableText: ["Caesar Salad"],
				})
			);
			service.indexDocument(
				sampleCatalogDoc({
					id: "item-4",
					tenantId: TENANT_B,
					searchableText: ["Margherita Special"],
				})
			);
		});

		it("returns prefix-matched suggestions", () => {
			const result = service.autocomplete({
				tenantId: TENANT_A,
				prefix: "Mar",
			});
			expect(result.suggestions).toHaveLength(2);
			expect(
				result.suggestions.every((s) =>
					s.text.toLowerCase().startsWith("mar")
				)
			).toBe(true);
		});

		it("is case-insensitive", () => {
			const result = service.autocomplete({
				tenantId: TENANT_A,
				prefix: "mar",
			});
			expect(result.suggestions).toHaveLength(2);
		});

		it("enforces tenant isolation", () => {
			const result = service.autocomplete({
				tenantId: TENANT_A,
				prefix: "Mar",
			});
			// Should not include TENANT_B's "Margherita Special"
			expect(result.suggestions).toHaveLength(2);
			expect(
				result.suggestions.every((s) => s.entityId !== "item-4")
			).toBe(true);
		});

		it("respects limit parameter", () => {
			const result = service.autocomplete({
				tenantId: TENANT_A,
				prefix: "Mar",
				limit: 1,
			});
			expect(result.suggestions).toHaveLength(1);
		});

		it("filters by entity type", () => {
			service.indexDocument({
				id: "svc-1",
				tenantId: TENANT_A,
				entityType: "service",
				searchableText: ["Manicure"],
				facets: {},
				sortFields: {},
				indexedAt: new Date().toISOString(),
			});

			const result = service.autocomplete({
				tenantId: TENANT_A,
				prefix: "Ma",
				entityTypes: ["catalog-item"],
			});
			expect(
				result.suggestions.every(
					(s) => s.entityType === "catalog-item"
				)
			).toBe(true);
		});

		it("returns empty for no matches", () => {
			const result = service.autocomplete({
				tenantId: TENANT_A,
				prefix: "XYZ",
			});
			expect(result.suggestions).toHaveLength(0);
		});

		it("rejects invalid autocomplete queries", () => {
			expect(() =>
				service.autocomplete({
					tenantId: "",
					prefix: "test",
				})
			).toThrow(SearchError);
		});

		it("returns suggestions sorted by score", () => {
			const result = service.autocomplete({
				tenantId: TENANT_A,
				prefix: "Mar",
			});
			if (result.suggestions.length > 1) {
				expect(result.suggestions[0].score).toBeGreaterThanOrEqual(
					result.suggestions[1].score
				);
			}
		});
	});

	// -------------------------------------------------------------------
	// Filter toolbar definitions (E11-S3-T4)
	// -------------------------------------------------------------------

	describe("filter toolbar definitions", () => {
		it("returns toolbar for catalog items", () => {
			const toolbar = service.getFilterToolbarDefinition("catalog-item");
			expect(toolbar).not.toBeNull();
			expect(toolbar!.entityType).toBe("catalog-item");
			expect(toolbar!.filters.length).toBeGreaterThan(0);
			expect(toolbar!.sortOptions.length).toBeGreaterThan(0);
		});

		it("returns toolbar for orders", () => {
			const toolbar = service.getFilterToolbarDefinition("order");
			expect(toolbar).not.toBeNull();
			expect(toolbar!.filters.some((f) => f.field === "status")).toBe(
				true
			);
		});

		it("returns toolbar for customers", () => {
			const toolbar = service.getFilterToolbarDefinition("customer");
			expect(toolbar).not.toBeNull();
		});

		it("returns toolbar for services", () => {
			const toolbar = service.getFilterToolbarDefinition("service");
			expect(toolbar).not.toBeNull();
		});

		it("returns toolbar for all indexed entity types", () => {
			const entityTypes = [
				"catalog-item",
				"order",
				"customer",
				"service",
				"booking",
				"staff",
				"content-page",
			] as const;

			for (const et of entityTypes) {
				const toolbar = service.getFilterToolbarDefinition(et);
				expect(toolbar).not.toBeNull();
				expect(toolbar!.entityType).toBe(et);
			}
		});

		it("provides default sort for each entity type", () => {
			const toolbar = service.getFilterToolbarDefinition("catalog-item");
			expect(toolbar!.defaultSort.field).toBeDefined();
			expect(toolbar!.defaultSort.direction).toBeDefined();
		});
	});

	// -------------------------------------------------------------------
	// Entity index configs
	// -------------------------------------------------------------------

	describe("entity index configs", () => {
		it("provides config for all indexed entity types", () => {
			const entityTypes = [
				"catalog-item",
				"service",
				"order",
				"booking",
				"customer",
				"staff",
				"content-page",
			] as const;

			for (const et of entityTypes) {
				const config = service.getEntityIndexConfig(et);
				expect(config).not.toBeNull();
				expect(config!.entityType).toBe(et);
				expect(config!.searchableFields.length).toBeGreaterThan(0);
			}
		});
	});
});

// ---------------------------------------------------------------------------
// Consumer contracts (E11-S3-T5)
// ---------------------------------------------------------------------------

describe("search consumer contracts", () => {
	it("builds catalog item document", () => {
		const doc = buildCatalogItemDocument({
			id: "item-1",
			tenantId: "t-1",
			name: "Pizza",
			description: "Delicious pizza",
			slug: "pizza",
			status: "active",
			visibility: "published",
			categoryId: "cat-1",
			price: 999,
			sortOrder: 1,
		});

		expect(doc.entityType).toBe("catalog-item");
		expect(doc.tenantId).toBe("t-1");
		expect(doc.searchableText).toContain("Pizza");
		expect(doc.searchableText).toContain("Delicious pizza");
		expect(doc.facets.status).toBe("active");
	});

	it("builds catalog item document without description", () => {
		const doc = buildCatalogItemDocument({
			id: "item-1",
			tenantId: "t-1",
			name: "Pizza",
			slug: "pizza",
			status: "active",
			visibility: "published",
			categoryId: "cat-1",
			price: 999,
			sortOrder: 1,
		});

		expect(doc.searchableText).toEqual(["Pizza"]);
	});

	it("builds order document", () => {
		const doc = buildOrderDocument({
			id: "order-1",
			tenantId: "t-1",
			customerName: "John Doe",
			customerEmail: "john@example.com",
			status: "placed",
			fulfillmentMode: "pickup",
			totalCents: 2500,
			createdAt: "2024-01-01T00:00:00Z",
		});

		expect(doc.entityType).toBe("order");
		expect(doc.searchableText).toContain("John Doe");
		expect(doc.searchableText).toContain("john@example.com");
		expect(doc.facets.status).toBe("placed");
	});

	it("builds order document with null customer fields", () => {
		const doc = buildOrderDocument({
			id: "order-1",
			tenantId: "t-1",
			customerName: null,
			customerEmail: null,
			status: "placed",
			fulfillmentMode: "pickup",
			totalCents: 2500,
			createdAt: "2024-01-01T00:00:00Z",
		});

		expect(doc.searchableText).toEqual(["order-1"]);
	});

	it("builds customer document", () => {
		const doc = buildCustomerDocument({
			id: "cust-1",
			tenantId: "t-1",
			email: "jane@example.com",
			displayName: "Jane Doe",
			phone: "555-1234",
			createdAt: "2024-01-01T00:00:00Z",
		});

		expect(doc.entityType).toBe("customer");
		expect(doc.searchableText).toContain("Jane Doe");
		expect(doc.searchableText).toContain("jane@example.com");
		expect(doc.searchableText).toContain("555-1234");
	});

	it("builds customer document with null fields", () => {
		const doc = buildCustomerDocument({
			id: "cust-1",
			tenantId: "t-1",
			email: "jane@example.com",
			displayName: null,
			phone: null,
			createdAt: "2024-01-01T00:00:00Z",
		});

		expect(doc.searchableText).toEqual(["jane@example.com"]);
	});

	it("builds service document", () => {
		const doc = buildServiceDocument({
			id: "svc-1",
			tenantId: "t-1",
			name: "Haircut",
			description: "Professional haircut",
			status: "active",
			isBookable: true,
			price: 3000,
			sortOrder: 1,
		});

		expect(doc.entityType).toBe("service");
		expect(doc.searchableText).toContain("Haircut");
		expect(doc.facets.isBookable).toBe(true);
	});

	it("builds booking document", () => {
		const doc = buildBookingDocument({
			id: "bk-1",
			tenantId: "t-1",
			customerName: "John",
			serviceName: "Haircut",
			staffName: "Jane",
			status: "confirmed",
			staffId: "staff-1",
			serviceId: "svc-1",
			startTime: "2024-01-15T10:00:00Z",
			createdAt: "2024-01-10T00:00:00Z",
		});

		expect(doc.entityType).toBe("booking");
		expect(doc.searchableText).toContain("John");
		expect(doc.searchableText).toContain("Haircut");
		expect(doc.facets.status).toBe("confirmed");
	});

	it("builds staff document", () => {
		const doc = buildStaffDocument({
			id: "staff-1",
			tenantId: "t-1",
			displayName: "Jane Smith",
			email: "jane@salon.com",
			role: "Stylist",
			status: "active",
			isBookable: true,
		});

		expect(doc.entityType).toBe("staff");
		expect(doc.searchableText).toContain("Jane Smith");
		expect(doc.searchableText).toContain("Stylist");
	});

	it("builds content page document", () => {
		const doc = buildContentPageDocument({
			id: "page-1",
			tenantId: "t-1",
			title: "About Us",
			slug: "about-us",
			status: "published",
			sortOrder: 1,
			createdAt: "2024-01-01T00:00:00Z",
		});

		expect(doc.entityType).toBe("content-page");
		expect(doc.searchableText).toContain("About Us");
		expect(doc.searchableText).toContain("about-us");
	});
});

// ---------------------------------------------------------------------------
// Entity index config structure tests
// ---------------------------------------------------------------------------

describe("entity index configs structure", () => {
	it("all entity types have valid configs", () => {
		const entityTypes = [
			"catalog-item",
			"service",
			"order",
			"booking",
			"customer",
			"staff",
			"content-page",
		] as const;

		for (const et of entityTypes) {
			const config = ENTITY_INDEX_CONFIGS[et];
			expect(config).toBeDefined();
			expect(config.entityType).toBe(et);
			expect(config.searchableFields.length).toBeGreaterThan(0);
			expect(config.sortableFields.length).toBeGreaterThan(0);
		}
	});
});

describe("filter toolbar definitions structure", () => {
	it("all entity types have toolbar definitions", () => {
		const entityTypes = [
			"catalog-item",
			"service",
			"order",
			"booking",
			"customer",
			"staff",
			"content-page",
		] as const;

		for (const et of entityTypes) {
			const toolbar = FILTER_TOOLBAR_DEFINITIONS[et];
			expect(toolbar).toBeDefined();
			expect(toolbar!.entityType).toBe(et);
			expect(toolbar!.filters.length).toBeGreaterThan(0);
			expect(toolbar!.sortOptions.length).toBeGreaterThan(0);
			expect(toolbar!.defaultSort).toBeDefined();
		}
	});

	it("enum filters have options defined", () => {
		for (const toolbar of Object.values(FILTER_TOOLBAR_DEFINITIONS)) {
			if (!toolbar) continue;
			for (const filter of toolbar.filters) {
				if (filter.type === "enum") {
					expect(filter.options).toBeDefined();
					expect(filter.options!.length).toBeGreaterThan(0);
					for (const opt of filter.options!) {
						expect(opt.value).toBeDefined();
						expect(opt.label).toBeDefined();
					}
				}
			}
		}
	});
});
