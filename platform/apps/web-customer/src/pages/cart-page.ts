// Cart page — displays cart items with quantity controls, order notes,
// pricing summary, and checkout CTA. Persists cart state to localStorage.

import { defineComponent, h, ref, onMounted, watch, type VNode } from "vue";
import { RouterLink, useRouter } from "vue-router";

import type { CartItemResponse, PricingLineItemOutput } from "@platform/types";

import {
	createInitialCartState,
	isCartEmpty,
	getCartItemCount,
	type CartState,
} from "../cart-state";
import { getAuthViewerState } from "../auth-state";

// ── Constants ────────────────────────────────────────────────────────────────

const CART_STORAGE_KEY = "__platform_customer_cart__";

// ── Persistence Helpers ──────────────────────────────────────────────────────

function persistCart(state: CartState): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Storage full or unavailable — silently ignore
	}
}

function restoreCart(): CartState {
	if (typeof window === "undefined") return createInitialCartState();
	try {
		const raw = window.localStorage.getItem(CART_STORAGE_KEY);
		if (!raw) return createInitialCartState();
		const parsed = JSON.parse(raw) as CartState;
		// Basic shape validation
		if (!Array.isArray(parsed.items)) return createInitialCartState();
		return { ...createInitialCartState(), ...parsed, isLoading: false, error: null };
	} catch {
		return createInitialCartState();
	}
}

// ── Format Helper ────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderLoading(): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", "Loading your cart..."),
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
		h(RouterLink, { to: "/menu", class: "page-error__back" }, {
			default: () => "Back to Menu",
		}),
	]);
}

function renderEmptyCart(): VNode {
	return h("div", {
		class: "cart-page__empty",
		"data-testid": "empty-cart",
	}, [
		h("h2", { class: "cart-page__empty-title" }, "Your cart is empty"),
		h("p", { class: "cart-page__empty-text" }, "Looks like you haven't added anything yet."),
		h(RouterLink, {
			to: "/menu",
			class: "cart-page__continue-shopping",
			"data-testid": "continue-shopping",
		}, {
			default: () => "Continue Shopping",
		}),
	]);
}

function findLineItem(
	cartItemId: string,
	lineItems: PricingLineItemOutput[] | undefined,
): PricingLineItemOutput | undefined {
	return lineItems?.find((li) => li.cartItemId === cartItemId);
}

function renderCartItem(
	item: CartItemResponse,
	lineItem: PricingLineItemOutput | undefined,
	onIncrease: () => void,
	onDecrease: () => void,
	onRemove: () => void,
): VNode {
	const modifiersText = item.modifiers.length > 0
		? item.modifiers.map((m) => m.modifierName).join(", ")
		: null;

	return h("div", {
		class: "cart-item",
		key: item.id,
		"data-testid": "cart-item",
	}, [
		h("div", { class: "cart-item__info" }, [
			h("h3", { class: "cart-item__name", "data-testid": "cart-item-name" }, [
				item.catalogItemName,
				item.variantName
					? h("span", { class: "cart-item__variant" }, ` — ${item.variantName}`)
					: null,
			]),
			modifiersText
				? h("p", {
					class: "cart-item__modifiers",
					"data-testid": "cart-item-modifiers",
				}, modifiersText)
				: null,
		]),
		h("div", { class: "cart-item__quantity", "data-testid": "cart-item-quantity" }, [
			h("button", {
				class: "cart-item__qty-btn",
				type: "button",
				"aria-label": `Decrease quantity of ${item.catalogItemName}`,
				disabled: item.quantity <= 1,
				onClick: onDecrease,
				"data-testid": "quantity-decrease",
			}, "−"),
			h("span", {
				class: "cart-item__qty-value",
				"aria-live": "polite",
			}, String(item.quantity)),
			h("button", {
				class: "cart-item__qty-btn",
				type: "button",
				"aria-label": `Increase quantity of ${item.catalogItemName}`,
				onClick: onIncrease,
				"data-testid": "quantity-increase",
			}, "+"),
		]),
		h("div", { class: "cart-item__price", "data-testid": "cart-item-price" },
			lineItem ? formatCents(lineItem.lineTotalCents) : formatCents(item.addedPriceCents * item.quantity),
		),
		h("button", {
			class: "cart-item__remove",
			type: "button",
			"aria-label": `Remove ${item.catalogItemName} from cart`,
			onClick: onRemove,
			"data-testid": "cart-item-remove",
		}, "Remove"),
	]);
}

function renderOrderNotes(
	notes: string | null,
	onInput: (value: string) => void,
): VNode {
	return h("div", { class: "cart-page__notes", "data-testid": "order-notes" }, [
		h("label", {
			class: "cart-page__notes-label",
			for: "order-notes",
		}, "Order Notes"),
		h("textarea", {
			class: "cart-page__notes-input",
			id: "order-notes",
			placeholder: "Special instructions for your order...",
			value: notes ?? "",
			rows: 3,
			onInput: (e: Event) => onInput((e.target as HTMLTextAreaElement).value),
			"data-testid": "order-notes-input",
		}),
	]);
}

