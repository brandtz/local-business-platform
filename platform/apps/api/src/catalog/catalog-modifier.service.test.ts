import { describe, expect, it } from "vitest";

import type { ModifierGroupRecord, ModifierOptionRecord } from "@platform/types";

import { CatalogModifierService } from "./catalog-modifier.service";

const service = new CatalogModifierService();

const tenantId = "tenant-1";

const sizeGroup: ModifierGroupRecord = {
	id: "mg-1", tenantId, itemId: "item-1", name: "Size",
	selectionMode: "single", isRequired: true, minSelections: 1,
	maxSelections: 1, sortOrder: 0
};

const toppingsGroup: ModifierGroupRecord = {
	id: "mg-2", tenantId, itemId: "item-1", name: "Toppings",
	selectionMode: "multiple", isRequired: false, minSelections: 0,
	maxSelections: 5, sortOrder: 1
};

const sizeOptions: ModifierOptionRecord[] = [
	{ id: "mo-1", groupId: "mg-1", name: "Small", priceAdjustment: 0, isDefault: true, sortOrder: 0 },
	{ id: "mo-2", groupId: "mg-1", name: "Medium", priceAdjustment: 200, isDefault: false, sortOrder: 1 },
	{ id: "mo-3", groupId: "mg-1", name: "Large", priceAdjustment: 400, isDefault: false, sortOrder: 2 },
];

describe("catalog modifier service", () => {
	describe("validateGroupCreate", () => {
		it("accepts valid modifier group input", () => {
			const result = service.validateGroupCreate({
				name: "Size", selectionMode: "single", isRequired: true,
				minSelections: 1, maxSelections: 1, itemId: "item-1", tenantId
			});
			expect(result).toEqual({ valid: true });
		});

		it("rejects empty group name", () => {
			const result = service.validateGroupCreate({
				name: "", selectionMode: "single", isRequired: true,
				minSelections: 1, maxSelections: 1, itemId: "item-1", tenantId
			});
			expect(result.valid).toBe(false);
		});

		it("rejects min exceeding max selections", () => {
			const result = service.validateGroupCreate({
				name: "Group", selectionMode: "multiple", isRequired: true,
				minSelections: 5, maxSelections: 2, itemId: "item-1", tenantId
			});
			expect(result.valid).toBe(false);
		});
	});

	describe("validateOptionDefaults", () => {
		it("rejects multiple defaults for single-selection group", () => {
			const multiDefault = sizeOptions.map((o) => ({ ...o, isDefault: true }));
			expect(service.validateOptionDefaults(multiDefault, sizeGroup)).toBe(false);
		});

		it("rejects zero defaults for required group", () => {
			const noDefault = sizeOptions.map((o) => ({ ...o, isDefault: false }));
			expect(service.validateOptionDefaults(noDefault, sizeGroup)).toBe(false);
		});

		it("accepts valid defaults for single-selection required group", () => {
			expect(service.validateOptionDefaults(sizeOptions, sizeGroup)).toBe(true);
		});

		it("accepts zero defaults for optional group", () => {
			const noDefault = sizeOptions.map((o) => ({ ...o, isDefault: false, groupId: "mg-2" }));
			expect(service.validateOptionDefaults(noDefault, toppingsGroup)).toBe(true);
		});
	});

	describe("validateOptionCountAgainstGroup", () => {
		it("rejects zero options for required group", () => {
			expect(service.validateOptionCountAgainstGroup(0, sizeGroup)).toBe(false);
		});

		it("rejects when min selections exceeds option count", () => {
			const strictGroup = { ...sizeGroup, minSelections: 3, maxSelections: 5 };
			expect(service.validateOptionCountAgainstGroup(2, strictGroup)).toBe(false);
		});

		it("accepts valid option count", () => {
			expect(service.validateOptionCountAgainstGroup(3, sizeGroup)).toBe(true);
		});
	});

	describe("sort order computation", () => {
		it("computes next group sort order", () => {
			expect(service.computeGroupSortOrder([sizeGroup, toppingsGroup])).toBe(2);
			expect(service.computeGroupSortOrder([])).toBe(0);
		});

		it("computes next option sort order", () => {
			expect(service.computeOptionSortOrder(sizeOptions)).toBe(3);
			expect(service.computeOptionSortOrder([])).toBe(0);
		});
	});

	describe("reorderOptions", () => {
		it("applies new sort orders and returns sorted", () => {
			const orderMap = new Map([["mo-3", 0], ["mo-1", 2]]);
			const result = service.reorderOptions(sizeOptions, orderMap);
			expect(result.map((o) => o.id)).toEqual(["mo-3", "mo-2", "mo-1"]);
		});
	});

	describe("filtering", () => {
		it("filters groups by item", () => {
			const otherGroup = { ...sizeGroup, id: "mg-other", itemId: "item-2" };
			const result = service.filterGroupsByItem([sizeGroup, toppingsGroup, otherGroup], "item-1");
			expect(result).toHaveLength(2);
		});

		it("filters options by group", () => {
			const otherOption = { ...sizeOptions[0], id: "mo-other", groupId: "mg-2" };
			const result = service.filterOptionsByGroup([...sizeOptions, otherOption], "mg-1");
			expect(result).toHaveLength(3);
		});
	});
});
