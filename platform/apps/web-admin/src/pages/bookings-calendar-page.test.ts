// Tests for bookings calendar page date helpers, view models, and calendar logic

import { describe, expect, it } from "vitest";

import {
	getBookingStatusBadge,
	buildCalendarViewModel,
	buildBookingListRow,
	formatBookingDateTime,
	formatBookingTime,
} from "../booking-management";
import type {
	AdminBookingSummary,
	BookingStatus,
	CalendarViewResponse,
} from "@platform/types";

const NOW = new Date("2026-04-01T12:00:00Z").getTime();

describe("BookingsCalendarPage helpers", () => {
	describe("date range calculation", () => {
		function getDateRange(dateStr: string, view: "day" | "week" | "month"): { start: string; end: string } {
			function formatDateISO(date: Date): string {
				const y = date.getUTCFullYear();
				const m = String(date.getUTCMonth() + 1).padStart(2, "0");
				const d = String(date.getUTCDate()).padStart(2, "0");
				return `${y}-${m}-${d}`;
			}

			function addDays(ds: string, days: number): string {
				const d = new Date(ds + "T12:00:00Z");
				d.setUTCDate(d.getUTCDate() + days);
				return formatDateISO(d);
			}

			const d = new Date(dateStr + "T12:00:00Z");
			if (view === "day") return { start: dateStr, end: dateStr };
			if (view === "week") {
				const dayOfWeek = d.getUTCDay();
				const start = addDays(dateStr, -dayOfWeek);
				const end = addDays(start, 6);
				return { start, end };
			}
			const firstDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
			const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
			return { start: formatDateISO(firstDay), end: formatDateISO(lastDay) };
		}

		it("day view returns same date for start and end", () => {
			const range = getDateRange("2026-04-01", "day");
			expect(range.start).toBe("2026-04-01");
			expect(range.end).toBe("2026-04-01");
		});

		it("week view returns 7-day range starting from Sunday", () => {
			const range = getDateRange("2026-04-01", "week");
			// April 1, 2026 is a Wednesday (day 3)
			expect(range.start).toBe("2026-03-29"); // Sunday
			expect(range.end).toBe("2026-04-04"); // Saturday
		});

		it("month view returns first and last day of month", () => {
			const range = getDateRange("2026-04-15", "month");
			expect(range.start).toBe("2026-04-01");
			expect(range.end).toBe("2026-04-30");
		});
	});

	describe("booking status badges", () => {
		const allStatuses: BookingStatus[] = [
			"requested", "confirmed", "checked-in", "completed", "cancelled", "no-show",
		];

		it("returns valid badge for all booking statuses", () => {
			for (const status of allStatuses) {
				const badge = getBookingStatusBadge(status);
				expect(badge.status).toBe(status);
				expect(badge.label).toBeTruthy();
				expect(badge.colorClass).toBeTruthy();
			}
		});

		it("requested has info style", () => {
			expect(getBookingStatusBadge("requested").colorClass).toBe("badge-info");
		});

		it("confirmed has primary style", () => {
			expect(getBookingStatusBadge("confirmed").colorClass).toBe("badge-primary");
		});

		it("completed has muted style", () => {
			expect(getBookingStatusBadge("completed").colorClass).toBe("badge-muted");
		});
	});

	describe("calendar view model building", () => {
		it("builds day view models from response", () => {
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
								staffId: "s-1",
								staffName: "Alice",
								startTime: "2026-04-01T10:00:00",
								endTime: "2026-04-01T10:30:00",
								durationMinutes: 30,
							},
						],
					},
				],
				query: { tenantId: "t-1", startDate: "2026-04-01", endDate: "2026-04-01" },
			};

			const days = buildCalendarViewModel(response);
			expect(days).toHaveLength(1);
			expect(days[0]!.date).toBe("2026-04-01");
			expect(days[0]!.blocks).toHaveLength(1);
			expect(days[0]!.blocks[0]!.bookingId).toBe("b-1");
			expect(days[0]!.blocks[0]!.serviceName).toBe("Haircut");
			expect(days[0]!.blocks[0]!.statusBadge.status).toBe("confirmed");
		});

		it("handles empty days", () => {
			const response: CalendarViewResponse = {
				days: [{ date: "2026-04-01", blocks: [] }],
				query: { tenantId: "t-1", startDate: "2026-04-01", endDate: "2026-04-01" },
			};

			const days = buildCalendarViewModel(response);
			expect(days[0]!.blocks).toHaveLength(0);
		});
	});

	describe("booking list row building", () => {
		it("builds row from booking summary", () => {
			const summary: AdminBookingSummary = {
				id: "b-1",
				createdAt: "2026-04-01T08:00:00Z",
				status: "requested",
				customerName: "Jane Doe",
				serviceName: "Haircut",
				staffName: "Alice",
				startTime: "2026-04-01T10:00:00",
				endTime: "2026-04-01T10:30:00",
				durationMinutes: 30,
			};

			const row = buildBookingListRow(summary, NOW);
			expect(row.id).toBe("b-1");
			expect(row.customerName).toBe("Jane Doe");
			expect(row.serviceName).toBe("Haircut");
			expect(row.staffName).toBe("Alice");
			expect(row.durationLabel).toBe("30 min");
		});

		it("defaults to Walk-in for null customer name", () => {
			const summary: AdminBookingSummary = {
				id: "b-2",
				createdAt: "2026-04-01T08:00:00Z",
				status: "requested",
				customerName: null,
				serviceName: "Massage",
				staffName: "Bob",
				startTime: "2026-04-01T14:00:00",
				endTime: "2026-04-01T15:00:00",
				durationMinutes: 60,
			};

			const row = buildBookingListRow(summary, NOW);
			expect(row.customerName).toBe("Walk-in");
		});
	});

	describe("time formatting", () => {
		it("formats full datetime", () => {
			const result = formatBookingDateTime("2026-04-01T10:00:00");
			expect(result).toContain("04/01/2026");
			expect(result).toContain("10:00 AM");
		});

		it("formats PM time correctly", () => {
			const result = formatBookingDateTime("2026-04-01T14:30:00");
			expect(result).toContain("2:30 PM");
		});

		it("formats time only", () => {
			const result = formatBookingTime("2026-04-01T09:15:00");
			expect(result).toBe("9:15 AM");
		});

		it("formats noon correctly", () => {
			const result = formatBookingTime("2026-04-01T12:00:00");
			expect(result).toBe("12:00 PM");
		});

		it("formats midnight correctly", () => {
			const result = formatBookingTime("2026-04-01T00:00:00");
			expect(result).toBe("12:00 AM");
		});
	});
});
