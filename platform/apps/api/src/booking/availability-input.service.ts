import { Injectable } from "@nestjs/common";

import type {
	AvailabilityInput,
	BookableStaffMember,
	ExistingBooking,
	LocationHoursInput,
	ServiceRecord,
	StaffBlackoutDateRecord,
	StaffProfileRecord,
	StaffScheduleWindowRecord,
	StaffServiceAssignmentRecord,
} from "@platform/types";
import { dayNameToNumber } from "@platform/types";

import type {
	BlackoutWindow,
	LocationOperatingHours,
} from "../location-hours";

// ─── Error ───────────────────────────────────────────────────────────────────

export class AvailabilityInputError extends Error {
	constructor(
		public readonly reason:
			| "service-not-found"
			| "service-not-bookable"
			| "location-not-found"
			| "no-staff",
		message: string
	) {
		super(message);
		this.name = "AvailabilityInputError";
	}
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AvailabilityInputService {
	/**
	 * Assembles all required inputs for slot computation from domain records.
	 * Returns a unified AvailabilityInput that the SlotComputationService consumes.
	 */
	assembleAvailabilityInput(params: {
		tenantId: string;
		locationId: string;
		service: ServiceRecord;
		locationHours: LocationOperatingHours;
		locationBlackouts: readonly BlackoutWindow[];
		staffProfiles: readonly StaffProfileRecord[];
		staffAssignments: readonly StaffServiceAssignmentRecord[];
		staffScheduleWindows: readonly StaffScheduleWindowRecord[];
		staffBlackoutDates: readonly StaffBlackoutDateRecord[];
		existingBookings: readonly ExistingBooking[];
	}): AvailabilityInput {
		const { service, locationHours, locationBlackouts } = params;

		// Validate service is bookable
		if (service.status !== "active" || !service.isBookable) {
			throw new AvailabilityInputError(
				"service-not-bookable",
				`Service ${service.name} is not active or not bookable`
			);
		}

		// Convert location hours to numeric day-of-week format
		const hours = this.convertLocationHours(locationHours);

		// Convert location blackouts
		const blackouts = locationBlackouts.map((b) => ({
			startDate: b.startDate,
			endDate: b.endDate,
		}));

		// Assemble bookable staff for this service
		const staff = this.assembleBookableStaff({
			serviceId: service.id,
			staffProfiles: params.staffProfiles,
			staffAssignments: params.staffAssignments,
			staffScheduleWindows: params.staffScheduleWindows,
			staffBlackoutDates: params.staffBlackoutDates,
		});

		return {
			tenantId: params.tenantId,
			locationId: params.locationId,
			timezone: locationHours.timezone,
			serviceId: service.id,
			serviceName: service.name,
			durationMinutes: service.durationMinutes,
			bufferMinutes: service.bufferMinutes,
			minAdvanceHours: service.minAdvanceHours,
			maxAdvanceDays: service.maxAdvanceDays,
			locationHours: hours,
			locationBlackouts: blackouts,
			staff,
			existingBookings: params.existingBookings,
		};
	}

	/**
	 * Converts LocationOperatingHours (string day names) to LocationHoursInput[]
	 * (numeric day-of-week format, 0=Sunday).
	 */
	convertLocationHours(
		hours: LocationOperatingHours
	): LocationHoursInput[] {
		return hours.entries.map((entry) => ({
			dayOfWeek: dayNameToNumber(entry.day),
			isClosed: entry.isClosed,
			openTime: entry.openTime,
			closeTime: entry.closeTime,
		}));
	}

	/**
	 * Assembles BookableStaffMember records for a given service by:
	 * 1. Finding staff assigned to the service
	 * 2. Filtering to active + bookable staff
	 * 3. Attaching their schedule windows and blackout dates
	 */
	assembleBookableStaff(params: {
		serviceId: string;
		staffProfiles: readonly StaffProfileRecord[];
		staffAssignments: readonly StaffServiceAssignmentRecord[];
		staffScheduleWindows: readonly StaffScheduleWindowRecord[];
		staffBlackoutDates: readonly StaffBlackoutDateRecord[];
	}): BookableStaffMember[] {
		const { serviceId, staffProfiles, staffAssignments, staffScheduleWindows, staffBlackoutDates } = params;

		// Get staff IDs assigned to this service
		const assignedStaffIds = staffAssignments
			.filter((a) => a.serviceId === serviceId)
			.map((a) => a.staffId);

		// Filter to active + bookable staff
		const bookableStaff = staffProfiles.filter(
			(p) =>
				assignedStaffIds.includes(p.id) &&
				p.status === "active" &&
				p.isBookable
		);

		return bookableStaff.map((staff) => ({
			staffId: staff.id,
			displayName: staff.displayName,
			scheduleWindows: staffScheduleWindows
				.filter((w) => w.staffId === staff.id)
				.map((w) => ({
					dayOfWeek: w.dayOfWeek,
					startTime: w.startTime,
					endTime: w.endTime,
				})),
			blackoutDates: staffBlackoutDates
				.filter((b) => b.staffId === staff.id)
				.map((b) => b.date),
		}));
	}

	/**
	 * Returns true if a specific date falls within any location blackout window.
	 */
	isDateBlackedOut(
		dateStr: string,
		blackouts: readonly { startDate: string; endDate: string }[]
	): boolean {
		return blackouts.some(
			(b) => dateStr >= b.startDate && dateStr <= b.endDate
		);
	}

	/**
	 * Returns the location hours entry for a given day-of-week number.
	 * Returns null if the location is closed or no entry exists.
	 */
	getLocationHoursForDay(
		hours: readonly LocationHoursInput[],
		dayOfWeek: number
	): LocationHoursInput | null {
		const entry = hours.find((h) => h.dayOfWeek === dayOfWeek);
		if (!entry || entry.isClosed || !entry.openTime || !entry.closeTime) {
			return null;
		}
		return entry;
	}
}
