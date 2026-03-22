import type {
	BookingRecord,
	BookingStatus,
	CalendarBookingBlock,
} from "@platform/types";

// ---------------------------------------------------------------------------
// In-memory booking repository for tenant-scoped CRUD
// ---------------------------------------------------------------------------

const bookingCounter = { value: 0 };

function nextId(counter: { value: number }): string {
	counter.value += 1;
	return `booking-${counter.value}`;
}

function now(): string {
	return new Date().toISOString();
}

/** Non-terminal statuses that occupy a time slot and count as "active". */
const ACTIVE_STATUSES: readonly BookingStatus[] = [
	"requested",
	"confirmed",
	"checked-in",
];

export class BookingRepository {
	private bookings: BookingRecord[] = [];

	// -----------------------------------------------------------------------
	// Booking creation with double-booking prevention
	// -----------------------------------------------------------------------

	/**
	 * Creates a booking record after verifying no double-booking exists.
	 * Double-booking = same staffId + overlapping time window + active status.
	 * Throws if a conflict is detected.
	 */
	createBooking(
		tenantId: string,
		data: {
			customerId: string | null;
			customerName: string | null;
			customerEmail: string | null;
			customerPhone: string | null;
			serviceId: string;
			serviceName: string;
			staffId: string;
			staffName: string;
			locationId: string;
			startTime: string;
			endTime: string;
			durationMinutes: number;
			notes: string | null;
		}
	): BookingRecord {
		// Double-booking check: same staff, overlapping time, active status
		const conflict = this.bookings.find(
			(b) =>
				b.tenantId === tenantId &&
				b.staffId === data.staffId &&
				(ACTIVE_STATUSES as readonly string[]).includes(b.status) &&
				data.startTime < b.endTime &&
				data.endTime > b.startTime
		);

		if (conflict) {
			throw new DoubleBookingError(
				`Staff ${data.staffId} already has an active booking from ${conflict.startTime} to ${conflict.endTime}.`
			);
		}

		const timestamp = now();
		const booking: BookingRecord = {
			id: nextId(bookingCounter),
			createdAt: timestamp,
			updatedAt: timestamp,
			tenantId,
			customerId: data.customerId,
			customerName: data.customerName,
			customerEmail: data.customerEmail,
			customerPhone: data.customerPhone,
			serviceId: data.serviceId,
			serviceName: data.serviceName,
			staffId: data.staffId,
			staffName: data.staffName,
			locationId: data.locationId,
			startTime: data.startTime,
			endTime: data.endTime,
			durationMinutes: data.durationMinutes,
			status: "requested",
			notes: data.notes,
			cancellationReason: null,
			requestedAt: timestamp,
			confirmedAt: null,
			checkedInAt: null,
			completedAt: null,
			cancelledAt: null,
			noShowAt: null,
		};
		this.bookings.push(booking);
		return booking;
	}

	// -----------------------------------------------------------------------
	// Lookups
	// -----------------------------------------------------------------------

	getBookingById(tenantId: string, bookingId: string): BookingRecord | undefined {
		return this.bookings.find((b) => b.tenantId === tenantId && b.id === bookingId);
	}

	getBookingByIdForCustomer(
		tenantId: string,
		bookingId: string,
		customerId: string
	): BookingRecord | undefined {
		return this.bookings.find(
			(b) =>
				b.tenantId === tenantId &&
				b.id === bookingId &&
				b.customerId === customerId
		);
	}

	// -----------------------------------------------------------------------
	// Admin list with filters
	// -----------------------------------------------------------------------

