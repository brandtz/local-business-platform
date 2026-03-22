import { describe, it, expect } from "vitest";

import {
	assertValidCreateBookingRequest,
	assertValidCalendarViewQuery,
	assertValidAdminBookingDetailResponse,
	assertValidAdminBookingListResponse,
	assertValidCustomerBookingDetailResponse,
	assertValidCalendarViewResponse,
	assertValidBookingTrackingResponse,
	parseAdminBookingListQuery,
	BookingApiContractError,
} from "./booking-api-contracts";

describe("booking API contracts", () => {
	// -----------------------------------------------------------------------
	// Create booking request validation
	// -----------------------------------------------------------------------

	describe("assertValidCreateBookingRequest", () => {
		const validRequest = {
			tenantId: "tenant-1",
			locationId: "loc-1",
			customerId: null,
			customerName: "Jane",
			customerEmail: "jane@example.com",
			customerPhone: "555-1234",
			serviceId: "svc-1",
			serviceName: "Haircut",
			staffId: "staff-1",
			staffName: "Alice",
			startTime: "2026-04-01T10:00:00",
			endTime: "2026-04-01T10:30:00",
			durationMinutes: 30,
			notes: null,
		};

		it("accepts valid create booking request", () => {
			expect(() => assertValidCreateBookingRequest(validRequest)).not.toThrow();
		});

		it("rejects non-object", () => {
			expect(() => assertValidCreateBookingRequest("not-an-object")).toThrow(
				BookingApiContractError
			);
		});

		it("rejects missing tenantId", () => {
			expect(() =>
				assertValidCreateBookingRequest({ ...validRequest, tenantId: "" })
			).toThrow(BookingApiContractError);
		});

		it("rejects missing serviceId", () => {
			expect(() =>
				assertValidCreateBookingRequest({ ...validRequest, serviceId: "" })
			).toThrow(BookingApiContractError);
		});

		it("rejects missing staffId", () => {
			expect(() =>
				assertValidCreateBookingRequest({ ...validRequest, staffId: "" })
			).toThrow(BookingApiContractError);
		});

		it("rejects zero durationMinutes", () => {
			expect(() =>
				assertValidCreateBookingRequest({
					...validRequest,
					durationMinutes: 0,
				})
			).toThrow(BookingApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Admin list query parsing
	// -----------------------------------------------------------------------

	describe("parseAdminBookingListQuery", () => {
		it("parses minimal query", () => {
			const query = parseAdminBookingListQuery({ tenantId: "tenant-1" });
			expect(query.tenantId).toBe("tenant-1");
		});

		it("parses with all filters", () => {
			const query = parseAdminBookingListQuery({
				tenantId: "tenant-1",
				status: "confirmed",
				staffId: "staff-1",
				serviceId: "svc-1",
				dateFrom: "2026-04-01",
				dateTo: "2026-04-30",
				search: "Jane",
				page: "2",
				pageSize: "10",
			});
			expect(query.status).toBe("confirmed");
			expect(query.staffId).toBe("staff-1");
			expect(query.page).toBe(2);
			expect(query.pageSize).toBe(10);
		});

		it("rejects invalid status", () => {
			expect(() =>
				parseAdminBookingListQuery({
					tenantId: "tenant-1",
					status: "invalid-status",
				})
			).toThrow(BookingApiContractError);
		});

		it("rejects invalid dateFrom format", () => {
			expect(() =>
				parseAdminBookingListQuery({
					tenantId: "tenant-1",
					dateFrom: "not-a-date",
				})
			).toThrow(BookingApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Calendar view query validation
	// -----------------------------------------------------------------------

	describe("assertValidCalendarViewQuery", () => {
		it("accepts valid calendar view query", () => {
			expect(() =>
				assertValidCalendarViewQuery({
					tenantId: "tenant-1",
					startDate: "2026-04-01",
					endDate: "2026-04-07",
				})
			).not.toThrow();
		});

		it("rejects missing tenantId", () => {
			expect(() =>
				assertValidCalendarViewQuery({
					tenantId: "",
					startDate: "2026-04-01",
					endDate: "2026-04-07",
				})
			).toThrow(BookingApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Response validators
	// -----------------------------------------------------------------------

	describe("assertValidAdminBookingDetailResponse", () => {
		it("accepts valid response", () => {
			expect(() =>
				assertValidAdminBookingDetailResponse({
					id: "b-1",
					status: "confirmed",
					allowedTransitions: ["checked-in", "cancelled"],
					createdAt: "2026-04-01",
					updatedAt: "2026-04-01",
					customerName: "Jane",
					customerEmail: null,
					customerPhone: null,
					serviceId: "svc-1",
					serviceName: "Haircut",
					staffId: "staff-1",
					staffName: "Alice",
					locationId: "loc-1",
					startTime: "2026-04-01T10:00:00",
					endTime: "2026-04-01T10:30:00",
					durationMinutes: 30,
					notes: null,
					cancellationReason: null,
					requestedAt: null,
					confirmedAt: null,
					checkedInAt: null,
					completedAt: null,
					cancelledAt: null,
					noShowAt: null,
				})
			).not.toThrow();
		});

		it("rejects missing allowedTransitions", () => {
			expect(() =>
				assertValidAdminBookingDetailResponse({
					id: "b-1",
					status: "confirmed",
				})
			).toThrow(BookingApiContractError);
		});
	});

	describe("assertValidAdminBookingListResponse", () => {
		it("accepts valid list response", () => {
			expect(() =>
				assertValidAdminBookingListResponse({
					bookings: [],
					total: 0,
					page: 1,
					pageSize: 20,
				})
			).not.toThrow();
		});

		it("rejects missing bookings array", () => {
			expect(() =>
				assertValidAdminBookingListResponse({ total: 0 })
			).toThrow(BookingApiContractError);
		});
	});

	describe("assertValidCustomerBookingDetailResponse", () => {
		it("accepts valid response", () => {
			expect(() =>
				assertValidCustomerBookingDetailResponse({
					id: "b-1",
					status: "requested",
					createdAt: "2026-04-01",
					serviceName: "Haircut",
					staffName: "Alice",
					startTime: "2026-04-01T10:00:00",
					endTime: "2026-04-01T10:30:00",
					durationMinutes: 30,
					notes: null,
					cancelledAt: null,
				})
			).not.toThrow();
		});
	});

	describe("assertValidCalendarViewResponse", () => {
		it("accepts valid response", () => {
			expect(() =>
				assertValidCalendarViewResponse({ days: [], query: {} })
			).not.toThrow();
		});

		it("rejects missing days", () => {
			expect(() =>
				assertValidCalendarViewResponse({ query: {} })
			).toThrow(BookingApiContractError);
		});
	});

	describe("assertValidBookingTrackingResponse", () => {
		it("accepts valid tracking response", () => {
			expect(() =>
				assertValidBookingTrackingResponse({
					bookingId: "b-1",
					steps: [],
					status: "requested",
					isCancelled: false,
					isNoShow: false,
					currentStepIndex: 0,
					serviceName: "Haircut",
					staffName: "Alice",
					startTime: "2026-04-01T10:00:00",
					endTime: "2026-04-01T10:30:00",
					durationMinutes: 30,
				})
			).not.toThrow();
		});

		it("rejects missing bookingId", () => {
			expect(() =>
				assertValidBookingTrackingResponse({ steps: [] })
			).toThrow(BookingApiContractError);
		});
	});
});
