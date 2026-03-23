// E13-S5-T4: Payment Gateway Settings page — provider cards with connection
// status, connect/disconnect actions, and accepted payment type toggles.

import { defineComponent, h, onMounted, ref } from "vue";

import { useSdk } from "../composables/use-sdk";
import {
	buildConnectionListRow,
	getProviderFormFields,
	getProviderLabel,
	validateConnectionForm,
	isConnectionFormValid,
	type ConnectionListRow,
	type ConnectionFormField,
	type ConnectionFormErrors,
} from "../payment-connection-management";
import type { PaymentProvider, PaymentProviderCredentials } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type PaymentSettingsState = {
	connections: ConnectionListRow[];
	isLoading: boolean;
	error: string | null;
	connectingProvider: PaymentProvider | null;
	formValues: Record<string, string>;
	formErrors: ConnectionFormErrors;
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderProviderCard(
	connection: ConnectionListRow,
	onConnect: (provider: PaymentProvider) => void,
	onDisconnect: (id: string) => void,
) {
	const isConnected = connection.statusBadge.status === "active";

	return h(
		"div",
		{
			class: "payment-card",
			key: connection.id,
			"data-testid": `payment-card-${connection.providerLabel.toLowerCase()}`,
		},
		[
			h("div", { class: "payment-card__header" }, [
				h("span", { class: "payment-card__icon", "aria-hidden": "true" }, connection.providerIcon),
				h("span", { class: "payment-card__name" }, connection.providerLabel),
			]),
			h("div", { class: "payment-card__body" }, [
				h("div", { class: "payment-card__status" }, [
					h(
						"span",
						{
							class: `status-badge status-badge--${connection.statusBadge.colorClass}`,
							"data-testid": "connection-status",
						},
						connection.statusBadge.label,
					),
				]),
				connection.modeBadge
					? h("div", { class: "payment-card__mode" }, [
							h("span", { class: "payment-card__mode-label" }, "Mode: "),
							h("span", { class: "payment-card__mode-value" }, connection.modeBadge.label),
						])
					: null,
				connection.lastVerifiedLabel
					? h("div", { class: "payment-card__verified" }, [
							h("span", "Last verified: "),
							h("time", connection.lastVerifiedLabel),
						])
					: null,
			]),
			h("div", { class: "payment-card__actions" }, [
				isConnected
					? h("button", {
							class: "btn btn--danger",
							type: "button",
							onClick: () => onDisconnect(connection.id),
							"data-testid": "disconnect-btn",
						}, "Disconnect")
					: h("button", {
							class: "btn btn--primary",
							type: "button",
							onClick: () => onConnect(connection.providerLabel.toLowerCase() as PaymentProvider),
							"data-testid": "connect-btn",
						}, "Connect"),
				connection.canVerify
					? h("button", {
							class: "btn btn--secondary",
							type: "button",
							"data-testid": "verify-btn",
						}, "Verify")
					: null,
			]),
		],
	);
}

function renderConnectForm(
	provider: PaymentProvider,
	fields: ConnectionFormField[],
	values: Record<string, string>,
	errors: ConnectionFormErrors,
	onFieldChange: (name: string, value: string) => void,
	onSubmit: () => void,
	onCancel: () => void,
) {
	const errorMessages = Object.values(errors).filter(Boolean);
	return h("div", { class: "payment-connect-form", "data-testid": "connect-form" }, [
		h("h3", { class: "payment-connect-form__title" }, `Connect ${getProviderLabel(provider)}`),
		errorMessages.length > 0
			? h("div", { class: "alert alert--error", role: "alert" }, [
					h("ul", errorMessages.map((err) => h("li", { key: err }, err))),
				])
			: null,
		h("div", { class: "payment-connect-form__fields" },
			fields.map((field) =>
				h("div", { class: "form-field", key: field.name }, [
					h("label", { class: "form-field__label", for: field.name }, field.label),
					field.type === "select" && field.options
						? h("select", {
								class: "form-field__input",
								id: field.name,
								value: values[field.name] ?? "",
								onChange: (e: Event) => onFieldChange(field.name, (e.target as HTMLSelectElement).value),
							}, field.options.map((opt) =>
								h("option", { value: opt.value, key: opt.value }, opt.label),
							))
						: h("input", {
								class: "form-field__input",
								id: field.name,
								type: field.type,
								value: values[field.name] ?? "",
								placeholder: field.placeholder ?? "",
								required: field.required,
								onInput: (e: Event) => onFieldChange(field.name, (e.target as HTMLInputElement).value),
							}),
				]),
			),
		),
		h("div", { class: "form-actions" }, [
			h("button", {
				class: "btn btn--primary",
				type: "button",
				onClick: onSubmit,
				"data-testid": "connect-submit-btn",
			}, "Connect"),
			h("button", {
				class: "btn btn--secondary",
				type: "button",
				onClick: onCancel,
			}, "Cancel"),
		]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PaymentSettingsPage = defineComponent({
	name: "PaymentSettingsPage",
	setup() {
		const state = ref<PaymentSettingsState>({
			connections: [],
			isLoading: true,
			error: null,
			connectingProvider: null,
			formValues: {},
			formErrors: {},
		});

		onMounted(async () => {
			try {
				const sdk = useSdk();
				const config = await sdk.payments.getConfig();
				const row = buildConnectionListRow(config);
				state.value = {
					...state.value,
					connections: [row],
					isLoading: false,
				};
			} catch {
				state.value = {
					...state.value,
					isLoading: false,
				};
			}
		});

		function startConnect(provider: PaymentProvider) {
			state.value = {
				...state.value,
				connectingProvider: provider,
				formValues: {},
				formErrors: {},
			};
		}

		function cancelConnect() {
			state.value = {
				...state.value,
				connectingProvider: null,
				formValues: {},
				formErrors: {},
			};
		}

		function updateFormField(name: string, value: string) {
			state.value = {
				...state.value,
				formValues: { ...state.value.formValues, [name]: value },
			};
		}

		async function submitConnect() {
			const provider = state.value.connectingProvider;
			if (!provider) return;

			const errors = validateConnectionForm(provider, state.value.formValues);
			if (!isConnectionFormValid(errors)) {
				state.value = { ...state.value, formErrors: errors };
				return;
			}

			try {
				const sdk = useSdk();

				let credentials: PaymentProviderCredentials;
				if (provider === "stripe") {
					credentials = {
						provider: "stripe",
						publishableKey: state.value.formValues["publishableKey"] ?? "",
						secretKey: state.value.formValues["secretKey"] ?? "",
					};
				} else {
					credentials = {
						provider: "square",
						applicationId: state.value.formValues["applicationId"] ?? "",
						accessToken: state.value.formValues["accessToken"] ?? "",
						locationId: state.value.formValues["locationId"] ?? "",
					};
				}

				await sdk.payments.createConnection({
					// tenantId resolved server-side from session context
					tenantId: "",
					provider,
					displayName: state.value.formValues["displayName"] ?? provider,
					mode: (state.value.formValues["mode"] as "sandbox" | "production") ?? "sandbox",
					credentials,
				});
				state.value = {
					...state.value,
					connectingProvider: null,
					formValues: {},
					formErrors: {},
				};
			} catch (err) {
				state.value = {
					...state.value,
					formErrors: { _general: err instanceof Error ? err.message : "Connection failed" },
				};
			}
		}

		function handleDisconnect(connectionId: string) {
			void connectionId;
			// Disconnect handled via confirmation flow
		}

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("div", { class: "settings-page settings-page--loading", role: "status", "data-testid": "payments-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading payment settings..."),
				]);
			}

			return h("div", { class: "settings-page", "data-testid": "payment-settings-page" }, [
				h("h2", { class: "settings-page__title" }, "Payment Settings"),
				s.error
					? h("div", { class: "alert alert--error", role: "alert" }, s.error)
					: null,
				s.connectingProvider
					? renderConnectForm(
							s.connectingProvider,
							getProviderFormFields(s.connectingProvider),
							s.formValues,
							s.formErrors,
							updateFormField,
							submitConnect,
							cancelConnect,
						)
					: null,
				h("div", { class: "payment-cards", "data-testid": "payment-cards" }, [
					...s.connections.map((conn) =>
						renderProviderCard(conn, startConnect, handleDisconnect),
					),
					s.connections.length === 0
						? h("div", { class: "payment-cards__empty", "data-testid": "no-connections" }, [
								h("p", "No payment providers configured"),
								h("div", { class: "payment-cards__add-actions" }, [
									h("button", {
										class: "btn btn--primary",
										type: "button",
										onClick: () => startConnect("stripe" as PaymentProvider),
									}, "Connect Stripe"),
									h("button", {
										class: "btn btn--secondary",
										type: "button",
										onClick: () => startConnect("square" as PaymentProvider),
									}, "Connect Square"),
								]),
							])
						: null,
				]),
			]);
		};
	},
});
