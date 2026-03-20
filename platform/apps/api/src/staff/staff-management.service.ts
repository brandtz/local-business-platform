import { Injectable } from "@nestjs/common";

import type {
	StaffListFilter,
	StaffProfileRecord,
	StaffValidationResult,
	StorefrontStaffListing,
	StaffServiceAssignmentRecord
} from "@platform/types";
import { validateStaffProfileInput } from "@platform/types";

export class StaffManagementError extends Error {
	constructor(
		public readonly reason: "not-found" | "validation-failed" | "duplicate-email",
		message: string
	) {
		super(message);
		this.name = "StaffManagementError";
	}
}

export type CreateStaffProfileInput = {
	displayName: string;
	email?: string | null;
	isBookable: boolean;
	locationId?: string | null;
	phone?: string | null;
	photoUrl?: string | null;
	role?: string | null;
	tenantId: string;
	userId?: string | null;
};

@Injectable()
export class StaffManagementService {
	validateCreate(
		input: CreateStaffProfileInput,
		existingEmails: readonly string[]
	): StaffValidationResult {
		const result = validateStaffProfileInput(input);
		if (!result.valid) return result;

		if (
			input.email != null &&
			existingEmails.includes(input.email.toLowerCase())
		) {
			return {
				valid: false,
				errors: [{ field: "email", reason: "invalid-format" }],
			};
		}

		return { valid: true };
	}

	filterStaff(
		profiles: readonly StaffProfileRecord[],
		tenantId: string,
		filter?: StaffListFilter
	): StaffProfileRecord[] {
		let result = profiles.filter((p) => p.tenantId === tenantId);

		if (filter?.status) {
			result = result.filter((p) => p.status === filter.status);
		}
		if (filter?.isBookable != null) {
			result = result.filter((p) => p.isBookable === filter.isBookable);
		}
		if (filter?.search) {
			const searchLower = filter.search.toLowerCase();
			result = result.filter(
				(p) =>
					p.displayName.toLowerCase().includes(searchLower) ||
					p.email?.toLowerCase().includes(searchLower) ||
					p.role?.toLowerCase().includes(searchLower)
			);
		}
		if (filter?.serviceId) {
			// This would need assignment data — handled below in filterByService
		}

		return result;
	}

	filterByService(
		profiles: readonly StaffProfileRecord[],
		assignments: readonly StaffServiceAssignmentRecord[],
		serviceId: string
	): StaffProfileRecord[] {
		const assignedStaffIds = assignments
			.filter((a) => a.serviceId === serviceId)
			.map((a) => a.staffId);
		return profiles.filter((p) => assignedStaffIds.includes(p.id));
	}

	assembleStorefrontListings(
		profiles: readonly StaffProfileRecord[],
		assignments: readonly StaffServiceAssignmentRecord[],
		tenantId: string
	): StorefrontStaffListing[] {
		return profiles
			.filter(
				(p) =>
					p.tenantId === tenantId &&
					p.status === "active" &&
					p.isBookable
			)
			.map((p) => ({
				displayName: p.displayName,
				id: p.id,
				photoUrl: p.photoUrl,
				role: p.role,
				serviceIds: assignments
					.filter((a) => a.staffId === p.id)
					.map((a) => a.serviceId),
			}));
	}
}
