import { describe, expect, it } from "vitest";
import { tenantVerticalTemplateKeys } from "@platform/types";

import {
	composeAllTemplates,
	composeTemplate,
	createAllTemplatePreviews,
	createTemplatePreview,
	validateTemplateComposition,
	type TemplateCompositionDescriptor
} from "./template-composition";
import { storefrontRegions } from "./storefront-layout";

// ── Composition Descriptor ───────────────────────────────────────────────────

describe("composeTemplate", () => {
	for (const templateKey of tenantVerticalTemplateKeys) {
		describe(`template: ${templateKey}`, () => {
			it("produces a descriptor with matching templateKey", () => {
				const desc = composeTemplate(templateKey);
				expect(desc.templateKey).toBe(templateKey);
				expect(desc.layout.templateKey).toBe(templateKey);
				expect(desc.navigation.templateKey).toBe(templateKey);
			});

			it("includes all required region and navigation fields", () => {
				const desc = composeTemplate(templateKey);
				expect(desc.layout).toBeDefined();
				expect(desc.navigation).toBeDefined();
				expect(desc.visibleRegions).toBeDefined();
				expect(desc.visibleRegions.length).toBeGreaterThan(0);
			});

			it("visible regions match layout visibility", () => {
				const desc = composeTemplate(templateKey);
				for (const region of desc.visibleRegions) {
					const entry = desc.layout.regions.find((r) => r.region === region);
					expect(entry?.visible).toBe(true);
				}
			});
		});
	}
});

describe("composeAllTemplates", () => {
	it("returns one descriptor per registered template", () => {
		const all = composeAllTemplates();
		expect(all).toHaveLength(tenantVerticalTemplateKeys.length);
		for (const templateKey of tenantVerticalTemplateKeys) {
			expect(all.find((d) => d.templateKey === templateKey)).toBeDefined();
		}
	});
});

// ── Validation ───────────────────────────────────────────────────────────────

describe("validateTemplateComposition", () => {
	it("returns valid for all built-in templates", () => {
		for (const templateKey of tenantVerticalTemplateKeys) {
			const desc = composeTemplate(templateKey);
			const result = validateTemplateComposition(desc);
			expect(result).toEqual({ valid: true });
		}
	});

	it("rejects mismatched layout templateKey", () => {
		const desc = composeTemplate("restaurant-core");
		const broken: TemplateCompositionDescriptor = {
			...desc,
			layout: { ...desc.layout, templateKey: "services-core" }
		};
		const result = validateTemplateComposition(broken);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toContain("Layout templateKey");
		}
	});

	it("rejects mismatched navigation templateKey", () => {
		const desc = composeTemplate("restaurant-core");
		const broken: TemplateCompositionDescriptor = {
			...desc,
			navigation: { ...desc.navigation, templateKey: "services-core" }
		};
		const result = validateTemplateComposition(broken);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toContain("Navigation templateKey");
		}
	});

	it("rejects missing region definitions", () => {
		const desc = composeTemplate("restaurant-core");
		const broken: TemplateCompositionDescriptor = {
			...desc,
			layout: { ...desc.layout, regions: [] }
		};
		const result = validateTemplateComposition(broken);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toContain("Missing region");
		}
	});

	it("rejects when header is not visible", () => {
		const desc = composeTemplate("restaurant-core");
		const broken: TemplateCompositionDescriptor = {
			...desc,
			visibleRegions: ["main-content", "footer"]
		};
		const result = validateTemplateComposition(broken);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toContain("Header");
		}
	});

	it("rejects when main-content is not visible", () => {
		const desc = composeTemplate("restaurant-core");
		const broken: TemplateCompositionDescriptor = {
			...desc,
			visibleRegions: ["header", "footer"]
		};
		const result = validateTemplateComposition(broken);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toContain("Main-content");
		}
	});

	it("rejects empty navigation", () => {
		const desc = composeTemplate("restaurant-core");
		const broken: TemplateCompositionDescriptor = {
			...desc,
			navigation: { ...desc.navigation, items: [] }
		};
		const result = validateTemplateComposition(broken);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toContain("at least one item");
		}
	});

	it("rejects navigation items with invalid paths", () => {
		const desc = composeTemplate("restaurant-core");
		const broken: TemplateCompositionDescriptor = {
			...desc,
			navigation: {
				...desc.navigation,
				items: [{ key: "bad", label: "Bad", path: "no-slash", order: 0 }]
			}
		};
		const result = validateTemplateComposition(broken);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.reason).toContain("invalid path");
		}
	});
});

// ── Preview Descriptor ───────────────────────────────────────────────────────

describe("createTemplatePreview", () => {
	for (const templateKey of tenantVerticalTemplateKeys) {
		it(`${templateKey} produces a complete preview`, () => {
			const preview = createTemplatePreview(templateKey);
			expect(preview.templateKey).toBe(templateKey);
			expect(preview.displayName).toBeTruthy();
			expect(preview.description).toBeTruthy();
			expect(preview.operatingMode).toBeTruthy();
			expect(preview.visibleRegions.length).toBeGreaterThan(0);
			expect(preview.navigationItemCount).toBeGreaterThan(0);
			expect(typeof preview.hasSidebar).toBe("boolean");
			expect(typeof preview.hasHero).toBe("boolean");
		});
	}

	it("restaurant-core preview has no sidebar", () => {
		const preview = createTemplatePreview("restaurant-core");
		expect(preview.hasSidebar).toBe(false);
		expect(preview.operatingMode).toBe("ordering");
	});

	it("hybrid preview has a sidebar", () => {
		const preview = createTemplatePreview("hybrid-local-business");
		expect(preview.hasSidebar).toBe(true);
		expect(preview.operatingMode).toBe("hybrid");
	});

	it("services preview uses booking mode", () => {
		const preview = createTemplatePreview("services-core");
		expect(preview.operatingMode).toBe("booking");
	});
});

describe("createAllTemplatePreviews", () => {
	it("returns one preview per registered template", () => {
		const all = createAllTemplatePreviews();
		expect(all).toHaveLength(tenantVerticalTemplateKeys.length);
	});
});

// ── Interface Shape Stability ────────────────────────────────────────────────

describe("interface shape stability", () => {
	it("composition descriptor covers all storefront regions", () => {
		const desc = composeTemplate("restaurant-core");
		for (const region of storefrontRegions) {
			const entry = desc.layout.regions.find((r) => r.region === region);
			expect(entry).toBeDefined();
		}
	});

	it("composition descriptor includes navigation with route paths", () => {
		const desc = composeTemplate("restaurant-core");
		for (const item of desc.navigation.items) {
			expect(item.path).toBeTruthy();
			expect(item.label).toBeTruthy();
			expect(item.key).toBeTruthy();
		}
	});

	it("preview descriptor includes layout and interaction metadata", () => {
		const preview = createTemplatePreview("restaurant-core");
		expect("hasSidebar" in preview).toBe(true);
		expect("hasHero" in preview).toBe(true);
		expect("navigationItemCount" in preview).toBe(true);
		expect("visibleRegions" in preview).toBe(true);
	});
});
