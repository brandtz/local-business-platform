import { describe, expect, it } from "vitest";

import { VerticalDomainMappingService } from "./vertical-domain-mapping.service";
import { businessVerticals, verticalConfigs } from "@platform/types";

describe("VerticalDomainMappingService", () => {
	const service = new VerticalDomainMappingService();
	const tenantId = "tenant-001";

	describe("buildSeedPlan", () => {
		it.each([...businessVerticals])(
			"builds a complete seed plan for %s",
			(vertical) => {
				const plan = service.buildSeedPlan(vertical, tenantId);
				expect(plan.vertical).toBe(vertical);
				expect(plan.categories.length).toBeGreaterThan(0);
				expect(plan.contentPages.length).toBeGreaterThan(0);
				expect(plan.businessHours.length).toBeGreaterThan(0);
				expect(plan.theme).toBeDefined();
				expect(plan.theme.themePreset).toBeTruthy();
				expect(plan.theme.brandPreset).toBeTruthy();
				expect(plan.theme.navigationPreset).toBeTruthy();
			}
		);

		it("includes services for service-based verticals", () => {
			const plan = service.buildSeedPlan("contractor", tenantId);
			expect(plan.services.length).toBeGreaterThan(0);
		});

		it("returns empty services for non-service verticals", () => {
			const plan = service.buildSeedPlan("restaurant", tenantId);
			expect(plan.services).toHaveLength(0);
		});
	});

	describe("mapCategories", () => {
		it("maps starter categories to seed entities with correct tenant", () => {
			const config = verticalConfigs.restaurant;
			const seeds = service.mapCategories(config, tenantId);

			expect(seeds).toHaveLength(4);
			expect(seeds[0]).toEqual({
				tenantId,
				name: "Appetizers",
				slug: "appetizers",
				displayOrder: 0,
			});
			expect(seeds[1].displayOrder).toBe(1);
		});

		it("generates valid slugs from category names", () => {
			const config = verticalConfigs.contractor;
			const seeds = service.mapCategories(config, tenantId);

			expect(seeds[2].slug).toBe("general-contracting");
		});

		it("sets correct tenant ID on all categories", () => {
			const config = verticalConfigs.retail;
			const seeds = service.mapCategories(config, "my-tenant");

			for (const seed of seeds) {
				expect(seed.tenantId).toBe("my-tenant");
			}
		});
	});

	describe("mapServices", () => {
		it("maps starter services for appointment vertical", () => {
			const config = verticalConfigs.appointment;
			const seeds = service.mapServices(config, tenantId);

			expect(seeds).toHaveLength(3);
			expect(seeds[0]).toMatchObject({
				tenantId,
				name: "Haircut",
				slug: "haircut",
				durationMinutes: 30,
				price: 3500,
				isBookable: true,
				bufferMinutes: 0,
				sortOrder: 0,
			});
		});

		it("maps starter services for contractor vertical", () => {
			const config = verticalConfigs.contractor;
			const seeds = service.mapServices(config, tenantId);

			expect(seeds).toHaveLength(3);
			expect(seeds[0].name).toBe("Free Consultation");
			expect(seeds[0].price).toBe(0);
		});

		it("returns empty array for restaurant (no services)", () => {
			const config = verticalConfigs.restaurant;
			const seeds = service.mapServices(config, tenantId);
			expect(seeds).toHaveLength(0);
		});
	});

	describe("mapContentPages", () => {
		it("maps content pages with proper titles and slugs", () => {
			const config = verticalConfigs.restaurant;
			const seeds = service.mapContentPages(config, tenantId);

			expect(seeds).toHaveLength(2);
			expect(seeds[0]).toMatchObject({
				tenantId,
				slug: "about",
				title: "About Us",
				status: "draft",
				templateRegion: "about",
			});
		});

		it("maps gallery page for contractor", () => {
			const config = verticalConfigs.contractor;
			const seeds = service.mapContentPages(config, tenantId);

			const gallery = seeds.find((p) => p.slug === "gallery");
			expect(gallery).toBeDefined();
			expect(gallery!.title).toBe("Our Work");
		});

		it("maps shipping-returns page for retail with policies region", () => {
			const config = verticalConfigs.retail;
			const seeds = service.mapContentPages(config, tenantId);

			const page = seeds.find((p) => p.slug === "shipping-returns");
			expect(page).toBeDefined();
			expect(page!.title).toBe("Shipping & Returns");
			expect(page!.templateRegion).toBe("policies");
		});

		it("all content pages start as draft", () => {
			for (const vertical of businessVerticals) {
				const config = verticalConfigs[vertical];
				const seeds = service.mapContentPages(config, tenantId);
				for (const seed of seeds) {
					expect(seed.status).toBe("draft");
				}
			}
		});
	});

	describe("mapBusinessHours", () => {
		it("maps business hours for restaurant (7 days)", () => {
			const config = verticalConfigs.restaurant;
			const seeds = service.mapBusinessHours(config, tenantId);

			expect(seeds).toHaveLength(7);
			expect(seeds[0].tenantId).toBe(tenantId);
		});

		it("maps business hours for contractor (weekday only)", () => {
			const config = verticalConfigs.contractor;
			const seeds = service.mapBusinessHours(config, tenantId);

			expect(seeds).toHaveLength(5);
			const days = seeds.map((h) => h.dayOfWeek);
			expect(days).not.toContain(0); // no Sunday
			expect(days).not.toContain(6); // no Saturday
		});
	});

	describe("seed plan consistency", () => {
		it("produces deterministic plans for same input", () => {
			const plan1 = service.buildSeedPlan("contractor", tenantId);
			const plan2 = service.buildSeedPlan("contractor", tenantId);

			expect(plan1).toEqual(plan2);
		});

		it("produces different plans for different verticals", () => {
			const plan1 = service.buildSeedPlan("restaurant", tenantId);
			const plan2 = service.buildSeedPlan("contractor", tenantId);

			expect(plan1.vertical).not.toBe(plan2.vertical);
			expect(plan1.theme.themePreset).not.toBe(plan2.theme.themePreset);
		});
	});
});
