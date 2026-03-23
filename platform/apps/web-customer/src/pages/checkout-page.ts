// Checkout Stepper Page — 3-step wizard: Fulfillment → Payment → Review.
// Auth-protected route at /checkout. Uses render functions (h()) exclusively.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { useRouter } from "vue-router";

import type {
	CartItemResponse,
	PricingQuote,
	CreateOrderFromCartInput,
	CreateOrderItemInput,
} from "@platform/types";

import type {
	PaymentMethodSummary,
	LocationRecord,
} from "@platform/sdk";

import {
	createInitialCartState,
	isCartEmpty,
	type CartState,
} from "../cart-state";
import { getAuthViewerState } from "../auth-state";
import { useSdk } from "../composables/use-sdk";
import { useTenantContext } from "../tenant-context-consumer";

// ── Constants ────────────────────────────────────────────────────────────────

const CART_STORAGE_KEY = "__platform_customer_cart__";

export const STEP_LABELS = ["Fulfillment", "Payment", "Review"] as const;

export const TIP_PRESETS = [
	{ label: "15%", multiplier: 0.15 },
	{ label: "18%", multiplier: 0.18 },
	{ label: "20%", multiplier: 0.20 },
] as const;

export function calculateTipCents(selection: string, subtotalCents: number, customCents: number): number {
	if (selection === "custom") return customCents;
	const preset = TIP_PRESETS.find((p) => p.label === selection);
	if (preset) return Math.round(subtotalCents * preset.multiplier);
	return 0;
}

export function validateDeliveryAddress(addr: { line1: string; city: string; state: string; zip: string }): boolean {
	return addr.line1.trim() !== "" &&
		addr.city.trim() !== "" &&
		addr.state.trim() !== "" &&
		addr.zip.trim() !== "";
}

export function validateNewCard(card: { number: string; expiry: string; cvv: string }): boolean {
	return card.number.trim() !== "" &&
		card.expiry.trim() !== "" &&
		card.cvv.trim() !== "";
}

// ── Persistence Helpers ──────────────────────────────────────────────────────

