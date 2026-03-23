// E13-S2-T2: Catalog / Menu Browse page — product grid with category filter,
// search, sort, pagination. Fetches data via SDK catalog API.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import type { CatalogItemRecord, Category, CatalogListResponse } from "@platform/types";

import { useSdk } from "../composables/use-sdk";

// ── Types ────────────────────────────────────────────────────────────────────

export type CatalogFilters = {
	search: string;
	category: string;
	sort: string;
	page: number;
	pageSize: number;
};

export const sortOptions = [
	{ value: "name_asc", label: "Name (A-Z)" },
	{ value: "name_desc", label: "Name (Z-A)" },
	{ value: "price_asc", label: "Price (Low-High)" },
	{ value: "price_desc", label: "Price (High-Low)" },
] as const;

export function createDefaultFilters(): CatalogFilters {
	return {
		search: "",
		category: "",
		sort: "name_asc",
		page: 1,
		pageSize: 12,
	};
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderSearchToolbar(
	filters: CatalogFilters,
	categories: Category[],
	onSearch: (value: string) => void,
	onCategoryChange: (value: string) => void,
	onSortChange: (value: string) => void,
): VNode {
	return h("div", { class: "catalog-toolbar", "data-testid": "catalog-toolbar" }, [
		h("div", { class: "catalog-toolbar__search" }, [
			h("input", {
				type: "search",
				class: "catalog-toolbar__search-input",
				placeholder: "Search products...",
				value: filters.search,
				"aria-label": "Search products",
				onInput: (e: Event) => onSearch((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "catalog-toolbar__filters" }, [
			h("select", {
				class: "catalog-toolbar__category-select",
				value: filters.category,
				"aria-label": "Filter by category",
				onChange: (e: Event) => onCategoryChange((e.target as HTMLSelectElement).value),
			}, [
				h("option", { value: "" }, "All Categories"),
				...categories.map((cat) =>
					h("option", { value: cat.id, key: cat.id }, cat.name)
				),
			]),
			h("select", {
				class: "catalog-toolbar__sort-select",
				value: filters.sort,
				"aria-label": "Sort by",
				onChange: (e: Event) => onSortChange((e.target as HTMLSelectElement).value),
			}, sortOptions.map((opt) =>
				h("option", { value: opt.value, key: opt.value }, opt.label)
			)),
		]),
	]);
}

function renderActiveFilters(
	filters: CatalogFilters,
	categories: Category[],
	onRemoveSearch: () => void,
	onRemoveCategory: () => void,
): VNode | null {
	const tags: VNode[] = [];

	if (filters.search) {
		tags.push(
			h("span", { class: "filter-tag", key: "search" }, [
				`Search: ${filters.search}`,
				h("button", {
					class: "filter-tag__remove",
					type: "button",
					"aria-label": "Remove search filter",
					onClick: onRemoveSearch,
				}, "×"),
			])
		);
	}

	if (filters.category) {
		const catName = categories.find((c) => c.id === filters.category)?.name ?? filters.category;
		tags.push(
			h("span", { class: "filter-tag", key: "category" }, [
				`Category: ${catName}`,
				h("button", {
					class: "filter-tag__remove",
					type: "button",
					"aria-label": "Remove category filter",
					onClick: onRemoveCategory,
				}, "×"),
			])
		);
	}

	if (tags.length === 0) return null;

	return h("div", { class: "catalog-active-filters", "data-testid": "active-filters" }, tags);
}

function renderProductCard(item: CatalogItemRecord): VNode {
	return h(RouterLink, {
		to: `/menu/${item.id}`,
		class: "product-card",
		key: item.id,
	}, {
		default: () => [
			h("div", { class: "product-card__content" }, [
				h("h3", { class: "product-card__name" }, item.name),
				item.description
					? h("p", { class: "product-card__description" }, item.description)
					: null,
				h("div", { class: "product-card__pricing" }, [
					h("span", { class: "product-card__price" },
						`$${(item.price / 100).toFixed(2)}`
					),
					item.compareAtPrice
						? h("span", { class: "product-card__compare-price" },
							`$${(item.compareAtPrice / 100).toFixed(2)}`
						)
						: null,
				]),
			]),
		],
	});
}

function renderProductGrid(items: CatalogItemRecord[]): VNode {
	if (items.length === 0) {
		return h("div", { class: "catalog-empty", "data-testid": "catalog-empty" }, [
			h("h3", "No products found"),
			h("p", "Try adjusting your search or filters."),
		]);
	}

	return h("div", { class: "catalog-grid", "data-testid": "catalog-grid" },
		items.map(renderProductCard)
	);
}

function renderPagination(
	currentPage: number,
	totalItems: number,
	pageSize: number,
	onPageChange: (page: number) => void,
): VNode | null {
	const totalPages = Math.ceil(totalItems / pageSize);
	if (totalPages <= 1) return null;

	const pages: VNode[] = [];
	for (let i = 1; i <= totalPages; i++) {
		pages.push(
			h("button", {
				class: `pagination__page ${i === currentPage ? "pagination__page--active" : ""}`,
				type: "button",
				"aria-current": i === currentPage ? "page" : undefined,
				onClick: () => onPageChange(i),
				key: i,
			}, String(i))
		);
	}

	return h("nav", { class: "pagination", "aria-label": "Pagination", "data-testid": "catalog-pagination" }, [
		h("button", {
			class: "pagination__prev",
			type: "button",
			disabled: currentPage <= 1,
			onClick: () => onPageChange(currentPage - 1),
		}, "Previous"),
		...pages,
		h("button", {
			class: "pagination__next",
			type: "button",
			disabled: currentPage >= totalPages,
			onClick: () => onPageChange(currentPage + 1),
		}, "Next"),
	]);
}

function renderLoading(): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", "Loading catalog..."),
	]);
}

function renderError(message: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Failed to load catalog"),
		h("p", message),
	]);
}

