import { describe, expect, it } from "vitest";

import {
	buildLocationDisplayRow,
	buildContentPageDisplayCard,
	buildAnnouncementDisplayRow,
	buildDefaultWeekHours,
	generateSlugFromTitle,
	getLocationStatusBadge,
	getContentPageStatusBadge,
	getAnnouncementPlacementLabel,
	getAnnouncementStatusLabel,
	getAnnouncementStatusBadge,
	getContentTabLabel,
	weekdays,
	type ContentTab,
} from "./content-views";
import type { ContentPageRecord, AnnouncementRecord } from "@platform/types";
import type { LocationRecord } from "@platform/sdk";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const sampleLocation: LocationRecord = {
	address: "123 Main St",
	city: "Portland",
	createdAt: "2025-01-01T00:00:00Z",
	email: "shop@example.com",
	id: "loc-1",
	isActive: true,
	latitude: 45.5,
	longitude: -122.6,
	name: "Downtown Shop",
	phone: "503-555-0123",
	state: "OR",
	updatedAt: "2025-01-01T00:00:00Z",
	zip: "97201",
};

const samplePage: ContentPageRecord = {
	body: "Welcome to our store! We offer the best products in town.",
	createdAt: "2025-01-01T00:00:00Z",
	id: "page-1",
	publishedAt: "2025-01-02T00:00:00Z",
	seoDescription: "Best products in town",
	seoTitle: "Welcome",
	slug: "about-us",
	sortOrder: 1,
	status: "published",
	tenantId: "t-1",
	title: "About Us",
	updatedAt: "2025-01-15T00:00:00Z",
};

