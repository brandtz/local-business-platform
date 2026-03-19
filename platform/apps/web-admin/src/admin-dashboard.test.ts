import { describe, expect, it } from "vitest";

import { tenantModuleKeys } from "@platform/types";

import { adminNavigationSectionIds } from "./admin-route-map";
import {
	dashboardSections,
	getAllWidgetDescriptors,
	getDashboardSection,
	getVisibleDashboardSections
} from "./admin-dashboard";

// ── Placeholder Completeness ─────────────────────────────────────────────────

describe("dashboard section completeness", () => {
	it("has a section descriptor for every navigation section", () => {
		for (const sectionId of adminNavigationSectionIds) {
			const section = getDashboardSection(sectionId);

			expect(
				section,
				`section "${sectionId}" should have a dashboard descriptor`
			).toBeDefined();
		}
	});

	it("every section has at least one widget", () => {
		for (const section of dashboardSections) {
			expect(
				section.widgets.length,
				`section "${section.section}" should have at least one widget`
			).toBeGreaterThanOrEqual(1);
		}
	});

	it("every section has a non-empty title and description", () => {
		for (const section of dashboardSections) {
			expect(section.title.length).toBeGreaterThan(0);
			expect(section.description.length).toBeGreaterThan(0);
		}
	});

	it("all widget IDs are unique", () => {
		const widgets = getAllWidgetDescriptors();
		const ids = widgets.map((w) => w.widgetId);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it("all widgets have non-empty titles", () => {
		const widgets = getAllWidgetDescriptors();

		for (const w of widgets) {
			expect(w.title.length).toBeGreaterThan(0);
		}
	});

	it("all placeholder widgets start in empty status", () => {
		const widgets = getAllWidgetDescriptors();

		for (const w of widgets) {
			expect(w.status).toBe("empty");
		}
	});
});

// ── Module-Filtered Sections ─────────────────────────────────────────────────

describe("getVisibleDashboardSections", () => {
	it("with all modules enabled, all widgets are visible", () => {
		const sections = getVisibleDashboardSections([...tenantModuleKeys]);
		const totalWidgets = sections.reduce(
			(sum, s) => sum + s.widgets.length,
			0
		);

		expect(totalWidgets).toBe(getAllWidgetDescriptors().length);
	});

	it("with no modules, module-dependent widgets are filtered out", () => {
		const sections = getVisibleDashboardSections([]);

		for (const section of sections) {
			for (const widget of section.widgets) {
				expect(widget.requiredModule).toBeNull();
			}
		}
	});

	it("catalog-only shows catalog widgets but not ordering widgets", () => {
		const sections = getVisibleDashboardSections(["catalog"]);
		const catalogSection = sections.find((s) => s.section === "catalog");
		const orderingSection = sections.find((s) => s.section === "ordering");

		expect(catalogSection?.widgets.length).toBeGreaterThan(0);
		expect(orderingSection?.widgets.length).toBe(0);
	});
});

// ── getDashboardSection ──────────────────────────────────────────────────────

describe("getDashboardSection", () => {
	it("returns the dashboard overview section", () => {
		const section = getDashboardSection("dashboard");

		expect(section?.title).toBe("Overview");
	});

	it("returns undefined for unknown section", () => {
		const section = getDashboardSection(
			"nonexistent" as never
		);

		expect(section).toBeUndefined();
	});
});
