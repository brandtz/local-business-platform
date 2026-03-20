import { Injectable } from "@nestjs/common";

import type {
	ModifierGroupRecord,
	ModifierOptionRecord,
	ModifierSelectionMode
} from "@platform/types";
import { validateModifierGroupInput } from "@platform/types";

export class CatalogModifierError extends Error {
	constructor(
		public readonly reason: "not-found" | "validation-failed" | "option-count-mismatch",
		message: string
	) {
		super(message);
		this.name = "CatalogModifierError";
	}
}

export type CreateModifierGroupInput = {
	isRequired: boolean;
	itemId: string;
	maxSelections?: number | null;
	minSelections: number;
	name: string;
	selectionMode: ModifierSelectionMode;
	tenantId: string;
};

export type CreateModifierOptionInput = {
	groupId: string;
	isDefault: boolean;
	name: string;
	priceAdjustment: number;
};

@Injectable()
export class CatalogModifierService {
	validateGroupCreate(input: CreateModifierGroupInput) {
		return validateModifierGroupInput(input);
	}

	validateOptionDefaults(
		options: readonly ModifierOptionRecord[],
		group: ModifierGroupRecord
	): boolean {
		const defaultCount = options.filter((o) => o.isDefault).length;

		if (group.selectionMode === "single" && defaultCount > 1) {
			return false;
		}

		if (group.isRequired && defaultCount === 0) {
			return false;
		}

		return true;
	}

	validateOptionCountAgainstGroup(
		optionCount: number,
		group: ModifierGroupRecord
	): boolean {
		if (group.isRequired && optionCount === 0) {
			return false;
		}
		if (group.maxSelections != null && group.minSelections > optionCount) {
			return false;
		}
		return true;
	}

	computeGroupSortOrder(existingGroups: readonly ModifierGroupRecord[]): number {
		if (existingGroups.length === 0) return 0;
		return Math.max(...existingGroups.map((g) => g.sortOrder)) + 1;
	}

	computeOptionSortOrder(existingOptions: readonly ModifierOptionRecord[]): number {
		if (existingOptions.length === 0) return 0;
		return Math.max(...existingOptions.map((o) => o.sortOrder)) + 1;
	}

	reorderOptions(
		options: readonly ModifierOptionRecord[],
		orderMap: ReadonlyMap<string, number>
	): ModifierOptionRecord[] {
		const mutable = options.map((o) => ({ ...o }));
		for (const opt of mutable) {
			const newOrder = orderMap.get(opt.id);
			if (newOrder != null) {
				opt.sortOrder = newOrder;
			}
		}
		return mutable.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	filterGroupsByItem(
		groups: readonly ModifierGroupRecord[],
		itemId: string
	): ModifierGroupRecord[] {
		return groups
			.filter((g) => g.itemId === itemId)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	filterOptionsByGroup(
		options: readonly ModifierOptionRecord[],
		groupId: string
	): ModifierOptionRecord[] {
		return options
			.filter((o) => o.groupId === groupId)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}
}
