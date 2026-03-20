import { Injectable } from "@nestjs/common";

import type {
	StaffProfileRecord,
	StaffServiceAssignmentRecord,
	ServiceRecord
} from "@platform/types";

export class StaffAssignmentError extends Error {
	constructor(
		public readonly reason: "staff-not-found" | "service-not-found" | "already-assigned" | "staff-not-bookable" | "service-not-bookable",
		message: string
	) {
		super(message);
		this.name = "StaffAssignmentError";
	}
}

@Injectable()
export class StaffAssignmentService {
	validateAssignment(
		staff: StaffProfileRecord,
		service: ServiceRecord,
		existingAssignments: readonly StaffServiceAssignmentRecord[]
	): void {
		if (staff.status !== "active" || !staff.isBookable) {
			throw new StaffAssignmentError(
				"staff-not-bookable",
				`Staff ${staff.displayName} is not bookable`
			);
		}

		if (!service.isBookable) {
			throw new StaffAssignmentError(
				"service-not-bookable",
				`Service ${service.name} is not bookable`
			);
		}

		const alreadyAssigned = existingAssignments.some(
			(a) => a.staffId === staff.id && a.serviceId === service.id
		);
		if (alreadyAssigned) {
			throw new StaffAssignmentError(
				"already-assigned",
				`Staff ${staff.displayName} is already assigned to ${service.name}`
			);
		}
	}

	getServicesForStaff(
		assignments: readonly StaffServiceAssignmentRecord[],
		services: readonly ServiceRecord[],
		staffId: string
	): ServiceRecord[] {
		const serviceIds = assignments
			.filter((a) => a.staffId === staffId)
			.map((a) => a.serviceId);
		return services.filter((s) => serviceIds.includes(s.id));
	}

	getStaffForService(
		assignments: readonly StaffServiceAssignmentRecord[],
		profiles: readonly StaffProfileRecord[],
		serviceId: string
	): StaffProfileRecord[] {
		const staffIds = assignments
			.filter((a) => a.serviceId === serviceId)
			.map((a) => a.staffId);
		return profiles.filter((p) => staffIds.includes(p.id));
	}

	getBookableStaffForService(
		assignments: readonly StaffServiceAssignmentRecord[],
		profiles: readonly StaffProfileRecord[],
		serviceId: string
	): StaffProfileRecord[] {
		return this.getStaffForService(assignments, profiles, serviceId).filter(
			(p) => p.status === "active" && p.isBookable
		);
	}
}
