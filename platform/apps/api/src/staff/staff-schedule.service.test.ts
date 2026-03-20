import { describe, expect, it } from "vitest";

import type { StaffBlackoutDateRecord, StaffScheduleWindowRecord } from "@platform/types";

import { StaffScheduleError, StaffScheduleService } from "./staff-schedule.service";

const service = new StaffScheduleService();

const staffId = "staff-1";

const existingWindows: StaffScheduleWindowRecord[] = [
	{ id: "sw-1", staffId, dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
	{ id: "sw-2", staffId, dayOfWeek: 1, startTime: "13:00", endTime: "17:00" },
	{ id: "sw-3", staffId, dayOfWeek: 3, startTime: "10:00", endTime: "16:00" },
];

const blackouts: StaffBlackoutDateRecord[] = [
	{ id: "bd-1", staffId, date: "2025-04-01", reason: "Vacation" },
	{ id: "bd-2", staffId, date: "2025-04-02", reason: "Vacation" },
	{ id: "bd-3", staffId, date: "2025-04-15", reason: null },
];

describe("staff schedule service", () => {
	describe("validateAndCheckConflicts", () => {
		it("accepts a non-overlapping schedule window", () => {
			const result = service.validateAndCheckConflicts(
				{ dayOfWeek: 1, startTime: "12:00", endTime: "13:00" },
				existingWindows
			);
			expect(result).toEqual({ valid: true });
		});

		it("accepts a window on a different day", () => {
			const result = service.validateAndCheckConflicts(
				{ dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
				existingWindows
			);
			expect(result).toEqual({ valid: true });
		});

		it("rejects overlapping window", () => {
			const result = service.validateAndCheckConflicts(
				{ dayOfWeek: 1, startTime: "11:00", endTime: "14:00" },
				existingWindows
			);
			expect(result.valid).toBe(false);
		});

		it("rejects invalid time format", () => {
			const result = service.validateAndCheckConflicts(
				{ dayOfWeek: 1, startTime: "25:00", endTime: "26:00" },
				existingWindows
			);
			expect(result.valid).toBe(false);
		});

		it("rejects end time before start time", () => {
			const result = service.validateAndCheckConflicts(
				{ dayOfWeek: 2, startTime: "17:00", endTime: "09:00" },
				existingWindows
			);
			expect(result.valid).toBe(false);
		});

		it("rejects day of week out of range", () => {
			const result = service.validateAndCheckConflicts(
				{ dayOfWeek: 7, startTime: "09:00", endTime: "17:00" },
				existingWindows
			);
			expect(result.valid).toBe(false);
		});
	});

	describe("requireNoConflict", () => {
		it("throws StaffScheduleError on conflict", () => {
			expect(() =>
				service.requireNoConflict(
					{ dayOfWeek: 1, startTime: "11:00", endTime: "14:00" },
					existingWindows
				)
			).toThrow(StaffScheduleError);
		});

		it("does not throw for valid non-overlapping window", () => {
			expect(() =>
				service.requireNoConflict(
					{ dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
					existingWindows
				)
			).not.toThrow();
		});
	});

	describe("getWeeklySchedule", () => {
		it("returns a map with all 7 days", () => {
			const schedule = service.getWeeklySchedule(existingWindows, staffId);
			expect(schedule.size).toBe(7);
		});

		it("groups windows by day", () => {
			const schedule = service.getWeeklySchedule(existingWindows, staffId);
			expect(schedule.get(1)).toHaveLength(2);
			expect(schedule.get(3)).toHaveLength(1);
			expect(schedule.get(0)).toHaveLength(0);
		});

		it("sorts windows by start time within each day", () => {
			const schedule = service.getWeeklySchedule(existingWindows, staffId);
			const monday = schedule.get(1)!;
			expect(monday[0].startTime).toBe("09:00");
			expect(monday[1].startTime).toBe("13:00");
		});
	});

	describe("isBlackedOut", () => {
		it("returns true for blackout date", () => {
			expect(service.isBlackedOut(blackouts, staffId, "2025-04-01")).toBe(true);
		});

		it("returns false for non-blackout date", () => {
			expect(service.isBlackedOut(blackouts, staffId, "2025-04-03")).toBe(false);
		});

		it("returns false for different staff", () => {
			expect(service.isBlackedOut(blackouts, "staff-other", "2025-04-01")).toBe(false);
		});
	});

	describe("getBlackoutsInRange", () => {
		it("returns blackouts within date range", () => {
			const result = service.getBlackoutsInRange(blackouts, staffId, "2025-04-01", "2025-04-10");
			expect(result).toHaveLength(2);
		});

		it("includes boundary dates", () => {
			const result = service.getBlackoutsInRange(blackouts, staffId, "2025-04-01", "2025-04-01");
			expect(result).toHaveLength(1);
		});

		it("returns empty for range with no blackouts", () => {
			const result = service.getBlackoutsInRange(blackouts, staffId, "2025-05-01", "2025-05-31");
			expect(result).toHaveLength(0);
		});
	});
});
