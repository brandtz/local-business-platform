import { describe, it, expect } from "vitest";
import {
	formatMemberSince,
	getQuickStatCards,
	type QuickStats,
} from "./account-dashboard-page";

describe("account-dashboard-page helpers", () => {
	describe("formatMemberSince", () => {
		it("formats a valid ISO date as 'Member since Month Year'", () => {
			expect(formatMemberSince("2023-06-15T10:00:00Z")).toBe("Member since June 2023");
		});

		it("formats a January date", () => {
			expect(formatMemberSince("2024-01-01T00:00:00Z")).toBe("Member since January 2024");
		});

		it("returns 'Member' for invalid date strings", () => {
			expect(formatMemberSince("not-a-date")).toBe("Member");
		});

		it("returns 'Member' for empty string", () => {
			expect(formatMemberSince("")).toBe("Member");
		});
	});

	describe("getQuickStatCards", () => {
		const stats: QuickStats = {
			totalOrders: 12,
			upcomingBookings: 3,
			loyaltyPoints: 1500,
		};

		it("returns three stat cards", () => {
			const cards = getQuickStatCards(stats);
			expect(cards).toHaveLength(3);
		});

		it("first card is Total Orders with correct value and link", () => {
			const cards = getQuickStatCards(stats);
			expect(cards[0].label).toBe("Total Orders");
			expect(cards[0].value).toBe(12);
			expect(cards[0].link).toBe("/account/orders");
		});

		it("second card is Upcoming Bookings", () => {
			const cards = getQuickStatCards(stats);
			expect(cards[1].label).toBe("Upcoming Bookings");
			expect(cards[1].value).toBe(3);
			expect(cards[1].link).toBe("/account/bookings");
		});

		it("third card is Loyalty Points formatted with locale string", () => {
			const cards = getQuickStatCards(stats);
			expect(cards[2].label).toBe("Loyalty Points");
			expect(cards[2].value).toBe("1,500");
			expect(cards[2].link).toBe("/account/loyalty");
		});

		it("handles zero stats", () => {
			const zeroStats: QuickStats = { totalOrders: 0, upcomingBookings: 0, loyaltyPoints: 0 };
			const cards = getQuickStatCards(zeroStats);
			expect(cards[0].value).toBe(0);
			expect(cards[1].value).toBe(0);
			expect(cards[2].value).toBe("0");
		});
	});
});
