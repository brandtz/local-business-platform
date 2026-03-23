import { describe, it, expect } from "vitest";
import {
	formatTierName,
	calculateTierProgress,
} from "./account-loyalty-page";

describe("account-loyalty-page helpers", () => {
	describe("formatTierName", () => {
		it("capitalizes first letter of lowercase tier", () => {
			expect(formatTierName("bronze")).toBe("Bronze");
		});

		it("capitalizes first letter and lowercases rest", () => {
			expect(formatTierName("GOLD")).toBe("Gold");
		});

		it("handles mixed case", () => {
			expect(formatTierName("pLaTiNuM")).toBe("Platinum");
		});

		it("handles empty string", () => {
			expect(formatTierName("")).toBe("");
		});

		it("handles single character", () => {
			expect(formatTierName("a")).toBe("A");
		});
	});

	describe("calculateTierProgress", () => {
		it("returns 0 when current is 0", () => {
			expect(calculateTierProgress(0, 500)).toBe(0);
		});

		it("returns 50 when halfway", () => {
			expect(calculateTierProgress(250, 500)).toBe(50);
		});

		it("returns 100 when at threshold", () => {
			expect(calculateTierProgress(500, 500)).toBe(100);
		});

		it("caps at 100 when over threshold", () => {
			expect(calculateTierProgress(600, 500)).toBe(100);
		});

		it("returns 100 when threshold is 0", () => {
			expect(calculateTierProgress(100, 0)).toBe(100);
		});

		it("returns 100 when threshold is negative", () => {
			expect(calculateTierProgress(100, -50)).toBe(100);
		});

		it("handles 0/0 case", () => {
			expect(calculateTierProgress(0, 0)).toBe(100);
		});

		it("rounds to nearest integer", () => {
			expect(calculateTierProgress(333, 1000)).toBe(33);
		});
	});
});
