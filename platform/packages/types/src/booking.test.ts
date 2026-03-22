import { describe, expect, it } from "vitest";

import {
	buildSlotCacheKey,
	dayNameToNumber,
	dayNumberToName,
	validateBookingSlotQuery,
	bookingStatuses,
	isValidBookingTransition,
	getNextBookingStatuses,
	isTerminalBookingStatus,
	isValidBookingStatus,
	isBookingCancellable,
	evaluateCancellationWindow,
	computeBookingTrackingSteps,
	getCurrentBookingTrackingStepIndex,
	getBookingQuickActions,
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

	// ─── Booking Lifecycle State Machine (E7-S4) ───────────────────────────

	describe("booking status state machine", () => {
		it("defines all booking statuses", () => {
			expect(bookingStatuses).toEqual([
				"requested",
				"confirmed",
				"checked-in",
				"completed",
				"cancelled",
				"no-show",
			]);
		});

		it("validates correct transitions", () => {
			expect(isValidBookingTransition("requested", "confirmed")).toBe(true);
			expect(isValidBookingTransition("requested", "cancelled")).toBe(true);
			expect(isValidBookingTransition("confirmed", "checked-in")).toBe(true);
			expect(isValidBookingTransition("confirmed", "cancelled")).toBe(true);
			expect(isValidBookingTransition("confirmed", "no-show")).toBe(true);
			expect(isValidBookingTransition("checked-in", "completed")).toBe(true);
			expect(isValidBookingTransition("checked-in", "no-show")).toBe(true);
		});

		it("rejects invalid transitions", () => {
			expect(isValidBookingTransition("requested", "completed")).toBe(false);
			expect(isValidBookingTransition("requested", "checked-in")).toBe(false);
			expect(isValidBookingTransition("completed", "confirmed")).toBe(false);
			expect(isValidBookingTransition("cancelled", "confirmed")).toBe(false);
			expect(isValidBookingTransition("no-show", "confirmed")).toBe(false);
		});

		it("returns next statuses", () => {
			expect(getNextBookingStatuses("requested")).toEqual(["confirmed", "cancelled"]);
			expect(getNextBookingStatuses("confirmed")).toEqual(["checked-in", "cancelled", "no-show"]);
			expect(getNextBookingStatuses("checked-in")).toEqual(["completed", "no-show"]);
			expect(getNextBookingStatuses("completed")).toEqual([]);
			expect(getNextBookingStatuses("cancelled")).toEqual([]);
			expect(getNextBookingStatuses("no-show")).toEqual([]);
		});

		it("identifies terminal statuses", () => {
			expect(isTerminalBookingStatus("completed")).toBe(true);
			expect(isTerminalBookingStatus("cancelled")).toBe(true);
			expect(isTerminalBookingStatus("no-show")).toBe(true);
			expect(isTerminalBookingStatus("requested")).toBe(false);
			expect(isTerminalBookingStatus("confirmed")).toBe(false);
		});

		it("validates booking status strings", () => {
			expect(isValidBookingStatus("requested")).toBe(true);
			expect(isValidBookingStatus("invalid")).toBe(false);
		});

		it("identifies cancellable statuses", () => {
			expect(isBookingCancellable("requested")).toBe(true);
			expect(isBookingCancellable("confirmed")).toBe(true);
			expect(isBookingCancellable("checked-in")).toBe(false);
			expect(isBookingCancellable("completed")).toBe(false);
		});
	});

	describe("cancellation window policy", () => {
		it("allows free cancellation well before window", () => {
			const result = evaluateCancellationWindow(
				"2026-04-01T10:00:00",
				{ freeWindowHours: 24, allowLateCancellation: true, lateCancellationPenalty: null },
				new Date("2026-03-30T10:00:00")
			);
			expect(result).toEqual({ allowed: true, isLate: false });
		});

		it("returns late cancellation within window when allowed", () => {
			const result = evaluateCancellationWindow(
				"2026-04-01T10:00:00",
				{ freeWindowHours: 24, allowLateCancellation: true, lateCancellationPenalty: "50% fee" },
				new Date("2026-03-31T22:00:00") // 12 hours before
			);
			expect(result).toEqual({ allowed: true, isLate: true, penalty: "50% fee" });
		});

		it("blocks cancellation within window when not allowed", () => {
			const result = evaluateCancellationWindow(
				"2026-04-01T10:00:00",
				{ freeWindowHours: 24, allowLateCancellation: false, lateCancellationPenalty: null },
				new Date("2026-03-31T22:00:00")
			);
			expect(result.allowed).toBe(false);
		});

		it("blocks cancellation after booking start time", () => {
			const result = evaluateCancellationWindow(
				"2026-04-01T10:00:00",
				{ freeWindowHours: 24, allowLateCancellation: true, lateCancellationPenalty: null },
				new Date("2026-04-01T10:30:00")
			);
			expect(result.allowed).toBe(false);
		});
	});

	describe("booking tracking steps", () => {
		it("computes tracking steps for requested status", () => {
			const steps = computeBookingTrackingSteps("requested", {
				requestedAt: "2026-04-01T08:00:00",
				confirmedAt: null,
				checkedInAt: null,
				completedAt: null,
			});
			expect(steps[0]).toEqual({
				step: "requested",
				label: "Requested",
				state: "current",
				timestamp: "2026-04-01T08:00:00",
			});
			expect(steps[1].state).toBe("upcoming");
			expect(steps[2].state).toBe("upcoming");
			expect(steps[3].state).toBe("upcoming");
		});

		it("computes tracking steps for confirmed status", () => {
			const steps = computeBookingTrackingSteps("confirmed", {
				requestedAt: "2026-04-01T08:00:00",
				confirmedAt: "2026-04-01T09:00:00",
				checkedInAt: null,
				completedAt: null,
			});
			expect(steps[0].state).toBe("completed");
			expect(steps[1].state).toBe("current");
			expect(steps[2].state).toBe("upcoming");
		});

		it("computes tracking steps for cancelled status", () => {
			const steps = computeBookingTrackingSteps("cancelled", {
				requestedAt: "2026-04-01T08:00:00",
				confirmedAt: null,
				checkedInAt: null,
				completedAt: null,
			});
			expect(steps[0].state).toBe("completed"); // has timestamp
			expect(steps[1].state).toBe("skipped"); // no timestamp
		});

		it("computes step index for active statuses", () => {
			expect(getCurrentBookingTrackingStepIndex("requested")).toBe(0);
			expect(getCurrentBookingTrackingStepIndex("confirmed")).toBe(1);
			expect(getCurrentBookingTrackingStepIndex("checked-in")).toBe(2);
			expect(getCurrentBookingTrackingStepIndex("completed")).toBe(3);
			expect(getCurrentBookingTrackingStepIndex("cancelled")).toBe(-1);
			expect(getCurrentBookingTrackingStepIndex("no-show")).toBe(-1);
		});
	});

	describe("booking quick actions", () => {
		it("returns confirm action for requested status", () => {
			const actions = getBookingQuickActions("requested");
			expect(actions).toHaveLength(1);
			expect(actions[0].targetStatus).toBe("confirmed");
		});

		it("returns check-in and no-show for confirmed status", () => {
			const actions = getBookingQuickActions("confirmed");
			expect(actions).toHaveLength(2);
			expect(actions.map((a) => a.targetStatus)).toContain("checked-in");
			expect(actions.map((a) => a.targetStatus)).toContain("no-show");
		});

		it("returns complete and no-show for checked-in status", () => {
			const actions = getBookingQuickActions("checked-in");
			expect(actions).toHaveLength(2);
			expect(actions.map((a) => a.targetStatus)).toContain("completed");
			expect(actions.map((a) => a.targetStatus)).toContain("no-show");
		});

		it("returns empty actions for terminal statuses", () => {
			expect(getBookingQuickActions("completed")).toHaveLength(0);
			expect(getBookingQuickActions("cancelled")).toHaveLength(0);
			expect(getBookingQuickActions("no-show")).toHaveLength(0);
		});
	});
});
