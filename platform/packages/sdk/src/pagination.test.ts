import { describe, expect, it, vi } from "vitest";

import { paginated, type PaginatedResponse } from "./pagination";

function makePage<T>(data: T[], page: number, total: number, pageSize = 2): PaginatedResponse<T> {
	return {
		data,
		total,
		page,
		pageSize,
		hasMore: page * pageSize < total,
	};
}

describe("paginated helper", () => {
	describe("getPage", () => {
		it("fetches a single page with defaults", async () => {
			const fetcher = vi.fn().mockResolvedValue(makePage(["a", "b"], 1, 4));
			const paged = paginated(fetcher);

			const result = await paged.getPage();

			expect(fetcher).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
			expect(result.data).toEqual(["a", "b"]);
		});

		it("fetches a specific page and page size", async () => {
			const fetcher = vi.fn().mockResolvedValue(makePage(["c"], 2, 3, 2));
			const paged = paginated(fetcher);

			const result = await paged.getPage(2, 2);

			expect(fetcher).toHaveBeenCalledWith({ page: 2, pageSize: 2 });
			expect(result.data).toEqual(["c"]);
			expect(result.hasMore).toBe(false);
		});
	});

	describe("getAll", () => {
		it("collects all items across multiple pages", async () => {
			const fetcher = vi
				.fn()
				.mockResolvedValueOnce(makePage(["a", "b"], 1, 5))
				.mockResolvedValueOnce(makePage(["c", "d"], 2, 5))
				.mockResolvedValueOnce(makePage(["e"], 3, 5));

			const paged = paginated(fetcher);
			const all = await paged.getAll(2);

			expect(all).toEqual(["a", "b", "c", "d", "e"]);
			expect(fetcher).toHaveBeenCalledTimes(3);
		});

		it("returns empty array when first page has no items", async () => {
			const fetcher = vi.fn().mockResolvedValue({
				data: [],
				total: 0,
				page: 1,
				pageSize: 20,
				hasMore: false,
			});

			const paged = paginated(fetcher);
			const all = await paged.getAll();

			expect(all).toEqual([]);
			expect(fetcher).toHaveBeenCalledTimes(1);
		});
	});

	describe("pages generator", () => {
		it("yields pages one at a time", async () => {
			const fetcher = vi
				.fn()
				.mockResolvedValueOnce(makePage([1, 2], 1, 4))
				.mockResolvedValueOnce(makePage([3, 4], 2, 4));

			const paged = paginated<number>(fetcher);
			const pages: PaginatedResponse<number>[] = [];

			for await (const page of paged.pages(2)) {
				pages.push(page);
			}

			expect(pages).toHaveLength(2);
			expect(pages[0].data).toEqual([1, 2]);
			expect(pages[1].data).toEqual([3, 4]);
		});

		it("stops after a single page when hasMore is false", async () => {
			const fetcher = vi.fn().mockResolvedValue(makePage(["only"], 1, 1));

			const paged = paginated<string>(fetcher);
			const pages: PaginatedResponse<string>[] = [];

			for await (const page of paged.pages()) {
				pages.push(page);
			}

			expect(pages).toHaveLength(1);
		});
	});
});
