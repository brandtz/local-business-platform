import type {
	BookingRecord,
	AdminBookingListQuery,
	AdminBookingListResponse,
	AdminBookingDetail,
	CreateBookingInput,
	BookingStatus,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type BookingStatusUpdateParams = {
	status: BookingStatus;
	reason?: string;
};

export type RescheduleParams = {
	date: string;
	startTime: string;
	endTime: string;
};

export type BookingsApi = {
	list(params?: AdminBookingListQuery): Promise<AdminBookingListResponse>;
	get(id: string): Promise<AdminBookingDetail>;
	create(params: CreateBookingInput): Promise<BookingRecord>;
	updateStatus(id: string, params: BookingStatusUpdateParams): Promise<BookingRecord>;
	reschedule(id: string, params: RescheduleParams): Promise<BookingRecord>;
	cancel(id: string, params?: { reason?: string }): Promise<BookingRecord>;
};

export function createBookingsApi(transport: HttpTransport): BookingsApi {
	return {
		list: (params) =>
			transport.get("/bookings", params),
		get: (id) => transport.get(`/bookings/${id}`),
		create: (params) => transport.post("/bookings", params),
		updateStatus: (id, params) => transport.patch(`/bookings/${id}/status`, params),
		reschedule: (id, params) => transport.post(`/bookings/${id}/reschedule`, params),
		cancel: (id, params) => transport.post(`/bookings/${id}/cancel`, params),
	};
}
