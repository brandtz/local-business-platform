import { describe, expect, it } from "vitest";

import {
	portfolioMediaTags,
	portfolioProjectStatuses,
	validatePortfolioMediaInput,
	validatePortfolioProjectInput,
} from "./portfolio";

describe("portfolio types", () => {
	describe("constants", () => {
		it("defines portfolio project statuses", () => {
			expect(portfolioProjectStatuses).toEqual(["draft", "published"]);
		});

		it("defines portfolio media tags", () => {
			expect(portfolioMediaTags).toEqual(["before", "after", "general"]);
		});
	});

	describe("validatePortfolioProjectInput", () => {
		it("accepts valid input", () => {
			const result = validatePortfolioProjectInput({
				title: "My Project",
				description: { blocks: [] },
			});
			expect(result.valid).toBe(true);
		});

		it("rejects empty title", () => {
			const result = validatePortfolioProjectInput({
				title: "",
				description: { blocks: [] },
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "title", reason: "required" });
			}
		});

		it("rejects whitespace-only title", () => {
			const result = validatePortfolioProjectInput({
				title: "   ",
				description: { blocks: [] },
			});
			expect(result.valid).toBe(false);
		});

		it("rejects null description", () => {
			const result = validatePortfolioProjectInput({
				title: "Test",
				description: null as unknown,
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "description", reason: "required" });
			}
		});

		it("rejects undefined description", () => {
			const result = validatePortfolioProjectInput({
				title: "Test",
				description: undefined as unknown,
			});
			expect(result.valid).toBe(false);
		});

		it("accepts testimonialRating 1-5", () => {
			for (const rating of [1, 2, 3, 4, 5]) {
				const result = validatePortfolioProjectInput({
					title: "Test",
					description: {},
					testimonialRating: rating,
				});
				expect(result.valid).toBe(true);
			}
		});

		it("rejects testimonialRating 0", () => {
			const result = validatePortfolioProjectInput({
				title: "Test",
				description: {},
				testimonialRating: 0,
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "testimonialRating", reason: "invalid-range" });
			}
		});

		it("rejects testimonialRating 6", () => {
			const result = validatePortfolioProjectInput({
				title: "Test",
				description: {},
				testimonialRating: 6,
			});
			expect(result.valid).toBe(false);
		});

		it("rejects fractional testimonialRating", () => {
			const result = validatePortfolioProjectInput({
				title: "Test",
				description: {},
				testimonialRating: 3.5,
			});
			expect(result.valid).toBe(false);
		});

		it("accepts null testimonialRating", () => {
			const result = validatePortfolioProjectInput({
				title: "Test",
				description: {},
				testimonialRating: null,
			});
			expect(result.valid).toBe(true);
		});

		it("accumulates multiple errors", () => {
			const result = validatePortfolioProjectInput({
				title: "",
				description: null as unknown,
				testimonialRating: 10,
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors.length).toBe(3);
			}
		});
	});

	describe("validatePortfolioMediaInput", () => {
		it("accepts valid input", () => {
			const result = validatePortfolioMediaInput({
				url: "/img/photo.jpg",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects empty url", () => {
			const result = validatePortfolioMediaInput({ url: "" });
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "url", reason: "required" });
			}
		});

		it("accepts valid tag values", () => {
			for (const tag of ["before", "after", "general"]) {
				const result = validatePortfolioMediaInput({
					url: "/img/photo.jpg",
					tag,
				});
				expect(result.valid).toBe(true);
			}
		});

		it("rejects invalid tag", () => {
			const result = validatePortfolioMediaInput({
				url: "/img/photo.jpg",
				tag: "invalid",
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "tag", reason: "invalid" });
			}
		});

		it("accepts undefined tag", () => {
			const result = validatePortfolioMediaInput({
				url: "/img/photo.jpg",
			});
			expect(result.valid).toBe(true);
		});
	});
});
