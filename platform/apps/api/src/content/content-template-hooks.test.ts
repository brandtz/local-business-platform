import { describe, expect, it } from "vitest";

import type { ContentPageRecord } from "@platform/types";
import { domainEvents } from "@platform/types";

import {
	ContentTemplateHooksService,
	templateRegions,
} from "./content-template-hooks";

function makePage(
	overrides: Partial<ContentPageRecord> = {}
): ContentPageRecord {
	return {
		id: "page-1",
		tenantId: "t1",
		title: "About Us",
		slug: "about-us",
		body: { blocks: [] },
		status: "draft",
		sortOrder: 0,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("ContentTemplateHooksService", () => {
	const service = new ContentTemplateHooksService();

	// -----------------------------------------------------------------------
	// Event building
	// -----------------------------------------------------------------------

	describe("buildPublishEvent", () => {
		it("creates a publish event envelope", () => {
			const page = makePage({
				id: "page-42",
				slug: "about-us",
				status: "published",
			});
			const event = service.buildPublishEvent("t1", page);

			expect(event.eventName).toBe(domainEvents.contentPagePublished);
			expect(event.tenantId).toBe("t1");
			expect(event.data.pageId).toBe("page-42");
			expect(event.data.slug).toBe("about-us");
			expect(event.data.status).toBe("published");
			expect(event.occurredAt).toBeTruthy();
		});
	});

	describe("buildArchiveEvent", () => {
		it("creates an archive event envelope", () => {
			const page = makePage({
				id: "page-42",
				slug: "policies",
				status: "archived",
			});
			const event = service.buildArchiveEvent("t1", page);

			expect(event.eventName).toBe(domainEvents.contentPageArchived);
			expect(event.tenantId).toBe("t1");
			expect(event.data.pageId).toBe("page-42");
			expect(event.data.slug).toBe("policies");
			expect(event.data.status).toBe("archived");
		});
	});

	// -----------------------------------------------------------------------
	// Content readiness
	// -----------------------------------------------------------------------

	describe("checkContentReadiness", () => {
		it("reports ready when all required regions have published content", () => {
			const pages = [
				makePage({
					status: "published",
					templateRegion: "hero",
				}),
				makePage({
					id: "page-2",
					status: "published",
					templateRegion: "about",
				}),
			];
			const result = service.checkContentReadiness(pages, "t1", [
				"hero",
				"about",
			]);
			expect(result.ready).toBe(true);
			expect(result.issues).toHaveLength(0);
		});

		it("reports not ready when a required region has no published content", () => {
			const pages = [
				makePage({ status: "published", templateRegion: "hero" }),
			];
			const result = service.checkContentReadiness(pages, "t1", [
				"hero",
				"about",
			]);
			expect(result.ready).toBe(false);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]!.region).toBe("about");
			expect(result.issues[0]!.severity).toBe("error");
		});

		it("ignores draft pages when checking readiness", () => {
			const pages = [
				makePage({ status: "draft", templateRegion: "hero" }),
			];
			const result = service.checkContentReadiness(pages, "t1", ["hero"]);
			expect(result.ready).toBe(false);
		});

		it("ignores pages from other tenants", () => {
			const pages = [
				makePage({
					tenantId: "t2",
					status: "published",
					templateRegion: "hero",
				}),
			];
			const result = service.checkContentReadiness(pages, "t1", ["hero"]);
			expect(result.ready).toBe(false);
		});

		it("reports ready with empty required regions", () => {
			const result = service.checkContentReadiness([], "t1", []);
			expect(result.ready).toBe(true);
			expect(result.issues).toHaveLength(0);
		});
	});

	// -----------------------------------------------------------------------
	// Storefront preview
	// -----------------------------------------------------------------------

	describe("buildStorefrontPreview", () => {
		it("maps published pages to storefront representation", () => {
			const pages = [
				makePage({
					status: "published",
					templateRegion: "hero",
					seoTitle: "Hero Page",
					seoDescription: "The hero section",
				}),
				makePage({
					id: "page-2",
					status: "draft",
					templateRegion: "about",
				}),
			];
			const preview = service.buildStorefrontPreview(pages, "t1", [
				"hero",
				"about",
			]);
			expect(preview.pages).toHaveLength(1);
			expect(preview.pages[0]!.title).toBe("About Us");
			expect(preview.pages[0]!.seoTitle).toBe("Hero Page");
			expect(preview.missingRegions).toContain("about");
		});

		it("identifies all missing regions", () => {
			const preview = service.buildStorefrontPreview([], "t1", [
				"hero",
				"about",
				"services",
			]);
			expect(preview.pages).toHaveLength(0);
			expect(preview.missingRegions).toEqual([
				"hero",
				"about",
				"services",
			]);
		});

		it("reports no missing regions when all are covered", () => {
			const pages = [
				makePage({
					status: "published",
					templateRegion: "hero",
				}),
				makePage({
					id: "page-2",
					status: "published",
					templateRegion: "about",
				}),
			];
			const preview = service.buildStorefrontPreview(pages, "t1", [
				"hero",
				"about",
			]);
			expect(preview.missingRegions).toHaveLength(0);
		});

		it("excludes pages from other tenants", () => {
			const pages = [
				makePage({
					tenantId: "t2",
					status: "published",
					templateRegion: "hero",
				}),
			];
			const preview = service.buildStorefrontPreview(pages, "t1", [
				"hero",
			]);
			expect(preview.pages).toHaveLength(0);
			expect(preview.missingRegions).toContain("hero");
		});
	});

	// -----------------------------------------------------------------------
	// toStorefrontPage
	// -----------------------------------------------------------------------

	describe("toStorefrontPage", () => {
		it("maps a published page to storefront format", () => {
			const page = makePage({
				status: "published",
				seoTitle: "About",
				seoDescription: "About us",
				ogImageUrl: "https://cdn.example.com/og.jpg",
				templateRegion: "about",
			});
			const result = service.toStorefrontPage(page);
			expect(result).not.toBeNull();
			expect(result!.title).toBe("About Us");
			expect(result!.slug).toBe("about-us");
			expect(result!.seoTitle).toBe("About");
			expect(result!.seoDescription).toBe("About us");
			expect(result!.ogImageUrl).toBe("https://cdn.example.com/og.jpg");
			expect(result!.templateRegion).toBe("about");
		});

		it("returns null for draft pages", () => {
			const page = makePage({ status: "draft" });
			expect(service.toStorefrontPage(page)).toBeNull();
		});

		it("returns null for archived pages", () => {
			const page = makePage({ status: "archived" });
			expect(service.toStorefrontPage(page)).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// Event name for transition
	// -----------------------------------------------------------------------

	describe("getEventNameForTransition", () => {
		it("returns publish event for draft → published", () => {
			expect(
				service.getEventNameForTransition("draft", "published")
			).toBe(domainEvents.contentPagePublished);
		});

		it("returns archive event for published → archived", () => {
			expect(
				service.getEventNameForTransition("published", "archived")
			).toBe(domainEvents.contentPageArchived);
		});

		it("returns null for published → draft (unpublish)", () => {
			expect(
				service.getEventNameForTransition("published", "draft")
			).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// Template regions
	// -----------------------------------------------------------------------

	describe("getTemplateRegions", () => {
		it("returns the known template regions", () => {
			const regions = service.getTemplateRegions();
			expect(regions).toEqual(templateRegions);
			expect(regions.length).toBeGreaterThan(0);
			expect(regions).toContain("hero");
			expect(regions).toContain("about");
		});
	});
});
