import { describe, expect, it } from "vitest";

import type {
	PortfolioProjectMediaRecord,
	PortfolioProjectRecord
} from "@platform/types";

import { PortfolioStorefrontService } from "./portfolio-storefront.service";

const service = new PortfolioStorefrontService();

const tenantId = "tenant-1";

const projects: PortfolioProjectRecord[] = [
	{
		id: "proj-1",
		tenantId,
		title: "Kitchen Remodel",
		description: { blocks: [{ type: "paragraph", text: "Complete kitchen renovation" }] },
		projectDate: "2025-06-15",
		location: "Portland, OR",
		serviceCategories: ["Roofing", "Gutters"],
		status: "published",
		sortOrder: 0,
		isFeatured: true,
		testimonialQuote: "Excellent work!",
		testimonialAttribution: "John Doe",
		testimonialRating: 5,
		createdAt: "2025-01-01T00:00:00Z",
		updatedAt: "2025-01-01T00:00:00Z",
	},
	{
		id: "proj-2",
		tenantId,
		title: "Roof Replacement",
		description: { blocks: [{ type: "paragraph", text: "Full roof tear-off" }] },
		projectDate: "2025-07-20",
		location: "Seattle, WA",
		serviceCategories: ["Roofing"],
		status: "published",
		sortOrder: 1,
		isFeatured: false,
		testimonialQuote: null,
		testimonialAttribution: null,
		testimonialRating: null,
		createdAt: "2025-02-01T00:00:00Z",
		updatedAt: "2025-02-01T00:00:00Z",
	},
	{
		id: "proj-3",
		tenantId,
		title: "Draft Gutter Work",
		description: { blocks: [] },
		projectDate: null,
		location: null,
		serviceCategories: ["Gutters"],
		status: "draft",
		sortOrder: 2,
		isFeatured: false,
		testimonialQuote: null,
		testimonialAttribution: null,
		testimonialRating: null,
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-01T00:00:00Z",
	},
	{
		id: "proj-4",
		tenantId,
		title: "Gutter Install",
		description: { blocks: [] },
		projectDate: "2025-08-01",
		location: "Boise, ID",
		serviceCategories: ["Gutters"],
		status: "published",
		sortOrder: 3,
		isFeatured: true,
		testimonialQuote: "Great service",
		testimonialAttribution: "Jane Smith",
		testimonialRating: 4,
		createdAt: "2025-04-01T00:00:00Z",
		updatedAt: "2025-04-01T00:00:00Z",
	},
];

const media: PortfolioProjectMediaRecord[] = [
	{ id: "m-1", projectId: "proj-1", url: "/img/before.jpg", altText: "Before", caption: "Before work", tag: "before", sortOrder: 0 },
	{ id: "m-2", projectId: "proj-1", url: "/img/after.jpg", altText: "After", caption: "After work", tag: "after", sortOrder: 1 },
	{ id: "m-3", projectId: "proj-2", url: "/img/roof.jpg", altText: null, caption: null, tag: "general", sortOrder: 0 },
	{ id: "m-4", projectId: "proj-4", url: "/img/gutter.jpg", altText: "Gutter", caption: null, tag: "general", sortOrder: 0 },
];

describe("portfolio storefront service", () => {
	describe("assemblePublishedProjects", () => {
		it("returns only published projects for tenant", () => {
			const result = service.assemblePublishedProjects(projects, media, tenantId);
			expect(result.items).toHaveLength(3);
			expect(result.items.every((i) => i.id !== "proj-3")).toBe(true);
			expect(result.total).toBe(3);
		});

		it("paginates correctly", () => {
			const result = service.assemblePublishedProjects(projects, media, tenantId, {
				page: 1,
				pageSize: 2,
			});
			expect(result.items).toHaveLength(2);
			expect(result.total).toBe(3);
			expect(result.page).toBe(1);
			expect(result.pageSize).toBe(2);
		});

		it("returns second page", () => {
			const result = service.assemblePublishedProjects(projects, media, tenantId, {
				page: 2,
				pageSize: 2,
			});
			expect(result.items).toHaveLength(1);
			expect(result.items[0].id).toBe("proj-4");
		});

		it("filters by category", () => {
			const result = service.assemblePublishedProjects(projects, media, tenantId, {
				category: "Gutters",
			});
			expect(result.items).toHaveLength(2);
			expect(result.items[0].id).toBe("proj-1");
			expect(result.items[1].id).toBe("proj-4");
		});

		it("category filter is case-insensitive", () => {
			const result = service.assemblePublishedProjects(projects, media, tenantId, {
				category: "gutters",
			});
			expect(result.items).toHaveLength(2);
		});

		it("assembles media for each project", () => {
			const result = service.assemblePublishedProjects(projects, media, tenantId);
			const proj1 = result.items.find((i) => i.id === "proj-1");
			expect(proj1!.media).toHaveLength(2);
			expect(proj1!.media[0].tag).toBe("before");
			expect(proj1!.media[1].tag).toBe("after");
		});

		it("assembles testimonial when present", () => {
			const result = service.assemblePublishedProjects(projects, media, tenantId);
			const proj1 = result.items.find((i) => i.id === "proj-1");
			expect(proj1!.testimonial).toEqual({
				attribution: "John Doe",
				quote: "Excellent work!",
				rating: 5,
			});
		});

		it("returns null testimonial when missing", () => {
			const result = service.assemblePublishedProjects(projects, media, tenantId);
			const proj2 = result.items.find((i) => i.id === "proj-2");
			expect(proj2!.testimonial).toBeNull();
		});

		it("scopes to tenant", () => {
			const otherProject: PortfolioProjectRecord = {
				...projects[0],
				id: "proj-other",
				tenantId: "tenant-2",
			};
			const result = service.assemblePublishedProjects(
				[...projects, otherProject],
				media,
				tenantId
			);
			expect(result.items.every((p) => p.id !== "proj-other")).toBe(true);
		});
	});

	describe("assembleFeaturedProjects", () => {
		it("returns only featured, published projects", () => {
			const result = service.assembleFeaturedProjects(projects, media, tenantId);
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("proj-1");
			expect(result[1].id).toBe("proj-4");
		});

		it("includes media in featured projects", () => {
			const result = service.assembleFeaturedProjects(projects, media, tenantId);
			expect(result[0].media).toHaveLength(2);
		});

		it("excludes draft projects even if featured", () => {
			const draftFeatured: PortfolioProjectRecord = {
				...projects[2],
				isFeatured: true,
			};
			const result = service.assembleFeaturedProjects(
				[...projects.slice(0, 2), draftFeatured, projects[3]],
				media,
				tenantId
			);
			expect(result.every((p) => p.id !== "proj-3")).toBe(true);
		});
	});

	describe("assembleProjectDetail", () => {
		it("returns full project detail for published project", () => {
			const result = service.assembleProjectDetail(projects[0], media);
			expect(result).not.toBeNull();
			expect(result!.title).toBe("Kitchen Remodel");
			expect(result!.media).toHaveLength(2);
			expect(result!.testimonial).toEqual({
				attribution: "John Doe",
				quote: "Excellent work!",
				rating: 5,
			});
			expect(result!.location).toBe("Portland, OR");
			expect(result!.projectDate).toBe("2025-06-15");
		});

		it("returns null for draft project", () => {
			const result = service.assembleProjectDetail(projects[2], media);
			expect(result).toBeNull();
		});

		it("includes service categories", () => {
			const result = service.assembleProjectDetail(projects[0], media);
			expect(result!.serviceCategories).toEqual(["Roofing", "Gutters"]);
		});
	});
});
