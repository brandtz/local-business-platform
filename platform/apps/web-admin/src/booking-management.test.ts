import { describe, it, expect } from "vitest";
import type {
	AdminBookingSummary,
	AdminBookingDetail,
	BookingPipelineCounts,
	CalendarViewResponse,
} from "@platform/types";
import {
	getBookingStatusBadge,
	buildBookingPipelineView,
	buildBookingListRow,
	buildBookingDetailViewModel,
	buildCalendarViewModel,
	getAvailableExceptionActions,
	formatBookingDateTime,
	formatBookingTime,
} from "./booking-management";

const NOW = new Date("2026-04-01T12:00:00Z").getTime();

function sampleAdminSummary(overrides?: Partial<AdminBookingSummary>): AdminBookingSummary {
	return {
		id: "booking-1",
		createdAt: "2026-04-01T08:00:00Z",
		status: "requested",
		customerName: "Jane Doe",
		serviceName: "Haircut",
		staffName: "Alice",
		startTime: "2026-04-01T10:00:00",
		endTime: "2026-04-01T10:30:00",
		durationMinutes: 30,
		...overrides,
	};
}

function sampleAdminDetail(overrides?: Partial<AdminBookingDetail>): AdminBookingDetail {
	return {
		id: "booking-1",
		createdAt: "2026-04-01T08:00:00Z",
		updatedAt: "2026-04-01T08:00:00Z",
		status: "requested",
		customerName: "Jane Doe",
		customerEmail: "jane@example.com",
		customerPhone: "555-1234",
		serviceId: "svc-1",
		serviceName: "Haircut",
		staffId: "staff-1",
		staffName: "Alice",
		locationId: "loc-1",
		startTime: "2026-04-01T10:00:00",
		endTime: "2026-04-01T10:30:00",
		durationMinutes: 30,
		notes: "First visit",
		cancellationReason: null,
		requestedAt: "2026-04-01T08:00:00Z",
		confirmedAt: null,
		checkedInAt: null,
		completedAt: null,
		cancelledAt: null,
		noShowAt: null,
		allowedTransitions: ["confirmed", "cancelled"],
		...overrides,
	};
}

