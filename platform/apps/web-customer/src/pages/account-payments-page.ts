// Account Payment Methods page — list saved cards, add/remove methods,
// set default, with confirmation dialogs.
// Fetches data via SDK payments API.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import type { PaymentMethodSummary } from "@platform/sdk";

import { useSdk } from "../composables/use-sdk";
import { renderAccountSidebar } from "./account-dashboard-page";

// ── Pure Helpers ─────────────────────────────────────────────────────────────

export function getCardBrandIcon(brand: string): string {
	const icons: Record<string, string> = {
		visa: "💳",
		mastercard: "💳",
		amex: "💳",
		discover: "💳",
		"american express": "💳",
		diners: "💳",
		jcb: "💳",
		unionpay: "💳",
	};
	return icons[brand.toLowerCase()] ?? "💳";
}

export function formatExpiryDate(month: number, year: number): string {
	const mm = String(month).padStart(2, "0");
	const yy = String(year).slice(-2);
	return `${mm}/${yy}`;
}

function getCardBrandLabel(brand: string): string {
	const labels: Record<string, string> = {
		visa: "Visa",
		mastercard: "Mastercard",
		amex: "Amex",
		discover: "Discover",
		"american express": "American Express",
		diners: "Diners Club",
		jcb: "JCB",
		unionpay: "UnionPay",
	};
	return labels[brand.toLowerCase()] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

// ── Render Helpers ──────────────────────────────────────────────────────────

function renderLoading(): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", "Loading payment methods..."),
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
		h(RouterLink, { to: "/account", class: "page-error__back" }, {
			default: () => "Back to Account",
		}),
	]);
}

function renderEmpty(): VNode {
	return h("div", {
		class: "account-payments__empty",
		"data-testid": "empty-state",
	}, [
		h("p", { class: "account-payments__empty-title" }, "No Payment Methods"),
		h("p", { class: "account-payments__empty-message" }, "Add a payment method for faster checkout."),
	]);
}

function renderPaymentCard(
	method: PaymentMethodSummary,
	removingId: string | null,
	onRemove: (id: string) => void,
	onSetDefault: (id: string) => void,
): VNode {
	return h("div", {
		class: [
			"account-payments__card",
			method.isDefault ? "account-payments__card--default" : "",
		],
		"data-testid": `payment-method-${method.id}`,
	}, [
		h("div", { class: "account-payments__card-main" }, [
			h("span", {
				class: "account-payments__brand-icon",
				"aria-hidden": "true",
				"data-testid": "card-brand-icon",
			}, getCardBrandIcon(method.type)),
			h("div", { class: "account-payments__card-info" }, [
				h("span", {
					class: "account-payments__card-brand",
					"data-testid": "card-brand",
				}, getCardBrandLabel(method.type)),
				h("span", {
					class: "account-payments__card-last4",
					"data-testid": "card-last4",
				}, `•••• ${method.last4}`),
			]),
			method.isDefault
				? h("span", {
					class: "account-payments__default-badge",
					"data-testid": "default-badge",
				}, "Default")
				: null,
		]),
		h("div", { class: "account-payments__card-actions" }, [
			!method.isDefault
				? h("button", {
					class: "account-payments__action-btn",
					"data-testid": `set-default-${method.id}`,
					onClick: () => onSetDefault(method.id),
				}, "Set as Default")
				: null,
			h("button", {
				class: "account-payments__action-btn account-payments__action-btn--danger",
				"data-testid": `remove-${method.id}`,
				disabled: removingId === method.id,
				onClick: () => onRemove(method.id),
			}, removingId === method.id ? "Removing..." : "Remove"),
		]),
	]);
}

