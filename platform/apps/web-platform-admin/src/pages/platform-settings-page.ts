// Platform Global Settings page (PA-07) — admin form for core platform-wide
// configuration: platform name, support email, maintenance mode, default plan,
// and trial duration.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { useSdk } from "../composables/use-sdk";

// ── Types ────────────────────────────────────────────────────────────────────

type GlobalConfig = {
	platformName: string;
	supportEmail: string;
	maintenanceMode: boolean;
	[key: string]: unknown;
};

// ── Constants ────────────────────────────────────────────────────────────────

const PLAN_OPTIONS = [
	{ value: "free", label: "Free" },
	{ value: "starter", label: "Starter" },
	{ value: "professional", label: "Professional" },
	{ value: "enterprise", label: "Enterprise" },
] as const;

// ── Render helpers ───────────────────────────────────────────────────────────

function renderTextInput(
	label: string,
	value: string,
	testId: string,
	onChange: (v: string) => void,
	opts?: { type?: string; disabled?: boolean; placeholder?: string },
): VNode {
	return h("div", { class: "form-field", "data-testid": `field-${testId}` }, [
		h("label", { class: "form-field__label", for: testId }, label),
		h("input", {
			class: "form-field__input",
			id: testId,
			type: opts?.type ?? "text",
			value,
			disabled: opts?.disabled ?? false,
			placeholder: opts?.placeholder ?? "",
			"data-testid": testId,
			onInput: (e: Event) => onChange((e.target as HTMLInputElement).value),
		}),
	]);
}

function renderCheckboxField(
	label: string,
	checked: boolean,
	testId: string,
	onChange: (v: boolean) => void,
	opts?: { disabled?: boolean },
): VNode {
	return h("div", { class: "form-field form-field--checkbox", "data-testid": `field-${testId}` }, [
		h("label", { class: "form-field__label form-field__label--inline" }, [
			h("input", {
				type: "checkbox",
				checked,
				disabled: opts?.disabled ?? false,
				"data-testid": testId,
				onChange: () => onChange(!checked),
			}),
			h("span", label),
		]),
	]);
}

function renderSelectField(
	label: string,
	value: string,
	options: ReadonlyArray<{ value: string; label: string }>,
	testId: string,
	onChange: (v: string) => void,
	opts?: { disabled?: boolean },
): VNode {
	return h("div", { class: "form-field", "data-testid": `field-${testId}` }, [
		h("label", { class: "form-field__label", for: testId }, label),
		h(
			"select",
			{
				class: "form-field__select",
				id: testId,
				value,
				disabled: opts?.disabled ?? false,
				"data-testid": testId,
				onChange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
			},
			options.map((opt) =>
				h("option", { value: opt.value }, opt.label),
			),
		),
	]);
}

function renderNumberInput(
	label: string,
	value: number,
	testId: string,
	onChange: (v: number) => void,
	opts?: { min?: number; max?: number; disabled?: boolean; suffix?: string },
): VNode {
	return h("div", { class: "form-field", "data-testid": `field-${testId}` }, [
		h("label", { class: "form-field__label", for: testId }, label),
		h("div", { class: "form-field__input-group" }, [
			h("input", {
				class: "form-field__input",
				id: testId,
				type: "number",
				value: String(value),
				min: opts?.min ?? 0,
				max: opts?.max,
				disabled: opts?.disabled ?? false,
				"data-testid": testId,
				onInput: (e: Event) =>
					onChange(Number((e.target as HTMLInputElement).value)),
			}),
			opts?.suffix
				? h("span", { class: "form-field__suffix" }, opts.suffix)
				: null,
		]),
	]);
}

function renderLoadingState(): VNode {
	return h(
		"section",
		{
			class: "settings-page settings-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "settings-page-loading",
		},
		[h("p", "Loading settings…")],
	);
}

function renderErrorState(message: string, onRetry: () => void): VNode {
	return h(
		"section",
		{
			class: "settings-page settings-page--error",
			role: "alert",
			"data-testid": "settings-page-error",
		},
		[
			h("p", { class: "error" }, message),
			h(
				"button",
				{
					class: "btn btn--secondary",
					type: "button",
					"data-testid": "settings-retry-button",
					onClick: onRetry,
				},
				"Retry",
			),
		],
	);
}

