import { Controller, Get, Post, Patch, Param, Query, Body, HttpException, HttpStatus } from "@nestjs/common";

import { BookingService, BookingNotFoundError, BookingTransitionError, BookingValidationError } from "./booking.service";
import { assertValidCreateBookingRequest, parseAdminBookingListQuery, BookingApiContractError } from "./booking-api-contracts";

const DEV_TENANT_ID = "pilot-superior-exteriors";

@Controller("bookings")
export class BookingController {
	private readonly bookingService = new BookingService();

	@Get()
	listBookings(@Query() query: Record<string, string>) {
		try {
			const validated = parseAdminBookingListQuery({ ...query, tenantId: DEV_TENANT_ID });
			return this.bookingService.listAdminBookings(validated);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Get(":id")
	getBooking(@Param("id") id: string) {
		try {
			return this.bookingService.getAdminBookingDetail(DEV_TENANT_ID, id);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post()
	createBooking(@Body() body: unknown) {
		try {
			const input = assertValidCreateBookingRequest(body);
			return this.bookingService.createBooking(input, []);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Patch(":id/status")
	updateBookingStatus(@Param("id") id: string, @Body() body: { status: string; reason?: string }) {
		try {
			return this.bookingService.transitionBookingStatus(DEV_TENANT_ID, id, body.status as any, body.reason);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post(":id/reschedule")
	rescheduleBooking(@Param("id") id: string, @Body() body: { date: string; startTime: string; endTime: string }) {
		// Reschedule not yet supported in service layer
		throw new HttpException("Reschedule not implemented", HttpStatus.NOT_IMPLEMENTED);
	}

	@Post(":id/cancel")
	cancelBooking(@Param("id") id: string, @Body() body: { reason?: string }) {
		try {
			return this.bookingService.adminCancelBooking(DEV_TENANT_ID, id, body.reason);
		} catch (err) {
			throw mapError(err);
		}
	}
}

function mapError(err: unknown): HttpException {
	if (err instanceof BookingNotFoundError) {
		return new HttpException(err.message, HttpStatus.NOT_FOUND);
	}
	if (err instanceof BookingTransitionError) {
		return new HttpException(err.message, HttpStatus.CONFLICT);
	}
	if (err instanceof BookingValidationError || err instanceof BookingApiContractError) {
		return new HttpException(err.message, HttpStatus.BAD_REQUEST);
	}
	if (err instanceof HttpException) return err;
	return new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
}
