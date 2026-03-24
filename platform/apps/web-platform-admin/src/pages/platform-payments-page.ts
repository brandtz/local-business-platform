// Platform Payment Providers page (PA-11) — provider cards for Stripe and
// PayPal with connection status, masked API keys, and edit/configure actions.
// Uses mock data because the payment-configuration API is not yet available.

import { defineComponent, h, ref, type VNode } from "vue";

// ── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = "connected" | "disconnected" | "error";

type PaymentProvider = {
	id: string;
	name: string;
	description: string;
	status: ConnectionStatus;
	apiKeyMasked: string;
	environment: "sandbox" | "production";
	supportsRecurring: boolean;
};

// ── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_PROVIDERS: PaymentProvider[] = [
	{
		id: "stripe",
		name: "Stripe",
		description: "Accept credit cards, debit cards, and popular payment methods worldwide.",
		status: "connected",
		apiKeyMasked: "****7f3a",
		environment: "sandbox",
		supportsRecurring: true,
	},
	{
		id: "paypal",
		name: "PayPal",
		description: "Enable PayPal checkout for customers with PayPal accounts or credit cards.",
		status: "disconnected",
		apiKeyMasked: "****0000",
		environment: "sandbox",
		supportsRecurring: false,
	},
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: ConnectionStatus): string {
	switch (status) {
		case "connected":
			return "badge--green";
		case "disconnected":
			return "badge--gray";
		case "error":
			return "badge--red";
		default:
			return "badge--default";
	}
}

function statusLabel(status: ConnectionStatus): string {
	switch (status) {
		case "connected":
			return "Connected";
		case "disconnected":
			return "Disconnected";
		case "error":
			return "Error";
		default:
			return "Unknown";
	}
}

// ── Render helpers ───────────────────────────────────────────────────────────

function renderIntegrationBanner(): VNode {
	return h(
		"div",
		{
			class: "alert alert--info",
			role: "status",
			"data-testid": "payments-integration-banner",
		},
		[
			h("strong", "Integration Pending"),
			h(
				"p",
				"Payment provider configuration endpoints are not yet fully available. The data shown below is placeholder content for UI preview purposes.",
			),
		],
	);
}

function renderProviderCard(
	provider: PaymentProvider,
	onConfigure: (id: string) => void,
	onToggle: (id: string) => void,
): VNode {
	return h(
		"article",
		{
			class: [
				"provider-card",
				`provider-card--${provider.status}`,
			],
			"data-testid": `provider-card-${provider.id}`,
		},
		[
			h("div", { class: "provider-card__header" }, [
				h(
					"h3",
					{ class: "provider-card__name", "data-testid": `provider-name-${provider.id}` },
					provider.name,
				),
				h(
					"span",
					{
						class: `badge ${statusBadgeClass(provider.status)}`,
						"data-testid": `provider-status-${provider.id}`,
					},
					statusLabel(provider.status),
				),
			]),

			h(
				"p",
				{ class: "provider-card__description", "data-testid": `provider-desc-${provider.id}` },
				provider.description,
			),

			h("div", { class: "provider-card__details" }, [
				h("div", { class: "provider-card__detail" }, [
					h("span", { class: "provider-card__detail-label" }, "API Key"),
					h(
						"code",
						{
							class: "provider-card__api-key",
							"data-testid": `provider-api-key-${provider.id}`,
						},
						provider.apiKeyMasked,
					),
				]),

				h("div", { class: "provider-card__detail" }, [
					h("span", { class: "provider-card__detail-label" }, "Environment"),
					h(
						"span",
						{
							class: `badge ${provider.environment === "production" ? "badge--blue" : "badge--yellow"}`,
							"data-testid": `provider-env-${provider.id}`,
						},
						provider.environment,
					),
				]),

				h("div", { class: "provider-card__detail" }, [
					h("span", { class: "provider-card__detail-label" }, "Recurring Payments"),
					h(
						"span",
						{ "data-testid": `provider-recurring-${provider.id}` },
						provider.supportsRecurring ? "✓ Supported" : "✗ Not supported",
					),
				]),
			]),

			h("div", { class: "provider-card__actions" }, [
				h(
					"button",
					{
						class: "btn btn--secondary btn--sm",
						type: "button",
						"data-testid": `provider-configure-${provider.id}`,
						onClick: () => onConfigure(provider.id),
					},
					"Configure",
				),
				h(
					"button",
					{
						class: provider.status === "connected"
							? "btn btn--danger btn--sm"
							: "btn btn--primary btn--sm",
						type: "button",
						"data-testid": `provider-toggle-${provider.id}`,
						onClick: () => onToggle(provider.id),
					},
					provider.status === "connected" ? "Disconnect" : "Connect",
				),
			]),
		],
	);
}

