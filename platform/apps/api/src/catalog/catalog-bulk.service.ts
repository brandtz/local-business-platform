import { Injectable } from "@nestjs/common";

import type {
	BulkOperationResult,
	CatalogItemRecord,
	CatalogItemStatus,
	CatalogItemVisibility
} from "@platform/types";

export class CatalogBulkError extends Error {
	constructor(
		public readonly reason: "empty-selection" | "cross-tenant",
		message: string
	) {
		super(message);
		this.name = "CatalogBulkError";
	}
}

@Injectable()
export class CatalogBulkService {
	validateBulkSelection(
		items: readonly CatalogItemRecord[],
		tenantId: string,
		ids: readonly string[]
	): void {
		if (ids.length === 0) {
			throw new CatalogBulkError("empty-selection", "No items selected for bulk operation");
		}

		const selectedItems = items.filter((i) => ids.includes(i.id));
		const crossTenant = selectedItems.some((i) => i.tenantId !== tenantId);
		if (crossTenant) {
			throw new CatalogBulkError("cross-tenant", "Bulk operation cannot span tenants");
		}
	}

	prepareBulkStatusChange(
		items: readonly CatalogItemRecord[],
		tenantId: string,
		ids: readonly string[],
		targetStatus: CatalogItemStatus
	): BulkOperationResult {
		this.validateBulkSelection(items, tenantId, ids);

		const successIds: string[] = [];
		const failedIds: string[] = [];

		for (const id of ids) {
			const item = items.find((i) => i.id === id && i.tenantId === tenantId);
			if (!item) {
				failedIds.push(id);
				continue;
			}
			if (item.status === targetStatus) {
				failedIds.push(id);
				continue;
			}
			successIds.push(id);
		}

		return {
			affectedCount: successIds.length,
			failedIds,
			successIds,
		};
	}

	prepareBulkVisibilityChange(
		items: readonly CatalogItemRecord[],
		tenantId: string,
		ids: readonly string[],
		targetVisibility: CatalogItemVisibility
	): BulkOperationResult {
		this.validateBulkSelection(items, tenantId, ids);

		const successIds: string[] = [];
		const failedIds: string[] = [];

		for (const id of ids) {
			const item = items.find((i) => i.id === id && i.tenantId === tenantId);
			if (!item) {
				failedIds.push(id);
				continue;
			}
			if (item.visibility === targetVisibility) {
				failedIds.push(id);
				continue;
			}
			successIds.push(id);
		}

		return {
			affectedCount: successIds.length,
			failedIds,
			successIds,
		};
	}

	prepareBulkDelete(
		items: readonly CatalogItemRecord[],
		tenantId: string,
		ids: readonly string[]
	): BulkOperationResult {
		this.validateBulkSelection(items, tenantId, ids);

		const successIds: string[] = [];
		const failedIds: string[] = [];

		for (const id of ids) {
			const item = items.find((i) => i.id === id && i.tenantId === tenantId);
			if (!item) {
				failedIds.push(id);
				continue;
			}
			successIds.push(id);
		}

		return {
			affectedCount: successIds.length,
			failedIds,
			successIds,
		};
	}
}
