// Tests for booking detail page workflow logic and view model building

import { describe, expect, it } from "vitest";

import {
	buildBookingDetailViewModel,
	getAvailableExceptionActions,
	formatBookingDateTime,
} from "../booking-management";
import type { AdminBookingDetail, BookingStatus } from "@platform/types";
import { getBookingQuickActions, isBookingCancellable } from "@platform/types";

const NOW = new Date("2026-04-01T12:00:00Z").getTime();

function sampleDetail(overrides?: Partial<AdminBookingDetail>): AdminBookingDetail {
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
		notes: "Prefers organic products",
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

describe("BookingDetailPage helpers", () => {
	describe("booking detail view model", () => {
		it("builds view model from detail", () => {
			const vm = buildBookingDetailViewModel(sampleDetail(), NOW);
			expect(vm.id).toBe("booking-1");
			expect(vm.serviceName).toBe("Haircut");
			expect(vm.customerName).toBe("Jane Doe");
			expect(vm.customerEmail).toBe("jane@example.com");
			expect(vm.staffName).toBe("Alice");
			expect(vm.durationLabel).toBe("30 min");
			expect(vm.notes).toBe("Prefers organic products");
		});

		it("defaults Walk-in for null customer", () => {
			const vm = buildBookingDetailViewModel(sampleDetail({ customerName: null }), NOW);
			expect(vm.customerName).toBe("Walk-in");
		});

		it("includes cancellation reason when present", () => {
			const vm = buildBookingDetailViewModel(
				sampleDetail({
					status: "cancelled",
					cancellationReason: "Customer no-show",
					cancelledAt: "2026-04-01T09:00:00Z",
				}),
				NOW,
			);
			expect(vm.cancellationReason).toBe("Customer no-show");
		});
	});

	describe("workflow buttons — status transitions", () => {
		it("requested → can confirm", () => {
			const actions = getBookingQuickActions("requested");
			expect(actions.some((a) => a.targetStatus === "confirmed")).toBe(true);
		});

		it("confirmed → can check in", () => {
			const actions = getBookingQuickActions("confirmed");
			expect(actions.some((a) => a.targetStatus === "checked-in")).toBe(true);
		});

		it("checked-in → can complete", () => {
			const actions = getBookingQuickActions("checked-in");
			expect(actions.some((a) => a.targetStatus === "completed")).toBe(true);
		});

		it("completed has no forward actions", () => {
			const actions = getBookingQuickActions("completed");
			expect(actions).toHaveLength(0);
		});

		it("cancelled has no forward actions", () => {
			const actions = getBookingQuickActions("cancelled");
			expect(actions).toHaveLength(0);
		});
	});

	describe("cancellation rules", () => {
		it("requested bookings are cancellable", () => {
			expect(isBookingCancellable("requested")).toBe(true);
		});

		it("confirmed bookings are cancellable", () => {
			expect(isBookingCancellable("confirmed")).toBe(true);
		});

		it("checked-in bookings are NOT cancellable", () => {
			expect(isBookingCancellable("checked-in")).toBe(false);
		});

		it("completed bookings are NOT cancellable", () => {
			expect(isBookingCancellable("completed")).toBe(false);
		});
	});

	describe("exception actions", () => {
		it("confirmed booking has no-show, late-cancel, and reschedule options", () => {
			const actions = getAvailableExceptionActions(sampleDetail({ status: "confirmed" }));
			expect(actions).toContain("no-show");
			expect(actions).toContain("late-cancel");
			expect(actions).toContain("reschedule");
		});

		it("checked-in booking has no-show option only", () => {
			const actions = getAvailableExceptionActions(sampleDetail({ status: "checked-in" }));
			expect(actions).toContain("no-show");
			expect(actions).not.toContain("late-cancel");
			expect(actions).not.toContain("reschedule");
		});

		it("completed booking has no exception actions", () => {
			const actions = getAvailableExceptionActions(sampleDetail({ status: "completed" }));
			expect(actions).toHaveLength(0);
		});
	});
});
