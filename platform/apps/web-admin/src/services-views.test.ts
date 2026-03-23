import { describe, expect, it } from "vitest";

import {
	buildServiceDisplayRow,
	formatDuration,
	formatPrice,
	getServiceStatusBadge,
	buildBookingConfigSummary,
} from "./services-views";
import type { ServiceRecord } from "@platform/types";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const sampleService: ServiceRecord = {
	bufferMinutes: 15,
	description: "A deep tissue massage",
	durationMinutes: 60,
	id: "svc-1",
	isBookable: true,
	maxAdvanceDays: 30,
	minAdvanceHours: 2,
	name: "Deep Tissue Massage",
	price: 8000,
	slug: "deep-tissue-massage",
	sortOrder: 1,
	status: "active",
	tenantId: "t-1",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("services-views", () => {
	describe("formatDuration", () => {
		it("formats minutes under an hour", () => {
			expect(formatDuration(30)).toBe("30min");
		});

		it("formats exactly one hour", () => {
			expect(formatDuration(60)).toBe("1h");
		});

		it("formats hours and minutes", () => {
			expect(formatDuration(90)).toBe("1h 30min");
		});

		it("formats multiple hours", () => {
			expect(formatDuration(120)).toBe("2h");
		});

		it("formats zero minutes", () => {
			expect(formatDuration(0)).toBe("0min");
		});
	});

	describe("formatPrice", () => {
		it("formats zero", () => {
			expect(formatPrice(0)).toBe("$0.00");
		});

		it("formats cents", () => {
			expect(formatPrice(8000)).toBe("$80.00");
		});

		it("formats with cents portion", () => {
			expect(formatPrice(1599)).toBe("$15.99");
		});
	});

	describe("getServiceStatusBadge", () => {
		it("returns success for active", () => {
			const badge = getServiceStatusBadge("active");
			expect(badge.label).toBe("Active");
			expect(badge.colorClass).toBe("success");
		});

		it("returns muted for inactive", () => {
			const badge = getServiceStatusBadge("inactive");
			expect(badge.label).toBe("Inactive");
			expect(badge.colorClass).toBe("muted");
		});
	});

	describe("buildServiceDisplayRow", () => {
		it("transforms a service record into a display row", () => {
			const row = buildServiceDisplayRow(sampleService);
			expect(row.id).toBe("svc-1");
			expect(row.name).toBe("Deep Tissue Massage");
			expect(row.priceFormatted).toBe("$80.00");
			expect(row.durationFormatted).toBe("1h");
			expect(row.statusBadge.label).toBe("Active");
			expect(row.isBookable).toBe(true);
		});

		it("handles inactive service", () => {
			const inactive: ServiceRecord = { ...sampleService, status: "inactive" };
			const row = buildServiceDisplayRow(inactive);
			expect(row.statusBadge.label).toBe("Inactive");
			expect(row.statusBadge.colorClass).toBe("muted");
		});
	});

	describe("buildBookingConfigSummary", () => {
		it("builds summary with all fields", () => {
			const summary = buildBookingConfigSummary(sampleService);
			expect(summary).toContain("60min duration");
			expect(summary).toContain("15min buffer");
			expect(summary).toContain("30d ahead");
			expect(summary).toContain("min 2h notice");
		});

		it("omits buffer when zero", () => {
			const svc: ServiceRecord = { ...sampleService, bufferMinutes: 0 };
			const summary = buildBookingConfigSummary(svc);
			expect(summary).not.toContain("buffer");
		});

		it("omits advance notice when zero", () => {
			const svc: ServiceRecord = { ...sampleService, minAdvanceHours: 0 };
			const summary = buildBookingConfigSummary(svc);
			expect(summary).not.toContain("notice");
		});
	});
});