function renderConfigureModal(
	provider: PaymentProvider,
	formKey: string,
	formSecret: string,
	formEnv: string,
	onUpdate: (field: string, value: string) => void,
	onSave: () => void,
	onCancel: () => void,
): VNode {
	return h(
		"div",
		{
			class: "modal-overlay",
			"data-testid": "provider-configure-modal",
		},
		[
			h("div", { class: "modal", role: "dialog", "aria-label": `Configure ${provider.name}` }, [
				h("div", { class: "modal__header" }, [
					h("h2", `Configure ${provider.name}`),
					h(
						"button",
						{
							class: "btn btn--icon",
							type: "button",
							"aria-label": "Close",
							"data-testid": "modal-close-button",
							onClick: onCancel,
						},
						"✕",
					),
				]),

				h("form", {
					class: "modal__body",
					onSubmit: (e: Event) => {
						e.preventDefault();
						onSave();
					},
				}, [
					h("div", { class: "form-field", "data-testid": "field-provider-api-key" }, [
						h("label", { class: "form-field__label", for: "provider-api-key" }, "API Key"),
						h("input", {
							class: "form-field__input",
							id: "provider-api-key",
							type: "text",
							value: formKey,
							placeholder: "pk_live_...",
							"data-testid": "provider-api-key-input",
							onInput: (e: Event) =>
								onUpdate("apiKey", (e.target as HTMLInputElement).value),
						}),
					]),

					h("div", { class: "form-field", "data-testid": "field-provider-secret" }, [
						h("label", { class: "form-field__label", for: "provider-secret" }, "Secret Key"),
						h("input", {
							class: "form-field__input",
							id: "provider-secret",
							type: "password",
							value: formSecret,
							placeholder: "sk_live_...",
							"data-testid": "provider-secret-input",
							onInput: (e: Event) =>
								onUpdate("secret", (e.target as HTMLInputElement).value),
						}),
					]),

					h("div", { class: "form-field", "data-testid": "field-provider-environment" }, [
						h("label", { class: "form-field__label", for: "provider-environment" }, "Environment"),
						h(
							"select",
							{
								class: "form-field__select",
								id: "provider-environment",
								value: formEnv,
								"data-testid": "provider-environment-select",
								onChange: (e: Event) =>
									onUpdate("environment", (e.target as HTMLSelectElement).value),
							},
							[
								h("option", { value: "sandbox" }, "Sandbox"),
								h("option", { value: "production" }, "Production"),
							],
						),
					]),
				]),

				h("div", { class: "modal__footer" }, [
					h(
						"button",
						{
							class: "btn btn--secondary",
							type: "button",
							"data-testid": "modal-cancel-button",
							onClick: onCancel,
						},
						"Cancel",
					),
					h(
						"button",
						{
							class: "btn btn--primary",
							type: "button",
							"data-testid": "modal-save-button",
							onClick: onSave,
						},
						"Save Configuration",
					),
				]),
			]),
		],
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformPaymentsConfigPage = defineComponent({
	name: "PlatformPaymentsConfigPage",

	setup() {
		const providers = ref<PaymentProvider[]>([...INITIAL_PROVIDERS]);

		// Modal state
		const editingProviderId = ref<string | null>(null);
		const formApiKey = ref("");
		const formSecret = ref("");
		const formEnvironment = ref("sandbox");

		function handleToggle(id: string): void {
			providers.value = providers.value.map((p) => {
				if (p.id !== id) return p;
				const nextStatus: ConnectionStatus =
					p.status === "connected" ? "disconnected" : "connected";
				return { ...p, status: nextStatus };
			});
		}

		function handleConfigure(id: string): void {
			const provider = providers.value.find((p) => p.id === id);
			if (!provider) return;

			editingProviderId.value = id;
			formApiKey.value = "";
			formSecret.value = "";
			formEnvironment.value = provider.environment;
		}

		function handleFormUpdate(field: string, value: string): void {
			switch (field) {
				case "apiKey":
					formApiKey.value = value;
					break;
				case "secret":
					formSecret.value = value;
					break;
				case "environment":
					formEnvironment.value = value;
					break;
			}
		}

		function handleModalSave(): void {
			if (!editingProviderId.value) return;

			providers.value = providers.value.map((p) => {
				if (p.id !== editingProviderId.value) return p;
				return {
					...p,
					environment: formEnvironment.value as "sandbox" | "production",
					apiKeyMasked: formApiKey.value
						? `****${formApiKey.value.slice(-4)}`
						: p.apiKeyMasked,
					status: "connected" as ConnectionStatus,
				};
			});

			editingProviderId.value = null;
		}

		function handleModalCancel(): void {
			editingProviderId.value = null;
		}

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			const editingProvider = editingProviderId.value
				? providers.value.find((p) => p.id === editingProviderId.value) ?? null
				: null;

			return h(
				"section",
				{ class: "payments-page", "data-testid": "platform-payments-page" },
				[
					h("header", { class: "payments-page__header" }, [
						h("h1", { class: "payments-page__title" }, "Payment Providers"),
					]),

					renderIntegrationBanner(),

					h(
						"div",
						{ class: "payments-page__grid", "data-testid": "providers-grid" },
						providers.value.map((provider) =>
							renderProviderCard(provider, handleConfigure, handleToggle),
						),
					),

					editingProvider
						? renderConfigureModal(
								editingProvider,
								formApiKey.value,
								formSecret.value,
								formEnvironment.value,
								handleFormUpdate,
								handleModalSave,
								handleModalCancel,
							)
						: null,
				],
			);
		};
	},
});
