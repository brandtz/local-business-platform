import { Injectable } from "@nestjs/common";
import type {
	BookingRecord,
	BookingStatus,
	CreateBookingInput,
	AdminBookingSummary,
	AdminBookingDetail,
	AdminBookingListQuery,
	AdminBookingListResponse,
	BookingPipelineCounts,
	BookingStatusCount,
	CustomerBookingSummary,
	CustomerBookingDetail,
	BookingTrackingData,
	CalendarViewQuery,
	CalendarViewResponse,
	CalendarDayData,
	CancellationPolicy,
	ExistingBooking,
} from "@platform/types";
import {
	isValidBookingTransition,
	getNextBookingStatuses,
	isBookingCancellable,
	bookingStatuses,
	computeBookingTrackingSteps,
	getCurrentBookingTrackingStepIndex,
	evaluateCancellationWindow,
	DEFAULT_CANCELLATION_POLICY,
} from "@platform/types";

import { BookingRepository } from "./booking.repository";
import { SlotComputationService } from "./slot-computation.service";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class BookingNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BookingNotFoundError";
	}
}

export class BookingTransitionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BookingTransitionError";
	}
}

export class BookingValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BookingValidationError";
	}
}

// ---------------------------------------------------------------------------
// Booking status → timestamp field mapping
// ---------------------------------------------------------------------------

const statusTimestampField: Record<string, string | null> = {
	requested: "requestedAt",
	confirmed: "confirmedAt",
	"checked-in": "checkedInAt",
	completed: "completedAt",
	cancelled: "cancelledAt",
	"no-show": "noShowAt",
};

// ---------------------------------------------------------------------------
// Booking domain service
// ---------------------------------------------------------------------------

@Injectable()
export class BookingService {
	constructor(
		private readonly repository: BookingRepository = new BookingRepository(),
		private readonly slotComputation: SlotComputationService = new SlotComputationService()
	) {}

	// -----------------------------------------------------------------------
	// Booking creation — consumes slot computation to validate availability
	// -----------------------------------------------------------------------

	createBooking(
		input: CreateBookingInput,
		existingBookings: readonly ExistingBooking[]
	): BookingRecord {
		if (!input.serviceId || input.serviceId.trim().length === 0) {
			throw new BookingValidationError("Service ID is required.");
		}
		if (!input.staffId || input.staffId.trim().length === 0) {
			throw new BookingValidationError("Staff ID is required.");
		}
		if (!input.startTime || input.startTime.trim().length === 0) {
			throw new BookingValidationError("Start time is required.");
		}
		if (!input.endTime || input.endTime.trim().length === 0) {
			throw new BookingValidationError("End time is required.");
		}
		if (input.durationMinutes <= 0) {
			throw new BookingValidationError("Duration must be positive.");
		}

		// Validate no conflict with existing bookings using slot computation service
		const hasConflict = this.slotComputation.hasConflict(
			input.staffId,
			input.startTime,
			input.endTime,
			existingBookings
		);

		if (hasConflict) {
			throw new BookingValidationError(
				"The requested time slot conflicts with an existing booking."
			);
		}

		// Repository will also enforce double-booking at the storage level
		return this.repository.createBooking(input.tenantId, {
			customerId: input.customerId,
			customerName: input.customerName,
			customerEmail: input.customerEmail,
			customerPhone: input.customerPhone,
			serviceId: input.serviceId,
			serviceName: input.serviceName,
			staffId: input.staffId,
			staffName: input.staffName,
			locationId: input.locationId,
			startTime: input.startTime,
			endTime: input.endTime,
			durationMinutes: input.durationMinutes,
			notes: input.notes,
		});
	}

	// -----------------------------------------------------------------------
	// Status transitions
	// -----------------------------------------------------------------------

	transitionBookingStatus(
		tenantId: string,
		bookingId: string,
		targetStatus: BookingStatus,
		cancellationReason?: string
	): BookingRecord {
		const booking = this.repository.getBookingById(tenantId, bookingId);
		if (!booking) {
			throw new BookingNotFoundError(`Booking ${bookingId} not found.`);
		}

		if (!isValidBookingTransition(booking.status, targetStatus)) {
			throw new BookingTransitionError(
				`Cannot transition booking from '${booking.status}' to '${targetStatus}'.`
			);
		}

		const timestampField = statusTimestampField[targetStatus] ?? null;

		const updated = this.repository.updateBookingStatus(
			bookingId,
			targetStatus,
			timestampField,
			targetStatus === "cancelled" ? (cancellationReason ?? undefined) : undefined
		);

		if (!updated) {
			throw new BookingNotFoundError(`Booking ${bookingId} not found.`);
		}

		return updated;
	}

