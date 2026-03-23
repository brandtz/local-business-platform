// E13-S2-T3: Item Detail page — product image, name, description, price,
// modifier group selectors, quantity selector, add to cart, related items.
// Fetches item data via SDK catalog API.

import { defineComponent, h, ref, computed, onMounted, type PropType, type VNode } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { CatalogItemRecord, CatalogListResponse } from "@platform/types";

import { useSdk } from "../composables/use-sdk";

// ── Types ────────────────────────────────────────────────────────────────────

export type ModifierSelection = {
	groupId: string;
	optionId: string;
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderItemImage(item: CatalogItemRecord): VNode {
	return h("div", { class: "item-detail__image", "data-testid": "item-image" }, [
		h("div", {
			class: "item-detail__image-placeholder",
			"aria-label": `Image of ${item.name}`,
		}, item.name.charAt(0).toUpperCase()),
	]);
}

function renderPricing(item: CatalogItemRecord): VNode {
	return h("div", { class: "item-detail__pricing" }, [
		h("span", { class: "item-detail__price", "data-testid": "item-price" },
			`$${(item.price / 100).toFixed(2)}`
		),
		item.compareAtPrice
			? h("span", { class: "item-detail__compare-price" },
				`$${(item.compareAtPrice / 100).toFixed(2)}`
			)
			: null,
	]);
}

function renderQuantitySelector(
	quantity: number,
	onDecrease: () => void,
	onIncrease: () => void,
): VNode {
	return h("div", { class: "item-detail__quantity", "data-testid": "quantity-selector" }, [
		h("label", { class: "item-detail__quantity-label" }, "Quantity"),
		h("div", { class: "item-detail__quantity-controls" }, [
			h("button", {
				class: "item-detail__quantity-btn",
				type: "button",
				disabled: quantity <= 1,
				"aria-label": "Decrease quantity",
				onClick: onDecrease,
			}, "−"),
			h("span", {
				class: "item-detail__quantity-value",
				"aria-live": "polite",
			}, String(quantity)),
			h("button", {
				class: "item-detail__quantity-btn",
				type: "button",
				"aria-label": "Increase quantity",
				onClick: onIncrease,
			}, "+"),
		]),
	]);
}

function renderAddToCart(
	item: CatalogItemRecord,
	quantity: number,
	onAddToCart: () => void,
): VNode {
	const total = (item.price * quantity) / 100;

	return h("button", {
		class: "item-detail__add-to-cart",
		type: "button",
		"data-testid": "add-to-cart",
		onClick: onAddToCart,
	}, `Add to Cart — $${total.toFixed(2)}`);
}

function renderRelatedItems(items: CatalogItemRecord[]): VNode | null {
	if (items.length === 0) return null;

	return h("section", { class: "item-detail__related", "data-testid": "related-items" }, [
		h("h2", { class: "item-detail__related-title" }, "You might also like"),
		h("div", { class: "item-detail__related-grid" },
			items.map((item) =>
				h(RouterLink, {
					to: `/menu/${item.id}`,
					class: "related-item-card",
					key: item.id,
				}, {
					default: () => [
						h("h3", { class: "related-item-card__name" }, item.name),
						h("span", { class: "related-item-card__price" },
							`$${(item.price / 100).toFixed(2)}`
						),
					],
				})
			)
		),
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
		h("p", "Loading item details..."),
	]);
}

function renderError(message: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Item not found"),
		h("p", message),
		h(RouterLink, { to: "/menu", class: "page-error__back" }, {
			default: () => "Back to Menu",
		}),
	]);
}

// ── Page Component ───────────────────────────────────────────────────────────

export const ItemDetailPage = defineComponent({
	name: "ItemDetailPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const item = ref<CatalogItemRecord | null>(null);
		const relatedItems = ref<CatalogItemRecord[]>([]);
		const quantity = ref(1);
		const selectedModifiers = ref<ModifierSelection[]>([]);

		function increaseQuantity(): void {
			quantity.value++;
		}

		function decreaseQuantity(): void {
			if (quantity.value > 1) {
				quantity.value--;
			}
		}

		function onAddToCart(): void {
			// Cart integration will be handled in E13-S3
			// For now, log intent
			if (item.value) {
				const detail = {
					itemId: item.value.id,
					quantity: quantity.value,
					modifiers: selectedModifiers.value,
				};
				window.dispatchEvent(
					new CustomEvent("add-to-cart", { detail })
				);
			}
		}

		async function fetchItem(itemId: string): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const result = await sdk.catalog.getItem(itemId);
				item.value = result;

				// Fetch related items
				try {
					const related: CatalogListResponse<CatalogItemRecord> = await sdk.catalog.listItems({
						pageSize: 5,
					});
					relatedItems.value = (related.items ?? []).filter((r: CatalogItemRecord) => r.id !== itemId).slice(0, 4);
				} catch {
					// Non-critical
				}
			} catch {
				error.value = "This item could not be found. It may have been removed or is no longer available.";
			} finally {
				loading.value = false;
			}
		}

		onMounted(() => {
			const itemId = route.params.itemId as string;
			if (itemId) {
				fetchItem(itemId);
			} else {
				error.value = "No item specified.";
				loading.value = false;
			}
		});

		return () => {
			if (loading.value) return renderLoading();
			if (error.value || !item.value) return renderError(error.value ?? "Item not found");

			const currentItem = item.value;

			return h("div", { class: "item-detail-page", "data-testid": "item-detail-page" }, [
				h("nav", { class: "item-detail__breadcrumb", "aria-label": "Breadcrumb" }, [
					h(RouterLink, { to: "/menu" }, { default: () => "Menu" }),
					h("span", " / "),
					h("span", currentItem.name),
				]),
				h("div", { class: "item-detail__layout" }, [
					renderItemImage(currentItem),
					h("div", { class: "item-detail__info" }, [
						h("h1", { class: "item-detail__name", "data-testid": "item-name" }, currentItem.name),
						currentItem.description
							? h("p", { class: "item-detail__description" }, currentItem.description)
							: null,
						renderPricing(currentItem),
						renderQuantitySelector(quantity.value, decreaseQuantity, increaseQuantity),
						renderAddToCart(currentItem, quantity.value, onAddToCart),
					]),
				]),
				renderRelatedItems(relatedItems.value),
			]);
		};
	},
});
