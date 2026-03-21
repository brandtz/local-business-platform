import { describe, expect, it } from "vitest";

import {
	assertValidContentListQuery,
	assertValidCreateAnnouncementRequest,
	assertValidCreateContentPageRequest,
	assertValidStorefrontSlug,
	assertValidUpdateAnnouncementRequest,
	assertValidUpdateContentPageRequest,
	ContentApiContractError,
} from "./content-api-contracts";

describe("content API contracts", () => {
	// -----------------------------------------------------------------------
	// Create content page
	// -----------------------------------------------------------------------

	describe("assertValidCreateContentPageRequest", () => {
		it("accepts a valid create content page payload", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: { blocks: [{ type: "text", content: "Hello" }] },
					slug: "about-us",
					title: "About Us",
				})
			).not.toThrow();
		});

		it("accepts optional SEO and template fields", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: { blocks: [] },
					ogImageUrl: "https://cdn.example.com/og.jpg",
					seoDescription: "Learn about our company",
					seoTitle: "About | Our Company",
					slug: "about-us",
					templateRegion: "hero",
					title: "About Us",
				})
			).not.toThrow();
		});

		it("accepts null optional fields", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: { blocks: [] },
					ogImageUrl: null,
					seoDescription: null,
					seoTitle: null,
					slug: "about-us",
					templateRegion: null,
					title: "About Us",
				})
			).not.toThrow();
		});

		it("rejects non-object payload", () => {
			expect(() =>
				assertValidCreateContentPageRequest("string")
			).toThrow(ContentApiContractError);
			expect(() =>
				assertValidCreateContentPageRequest(null)
			).toThrow(ContentApiContractError);
		});

		it("rejects missing title", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: {},
					slug: "about",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects empty title", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: {},
					slug: "about",
					title: "",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects missing slug", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: {},
					title: "About",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects invalid slug format", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: {},
					slug: "INVALID SLUG!",
					title: "About",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects missing body", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					slug: "about",
					title: "About",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects null body", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: null,
					slug: "about",
					title: "About",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects non-string seoTitle", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: {},
					seoTitle: 123,
					slug: "about",
					title: "About",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects non-string ogImageUrl", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: {},
					ogImageUrl: 123,
					slug: "about",
					title: "About",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects non-string templateRegion", () => {
			expect(() =>
				assertValidCreateContentPageRequest({
					body: {},
					slug: "about",
					templateRegion: 123,
					title: "About",
				})
			).toThrow(ContentApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Update content page
	// -----------------------------------------------------------------------

	describe("assertValidUpdateContentPageRequest", () => {
		it("accepts a valid update content page payload", () => {
			expect(() =>
				assertValidUpdateContentPageRequest({ title: "Updated Title" })
			).not.toThrow();
		});

		it("accepts update with body and SEO fields", () => {
			expect(() =>
				assertValidUpdateContentPageRequest({
					body: { blocks: [{ type: "heading", content: "New" }] },
					seoDescription: "Updated description",
					seoTitle: "Updated SEO Title",
				})
			).not.toThrow();
		});

		it("accepts empty object (no-op update)", () => {
			expect(() =>
				assertValidUpdateContentPageRequest({})
			).not.toThrow();
		});

		it("rejects non-object payload", () => {
			expect(() =>
				assertValidUpdateContentPageRequest("string")
			).toThrow(ContentApiContractError);
		});

		it("rejects empty title", () => {
			expect(() =>
				assertValidUpdateContentPageRequest({ title: "" })
			).toThrow(ContentApiContractError);
		});

		it("rejects empty slug", () => {
			expect(() =>
				assertValidUpdateContentPageRequest({ slug: "" })
			).toThrow(ContentApiContractError);
		});

		it("rejects invalid slug format on update", () => {
			expect(() =>
				assertValidUpdateContentPageRequest({ slug: "BAD SLUG" })
			).toThrow(ContentApiContractError);
		});

		it("accepts valid slug on update", () => {
			expect(() =>
				assertValidUpdateContentPageRequest({ slug: "new-slug" })
			).not.toThrow();
		});

		it("rejects non-string seoDescription", () => {
			expect(() =>
				assertValidUpdateContentPageRequest({ seoDescription: 123 })
			).toThrow(ContentApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Content list query
	// -----------------------------------------------------------------------

	describe("assertValidContentListQuery", () => {
		it("accepts a valid query", () => {
			expect(() =>
				assertValidContentListQuery({ page: 1, pageSize: 20 })
			).not.toThrow();
		});

		it("accepts empty query", () => {
			expect(() => assertValidContentListQuery({})).not.toThrow();
		});

		it("accepts query with status filter", () => {
			expect(() =>
				assertValidContentListQuery({ status: "published" })
			).not.toThrow();
		});

		it("accepts query with search filter", () => {
			expect(() =>
				assertValidContentListQuery({ search: "about" })
			).not.toThrow();
		});

		it("rejects page less than 1", () => {
			expect(() =>
				assertValidContentListQuery({ page: 0 })
			).toThrow(ContentApiContractError);
		});

		it("rejects non-integer page", () => {
			expect(() =>
				assertValidContentListQuery({ page: 1.5 })
			).toThrow(ContentApiContractError);
		});

		it("rejects pageSize greater than 100", () => {
			expect(() =>
				assertValidContentListQuery({ pageSize: 200 })
			).toThrow(ContentApiContractError);
		});

		it("rejects pageSize less than 1", () => {
			expect(() =>
				assertValidContentListQuery({ pageSize: 0 })
			).toThrow(ContentApiContractError);
		});

		it("rejects invalid status", () => {
			expect(() =>
				assertValidContentListQuery({ status: "invalid" })
			).toThrow(ContentApiContractError);
		});

		it("rejects non-string search", () => {
			expect(() =>
				assertValidContentListQuery({ search: 123 })
			).toThrow(ContentApiContractError);
		});

		it("rejects non-object query", () => {
			expect(() => assertValidContentListQuery("string")).toThrow(
				ContentApiContractError
			);
		});
	});

	// -----------------------------------------------------------------------
	// Storefront slug
	// -----------------------------------------------------------------------

	describe("assertValidStorefrontSlug", () => {
		it("accepts a valid slug", () => {
			expect(() => assertValidStorefrontSlug("about-us")).not.toThrow();
		});

		it("rejects empty string", () => {
			expect(() => assertValidStorefrontSlug("")).toThrow(
				ContentApiContractError
			);
		});

		it("rejects invalid slug format", () => {
			expect(() => assertValidStorefrontSlug("BAD SLUG")).toThrow(
				ContentApiContractError
			);
		});

		it("rejects non-string value", () => {
			expect(() => assertValidStorefrontSlug(123)).toThrow(
				ContentApiContractError
			);
		});

		it("rejects undefined", () => {
			expect(() => assertValidStorefrontSlug(undefined)).toThrow(
				ContentApiContractError
			);
		});
	});

	// -----------------------------------------------------------------------
	// Create announcement
	// -----------------------------------------------------------------------

	describe("assertValidCreateAnnouncementRequest", () => {
		it("accepts a valid create announcement payload", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "50% off everything!",
					title: "Summer Sale",
				})
			).not.toThrow();
		});

		it("accepts optional fields", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "Big sale!",
					displayPriority: 10,
					endDate: "2026-06-30",
					placement: "banner",
					startDate: "2026-06-01",
					title: "Summer Sale",
				})
			).not.toThrow();
		});

		it("accepts null date fields", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "Sale!",
					endDate: null,
					startDate: null,
					title: "Sale",
				})
			).not.toThrow();
		});

		it("rejects non-object payload", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest("string")
			).toThrow(ContentApiContractError);
			expect(() =>
				assertValidCreateAnnouncementRequest(null)
			).toThrow(ContentApiContractError);
		});

		it("rejects missing title", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "content",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects empty title", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "content",
					title: "",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects missing body", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					title: "Sale",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects empty body", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "",
					title: "Sale",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects invalid placement", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "content",
					placement: "invalid",
					title: "Sale",
				})
			).toThrow(ContentApiContractError);
		});

		it("accepts all valid placement types", () => {
			for (const placement of ["banner", "popup", "inline"]) {
				expect(() =>
					assertValidCreateAnnouncementRequest({
						body: "content",
						placement,
						title: "Sale",
					})
				).not.toThrow();
			}
		});

		it("rejects negative displayPriority", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "content",
					displayPriority: -1,
					title: "Sale",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects non-integer displayPriority", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "content",
					displayPriority: 1.5,
					title: "Sale",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects endDate before startDate", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "content",
					endDate: "2026-05-01",
					startDate: "2026-06-01",
					title: "Sale",
				})
			).toThrow(ContentApiContractError);
		});

		it("rejects non-string startDate", () => {
			expect(() =>
				assertValidCreateAnnouncementRequest({
					body: "content",
					startDate: 123,
					title: "Sale",
				})
			).toThrow(ContentApiContractError);
		});
	});

	// -----------------------------------------------------------------------
	// Update announcement
	// -----------------------------------------------------------------------

	describe("assertValidUpdateAnnouncementRequest", () => {
		it("accepts a valid update announcement payload", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({ title: "Updated" })
			).not.toThrow();
		});

		it("accepts empty object (no-op update)", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({})
			).not.toThrow();
		});

		it("accepts isActive update", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({ isActive: false })
			).not.toThrow();
		});

		it("accepts placement update", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({ placement: "popup" })
			).not.toThrow();
		});

		it("rejects non-object payload", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest("string")
			).toThrow(ContentApiContractError);
		});

		it("rejects empty title", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({ title: "" })
			).toThrow(ContentApiContractError);
		});

		it("rejects empty body", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({ body: "" })
			).toThrow(ContentApiContractError);
		});

		it("rejects invalid placement", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({ placement: "invalid" })
			).toThrow(ContentApiContractError);
		});

		it("rejects non-boolean isActive", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({ isActive: "yes" })
			).toThrow(ContentApiContractError);
		});

		it("rejects negative displayPriority", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({ displayPriority: -1 })
			).toThrow(ContentApiContractError);
		});

		it("rejects non-string startDate", () => {
			expect(() =>
				assertValidUpdateAnnouncementRequest({ startDate: 123 })
			).toThrow(ContentApiContractError);
		});
	});
});
