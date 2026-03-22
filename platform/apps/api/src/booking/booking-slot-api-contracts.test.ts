import { describe, expect, it } from "vitest";

import type { SlotComputationResult } from "@platform/types";
import { validateBookingSlotQuery } from "@platform/types";

import {
	assertValidAdminResponse,
	assertValidBookingSlotQuery,
	assertValidStorefrontResponse,
	BookingSlotApiContractError,
	toAdminBookingSlotsResponse,
	toStorefrontBookingSlotsResponse,
} from "./booking-slot-api-contracts";

// ─── Shared Test Data ────────────────────────────────────────────────────────

const validQuery = {
	tenantId: "tenant-1",
	locationId: "loc-1",
	serviceId: "svc-1",
	startDate: "2025-04-07",
	endDate: "2025-04-14",
};

const sampleResult: SlotComputationResult = {
	tenantId: "tenant-1",
	locationId: "loc-1",
	serviceId: "svc-1",
	date: "2025-04-07",
	slots: [
		{
			startTime: "2025-04-07T09:00:00",
			endTime: "2025-04-07T09:30:00",
			staffId: "staff-a",
			staffName: "Alice",
			serviceId: "svc-1",
		},
		{
			startTime: "2025-04-07T09:00:00",
			endTime: "2025-04-07T09:30:00",
			staffId: "staff-b",
			staffName: "Bob",
			serviceId: "svc-1",
		},
		{
			startTime: "2025-04-07T09:40:00",
			endTime: "2025-04-07T10:10:00",
			staffId: "staff-a",
			staffName: "Alice",
			serviceId: "svc-1",
		},
	],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("booking slot API contracts", () => {
	describe("validateBookingSlotQuery", () => {
		it("accepts a valid query", () => {
			const result = validateBookingSlotQuery(validQuery);
			expect(result).toEqual({ valid: true });
		});

		it("rejects missing serviceId", () => {
			const result = validateBookingSlotQuery({ ...validQuery, serviceId: "" });
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "serviceId", reason: "required" });
			}
		});

		it("rejects missing locationId", () => {
			const result = validateBookingSlotQuery({ ...validQuery, locationId: "" });
			expect(result.valid).toBe(false);
		});

		it("rejects missing startDate", () => {
			const result = validateBookingSlotQuery({ ...validQuery, startDate: "" });
			expect(result.valid).toBe(false);
		});

		it("rejects invalid startDate format", () => {
			const result = validateBookingSlotQuery({ ...validQuery, startDate: "04-07-2025" });
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "startDate", reason: "invalid-format" });
			}
		});

		it("rejects endDate before startDate", () => {
			const result = validateBookingSlotQuery({
				...validQuery,
				startDate: "2025-04-14",
				endDate: "2025-04-07",
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "dateRange", reason: "end-before-start" });
			}
		});

		it("rejects date range exceeding maximum", () => {
			const result = validateBookingSlotQuery({
				...validQuery,
				startDate: "2025-01-01",
				endDate: "2025-03-01",
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "dateRange", reason: "exceeds-max-range" });
			}
		});

		it("rejects empty staffId when provided", () => {
			const result = validateBookingSlotQuery({ ...validQuery, staffId: "" });
			expect(result.valid).toBe(false);
		});

		it("accepts query with optional staffId", () => {
			const result = validateBookingSlotQuery({ ...validQuery, staffId: "staff-a" });
			expect(result).toEqual({ valid: true });
		});
	});

	describe("assertValidBookingSlotQuery", () => {
		it("does not throw for valid query", () => {
			expect(() => assertValidBookingSlotQuery(validQuery)).not.toThrow();
		});

		it("throws for non-object", () => {
			expect(() => assertValidBookingSlotQuery("string")).toThrow(BookingSlotApiContractError);
		});

		it("throws for null", () => {
			expect(() => assertValidBookingSlotQuery(null)).toThrow(BookingSlotApiContractError);
		});

		it("throws for missing serviceId", () => {
			expect(() =>
				assertValidBookingSlotQuery({ ...validQuery, serviceId: "" })
			).toThrow(BookingSlotApiContractError);
		});

		it("throws for missing locationId", () => {
			expect(() =>
				assertValidBookingSlotQuery({ ...validQuery, locationId: "" })
			).toThrow(BookingSlotApiContractError);
		});
	});

	describe("toStorefrontBookingSlotsResponse", () => {
		it("strips staff identity from slots", () => {
			const response = toStorefrontBookingSlotsResponse(sampleResult);

			expect(response.serviceId).toBe("svc-1");
			expect(response.date).toBe("2025-04-07");

			for (const slot of response.slots) {
				expect(slot).not.toHaveProperty("staffId");
				expect(slot).not.toHaveProperty("staffName");
				expect(slot).toHaveProperty("startTime");
				expect(slot).toHaveProperty("endTime");
			}
		});

		it("deduplicates slots by start/end time", () => {
			const response = toStorefrontBookingSlotsResponse(sampleResult);

			// Two staff at 09:00-09:30 should become one storefront slot
			const nineOClockSlots = response.slots.filter(
				(s) => s.startTime === "2025-04-07T09:00:00"
			);
			expect(nineOClockSlots).toHaveLength(1);
		});

		it("returns empty slots array for empty computation result", () => {
			const emptyResult: SlotComputationResult = {
				...sampleResult,
				slots: [],
			};
			const response = toStorefrontBookingSlotsResponse(emptyResult);
			expect(response.slots).toHaveLength(0);
		});
	});

	describe("toAdminBookingSlotsResponse", () => {
		it("includes staff identity in slots", () => {
			const response = toAdminBookingSlotsResponse(sampleResult);

			expect(response.serviceId).toBe("svc-1");
			expect(response.date).toBe("2025-04-07");

			for (const slot of response.slots) {
				expect(slot).toHaveProperty("staffId");
				expect(slot).toHaveProperty("staffName");
				expect(slot).toHaveProperty("startTime");
				expect(slot).toHaveProperty("endTime");
			}
		});

		it("preserves all slots (no deduplication)", () => {
			const response = toAdminBookingSlotsResponse(sampleResult);
			expect(response.slots).toHaveLength(3);
		});
	});

	describe("assertValidStorefrontResponse", () => {
		it("accepts valid storefront response", () => {
			const response = toStorefrontBookingSlotsResponse(sampleResult);
			expect(() => assertValidStorefrontResponse(response)).not.toThrow();
		});

		it("throws for non-object", () => {
			expect(() => assertValidStorefrontResponse("string")).toThrow(
				BookingSlotApiContractError
			);
		});

		it("throws for missing slots array", () => {
			expect(() =>
				assertValidStorefrontResponse({ serviceId: "x", date: "2025-04-07" })
			).toThrow(BookingSlotApiContractError);
		});
	});

	describe("assertValidAdminResponse", () => {
		it("accepts valid admin response", () => {
			const response = toAdminBookingSlotsResponse(sampleResult);
			expect(() => assertValidAdminResponse(response)).not.toThrow();
		});

		it("throws for non-object", () => {
			expect(() => assertValidAdminResponse(null)).toThrow(BookingSlotApiContractError);
		});

		it("throws for slot missing staffId", () => {
			expect(() =>
				assertValidAdminResponse({
					serviceId: "x",
					date: "2025-04-07",
					slots: [{ startTime: "09:00", endTime: "09:30", staffName: "Alice" }],
				})
			).toThrow(BookingSlotApiContractError);
		});

		it("throws for slot missing staffName", () => {
			expect(() =>
				assertValidAdminResponse({
					serviceId: "x",
					date: "2025-04-07",
					slots: [{ startTime: "09:00", endTime: "09:30", staffId: "staff-a" }],
				})
			).toThrow(BookingSlotApiContractError);
		});
	});
});
