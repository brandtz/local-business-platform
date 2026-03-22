import { describe, it, expect, beforeEach } from "vitest";
import type { CreateBookingInput, ExistingBooking } from "@platform/types";
import {
	BookingService,
	BookingNotFoundError,
	BookingTransitionError,
	BookingValidationError,
} from "./booking.service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function createService(): BookingService {
	return new BookingService();
}

function sampleBookingInput(overrides?: Partial<CreateBookingInput>): CreateBookingInput {
	return {
		tenantId: TENANT_A,
		locationId: "loc-1",
		customerId: "cust-1",
		customerName: "Jane Doe",
		customerEmail: "jane@example.com",
		customerPhone: "555-9876",
		serviceId: "svc-1",
		serviceName: "Haircut",
		staffId: "staff-1",
		staffName: "Alice",
		startTime: "2026-04-01T10:00:00",
		endTime: "2026-04-01T10:30:00",
		durationMinutes: 30,
		notes: "First visit",
		...overrides,
	};
}

describe("BookingService", () => {
	let service: BookingService;

	beforeEach(() => {
		service = createService();
	});

	// -----------------------------------------------------------------------
	// Booking creation
	// -----------------------------------------------------------------------

	describe("createBooking", () => {
		it("creates a booking with requested status", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			expect(booking.status).toBe("requested");
			expect(booking.tenantId).toBe(TENANT_A);
			expect(booking.customerId).toBe("cust-1");
			expect(booking.serviceName).toBe("Haircut");
			expect(booking.staffName).toBe("Alice");
			expect(booking.requestedAt).not.toBeNull();
		});

		it("sets booking time slot details", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			expect(booking.startTime).toBe("2026-04-01T10:00:00");
			expect(booking.endTime).toBe("2026-04-01T10:30:00");
			expect(booking.durationMinutes).toBe(30);
		});

		it("rejects booking with empty serviceId", () => {
			expect(() =>
				service.createBooking(sampleBookingInput({ serviceId: "" }), [])
			).toThrow(BookingValidationError);
		});

		it("rejects booking with empty staffId", () => {
			expect(() =>
				service.createBooking(sampleBookingInput({ staffId: "" }), [])
			).toThrow(BookingValidationError);
		});

		it("rejects booking with zero duration", () => {
			expect(() =>
				service.createBooking(sampleBookingInput({ durationMinutes: 0 }), [])
			).toThrow(BookingValidationError);
		});

		it("rejects booking when slot conflicts with existing bookings", () => {
			const existing: ExistingBooking[] = [
				{
					id: "existing-1",
					staffId: "staff-1",
					serviceId: "svc-1",
					startTime: "2026-04-01T09:45:00",
					endTime: "2026-04-01T10:15:00",
				},
			];

			expect(() =>
				service.createBooking(sampleBookingInput(), existing)
			).toThrow(BookingValidationError);
		});

		it("allows booking when slot does not conflict", () => {
			const existing: ExistingBooking[] = [
				{
					id: "existing-1",
					staffId: "staff-1",
					serviceId: "svc-1",
					startTime: "2026-04-01T08:00:00",
					endTime: "2026-04-01T08:30:00",
				},
			];

			const booking = service.createBooking(sampleBookingInput(), existing);
			expect(booking.status).toBe("requested");
		});

		it("allows booking when different staff has overlapping time", () => {
			const existing: ExistingBooking[] = [
				{
					id: "existing-1",
					staffId: "staff-2", // different staff
					serviceId: "svc-1",
					startTime: "2026-04-01T10:00:00",
					endTime: "2026-04-01T10:30:00",
				},
			];

			const booking = service.createBooking(sampleBookingInput(), existing);
			expect(booking.status).toBe("requested");
		});

		it("prevents double-booking at the repository level", () => {
			service.createBooking(sampleBookingInput(), []);

			// Second booking for same staff at same time should fail
			expect(() =>
				service.createBooking(sampleBookingInput(), [])
			).toThrow(); // DoubleBookingError from repository
		});

		it("allows adjacent bookings (end == start)", () => {
			service.createBooking(sampleBookingInput(), []);

			// Adjacent booking (starts when first ends)
			const adjacent = service.createBooking(
				sampleBookingInput({
					startTime: "2026-04-01T10:30:00",
					endTime: "2026-04-01T11:00:00",
				}),
				[]
			);
			expect(adjacent.status).toBe("requested");
		});
	});

	// -----------------------------------------------------------------------
	// Status transitions
	// -----------------------------------------------------------------------

	describe("confirmBooking", () => {
		it("transitions from requested to confirmed", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			const confirmed = service.confirmBooking(TENANT_A, booking.id);
			expect(confirmed.status).toBe("confirmed");
			expect(confirmed.confirmedAt).not.toBeNull();
		});
	});

	describe("checkInBooking", () => {
		it("transitions from confirmed to checked-in", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);
			const checkedIn = service.checkInBooking(TENANT_A, booking.id);
			expect(checkedIn.status).toBe("checked-in");
			expect(checkedIn.checkedInAt).not.toBeNull();
		});

		it("rejects check-in from requested status", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			expect(() => service.checkInBooking(TENANT_A, booking.id)).toThrow(
				BookingTransitionError
			);
		});
	});

	describe("completeBooking", () => {
		it("transitions from checked-in to completed", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);
			service.checkInBooking(TENANT_A, booking.id);
			const completed = service.completeBooking(TENANT_A, booking.id);
			expect(completed.status).toBe("completed");
			expect(completed.completedAt).not.toBeNull();
		});

		it("rejects completion from confirmed status", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);
			expect(() => service.completeBooking(TENANT_A, booking.id)).toThrow(
				BookingTransitionError
			);
		});
	});

	describe("noShowBooking", () => {
		it("transitions from confirmed to no-show", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);
			const noShow = service.noShowBooking(TENANT_A, booking.id);
			expect(noShow.status).toBe("no-show");
			expect(noShow.noShowAt).not.toBeNull();
		});

		it("transitions from checked-in to no-show", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);
			service.checkInBooking(TENANT_A, booking.id);
			const noShow = service.noShowBooking(TENANT_A, booking.id);
			expect(noShow.status).toBe("no-show");
		});

		it("rejects no-show from requested status", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			expect(() => service.noShowBooking(TENANT_A, booking.id)).toThrow(
				BookingTransitionError
			);
		});
	});

	describe("cancelBooking", () => {
		it("cancels a requested booking with free window", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			const now = new Date("2026-03-30T10:00:00"); // 2 days before
			const cancelled = service.cancelBooking(
				TENANT_A,
				booking.id,
				"Changed plans",
				undefined,
				now
			);
			expect(cancelled.status).toBe("cancelled");
			expect(cancelled.cancelledAt).not.toBeNull();
			expect(cancelled.cancellationReason).toBe("Changed plans");
		});

		it("cancels a confirmed booking with free window", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);
			const now = new Date("2026-03-30T10:00:00"); // 2 days before
			const cancelled = service.cancelBooking(
				TENANT_A,
				booking.id,
				"Emergency",
				undefined,
				now
			);
			expect(cancelled.status).toBe("cancelled");
		});

		it("allows late cancellation by default policy", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			// 12 hours before (within 24-hour window but late cancel allowed by default)
			const now = new Date("2026-03-31T22:00:00");
			const cancelled = service.cancelBooking(
				TENANT_A,
				booking.id,
				"Late cancel",
				undefined,
				now
			);
			expect(cancelled.status).toBe("cancelled");
		});

		it("rejects cancellation when booking already started and policy disallows", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			// After start time
			const now = new Date("2026-04-01T10:15:00");
			expect(() =>
				service.cancelBooking(
					TENANT_A,
					booking.id,
					"Too late",
					undefined,
					now
				)
			).toThrow(BookingTransitionError);
		});

		it("rejects cancellation from completed status", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);
			service.checkInBooking(TENANT_A, booking.id);
			service.completeBooking(TENANT_A, booking.id);
			expect(() =>
				service.cancelBooking(TENANT_A, booking.id)
			).toThrow(BookingTransitionError);
		});

		it("rejects late cancel when policy disallows", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			const now = new Date("2026-03-31T22:00:00"); // 12 hours before
			const strictPolicy = {
				freeWindowHours: 24,
				allowLateCancellation: false,
				lateCancellationPenalty: null,
			};
			expect(() =>
				service.cancelBooking(
					TENANT_A,
					booking.id,
					"Late cancel",
					strictPolicy,
					now
				)
			).toThrow(BookingTransitionError);
		});
	});

	describe("adminCancelBooking", () => {
		it("cancels without window checks", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			const cancelled = service.adminCancelBooking(
				TENANT_A,
				booking.id,
				"Admin override"
			);
			expect(cancelled.status).toBe("cancelled");
			expect(cancelled.cancellationReason).toBe("Admin override");
		});
	});

	// -----------------------------------------------------------------------
	// Terminal state enforcement
	// -----------------------------------------------------------------------

	describe("terminal states", () => {
		it("rejects transitions from completed", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);
			service.checkInBooking(TENANT_A, booking.id);
			service.completeBooking(TENANT_A, booking.id);

			expect(() =>
				service.transitionBookingStatus(TENANT_A, booking.id, "confirmed")
			).toThrow(BookingTransitionError);
		});

		it("rejects transitions from cancelled", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.adminCancelBooking(TENANT_A, booking.id);

			expect(() =>
				service.transitionBookingStatus(TENANT_A, booking.id, "confirmed")
			).toThrow(BookingTransitionError);
		});

		it("rejects transitions from no-show", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);
			service.noShowBooking(TENANT_A, booking.id);

			expect(() =>
				service.transitionBookingStatus(TENANT_A, booking.id, "confirmed")
			).toThrow(BookingTransitionError);
		});
	});

	// -----------------------------------------------------------------------
	// Not found errors
	// -----------------------------------------------------------------------

	describe("not found", () => {
		it("throws when booking not found for transition", () => {
			expect(() =>
				service.transitionBookingStatus(TENANT_A, "bogus", "confirmed")
			).toThrow(BookingNotFoundError);
		});

		it("throws when booking not found for admin detail", () => {
			expect(() => service.getAdminBookingDetail(TENANT_A, "bogus")).toThrow(
				BookingNotFoundError
			);
		});

		it("throws when booking not found for customer detail", () => {
			expect(() =>
				service.getCustomerBookingDetail(TENANT_A, "bogus", "cust-1")
			).toThrow(BookingNotFoundError);
		});
	});

	// -----------------------------------------------------------------------
	// Tenant isolation
	// -----------------------------------------------------------------------

	describe("tenant isolation", () => {
		it("cannot access booking from different tenant", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			expect(() =>
				service.getAdminBookingDetail(TENANT_B, booking.id)
			).toThrow(BookingNotFoundError);
		});

		it("cannot transition booking from different tenant", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			expect(() =>
				service.confirmBooking(TENANT_B, booking.id)
			).toThrow(BookingNotFoundError);
		});
	});

	// -----------------------------------------------------------------------
	// Admin queries
	// -----------------------------------------------------------------------

	describe("listAdminBookings", () => {
		it("returns paginated booking list", () => {
			service.createBooking(sampleBookingInput(), []);
			service.createBooking(
				sampleBookingInput({
					startTime: "2026-04-01T11:00:00",
					endTime: "2026-04-01T11:30:00",
				}),
				[]
			);

			const result = service.listAdminBookings({ tenantId: TENANT_A });
			expect(result.bookings).toHaveLength(2);
			expect(result.total).toBe(2);
			expect(result.page).toBe(1);
		});

		it("filters by status", () => {
			const b1 = service.createBooking(sampleBookingInput(), []);
			service.createBooking(
				sampleBookingInput({
					startTime: "2026-04-01T11:00:00",
					endTime: "2026-04-01T11:30:00",
				}),
				[]
			);
			service.confirmBooking(TENANT_A, b1.id);

			const confirmed = service.listAdminBookings({
				tenantId: TENANT_A,
				status: "confirmed",
			});
			expect(confirmed.bookings).toHaveLength(1);
			expect(confirmed.bookings[0].status).toBe("confirmed");
		});

		it("filters by staffId", () => {
			service.createBooking(sampleBookingInput(), []);
			service.createBooking(
				sampleBookingInput({
					staffId: "staff-2",
					staffName: "Bob",
					startTime: "2026-04-01T11:00:00",
					endTime: "2026-04-01T11:30:00",
				}),
				[]
			);

			const result = service.listAdminBookings({
				tenantId: TENANT_A,
				staffId: "staff-2",
			});
			expect(result.bookings).toHaveLength(1);
			expect(result.bookings[0].staffName).toBe("Bob");
		});

		it("supports pagination", () => {
			for (let i = 0; i < 5; i++) {
				service.createBooking(
					sampleBookingInput({
						startTime: `2026-04-01T${10 + i}:00:00`,
						endTime: `2026-04-01T${10 + i}:30:00`,
					}),
					[]
				);
			}

			const page1 = service.listAdminBookings({
				tenantId: TENANT_A,
				page: 1,
				pageSize: 2,
			});
			expect(page1.bookings).toHaveLength(2);
			expect(page1.total).toBe(5);

			const page3 = service.listAdminBookings({
				tenantId: TENANT_A,
				page: 3,
				pageSize: 2,
			});
			expect(page3.bookings).toHaveLength(1);
		});
	});

	describe("getBookingPipelineCounts", () => {
		it("returns counts for all statuses", () => {
			service.createBooking(sampleBookingInput(), []);
			const b2 = service.createBooking(
				sampleBookingInput({
					startTime: "2026-04-01T11:00:00",
					endTime: "2026-04-01T11:30:00",
				}),
				[]
			);
			service.confirmBooking(TENANT_A, b2.id);

			const pipeline = service.getBookingPipelineCounts(TENANT_A);
			expect(pipeline.total).toBe(2);

			const requestedCount = pipeline.counts.find((c) => c.status === "requested");
			expect(requestedCount?.count).toBe(1);

			const confirmedCount = pipeline.counts.find((c) => c.status === "confirmed");
			expect(confirmedCount?.count).toBe(1);
		});
	});

	// -----------------------------------------------------------------------
	// Admin booking detail
	// -----------------------------------------------------------------------

	describe("getAdminBookingDetail", () => {
		it("returns full booking detail with allowed transitions", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			const detail = service.getAdminBookingDetail(TENANT_A, booking.id);

			expect(detail.id).toBe(booking.id);
			expect(detail.status).toBe("requested");
			expect(detail.allowedTransitions).toContain("confirmed");
			expect(detail.allowedTransitions).toContain("cancelled");
			expect(detail.serviceName).toBe("Haircut");
		});
	});

	// -----------------------------------------------------------------------
	// Customer queries
	// -----------------------------------------------------------------------

	describe("listCustomerBookings", () => {
		it("returns bookings for a specific customer", () => {
			service.createBooking(sampleBookingInput(), []);
			service.createBooking(
				sampleBookingInput({
					customerId: "cust-2",
					customerName: "Bob",
					startTime: "2026-04-01T11:00:00",
					endTime: "2026-04-01T11:30:00",
				}),
				[]
			);

			const bookings = service.listCustomerBookings(TENANT_A, "cust-1");
			expect(bookings).toHaveLength(1);
			expect(bookings[0].serviceName).toBe("Haircut");
		});
	});

	describe("getCustomerBookingDetail", () => {
		it("returns customer booking detail", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			const detail = service.getCustomerBookingDetail(
				TENANT_A,
				booking.id,
				"cust-1"
			);
			expect(detail.serviceName).toBe("Haircut");
			expect(detail.staffName).toBe("Alice");
		});

		it("prevents customer from viewing another customer's booking", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			expect(() =>
				service.getCustomerBookingDetail(TENANT_A, booking.id, "cust-other")
			).toThrow(BookingNotFoundError);
		});
	});

	// -----------------------------------------------------------------------
	// Booking tracking
	// -----------------------------------------------------------------------

	describe("getBookingTrackingData", () => {
		it("returns tracking data with progress steps", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			const tracking = service.getBookingTrackingData(
				TENANT_A,
				booking.id,
				"cust-1"
			);

			expect(tracking.bookingId).toBe(booking.id);
			expect(tracking.status).toBe("requested");
			expect(tracking.isCancelled).toBe(false);
			expect(tracking.isNoShow).toBe(false);
			expect(tracking.steps).toHaveLength(4);
			expect(tracking.steps[0].step).toBe("requested");
			expect(tracking.steps[0].state).toBe("current");
		});

		it("shows completed steps for confirmed booking", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.confirmBooking(TENANT_A, booking.id);

			const tracking = service.getBookingTrackingData(
				TENANT_A,
				booking.id,
				"cust-1"
			);

			expect(tracking.steps[0].state).toBe("completed"); // requested
			expect(tracking.steps[1].state).toBe("current"); // confirmed
			expect(tracking.steps[2].state).toBe("upcoming"); // checked-in
		});

		it("shows cancelled tracking steps", () => {
			const booking = service.createBooking(sampleBookingInput(), []);
			service.adminCancelBooking(TENANT_A, booking.id);

			const tracking = service.getBookingTrackingData(
				TENANT_A,
				booking.id,
				"cust-1"
			);

			expect(tracking.isCancelled).toBe(true);
			expect(tracking.steps[0].state).toBe("completed"); // requested had timestamp
			expect(tracking.steps[1].state).toBe("skipped"); // confirmed
		});
	});

	// -----------------------------------------------------------------------
	// Calendar view
	// -----------------------------------------------------------------------

	describe("getCalendarView", () => {
		it("returns bookings grouped by date", () => {
			service.createBooking(sampleBookingInput(), []);
			service.createBooking(
				sampleBookingInput({
					startTime: "2026-04-02T10:00:00",
					endTime: "2026-04-02T10:30:00",
				}),
				[]
			);

			const calendar = service.getCalendarView({
				tenantId: TENANT_A,
				startDate: "2026-04-01",
				endDate: "2026-04-03",
			});

			expect(calendar.days).toHaveLength(3);
			expect(calendar.days[0].date).toBe("2026-04-01");
			expect(calendar.days[0].blocks).toHaveLength(1);
			expect(calendar.days[1].date).toBe("2026-04-02");
			expect(calendar.days[1].blocks).toHaveLength(1);
			expect(calendar.days[2].date).toBe("2026-04-03");
			expect(calendar.days[2].blocks).toHaveLength(0);
		});

		it("filters by staff", () => {
			service.createBooking(sampleBookingInput(), []);
			service.createBooking(
				sampleBookingInput({
					staffId: "staff-2",
					staffName: "Bob",
					startTime: "2026-04-01T11:00:00",
					endTime: "2026-04-01T11:30:00",
				}),
				[]
			);

			const calendar = service.getCalendarView({
				tenantId: TENANT_A,
				startDate: "2026-04-01",
				endDate: "2026-04-01",
				staffId: "staff-2",
			});

			expect(calendar.days[0].blocks).toHaveLength(1);
			expect(calendar.days[0].blocks[0].staffName).toBe("Bob");
		});

		it("filters by service", () => {
			service.createBooking(sampleBookingInput(), []);
			service.createBooking(
				sampleBookingInput({
					serviceId: "svc-2",
					serviceName: "Coloring",
					startTime: "2026-04-01T11:00:00",
					endTime: "2026-04-01T11:30:00",
				}),
				[]
			);

			const calendar = service.getCalendarView({
				tenantId: TENANT_A,
				startDate: "2026-04-01",
				endDate: "2026-04-01",
				serviceId: "svc-2",
			});

			expect(calendar.days[0].blocks).toHaveLength(1);
			expect(calendar.days[0].blocks[0].serviceName).toBe("Coloring");
		});
	});
});