// ── Page Component ───────────────────────────────────────────────────────────

export const CatalogPage = defineComponent({
	name: "CatalogPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const items = ref<CatalogItemRecord[]>([]);
		const categories = ref<Category[]>([]);
		const totalItems = ref(0);

		const filters = ref<CatalogFilters>(createDefaultFilters());

		// Read initial category from query params
		if (route.query.category) {
			filters.value.category = String(route.query.category);
		}

		async function fetchCategories(): Promise<void> {
			try {
				const result = await sdk.catalog.listCategories();
				categories.value = result.items ?? [];
			} catch {
				// Non-critical: categories filter still works without preloaded list
			}
		}

		async function fetchItems(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const params: Record<string, string | number | boolean | undefined | null> = {
					page: filters.value.page,
					pageSize: filters.value.pageSize,
				};

				if (filters.value.search) {
					params.search = filters.value.search;
				}
				if (filters.value.category) {
					params.categoryId = filters.value.category;
				}
				if (filters.value.sort) {
					const [field, direction] = filters.value.sort.split("_");
					params.sortBy = field;
					params.sortDirection = direction;
				}

				const result: CatalogListResponse<CatalogItemRecord> = await sdk.catalog.listItems(params);
				items.value = result.items ?? [];
				totalItems.value = result.total ?? 0;
			} catch {
				error.value = "Failed to load products. Please try again.";
			} finally {
				loading.value = false;
			}
		}

		let searchTimeout: ReturnType<typeof setTimeout> | null = null;

		function onSearch(value: string): void {
			if (searchTimeout) clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				filters.value = { ...filters.value, search: value, page: 1 };
				fetchItems();
			}, 300);
		}

		function onCategoryChange(value: string): void {
			filters.value = { ...filters.value, category: value, page: 1 };
			router.replace({ query: { ...route.query, category: value || undefined } });
			fetchItems();
		}

		function onSortChange(value: string): void {
			filters.value = { ...filters.value, sort: value, page: 1 };
			fetchItems();
		}

		function onPageChange(page: number): void {
			filters.value = { ...filters.value, page };
			fetchItems();
		}

		function onRemoveSearch(): void {
			filters.value = { ...filters.value, search: "", page: 1 };
			fetchItems();
		}

		function onRemoveCategory(): void {
			filters.value = { ...filters.value, category: "", page: 1 };
			router.replace({ query: { ...route.query, category: undefined } });
			fetchItems();
		}

		onMounted(async () => {
			await Promise.all([fetchCategories(), fetchItems()]);
		});

		return () => {
			return h("div", { class: "catalog-page", "data-testid": "catalog-page" }, [
				h("h1", { class: "catalog-page__title" }, "Menu"),
				renderSearchToolbar(
					filters.value,
					categories.value,
					onSearch,
					onCategoryChange,
					onSortChange,
				),
				renderActiveFilters(
					filters.value,
					categories.value,
					onRemoveSearch,
					onRemoveCategory,
				),
				loading.value
					? renderLoading()
					: error.value
						? renderError(error.value)
						: [
							renderProductGrid(items.value),
							renderPagination(
								filters.value.page,
								totalItems.value,
								filters.value.pageSize,
								onPageChange,
							),
						],
			]);
		};
	},
});
