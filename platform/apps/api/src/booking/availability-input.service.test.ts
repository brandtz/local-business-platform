import { describe, expect, it } from "vitest";

import type {
	ExistingBooking,
	ServiceRecord,
	StaffBlackoutDateRecord,
	StaffProfileRecord,
	StaffScheduleWindowRecord,
	StaffServiceAssignmentRecord,
} from "@platform/types";

import type { BlackoutWindow, LocationOperatingHours } from "../location-hours";

import { AvailabilityInputError, AvailabilityInputService } from "./availability-input.service";

const service = new AvailabilityInputService();

// ─── Shared Test Data ────────────────────────────────────────────────────────

const tenantId = "tenant-1";
const locationId = "loc-1";

const locationHours: LocationOperatingHours = {
	locationId,
	timezone: "America/New_York",
	entries: [
		{ day: "sunday", isClosed: true, openTime: null, closeTime: null },
		{ day: "monday", isClosed: false, openTime: "09:00", closeTime: "17:00" },
		{ day: "tuesday", isClosed: false, openTime: "09:00", closeTime: "17:00" },
		{ day: "wednesday", isClosed: false, openTime: "09:00", closeTime: "17:00" },
		{ day: "thursday", isClosed: false, openTime: "09:00", closeTime: "17:00" },
		{ day: "friday", isClosed: false, openTime: "09:00", closeTime: "17:00" },
		{ day: "saturday", isClosed: false, openTime: "10:00", closeTime: "14:00" },
	],
};

const locationBlackouts: BlackoutWindow[] = [
	{
		id: "bl-1",
		locationId,
		label: "Holiday",
		startDate: "2025-12-25",
		endDate: "2025-12-26",
		reason: "Christmas break",
	},
];

const activeService: ServiceRecord = {
	id: "svc-1",
	tenantId,
	name: "Haircut",
	slug: "haircut",
	description: "Standard haircut",
	durationMinutes: 30,
	bufferMinutes: 10,
	minAdvanceHours: 2,
	maxAdvanceDays: 30,
	isBookable: true,
	status: "active",
	price: 2500,
	sortOrder: 0,
};

const inactiveService: ServiceRecord = {
	...activeService,
	id: "svc-inactive",
	status: "inactive",
};

const nonBookableService: ServiceRecord = {
	...activeService,
	id: "svc-nonbook",
	isBookable: false,
};

const staffAlice: StaffProfileRecord = {
	id: "staff-a",
	tenantId,
	displayName: "Alice",
	email: "alice@test.com",
	status: "active",
	isBookable: true,
	locationId,
};

const staffBob: StaffProfileRecord = {
	id: "staff-b",
	tenantId,
	displayName: "Bob",
	email: "bob@test.com",
	status: "active",
	isBookable: true,
	locationId,
};

const staffInactive: StaffProfileRecord = {
	id: "staff-inactive",
	tenantId,
	displayName: "Charlie",
	email: "charlie@test.com",
	status: "inactive",
	isBookable: true,
	locationId,
};

const assignments: StaffServiceAssignmentRecord[] = [
	{ id: "asg-1", staffId: "staff-a", serviceId: "svc-1" },
	{ id: "asg-2", staffId: "staff-b", serviceId: "svc-1" },
	{ id: "asg-3", staffId: "staff-inactive", serviceId: "svc-1" },
];