	listBookingsForTenant(
		tenantId: string,
		filters?: {
			status?: BookingStatus;
			staffId?: string;
			serviceId?: string;
			dateFrom?: string;
			dateTo?: string;
			search?: string;
		}
	): BookingRecord[] {
		let results = this.bookings.filter((b) => b.tenantId === tenantId);

		if (filters?.status) {
			results = results.filter((b) => b.status === filters.status);
		}
		if (filters?.staffId) {
			results = results.filter((b) => b.staffId === filters.staffId);
		}
		if (filters?.serviceId) {
			results = results.filter((b) => b.serviceId === filters.serviceId);
		}
		if (filters?.dateFrom) {
			results = results.filter((b) => b.startTime >= filters.dateFrom!);
		}
		if (filters?.dateTo) {
			results = results.filter((b) => b.startTime <= filters.dateTo!);
		}
		if (filters?.search) {
			const term = filters.search.toLowerCase();
			results = results.filter(
				(b) =>
					b.id.toLowerCase().includes(term) ||
					(b.customerName?.toLowerCase().includes(term) ?? false) ||
					b.serviceName.toLowerCase().includes(term) ||
					b.staffName.toLowerCase().includes(term)
			);
		}

		return results.sort(
			(a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
		);
	}

	// -----------------------------------------------------------------------
	// Customer list
	// -----------------------------------------------------------------------

	listBookingsForCustomer(tenantId: string, customerId: string): BookingRecord[] {
		return this.bookings
			.filter((b) => b.tenantId === tenantId && b.customerId === customerId)
			.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
	}

	// -----------------------------------------------------------------------
	// Calendar view — bookings in a date range with optional staff/service filter
	// -----------------------------------------------------------------------

	getCalendarBlocks(
		tenantId: string,
		startDate: string,
		endDate: string,
		filters?: { staffId?: string; serviceId?: string }
	): CalendarBookingBlock[] {
		const startIso = `${startDate}T00:00:00`;
		const endIso = `${endDate}T23:59:59`;

		let results = this.bookings.filter(
			(b) =>
				b.tenantId === tenantId &&
				b.startTime >= startIso &&
				b.startTime <= endIso
		);

		if (filters?.staffId) {
			results = results.filter((b) => b.staffId === filters.staffId);
		}
		if (filters?.serviceId) {
			results = results.filter((b) => b.serviceId === filters.serviceId);
		}

		return results.map((b) => ({
			bookingId: b.id,
			status: b.status,
			customerName: b.customerName,
			serviceName: b.serviceName,
			staffId: b.staffId,
			staffName: b.staffName,
			startTime: b.startTime,
			endTime: b.endTime,
			durationMinutes: b.durationMinutes,
		}));
	}

	// -----------------------------------------------------------------------
	// Status update
	// -----------------------------------------------------------------------

	updateBookingStatus(
		bookingId: string,
		status: BookingStatus,
		timestampField: string | null,
		cancellationReason?: string
	): BookingRecord | undefined {
		const booking = this.bookings.find((b) => b.id === bookingId);
		if (!booking) return undefined;

		booking.status = status;
		booking.updatedAt = now();

		if (timestampField && timestampField in booking) {
			(booking as Record<string, unknown>)[timestampField] = booking.updatedAt;
		}

		if (cancellationReason !== undefined) {
			booking.cancellationReason = cancellationReason;
		}

		return booking;
	}

	// -----------------------------------------------------------------------
	// Status count aggregation
	// -----------------------------------------------------------------------

	countBookingsByStatus(tenantId: string): Map<BookingStatus, number> {
		const counts = new Map<BookingStatus, number>();
		for (const booking of this.bookings) {
			if (booking.tenantId !== tenantId) continue;
			counts.set(booking.status, (counts.get(booking.status) ?? 0) + 1);
		}
		return counts;
	}

	// -----------------------------------------------------------------------
	// Active bookings for a staff member (for conflict detection)
	// -----------------------------------------------------------------------

	getActiveBookingsForStaff(tenantId: string, staffId: string): BookingRecord[] {
		return this.bookings.filter(
			(b) =>
				b.tenantId === tenantId &&
				b.staffId === staffId &&
				(ACTIVE_STATUSES as readonly string[]).includes(b.status)
		);
	}
}

// ---------------------------------------------------------------------------
// Error type for double-booking violations
// ---------------------------------------------------------------------------

export class DoubleBookingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DoubleBookingError";
	}
}
