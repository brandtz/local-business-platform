import { describe, it, expect } from "vitest";
import {
	formatOrderDate,
	formatCents,
	getOrderStatusLabel,
	getStatusFilterTabs,
} from "./account-orders-page";

describe("account-orders-page helpers", () => {
	describe("formatOrderDate", () => {
		it("formats a valid ISO date string", () => {
			const result = formatOrderDate("2024-03-15T10:30:00Z");
			expect(result).toContain("Mar");
			expect(result).toContain("15");
			expect(result).toContain("2024");
		});

		it("returns original string for invalid date", () => {
			expect(formatOrderDate("not-a-date")).toBe("not-a-date");
		});

		it("handles empty string gracefully", () => {
			expect(formatOrderDate("")).toBe("");
		});
	});

	describe("formatCents", () => {
		it("formats 0 cents as $0.00", () => {
			expect(formatCents(0)).toBe("$0.00");
		});

		it("formats 100 cents as $1.00", () => {
			expect(formatCents(100)).toBe("$1.00");
		});

		it("formats 2599 cents as $25.99", () => {
			expect(formatCents(2599)).toBe("$25.99");
		});

		it("formats 50 cents as $0.50", () => {
			expect(formatCents(50)).toBe("$0.50");
		});

		it("formats large amounts correctly", () => {
			expect(formatCents(123456)).toBe("$1234.56");
		});
	});

	describe("getOrderStatusLabel", () => {
		it("returns 'Placed' for 'placed'", () => {
			expect(getOrderStatusLabel("placed")).toBe("Placed");
		});

		it("returns 'Confirmed' for 'confirmed'", () => {
			expect(getOrderStatusLabel("confirmed")).toBe("Confirmed");
		});

		it("returns 'Preparing' for 'preparing'", () => {
			expect(getOrderStatusLabel("preparing")).toBe("Preparing");
		});

		it("returns 'Completed' for 'completed'", () => {
			expect(getOrderStatusLabel("completed")).toBe("Completed");
		});

		it("returns 'Cancelled' for 'cancelled'", () => {
			expect(getOrderStatusLabel("cancelled")).toBe("Cancelled");
		});

		it("capitalizes first letter of unknown status", () => {
			expect(getOrderStatusLabel("custom")).toBe("Custom");
		});
	});

	describe("getStatusFilterTabs", () => {
		it("returns four tabs", () => {
			const tabs = getStatusFilterTabs();
			expect(tabs).toHaveLength(4);
		});

		it("first tab is All with undefined filter", () => {
			const tabs = getStatusFilterTabs();
			expect(tabs[0].key).toBe("all");
			expect(tabs[0].label).toBe("All");
			expect(tabs[0].filter).toBeUndefined();
		});

		it("second tab is Active", () => {
			const tabs = getStatusFilterTabs();
			expect(tabs[1].key).toBe("active");
			expect(tabs[1].label).toBe("Active");
			expect(tabs[1].filter).toBe("active");
		});

		it("third tab is Completed", () => {
			const tabs = getStatusFilterTabs();
			expect(tabs[2].key).toBe("completed");
			expect(tabs[2].label).toBe("Completed");
		});

		it("fourth tab is Cancelled", () => {
			const tabs = getStatusFilterTabs();
			expect(tabs[3].key).toBe("cancelled");
			expect(tabs[3].label).toBe("Cancelled");
		});
	});
});
