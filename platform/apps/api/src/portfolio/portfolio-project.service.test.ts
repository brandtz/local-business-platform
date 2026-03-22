import { describe, expect, it } from "vitest";

import type { PortfolioProjectRecord } from "@platform/types";

import { PortfolioProjectError, PortfolioProjectService } from "./portfolio-project.service";

const service = new PortfolioProjectService();

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
		description: { blocks: [{ type: "paragraph", text: "Full roof tear-off and replacement" }] },
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
		title: "Draft Project",
		description: { blocks: [] },
		projectDate: null,
		location: null,
		serviceCategories: [],
		status: "draft",
		sortOrder: 2,
		isFeatured: false,
		testimonialQuote: null,
		testimonialAttribution: null,
		testimonialRating: null,
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-01T00:00:00Z",
	},
];

describe("portfolio project service", () => {
	describe("validateCreate", () => {
		it("accepts valid project input", () => {
			const result = service.validateCreate({
				title: "New Project",
				description: { blocks: [] },
				tenantId,
			});
			expect(result.valid).toBe(true);
		});

		it("rejects empty title", () => {
			const result = service.validateCreate({
				title: "",
				description: { blocks: [] },
				tenantId,
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "title", reason: "required" });
			}
		});

		it("rejects null description", () => {
			const result = service.validateCreate({
				title: "Test",
				description: null as unknown,
				tenantId,
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "description", reason: "required" });
			}
		});

		it("rejects invalid testimonial rating", () => {
			const result = service.validateCreate({
				title: "Test",
				description: { blocks: [] },
				tenantId,
				testimonialRating: 6,
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "testimonialRating", reason: "invalid-range" });
			}
		});

		it("rejects fractional testimonial rating", () => {
			const result = service.validateCreate({
				title: "Test",
				description: { blocks: [] },
				tenantId,
				testimonialRating: 3.5,
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "testimonialRating", reason: "invalid-range" });
			}
		});

		it("accepts valid testimonial rating 1-5", () => {
			for (const rating of [1, 2, 3, 4, 5]) {
				const result = service.validateCreate({
					title: "Test",
					description: { blocks: [] },
					tenantId,
					testimonialRating: rating,
				});
				expect(result.valid).toBe(true);
			}
		});
	});

	describe("status transitions", () => {
		it("allows draft to published", () => {
			expect(service.validateStatusTransition("draft", "published")).toBe(true);
		});

		it("allows published to draft", () => {
			expect(service.validateStatusTransition("published", "draft")).toBe(true);
		});

		it("rejects same-state transition", () => {
			expect(service.validateStatusTransition("draft", "draft")).toBe(false);
			expect(service.validateStatusTransition("published", "published")).toBe(false);
		});

		it("requireStatusTransition throws on invalid transition", () => {
			expect(() => service.requireStatusTransition("draft", "draft")).toThrow(
				PortfolioProjectError
			);
		});
	});

	describe("sort order", () => {
		it("computes next sort order from existing projects", () => {
			expect(service.computeSortOrderForAppend(projects)).toBe(3);
		});

		it("returns 0 for empty list", () => {
			expect(service.computeSortOrderForAppend([])).toBe(0);
		});
	});

	describe("featured designation", () => {
		it("allows when under limit", () => {
			expect(service.validateFeaturedDesignation(3, false)).toBe(true);
		});

		it("allows when already featured", () => {
			expect(service.validateFeaturedDesignation(6, true)).toBe(true);
		});

		it("rejects when at limit", () => {
			expect(service.validateFeaturedDesignation(6, false)).toBe(false);
		});

		it("requireFeaturedDesignation throws when at limit", () => {
			expect(() => service.requireFeaturedDesignation(6, false)).toThrow(
				PortfolioProjectError
			);
		});

		it("returns max featured projects constant", () => {
			expect(service.getMaxFeaturedProjects()).toBe(6);
		});
	});

	describe("filter projects", () => {
		it("filters by tenant", () => {
			const otherTenantProject: PortfolioProjectRecord = {
				...projects[0],
				id: "proj-other",
				tenantId: "tenant-2",
			};
			const result = service.filterProjects(
				[...projects, otherTenantProject],
				tenantId
			);
			expect(result.every((p) => p.tenantId === tenantId)).toBe(true);
			expect(result).toHaveLength(3);
		});

		it("filters by status", () => {
			const result = service.filterProjects(projects, tenantId, {
				status: "published",
			});
			expect(result).toHaveLength(2);
			expect(result.every((p) => p.status === "published")).toBe(true);
		});

		it("filters by search", () => {
			const result = service.filterProjects(projects, tenantId, {
				search: "kitchen",
			});
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe("Kitchen Remodel");
		});

		it("returns all for empty filter", () => {
			const result = service.filterProjects(projects, tenantId);
			expect(result).toHaveLength(3);
		});
	});

	describe("sort projects", () => {
		it("sorts by sortOrder ascending", () => {
			const reversed = [...projects].reverse();
			const sorted = service.sortProjects(reversed);
			expect(sorted[0].id).toBe("proj-1");
			expect(sorted[1].id).toBe("proj-2");
			expect(sorted[2].id).toBe("proj-3");
		});
	});
});
