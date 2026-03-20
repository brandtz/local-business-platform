import { Injectable } from "@nestjs/common";

import type {
	ServiceListFilter,
	ServiceRecord,
	ServiceValidationResult,
	StorefrontServiceListing
} from "@platform/types";
import { validateServiceInput } from "@platform/types";

export class ServiceManagementError extends Error {
	constructor(
		public readonly reason: "not-found" | "validation-failed" | "duplicate-slug" | "invalid-transition",
		message: string
	) {
		super(message);
		this.name = "ServiceManagementError";
	}
}

export type CreateServiceInput = {
	bufferMinutes: number;
	description?: string | null;
	durationMinutes: number;
	isBookable: boolean;
	maxAdvanceDays: number;
	minAdvanceHours: number;
	name: string;
	price: number;
	slug: string;
	tenantId: string;
};

@Injectable()
export class ServiceManagementService {
	validateCreate(
		input: CreateServiceInput,
		existingSlugs: readonly string[]
	): ServiceValidationResult {
		const result = validateServiceInput(input);
		if (!result.valid) return result;

		if (existingSlugs.includes(input.slug)) {
			return {
				valid: false,
				errors: [{ field: "slug", reason: "duplicate" }],
			};
		}

		return { valid: true };
	}

	filterServices(
		services: readonly ServiceRecord[],
		tenantId: string,
		filter?: ServiceListFilter
	): ServiceRecord[] {
		let result = services.filter((s) => s.tenantId === tenantId);

		if (filter?.status) {
			result = result.filter((s) => s.status === filter.status);
		}
		if (filter?.isBookable != null) {
			result = result.filter((s) => s.isBookable === filter.isBookable);
		}
		if (filter?.search) {
			const searchLower = filter.search.toLowerCase();
			result = result.filter(
				(s) =>
					s.name.toLowerCase().includes(searchLower) ||
					s.description?.toLowerCase().includes(searchLower)
			);
		}

		return result.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	assembleStorefrontListings(
		services: readonly ServiceRecord[],
		tenantId: string
	): StorefrontServiceListing[] {
		return services
			.filter(
				(s) =>
					s.tenantId === tenantId &&
					s.status === "active" &&
					s.isBookable
			)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((s) => ({
				description: s.description,
				durationMinutes: s.durationMinutes,
				id: s.id,
				name: s.name,
				price: s.price,
				slug: s.slug,
			}));
	}

	isEligibleForBooking(service: ServiceRecord): boolean {
		return service.status === "active" && service.isBookable;
	}

	computeSortOrder(existing: readonly ServiceRecord[]): number {
		if (existing.length === 0) return 0;
		return Math.max(...existing.map((s) => s.sortOrder)) + 1;
	}
}
