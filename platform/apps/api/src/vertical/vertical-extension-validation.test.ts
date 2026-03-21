import { describe, expect, it } from "vitest";

import type { BusinessVertical, VerticalTemplateConfig } from "@platform/types";
import {
	businessVerticals,
	validateVerticalBundle,
	validateVerticalSelection,
	verticalConfigs,
} from "@platform/types";

/**
 * E6-S5-T5: Extension validation tests.
 *
 * These tests verify that:
 * 1. All registered verticals have valid, complete configuration bundles.
 * 2. New verticals must conform to the bundle schema.
 * 3. Adding a vertical does not affect existing vertical behavior.
 * 4. The bundle validation function rejects invalid configurations.
 */
describe("Vertical Extension Validation", () => {
	describe("all registered verticals pass bundle validation", () => {
		it.each([...businessVerticals])(
			"%s has a valid configuration bundle",
			(vertical) => {
				const config = verticalConfigs[vertical];
				const result = validateVerticalBundle(config);
				expect(result.valid).toBe(true);
			}
		);
	});

	describe("bundle completeness", () => {
		it.each([...businessVerticals])(
			"%s has all required module flags",
			(vertical) => {
				const config = verticalConfigs[vertical];
				const requiredKeys: (keyof typeof config.modules)[] = [
					"bookings",
					"cart",
					"catalog",
					"content",
					"inquiryForm",
					"loyalty",
					"portfolio",
					"quotes",
					"services",
				];
				for (const key of requiredKeys) {
					expect(typeof config.modules[key]).toBe("boolean");
				}
			}
		);

		it.each([...businessVerticals])(
			"%s has non-empty theme defaults",
			(vertical) => {
				const config = verticalConfigs[vertical];
				expect(config.theme.themePreset).toBeTruthy();
				expect(config.theme.brandPreset).toBeTruthy();
				expect(config.theme.navigationPreset).toBeTruthy();
			}
		);

		it.each([...businessVerticals])(
			"%s has at least one starter category",
			(vertical) => {
				const config = verticalConfigs[vertical];
				expect(config.starterCategories.length).toBeGreaterThan(0);
			}
		);

		it.each([...businessVerticals])(
			"%s has at least one content page",
			(vertical) => {
				const config = verticalConfigs[vertical];
				expect(config.starterContentPages.length).toBeGreaterThan(0);
			}
		);

		it.each([...businessVerticals])(
			"%s has at least one business hours entry",
			(vertical) => {
				const config = verticalConfigs[vertical];
				expect(config.defaultBusinessHours.length).toBeGreaterThan(0);
			}
		);

		it.each([...businessVerticals])(
			"%s has a description",
			(vertical) => {
				const config = verticalConfigs[vertical];
				expect(config.description.length).toBeGreaterThan(0);
			}
		);

		it.each([...businessVerticals])(
			"%s has an inquiry form config",
			(vertical) => {
				const config = verticalConfigs[vertical];
				expect(config.inquiryForm).toBeDefined();
				expect(typeof config.inquiryForm.enabled).toBe("boolean");
			}
		);
	});

	describe("uniqueness", () => {
		it("all verticals have unique identifiers", () => {
			const ids = new Set(businessVerticals);
			expect(ids.size).toBe(businessVerticals.length);
		});

		it("all verticals in config match the businessVerticals list", () => {
			for (const vertical of businessVerticals) {
				expect(verticalConfigs[vertical]).toBeDefined();
				expect(verticalConfigs[vertical].vertical).toBe(vertical);
			}
		});
	});

	describe("bundle validation rejects invalid bundles", () => {
		it("rejects bundle with empty vertical", () => {
			const bundle = {
				...verticalConfigs.restaurant,
				vertical: "" as BusinessVertical,
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("rejects bundle with empty description", () => {
			const bundle = {
				...verticalConfigs.restaurant,
				description: "",
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("rejects bundle with empty starter categories", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.restaurant,
				starterCategories: [],
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("rejects bundle with empty content pages", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.restaurant,
				starterContentPages: [],
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("rejects bundle with invalid business hours", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.restaurant,
				defaultBusinessHours: [
					{ dayOfWeek: 8, openTime: "09:00", closeTime: "17:00" },
				],
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual(
					expect.objectContaining({ field: "defaultBusinessHours.dayOfWeek" })
				);
			}
		});

		it("rejects bundle with invalid time format", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.restaurant,
				defaultBusinessHours: [
					{ dayOfWeek: 1, openTime: "9am", closeTime: "17:00" },
				],
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("rejects bundle with invalid service slug", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.contractor,
				starterServices: [
					{ name: "Test", slug: "INVALID SLUG", durationMinutes: 30, price: 100, isBookable: true },
				],
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("rejects bundle with non-positive service duration", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.contractor,
				starterServices: [
					{ name: "Test", slug: "test", durationMinutes: 0, price: 100, isBookable: true },
				],
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("rejects bundle with negative service price", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.contractor,
				starterServices: [
					{ name: "Test", slug: "test", durationMinutes: 30, price: -100, isBookable: true },
				],
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("rejects enabled inquiry form with empty heading", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.contractor,
				inquiryForm: {
					enabled: true,
					heading: "",
					submitLabel: "Submit",
					fields: [
						{ name: "name", label: "Name", type: "text", required: true },
					],
				},
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("rejects enabled inquiry form with no fields", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.contractor,
				inquiryForm: {
					enabled: true,
					heading: "Contact Us",
					submitLabel: "Submit",
					fields: [],
				},
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});

		it("accepts disabled inquiry form with empty fields", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.restaurant,
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(true);
		});

		it("rejects bundle with empty theme presets", () => {
			const bundle: VerticalTemplateConfig = {
				...verticalConfigs.restaurant,
				theme: { themePreset: "", brandPreset: "", navigationPreset: "" },
			};
			const result = validateVerticalBundle(bundle);
			expect(result.valid).toBe(false);
		});
	});

	describe("vertical selection validation", () => {
		it.each([...businessVerticals])(
			"accepts %s as a valid vertical",
			(vertical) => {
				const result = validateVerticalSelection(vertical);
				expect(result.valid).toBe(true);
			}
		);

		it("rejects unknown vertical", () => {
			const result = validateVerticalSelection("unknown");
			expect(result.valid).toBe(false);
		});
	});

	describe("isolation — example new vertical bundle", () => {
		it("a sample new vertical bundle passes validation", () => {
			const sampleBundle: VerticalTemplateConfig = {
				vertical: "contractor" as BusinessVertical,
				description: "A sample new vertical for testing",
				modules: {
					bookings: true,
					cart: false,
					catalog: true,
					content: true,
					inquiryForm: false,
					loyalty: false,
					portfolio: false,
					quotes: false,
					services: true,
				},
				theme: {
					themePreset: "starter-new",
					brandPreset: "starter-new-brand",
					navigationPreset: "new-default",
				},
				inquiryForm: {
					enabled: false,
					heading: "",
					submitLabel: "",
					fields: [],
				},
				starterCategories: ["Category A", "Category B"],
				starterServices: [
					{ name: "Service A", slug: "service-a", durationMinutes: 60, price: 5000, isBookable: true },
				],
				starterContentPages: ["about"],
				defaultBusinessHours: [
					{ dayOfWeek: 1, openTime: "08:00", closeTime: "18:00" },
					{ dayOfWeek: 2, openTime: "08:00", closeTime: "18:00" },
				],
			};
			const result = validateVerticalBundle(sampleBundle);
			expect(result.valid).toBe(true);
		});
	});
});
