import { describe, expect, it } from "vitest";

import { AnnouncementService } from "./announcement.service";
import type { AnnouncementRecord } from "@platform/types";

function makeAnnouncement(
	overrides: Partial<AnnouncementRecord> = {}
): AnnouncementRecord {
	return {
		id: "ann-1",
		tenantId: "t1",
		title: "Summer Sale",
		body: "50% off everything!",
		placement: "banner",
		isActive: true,
		startDate: null,
		endDate: null,
		displayPriority: 0,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("AnnouncementService", () => {
	const service = new AnnouncementService();

	describe("validateCreate", () => {
		it("accepts valid input", () => {
			const result = service.validateCreate({
				tenantId: "t1",
				title: "Sale",
				body: "Big sale!",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects empty title", () => {
			const result = service.validateCreate({
				tenantId: "t1",
				title: "",
				body: "content",
			});
			expect(result.valid).toBe(false);
		});

		it("rejects end date before start date", () => {
			const result = service.validateCreate({
				tenantId: "t1",
				title: "Sale",
				body: "content",
				startDate: "2026-06-01",
				endDate: "2026-05-01",
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({
					field: "endDate",
					reason: "before-start",
				});
			}
		});
	});

	describe("filterActive", () => {
		const now = new Date("2026-06-15T12:00:00Z");

		it("includes active announcements within date range", () => {
			const announcements = [
				makeAnnouncement({
					startDate: "2026-06-01T00:00:00Z",
					endDate: "2026-06-30T23:59:59Z",
				}),
			];
			expect(service.filterActive(announcements, "t1", now)).toHaveLength(1);
		});

		it("excludes inactive announcements", () => {
			const announcements = [makeAnnouncement({ isActive: false })];
			expect(service.filterActive(announcements, "t1", now)).toHaveLength(0);
		});

		it("excludes announcements not yet started", () => {
			const announcements = [
				makeAnnouncement({ startDate: "2026-07-01T00:00:00Z" }),
			];
			expect(service.filterActive(announcements, "t1", now)).toHaveLength(0);
		});

		it("excludes expired announcements", () => {
			const announcements = [
				makeAnnouncement({ endDate: "2026-05-01T00:00:00Z" }),
			];
			expect(service.filterActive(announcements, "t1", now)).toHaveLength(0);
		});

		it("sorts by display priority descending", () => {
			const announcements = [
				makeAnnouncement({ id: "low", displayPriority: 1 }),
				makeAnnouncement({ id: "high", displayPriority: 10 }),
			];
			const result = service.filterActive(announcements, "t1", now);
			expect(result[0]!.id).toBe("high");
		});

		it("excludes other tenants", () => {
			const announcements = [makeAnnouncement({ tenantId: "t2" })];
			expect(service.filterActive(announcements, "t1", now)).toHaveLength(0);
		});
	});

	describe("filterByPlacement", () => {
		const now = new Date("2026-06-15T12:00:00Z");

		it("filters by placement type", () => {
			const announcements = [
				makeAnnouncement({ placement: "banner" }),
				makeAnnouncement({ id: "ann-2", placement: "popup" }),
			];
			const result = service.filterByPlacement(
				announcements,
				"t1",
				"banner",
				now
			);
			expect(result).toHaveLength(1);
			expect(result[0]!.placement).toBe("banner");
		});
	});

	describe("isWithinDateRange", () => {
		const now = new Date("2026-06-15T12:00:00Z");

		it("returns true for no date constraints", () => {
			expect(
				service.isWithinDateRange(makeAnnouncement(), now)
			).toBe(true);
		});

		it("returns false before start date", () => {
			expect(
				service.isWithinDateRange(
					makeAnnouncement({ startDate: "2026-07-01T00:00:00Z" }),
					now
				)
			).toBe(false);
		});

		it("returns false after end date", () => {
			expect(
				service.isWithinDateRange(
					makeAnnouncement({ endDate: "2026-05-01T00:00:00Z" }),
					now
				)
			).toBe(false);
		});
	});
});