function restoreCart(): CartState {
	if (typeof window === "undefined") return createInitialCartState();
	try {
		const raw = window.localStorage.getItem(CART_STORAGE_KEY);
		if (!raw) return createInitialCartState();
		const parsed = JSON.parse(raw) as CartState;
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

function renderStepIndicators(currentStep: number): VNode {
	return h("nav", {
		class: "checkout-page__steps",
		"aria-label": "Checkout steps",
		"data-testid": "step-indicators",
	}, STEP_LABELS.map((label, index) =>
		h("div", {
			key: label,
			class: [
				"checkout-page__step-indicator",
				index === currentStep ? "checkout-page__step-indicator--active" : "",
				index < currentStep ? "checkout-page__step-indicator--completed" : "",
			].filter(Boolean).join(" "),
			"data-testid": `step-indicator-${index}`,
			"aria-current": index === currentStep ? "step" : undefined,
		}, [
			h("span", { class: "checkout-page__step-number" }, String(index + 1)),
			h("span", { class: "checkout-page__step-label" }, label),
		])
	));
}

function renderStepNavigation(
	currentStep: number,
	onBack: () => void,
	onContinue: () => void,
	continueLabel?: string,
	continueDisabled?: boolean,
): VNode {
	return h("div", {
		class: "checkout-page__step-nav",
		"data-testid": "step-navigation",
	}, [
		currentStep > 0
			? h("button", {
				class: "checkout-page__back-btn",
				type: "button",
				onClick: onBack,
				"data-testid": "back-button",
			}, "Back")
			: null,
		h("button", {
			class: "checkout-page__continue-btn",
			type: "button",
			onClick: onContinue,
			disabled: continueDisabled ?? false,
			"data-testid": "continue-button",
		}, continueLabel ?? "Continue"),
	]);
}

// ── Step 1: Fulfillment ──────────────────────────────────────────────────────

function renderFulfillmentStep(
	fulfillmentMode: string,
	onModeChange: (mode: string) => void,
	deliveryAddress: { line1: string; city: string; state: string; zip: string },
	onAddressChange: (field: string, value: string) => void,
	locations: LocationRecord[],
	selectedLocationId: string | null,
	onLocationChange: (id: string) => void,
	locationsLoading: boolean,
): VNode {
	return h("div", {
		class: "checkout-page__step-content",
		"data-testid": "fulfillment-step",
	}, [
		h("h2", { class: "checkout-page__step-title" }, "Fulfillment"),

		// Fulfillment mode toggle
		h("fieldset", {
			class: "checkout-page__fulfillment-mode",
			"data-testid": "fulfillment-mode-toggle",
		}, [
			h("legend", { class: "checkout-page__field-legend" }, "How would you like to receive your order?"),
			h("div", { class: "checkout-page__radio-group" }, [
				h("label", { class: "checkout-page__radio-label", "data-testid": "fulfillment-delivery" }, [
					h("input", {
						type: "radio",
						name: "fulfillmentMode",
						value: "delivery",
						checked: fulfillmentMode === "delivery",
						onChange: () => onModeChange("delivery"),
						"data-testid": "fulfillment-delivery-radio",
					}),
					h("span", "Delivery"),
				]),
				h("label", { class: "checkout-page__radio-label", "data-testid": "fulfillment-pickup" }, [
					h("input", {
						type: "radio",
						name: "fulfillmentMode",
						value: "pickup",
						checked: fulfillmentMode === "pickup",
						onChange: () => onModeChange("pickup"),
						"data-testid": "fulfillment-pickup-radio",
					}),
					h("span", "Pickup"),
				]),
			]),
		]),

		// Conditional: Delivery address form or Pickup location selector
		fulfillmentMode === "delivery"
			? renderDeliveryForm(deliveryAddress, onAddressChange)
			: renderPickupSelector(locations, selectedLocationId, onLocationChange, locationsLoading),
	]);
}

function renderDeliveryForm(
	address: { line1: string; city: string; state: string; zip: string },
	onChange: (field: string, value: string) => void,
): VNode {
	return h("div", {
		class: "checkout-page__delivery-form",
		"data-testid": "delivery-address-form",
	}, [
		h("h3", { class: "checkout-page__section-title" }, "Delivery Address"),
		renderTextField("Street Address", "line1", address.line1, onChange, "street-address"),
		renderTextField("City", "city", address.city, onChange, "city"),
		renderTextField("State", "state", address.state, onChange, "state"),
		renderTextField("ZIP Code", "zip", address.zip, onChange, "zip"),
	]);
}

function renderTextField(
	label: string,
	field: string,
	value: string,
	onChange: (field: string, value: string) => void,
	testIdSuffix: string,
): VNode {
	const inputId = `checkout-${field}`;
	return h("div", { class: "checkout-page__field" }, [
		h("label", { class: "checkout-page__field-label", for: inputId }, label),
		h("input", {
			class: "checkout-page__field-input",
			id: inputId,
			type: "text",
			value,
			onInput: (e: Event) => onChange(field, (e.target as HTMLInputElement).value),
			"data-testid": `address-${testIdSuffix}`,
		}),
	]);
}

function renderPickupSelector(
	locations: LocationRecord[],
	selectedLocationId: string | null,
	onLocationChange: (id: string) => void,
	loading: boolean,
): VNode {
	if (loading) {
		return h("div", {
			class: "checkout-page__locations-loading",
			"data-testid": "locations-loading",
		}, "Loading locations...");
	}

	return h("div", {
		class: "checkout-page__pickup-selector",
		"data-testid": "pickup-location-selector",
	}, [
		h("h3", { class: "checkout-page__section-title" }, "Select Pickup Location"),
		h("select", {
			class: "checkout-page__location-select",
			value: selectedLocationId ?? "",
			onChange: (e: Event) => onLocationChange((e.target as HTMLSelectElement).value),
			"data-testid": "location-dropdown",
		}, [
			h("option", { value: "", disabled: true }, "Choose a location..."),
			...locations.map((loc) => {
				const parts = [loc.name, loc.address, loc.city, loc.state, loc.zip].filter(Boolean);
				return h("option", { key: loc.id, value: loc.id }, parts.join(", "));
			}),
		]),
	]);
}

// ── Step 2: Payment ──────────────────────────────────────────────────────────

function renderPaymentStep(
	paymentMethods: PaymentMethodSummary[],
	selectedPaymentId: string | null,
	useNewCard: boolean,
	onSelectPayment: (id: string) => void,
	onSelectNewCard: () => void,
	newCard: { number: string; expiry: string; cvv: string },
	onNewCardChange: (field: string, value: string) => void,
	paymentsLoading: boolean,
	tipSelection: string,
	customTipCents: number,
	subtotalCents: number,
	onTipSelect: (selection: string) => void,
	onCustomTipChange: (cents: number) => void,
	promoCode: string,
	onPromoCodeChange: (value: string) => void,
	onApplyPromo: () => void,
): VNode {
	return h("div", {
		class: "checkout-page__step-content",
		"data-testid": "payment-step",
	}, [
		h("h2", { class: "checkout-page__step-title" }, "Payment"),

		// Payment methods
		renderPaymentMethods(paymentMethods, selectedPaymentId, useNewCard, onSelectPayment, onSelectNewCard, paymentsLoading),

		// New card form (shown when "New card" is selected)
		useNewCard ? renderNewCardForm(newCard, onNewCardChange) : null,

		// Tip selector
		renderTipSelector(tipSelection, customTipCents, subtotalCents, onTipSelect, onCustomTipChange),

		// Promo code
		renderPromoCodeInput(promoCode, onPromoCodeChange, onApplyPromo),
	]);
}

function renderPaymentMethods(
	methods: PaymentMethodSummary[],
	selectedId: string | null,
	useNewCard: boolean,
	onSelect: (id: string) => void,
	onSelectNew: () => void,
	loading: boolean,
): VNode {
	if (loading) {
		return h("div", {
			class: "checkout-page__payments-loading",
			"data-testid": "payments-loading",
		}, "Loading payment methods...");
	}

	return h("fieldset", {
		class: "checkout-page__payment-methods",
		"data-testid": "payment-methods",
	}, [
		h("legend", { class: "checkout-page__field-legend" }, "Payment Method"),
		...methods.map((method) =>
			h("label", {
				key: method.id,
				class: "checkout-page__radio-label",
				"data-testid": `payment-method-${method.id}`,
			}, [
				h("input", {
					type: "radio",
					name: "paymentMethod",
					value: method.id,
					checked: !useNewCard && selectedId === method.id,
					onChange: () => onSelect(method.id),
					"data-testid": `payment-radio-${method.id}`,
				}),
				h("span", `${method.type} ending in ${method.last4}${method.isDefault ? " (default)" : ""}`),
			]),
		),
		h("label", {
			class: "checkout-page__radio-label",
			"data-testid": "payment-method-new",
		}, [
			h("input", {
				type: "radio",
				name: "paymentMethod",
				value: "__new__",
				checked: useNewCard,
				onChange: onSelectNew,
				"data-testid": "payment-radio-new",
			}),
			h("span", "New card"),
		]),
	]);
}

function renderNewCardForm(
	card: { number: string; expiry: string; cvv: string },
	onChange: (field: string, value: string) => void,
): VNode {
	return h("div", {
		class: "checkout-page__new-card-form",
		"data-testid": "new-card-form",
	}, [
		h("div", { class: "checkout-page__field" }, [
			h("label", { class: "checkout-page__field-label", for: "card-number" }, "Card Number"),
			h("input", {
				class: "checkout-page__field-input",
				id: "card-number",
				type: "text",
				placeholder: "1234 5678 9012 3456",
				value: card.number,
				onInput: (e: Event) => onChange("number", (e.target as HTMLInputElement).value),
				"data-testid": "card-number",
			}),
		]),
		h("div", { class: "checkout-page__field-row" }, [
			h("div", { class: "checkout-page__field" }, [
				h("label", { class: "checkout-page__field-label", for: "card-expiry" }, "Expiry"),
				h("input", {
					class: "checkout-page__field-input",
					id: "card-expiry",
					type: "text",
					placeholder: "MM/YY",
					value: card.expiry,
					onInput: (e: Event) => onChange("expiry", (e.target as HTMLInputElement).value),
					"data-testid": "card-expiry",
				}),
			]),
			h("div", { class: "checkout-page__field" }, [
				h("label", { class: "checkout-page__field-label", for: "card-cvv" }, "CVV"),
				h("input", {
					class: "checkout-page__field-input",
					id: "card-cvv",
					type: "text",
					placeholder: "123",
					value: card.cvv,
					onInput: (e: Event) => onChange("cvv", (e.target as HTMLInputElement).value),
					"data-testid": "card-cvv",
				}),
			]),
		]),
	]);
}

function renderTipSelector(
	tipSelection: string,
	customTipCents: number,
	subtotalCents: number,
	onTipSelect: (selection: string) => void,
	onCustomTipChange: (cents: number) => void,
): VNode {
	return h("div", {
		class: "checkout-page__tip-selector",
		"data-testid": "tip-selector",
	}, [
		h("h3", { class: "checkout-page__section-title" }, "Add a Tip"),
		h("div", { class: "checkout-page__tip-presets" }, [
			...TIP_PRESETS.map((preset) => {
				const tipCents = Math.round(subtotalCents * preset.multiplier);
				return h("button", {
					key: preset.label,
					class: [
						"checkout-page__tip-btn",
						tipSelection === preset.label ? "checkout-page__tip-btn--active" : "",
					].filter(Boolean).join(" "),
					type: "button",
					onClick: () => onTipSelect(preset.label),
					"data-testid": `tip-${preset.label}`,
				}, `${preset.label} (${formatCents(tipCents)})`);
			}),
			h("button", {
				class: [
					"checkout-page__tip-btn",
					tipSelection === "custom" ? "checkout-page__tip-btn--active" : "",
				].filter(Boolean).join(" "),
				type: "button",
				onClick: () => onTipSelect("custom"),
				"data-testid": "tip-custom",
			}, "Custom"),
		]),
		tipSelection === "custom"
			? h("div", { class: "checkout-page__tip-custom", "data-testid": "tip-custom-input-wrapper" }, [
				h("label", { class: "checkout-page__field-label", for: "custom-tip" }, "Custom Tip Amount ($)"),
				h("input", {
					class: "checkout-page__field-input",
					id: "custom-tip",
					type: "number",
					min: "0",
					step: "0.01",
					value: (customTipCents / 100).toFixed(2),
					onInput: (e: Event) => {
						const dollars = parseFloat((e.target as HTMLInputElement).value) || 0;
						onCustomTipChange(Math.round(dollars * 100));
					},
					"data-testid": "tip-custom-input",
				}),
			])
			: null,
	]);
}

function renderPromoCodeInput(
	promoCode: string,
	onChange: (value: string) => void,
	onApply: () => void,
): VNode {
	return h("div", {
		class: "checkout-page__promo",
		"data-testid": "promo-code-section",
	}, [
		h("h3", { class: "checkout-page__section-title" }, "Promo Code"),
		h("div", { class: "checkout-page__promo-row" }, [
			h("input", {
				class: "checkout-page__field-input",
				type: "text",
				placeholder: "Enter promo code",
				value: promoCode,
				onInput: (e: Event) => onChange((e.target as HTMLInputElement).value),
				"data-testid": "promo-code-input",
			}),
			h("button", {
				class: "checkout-page__promo-apply-btn",
				type: "button",
				onClick: onApply,
				"data-testid": "promo-code-apply",
			}, "Apply"),
		]),
	]);
}

// ── Step 3: Review ───────────────────────────────────────────────────────────

function renderReviewStep(
	cartState: CartState,
	fulfillmentMode: string,
	deliveryAddress: { line1: string; city: string; state: string; zip: string },
	selectedLocation: LocationRecord | null,
	selectedPayment: PaymentMethodSummary | null,
	useNewCard: boolean,
	tipCents: number,
	promoCode: string | null,
	termsAccepted: boolean,
	onTermsChange: (accepted: boolean) => void,
	isSubmitting: boolean,
	submitError: string | null,
	onPlaceOrder: () => void,
): VNode {
	const quote = cartState.quote;

	return h("div", {
		class: "checkout-page__step-content",
		"data-testid": "review-step",
	}, [
		h("h2", { class: "checkout-page__step-title" }, "Review Your Order"),

		// Items list
		renderReviewItems(cartState.items, quote),

		// Fulfillment details
		renderReviewFulfillment(fulfillmentMode, deliveryAddress, selectedLocation),

		// Payment summary
		renderReviewPayment(selectedPayment, useNewCard),

		// Order totals
		renderReviewTotals(quote, tipCents),

		// Terms checkbox
		h("div", {
			class: "checkout-page__terms",
			"data-testid": "terms-section",
		}, [
			h("label", { class: "checkout-page__checkbox-label" }, [
				h("input", {
					type: "checkbox",
					checked: termsAccepted,
					onChange: (e: Event) => onTermsChange((e.target as HTMLInputElement).checked),
					"data-testid": "terms-checkbox",
				}),
				h("span", "I acknowledge and accept the terms and conditions"),
			]),
		]),

		// Error display
		submitError
			? h("div", {
				class: "checkout-page__error",
				role: "alert",
				"data-testid": "submit-error",
			}, submitError)
			: null,

		// Place order button
		h("button", {
			class: "checkout-page__place-order-btn",
			type: "button",
			disabled: !termsAccepted || isSubmitting,
			onClick: onPlaceOrder,
			"data-testid": "place-order-button",
		}, isSubmitting ? "Placing Order..." : "Place Order"),
	]);
}

function renderReviewItems(items: CartItemResponse[], quote: PricingQuote | null): VNode {
	return h("div", {
		class: "checkout-page__review-items",
		"data-testid": "review-items",
	}, [
		h("h3", { class: "checkout-page__section-title" }, "Items"),
		h("ul", { class: "checkout-page__item-list" },
			items.map((item) => {
				const lineItem = quote?.lineItems.find((li) => li.cartItemId === item.id);
				const price = lineItem
					? lineItem.lineTotalCents
					: item.addedPriceCents * item.quantity;

				return h("li", {
					key: item.id,
					class: "checkout-page__review-item",
					"data-testid": "review-item",
				}, [
					h("span", { class: "checkout-page__review-item-name", "data-testid": "review-item-name" }, [
						`${item.catalogItemName}`,
						item.variantName ? ` — ${item.variantName}` : "",
					]),
					h("span", { class: "checkout-page__review-item-qty", "data-testid": "review-item-qty" }, ` x${item.quantity}`),
					h("span", { class: "checkout-page__review-item-price", "data-testid": "review-item-price" }, formatCents(price)),
				]);
			}),
		),
	]);
}

function renderReviewFulfillment(
	mode: string,
	address: { line1: string; city: string; state: string; zip: string },
	location: LocationRecord | null,
): VNode {
	return h("div", {
		class: "checkout-page__review-fulfillment",
		"data-testid": "review-fulfillment",
	}, [
		h("h3", { class: "checkout-page__section-title" }, "Fulfillment"),
		mode === "delivery"
			? h("p", { "data-testid": "review-fulfillment-detail" },
				`Delivery to ${address.line1}, ${address.city}, ${address.state} ${address.zip}`,
			)
			: h("p", { "data-testid": "review-fulfillment-detail" },
				location
					? `Pickup at ${location.name} — ${location.address}, ${location.city}, ${location.state} ${location.zip}`
					: "Pickup (location selected)",
			),
	]);
}

function renderReviewPayment(
	method: PaymentMethodSummary | null,
	useNewCard: boolean,
): VNode {
	return h("div", {
		class: "checkout-page__review-payment",
		"data-testid": "review-payment",
	}, [
		h("h3", { class: "checkout-page__section-title" }, "Payment"),
		h("p", { "data-testid": "review-payment-detail" },
			useNewCard
				? "New card"
				: method
					? `${method.type} ending in ${method.last4}`
					: "No payment method selected",
		),
	]);
}

function renderReviewTotals(quote: PricingQuote | null, tipCents: number): VNode {
	const subtotal = quote?.subtotalCents ?? 0;
	const discount = quote?.discountCents ?? 0;
	const tax = quote?.taxCents ?? 0;
	const deliveryFee = quote?.deliveryFeeCents ?? 0;
	const total = subtotal - discount + tax + tipCents + deliveryFee;

	return h("div", {
		class: "checkout-page__review-totals",
		"data-testid": "review-totals",
	}, [
		h("h3", { class: "checkout-page__section-title" }, "Order Total"),
		h("div", { class: "checkout-page__totals-row" }, [
			h("span", "Subtotal"),
			h("span", { "data-testid": "review-subtotal" }, formatCents(subtotal)),
		]),
		discount > 0
			? h("div", { class: "checkout-page__totals-row" }, [
				h("span", "Discount"),
				h("span", { "data-testid": "review-discount" }, `-${formatCents(discount)}`),
			])
			: null,
		h("div", { class: "checkout-page__totals-row" }, [
			h("span", "Tax"),
			h("span", { "data-testid": "review-tax" }, formatCents(tax)),
		]),
		tipCents > 0
			? h("div", { class: "checkout-page__totals-row" }, [
				h("span", "Tip"),
				h("span", { "data-testid": "review-tip" }, formatCents(tipCents)),
			])
			: null,
		deliveryFee > 0
			? h("div", { class: "checkout-page__totals-row" }, [
				h("span", "Delivery Fee"),
				h("span", { "data-testid": "review-delivery-fee" }, formatCents(deliveryFee)),
			])
			: null,
		h("div", { class: "checkout-page__totals-row checkout-page__totals-row--total" }, [
			h("span", "Total"),
			h("span", { "data-testid": "review-total" }, formatCents(total)),
		]),
	]);
}

// ── Page Component ───────────────────────────────────────────────────────────

export const CheckoutPage = defineComponent({
	name: "CheckoutPage",
	setup() {
		const sdk = useSdk();
		const router = useRouter();
		const tenantContext = useTenantContext();

		// ── State ────────────────────────────────────────────────────────
		const currentStep = ref(0);
		const cartState = ref<CartState>(createInitialCartState());

		// Fulfillment state
		const fulfillmentMode = ref<string>("pickup");
		const deliveryAddress = ref({ line1: "", city: "", state: "", zip: "" });
		const locations = ref<LocationRecord[]>([]);
		const locationsLoading = ref(false);
		const selectedLocationId = ref<string | null>(null);

		// Payment state
		const paymentMethods = ref<PaymentMethodSummary[]>([]);
		const paymentsLoading = ref(false);
		const selectedPaymentId = ref<string | null>(null);
		const useNewCard = ref(false);
		const newCard = ref({ number: "", expiry: "", cvv: "" });

		// Tip state
		const tipSelection = ref<string>("");
		const customTipCents = ref(0);

		// Promo / review state
		const promoCode = ref("");
		const termsAccepted = ref(false);
		const isSubmitting = ref(false);
		const submitError = ref<string | null>(null);

		// ── Computed Helpers ─────────────────────────────────────────────

		function getSubtotalCents(): number {
			return cartState.value.quote?.subtotalCents ?? 0;
		}

		function getTipCents(): number {
			return calculateTipCents(tipSelection.value, getSubtotalCents(), customTipCents.value);
		}

		function getSelectedLocation(): LocationRecord | null {
			if (!selectedLocationId.value) return null;
			return locations.value.find((l) => l.id === selectedLocationId.value) ?? null;
		}

		function getSelectedPayment(): PaymentMethodSummary | null {
			if (useNewCard.value || !selectedPaymentId.value) return null;
			return paymentMethods.value.find((m) => m.id === selectedPaymentId.value) ?? null;
		}

		// ── Data Loading ─────────────────────────────────────────────────

		async function loadLocations(): Promise<void> {
			locationsLoading.value = true;
			try {
				const result = await sdk.locations.list();
				locations.value = result.data;
			} catch {
				// Non-critical — user can retry
			} finally {
				locationsLoading.value = false;
			}
		}

		async function loadPaymentMethods(): Promise<void> {
			paymentsLoading.value = true;
			try {
				const methods = await sdk.payments.listMethods();
				paymentMethods.value = methods;
				// Auto-select default method
				const defaultMethod = methods.find((m) => m.isDefault);
				if (defaultMethod) {
					selectedPaymentId.value = defaultMethod.id;
					useNewCard.value = false;
				} else if (methods.length > 0) {
					selectedPaymentId.value = methods[0].id;
					useNewCard.value = false;
				} else {
					useNewCard.value = true;
				}
			} catch {
				useNewCard.value = true;
			} finally {
				paymentsLoading.value = false;
			}
		}

		// ── Event Handlers ───────────────────────────────────────────────

		function onFulfillmentModeChange(mode: string): void {
			fulfillmentMode.value = mode;
		}

		function onAddressChange(field: string, value: string): void {
			deliveryAddress.value = { ...deliveryAddress.value, [field]: value };
		}

		function onLocationChange(id: string): void {
			selectedLocationId.value = id;
		}

		function onSelectPayment(id: string): void {
			selectedPaymentId.value = id;
			useNewCard.value = false;
		}

		function onSelectNewCard(): void {
			useNewCard.value = true;
			selectedPaymentId.value = null;
		}

		function onNewCardChange(field: string, value: string): void {
			newCard.value = { ...newCard.value, [field]: value };
		}

		function onTipSelect(selection: string): void {
			tipSelection.value = selection;
		}

		function onCustomTipChange(cents: number): void {
			customTipCents.value = cents;
		}

		function onPromoCodeChange(value: string): void {
			promoCode.value = value;
		}

		function onApplyPromo(): void {
			// Promo code application — currently just stored locally;
			// the backend validates it on order creation.
		}

		function onTermsChange(accepted: boolean): void {
			termsAccepted.value = accepted;
		}

		// ── Step Validation ──────────────────────────────────────────────

		function validateFulfillmentStep(): boolean {
			if (fulfillmentMode.value === "delivery") {
				return validateDeliveryAddress(deliveryAddress.value);
			}
			// Pickup: location must be selected
			return selectedLocationId.value !== null && selectedLocationId.value !== "";
		}

		function validatePaymentStep(): boolean {
			if (useNewCard.value) {
				return validateNewCard(newCard.value);
			}
			return selectedPaymentId.value !== null;
		}

		// ── Navigation ───────────────────────────────────────────────────

		function goBack(): void {
			if (currentStep.value > 0) {
				currentStep.value--;
			}
		}

		function goForward(): void {
			if (currentStep.value === 0) {
				if (!validateFulfillmentStep()) return;
				loadPaymentMethods();
				currentStep.value = 1;
			} else if (currentStep.value === 1) {
				if (!validatePaymentStep()) return;
				currentStep.value = 2;
			}
		}

		// ── Order Submission ─────────────────────────────────────────────

		async function placeOrder(): Promise<void> {
			if (!termsAccepted.value || isSubmitting.value) return;

			isSubmitting.value = true;
			submitError.value = null;

			try {
				const state = cartState.value;
				const authState = getAuthViewerState();
				const quote = state.quote;
				const tipCents = getTipCents();

				if (!state.sessionId) {
					submitError.value = "Cart session is missing. Please return to your cart and try again.";
					isSubmitting.value = false;
					return;
				}

				const mode = fulfillmentMode.value;
				if (mode !== "delivery" && mode !== "pickup") {
					submitError.value = "Invalid fulfillment mode selected.";
					isSubmitting.value = false;
					return;
				}

				const items: CreateOrderItemInput[] = state.items.map((item) => {
					const lineItem = quote?.lineItems.find((li) => li.cartItemId === item.id);
					return {
						catalogItemId: item.catalogItemId,
						catalogItemName: item.catalogItemName,
						variantId: item.variantId,
						variantName: item.variantName,
						quantity: item.quantity,
						unitPriceCents: lineItem?.unitPriceCents ?? item.addedPriceCents,
						lineTotalCents: lineItem?.lineTotalCents ?? item.addedPriceCents * item.quantity,
						modifiers: item.modifiers.map((mod) => ({
							modifierOptionId: mod.modifierOptionId,
							modifierName: mod.modifierName,
							priceCents: mod.priceCents,
						})),
					};
				});

				const subtotalCents = quote?.subtotalCents ?? 0;
				const discountCents = quote?.discountCents ?? 0;
				const taxCents = quote?.taxCents ?? 0;
				const deliveryFeeCents = quote?.deliveryFeeCents ?? 0;
				const totalCents = subtotalCents - discountCents + taxCents + tipCents + deliveryFeeCents;

				const orderInput: CreateOrderFromCartInput = {
					tenantId: tenantContext.tenantId,
					customerId: authState.userId ?? null,
					customerName: authState.displayName ?? null,
					customerEmail: null,
					customerPhone: null,
					cartSessionId: state.sessionId,
					fulfillmentMode: mode,
					deliveryAddress: mode === "delivery"
						? { ...deliveryAddress.value, line2: null }
						: null,
					orderNotes: state.orderNotes,
					promoCode: promoCode.value || null,
					loyaltyCode: state.loyaltyCode,
					items,
					subtotalCents,
					discountCents,
					taxCents,
					tipCents,
					deliveryFeeCents,
					totalCents,
				};

				const order = await sdk.orders.create(orderInput);
				router.push(`/orders/${order.id}/confirmation`);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
				submitError.value = message;
			} finally {
				isSubmitting.value = false;
			}
		}

		// ── Lifecycle ────────────────────────────────────────────────────

		onMounted(() => {
			cartState.value = restoreCart();

			// Sync fulfillment mode and address from cart state
			if (cartState.value.fulfillmentMode) {
				fulfillmentMode.value = cartState.value.fulfillmentMode;
			}
			if (cartState.value.deliveryAddress) {
				deliveryAddress.value = {
					line1: cartState.value.deliveryAddress.line1,
					city: cartState.value.deliveryAddress.city,
					state: cartState.value.deliveryAddress.state,
					zip: cartState.value.deliveryAddress.zip,
				};
			}
			if (cartState.value.promoCode) {
				promoCode.value = cartState.value.promoCode;
			}

			loadLocations();
		});

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			const state = cartState.value;

			if (isCartEmpty(state)) {
				return h("div", {
					class: "checkout-page__empty",
					"data-testid": "checkout-empty",
				}, [
					h("h2", "Your cart is empty"),
					h("p", "Add items to your cart before checking out."),
				]);
			}

			return h("div", { class: "checkout-page", "data-testid": "checkout-page" }, [
				h("h1", { class: "checkout-page__title" }, "Checkout"),

				renderStepIndicators(currentStep.value),

				// Step content
				currentStep.value === 0
					? renderFulfillmentStep(
						fulfillmentMode.value,
						onFulfillmentModeChange,
						deliveryAddress.value,
						onAddressChange,
						locations.value,
						selectedLocationId.value,
						onLocationChange,
						locationsLoading.value,
					)
					: currentStep.value === 1
						? renderPaymentStep(
							paymentMethods.value,
							selectedPaymentId.value,
							useNewCard.value,
							onSelectPayment,
							onSelectNewCard,
							newCard.value,
							onNewCardChange,
							paymentsLoading.value,
							tipSelection.value,
							customTipCents.value,
							getSubtotalCents(),
							onTipSelect,
							onCustomTipChange,
							promoCode.value,
							onPromoCodeChange,
							onApplyPromo,
						)
						: renderReviewStep(
							state,
							fulfillmentMode.value,
							deliveryAddress.value,
							getSelectedLocation(),
							getSelectedPayment(),
							useNewCard.value,
							getTipCents(),
							promoCode.value || null,
							termsAccepted.value,
							onTermsChange,
							isSubmitting.value,
							submitError.value,
							placeOrder,
						),

				// Step navigation (not shown as separate nav on review step — review has its own "Place Order" button)
				currentStep.value < 2
					? renderStepNavigation(
						currentStep.value,
						goBack,
						goForward,
					)
					: renderStepNavigation(
						currentStep.value,
						goBack,
						placeOrder,
						isSubmitting.value ? "Placing Order..." : "Place Order",
						!termsAccepted.value || isSubmitting.value,
					),
			]);
		};
	},
});
