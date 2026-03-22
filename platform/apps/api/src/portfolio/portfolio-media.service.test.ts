import { describe, expect, it } from "vitest";

import type { PortfolioProjectMediaRecord } from "@platform/types";

import { PortfolioMediaError, PortfolioMediaService } from "./portfolio-media.service";

const service = new PortfolioMediaService();

const media: PortfolioProjectMediaRecord[] = [
	{
		id: "media-1",
		projectId: "proj-1",
		url: "/img/before.jpg",
		altText: "Before renovation",
		caption: "Kitchen before work began",
		tag: "before",
		sortOrder: 0,
	},
	{
		id: "media-2",
		projectId: "proj-1",
		url: "/img/after.jpg",
		altText: "After renovation",
		caption: "Kitchen after completion",
		tag: "after",
		sortOrder: 1,
	},
	{
		id: "media-3",
		projectId: "proj-1",
		url: "/img/detail.jpg",
		altText: null,
		caption: null,
		tag: "general",
		sortOrder: 2,
	},
];

describe("portfolio media service", () => {
	describe("validateCreate", () => {
		it("accepts valid media input", () => {
			const result = service.validateCreate({
				url: "/img/test.jpg",
				projectId: "proj-1",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects empty url", () => {
			const result = service.validateCreate({
				url: "",
				projectId: "proj-1",
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "url", reason: "required" });
			}
		});

		it("rejects invalid tag", () => {
			const result = service.validateCreate({
				url: "/img/test.jpg",
				projectId: "proj-1",
				tag: "invalid-tag",
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "tag", reason: "invalid" });
			}
		});

		it("accepts valid tag values", () => {
			for (const tag of ["before", "after", "general"]) {
				const result = service.validateCreate({
					url: "/img/test.jpg",
					projectId: "proj-1",
					tag,
				});
				expect(result.valid).toBe(true);
			}
		});
	});

	describe("sort order", () => {
		it("computes next sort order from existing media", () => {
			expect(service.computeSortOrderForAppend(media)).toBe(3);
		});

		it("returns 0 for empty list", () => {
			expect(service.computeSortOrderForAppend([])).toBe(0);
		});
	});

	describe("reorder", () => {
		it("validates correct reorder with all IDs", () => {
			expect(
				service.validateReorder(["media-3", "media-1", "media-2"], media)
			).toBe(true);
		});

		it("rejects reorder with missing IDs", () => {
			expect(service.validateReorder(["media-1", "media-2"], media)).toBe(false);
		});

		it("rejects reorder with extra IDs", () => {
			expect(
				service.validateReorder(
					["media-1", "media-2", "media-3", "media-4"],
					media
				)
			).toBe(false);
		});

		it("rejects reorder with unknown IDs", () => {
			expect(
				service.validateReorder(["media-1", "media-2", "unknown"], media)
			).toBe(false);
		});

		it("requireValidReorder throws on invalid reorder", () => {
			expect(() =>
				service.requireValidReorder(["media-1"], media)
			).toThrow(PortfolioMediaError);
		});

		it("applies reorder with updated sort orders", () => {
			const reordered = service.applyReorder(
				["media-3", "media-1", "media-2"],
				media
			);
			expect(reordered[0].id).toBe("media-3");
			expect(reordered[0].sortOrder).toBe(0);
			expect(reordered[1].id).toBe("media-1");
			expect(reordered[1].sortOrder).toBe(1);
			expect(reordered[2].id).toBe("media-2");
			expect(reordered[2].sortOrder).toBe(2);
		});
	});

	describe("sort media", () => {
		it("sorts by sortOrder ascending", () => {
			const reversed = [...media].reverse();
			const sorted = service.sortMedia(reversed);
			expect(sorted[0].id).toBe("media-1");
			expect(sorted[1].id).toBe("media-2");
			expect(sorted[2].id).toBe("media-3");
		});
	});
});
