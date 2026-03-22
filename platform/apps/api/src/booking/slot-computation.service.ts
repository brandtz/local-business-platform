import { Injectable } from "@nestjs/common";

import type {
	AvailabilityInput,
	BookableStaffMember,
	ComputedSlot,
	ExistingBooking,
	LocationHoursInput,
	SlotComputationResult,
} from "@platform/types";

// ─── Error ───────────────────────────────────────────────────────────────────

export class SlotComputationError extends Error {
	constructor(
		public readonly reason:
			| "no-staff"
			| "invalid-input"
			| "service-too-long",
		message: string
	) {
		super(message);
		this.name = "SlotComputationError";
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse "HH:mm" to total minutes from midnight. */
function parseTimeToMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

/** Format total minutes from midnight to "HH:mm". */
function minutesToTime(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Build an ISO 8601 datetime string from a date (YYYY-MM-DD) and time (HH:mm). */
function buildIsoDateTime(dateStr: string, timeStr: string): string {
	return `${dateStr}T${timeStr}:00`;
}

/** Get day-of-week number (0=Sunday) from a YYYY-MM-DD date string. */
function getDayOfWeek(dateStr: string): number {
	const d = new Date(dateStr + "T12:00:00Z");
	return d.getUTCDay();
}

/** Generate date strings from startDate to endDate inclusive. */
function generateDateRange(startDate: string, endDate: string): string[] {
	const dates: string[] = [];
	const current = new Date(startDate + "T12:00:00Z");
	const end = new Date(endDate + "T12:00:00Z");

	while (current <= end) {
		const year = current.getUTCFullYear();
		const month = String(current.getUTCMonth() + 1).padStart(2, "0");
		const day = String(current.getUTCDate()).padStart(2, "0");
		dates.push(`${year}-${month}-${day}`);
		current.setUTCDate(current.getUTCDate() + 1);
	}

	return dates;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class SlotComputationService {
	/**
	 * Computes available booking time slots for a single date.
	 * Combines location hours, staff schedules, blackouts, existing bookings,
	 * service duration + buffer, and lead time constraints.
	 */
	computeSlotsForDate(
		input: AvailabilityInput,
		date: string,
		now?: Date
	): SlotComputationResult {
		const dayOfWeek = getDayOfWeek(date);

		// Check location hours for this day
		const locationDay = input.locationHours.find(
			(h) => h.dayOfWeek === dayOfWeek
		);
		if (!locationDay || locationDay.isClosed || !locationDay.openTime || !locationDay.closeTime) {
			return this.emptyResult(input, date);
		}

		// Check location blackouts
		if (this.isDateInLocationBlackout(date, input.locationBlackouts)) {
			return this.emptyResult(input, date);
		}

		// No staff means no slots
		if (input.staff.length === 0) {
			return this.emptyResult(input, date);
		}

		const slots: ComputedSlot[] = [];

		for (const staffMember of input.staff) {
			const staffSlots = this.computeStaffSlotsForDate(
				input,
				staffMember,
				locationDay,
				date,
				now
			);
			slots.push(...staffSlots);
		}

		// Sort slots by startTime, then by staffName for deterministic output
		slots.sort((a, b) => {
			const timeCompare = a.startTime.localeCompare(b.startTime);
			if (timeCompare !== 0) return timeCompare;
			return a.staffName.localeCompare(b.staffName);
		});

		return {
			tenantId: input.tenantId,
			locationId: input.locationId,
			serviceId: input.serviceId,
			date,
			slots,
		};
	}

	/**
	 * Computes available booking slots across a date range.
	 */
	computeSlotsForDateRange(
		input: AvailabilityInput,
		startDate: string,
		endDate: string,
		now?: Date
	): SlotComputationResult[] {
		const dates = generateDateRange(startDate, endDate);

		// Filter dates within max advance window
		const filteredDates = this.filterDatesByAdvanceLimits(
			dates,
			input.maxAdvanceDays,
			now
		);

		return filteredDates.map((date) =>
			this.computeSlotsForDate(input, date, now)
		);
	}

	/**
	 * Checks if a proposed booking slot conflicts with any existing bookings.
	 * A conflict exists when the same staff member has overlapping time windows.
	 */
	hasConflict(
		staffId: string,
		proposedStart: string,
		proposedEnd: string,
		existingBookings: readonly ExistingBooking[]
	): boolean {
		return existingBookings.some(
			(booking) =>
				booking.staffId === staffId &&
				proposedStart < booking.endTime &&
				proposedEnd > booking.startTime
		);
	}

	// ─── Private ─────────────────────────────────────────────────────────────

	private computeStaffSlotsForDate(
		input: AvailabilityInput,
		staffMember: BookableStaffMember,
		locationDay: LocationHoursInput,
		date: string,
		now?: Date
	): ComputedSlot[] {
		const dayOfWeek = getDayOfWeek(date);

		// Check staff blackout
		if (staffMember.blackoutDates.includes(date)) {
			return [];
		}

		// Get staff schedule windows for this day of week
		const staffWindows = staffMember.scheduleWindows.filter(
			(w) => w.dayOfWeek === dayOfWeek
		);
		if (staffWindows.length === 0) {
			return [];
		}

		const locationOpen = parseTimeToMinutes(locationDay.openTime!);
		const locationClose = parseTimeToMinutes(locationDay.closeTime!);

		const slots: ComputedSlot[] = [];

		for (const window of staffWindows) {
			const staffStart = parseTimeToMinutes(window.startTime);
			const staffEnd = parseTimeToMinutes(window.endTime);

			// Effective window is the intersection of location hours and staff hours
			const effectiveStart = Math.max(locationOpen, staffStart);
			const effectiveEnd = Math.min(locationClose, staffEnd);

			if (effectiveStart >= effectiveEnd) continue;

			// Generate slots within this effective window
			const windowSlots = this.generateSlotsInWindow(
				input,
				staffMember,
				date,
				effectiveStart,
				effectiveEnd,
				now
			);
			slots.push(...windowSlots);
		}

		return slots;
	}

	private generateSlotsInWindow(
		input: AvailabilityInput,
		staffMember: BookableStaffMember,
		date: string,
		windowStartMinutes: number,
		windowEndMinutes: number,
		now?: Date
	): ComputedSlot[] {
		const { durationMinutes, bufferMinutes } = input;
		const slots: ComputedSlot[] = [];

		// Compute minimum start time based on lead time (minAdvanceHours)
		const minStartMinutes = this.computeMinStartMinutes(
			date,
			input.minAdvanceHours,
			input.timezone,
			now
		);

		let currentStart = windowStartMinutes;

		while (currentStart + durationMinutes <= windowEndMinutes) {
			const slotEnd = currentStart + durationMinutes;
			const startTimeStr = minutesToTime(currentStart);
			const endTimeStr = minutesToTime(slotEnd);
			const isoStart = buildIsoDateTime(date, startTimeStr);
			const isoEnd = buildIsoDateTime(date, endTimeStr);

			// Check lead time constraint
			if (currentStart >= minStartMinutes) {
				// Check for conflicts with existing bookings
				if (
					!this.hasConflict(
						staffMember.staffId,
						isoStart,
						isoEnd,
						input.existingBookings
					)
				) {
					slots.push({
						startTime: isoStart,
						endTime: isoEnd,
						staffId: staffMember.staffId,
						staffName: staffMember.displayName,
						serviceId: input.serviceId,
					});
				}
			}

			// Advance by duration + buffer
			currentStart = slotEnd + bufferMinutes;
		}

		return slots;
	}

	private computeMinStartMinutes(
		date: string,
		minAdvanceHours: number,
		_timezone: string,
		now?: Date
	): number {
		if (!now || minAdvanceHours <= 0) return 0;

		// For simplicity, compute in UTC. A production implementation would
		// use the timezone parameter for proper timezone-aware computation.
		const nowMs = now.getTime();
		const minBookableMs = nowMs + minAdvanceHours * 60 * 60 * 1000;
		const minBookableDate = new Date(minBookableMs);

		// If the min bookable time is beyond today, no slots are available
		const todayStr = `${minBookableDate.getUTCFullYear()}-${String(minBookableDate.getUTCMonth() + 1).padStart(2, "0")}-${String(minBookableDate.getUTCDate()).padStart(2, "0")}`;

		if (todayStr > date) {
			// The minimum advance time is after the requested date entirely
			return 24 * 60; // No slots possible
		}

		if (todayStr < date) {
			// The requested date is after the min advance, so all times are valid
			return 0;
		}

		// Same day: return the time portion as minutes
		return minBookableDate.getUTCHours() * 60 + minBookableDate.getUTCMinutes();
	}

	private filterDatesByAdvanceLimits(
		dates: string[],
		maxAdvanceDays: number,
		now?: Date
	): string[] {
		if (!now || maxAdvanceDays <= 0) return dates;

		const maxDate = new Date(now.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
		const maxDateStr = `${maxDate.getUTCFullYear()}-${String(maxDate.getUTCMonth() + 1).padStart(2, "0")}-${String(maxDate.getUTCDate()).padStart(2, "0")}`;

		return dates.filter((d) => d <= maxDateStr);
	}

	private isDateInLocationBlackout(
		dateStr: string,
		blackouts: readonly { startDate: string; endDate: string }[]
	): boolean {
		return blackouts.some(
			(b) => dateStr >= b.startDate && dateStr <= b.endDate
		);
	}

	private emptyResult(
		input: AvailabilityInput,
		date: string
	): SlotComputationResult {
		return {
			tenantId: input.tenantId,
			locationId: input.locationId,
			serviceId: input.serviceId,
			date,
			slots: [],
		};
	}
}
