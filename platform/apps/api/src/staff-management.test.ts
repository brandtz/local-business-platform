import { describe, it, expect } from "vitest";
import {
	validateCreateStaff,
	validateUpdateStaff,
	validateLocationAssignments,
	toStaffListItem,
	filterStaffByLocation,
	getBookableStaff,
	createEmptyStaffPayload,
	type StaffMemberData,
	type CreateStaffPayload
} from "./staff-management.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeStaff(overrides: Partial<StaffMemberData> = {}): StaffMemberData {
	return {
		id: "staff-1",
		tenantId: "tenant-1",
		displayName: "Alice Jones",
		jobTitle: "Barber",
		email: "alice@example.com",
		phone: "555-0100",
		locationIds: ["loc-1"],
		isBookable: true,
		isActive: true,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides
	};
}

function makeCreatePayload(
	overrides: Partial<CreateStaffPayload> = {}
): CreateStaffPayload {
	return {
		tenantId: "tenant-1",
		displayName: "Alice Jones",
		jobTitle: "Barber",
		email: "alice@example.com",
		phone: "555-0100",
		locationIds: ["loc-1"],
		isBookable: true,
		...overrides
	};
}

// ── Create Validation ────────────────────────────────────────────────────────

describe("validateCreateStaff", () => {
	it("returns no errors for a valid payload", () => {
		expect(validateCreateStaff(makeCreatePayload())).toEqual([]);
	});

	it("requires displayName", () => {
		const errors = validateCreateStaff(
			makeCreatePayload({ displayName: "  " })
		);
		expect(errors).toEqual([
			expect.objectContaining({ field: "displayName", code: "required" })
		]);
	});

	it("requires jobTitle", () => {
		const errors = validateCreateStaff(
			makeCreatePayload({ jobTitle: "  " })
		);
		expect(errors).toEqual([
			expect.objectContaining({ field: "jobTitle", code: "required" })
		]);
	});

	it("rejects invalid email format", () => {
		const errors = validateCreateStaff(
			makeCreatePayload({ email: "not-an-email" })
		);
		expect(errors).toEqual([
			expect.objectContaining({ field: "email", code: "format" })
		]);
	});

	it("allows empty email (optional)", () => {
		const errors = validateCreateStaff(makeCreatePayload({ email: "" }));
		expect(errors).toEqual([]);
	});

	it("enforces max-length on displayName", () => {
		const errors = validateCreateStaff(
			makeCreatePayload({ displayName: "A".repeat(201) })
		);
		expect(errors).toEqual([
			expect.objectContaining({ field: "displayName", code: "max-length" })
		]);
	});

	it("enforces max-length on email", () => {
		const longEmail = "a".repeat(250) + "@b.co";
		const errors = validateCreateStaff(
			makeCreatePayload({ email: longEmail })
		);
		const codes = errors.map((e) => e.code);
		expect(codes).toContain("max-length");
	});
});

// ── Update Validation ────────────────────────────────────────────────────────

describe("validateUpdateStaff", () => {
	it("returns no errors for empty update", () => {
		expect(validateUpdateStaff({})).toEqual([]);
	});

	it("rejects empty displayName when provided", () => {
		const errors = validateUpdateStaff({ displayName: "  " });
		expect(errors).toEqual([
			expect.objectContaining({ field: "displayName", code: "required" })
		]);
	});

	it("rejects empty jobTitle when provided", () => {
		const errors = validateUpdateStaff({ jobTitle: "" });
		expect(errors).toEqual([
			expect.objectContaining({ field: "jobTitle", code: "required" })
		]);
	});

	it("rejects invalid email when provided", () => {
		const errors = validateUpdateStaff({ email: "bad" });
		expect(errors).toEqual([
			expect.objectContaining({ field: "email", code: "format" })
		]);
	});

	it("allows valid partial update", () => {
		const errors = validateUpdateStaff({
			displayName: "New Name",
			isBookable: false
		});
		expect(errors).toEqual([]);
	});
});

// ── Location Assignment Validation ───────────────────────────────────────────

describe("validateLocationAssignments", () => {
	const tenantLocations = ["loc-1", "loc-2", "loc-3"];

	it("passes when all locations are valid", () => {
		expect(
			validateLocationAssignments(["loc-1", "loc-2"], tenantLocations)
		).toEqual([]);
	});

	it("detects invalid location IDs", () => {
		const errors = validateLocationAssignments(
			["loc-1", "loc-999"],
			tenantLocations
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]!.code).toBe("invalid-location");
		expect(errors[0]!.message).toContain("loc-999");
	});

	it("reports multiple invalid locations", () => {
		const errors = validateLocationAssignments(
			["loc-x", "loc-y"],
			tenantLocations
		);
		expect(errors).toHaveLength(2);
	});

	it("passes with empty assignments", () => {
		expect(validateLocationAssignments([], tenantLocations)).toEqual([]);
	});
});

// ── List Item Mapping ────────────────────────────────────────────────────────

describe("toStaffListItem", () => {
	it("projects to list view shape", () => {
		const item = toStaffListItem(makeStaff());
		expect(item).toEqual({
			id: "staff-1",
			displayName: "Alice Jones",
			jobTitle: "Barber",
			locationIds: ["loc-1"],
			isBookable: true,
			isActive: true
		});
	});

	it("does not alias locationIds array", () => {
		const staff = makeStaff();
		const item = toStaffListItem(staff);
		item.locationIds.push("loc-new");
		expect(staff.locationIds).not.toContain("loc-new");
	});
});

// ── Filter Helpers ───────────────────────────────────────────────────────────

describe("filterStaffByLocation", () => {
	const staff = [
		makeStaff({ id: "s1", locationIds: ["loc-1"] }),
		makeStaff({ id: "s2", locationIds: ["loc-2"] }),
		makeStaff({ id: "s3", locationIds: ["loc-1", "loc-2"] })
	];

	it("returns staff assigned to the given location", () => {
		const result = filterStaffByLocation(staff, "loc-1");
		expect(result.map((s) => s.id)).toEqual(["s1", "s3"]);
	});

	it("returns empty when no staff at location", () => {
		expect(filterStaffByLocation(staff, "loc-99")).toEqual([]);
	});
});

describe("getBookableStaff", () => {
	const staff = [
		makeStaff({ id: "s1", isBookable: true, isActive: true }),
		makeStaff({ id: "s2", isBookable: false, isActive: true }),
		makeStaff({ id: "s3", isBookable: true, isActive: false }),
		makeStaff({ id: "s4", isBookable: false, isActive: false })
	];

	it("returns only bookable AND active staff", () => {
		const result = getBookableStaff(staff);
		expect(result.map((s) => s.id)).toEqual(["s1"]);
	});
});

// ── createEmptyStaffPayload ──────────────────────────────────────────────────

describe("createEmptyStaffPayload", () => {
	it("creates a blank payload with correct tenantId", () => {
		const payload = createEmptyStaffPayload("tenant-42");
		expect(payload.tenantId).toBe("tenant-42");
		expect(payload.displayName).toBe("");
		expect(payload.isBookable).toBe(true);
		expect(payload.locationIds).toEqual([]);
	});
});
