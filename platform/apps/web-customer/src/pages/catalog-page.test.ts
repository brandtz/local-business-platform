import { describe, expect, it } from "vitest";

import {
	createDefaultFilters,
	sortOptions,
} from "./catalog-page";

describe("createDefaultFilters", () => {
	it("returns default filter values", () => {
		const filters = createDefaultFilters();

		expect(filters.search).toBe("");
		expect(filters.category).toBe("");
		expect(filters.sort).toBe("name_asc");
		expect(filters.page).toBe(1);
		expect(filters.pageSize).toBe(12);
	});
});

describe("sortOptions", () => {
	it("includes name and price sort options", () => {
		const values = sortOptions.map((o) => o.value);

		expect(values).toContain("name_asc");
		expect(values).toContain("name_desc");
		expect(values).toContain("price_asc");
		expect(values).toContain("price_desc");
	});

	it("each option has a value and label", () => {
		for (const option of sortOptions) {
			expect(option.value).toBeTruthy();
			expect(option.label).toBeTruthy();
		}
	});
});
