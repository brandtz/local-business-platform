import { describe, expect, it, beforeEach } from "vitest";

import { CatalogRepository } from "./catalog.repository";
import { CatalogService } from "./catalog.service";
import { StorefrontCatalogService } from "./storefront-catalog.service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function createServices(): {
	catalog: CatalogService;
	storefront: StorefrontCatalogService;
} {
	const repository = new CatalogRepository();
	return {
		catalog: new CatalogService(repository),
		storefront: new StorefrontCatalogService(repository)
	};
}

describe("StorefrontCatalogService", () => {
	let catalog: CatalogService;
	let storefront: StorefrontCatalogService;

	beforeEach(() => {
		const services = createServices();
		catalog = services.catalog;
		storefront = services.storefront;
	});

	it("returns only active categories and active items", () => {
		const activeCat = catalog.createCategory(TENANT_A, {
			name: "Active Menu",
			slug: "active-menu"
		});
		const archivedCat = catalog.createCategory(TENANT_A, {
			name: "Archived Menu",
			slug: "archived-menu"
		});
		catalog.updateCategory(TENANT_A, archivedCat.id, { status: "archived" });

		const activeItem = catalog.createItem(TENANT_A, {
			categoryId: activeCat.id,
			name: "Active Burger",
			slug: "active-burger",
			variants: [{ isDefault: true, name: "Regular", priceCents: 1500 }]
		});
		catalog.updateItem(TENANT_A, activeItem.id, { status: "active" });

		catalog.createItem(TENANT_A, {
			categoryId: activeCat.id,
			name: "Draft Burger",
			slug: "draft-burger",
			variants: [{ isDefault: true, name: "Regular", priceCents: 1500 }]
		});

		const result = storefront.getActiveCatalog(TENANT_A);

		expect(result.categories).toHaveLength(1);
		expect(result.categories[0].name).toBe("Active Menu");
		expect(result.categories[0].items).toHaveLength(1);
		expect(result.categories[0].items[0].name).toBe("Active Burger");
	});

	it("returns empty catalog for tenant with no active items", () => {
		const result = storefront.getActiveCatalog(TENANT_A);

		expect(result.categories).toHaveLength(0);
	});

	it("includes variants, modifiers, and media in storefront items", () => {
		const cat = catalog.createCategory(TENANT_A, {
			name: "Entrees",
			slug: "entrees"
		});

		const item = catalog.createItem(TENANT_A, {
			categoryId: cat.id,
			modifiers: [
				{ isRequired: false, name: "Extra Cheese", priceCents: 200 }
			],
			name: "Pizza",
			slug: "pizza",
			variants: [
				{ isDefault: true, name: "Small", priceCents: 1200 },
				{ isDefault: false, name: "Large", priceCents: 1800 }
			]
		});

		catalog.updateItem(TENANT_A, item.id, { status: "active" });
		catalog.createMedia(TENANT_A, item.id, {
			altText: "Pizza photo",
			url: "https://cdn.example.com/pizza.jpg"
		});

		const result = storefront.getActiveCatalog(TENANT_A);

		expect(result.categories).toHaveLength(1);
		const storefrontItem = result.categories[0].items[0];

		expect(storefrontItem.variants).toHaveLength(2);
		expect(storefrontItem.variants[0].priceCents).toBe(1200);
		expect(storefrontItem.modifiers).toHaveLength(1);
		expect(storefrontItem.modifiers[0].name).toBe("Extra Cheese");
		expect(storefrontItem.media).toHaveLength(1);
		expect(storefrontItem.media[0].url).toBe("https://cdn.example.com/pizza.jpg");
	});

	it("enforces tenant isolation on storefront reads", () => {
		const catA = catalog.createCategory(TENANT_A, {
			name: "Tenant A Menu",
			slug: "tenant-a-menu"
		});
		const catB = catalog.createCategory(TENANT_B, {
			name: "Tenant B Menu",
			slug: "tenant-b-menu"
		});

		const itemA = catalog.createItem(TENANT_A, {
			categoryId: catA.id,
			name: "Tenant A Item",
			slug: "tenant-a-item",
			variants: [{ isDefault: true, name: "Regular", priceCents: 1000 }]
		});
		catalog.updateItem(TENANT_A, itemA.id, { status: "active" });

		const itemB = catalog.createItem(TENANT_B, {
			categoryId: catB.id,
			name: "Tenant B Item",
			slug: "tenant-b-item",
			variants: [{ isDefault: true, name: "Regular", priceCents: 1000 }]
		});
		catalog.updateItem(TENANT_B, itemB.id, { status: "active" });

		const resultA = storefront.getActiveCatalog(TENANT_A);
		const resultB = storefront.getActiveCatalog(TENANT_B);

		expect(resultA.categories).toHaveLength(1);
		expect(resultA.categories[0].items[0].name).toBe("Tenant A Item");
		expect(resultB.categories).toHaveLength(1);
		expect(resultB.categories[0].items[0].name).toBe("Tenant B Item");
	});

	it("storefront types omit tenant-internal fields", () => {
		const cat = catalog.createCategory(TENANT_A, {
			name: "Menu",
			slug: "menu"
		});
		const item = catalog.createItem(TENANT_A, {
			categoryId: cat.id,
			name: "Burger",
			slug: "burger",
			variants: [{ isDefault: true, name: "Regular", priceCents: 1500 }]
		});
		catalog.updateItem(TENANT_A, item.id, { status: "active" });

		const result = storefront.getActiveCatalog(TENANT_A);
		const storefrontCat = result.categories[0];
		const storefrontItem = storefrontCat.items[0];
		const storefrontVariant = storefrontItem.variants[0];

		// Storefront types should not include tenantId, createdAt, updatedAt
		expect(storefrontCat).not.toHaveProperty("tenantId");
		expect(storefrontCat).not.toHaveProperty("createdAt");
		expect(storefrontItem).not.toHaveProperty("tenantId");
		expect(storefrontItem).not.toHaveProperty("createdAt");
		expect(storefrontItem).not.toHaveProperty("status");
		expect(storefrontVariant).not.toHaveProperty("tenantId");
		expect(storefrontVariant).not.toHaveProperty("createdAt");
		expect(storefrontVariant).not.toHaveProperty("itemId");
	});

	it("looks up individual active items by slug", () => {
		const cat = catalog.createCategory(TENANT_A, {
			name: "Menu",
			slug: "menu"
		});
		const item = catalog.createItem(TENANT_A, {
			categoryId: cat.id,
			name: "Burger",
			slug: "burger",
			variants: [{ isDefault: true, name: "Regular", priceCents: 1500 }]
		});
		catalog.updateItem(TENANT_A, item.id, { status: "active" });

		const found = storefront.getActiveItem(TENANT_A, "burger");
		expect(found).toBeDefined();
		expect(found!.name).toBe("Burger");

		const notFound = storefront.getActiveItem(TENANT_A, "nonexistent");
		expect(notFound).toBeUndefined();
	});

	it("does not return draft items via storefront item lookup", () => {
		const cat = catalog.createCategory(TENANT_A, {
			name: "Menu",
			slug: "menu"
		});
		catalog.createItem(TENANT_A, {
			categoryId: cat.id,
			name: "Draft Item",
			slug: "draft-item",
			variants: [{ isDefault: true, name: "Regular", priceCents: 1500 }]
		});

		const notFound = storefront.getActiveItem(TENANT_A, "draft-item");
		expect(notFound).toBeUndefined();
	});

	it("categories are sorted by displayOrder", () => {
		catalog.createCategory(TENANT_A, {
			displayOrder: 2,
			name: "Second",
			slug: "second"
		});
		catalog.createCategory(TENANT_A, {
			displayOrder: 1,
			name: "First",
			slug: "first"
		});

		const result = storefront.getActiveCatalog(TENANT_A);

		expect(result.categories[0].name).toBe("First");
		expect(result.categories[1].name).toBe("Second");
	});
});
