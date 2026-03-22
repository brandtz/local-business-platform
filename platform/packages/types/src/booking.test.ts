import { describe, expect, it } from "vitest";

import {
	buildSlotCacheKey,
	dayNameToNumber,
	dayNumberToName,
	validateBookingSlotQuery,
} from "./booking";

describe("booking types", () => {
	describe("dayNameToNumber", () => {
		it("maps day names to numbers correctly", () => {
			expect(dayNameToNumber("sunday")).toBe(0);
			expect(dayNameToNumber("monday")).toBe(1);
			expect(dayNameToNumber("tuesday")).toBe(2);
			expect(dayNameToNumber("wednesday")).toBe(3);
			expect(dayNameToNumber("thursday")).toBe(4);
			expect(dayNameToNumber("friday")).toBe(5);
			expect(dayNameToNumber("saturday")).toBe(6);
		});

		it("is case-insensitive", () => {
			expect(dayNameToNumber("Monday")).toBe(1);
			expect(dayNameToNumber("FRIDAY")).toBe(5);
		});

		it("throws for invalid day name", () => {
			expect(() => dayNameToNumber("notaday")).toThrow("Invalid day name");
		});
	});

	describe("dayNumberToName", () => {
		it("maps day numbers to names correctly", () => {
			expect(dayNumberToName(0)).toBe("sunday");
			expect(dayNumberToName(1)).toBe("monday");
			expect(dayNumberToName(6)).toBe("saturday");
		});

		it("throws for invalid day number", () => {
			expect(() => dayNumberToName(7)).toThrow("Invalid day number");
			expect(() => dayNumberToName(-1)).toThrow("Invalid day number");
		});
	});

	describe("validateBookingSlotQuery", () => {
		const validQuery = {
			tenantId: "tenant-1",
			locationId: "loc-1",
			serviceId: "svc-1",
			startDate: "2025-04-07",
			endDate: "2025-04-14",
		};

		it("accepts a valid query", () => {
			expect(validateBookingSlotQuery(validQuery)).toEqual({ valid: true });
		});

		it("rejects missing required fields", () => {
			const result = validateBookingSlotQuery({});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors.length).toBeGreaterThanOrEqual(3);
			}
		});

		it("validates date format", () => {
			const result = validateBookingSlotQuery({
				...validQuery,
				startDate: "invalid",
			});
			expect(result.valid).toBe(false);
		});

		it("validates date range order", () => {
			const result = validateBookingSlotQuery({
				...validQuery,
				startDate: "2025-04-14",
				endDate: "2025-04-07",
			});
			expect(result.valid).toBe(false);
		});

		it("validates max date range", () => {
			const result = validateBookingSlotQuery({
				...validQuery,
				startDate: "2025-01-01",
				endDate: "2025-12-31",
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({
					field: "dateRange",
					reason: "exceeds-max-range",
				});
			}
		});

		it("accepts same-day range", () => {
			const result = validateBookingSlotQuery({
				...validQuery,
				startDate: "2025-04-07",
				endDate: "2025-04-07",
			});
			expect(result).toEqual({ valid: true });
		});
	});

	describe("buildSlotCacheKey", () => {
		it("builds basic cache key", () => {
			expect(
				buildSlotCacheKey({
					tenantId: "t1",
					locationId: "l1",
					serviceId: "s1",
					date: "2025-04-07",
				})
			).toBe("slots:t1:l1:s1:2025-04-07");
		});

		it("includes staffId when provided", () => {
			expect(
				buildSlotCacheKey({
					tenantId: "t1",
					locationId: "l1",
					serviceId: "s1",
					date: "2025-04-07",
					staffId: "staff-1",
				})
			).toBe("slots:t1:l1:s1:2025-04-07:staff-1");
		});
	});
});