const sampleAnnouncement: AnnouncementRecord = {
	body: "Big sale this weekend!",
	createdAt: "2025-01-01T00:00:00Z",
	displayPriority: 1,
	endDate: "2099-12-31T23:59:59Z",
	id: "ann-1",
	isActive: true,
	placement: "banner",
	startDate: "2025-01-01T00:00:00Z",
	tenantId: "t-1",
	title: "Weekend Sale",
	updatedAt: "2025-01-01T00:00:00Z",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("content-views", () => {
	describe("generateSlugFromTitle", () => {
		it("converts title to slug", () => {
			expect(generateSlugFromTitle("About Us")).toBe("about-us");
		});

		it("strips special characters", () => {
			expect(generateSlugFromTitle("FAQ & Help!")).toBe("faq-help");
		});

		it("trims leading/trailing dashes", () => {
			expect(generateSlugFromTitle("  Hello World  ")).toBe("hello-world");
		});
	});

	describe("getContentTabLabel", () => {
		it("returns correct labels", () => {
			const tabs: ContentTab[] = ["pages", "announcements", "locations"];
			const labels = tabs.map(getContentTabLabel);
			expect(labels).toEqual(["Pages", "Announcements", "Locations"]);
		});
	});

	describe("getLocationStatusBadge", () => {
		it("returns success for active", () => {
			const badge = getLocationStatusBadge(true);
			expect(badge.label).toBe("Active");
			expect(badge.colorClass).toBe("success");
		});

		it("returns muted for inactive", () => {
			const badge = getLocationStatusBadge(false);
			expect(badge.label).toBe("Inactive");
			expect(badge.colorClass).toBe("muted");
		});
	});

	describe("getContentPageStatusBadge", () => {
		it("returns correct badges", () => {
			expect(getContentPageStatusBadge("draft").label).toBe("Draft");
			expect(getContentPageStatusBadge("published").label).toBe("Published");
			expect(getContentPageStatusBadge("archived").label).toBe("Archived");
		});
	});

	describe("getAnnouncementPlacementLabel", () => {
		it("returns correct labels", () => {
			expect(getAnnouncementPlacementLabel("banner")).toBe("Banner");
			expect(getAnnouncementPlacementLabel("popup")).toBe("Popup");
			expect(getAnnouncementPlacementLabel("inline")).toBe("In-feed");
		});
	});

	describe("getAnnouncementStatusLabel", () => {
		it("returns Inactive for inactive announcement", () => {
			expect(getAnnouncementStatusLabel({ isActive: false })).toBe("Inactive");
		});

		it("returns Active for active announcement with valid dates", () => {
			expect(getAnnouncementStatusLabel({
				isActive: true,
				startDate: "2020-01-01T00:00:00Z",
				endDate: "2099-12-31T23:59:59Z",
			})).toBe("Active");
		});

		it("returns Scheduled for future start date", () => {
			expect(getAnnouncementStatusLabel({
				isActive: true,
				startDate: "2099-01-01T00:00:00Z",
			})).toBe("Scheduled");
		});

		it("returns Expired for past end date", () => {
			expect(getAnnouncementStatusLabel({
				isActive: true,
				startDate: "2020-01-01T00:00:00Z",
				endDate: "2020-12-31T23:59:59Z",
			})).toBe("Expired");
		});

		it("returns Active when no dates set", () => {
			expect(getAnnouncementStatusLabel({ isActive: true })).toBe("Active");
		});
	});

	describe("getAnnouncementStatusBadge", () => {
		it("returns success for Active", () => {
			expect(getAnnouncementStatusBadge("Active").colorClass).toBe("success");
		});

		it("returns info for Scheduled", () => {
			expect(getAnnouncementStatusBadge("Scheduled").colorClass).toBe("info");
		});

		it("returns muted for Expired", () => {
			expect(getAnnouncementStatusBadge("Expired").colorClass).toBe("muted");
		});

		it("returns muted for Inactive", () => {
			expect(getAnnouncementStatusBadge("Inactive").colorClass).toBe("muted");
		});
	});

	describe("buildLocationDisplayRow", () => {
		it("transforms a location record", () => {
			const row = buildLocationDisplayRow(sampleLocation);
			expect(row.id).toBe("loc-1");
			expect(row.name).toBe("Downtown Shop");
			expect(row.fullAddress).toContain("123 Main St");
			expect(row.fullAddress).toContain("Portland");
			expect(row.statusBadge.label).toBe("Active");
		});

		it("handles inactive location", () => {
			const loc: LocationRecord = { ...sampleLocation, isActive: false };
			const row = buildLocationDisplayRow(loc);
			expect(row.statusBadge.label).toBe("Inactive");
		});
	});

	describe("buildContentPageDisplayCard", () => {
		it("transforms a content page record", () => {
			const card = buildContentPageDisplayCard(samplePage);
			expect(card.id).toBe("page-1");
			expect(card.title).toBe("About Us");
			expect(card.slug).toBe("about-us");
			expect(card.statusBadge.label).toBe("Published");
			expect(card.excerpt).toBeTruthy();
		});

		it("uses seoDescription as excerpt when body is not string", () => {
			const page: ContentPageRecord = { ...samplePage, body: { blocks: [] }, seoDescription: "SEO desc" };
			const card = buildContentPageDisplayCard(page);
			expect(card.excerpt).toBe("SEO desc");
		});

		it("handles missing excerpt sources", () => {
			const page: ContentPageRecord = { ...samplePage, body: null, seoDescription: null };
			const card = buildContentPageDisplayCard(page);
			expect(card.excerpt).toBe("");
		});
	});

	describe("buildAnnouncementDisplayRow", () => {
		it("transforms an announcement record", () => {
			const row = buildAnnouncementDisplayRow(sampleAnnouncement);
			expect(row.id).toBe("ann-1");
			expect(row.title).toBe("Weekend Sale");
			expect(row.placementLabel).toBe("Banner");
			expect(row.statusLabel).toBe("Active");
			expect(row.statusBadge.label).toBe("Active");
		});

		it("handles inactive announcement", () => {
			const ann: AnnouncementRecord = { ...sampleAnnouncement, isActive: false };
			const row = buildAnnouncementDisplayRow(ann);
			expect(row.statusLabel).toBe("Inactive");
		});
	});

	describe("buildDefaultWeekHours", () => {
		it("returns 7 days", () => {
			const hours = buildDefaultWeekHours();
			expect(hours).toHaveLength(7);
		});

		it("marks weekends as closed by default", () => {
			const hours = buildDefaultWeekHours();
			const saturday = hours.find((d) => d.day === "Saturday");
			const sunday = hours.find((d) => d.day === "Sunday");
			expect(saturday?.isClosed).toBe(true);
			expect(sunday?.isClosed).toBe(true);
		});

		it("marks weekdays as open by default", () => {
			const hours = buildDefaultWeekHours();
			const monday = hours.find((d) => d.day === "Monday");
			expect(monday?.isClosed).toBe(false);
			expect(monday?.openTime).toBe("09:00");
			expect(monday?.closeTime).toBe("17:00");
		});
	});

	describe("weekdays constant", () => {
		it("has 7 entries starting with Monday", () => {
			expect(weekdays).toHaveLength(7);
			expect(weekdays[0]).toBe("Monday");
			expect(weekdays[6]).toBe("Sunday");
		});
	});
});