	confirmBooking(tenantId: string, bookingId: string): BookingRecord {
		return this.transitionBookingStatus(tenantId, bookingId, "confirmed");
	}

	checkInBooking(tenantId: string, bookingId: string): BookingRecord {
		return this.transitionBookingStatus(tenantId, bookingId, "checked-in");
	}

	completeBooking(tenantId: string, bookingId: string): BookingRecord {
		return this.transitionBookingStatus(tenantId, bookingId, "completed");
	}

	noShowBooking(tenantId: string, bookingId: string): BookingRecord {
		return this.transitionBookingStatus(tenantId, bookingId, "no-show");
	}

	/**
	 * Cancel a booking with cancellation window policy enforcement.
	 */
	cancelBooking(
		tenantId: string,
		bookingId: string,
		reason?: string,
		policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY,
		now?: Date
	): BookingRecord {
		const booking = this.repository.getBookingById(tenantId, bookingId);
		if (!booking) {
			throw new BookingNotFoundError(`Booking ${bookingId} not found.`);
		}

		if (!isBookingCancellable(booking.status)) {
			throw new BookingTransitionError(
				`Booking in status '${booking.status}' cannot be cancelled.`
			);
		}

		const windowResult = evaluateCancellationWindow(
			booking.startTime,
			policy,
			now
		);

		if (!windowResult.allowed) {
			throw new BookingTransitionError(
				`Cancellation not allowed: ${windowResult.reason}`
			);
		}

		return this.transitionBookingStatus(tenantId, bookingId, "cancelled", reason);
	}

	/**
	 * Admin override cancellation — bypasses cancellation window checks.
	 */
	adminCancelBooking(
		tenantId: string,
		bookingId: string,
		reason?: string
	): BookingRecord {
		const booking = this.repository.getBookingById(tenantId, bookingId);
		if (!booking) {
			throw new BookingNotFoundError(`Booking ${bookingId} not found.`);
		}

		if (!isBookingCancellable(booking.status)) {
			throw new BookingTransitionError(
				`Booking in status '${booking.status}' cannot be cancelled.`
			);
		}

		return this.transitionBookingStatus(tenantId, bookingId, "cancelled", reason);
	}

	// -----------------------------------------------------------------------
	// Admin queries
	// -----------------------------------------------------------------------

	getAdminBookingDetail(tenantId: string, bookingId: string): AdminBookingDetail {
		const booking = this.repository.getBookingById(tenantId, bookingId);
		if (!booking) {
			throw new BookingNotFoundError(`Booking ${bookingId} not found.`);
		}

		return this.buildAdminBookingDetail(booking);
	}

	listAdminBookings(query: AdminBookingListQuery): AdminBookingListResponse {
		const allBookings = this.repository.listBookingsForTenant(query.tenantId, {
			status: query.status,
			staffId: query.staffId,
			serviceId: query.serviceId,
			search: query.search,
			dateFrom: query.dateFrom,
			dateTo: query.dateTo,
		});

		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;
		const startIndex = (page - 1) * pageSize;
		const paged = allBookings.slice(startIndex, startIndex + pageSize);

		return {
			bookings: paged.map((b) => this.buildAdminBookingSummary(b)),
			total: allBookings.length,
			page,
			pageSize,
		};
	}

	getBookingPipelineCounts(tenantId: string): BookingPipelineCounts {
		const countMap = this.repository.countBookingsByStatus(tenantId);
		const counts: BookingStatusCount[] = [];
		let total = 0;

		for (const status of bookingStatuses) {
			const count = countMap.get(status) ?? 0;
			counts.push({ status, count });
			total += count;
		}

		return { counts, total };
	}

	// -----------------------------------------------------------------------
	// Calendar view
	// -----------------------------------------------------------------------

	getCalendarView(query: CalendarViewQuery): CalendarViewResponse {
		const blocks = this.repository.getCalendarBlocks(
			query.tenantId,
			query.startDate,
			query.endDate,
			{ staffId: query.staffId, serviceId: query.serviceId }
		);

		// Group blocks by date
		const dayMap = new Map<string, CalendarDayData>();

		// Initialize all dates in range
		const start = new Date(query.startDate + "T12:00:00Z");
		const end = new Date(query.endDate + "T12:00:00Z");
		const current = new Date(start);

		while (current <= end) {
			const dateStr = current.toISOString().slice(0, 10);
			dayMap.set(dateStr, { date: dateStr, blocks: [] });
			current.setUTCDate(current.getUTCDate() + 1);
		}

		// Assign blocks to their respective dates
		for (const block of blocks) {
			const dateStr = block.startTime.slice(0, 10);
			const day = dayMap.get(dateStr);
			if (day) {
				day.blocks.push(block);
			}
		}

		// Sort blocks within each day by startTime
		for (const day of dayMap.values()) {
			day.blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
		}

		const days = Array.from(dayMap.values()).sort((a, b) =>
			a.date.localeCompare(b.date)
		);

		return { days, query };
	}

