import { describe, expect, it } from "vitest";

import {
	PortfolioApiContractError,
	assertValidCreatePortfolioProjectRequest,
	assertValidUpdatePortfolioProjectRequest,
	assertValidPublishStateToggle,
	assertValidCreatePortfolioMediaRequest,
	assertValidUpdatePortfolioMediaRequest,
	assertValidReorderPortfolioMediaRequest,
	assertValidPortfolioAdminListQuery,
} from "./portfolio-api-contracts";

describe("portfolio api contracts", () => {
	// ── Create Project ────────────────────────────────────────────────────
	describe("assertValidCreatePortfolioProjectRequest", () => {
		it("accepts valid create project payload", () => {
			expect(() =>
				assertValidCreatePortfolioProjectRequest({
					title: "My Project",
					description: { blocks: [] },
				})
			).not.toThrow();
		});

		it("accepts full payload with all optional fields", () => {
			expect(() =>
				assertValidCreatePortfolioProjectRequest({
					title: "My Project",
					description: { blocks: [] },
					location: "Portland, OR",
					projectDate: "2025-06-15",
					serviceCategories: ["Roofing"],
					testimonialQuote: "Great work!",
					testimonialAttribution: "John Doe",
					testimonialRating: 5,
					isFeatured: true,
				})
			).not.toThrow();
		});

		it("rejects non-object payload", () => {
			expect(() => assertValidCreatePortfolioProjectRequest("not-an-object")).toThrow(
				PortfolioApiContractError
			);
		});

		it("rejects missing title", () => {
			expect(() =>
				assertValidCreatePortfolioProjectRequest({
					description: { blocks: [] },
				})
			).toThrow(PortfolioApiContractError);
		});

		it("rejects missing description", () => {
			expect(() =>
				assertValidCreatePortfolioProjectRequest({
					title: "My Project",
				})
			).toThrow(PortfolioApiContractError);
		});

		it("rejects invalid testimonialRating", () => {
			expect(() =>
				assertValidCreatePortfolioProjectRequest({
					title: "My Project",
					description: { blocks: [] },
					testimonialRating: 6,
				})
			).toThrow(PortfolioApiContractError);
		});

		it("rejects non-boolean isFeatured", () => {
			expect(() =>
				assertValidCreatePortfolioProjectRequest({
					title: "My Project",
					description: { blocks: [] },
					isFeatured: "yes",
				})
			).toThrow(PortfolioApiContractError);
		});
	});

	// ── Update Project ────────────────────────────────────────────────────
	describe("assertValidUpdatePortfolioProjectRequest", () => {
		it("accepts valid update payload", () => {
			expect(() =>
				assertValidUpdatePortfolioProjectRequest({ title: "Updated Title" })
			).not.toThrow();
		});

		it("accepts empty object", () => {
			expect(() =>
				assertValidUpdatePortfolioProjectRequest({})
			).not.toThrow();
		});

		it("rejects non-object payload", () => {
			expect(() =>
				assertValidUpdatePortfolioProjectRequest(42)
			).toThrow(PortfolioApiContractError);
		});

		it("rejects empty title string", () => {
			expect(() =>
				assertValidUpdatePortfolioProjectRequest({ title: "" })
			).toThrow(PortfolioApiContractError);
		});
	});

	// ── Publish State Toggle ──────────────────────────────────────────────
	describe("assertValidPublishStateToggle", () => {
		it("accepts draft status", () => {
			expect(() =>
				assertValidPublishStateToggle({ status: "draft" })
			).not.toThrow();
		});

		it("accepts published status", () => {
			expect(() =>
				assertValidPublishStateToggle({ status: "published" })
			).not.toThrow();
		});

		it("rejects invalid status", () => {
			expect(() =>
				assertValidPublishStateToggle({ status: "archived" })
			).toThrow(PortfolioApiContractError);
		});

		it("rejects non-object", () => {
			expect(() =>
				assertValidPublishStateToggle("published")
			).toThrow(PortfolioApiContractError);
		});
	});

	// ── Create Media ──────────────────────────────────────────────────────
	describe("assertValidCreatePortfolioMediaRequest", () => {
		it("accepts valid media payload", () => {
			expect(() =>
				assertValidCreatePortfolioMediaRequest({
					url: "/img/photo.jpg",
				})
			).not.toThrow();
		});

		it("accepts full media payload", () => {
			expect(() =>
				assertValidCreatePortfolioMediaRequest({
					url: "/img/photo.jpg",
					altText: "Photo description",
					caption: "Before renovation",
					sortOrder: 0,
					tag: "before",
				})
			).not.toThrow();
		});

		it("rejects empty url", () => {
			expect(() =>
				assertValidCreatePortfolioMediaRequest({ url: "" })
			).toThrow(PortfolioApiContractError);
		});

		it("rejects invalid tag", () => {
			expect(() =>
				assertValidCreatePortfolioMediaRequest({
					url: "/img/photo.jpg",
					tag: "invalid",
				})
			).toThrow(PortfolioApiContractError);
		});

		it("rejects negative sortOrder", () => {
			expect(() =>
				assertValidCreatePortfolioMediaRequest({
					url: "/img/photo.jpg",
					sortOrder: -1,
				})
			).toThrow(PortfolioApiContractError);
		});
	});

	// ── Update Media ──────────────────────────────────────────────────────
	describe("assertValidUpdatePortfolioMediaRequest", () => {
		it("accepts valid update payload", () => {
			expect(() =>
				assertValidUpdatePortfolioMediaRequest({ caption: "Updated caption" })
			).not.toThrow();
		});

		it("accepts empty object", () => {
			expect(() =>
				assertValidUpdatePortfolioMediaRequest({})
			).not.toThrow();
		});

		it("rejects invalid tag", () => {
			expect(() =>
				assertValidUpdatePortfolioMediaRequest({ tag: "unknown" })
			).toThrow(PortfolioApiContractError);
		});
	});

	// ── Reorder Media ─────────────────────────────────────────────────────
	describe("assertValidReorderPortfolioMediaRequest", () => {
		it("accepts valid reorder payload", () => {
			expect(() =>
				assertValidReorderPortfolioMediaRequest({
					mediaIds: ["id-1", "id-2", "id-3"],
				})
			).not.toThrow();
		});

		it("rejects empty mediaIds", () => {
			expect(() =>
				assertValidReorderPortfolioMediaRequest({ mediaIds: [] })
			).toThrow(PortfolioApiContractError);
		});

		it("rejects non-array mediaIds", () => {
			expect(() =>
				assertValidReorderPortfolioMediaRequest({ mediaIds: "id-1" })
			).toThrow(PortfolioApiContractError);
		});

		it("rejects non-object payload", () => {
			expect(() =>
				assertValidReorderPortfolioMediaRequest(null)
			).toThrow(PortfolioApiContractError);
		});
	});

	// ── Admin List Query ──────────────────────────────────────────────────
	describe("assertValidPortfolioAdminListQuery", () => {
		it("accepts valid query", () => {
			expect(() =>
				assertValidPortfolioAdminListQuery({
					page: 1,
					pageSize: 20,
					status: "published",
					search: "roof",
				})
			).not.toThrow();
		});

		it("accepts empty object", () => {
			expect(() =>
				assertValidPortfolioAdminListQuery({})
			).not.toThrow();
		});

		it("rejects page less than 1", () => {
			expect(() =>
				assertValidPortfolioAdminListQuery({ page: 0 })
			).toThrow(PortfolioApiContractError);
		});

		it("rejects pageSize over 100", () => {
			expect(() =>
				assertValidPortfolioAdminListQuery({ pageSize: 101 })
			).toThrow(PortfolioApiContractError);
		});

		it("rejects invalid status", () => {
			expect(() =>
				assertValidPortfolioAdminListQuery({ status: "archived" })
			).toThrow(PortfolioApiContractError);
		});
	});
});
