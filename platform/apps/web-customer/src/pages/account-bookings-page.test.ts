import { describe, it, expect } from "vitest";
import {
	formatBookingDate,
	formatBookingTime,
	isUpcomingBooking,
	getBookingStatusLabel,
	isTerminalBookingStatus,
} from "./account-bookings-page";

describe("account-bookings-page helpers", () => {
	describe("formatBookingDate", () => {
		it("formats a valid ISO date string with weekday", () => {
			const result = formatBookingDate("2024-03-15T14:00:00Z");
			expect(result).toContain("2024");
			expect(result).toContain("Mar");
			expect(result).toContain("15");
		});

		it("returns original string for invalid date", () => {
			expect(formatBookingDate("not-a-date")).toBe("not-a-date");
		});

		it("handles empty string gracefully", () => {
			expect(formatBookingDate("")).toBe("");
		});
	});

	describe("formatBookingTime", () => {
		it("formats a valid time string", () => {
			const result = formatBookingTime("2024-03-15T14:00:00Z");
			// Should contain hour and AM/PM
			expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
		});

		it("returns original string for invalid date", () => {
			expect(formatBookingTime("not-a-date")).toBe("not-a-date");
		});
	});

	describe("isUpcomingBooking", () => {
		it("returns true for future date", () => {
			const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
			expect(isUpcomingBooking(futureDate)).toBe(true);
		});

		it("returns false for past date", () => {
			const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
			expect(isUpcomingBooking(pastDate)).toBe(false);
		});
	});

	describe("getBookingStatusLabel", () => {
		it("returns 'Requested' for 'requested'", () => {
			expect(getBookingStatusLabel("requested")).toBe("Requested");
		});

		it("returns 'Confirmed' for 'confirmed'", () => {
			expect(getBookingStatusLabel("confirmed")).toBe("Confirmed");
		});

		it("returns 'Checked In' for 'checked-in'", () => {
			expect(getBookingStatusLabel("checked-in")).toBe("Checked In");
		});

		it("returns 'Completed' for 'completed'", () => {
			expect(getBookingStatusLabel("completed")).toBe("Completed");
		});

		it("returns 'Cancelled' for 'cancelled'", () => {
			expect(getBookingStatusLabel("cancelled")).toBe("Cancelled");
		});

		it("returns 'No Show' for 'no-show'", () => {
			expect(getBookingStatusLabel("no-show")).toBe("No Show");
		});

		it("capitalizes first letter of unknown status", () => {
			expect(getBookingStatusLabel("custom")).toBe("Custom");
		});
	});

	describe("isTerminalBookingStatus", () => {
		it("returns true for completed", () => {
			expect(isTerminalBookingStatus("completed")).toBe(true);
		});

		it("returns true for cancelled", () => {
			expect(isTerminalBookingStatus("cancelled")).toBe(true);
		});

		it("returns true for no-show", () => {
			expect(isTerminalBookingStatus("no-show")).toBe(true);
		});

		it("returns false for confirmed", () => {
			expect(isTerminalBookingStatus("confirmed")).toBe(false);
		});

		it("returns false for requested", () => {
			expect(isTerminalBookingStatus("requested")).toBe(false);
		});
	});
});
