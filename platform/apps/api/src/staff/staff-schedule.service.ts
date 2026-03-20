import { Injectable } from "@nestjs/common";

import type {
	ScheduleConflict,
	StaffBlackoutDateRecord,
	StaffScheduleInput,
	StaffScheduleWindowRecord,
	StaffValidationResult
} from "@platform/types";
import { detectScheduleConflicts, validateScheduleWindow } from "@platform/types";

export class StaffScheduleError extends Error {
	constructor(
		public readonly reason: "conflict" | "validation-failed" | "not-found" | "blackout-overlap",
		public readonly conflict?: ScheduleConflict | null,
		message?: string
	) {
		super(message ?? `Schedule error: ${reason}`);
		this.name = "StaffScheduleError";
	}
}

@Injectable()
export class StaffScheduleService {
	validateAndCheckConflicts(
		input: StaffScheduleInput,
		existingWindows: readonly StaffScheduleWindowRecord[]
	): StaffValidationResult {
		const validation = validateScheduleWindow(input);
		if (!validation.valid) return validation;

		const conflict = detectScheduleConflicts(existingWindows, input);
		if (conflict) {
			return {
				valid: false,
				errors: [{ field: "schedule", reason: "overlap" }],
			};
		}

		return { valid: true };
	}

	requireNoConflict(
		input: StaffScheduleInput,
		existingWindows: readonly StaffScheduleWindowRecord[]
	): void {
		const result = this.validateAndCheckConflicts(input, existingWindows);
		if (!result.valid) {
			const conflict = detectScheduleConflicts(existingWindows, input);
			throw new StaffScheduleError("conflict", conflict, "Schedule window overlaps with existing window");
		}
	}

	getWeeklySchedule(
		windows: readonly StaffScheduleWindowRecord[],
		staffId: string
	): Map<number, StaffScheduleWindowRecord[]> {
		const schedule = new Map<number, StaffScheduleWindowRecord[]>();

		for (let day = 0; day <= 6; day++) {
			schedule.set(day, []);
		}

		const staffWindows = windows
			.filter((w) => w.staffId === staffId)
			.sort((a, b) => a.startTime.localeCompare(b.startTime));

		for (const window of staffWindows) {
			schedule.get(window.dayOfWeek)!.push(window);
		}

		return schedule;
	}

	isBlackedOut(
		blackouts: readonly StaffBlackoutDateRecord[],
		staffId: string,
		dateStr: string
	): boolean {
		return blackouts.some(
			(b) => b.staffId === staffId && b.date === dateStr
		);
	}

	getBlackoutsInRange(
		blackouts: readonly StaffBlackoutDateRecord[],
		staffId: string,
		startDate: string,
		endDate: string
	): StaffBlackoutDateRecord[] {
		return blackouts.filter(
			(b) =>
				b.staffId === staffId &&
				b.date >= startDate &&
				b.date <= endDate
		);
	}
}
