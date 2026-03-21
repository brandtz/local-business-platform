import { describe, expect, it } from "vitest";

import {
	TemplateApplicationService,
	TemplateApplicationError,
} from "./template-application.service";
import { VerticalDomainMappingService } from "./vertical-domain-mapping.service";
import type { ExistingTenantData } from "./template-application.service";
import type { BusinessVertical } from "@platform/types";
import { businessVerticals } from "@platform/types";

function emptyExistingData(): ExistingTenantData {
	return {
		categoryNames: [],
		contentPageSlugs: [],
		hasBusinessHours: false,
		serviceSlugs: [],
	};
}

describe("TemplateApplicationService", () => {
	const domainMapping = new VerticalDomainMappingService();
	const service = new TemplateApplicationService(domainMapping);
	const tenantId = "tenant-001";

	describe("applyTemplate", () => {
		it.each([...businessVerticals])(
			"applies template for new %s tenant",
			(vertical) => {
				const result = service.applyTemplate(
					vertical,
					tenantId,
					emptyExistingData()
				);

				expect(result.applied).toBe(true);
				if (result.applied) {
					expect(result.vertical).toBe(vertical);
					expect(result.categoriesSeeded).toBeGreaterThan(0);
					expect(result.contentPagesSeeded).toBeGreaterThan(0);
					expect(result.hoursApplied).toBeGreaterThan(0);
					expect(result.skipped).toHaveLength(0);
				}
			}
		);

		it("seeds services for contractor vertical", () => {
			const result = service.applyTemplate(
				"contractor",
				tenantId,
				emptyExistingData()
			);

			expect(result.applied).toBe(true);
			if (result.applied) {
				expect(result.servicesSeeded).toBe(3);
			}
		});

		it("seeds zero services for restaurant vertical", () => {
			const result = service.applyTemplate(
				"restaurant",
				tenantId,
				emptyExistingData()
			);

			expect(result.applied).toBe(true);
			if (result.applied) {
				expect(result.servicesSeeded).toBe(0);
			}
		});

		it("throws for unsupported vertical", () => {
			expect(() =>
				service.applyTemplate(
					"unknown" as BusinessVertical,
					tenantId,
					emptyExistingData()
				)
			).toThrow(TemplateApplicationError);
		});
	});

	describe("idempotency", () => {
		it("returns already-applied when all data exists", () => {
			const result = service.applyTemplate("restaurant", tenantId, {
				categoryNames: ["Appetizers", "Entrees", "Desserts", "Beverages"],
				contentPageSlugs: ["about", "menu"],
				hasBusinessHours: true,
				serviceSlugs: [],
			});

			expect(result.applied).toBe(false);
			if (!result.applied) {
				expect(result.reason).toBe("already-applied");
			}
		});

		it("still seeds missing categories when some exist", () => {
			const result = service.applyTemplate("restaurant", tenantId, {
				categoryNames: ["Appetizers", "Entrees"],
				contentPageSlugs: ["about", "menu"],
				hasBusinessHours: true,
				serviceSlugs: [],
			});

			expect(result.applied).toBe(true);
			if (result.applied) {
				expect(result.categoriesSeeded).toBe(2); // Desserts, Beverages
				expect(result.skipped).toContain("category:Appetizers");
				expect(result.skipped).toContain("category:Entrees");
			}
		});

		it("skips business hours when already set", () => {
			const result = service.applyTemplate("contractor", tenantId, {
				categoryNames: [],
				contentPageSlugs: [],
				hasBusinessHours: true,
				serviceSlugs: [],
			});

			expect(result.applied).toBe(true);
			if (result.applied) {
				expect(result.hoursApplied).toBe(0);
				expect(result.skipped).toContain("businessHours");
			}
		});

		it("skips existing services", () => {
			const result = service.applyTemplate("contractor", tenantId, {
				categoryNames: [],
				contentPageSlugs: [],
				hasBusinessHours: false,
				serviceSlugs: ["free-consultation"],
			});

			expect(result.applied).toBe(true);
			if (result.applied) {
				expect(result.servicesSeeded).toBe(2);
				expect(result.skipped).toContain("service:free-consultation");
			}
		});

		it("skips existing content pages", () => {
			const result = service.applyTemplate("restaurant", tenantId, {
				categoryNames: [],
				contentPageSlugs: ["about"],
				hasBusinessHours: false,
				serviceSlugs: [],
			});

			expect(result.applied).toBe(true);
			if (result.applied) {
				expect(result.contentPagesSeeded).toBe(1); // only "menu"
				expect(result.skipped).toContain("content:about");
			}
		});
	});

	describe("customization detection", () => {
		it("preserves categories with matching names (case-insensitive)", () => {
			const result = service.applyTemplate("restaurant", tenantId, {
				categoryNames: ["appetizers"], // lowercase
				contentPageSlugs: [],
				hasBusinessHours: false,
				serviceSlugs: [],
			});

			expect(result.applied).toBe(true);
			if (result.applied) {
				expect(result.categoriesSeeded).toBe(3);
				expect(result.skipped).toContain("category:Appetizers");
			}
		});
	});

	describe("previewTemplate", () => {
		it("returns a seed plan without applying", () => {
			const plan = service.previewTemplate("contractor", tenantId);

			expect(plan.vertical).toBe("contractor");
			expect(plan.categories.length).toBe(3);
			expect(plan.services.length).toBe(3);
			expect(plan.contentPages.length).toBe(3);
		});

		it("throws for unsupported vertical", () => {
			expect(() =>
				service.previewTemplate("unknown" as BusinessVertical, tenantId)
			).toThrow(TemplateApplicationError);
		});
	});

	describe("computeSeededEntities", () => {
		it("returns full counts for empty tenant", () => {
			const counts = service.computeSeededEntities(
				"restaurant",
				tenantId,
				emptyExistingData()
			);

			expect(counts.categories).toBe(4);
			expect(counts.contentPages).toBe(2);
			expect(counts.hours).toBe(7);
			expect(counts.services).toBe(0);
		});

		it("reduces counts when data already exists", () => {
			const counts = service.computeSeededEntities(
				"restaurant",
				tenantId,
				{
					categoryNames: ["Appetizers", "Entrees"],
					contentPageSlugs: ["about"],
					hasBusinessHours: true,
					serviceSlugs: [],
				}
			);

			expect(counts.categories).toBe(2);
			expect(counts.contentPages).toBe(1);
			expect(counts.hours).toBe(0);
		});
	});
});
