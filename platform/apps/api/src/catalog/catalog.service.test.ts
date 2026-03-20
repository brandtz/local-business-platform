import { describe, expect, it, beforeEach } from "vitest";

import { CatalogRepository } from "./catalog.repository";
import {
	CatalogNotFoundError,
	CatalogService,
	CatalogSlugConflictError,
	CatalogValidationError
} from "./catalog.service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function createService(): CatalogService {
	const repository = new CatalogRepository();
	return new CatalogService(repository);
}

describe("CatalogService", () => {
	let service: CatalogService;

	beforeEach(() => {
		service = createService();
	});

	// -----------------------------------------------------------------------
	// Categories
	// -----------------------------------------------------------------------

	describe("categories", () => {
		it("creates and retrieves a category", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Appetizers",
				slug: "appetizers"
			});

			expect(category.name).toBe("Appetizers");
			expect(category.slug).toBe("appetizers");
			expect(category.tenantId).toBe(TENANT_A);
			expect(category.status).toBe("active");

			const retrieved = service.getCategory(TENANT_A, category.id);
			expect(retrieved.id).toBe(category.id);
		});

		it("lists categories with pagination", () => {
			service.createCategory(TENANT_A, { name: "Cat A", slug: "cat-a" });
			service.createCategory(TENANT_A, { name: "Cat B", slug: "cat-b" });
			service.createCategory(TENANT_A, { name: "Cat C", slug: "cat-c" });

			const page1 = service.listCategories(TENANT_A, { page: 1, pageSize: 2 });
			expect(page1.items).toHaveLength(2);
			expect(page1.total).toBe(3);
			expect(page1.page).toBe(1);
			expect(page1.pageSize).toBe(2);

			const page2 = service.listCategories(TENANT_A, { page: 2, pageSize: 2 });
			expect(page2.items).toHaveLength(1);
		});

		it("updates a category", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Original",
				slug: "original"
			});

			const updated = service.updateCategory(TENANT_A, category.id, {
				name: "Updated",
				status: "archived"
			});

			expect(updated.name).toBe("Updated");
			expect(updated.status).toBe("archived");
		});

		it("deletes a category", () => {
			const category = service.createCategory(TENANT_A, {
				name: "To Delete",
				slug: "to-delete"
			});

			service.deleteCategory(TENANT_A, category.id);

			expect(() =>
				service.getCategory(TENANT_A, category.id)
			).toThrow(CatalogNotFoundError);
		});

		it("enforces slug uniqueness per tenant", () => {
			service.createCategory(TENANT_A, { name: "Cat A", slug: "same-slug" });

			expect(() =>
				service.createCategory(TENANT_A, { name: "Cat B", slug: "same-slug" })
			).toThrow(CatalogSlugConflictError);
		});

		it("allows same slug for different tenants", () => {
			service.createCategory(TENANT_A, { name: "Cat A", slug: "shared-slug" });
			const catB = service.createCategory(TENANT_B, { name: "Cat B", slug: "shared-slug" });

			expect(catB.slug).toBe("shared-slug");
			expect(catB.tenantId).toBe(TENANT_B);
		});

		it("validates category name is required", () => {
			expect(() =>
				service.createCategory(TENANT_A, { name: "", slug: "empty-name" })
			).toThrow(CatalogValidationError);
		});

		it("validates category slug format", () => {
			expect(() =>
				service.createCategory(TENANT_A, { name: "Test", slug: "INVALID SLUG" })
			).toThrow(CatalogValidationError);
		});

		it("enforces tenant isolation on get", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Tenant A Only",
				slug: "tenant-a-only"
			});

			expect(() =>
				service.getCategory(TENANT_B, category.id)
			).toThrow(CatalogNotFoundError);
		});

		it("enforces tenant isolation on list", () => {
			service.createCategory(TENANT_A, { name: "A1", slug: "a1" });
			service.createCategory(TENANT_B, { name: "B1", slug: "b1" });

			const listA = service.listCategories(TENANT_A);
			const listB = service.listCategories(TENANT_B);

			expect(listA.items).toHaveLength(1);
			expect(listA.items[0].name).toBe("A1");
			expect(listB.items).toHaveLength(1);
			expect(listB.items[0].name).toBe("B1");
		});

		it("filters categories by status", () => {
			service.createCategory(TENANT_A, { name: "Active", slug: "active-cat" });
			const archived = service.createCategory(TENANT_A, { name: "Archived", slug: "archived-cat" });
			service.updateCategory(TENANT_A, archived.id, { status: "archived" });

			const activeOnly = service.listCategories(TENANT_A, { status: "active" });
			expect(activeOnly.items).toHaveLength(1);
			expect(activeOnly.items[0].name).toBe("Active");
		});

		it("searches categories by name", () => {
			service.createCategory(TENANT_A, { name: "Appetizers", slug: "appetizers" });
			service.createCategory(TENANT_A, { name: "Desserts", slug: "desserts" });

			const results = service.listCategories(TENANT_A, { search: "app" });
			expect(results.items).toHaveLength(1);
			expect(results.items[0].name).toBe("Appetizers");
		});
	});

	// -----------------------------------------------------------------------
	// Items
	// -----------------------------------------------------------------------

	describe("items", () => {
		it("creates and retrieves an item with variants", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});

			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Burger",
				slug: "burger",
				variants: [
					{ isDefault: true, name: "Regular", priceCents: 1500 },
					{ isDefault: false, name: "Large", priceCents: 1800 }
				]
			});

			expect(item.name).toBe("Burger");
			expect(item.status).toBe("draft");
			expect(item.tenantId).toBe(TENANT_A);

			const variants = service.listVariants(TENANT_A, item.id);
			expect(variants).toHaveLength(2);
		});

		it("creates an item with modifiers", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});

			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Pizza",
				slug: "pizza",
				modifiers: [
					{ isRequired: false, name: "Extra Cheese", priceCents: 200 }
				],
				variants: [
					{ isDefault: true, name: "Regular", priceCents: 1200 }
				]
			});

			const modifiers = service.listModifiers(TENANT_A, item.id);
			expect(modifiers).toHaveLength(1);
			expect(modifiers[0].name).toBe("Extra Cheese");
		});

		it("updates an item", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Original",
				slug: "original",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1000 }]
			});

			const updated = service.updateItem(TENANT_A, item.id, {
				name: "Updated",
				status: "active"
			});

			expect(updated.name).toBe("Updated");
			expect(updated.status).toBe("active");
		});

		it("deletes an item and cascades to variants, modifiers, and media", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "To Delete",
				slug: "to-delete",
				modifiers: [
					{ isRequired: false, name: "Extra", priceCents: 100 }
				],
				variants: [{ isDefault: true, name: "Regular", priceCents: 1000 }]
			});

			service.createMedia(TENANT_A, item.id, {
				url: "https://cdn.example.com/img.jpg"
			});

			service.deleteItem(TENANT_A, item.id);

			expect(service.listVariants(TENANT_A, item.id)).toHaveLength(0);
			expect(service.listModifiers(TENANT_A, item.id)).toHaveLength(0);
			expect(service.listMedia(TENANT_A, item.id)).toHaveLength(0);
		});

		it("enforces slug uniqueness per tenant for items", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});

			service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Item A",
				slug: "same-slug",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1000 }]
			});

			expect(() =>
				service.createItem(TENANT_A, {
					categoryId: category.id,
					name: "Item B",
					slug: "same-slug",
					variants: [{ isDefault: true, name: "Regular", priceCents: 1000 }]
				})
			).toThrow(CatalogSlugConflictError);
		});

		it("requires at least one variant", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});

			expect(() =>
				service.createItem(TENANT_A, {
					categoryId: category.id,
					name: "No Variants",
					slug: "no-variants",
					variants: []
				})
			).toThrow(CatalogValidationError);
		});

		it("validates price cents on variants", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});

			expect(() =>
				service.createItem(TENANT_A, {
					categoryId: category.id,
					name: "Bad Price",
					slug: "bad-price",
					variants: [{ isDefault: true, name: "Regular", priceCents: -100 }]
				})
			).toThrow(CatalogValidationError);
		});

		it("rejects items for non-existent category", () => {
			expect(() =>
				service.createItem(TENANT_A, {
					categoryId: "non-existent",
					name: "Orphan",
					slug: "orphan",
					variants: [{ isDefault: true, name: "Regular", priceCents: 1000 }]
				})
			).toThrow(CatalogNotFoundError);
		});

		it("enforces tenant isolation on items", () => {
			const catA = service.createCategory(TENANT_A, { name: "Cat A", slug: "cat-a" });
			const item = service.createItem(TENANT_A, {
				categoryId: catA.id,
				name: "Item A",
				slug: "item-a",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1000 }]
			});

			expect(() => service.getItem(TENANT_B, item.id)).toThrow(CatalogNotFoundError);
		});

		it("filters items by category", () => {
			const cat1 = service.createCategory(TENANT_A, { name: "Cat 1", slug: "cat-1" });
			const cat2 = service.createCategory(TENANT_A, { name: "Cat 2", slug: "cat-2" });

			service.createItem(TENANT_A, {
				categoryId: cat1.id,
				name: "Item 1",
				slug: "item-1",
				variants: [{ isDefault: true, name: "R", priceCents: 1000 }]
			});
			service.createItem(TENANT_A, {
				categoryId: cat2.id,
				name: "Item 2",
				slug: "item-2",
				variants: [{ isDefault: true, name: "R", priceCents: 1000 }]
			});

			const cat1Items = service.listItems(TENANT_A, { categoryId: cat1.id });
			expect(cat1Items.items).toHaveLength(1);
			expect(cat1Items.items[0].name).toBe("Item 1");
		});
	});

	// -----------------------------------------------------------------------
	// Variants
	// -----------------------------------------------------------------------

	describe("variants", () => {
		it("creates and updates a variant", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Burger",
				slug: "burger",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1500 }]
			});

			const newVariant = service.createVariant(TENANT_A, item.id, {
				isDefault: false,
				name: "XL",
				priceCents: 2000
			});

			expect(newVariant.name).toBe("XL");

			const updated = service.updateVariant(TENANT_A, newVariant.id, {
				priceCents: 2200
			});

			expect(updated.priceCents).toBe(2200);
		});

		it("deletes a variant", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Burger",
				slug: "burger",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1500 }]
			});
			const variants = service.listVariants(TENANT_A, item.id);
			service.deleteVariant(TENANT_A, variants[0].id);
			expect(service.listVariants(TENANT_A, item.id)).toHaveLength(0);
		});

		it("validates variant price on create", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Burger",
				slug: "burger",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1500 }]
			});

			expect(() =>
				service.createVariant(TENANT_A, item.id, {
					isDefault: false,
					name: "Bad",
					priceCents: -50
				})
			).toThrow(CatalogValidationError);
		});
	});

	// -----------------------------------------------------------------------
	// Modifiers
	// -----------------------------------------------------------------------

	describe("modifiers", () => {
		it("creates and updates a modifier", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Pizza",
				slug: "pizza",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1200 }]
			});

			const modifier = service.createModifier(TENANT_A, item.id, {
				isRequired: false,
				name: "Extra Cheese",
				priceCents: 200
			});

			expect(modifier.name).toBe("Extra Cheese");

			const updated = service.updateModifier(TENANT_A, modifier.id, {
				priceCents: 250
			});

			expect(updated.priceCents).toBe(250);
		});

		it("deletes a modifier", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Pizza",
				slug: "pizza",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1200 }]
			});

			const modifier = service.createModifier(TENANT_A, item.id, {
				isRequired: false,
				name: "Extra Cheese",
				priceCents: 200
			});

			service.deleteModifier(TENANT_A, modifier.id);
			expect(service.listModifiers(TENANT_A, item.id)).toHaveLength(0);
		});
	});

	// -----------------------------------------------------------------------
	// Media
	// -----------------------------------------------------------------------

	describe("media", () => {
		it("creates and lists media for an item", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Pizza",
				slug: "pizza",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1200 }]
			});

			const media = service.createMedia(TENANT_A, item.id, {
				altText: "Pizza photo",
				url: "https://cdn.example.com/pizza.jpg"
			});

			expect(media.url).toBe("https://cdn.example.com/pizza.jpg");
			expect(media.altText).toBe("Pizza photo");

			const list = service.listMedia(TENANT_A, item.id);
			expect(list).toHaveLength(1);
		});

		it("deletes media", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Pizza",
				slug: "pizza",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1200 }]
			});

			const media = service.createMedia(TENANT_A, item.id, {
				url: "https://cdn.example.com/pizza.jpg"
			});

			service.deleteMedia(TENANT_A, media.id);
			expect(service.listMedia(TENANT_A, item.id)).toHaveLength(0);
		});

		it("validates media URL is required", () => {
			const category = service.createCategory(TENANT_A, {
				name: "Entrees",
				slug: "entrees"
			});
			const item = service.createItem(TENANT_A, {
				categoryId: category.id,
				name: "Pizza",
				slug: "pizza",
				variants: [{ isDefault: true, name: "Regular", priceCents: 1200 }]
			});

			expect(() =>
				service.createMedia(TENANT_A, item.id, { url: "" })
			).toThrow(CatalogValidationError);
		});
	});
});