const scheduleWindows: StaffScheduleWindowRecord[] = [
	{ id: "sw-1", staffId: "staff-a", dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
	{ id: "sw-2", staffId: "staff-a", dayOfWeek: 1, startTime: "13:00", endTime: "17:00" },
	{ id: "sw-3", staffId: "staff-a", dayOfWeek: 3, startTime: "10:00", endTime: "16:00" },
	{ id: "sw-4", staffId: "staff-b", dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
];

const blackoutDates: StaffBlackoutDateRecord[] = [
	{ id: "bd-1", staffId: "staff-a", date: "2025-04-01", reason: "Vacation" },
	{ id: "bd-2", staffId: "staff-b", date: "2025-04-02", reason: "Day off" },
];

const existingBookings: ExistingBooking[] = [];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("availability input service", () => {
	describe("assembleAvailabilityInput", () => {
		it("assembles all inputs into unified availability input", () => {
			const result = service.assembleAvailabilityInput({
				tenantId,
				locationId,
				service: activeService,
				locationHours,
				locationBlackouts,
				staffProfiles: [staffAlice, staffBob],
				staffAssignments: assignments,
				staffScheduleWindows: scheduleWindows,
				staffBlackoutDates: blackoutDates,
				existingBookings,
			});

			expect(result.tenantId).toBe(tenantId);
			expect(result.locationId).toBe(locationId);
			expect(result.timezone).toBe("America/New_York");
			expect(result.serviceId).toBe("svc-1");
			expect(result.durationMinutes).toBe(30);
			expect(result.bufferMinutes).toBe(10);
			expect(result.minAdvanceHours).toBe(2);
			expect(result.maxAdvanceDays).toBe(30);
			expect(result.locationHours).toHaveLength(7);
			expect(result.locationBlackouts).toHaveLength(1);
			expect(result.staff).toHaveLength(2); // Alice and Bob (not inactive)
		});

		it("throws for inactive service", () => {
			expect(() =>
				service.assembleAvailabilityInput({
					tenantId,
					locationId,
					service: inactiveService,
					locationHours,
					locationBlackouts: [],
					staffProfiles: [staffAlice],
					staffAssignments: assignments,
					staffScheduleWindows: scheduleWindows,
					staffBlackoutDates: [],
					existingBookings: [],
				})
			).toThrow(AvailabilityInputError);
		});

		it("throws for non-bookable service", () => {
			expect(() =>
				service.assembleAvailabilityInput({
					tenantId,
					locationId,
					service: nonBookableService,
					locationHours,
					locationBlackouts: [],
					staffProfiles: [staffAlice],
					staffAssignments: assignments,
					staffScheduleWindows: scheduleWindows,
					staffBlackoutDates: [],
					existingBookings: [],
				})
			).toThrow(AvailabilityInputError);
		});

		it("returns zero staff when no bookable staff are assigned", () => {
			const result = service.assembleAvailabilityInput({
				tenantId,
				locationId,
				service: activeService,
				locationHours,
				locationBlackouts: [],
				staffProfiles: [staffInactive],
				staffAssignments: assignments,
				staffScheduleWindows: scheduleWindows,
				staffBlackoutDates: [],
				existingBookings: [],
			});

			expect(result.staff).toHaveLength(0);
		});

		it("returns zero staff when no staff are assigned to the service", () => {
			const result = service.assembleAvailabilityInput({
				tenantId,
				locationId,
				service: activeService,
				locationHours,
				locationBlackouts: [],
				staffProfiles: [staffAlice],
				staffAssignments: [], // No assignments
				staffScheduleWindows: scheduleWindows,
				staffBlackoutDates: [],
				existingBookings: [],
			});

			expect(result.staff).toHaveLength(0);
		});
	});

	describe("convertLocationHours", () => {
		it("maps day names to numeric day-of-week", () => {
			const result = service.convertLocationHours(locationHours);

			expect(result).toHaveLength(7);
			// Sunday = 0
			expect(result.find((h) => h.dayOfWeek === 0)?.isClosed).toBe(true);
			// Monday = 1
			const monday = result.find((h) => h.dayOfWeek === 1);
			expect(monday?.isClosed).toBe(false);
			expect(monday?.openTime).toBe("09:00");
			expect(monday?.closeTime).toBe("17:00");
			// Saturday = 6
			const saturday = result.find((h) => h.dayOfWeek === 6);
			expect(saturday?.isClosed).toBe(false);
			expect(saturday?.openTime).toBe("10:00");
			expect(saturday?.closeTime).toBe("14:00");
		});
	});

	describe("assembleBookableStaff", () => {
		it("includes only active bookable staff assigned to the service", () => {
			const result = service.assembleBookableStaff({
				serviceId: "svc-1",
				staffProfiles: [staffAlice, staffBob, staffInactive],
				staffAssignments: assignments,
				staffScheduleWindows: scheduleWindows,
				staffBlackoutDates: blackoutDates,
			});

			expect(result).toHaveLength(2);
			expect(result.map((s) => s.staffId)).toEqual(["staff-a", "staff-b"]);
		});

		it("attaches schedule windows to each staff member", () => {
			const result = service.assembleBookableStaff({
				serviceId: "svc-1",
				staffProfiles: [staffAlice],
				staffAssignments: assignments,
				staffScheduleWindows: scheduleWindows,
				staffBlackoutDates: [],
			});

			expect(result[0].scheduleWindows).toHaveLength(3);
			expect(result[0].scheduleWindows[0].dayOfWeek).toBe(1);
		});

		it("attaches blackout dates to each staff member", () => {
			const result = service.assembleBookableStaff({
				serviceId: "svc-1",
				staffProfiles: [staffAlice],
				staffAssignments: assignments,
				staffScheduleWindows: scheduleWindows,
				staffBlackoutDates: blackoutDates,
			});

			expect(result[0].blackoutDates).toEqual(["2025-04-01"]);
		});

		it("returns empty array when no staff match", () => {
			const result = service.assembleBookableStaff({
				serviceId: "svc-nonexistent",
				staffProfiles: [staffAlice],
				staffAssignments: assignments,
				staffScheduleWindows: scheduleWindows,
				staffBlackoutDates: [],
			});

			expect(result).toHaveLength(0);
		});
	});

	describe("isDateBlackedOut", () => {
		const blackouts = [
			{ startDate: "2025-12-25", endDate: "2025-12-26" },
		];

		it("returns true for date within blackout window", () => {
			expect(service.isDateBlackedOut("2025-12-25", blackouts)).toBe(true);
			expect(service.isDateBlackedOut("2025-12-26", blackouts)).toBe(true);
		});

		it("returns false for date outside blackout window", () => {
			expect(service.isDateBlackedOut("2025-12-24", blackouts)).toBe(false);
			expect(service.isDateBlackedOut("2025-12-27", blackouts)).toBe(false);
		});
	});

	describe("getLocationHoursForDay", () => {
		const hours = service.convertLocationHours(locationHours);

		it("returns hours for an open day", () => {
			const result = service.getLocationHoursForDay(hours, 1); // Monday
			expect(result).not.toBeNull();
			expect(result!.openTime).toBe("09:00");
			expect(result!.closeTime).toBe("17:00");
		});

		it("returns null for a closed day", () => {
			const result = service.getLocationHoursForDay(hours, 0); // Sunday
			expect(result).toBeNull();
		});

		it("returns null for day with no entry", () => {
			const result = service.getLocationHoursForDay([], 1);
			expect(result).toBeNull();
		});
	});
});
