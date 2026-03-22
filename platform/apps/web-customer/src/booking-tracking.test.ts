import { describe, it, expect } from "vitest";
import type { BookingTrackingData } from "@platform/types";
import {
	buildBookingTrackingViewModel,
	formatBookingDateTime,
} from "./booking-tracking";

const NOW = new Date("2026-04-01T12:00:00Z").getTime();

function sampleTrackingData(overrides?: Partial<BookingTrackingData>): BookingTrackingData {
	return {
		bookingId: "booking-1",
		status: "requested",
		isCancelled: false,
		isNoShow: false,
		steps: [
			{ step: "requested", label: "Requested", state: "current", timestamp: "2026-04-01T08:00:00Z" },
			{ step: "confirmed", label: "Confirmed", state: "upcoming", timestamp: null },
			{ step: "checked-in", label: "Checked In", state: "upcoming", timestamp: null },
			{ step: "completed", label: "Completed", state: "upcoming", timestamp: null },
		],
		currentStepIndex: 0,
		serviceName: "Haircut",
		staffName: "Alice",
		startTime: "2026-04-01T10:00:00",
		endTime: "2026-04-01T10:30:00",
		durationMinutes: 30,
		...overrides,
	};
}

describe("booking tracking (web-customer)", () => {
	describe("buildBookingTrackingViewModel", () => {
		it("builds tracking view model for requested booking", () => {
			const vm = buildBookingTrackingViewModel(sampleTrackingData(), NOW);
			expect(vm.bookingId).toBe("booking-1");
			expect(vm.isCancelled).toBe(false);
			expect(vm.isNoShow).toBe(false);
			expect(vm.progressBar).toHaveLength(4);
			expect(vm.progressPercent).toBe(25); // 1 of 4 steps current
			expect(vm.statusMessage).toBe(
				"Your booking has been requested and is waiting to be confirmed."
			);
		});

		it("shows service info in view model", () => {
			const vm = buildBookingTrackingViewModel(sampleTrackingData(), NOW);
			expect(vm.serviceInfo.serviceName).toBe("Haircut");
			expect(vm.serviceInfo.staffName).toBe("Alice");
			expect(vm.serviceInfo.durationLabel).toBe("30 min");
		});

		it("shows cancelled status message", () => {
			const vm = buildBookingTrackingViewModel(
				sampleTrackingData({
					status: "cancelled",
					isCancelled: true,
					steps: [
						{ step: "requested", label: "Requested", state: "completed", timestamp: "2026-04-01T08:00:00Z" },
						{ step: "confirmed", label: "Confirmed", state: "skipped", timestamp: null },
						{ step: "checked-in", label: "Checked In", state: "skipped", timestamp: null },
						{ step: "completed", label: "Completed", state: "skipped", timestamp: null },
					],
				}),
				NOW
			);
			expect(vm.isCancelled).toBe(true);
			expect(vm.statusMessage).toBe("Your booking has been cancelled.");
		});

		it("shows no-show status message", () => {
			const vm = buildBookingTrackingViewModel(
				sampleTrackingData({
					status: "no-show",
					isNoShow: true,
				}),
				NOW
			);
			expect(vm.isNoShow).toBe(true);
			expect(vm.statusMessage).toBe("This booking was marked as a no-show.");
		});

		it("shows confirmed status progress", () => {
			const vm = buildBookingTrackingViewModel(
				sampleTrackingData({
					status: "confirmed",
					steps: [
						{ step: "requested", label: "Requested", state: "completed", timestamp: "2026-04-01T08:00:00Z" },
						{ step: "confirmed", label: "Confirmed", state: "current", timestamp: "2026-04-01T09:00:00Z" },
						{ step: "checked-in", label: "Checked In", state: "upcoming", timestamp: null },
						{ step: "completed", label: "Completed", state: "upcoming", timestamp: null },
					],
				}),
				NOW
			);
			expect(vm.progressPercent).toBe(50); // 2 of 4 completed/current
			expect(vm.statusMessage).toBe(
				"Your booking has been confirmed. See you soon!"
			);
		});

		it("shows completed booking at 100%", () => {
			const vm = buildBookingTrackingViewModel(
				sampleTrackingData({
					status: "completed",
					steps: [
						{ step: "requested", label: "Requested", state: "completed", timestamp: "2026-04-01T08:00:00Z" },
						{ step: "confirmed", label: "Confirmed", state: "completed", timestamp: "2026-04-01T09:00:00Z" },
						{ step: "checked-in", label: "Checked In", state: "completed", timestamp: "2026-04-01T10:00:00Z" },
						{ step: "completed", label: "Completed", state: "current", timestamp: "2026-04-01T10:30:00Z" },
					],
				}),
				NOW
			);
			expect(vm.progressPercent).toBe(100);
		});
	});

	describe("formatBookingDateTime", () => {
		it("formats ISO timestamp to MM/DD/YYYY h:mm AM/PM", () => {
			expect(formatBookingDateTime("2026-04-01T14:30:00")).toBe(
				"04/01/2026 2:30 PM"
			);
		});

		it("formats morning time", () => {
			expect(formatBookingDateTime("2026-04-01T09:00:00")).toBe(
				"04/01/2026 9:00 AM"
			);
		});

		it("returns input when no T separator", () => {
			expect(formatBookingDateTime("not-a-timestamp")).toBe("not-a-timestamp");
		});
	});
});