function renderCartSummary(state: CartState): VNode {
	const quote = state.quote;
	const subtotal = quote ? quote.subtotalCents : 0;
	const tax = quote ? quote.taxCents : 0;
	const total = quote ? quote.totalCents : 0;

	return h("div", {
		class: "cart-page__summary",
		"data-testid": "cart-summary",
	}, [
		h("h2", { class: "cart-page__summary-title" }, "Order Summary"),
		h("div", { class: "cart-page__summary-row" }, [
			h("span", "Subtotal"),
			h("span", { "data-testid": "summary-subtotal" }, formatCents(subtotal)),
		]),
		h("div", { class: "cart-page__summary-row" }, [
			h("span", "Estimated Tax"),
			h("span", { "data-testid": "summary-tax" }, formatCents(tax)),
		]),
		h("div", { class: "cart-page__summary-row cart-page__summary-row--total" }, [
			h("span", "Estimated Total"),
			h("span", { "data-testid": "summary-total" }, formatCents(total)),
		]),
	]);
}

function renderSignInPrompt(): VNode {
	return h("div", {
		class: "cart-page__auth-prompt",
		"data-testid": "sign-in-prompt",
	}, [
		h("p", { class: "cart-page__auth-text" }, "Sign in to checkout"),
		h(RouterLink, {
			to: "/login?redirect=/checkout",
			class: "cart-page__sign-in-link",
			"data-testid": "sign-in-link",
		}, {
			default: () => "Sign In",
		}),
	]);
}

// ── Page Component ───────────────────────────────────────────────────────────

export const CartPage = defineComponent({
	name: "CartPage",
	setup() {
		const router = useRouter();
		const cartState = ref<CartState>(createInitialCartState());

		// ── Cart Manipulation ────────────────────────────────────────────

		function updateQuantity(itemId: string, delta: number): void {
			const items = cartState.value.items.map((item) => {
				if (item.id !== itemId) return item;
				const newQty = Math.max(1, item.quantity + delta);
				return { ...item, quantity: newQty };
			});

			// Also update line items in quote if present
			const quote = cartState.value.quote
				? {
					...cartState.value.quote,
					lineItems: cartState.value.quote.lineItems.map((li) => {
						const matchingItem = items.find((i) => i.id === li.cartItemId);
						if (!matchingItem || li.cartItemId !== itemId) return li;
						return {
							...li,
							quantity: matchingItem.quantity,
							lineTotalCents: li.unitPriceCents * matchingItem.quantity + li.modifiersTotalCents * matchingItem.quantity,
						};
					}),
				}
				: null;

			if (quote) {
				const subtotal = quote.lineItems.reduce((sum, li) => sum + li.lineTotalCents, 0);
				quote.subtotalCents = subtotal;
				quote.totalCents = subtotal + quote.taxCents + quote.deliveryFeeCents - quote.discountCents + quote.tipCents;
			}

			cartState.value = { ...cartState.value, items, quote };
		}

		function removeItem(itemId: string): void {
			const items = cartState.value.items.filter((item) => item.id !== itemId);
			const quote = cartState.value.quote
				? {
					...cartState.value.quote,
					lineItems: cartState.value.quote.lineItems.filter((li) => li.cartItemId !== itemId),
				}
				: null;

			if (quote) {
				const subtotal = quote.lineItems.reduce((sum, li) => sum + li.lineTotalCents, 0);
				quote.subtotalCents = subtotal;
				quote.totalCents = subtotal + quote.taxCents + quote.deliveryFeeCents - quote.discountCents + quote.tipCents;
			}

			cartState.value = { ...cartState.value, items, quote };
		}

		function clearCart(): void {
			cartState.value = createInitialCartState();
		}

		function updateNotes(value: string): void {
			cartState.value = {
				...cartState.value,
				orderNotes: value || null,
			};
		}

		function proceedToCheckout(): void {
			router.push("/checkout");
		}

		// ── Persistence ──────────────────────────────────────────────────

		onMounted(() => {
			cartState.value = restoreCart();
		});

		watch(cartState, (newState) => {
			persistCart(newState);
		}, { deep: true });

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			const state = cartState.value;

			if (state.isLoading) return renderLoading();
			if (state.error) return renderError(state.error);
			if (isCartEmpty(state)) return renderEmptyCart();

			const authState = getAuthViewerState();
			const itemCount = getCartItemCount(state);

			return h("div", { class: "cart-page", "data-testid": "cart-page" }, [
				h("div", { class: "cart-page__header" }, [
					h("h1", { class: "cart-page__title" }, `Your Cart (${itemCount})`),
					h("button", {
						class: "cart-page__clear-btn",
						type: "button",
						onClick: clearCart,
						"data-testid": "clear-cart",
					}, "Clear Cart"),
				]),
				h("div", { class: "cart-page__layout" }, [
					h("div", { class: "cart-page__items" }, [
						h("div", { class: "cart-page__item-list", "data-testid": "cart-item-list" },
							state.items.map((item) => {
								const lineItem = findLineItem(item.id, state.quote?.lineItems);
								return renderCartItem(
									item,
									lineItem,
									() => updateQuantity(item.id, 1),
									() => updateQuantity(item.id, -1),
									() => removeItem(item.id),
								);
							}),
						),
						renderOrderNotes(state.orderNotes, updateNotes),
					]),
					h("aside", { class: "cart-page__sidebar" }, [
						renderCartSummary(state),
						!authState.isAuthenticated
							? renderSignInPrompt()
							: h("button", {
								class: "cart-page__checkout-btn",
								type: "button",
								disabled: isCartEmpty(state),
								onClick: proceedToCheckout,
								"data-testid": "checkout-btn",
							}, "Proceed to Checkout"),
					]),
				]),
			]);
		};
	},
});