describe("booking management (web-admin)", () => {
	describe("getBookingStatusBadge", () => {
		it("returns correct badge for requested", () => {
			const badge = getBookingStatusBadge("requested");
			expect(badge.label).toBe("Requested");
			expect(badge.colorClass).toBe("badge-info");
		});

		it("returns correct badge for confirmed", () => {
			const badge = getBookingStatusBadge("confirmed");
			expect(badge.label).toBe("Confirmed");
			expect(badge.colorClass).toBe("badge-primary");
		});

		it("returns correct badge for cancelled", () => {
			const badge = getBookingStatusBadge("cancelled");
			expect(badge.label).toBe("Cancelled");
			expect(badge.colorClass).toBe("badge-danger");
		});

		it("returns correct badge for no-show", () => {
			const badge = getBookingStatusBadge("no-show");
			expect(badge.label).toBe("No-Show");
			expect(badge.colorClass).toBe("badge-danger");
		});
	});

	describe("buildBookingPipelineView", () => {
		it("maps pipeline counts to status entries", () => {
			const pipeline: BookingPipelineCounts = {
				counts: [
					{ status: "requested", count: 5 },
					{ status: "confirmed", count: 3 },
					{ status: "checked-in", count: 1 },
					{ status: "completed", count: 10 },
					{ status: "cancelled", count: 2 },
					{ status: "no-show", count: 1 },
				],
				total: 22,
			};

			const entries = buildBookingPipelineView(pipeline);
			expect(entries).toHaveLength(6);
			expect(entries[0].label).toBe("Requested");
			expect(entries[0].count).toBe(5);
		});
	});

	describe("buildBookingListRow", () => {
		it("maps summary to list row", () => {
			const row = buildBookingListRow(sampleAdminSummary(), NOW);
			expect(row.id).toBe("booking-1");
			expect(row.customerName).toBe("Jane Doe");
			expect(row.serviceName).toBe("Haircut");
			expect(row.staffName).toBe("Alice");
			expect(row.durationLabel).toBe("30 min");
		});

		it("shows Walk-in for null customer", () => {
			const row = buildBookingListRow(
				sampleAdminSummary({ customerName: null }),
				NOW
			);
			expect(row.customerName).toBe("Walk-in");
		});
	});

	describe("buildBookingDetailViewModel", () => {
		it("maps detail to view model", () => {
			const vm = buildBookingDetailViewModel(sampleAdminDetail(), NOW);
			expect(vm.id).toBe("booking-1");
			expect(vm.customerName).toBe("Jane Doe");
			expect(vm.canCancel).toBe(true);
			expect(vm.quickActions.length).toBeGreaterThan(0);
		});

		it("shows no quick actions for completed booking", () => {
			const vm = buildBookingDetailViewModel(
				sampleAdminDetail({
					status: "completed",
					allowedTransitions: [],
				}),
				NOW
			);
			expect(vm.quickActions).toHaveLength(0);
			expect(vm.canCancel).toBe(false);
		});
	});

	describe("buildCalendarViewModel", () => {
		it("maps calendar response to view model", () => {
			const response: CalendarViewResponse = {
				days: [
					{
						date: "2026-04-01",
						blocks: [
							{
								bookingId: "b-1",
								status: "confirmed",
								customerName: "Jane",
								serviceName: "Haircut",
								staffId: "staff-1",
								staffName: "Alice",
								startTime: "2026-04-01T10:00:00",
								endTime: "2026-04-01T10:30:00",
								durationMinutes: 30,
							},
						],
					},
				],
				query: {
					tenantId: "tenant-1",
					startDate: "2026-04-01",
					endDate: "2026-04-01",
				},
			};

			const vm = buildCalendarViewModel(response);
			expect(vm).toHaveLength(1);
			expect(vm[0].blocks).toHaveLength(1);
			expect(vm[0].blocks[0].serviceName).toBe("Haircut");
			expect(vm[0].blocks[0].durationLabel).toBe("30 min");
		});
	});

	describe("getAvailableExceptionActions", () => {
		it("returns no-show and reschedule for confirmed booking", () => {
			const actions = getAvailableExceptionActions(
				sampleAdminDetail({ status: "confirmed", allowedTransitions: ["checked-in", "cancelled", "no-show"] })
			);
			expect(actions).toContain("no-show");
			expect(actions).toContain("late-cancel");
			expect(actions).toContain("reschedule");
		});

		it("returns no-show for checked-in booking", () => {
			const actions = getAvailableExceptionActions(
				sampleAdminDetail({ status: "checked-in", allowedTransitions: ["completed", "no-show"] })
			);
			expect(actions).toContain("no-show");
			expect(actions).not.toContain("reschedule");
		});

		it("returns empty for completed booking", () => {
			const actions = getAvailableExceptionActions(
				sampleAdminDetail({ status: "completed", allowedTransitions: [] })
			);
			expect(actions).toHaveLength(0);
		});
	});

	describe("formatting helpers", () => {
		it("formats booking datetime", () => {
			const result = formatBookingDateTime("2026-04-01T14:30:00");
			expect(result).toBe("04/01/2026 2:30 PM");
		});

		it("formats morning time", () => {
			const result = formatBookingDateTime("2026-04-01T09:00:00");
			expect(result).toBe("04/01/2026 9:00 AM");
		});

		it("formats noon", () => {
			const result = formatBookingDateTime("2026-04-01T12:00:00");
			expect(result).toBe("04/01/2026 12:00 PM");
		});

		it("formats midnight", () => {
			const result = formatBookingTime("2026-04-01T00:00:00");
			expect(result).toBe("12:00 AM");
		});
	});
});