function renderAddMethodForm(
	showForm: boolean,
	adding: boolean,
	formError: string | null,
	token: string,
	cardType: string,
	onToggle: () => void,
	onUpdateToken: (val: string) => void,
	onUpdateType: (val: string) => void,
	onSubmit: () => void,
): VNode {
	if (!showForm) {
		return h("button", {
			class: "account-payments__add-btn",
			"data-testid": "add-method-btn",
			onClick: onToggle,
		}, "+ Add Payment Method");
	}

	return h("section", {
		class: "account-payments__add-form",
		"data-testid": "add-method-form",
	}, [
		h("h3", { class: "account-payments__section-title" }, "Add Payment Method"),
		formError
			? h("div", {
				class: "account-payments__form-error",
				role: "alert",
				"data-testid": "add-method-error",
			}, formError)
			: null,
		h("div", { class: "account-payments__field" }, [
			h("label", { for: "card-type" }, "Card Type"),
			h("select", {
				id: "card-type",
				value: cardType,
				"data-testid": "input-card-type",
				onChange: (e: Event) => onUpdateType((e.target as HTMLSelectElement).value),
			}, [
				h("option", { value: "visa" }, "Visa"),
				h("option", { value: "mastercard" }, "Mastercard"),
				h("option", { value: "amex" }, "Amex"),
				h("option", { value: "discover" }, "Discover"),
			]),
		]),
		h("div", { class: "account-payments__field" }, [
			h("label", { for: "card-token" }, "Card Token"),
			h("input", {
				id: "card-token",
				type: "text",
				value: token,
				placeholder: "Enter payment token",
				"data-testid": "input-card-token",
				onInput: (e: Event) => onUpdateToken((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "account-payments__form-actions" }, [
			h("button", {
				class: "account-payments__submit-btn",
				"data-testid": "submit-add-method",
				disabled: adding || token.trim().length === 0,
				onClick: onSubmit,
			}, adding ? "Adding..." : "Add Card"),
			h("button", {
				class: "account-payments__cancel-btn",
				"data-testid": "cancel-add-method",
				onClick: onToggle,
			}, "Cancel"),
		]),
	]);
}

function renderRemoveConfirmation(
	methodId: string,
	confirming: boolean,
	onConfirm: () => void,
	onCancel: () => void,
): VNode {
	return h("div", {
		class: "account-payments__confirm-dialog",
		role: "dialog",
		"aria-modal": "true",
		"data-testid": "remove-confirmation",
	}, [
		h("div", { class: "account-payments__confirm-content" }, [
			h("p", "Are you sure you want to remove this payment method?"),
			h("div", { class: "account-payments__confirm-actions" }, [
				h("button", {
					class: "account-payments__confirm-btn account-payments__confirm-btn--danger",
					"data-testid": "confirm-remove",
					disabled: confirming,
					onClick: onConfirm,
				}, confirming ? "Removing..." : "Remove"),
				h("button", {
					class: "account-payments__confirm-btn account-payments__confirm-btn--secondary",
					"data-testid": "cancel-remove",
					onClick: onCancel,
				}, "Cancel"),
			]),
		]),
	]);
}

// ── Page Component ──────────────────────────────────────────────────────────

export const AccountPaymentsPage = defineComponent({
	name: "AccountPaymentsPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const methods = ref<PaymentMethodSummary[]>([]);

		// Add form state
		const showAddForm = ref(false);
		const adding = ref(false);
		const addError = ref<string | null>(null);
		const newToken = ref("");
		const newCardType = ref("visa");

		// Remove confirmation
		const confirmRemoveId = ref<string | null>(null);
		const removing = ref<string | null>(null);

		async function fetchMethods(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				methods.value = await sdk.payments.listMethods();
			} catch {
				error.value = "Unable to load payment methods. Please try again later.";
			} finally {
				loading.value = false;
			}
		}

		function toggleAddForm(): void {
			showAddForm.value = !showAddForm.value;
			addError.value = null;
			newToken.value = "";
			newCardType.value = "visa";
		}

		async function addMethod(): Promise<void> {
			adding.value = true;
			addError.value = null;

			try {
				await sdk.payments.addMethod({
					type: newCardType.value,
					token: newToken.value,
					setDefault: methods.value.length === 0,
				});
				showAddForm.value = false;
				newToken.value = "";
				newCardType.value = "visa";
				await fetchMethods();
			} catch {
				addError.value = "Unable to add payment method. Please try again.";
			} finally {
				adding.value = false;
			}
		}

		function startRemove(id: string): void {
			confirmRemoveId.value = id;
		}

		function cancelRemove(): void {
			confirmRemoveId.value = null;
		}

		async function confirmRemove(): Promise<void> {
			if (!confirmRemoveId.value) return;
			removing.value = confirmRemoveId.value;

			try {
				await sdk.payments.removeMethod(confirmRemoveId.value);
				confirmRemoveId.value = null;
				await fetchMethods();
			} catch {
				error.value = "Unable to remove payment method. Please try again.";
			} finally {
				removing.value = null;
			}
		}

		async function setDefault(id: string): Promise<void> {
			try {
				// Use the SDK transport to PATCH the payment method as default
				await sdk.transport.patch(`/payments/methods/${id}`, { isDefault: true });
				await fetchMethods();
			} catch {
				error.value = "Unable to update default payment method.";
			}
		}

		onMounted(fetchMethods);

		return () => {
			if (loading.value) return renderLoading();
			if (error.value && methods.value.length === 0) return renderError(error.value);

			return h("div", {
				class: "account-payments-page",
				"data-testid": "account-payments-page",
			}, [
				renderAccountSidebar(route.path, (path) => router.push(path)),
				h("div", { class: "account-payments__content" }, [
					h("h1", { class: "account-payments__heading" }, "Payment Methods"),
					error.value
						? h("div", {
							class: "account-payments__inline-error",
							role: "alert",
							"data-testid": "inline-error",
						}, error.value)
						: null,
					confirmRemoveId.value
						? renderRemoveConfirmation(
							confirmRemoveId.value,
							removing.value === confirmRemoveId.value,
							confirmRemove,
							cancelRemove,
						)
						: null,
					methods.value.length === 0
						? renderEmpty()
						: h("div", {
							class: "account-payments__list",
							"data-testid": "payment-methods-list",
						},
							methods.value.map((method) =>
								renderPaymentCard(method, removing.value, startRemove, setDefault)
							)
						),
					renderAddMethodForm(
						showAddForm.value,
						adding.value,
						addError.value,
						newToken.value,
						newCardType.value,
						toggleAddForm,
						(val: string) => { newToken.value = val; },
						(val: string) => { newCardType.value = val; },
						addMethod,
					),
				]),
			]);
		};
	},
});
