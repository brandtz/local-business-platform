import { describe, it, expect } from "vitest";
import {
	getCardBrandIcon,
	formatExpiryDate,
} from "./account-payments-page";

describe("account-payments-page helpers", () => {
	describe("getCardBrandIcon", () => {
		it("returns card emoji for visa", () => {
			expect(getCardBrandIcon("visa")).toBe("💳");
		});

		it("returns card emoji for mastercard", () => {
			expect(getCardBrandIcon("mastercard")).toBe("💳");
		});

		it("returns card emoji for amex", () => {
			expect(getCardBrandIcon("amex")).toBe("💳");
		});

		it("returns card emoji for discover", () => {
			expect(getCardBrandIcon("discover")).toBe("💳");
		});

		it("is case insensitive", () => {
			expect(getCardBrandIcon("VISA")).toBe("💳");
			expect(getCardBrandIcon("Mastercard")).toBe("💳");
		});

		it("returns default emoji for unknown brand", () => {
			expect(getCardBrandIcon("unknown")).toBe("💳");
		});
	});

	describe("formatExpiryDate", () => {
		it("formats single-digit month with leading zero", () => {
			expect(formatExpiryDate(3, 2025)).toBe("03/25");
		});

		it("formats double-digit month", () => {
			expect(formatExpiryDate(12, 2026)).toBe("12/26");
		});

		it("formats month 1 correctly", () => {
			expect(formatExpiryDate(1, 2024)).toBe("01/24");
		});

		it("uses last two digits of year", () => {
			expect(formatExpiryDate(6, 2030)).toBe("06/30");
		});

		it("handles four-digit year", () => {
			expect(formatExpiryDate(9, 2099)).toBe("09/99");
		});
	});
});
