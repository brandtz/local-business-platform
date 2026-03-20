import { describe, expect, it } from "vitest";

import { ContentPageService, ContentPageError } from "./content-page.service";
import type { ContentPageRecord } from "@platform/types";

function makePage(overrides: Partial<ContentPageRecord> = {}): ContentPageRecord {
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

describe("ContentPageService", () => {
	const service = new ContentPageService();

	describe("validateCreate", () => {
		it("accepts valid input", () => {
			const result = service.validateCreate(
				{ tenantId: "t1", title: "About", slug: "about", body: { blocks: [] } },
				[]
			);
			expect(result.valid).toBe(true);
		});

		it("rejects empty title", () => {
			const result = service.validateCreate(
				{ tenantId: "t1", title: "", slug: "about", body: {} },
				[]
			);
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "title", reason: "empty" });
			}
		});

		it("rejects empty slug", () => {
			const result = service.validateCreate(
				{ tenantId: "t1", title: "About", slug: "", body: {} },
				[]
			);
			expect(result.valid).toBe(false);
		});

		it("rejects invalid slug format", () => {
			const result = service.validateCreate(
				{ tenantId: "t1", title: "About", slug: "INVALID SLUG!", body: {} },
				[]
			);
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "slug", reason: "invalid-format" });
			}
		});

		it("rejects duplicate slug", () => {
			const result = service.validateCreate(
				{ tenantId: "t1", title: "About", slug: "about", body: {} },
				["about"]
			);
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({ field: "slug", reason: "duplicate" });
			}
		});

		it("rejects null body", () => {
			const result = service.validateCreate(
				{ tenantId: "t1", title: "About", slug: "about", body: null as unknown },
				[]
			);
			expect(result.valid).toBe(false);
		});
	});

	describe("status transitions", () => {
		it("allows draft → published", () => {
			expect(service.validateStatusTransition("draft", "published")).toBe(true);
		});

		it("allows published → draft", () => {
			expect(service.validateStatusTransition("published", "draft")).toBe(true);
		});

		it("allows published → archived", () => {
			expect(service.validateStatusTransition("published", "archived")).toBe(true);
		});

		it("rejects draft → archived", () => {
			expect(service.validateStatusTransition("draft", "archived")).toBe(false);
		});

		it("rejects archived → draft", () => {
			expect(service.validateStatusTransition("archived", "draft")).toBe(false);
		});

		it("throws on invalid transition via require", () => {
			expect(() => service.requireStatusTransition("archived", "draft")).toThrow(
				ContentPageError
			);
		});
	});

	describe("computeSortOrderForAppend", () => {
		it("returns 0 for empty array", () => {
			expect(service.computeSortOrderForAppend([])).toBe(0);
		});

		it("returns max + 1", () => {
			const pages = [makePage({ sortOrder: 3 }), makePage({ sortOrder: 7 })];
			expect(service.computeSortOrderForAppend(pages)).toBe(8);
		});
	});

	describe("filterByStatus", () => {
		it("filters by tenant and status", () => {
			const pages = [
				makePage({ tenantId: "t1", status: "draft" }),
				makePage({ tenantId: "t1", status: "published", id: "page-2" }),
				makePage({ tenantId: "t2", status: "draft", id: "page-3" }),
			];
			const result = service.filterByStatus(pages, "t1", "draft");
			expect(result).toHaveLength(1);
			expect(result[0]!.id).toBe("page-1");
		});
	});

	describe("filterPublishedBySlug", () => {
		it("finds published page by slug", () => {
			const pages = [
				makePage({ status: "published", slug: "about-us" }),
				makePage({ status: "draft", slug: "about-us", id: "page-2" }),
			];
			const result = service.filterPublishedBySlug(pages, "t1", "about-us");
			expect(result).toBeDefined();
			expect(result!.status).toBe("published");
		});

		it("returns undefined when not found", () => {
			const result = service.filterPublishedBySlug([], "t1", "nope");
			expect(result).toBeUndefined();
		});
	});

	describe("filterByTemplateRegion", () => {
		it("returns published pages for region", () => {
			const pages = [
				makePage({ status: "published", templateRegion: "hero" }),
				makePage({ status: "draft", templateRegion: "hero", id: "page-2" }),
				makePage({ status: "published", templateRegion: "about", id: "page-3" }),
			];
			const result = service.filterByTemplateRegion(pages, "t1", "hero");
			expect(result).toHaveLength(1);
		});
	});
});
