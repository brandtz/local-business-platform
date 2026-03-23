// Pagination helper for list endpoints that return cursor/offset paged data.

export type PaginatedResponse<T> = {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
};

export type PaginationParams = {
	page?: number;
	pageSize?: number;
};

export type PaginatedFetcher<T> = (params: PaginationParams) => Promise<PaginatedResponse<T>>;

/**
 * Wraps a list method so callers can iterate page-by-page or collect all items.
 */
export function paginated<T>(fetcher: PaginatedFetcher<T>) {
	return {
		/** Fetch a single page. */
		async getPage(page = 1, pageSize = 20): Promise<PaginatedResponse<T>> {
			return fetcher({ page, pageSize });
		},

		/** Fetch all items across every page. */
		async getAll(pageSize = 20): Promise<T[]> {
			const items: T[] = [];
			let page = 1;
			let hasMore = true;

			while (hasMore) {
				const result = await fetcher({ page, pageSize });
				items.push(...result.data);
				hasMore = result.hasMore;
				page++;
			}

			return items;
		},

		/** Async generator that yields one page at a time. */
		async *pages(pageSize = 20): AsyncGenerator<PaginatedResponse<T>> {
			let page = 1;
			let hasMore = true;

			while (hasMore) {
				const result = await fetcher({ page, pageSize });
				yield result;
				hasMore = result.hasMore;
				page++;
			}
		},
	};
}
