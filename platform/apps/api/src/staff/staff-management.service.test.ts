import { describe, expect, it } from "vitest";

import type { StaffProfileRecord, StaffServiceAssignmentRecord } from "@platform/types";

import { StaffManagementService } from "./staff-management.service";

const service = new StaffManagementService();

const tenantId = "tenant-1";

const profiles: StaffProfileRecord[] = [
	{
		id: "staff-1", tenantId, displayName: "Jane Smith", email: "jane@shop.com",
		phone: "555-0101", photoUrl: "/staff/jane.jpg", role: "Stylist",
		status: "active", isBookable: true, locationId: "loc-1", userId: null
	},
	{
		id: "staff-2", tenantId, displayName: "Bob Jones", email: "bob@shop.com",
		phone: null, photoUrl: null, role: "Manager",
		status: "active", isBookable: false, locationId: "loc-1", userId: null
	},
	{
		id: "staff-3", tenantId, displayName: "Alice Kim", email: "alice@shop.com",
		phone: null, photoUrl: "/staff/alice.jpg", role: "Stylist",
		status: "inactive", isBookable: true, locationId: null, userId: null
	},
];

const assignments: StaffServiceAssignmentRecord[] = [
	{ id: "sa-1", staffId: "staff-1", serviceId: "svc-1" },
	{ id: "sa-2", staffId: "staff-1", serviceId: "svc-2" },
	{ id: "sa-3", staffId: "staff-3", serviceId: "svc-1" },
];

describe("staff management service", () => {
	describe("validateCreate", () => {
		it("accepts valid staff profile input", () => {
			const result = service.validateCreate(
				{ displayName: "New Staff", email: "new@shop.com", isBookable: true, tenantId },
				["jane@shop.com"]
			);
			expect(result).toEqual({ valid: true });
		});

		it("rejects empty display name", () => {
			const result = service.validateCreate(
				{ displayName: "", email: null, isBookable: true, tenantId },
				[]
			);
			expect(result.valid).toBe(false);
		});

		it("rejects duplicate email within tenant", () => {
			const result = service.validateCreate(
				{ displayName: "Dupe", email: "jane@shop.com", isBookable: true, tenantId },
				["jane@shop.com"]
			);
			expect(result.valid).toBe(false);
		});
	});

	describe("filterStaff", () => {
		it("filters by tenant", () => {
			const other = { ...profiles[0], id: "staff-other", tenantId: "tenant-2" };
			const result = service.filterStaff([...profiles, other], tenantId);
			expect(result).toHaveLength(3);
		});

		it("filters by status", () => {
			const result = service.filterStaff(profiles, tenantId, { status: "active" });
			expect(result).toHaveLength(2);
		});

		it("filters by bookable", () => {
			const result = service.filterStaff(profiles, tenantId, { isBookable: true });
			expect(result).toHaveLength(2);
		});

		it("filters by search term", () => {
			const result = service.filterStaff(profiles, tenantId, { search: "jane" });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("staff-1");
		});
	});

	describe("filterByService", () => {
		it("returns staff assigned to a specific service", () => {
			const result = service.filterByService(profiles, assignments, "svc-1");
			expect(result).toHaveLength(2);
			expect(result.map((p) => p.id)).toContain("staff-1");
			expect(result.map((p) => p.id)).toContain("staff-3");
		});

		it("returns empty for unassigned service", () => {
			const result = service.filterByService(profiles, assignments, "svc-99");
			expect(result).toHaveLength(0);
		});
	});

	describe("assembleStorefrontListings", () => {
		it("returns active bookable staff with service ids", () => {
			const result = service.assembleStorefrontListings(profiles, assignments, tenantId);
			expect(result).toHaveLength(1);
			expect(result[0].displayName).toBe("Jane Smith");
			expect(result[0].serviceIds).toEqual(["svc-1", "svc-2"]);
		});

		it("excludes inactive and non-bookable staff", () => {
			const result = service.assembleStorefrontListings(profiles, assignments, tenantId);
			const ids = result.map((s) => s.id);
			expect(ids).not.toContain("staff-2"); // not bookable
			expect(ids).not.toContain("staff-3"); // inactive
		});
	});
});