	// -----------------------------------------------------------------------
	// Customer queries
	// -----------------------------------------------------------------------

	getCustomerBookingDetail(
		tenantId: string,
		bookingId: string,
		customerId: string
	): CustomerBookingDetail {
		const booking = this.repository.getBookingByIdForCustomer(
			tenantId,
			bookingId,
			customerId
		);
		if (!booking) {
			throw new BookingNotFoundError(`Booking ${bookingId} not found.`);
		}

		return this.buildCustomerBookingDetail(booking);
	}

	listCustomerBookings(tenantId: string, customerId: string): CustomerBookingSummary[] {
		const bookings = this.repository.listBookingsForCustomer(tenantId, customerId);
		return bookings.map((b) => this.buildCustomerBookingSummary(b));
	}

	// -----------------------------------------------------------------------
	// Customer booking tracking
	// -----------------------------------------------------------------------

	getBookingTrackingData(
		tenantId: string,
		bookingId: string,
		customerId: string
	): BookingTrackingData {
		const booking = this.repository.getBookingByIdForCustomer(
			tenantId,
			bookingId,
			customerId
		);
		if (!booking) {
			throw new BookingNotFoundError(`Booking ${bookingId} not found.`);
		}

		const steps = computeBookingTrackingSteps(booking.status, {
			requestedAt: booking.requestedAt,
			confirmedAt: booking.confirmedAt,
			checkedInAt: booking.checkedInAt,
			completedAt: booking.completedAt,
		});

		return {
			bookingId: booking.id,
			status: booking.status,
			isCancelled: booking.status === "cancelled",
			isNoShow: booking.status === "no-show",
			steps,
			currentStepIndex: getCurrentBookingTrackingStepIndex(booking.status),
			serviceName: booking.serviceName,
			staffName: booking.staffName,
			startTime: booking.startTime,
			endTime: booking.endTime,
			durationMinutes: booking.durationMinutes,
		};
	}

	// -----------------------------------------------------------------------
	// Private builders
	// -----------------------------------------------------------------------

	private buildAdminBookingSummary(booking: BookingRecord): AdminBookingSummary {
		return {
			id: booking.id,
			createdAt: booking.createdAt,
			status: booking.status,
			customerName: booking.customerName,
			serviceName: booking.serviceName,
			staffName: booking.staffName,
			startTime: booking.startTime,
			endTime: booking.endTime,
			durationMinutes: booking.durationMinutes,
		};
	}

	private buildAdminBookingDetail(booking: BookingRecord): AdminBookingDetail {
		return {
			id: booking.id,
			createdAt: booking.createdAt,
			updatedAt: booking.updatedAt,
			status: booking.status,
			customerName: booking.customerName,
			customerEmail: booking.customerEmail,
			customerPhone: booking.customerPhone,
			serviceId: booking.serviceId,
			serviceName: booking.serviceName,
			staffId: booking.staffId,
			staffName: booking.staffName,
			locationId: booking.locationId,
			startTime: booking.startTime,
			endTime: booking.endTime,
			durationMinutes: booking.durationMinutes,
			notes: booking.notes,
			cancellationReason: booking.cancellationReason,
			requestedAt: booking.requestedAt,
			confirmedAt: booking.confirmedAt,
			checkedInAt: booking.checkedInAt,
			completedAt: booking.completedAt,
			cancelledAt: booking.cancelledAt,
			noShowAt: booking.noShowAt,
			allowedTransitions: getNextBookingStatuses(booking.status),
		};
	}

	private buildCustomerBookingSummary(booking: BookingRecord): CustomerBookingSummary {
		return {
			id: booking.id,
			createdAt: booking.createdAt,
			status: booking.status,
			serviceName: booking.serviceName,
			staffName: booking.staffName,
			startTime: booking.startTime,
			endTime: booking.endTime,
			durationMinutes: booking.durationMinutes,
		};
	}

	private buildCustomerBookingDetail(booking: BookingRecord): CustomerBookingDetail {
		return {
			id: booking.id,
			createdAt: booking.createdAt,
			status: booking.status,
			serviceName: booking.serviceName,
			staffName: booking.staffName,
			startTime: booking.startTime,
			endTime: booking.endTime,
			durationMinutes: booking.durationMinutes,
			notes: booking.notes,
			cancelledAt: booking.cancelledAt,
		};
	}
}
