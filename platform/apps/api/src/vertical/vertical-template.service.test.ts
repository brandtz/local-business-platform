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
			expect(config.theme).toBeDefined();
			expect(config.inquiryForm).toBeDefined();
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
			expect(plan.servicesSeeded).toBe(0);
		});

		it("includes service count for contractor", () => {
			const plan = service.buildSeedPlan("contractor");
			expect(plan.servicesSeeded).toBe(3);
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

	describe("getThemeDefaults", () => {
		it("returns theme defaults for restaurant", () => {
			const theme = service.getThemeDefaults("restaurant");
			expect(theme.themePreset).toBe("starter-warm");
			expect(theme.brandPreset).toBe("starter-restaurant");
			expect(theme.navigationPreset).toBe("restaurant-default");
		});

		it("returns theme defaults for contractor", () => {
			const theme = service.getThemeDefaults("contractor");
			expect(theme.themePreset).toBe("starter-professional");
			expect(theme.brandPreset).toBe("starter-contractor");
		});

		it.each([...businessVerticals])("returns non-empty theme for %s", (vertical) => {
			const theme = service.getThemeDefaults(vertical);
			expect(theme.themePreset).toBeTruthy();
			expect(theme.brandPreset).toBeTruthy();
			expect(theme.navigationPreset).toBeTruthy();
		});
	});

	describe("getInquiryFormConfig", () => {
		it("returns enabled inquiry form for contractor", () => {
			const config = service.getInquiryFormConfig("contractor");
			expect(config.enabled).toBe(true);
			expect(config.heading).toBeTruthy();
			expect(config.submitLabel).toBeTruthy();
			expect(config.fields.length).toBeGreaterThan(0);
		});

		it("returns disabled inquiry form for restaurant", () => {
			const config = service.getInquiryFormConfig("restaurant");
			expect(config.enabled).toBe(false);
		});

		it("returns disabled inquiry form for retail", () => {
			const config = service.getInquiryFormConfig("retail");
			expect(config.enabled).toBe(false);
		});

		it("contractor form has required name and email fields", () => {
			const config = service.getInquiryFormConfig("contractor");
			const nameField = config.fields.find((f) => f.name === "name");
			const emailField = config.fields.find((f) => f.name === "email");
			expect(nameField).toBeDefined();
			expect(nameField!.required).toBe(true);
			expect(emailField).toBeDefined();
			expect(emailField!.required).toBe(true);
		});

		it("contractor form has optional phone and message fields", () => {
			const config = service.getInquiryFormConfig("contractor");
			const phoneField = config.fields.find((f) => f.name === "phone");
			const messageField = config.fields.find((f) => f.name === "message");
			expect(phoneField).toBeDefined();
			expect(phoneField!.required).toBe(false);
			expect(messageField).toBeDefined();
			expect(messageField!.required).toBe(false);
		});
	});
});
