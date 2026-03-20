import { Injectable } from "@nestjs/common";

import type { CatalogItemRecord } from "@platform/types";

export type LowStockItem = {
	id: string;
	lowStockThreshold: number;
	name: string;
	stockQuantity: number;
};

export type InventoryStatus = "in-stock" | "low-stock" | "out-of-stock" | "untracked";

@Injectable()
export class CatalogInventoryService {
	getInventoryStatus(item: CatalogItemRecord): InventoryStatus {
		if (item.stockQuantity == null) return "untracked";
		if (item.stockQuantity <= 0) return "out-of-stock";
		if (
			item.lowStockThreshold != null &&
			item.stockQuantity <= item.lowStockThreshold
		) {
			return "low-stock";
		}
		return "in-stock";
	}

	findLowStockItems(
		items: readonly CatalogItemRecord[],
		tenantId: string
	): LowStockItem[] {
		return items
			.filter((i) => i.tenantId === tenantId)
			.filter(
				(i) =>
					i.stockQuantity != null &&
					i.lowStockThreshold != null &&
					i.stockQuantity <= i.lowStockThreshold &&
					i.stockQuantity > 0
			)
			.map((i) => ({
				id: i.id,
				lowStockThreshold: i.lowStockThreshold!,
				name: i.name,
				stockQuantity: i.stockQuantity!,
			}));
	}

	findOutOfStockItems(
		items: readonly CatalogItemRecord[],
		tenantId: string
	): CatalogItemRecord[] {
		return items.filter(
			(i) =>
				i.tenantId === tenantId &&
				i.stockQuantity != null &&
				i.stockQuantity <= 0
		);
	}
}
