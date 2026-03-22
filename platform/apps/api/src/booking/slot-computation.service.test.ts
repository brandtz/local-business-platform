import { describe, expect, it } from "vitest";

import type {
	AvailabilityInput,
	BookableStaffMember,
	ExistingBooking,
} from "@platform/types";

import { SlotComputationService } from "./slot-computation.service";

const service = new SlotComputationService();

// ─── Shared Test Data ────────────────────────────────────────────────────────

const tenantId = "tenant-1";
const locationId = "loc-1";
const serviceId = "svc-1";

const staffAlice: BookableStaffMember = {
	staffId: "staff-a",
	displayName: "Alice",
	scheduleWindows: [
		{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }, // Monday morning
		{ dayOfWeek: 1, startTime: "13:00", endTime: "17:00" }, // Monday afternoon
		{ dayOfWeek: 3, startTime: "10:00", endTime: "16:00" }, // Wednesday
	],
	blackoutDates: ["2025-04-01"],
};

const staffBob: BookableStaffMember = {
	staffId: "staff-b",
	displayName: "Bob",
	scheduleWindows: [
		{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }, // Monday full day
	],
	blackoutDates: [],
};

function makeInput(overrides?: Partial<AvailabilityInput>): AvailabilityInput {
	return {
		tenantId,
		locationId,
		timezone: "America/New_York",
		serviceId,
		serviceName: "Haircut",
		durationMinutes: 30,
		bufferMinutes: 10,
		minAdvanceHours: 0,
		maxAdvanceDays: 30,
		locationHours: [
			{ dayOfWeek: 0, isClosed: true, openTime: null, closeTime: null }, // Sunday
			{ dayOfWeek: 1, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Monday
			{ dayOfWeek: 2, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Tuesday
			{ dayOfWeek: 3, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Wednesday
			{ dayOfWeek: 4, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Thursday
			{ dayOfWeek: 5, isClosed: false, openTime: "09:00", closeTime: "17:00" }, // Friday
			{ dayOfWeek: 6, isClosed: false, openTime: "10:00", closeTime: "14:00" }, // Saturday
		],
		locationBlackouts: [],
		staff: [staffAlice],
		existingBookings: [],
		...overrides,
	};
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("slot computation service", () => {
	describe("computeSlotsForDate - basic slot generation", () => {
		it("generates slots within operating hours for a given service duration", () => {
			// Monday 2025-04-07 (a Monday), Alice schedule: 09:00-12:00, 13:00-17:00
			const input = makeInput();
			const result = service.computeSlotsForDate(input, "2025-04-07");

			expect(result.slots.length).toBeGreaterThan(0);
			expect(result.tenantId).toBe(tenantId);
			expect(result.locationId).toBe(locationId);
			expect(result.serviceId).toBe(serviceId);
			expect(result.date).toBe("2025-04-07");

			// All slots should be within location hours (09:00-17:00)
			for (const slot of result.slots) {
				expect(slot.startTime >= "2025-04-07T09:00:00").toBe(true);
				expect(slot.endTime <= "2025-04-07T17:00:00").toBe(true);
				expect(slot.staffId).toBe("staff-a");
			}
		});

		it("respects service duration in slot generation", () => {
			const input = makeInput({ durationMinutes: 60 });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			// With 60-min duration in 09:00-12:00 window + 10-min buffer:
			// Slot 1: 09:00-10:00, Slot 2: 10:10-11:10, Slot 3: 11:20-12:20 (doesn't fit)
			// So only 2 slots in morning window
			const morningSlots = result.slots.filter(
				(s) => s.startTime < "2025-04-07T12:00:00"
			);
			expect(morningSlots).toHaveLength(2);

			for (const slot of morningSlots) {
				const start = slot.startTime.split("T")[1];
				const end = slot.endTime.split("T")[1];
				// Each slot should span exactly 60 minutes
				const startMins = parseInt(start.split(":")[0]) * 60 + parseInt(start.split(":")[1]);
				const endMins = parseInt(end.split(":")[0]) * 60 + parseInt(end.split(":")[1]);
				expect(endMins - startMins).toBe(60);
			}
		});

		it("returns no slots for a closed day", () => {
			// Sunday
			const input = makeInput();
			const result = service.computeSlotsForDate(input, "2025-04-06");

			expect(result.slots).toHaveLength(0);
		});

		it("returns no slots when no staff have schedules for that day", () => {
			// Tuesday — Alice has no schedule window on Tuesday (dayOfWeek=2)
			const input = makeInput();
			const result = service.computeSlotsForDate(input, "2025-04-08");

			expect(result.slots).toHaveLength(0);
		});
	});

	describe("computeSlotsForDate - blackout handling", () => {
		it("returns no slots when date is in location blackout", () => {
			const input = makeInput({
				locationBlackouts: [
					{ startDate: "2025-04-07", endDate: "2025-04-07" },
				],
			});
			const result = service.computeSlotsForDate(input, "2025-04-07");

			expect(result.slots).toHaveLength(0);
		});

		it("returns no slots for staff blackout date", () => {
			// April 1 is Alice's blackout date, but it's a Tuesday when she has no schedule anyway
			// Let's test Wednesday April 2 with a blackout
			const alice: BookableStaffMember = {
				...staffAlice,
				blackoutDates: ["2025-04-09"], // Wednesday
			};
			const input = makeInput({ staff: [alice] });
			const result = service.computeSlotsForDate(input, "2025-04-09");

			expect(result.slots).toHaveLength(0);
		});

		it("other staff still have slots even if one is blacked out", () => {
			const alice: BookableStaffMember = {
				...staffAlice,
				blackoutDates: ["2025-04-07"], // Monday blackout for Alice
			};
			const input = makeInput({ staff: [alice, staffBob] });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			// Only Bob's slots should appear
			expect(result.slots.length).toBeGreaterThan(0);
			expect(result.slots.every((s) => s.staffId === "staff-b")).toBe(true);
		});
	});

	describe("computeSlotsForDate - buffer time", () => {
		it("respects buffer time between appointments", () => {
			const input = makeInput({
				durationMinutes: 30,
				bufferMinutes: 15,
			});
			const result = service.computeSlotsForDate(input, "2025-04-07");

			// Check that consecutive slots have the buffer gap
			const morningSlots = result.slots.filter(
				(s) => s.startTime < "2025-04-07T12:00:00"
			);

			for (let i = 1; i < morningSlots.length; i++) {
				const prevEnd = morningSlots[i - 1].endTime.split("T")[1];
				const currStart = morningSlots[i].startTime.split("T")[1];
				const prevEndMins = parseInt(prevEnd.split(":")[0]) * 60 + parseInt(prevEnd.split(":")[1]);
				const currStartMins = parseInt(currStart.split(":")[0]) * 60 + parseInt(currStart.split(":")[1]);
				expect(currStartMins - prevEndMins).toBe(15);
			}
		});

		it("works with zero buffer", () => {
			const input = makeInput({
				durationMinutes: 30,
				bufferMinutes: 0,
			});
			const result = service.computeSlotsForDate(input, "2025-04-07");

			// With 0 buffer, more slots should fit
			const morningSlots = result.slots.filter(
				(s) => s.startTime < "2025-04-07T12:00:00"
			);
			// 09:00-12:00 = 180 min, 30 min each, 0 buffer → 6 slots
			expect(morningSlots).toHaveLength(6);
		});
	});

	describe("computeSlotsForDate - multi-staff", () => {
		it("generates slots for multiple staff members", () => {
			const input = makeInput({ staff: [staffAlice, staffBob] });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			const aliceSlots = result.slots.filter((s) => s.staffId === "staff-a");
			const bobSlots = result.slots.filter((s) => s.staffId === "staff-b");

			expect(aliceSlots.length).toBeGreaterThan(0);
			expect(bobSlots.length).toBeGreaterThan(0);
		});

		it("returns no slots when staff array is empty", () => {
			const input = makeInput({ staff: [] });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			expect(result.slots).toHaveLength(0);
		});
	});

	describe("computeSlotsForDate - conflict detection", () => {
		it("excludes slots that conflict with existing bookings", () => {
			const existingBookings: ExistingBooking[] = [
				{
					id: "bk-1",
					staffId: "staff-a",
					serviceId,
					startTime: "2025-04-07T09:00:00",
					endTime: "2025-04-07T09:30:00",
				},
			];

			const input = makeInput({ existingBookings });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			// The 09:00-09:30 slot for Alice should be excluded
			const conflictingSlot = result.slots.find(
				(s) =>
					s.staffId === "staff-a" &&
					s.startTime === "2025-04-07T09:00:00"
			);
			expect(conflictingSlot).toBeUndefined();
		});

		it("allows same time slot for different staff", () => {
			const existingBookings: ExistingBooking[] = [
				{
					id: "bk-1",
					staffId: "staff-a",
					serviceId,
					startTime: "2025-04-07T09:00:00",
					endTime: "2025-04-07T09:30:00",
				},
			];

			const input = makeInput({ staff: [staffAlice, staffBob], existingBookings });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			// Bob's 09:00 slot should still be available
			const bobSlot = result.slots.find(
				(s) =>
					s.staffId === "staff-b" &&
					s.startTime === "2025-04-07T09:00:00"
			);
			expect(bobSlot).toBeDefined();
		});

		it("detects partial overlap conflicts", () => {
			const existingBookings: ExistingBooking[] = [
				{
					id: "bk-1",
					staffId: "staff-a",
					serviceId,
					startTime: "2025-04-07T09:15:00",
					endTime: "2025-04-07T09:45:00",
				},
			];

			const input = makeInput({ existingBookings });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			// The 09:00-09:30 slot overlaps with existing 09:15-09:45
			const conflictingSlot = result.slots.find(
				(s) =>
					s.staffId === "staff-a" &&
					s.startTime === "2025-04-07T09:00:00"
			);
			expect(conflictingSlot).toBeUndefined();
		});
	});

	describe("computeSlotsForDate - lead time", () => {
		it("enforces minimum advance notice", () => {
			// now is 2025-04-07 at 10:00 UTC, minAdvanceHours = 2
			// So earliest bookable time is 12:00
			const now = new Date("2025-04-07T10:00:00Z");
			const input = makeInput({ minAdvanceHours: 2 });
			const result = service.computeSlotsForDate(input, "2025-04-07", now);

			// No slots before 12:00 should appear
			for (const slot of result.slots) {
				expect(slot.startTime >= "2025-04-07T12:00:00").toBe(true);
			}
		});

		it("returns all slots when no lead time constraint", () => {
			const input = makeInput({ minAdvanceHours: 0 });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			// Should have morning slots starting at 09:00
			const firstSlot = result.slots[0];
			expect(firstSlot.startTime).toBe("2025-04-07T09:00:00");
		});

		it("returns no slots when lead time exceeds the day", () => {
			// now is 2025-04-07 at 20:00 UTC, minAdvanceHours = 24
			// That pushes to 2025-04-08 20:00 — no slots on April 7
			const now = new Date("2025-04-07T20:00:00Z");
			const input = makeInput({ minAdvanceHours: 24 });
			const result = service.computeSlotsForDate(input, "2025-04-07", now);

			expect(result.slots).toHaveLength(0);
		});
	});

	describe("computeSlotsForDate - boundary conditions", () => {
		it("includes slot that ends exactly at closing time", () => {
			// Location close = 17:00, duration = 30, buffer = 0
			// Alice afternoon: 13:00-17:00, 8 slots of 30min each, last ends at 17:00
			const input = makeInput({
				durationMinutes: 30,
				bufferMinutes: 0,
			});
			const result = service.computeSlotsForDate(input, "2025-04-07");

			const lastAfternoonSlot = result.slots
				.filter((s) => s.startTime >= "2025-04-07T13:00:00")
				.pop();
			expect(lastAfternoonSlot?.endTime).toBe("2025-04-07T17:00:00");
		});

		it("does not generate slots that would extend past closing time", () => {
			const input = makeInput({ durationMinutes: 30 });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			for (const slot of result.slots) {
				expect(slot.endTime <= "2025-04-07T17:00:00").toBe(true);
			}
		});

		it("handles staff window smaller than location hours", () => {
			// Staff only works 10:00-14:00 on a day when location is 09:00-17:00
			const limitedStaff: BookableStaffMember = {
				staffId: "staff-limited",
				displayName: "Limited",
				scheduleWindows: [
					{ dayOfWeek: 1, startTime: "10:00", endTime: "14:00" },
				],
				blackoutDates: [],
			};
			const input = makeInput({ staff: [limitedStaff] });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			for (const slot of result.slots) {
				expect(slot.startTime >= "2025-04-07T10:00:00").toBe(true);
				expect(slot.endTime <= "2025-04-07T14:00:00").toBe(true);
			}
		});

		it("handles location hours smaller than staff window", () => {
			// Saturday: location 10:00-14:00, staff 09:00-17:00
			const fullDayStaff: BookableStaffMember = {
				staffId: "staff-full",
				displayName: "Full Day",
				scheduleWindows: [
					{ dayOfWeek: 6, startTime: "09:00", endTime: "17:00" },
				],
				blackoutDates: [],
			};
			const input = makeInput({ staff: [fullDayStaff] });
			// Saturday 2025-04-12
			const result = service.computeSlotsForDate(input, "2025-04-12");

			for (const slot of result.slots) {
				expect(slot.startTime >= "2025-04-12T10:00:00").toBe(true);
				expect(slot.endTime <= "2025-04-12T14:00:00").toBe(true);
			}
		});
	});

	describe("computeSlotsForDateRange", () => {
		it("computes slots across a date range", () => {
			const input = makeInput();
			const results = service.computeSlotsForDateRange(
				input,
				"2025-04-07",
				"2025-04-09"
			);

			expect(results).toHaveLength(3);
			expect(results[0].date).toBe("2025-04-07"); // Monday
			expect(results[1].date).toBe("2025-04-08"); // Tuesday
			expect(results[2].date).toBe("2025-04-09"); // Wednesday
		});

		it("returns empty slots for closed days in range", () => {
			const input = makeInput();
			const results = service.computeSlotsForDateRange(
				input,
				"2025-04-06",
				"2025-04-07"
			);

			// Sunday has no slots, Monday has slots
			expect(results[0].slots).toHaveLength(0); // Sunday
			expect(results[1].slots.length).toBeGreaterThan(0); // Monday
		});

		it("respects max advance days filter", () => {
			const now = new Date("2025-04-07T08:00:00Z");
			const input = makeInput({ maxAdvanceDays: 2 });
			const results = service.computeSlotsForDateRange(
				input,
				"2025-04-07",
				"2025-04-15",
				now
			);

			// Should only get dates within 2 days from now
			expect(results.length).toBeLessThanOrEqual(3);
		});
	});

	describe("hasConflict", () => {
		const existingBookings: ExistingBooking[] = [
			{
				id: "bk-1",
				staffId: "staff-a",
				serviceId: "svc-1",
				startTime: "2025-04-07T10:00:00",
				endTime: "2025-04-07T10:30:00",
			},
		];

		it("detects full overlap", () => {
			expect(
				service.hasConflict(
					"staff-a",
					"2025-04-07T10:00:00",
					"2025-04-07T10:30:00",
					existingBookings
				)
			).toBe(true);
		});

		it("detects partial overlap at start", () => {
			expect(
				service.hasConflict(
					"staff-a",
					"2025-04-07T09:45:00",
					"2025-04-07T10:15:00",
					existingBookings
				)
			).toBe(true);
		});

		it("detects partial overlap at end", () => {
			expect(
				service.hasConflict(
					"staff-a",
					"2025-04-07T10:15:00",
					"2025-04-07T10:45:00",
					existingBookings
				)
			).toBe(true);
		});

		it("detects enclosing overlap", () => {
			expect(
				service.hasConflict(
					"staff-a",
					"2025-04-07T09:30:00",
					"2025-04-07T11:00:00",
					existingBookings
				)
			).toBe(true);
		});

		it("no conflict for adjacent slots (end == start)", () => {
			expect(
				service.hasConflict(
					"staff-a",
					"2025-04-07T10:30:00",
					"2025-04-07T11:00:00",
					existingBookings
				)
			).toBe(false);
		});

		it("no conflict for different staff", () => {
			expect(
				service.hasConflict(
					"staff-b",
					"2025-04-07T10:00:00",
					"2025-04-07T10:30:00",
					existingBookings
				)
			).toBe(false);
		});

		it("no conflict for non-overlapping time", () => {
			expect(
				service.hasConflict(
					"staff-a",
					"2025-04-07T11:00:00",
					"2025-04-07T11:30:00",
					existingBookings
				)
			).toBe(false);
		});
	});

	describe("deterministic output", () => {
		it("produces identical results for identical inputs", () => {
			const input = makeInput({ staff: [staffAlice, staffBob] });
			const result1 = service.computeSlotsForDate(input, "2025-04-07");
			const result2 = service.computeSlotsForDate(input, "2025-04-07");

			expect(result1).toEqual(result2);
		});

		it("sorts slots by start time then staff name", () => {
			const input = makeInput({ staff: [staffBob, staffAlice] });
			const result = service.computeSlotsForDate(input, "2025-04-07");

			for (let i = 1; i < result.slots.length; i++) {
				const prev = result.slots[i - 1];
				const curr = result.slots[i];
				if (prev.startTime === curr.startTime) {
					expect(prev.staffName <= curr.staffName).toBe(true);
				} else {
					expect(prev.startTime < curr.startTime).toBe(true);
				}
			}
		});
	});
});
