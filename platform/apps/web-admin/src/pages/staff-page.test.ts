// Tests for staff management page card grid, invite, and schedule logic

import { describe, expect, it } from "vitest";

import type { StaffProfileRecord, StaffScheduleWindowRecord } from "@platform/types";
import { validateStaffProfileInput, validateScheduleWindow, detectScheduleConflicts } from "@platform/types";

describe("StaffPage helpers", () => {
	describe("staff card mapping", () => {
		function mapStaffToCard(s: StaffProfileRecord) {
			return {
				id: s.id,
				name: s.displayName,
				email: s.email ?? "",
				phone: s.phone ?? "",
				role: s.role ?? "Staff",
				status: s.status,
				photoUrl: s.photoUrl ?? null,
				isBookable: s.isBookable,
			};
		}

		it("maps staff profile to card data", () => {
			const staff: StaffProfileRecord = {
				id: "staff-1",
				tenantId: "t-1",
				displayName: "Alice Smith",
				email: "alice@example.com",
				phone: "555-9876",
				photoUrl: "https://example.com/alice.jpg",
				role: "Manager",
				status: "active",
				isBookable: true,
			};

			const card = mapStaffToCard(staff);
			expect(card.id).toBe("staff-1");
			expect(card.name).toBe("Alice Smith");
			expect(card.email).toBe("alice@example.com");
			expect(card.role).toBe("Manager");
			expect(card.status).toBe("active");
			expect(card.photoUrl).toBe("https://example.com/alice.jpg");
		});

		it("defaults to Staff role and empty fields", () => {
			const staff: StaffProfileRecord = {
				id: "staff-2",
				tenantId: "t-1",
				displayName: "Bob",
				status: "active",
				isBookable: false,
			};

			const card = mapStaffToCard(staff);
			expect(card.role).toBe("Staff");
			expect(card.email).toBe("");
			expect(card.phone).toBe("");
			expect(card.photoUrl).toBeNull();
		});
	});

	describe("invite validation", () => {
		it("validates valid staff profile input", () => {
			const result = validateStaffProfileInput({
				displayName: "New Staff",
				email: "new@example.com",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects empty display name", () => {
			const result = validateStaffProfileInput({
				displayName: "",
				email: "test@example.com",
			});
			expect(result.valid).toBe(false);
		});

		it("rejects invalid email format", () => {
			const result = validateStaffProfileInput({
				displayName: "Test",
				email: "not-an-email",
			});
			expect(result.valid).toBe(false);
		});

		it("accepts null email", () => {
			const result = validateStaffProfileInput({
				displayName: "Test",
				email: null,
			});
			expect(result.valid).toBe(true);
		});
	});

	describe("schedule window validation", () => {
		it("validates valid schedule window", () => {
			const result = validateScheduleWindow({
				dayOfWeek: 1,
				startTime: "09:00",
				endTime: "17:00",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects end before start", () => {
			const result = validateScheduleWindow({
				dayOfWeek: 1,
				startTime: "17:00",
				endTime: "09:00",
			});
			expect(result.valid).toBe(false);
		});

		it("rejects invalid day of week", () => {
			const result = validateScheduleWindow({
				dayOfWeek: 8,
				startTime: "09:00",
				endTime: "17:00",
			});
			expect(result.valid).toBe(false);
		});

		it("rejects invalid time format", () => {
			const result = validateScheduleWindow({
				dayOfWeek: 1,
				startTime: "9am",
				endTime: "5pm",
			});
			expect(result.valid).toBe(false);
		});
	});

	describe("schedule conflict detection", () => {
		const existingWindows = [
			{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
			{ dayOfWeek: 1, startTime: "13:00", endTime: "17:00" },
		];

		it("detects overlapping window", () => {
			const conflict = detectScheduleConflicts(existingWindows, {
				dayOfWeek: 1,
				startTime: "11:00",
				endTime: "14:00",
			});
			expect(conflict).not.toBeNull();
			expect(conflict!.overlappingDay).toBe(1);
		});

		it("allows non-overlapping window", () => {
			const conflict = detectScheduleConflicts(existingWindows, {
				dayOfWeek: 1,
				startTime: "12:00",
				endTime: "13:00",
			});
			expect(conflict).toBeNull();
		});

		it("allows window on different day", () => {
			const conflict = detectScheduleConflicts(existingWindows, {
				dayOfWeek: 2,
				startTime: "09:00",
				endTime: "17:00",
			});
			expect(conflict).toBeNull();
		});
	});

	describe("day name mapping", () => {
		const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

		it("maps day index to name", () => {
			expect(DAY_NAMES[0]).toBe("Sunday");
			expect(DAY_NAMES[1]).toBe("Monday");
			expect(DAY_NAMES[6]).toBe("Saturday");
		});
	});
});
