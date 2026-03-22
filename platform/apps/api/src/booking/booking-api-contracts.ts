import type {
	AdminBookingDetail,
	AdminBookingSummary,
	AdminBookingListResponse,
	CustomerBookingDetail,
	CustomerBookingSummary,
	BookingTrackingData,
	CalendarViewResponse,
	CalendarViewQuery,
	BookingPipelineCounts,
	CreateBookingInput,
	BookingStatus,
	AdminBookingListQuery,
} from "@platform/types";
import { isValidBookingStatus } from "@platform/types";

// ─── Contract Error ──────────────────────────────────────────────────────────

export class BookingApiContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BookingApiContractError";
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

// ─── Create Booking Request Validation ───────────────────────────────────────

export function assertValidCreateBookingRequest(
	payload: unknown
): asserts payload is CreateBookingInput {
	if (!isRecord(payload)) {
		throw new BookingApiContractError("Create booking request must be an object.");
	}
	if (!isNonEmptyString(payload.tenantId)) {
		throw new BookingApiContractError("Create booking request requires a non-empty tenantId.");
	}
	if (!isNonEmptyString(payload.serviceId)) {
		throw new BookingApiContractError("Create booking request requires a non-empty serviceId.");
	}
	if (!isNonEmptyString(payload.staffId)) {
		throw new BookingApiContractError("Create booking request requires a non-empty staffId.");
	}
	if (!isNonEmptyString(payload.startTime)) {
		throw new BookingApiContractError("Create booking request requires a non-empty startTime.");
	}
	if (!isNonEmptyString(payload.endTime)) {
		throw new BookingApiContractError("Create booking request requires a non-empty endTime.");
	}
	if (typeof payload.durationMinutes !== "number" || payload.durationMinutes <= 0) {
		throw new BookingApiContractError("Create booking request requires a positive durationMinutes.");
	}
}

// ─── Admin List Query Validation ─────────────────────────────────────────────

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

export type AdminBookingListQueryParams = {
	tenantId: string;
	status?: string;
	staffId?: string;
	serviceId?: string;
	dateFrom?: string;
	dateTo?: string;
	search?: string;
	page?: string;
	pageSize?: string;
};

export function parseAdminBookingListQuery(
	params: AdminBookingListQueryParams
): AdminBookingListQuery {
	const query: AdminBookingListQuery = {
		tenantId: params.tenantId,
	};

	if (params.status) {
		if (!isValidBookingStatus(params.status)) {
			throw new BookingApiContractError(`Invalid booking status: ${params.status}`);
		}
		query.status = params.status;
	}
	if (params.staffId) query.staffId = params.staffId;
	if (params.serviceId) query.serviceId = params.serviceId;
	if (params.dateFrom) {
		if (!DATE_PATTERN.test(params.dateFrom)) {
			throw new BookingApiContractError("dateFrom must be in YYYY-MM-DD format.");
		}
		query.dateFrom = params.dateFrom;
	}
	if (params.dateTo) {
		if (!DATE_PATTERN.test(params.dateTo)) {
			throw new BookingApiContractError("dateTo must be in YYYY-MM-DD format.");
		}
		query.dateTo = params.dateTo;
	}
	if (params.search) query.search = params.search;
	if (params.page) query.page = parseInt(params.page, 10);
	if (params.pageSize) query.pageSize = parseInt(params.pageSize, 10);

	return query;
}

// ─── Calendar View Query Validation ──────────────────────────────────────────

export function assertValidCalendarViewQuery(
	payload: unknown
): asserts payload is CalendarViewQuery {
	if (!isRecord(payload)) {
		throw new BookingApiContractError("Calendar view query must be an object.");
	}
	if (!isNonEmptyString(payload.tenantId)) {
		throw new BookingApiContractError("Calendar view query requires a non-empty tenantId.");
	}
	if (!isNonEmptyString(payload.startDate)) {
		throw new BookingApiContractError("Calendar view query requires a non-empty startDate.");
	}
	if (!isNonEmptyString(payload.endDate)) {
		throw new BookingApiContractError("Calendar view query requires a non-empty endDate.");
	}
}

// ─── Response Validators ─────────────────────────────────────────────────────

export function assertValidAdminBookingDetailResponse(
	response: unknown
): asserts response is AdminBookingDetail {
	if (!isRecord(response)) {
		throw new BookingApiContractError("Admin booking detail response must be an object.");
	}
	if (!isNonEmptyString(response.id)) {
		throw new BookingApiContractError("Admin booking detail requires an id.");
	}
	if (!isNonEmptyString(response.status)) {
		throw new BookingApiContractError("Admin booking detail requires a status.");
	}
	if (!Array.isArray(response.allowedTransitions)) {
		throw new BookingApiContractError(
			"Admin booking detail requires an allowedTransitions array."
		);
	}
}

export function assertValidAdminBookingListResponse(
	response: unknown
): asserts response is AdminBookingListResponse {
	if (!isRecord(response)) {
		throw new BookingApiContractError("Admin booking list response must be an object.");
	}
	if (!Array.isArray(response.bookings)) {
		throw new BookingApiContractError("Admin booking list requires a bookings array.");
	}
	if (typeof response.total !== "number") {
		throw new BookingApiContractError("Admin booking list requires a total count.");
	}
}

export function assertValidCustomerBookingDetailResponse(
	response: unknown
): asserts response is CustomerBookingDetail {
	if (!isRecord(response)) {
		throw new BookingApiContractError("Customer booking detail response must be an object.");
	}
	if (!isNonEmptyString(response.id)) {
		throw new BookingApiContractError("Customer booking detail requires an id.");
	}
	if (!isNonEmptyString(response.status)) {
		throw new BookingApiContractError("Customer booking detail requires a status.");
	}
}

export function assertValidCalendarViewResponse(
	response: unknown
): asserts response is CalendarViewResponse {
	if (!isRecord(response)) {
		throw new BookingApiContractError("Calendar view response must be an object.");
	}
	if (!Array.isArray(response.days)) {
		throw new BookingApiContractError("Calendar view response requires a days array.");
	}
}

export function assertValidBookingTrackingResponse(
	response: unknown
): asserts response is BookingTrackingData {
	if (!isRecord(response)) {
		throw new BookingApiContractError("Booking tracking response must be an object.");
	}
	if (!isNonEmptyString(response.bookingId)) {
		throw new BookingApiContractError("Booking tracking requires a bookingId.");
	}
	if (!Array.isArray(response.steps)) {
		throw new BookingApiContractError("Booking tracking requires a steps array.");
	}
}
