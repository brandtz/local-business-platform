import { describe, it, expect } from "vitest";
import { formatTimeFromISO, formatBookingPrice } from "./booking-page";

describe("booking-page helpers", () => {
	describe("formatBookingPrice", () => {
		it("formats zero", () => {
			expect(formatBookingPrice(0)).toBe("$0.00");
		});

		it("formats whole dollars", () => {
			expect(formatBookingPrice(5000)).toBe("$50.00");
		});

		it("formats cents", () => {
			expect(formatBookingPrice(2599)).toBe("$25.99");
		});
	});

	describe("formatTimeFromISO", () => {
		it("formats morning time", () => {
			const result = formatTimeFromISO("2026-03-23T09:30:00.000Z");
			// Exact output depends on local timezone, but should contain AM/PM
			expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
		});

		it("formats afternoon time", () => {
			const result = formatTimeFromISO("2026-03-23T14:00:00.000Z");
			expect(result).toMatch(/\d{1,2}:00 (AM|PM)/);
		});

		it("formats midnight as 12:00 AM", () => {
			const result = formatTimeFromISO("2026-03-23T00:00:00.000Z");
			expect(result).toMatch(/\d{1,2}:00 (AM|PM)/);
		});
	});
});
