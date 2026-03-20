import { describe, expect, it } from "vitest";

import type {
	ServiceRecord,
	StaffProfileRecord,
	StaffServiceAssignmentRecord
} from "@platform/types";

import { StaffAssignmentError, StaffAssignmentService } from "./staff-assignment.service";

const service = new StaffAssignmentService();

const tenantId = "tenant-1";

const activeStaff: StaffProfileRecord = {
	id: "staff-1", tenantId, displayName: "Jane", email: "jane@shop.com",
	phone: null, photoUrl: null, role: "Stylist",
	status: "active", isBookable: true, locationId: null, userId: null
};

const inactiveStaff: StaffProfileRecord = {
	...activeStaff, id: "staff-2", displayName: "Bob", status: "inactive"
};

const nonBookableStaff: StaffProfileRecord = {
	...activeStaff, id: "staff-3", displayName: "Manager", isBookable: false
};

const bookableService: ServiceRecord = {
	id: "svc-1", tenantId, name: "Haircut", slug: "haircut",
	description: null, durationMinutes: 30, price: 2500,
	status: "active", isBookable: true, bufferMinutes: 10,
	maxAdvanceDays: 30, minAdvanceHours: 2, sortOrder: 0
};

const nonBookableService: ServiceRecord = {
	...bookableService, id: "svc-2", name: "Consultation", isBookable: false
};

const assignments: StaffServiceAssignmentRecord[] = [
	{ id: "sa-1", staffId: "staff-1", serviceId: "svc-1" },
];

describe("staff assignment service", () => {
	describe("validateAssignment", () => {
		it("accepts valid assignment of active bookable staff to bookable service", () => {
			expect(() =>
				service.validateAssignment(activeStaff, bookableService, [])
			).not.toThrow();
		});

		it("rejects assignment of inactive staff", () => {
			expect(() =>
				service.validateAssignment(inactiveStaff, bookableService, [])
			).toThrow(StaffAssignmentError);
		});

		it("rejects assignment of non-bookable staff", () => {
			expect(() =>
				service.validateAssignment(nonBookableStaff, bookableService, [])
			).toThrow(StaffAssignmentError);
		});

		it("rejects assignment to non-bookable service", () => {
			expect(() =>
				service.validateAssignment(activeStaff, nonBookableService, [])
			).toThrow(StaffAssignmentError);
		});

		it("rejects duplicate assignment", () => {
			expect(() =>
				service.validateAssignment(activeStaff, bookableService, assignments)
			).toThrow(StaffAssignmentError);

			try {
				service.validateAssignment(activeStaff, bookableService, assignments);
			} catch (error) {
				expect((error as StaffAssignmentError).reason).toBe("already-assigned");
			}
		});
	});

	describe("getServicesForStaff", () => {
		it("returns services assigned to staff", () => {
			const result = service.getServicesForStaff(
				assignments, [bookableService, nonBookableService], "staff-1"
			);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("svc-1");
		});

		it("returns empty for unassigned staff", () => {
			const result = service.getServicesForStaff(
				assignments, [bookableService], "staff-99"
			);
			expect(result).toHaveLength(0);
		});
	});

	describe("getStaffForService", () => {
		it("returns staff assigned to a service", () => {
			const profiles = [activeStaff, inactiveStaff, nonBookableStaff];
			const result = service.getStaffForService(assignments, profiles, "svc-1");
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("staff-1");
		});
	});

	describe("getBookableStaffForService", () => {
		it("filters to only active bookable staff", () => {
			const multiAssignments: StaffServiceAssignmentRecord[] = [
				{ id: "sa-1", staffId: "staff-1", serviceId: "svc-1" },
				{ id: "sa-2", staffId: "staff-2", serviceId: "svc-1" },
				{ id: "sa-3", staffId: "staff-3", serviceId: "svc-1" },
			];
			const profiles = [activeStaff, inactiveStaff, nonBookableStaff];
			const result = service.getBookableStaffForService(
				multiAssignments, profiles, "svc-1"
			);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("staff-1");
		});
	});
});
