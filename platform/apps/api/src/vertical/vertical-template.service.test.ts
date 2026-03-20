import { describe, expect, it } from "vitest";

import { VerticalTemplateService, VerticalTemplateError } from "./vertical-template.service";
import type { BusinessVertical } from "@platform/types";
import { businessVerticals } from "@platform/types";

describe("VerticalTemplateService", () => {
	const service = new VerticalTemplateService();

	describe("getConfig", () => {
		it.each([...businessVerticals])("returns config for %s", (vertical) => {
			const config = service.getConfig(vertical);
			expect(config.vertical).toBe(vertical);
			expect(config.modules).toBeDefined();
			expect(config.starterCategories.length).toBeGreaterThan(0);
		});

		it("throws for unsupported vertical", () => {
			expect(() =>
				service.getConfig("unknown" as BusinessVertical)
			).toThrow(VerticalTemplateError);
		});
	});

	describe("getEnabledModules", () => {
		it("returns enabled modules for restaurant", () => {
			const modules = service.getEnabledModules("restaurant");
			expect(modules).toContain("catalog");
			expect(modules).toContain("cart");
			expect(modules).not.toContain("bookings");
		});

		it("returns enabled modules for contractor", () => {
			const modules = service.getEnabledModules("contractor");
			expect(modules).toContain("services");
			expect(modules).toContain("quotes");
			expect(modules).toContain("inquiryForm");
			expect(modules).not.toContain("catalog");
			expect(modules).not.toContain("cart");
		});

		it("returns enabled modules for appointment", () => {
			const modules = service.getEnabledModules("appointment");
			expect(modules).toContain("bookings");
			expect(modules).toContain("services");
			expect(modules).not.toContain("cart");
		});
	});

	describe("getStarterCategories", () => {
		it("returns restaurant categories", () => {
			const cats = service.getStarterCategories("restaurant");
			expect(cats).toContain("Appetizers");
			expect(cats).toContain("Entrees");
		});

		it("returns contractor categories", () => {
			const cats = service.getStarterCategories("contractor");
			expect(cats).toContain("Roofing");
			expect(cats).toContain("Gutters");
		});
	});

	describe("getDefaultBusinessHours", () => {
		it("returns restaurant hours with weekend coverage", () => {
			const hours = service.getDefaultBusinessHours("restaurant");
			const days = hours.map((h) => h.dayOfWeek);
			expect(days).toContain(0); // Sunday
			expect(days).toContain(6); // Saturday
		});

		it("returns weekday-only hours for contractor", () => {
			const hours = service.getDefaultBusinessHours("contractor");
			const days = hours.map((h) => h.dayOfWeek);
			expect(days).not.toContain(0);
			expect(days).not.toContain(6);
		});
	});

	describe("buildSeedPlan", () => {
		it("returns deterministic seed plan", () => {
			const plan = service.buildSeedPlan("restaurant");
			expect(plan.vertical).toBe("restaurant");
			expect(plan.categoriesSeeded).toBe(4);
			expect(plan.contentPagesSeeded).toBe(2);
			expect(plan.hoursApplied).toBe(7);
			expect(plan.modulesEnabled).toContain("catalog");
		});
	});

	describe("isModuleEnabled", () => {
		it("returns true for enabled modules", () => {
			expect(service.isModuleEnabled("restaurant", "catalog")).toBe(true);
		});

		it("returns false for disabled modules", () => {
			expect(service.isModuleEnabled("restaurant", "bookings")).toBe(false);
		});

		it("contractor enables inquiry form", () => {
			expect(service.isModuleEnabled("contractor", "inquiryForm")).toBe(true);
		});
	});
});