function renderSuccessToast(message: string): VNode {
	return h(
		"div",
		{
			class: "toast toast--success",
			role: "status",
			"aria-live": "polite",
			"data-testid": "settings-success-toast",
		},
		message,
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformSettingsPage = defineComponent({
	name: "PlatformSettingsPage",

	setup() {
		const sdk = useSdk();

		const loading = ref(true);
		const saving = ref(false);
		const error = ref<string | null>(null);
		const successMessage = ref<string | null>(null);

		// Form state
		const platformName = ref("");
		const supportEmail = ref("");
		const maintenanceMode = ref(false);
		const defaultPlan = ref("starter");
		const trialDuration = ref(14);

		async function fetchSettings(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const config: GlobalConfig = await sdk.config.getGlobal();
				platformName.value = config.platformName ?? "";
				supportEmail.value = config.supportEmail ?? "";
				maintenanceMode.value = config.maintenanceMode ?? false;
				defaultPlan.value = (config.defaultPlan as string) ?? "starter";
				trialDuration.value = (config.trialDuration as number) ?? 14;
			} catch (err: unknown) {
				error.value =
					err instanceof Error
						? err.message
						: "Failed to load platform settings.";
			} finally {
				loading.value = false;
			}
		}

		async function handleSave(): Promise<void> {
			saving.value = true;
			error.value = null;
			successMessage.value = null;

			try {
				await sdk.config.updateGlobal({
					platformName: platformName.value,
					supportEmail: supportEmail.value,
					maintenanceMode: maintenanceMode.value,
					defaultPlan: defaultPlan.value,
					trialDuration: trialDuration.value,
				});
				successMessage.value = "Settings saved successfully.";
			} catch (err: unknown) {
				error.value =
					err instanceof Error
						? err.message
						: "Failed to save platform settings.";
			} finally {
				saving.value = false;
			}
		}

		onMounted(() => {
			void fetchSettings();
		});

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			if (loading.value) {
				return renderLoadingState();
			}

			if (error.value && !platformName.value && !supportEmail.value) {
				return renderErrorState(error.value, () => void fetchSettings());
			}

			return h(
				"section",
				{ class: "settings-page", "data-testid": "platform-settings-page" },
				[
					h("header", { class: "settings-page__header" }, [
						h("h1", { class: "settings-page__title" }, "Platform Settings"),
						h(
							"button",
							{
								class: "btn btn--primary",
								type: "button",
								disabled: saving.value,
								"data-testid": "settings-save-button",
								onClick: () => void handleSave(),
							},
							saving.value ? "Saving…" : "Save Changes",
						),
					]),

					successMessage.value
						? renderSuccessToast(successMessage.value)
						: null,

					error.value
						? h(
								"div",
								{ class: "alert alert--error", role: "alert", "data-testid": "settings-inline-error" },
								error.value,
							)
						: null,

					h("form", {
						class: "settings-page__form",
						"data-testid": "settings-form",
						onSubmit: (e: Event) => {
							e.preventDefault();
							void handleSave();
						},
					}, [
						h("fieldset", { class: "settings-page__section" }, [
							h("legend", { class: "settings-page__section-title" }, "General"),

							renderTextInput(
								"Platform Name",
								platformName.value,
								"settings-platform-name",
								(v) => { platformName.value = v; },
								{ disabled: saving.value, placeholder: "My Platform" },
							),

							renderTextInput(
								"Support Email",
								supportEmail.value,
								"settings-support-email",
								(v) => { supportEmail.value = v; },
								{ type: "email", disabled: saving.value, placeholder: "support@example.com" },
							),
						]),

						h("fieldset", { class: "settings-page__section" }, [
							h("legend", { class: "settings-page__section-title" }, "Operations"),

							renderCheckboxField(
								"Maintenance Mode",
								maintenanceMode.value,
								"settings-maintenance-mode",
								(v) => { maintenanceMode.value = v; },
								{ disabled: saving.value },
							),
						]),

						h("fieldset", { class: "settings-page__section" }, [
							h("legend", { class: "settings-page__section-title" }, "Plans & Trials"),

							renderSelectField(
								"Default Plan",
								defaultPlan.value,
								PLAN_OPTIONS,
								"settings-default-plan",
								(v) => { defaultPlan.value = v; },
								{ disabled: saving.value },
							),

							renderNumberInput(
								"Trial Duration",
								trialDuration.value,
								"settings-trial-duration",
								(v) => { trialDuration.value = v; },
								{ min: 1, max: 365, disabled: saving.value, suffix: "days" },
							),
						]),
					]),
				],
			);
		};
	},
});
