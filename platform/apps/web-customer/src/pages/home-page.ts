// E13-S2-T1: Storefront Home page — hero banner, featured categories,
// featured items, and trust bar. Fetches data via SDK on mount.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink } from "vue-router";

import type { Category, CatalogItemRecord, CatalogListResponse } from "@platform/types";

import { useSdk } from "../composables/use-sdk";
import { useTenantContext } from "../tenant-context-consumer";

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderHero(displayName: string): VNode {
	return h("section", { class: "home-hero", "data-testid": "home-hero" }, [
		h("div", { class: "home-hero__content" }, [
			h("h1", { class: "home-hero__title" }, `Welcome to ${displayName}`),
			h("p", { class: "home-hero__subtitle" }, "Discover our products and services"),
			h(RouterLink, { to: "/menu", class: "home-hero__cta" }, {
				default: () => "Browse Menu",
			}),
		]),
	]);
}

function renderCategoryCard(category: Category): VNode {
	return h(RouterLink, {
		to: `/menu?category=${category.id}`,
		class: "category-card",
		key: category.id,
	}, {
		default: () => [
			h("div", { class: "category-card__content" }, [
				h("h3", { class: "category-card__name" }, category.name),
				category.description
					? h("p", { class: "category-card__description" }, category.description)
					: null,
			]),
		],
	});
}

function renderCategories(categories: Category[]): VNode {
	if (categories.length === 0) {
		return h("section", { class: "home-categories home-categories--empty" }, [
			h("h2", "Categories"),
			h("p", { class: "home-categories__empty" }, "No categories available yet."),
		]);
	}

	return h("section", { class: "home-categories", "data-testid": "home-categories" }, [
		h("h2", { class: "home-categories__title" }, "Shop by Category"),
		h("div", { class: "home-categories__grid" },
			categories.slice(0, 6).map(renderCategoryCard)
		),
	]);
}

function renderFeaturedItem(item: CatalogItemRecord): VNode {
	return h(RouterLink, {
		to: `/menu/${item.id}`,
		class: "featured-item-card",
		key: item.id,
	}, {
		default: () => [
			h("div", { class: "featured-item-card__content" }, [
				h("h3", { class: "featured-item-card__name" }, item.name),
				h("p", { class: "featured-item-card__price" },
					`$${(item.price / 100).toFixed(2)}`
				),
				item.compareAtPrice
					? h("p", { class: "featured-item-card__compare-price" },
						`$${(item.compareAtPrice / 100).toFixed(2)}`
					)
					: null,
			]),
		],
	});
}

function renderFeaturedItems(items: CatalogItemRecord[]): VNode {
	if (items.length === 0) {
		return h("section", { class: "home-featured home-featured--empty" });
	}

	return h("section", { class: "home-featured", "data-testid": "home-featured" }, [
		h("h2", { class: "home-featured__title" }, "Featured Items"),
		h("div", { class: "home-featured__grid" },
			items.slice(0, 8).map(renderFeaturedItem)
		),
	]);
}

function renderTrustBar(displayName: string): VNode {
	return h("section", { class: "home-trust-bar", "data-testid": "home-trust-bar" }, [
		h("div", { class: "home-trust-bar__items" }, [
			h("div", { class: "home-trust-bar__item" }, [
				h("span", { class: "home-trust-bar__icon" }, "🕐"),
				h("span", { class: "home-trust-bar__label" }, "Open Today"),
			]),
			h("div", { class: "home-trust-bar__item" }, [
				h("span", { class: "home-trust-bar__icon" }, "🚚"),
				h("span", { class: "home-trust-bar__label" }, "Delivery Available"),
			]),
			h("div", { class: "home-trust-bar__item" }, [
				h("span", { class: "home-trust-bar__icon" }, "📞"),
				h("span", { class: "home-trust-bar__label" }, "Contact Us"),
			]),
		]),
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
		h("p", "Loading storefront..."),
	]);
}

function renderError(message: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Something went wrong"),
		h("p", message),
	]);
}

// ── Page Component ───────────────────────────────────────────────────────────

export const HomePage = defineComponent({
	name: "HomePage",
	setup() {
		const sdk = useSdk();
		const tenantContext = useTenantContext();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const categories = ref<Category[]>([]);
		const featuredItems = ref<CatalogItemRecord[]>([]);

		onMounted(async () => {
			try {
				const [catResult, itemResult] = await Promise.all([
					sdk.catalog.listCategories().catch((): CatalogListResponse<Category> => ({ items: [], total: 0, page: 1, pageSize: 10 })),
					sdk.catalog.listItems({ page: 1, pageSize: 8 }).catch((): CatalogListResponse<CatalogItemRecord> => ({ items: [], total: 0, page: 1, pageSize: 8 })),
				]);

				categories.value = catResult.items ?? [];
				featuredItems.value = itemResult.items ?? [];
			} catch {
				error.value = "Failed to load storefront data. Please try again.";
			} finally {
				loading.value = false;
			}
		});

		return () => {
			if (loading.value) return renderLoading();
			if (error.value) return renderError(error.value);

			return h("div", { class: "home-page", "data-testid": "home-page" }, [
				renderHero(tenantContext.displayName),
				renderTrustBar(tenantContext.displayName),
				renderCategories(categories.value),
				renderFeaturedItems(featuredItems.value),
			]);
		};
	},
});
