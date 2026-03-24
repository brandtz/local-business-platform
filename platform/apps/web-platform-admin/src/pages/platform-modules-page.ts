// Platform Modules configuration page (PA-05) — feature-flag list with toggle
// switches for each registered module.  Loads the module registry, lets the
// admin enable / disable individual modules, and persists the changes.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { useSdk } from "../composables/use-sdk";
import type { ModuleRegistryEntry, TenantModuleKey } from "@platform/types";

// ── Render helpers ───────────────────────────────────────────────────────────

function renderModuleToggle(
	mod: ModuleRegistryEntry,
	enabled: boolean,
	saving: boolean,
	onToggle: (key: TenantModuleKey, value: boolean) => void,
): VNode {
	return h(
		"div",
		{
			class: [
				"module-card",
				enabled ? "module-card--enabled" : "module-card--disabled",
			],
			"data-testid": `module-card-${mod.key}`,
		},
		[
			h("div", { class: "module-card__info" }, [
				h(
					"h3",
					{ class: "module-card__name", "data-testid": `module-name-${mod.key}` },
					mod.displayName,
				),
				h(
					"p",
					{ class: "module-card__description", "data-testid": `module-desc-${mod.key}` },
					mod.description,
				),
			]),
			h("label", { class: "module-card__toggle", "data-testid": `module-toggle-label-${mod.key}` }, [
				h("input", {
					type: "checkbox",
					checked: enabled,
					disabled: saving,
					"data-testid": `module-toggle-${mod.key}`,
					onChange: () => onToggle(mod.key, !enabled),
				}),
				h(
					"span",
					{ class: "module-card__toggle-text" },
					enabled ? "Enabled" : "Disabled",
				),
			]),
		],
	);
}

function renderLoadingState(): VNode {
	return h(
		"section",
		{
			class: "modules-page modules-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "modules-page-loading",
		},
		[h("p", "Loading modules…")],
	);
}

function renderErrorState(message: string, onRetry: () => void): VNode {
	return h(
		"section",
		{
			class: "modules-page modules-page--error",
			role: "alert",
			"data-testid": "modules-page-error",
		},
		[
			h("p", { class: "error" }, message),
			h(
				"button",
				{
					class: "btn btn--secondary",
					type: "button",
					"data-testid": "modules-retry-button",
					onClick: onRetry,
				},
				"Retry",
			),
		],
	);
}

function renderSuccessBanner(message: string): VNode {
	return h(
		"div",
		{
			class: "alert alert--success",
			role: "status",
			"aria-live": "polite",
			"data-testid": "modules-success-banner",
		},
		message,
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformModulesPage = defineComponent({
	name: "PlatformModulesPage",

	setup() {
		const sdk = useSdk();

		const loading = ref(true);
		const saving = ref(false);
		const error = ref<string | null>(null);
		const successMessage = ref<string | null>(null);

		const modules = ref<ModuleRegistryEntry[]>([]);
		const enabledKeys = ref<Set<TenantModuleKey>>(new Set());

		async function fetchModules(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const result = await sdk.config.getModules();
				modules.value = result;
				// Assume all modules are initially enabled unless toggled off
				enabledKeys.value = new Set(result.map((m) => m.key));
			} catch (err: unknown) {
				error.value =
					err instanceof Error
						? err.message
						: "Failed to load module configuration.";
			} finally {
				loading.value = false;
			}
		}

		function handleToggle(key: TenantModuleKey, value: boolean): void {
			const next = new Set(enabledKeys.value);
			if (value) {
				next.add(key);
			} else {
				next.delete(key);
			}
			enabledKeys.value = next;
			successMessage.value = null;
		}

		async function handleSave(): Promise<void> {
			saving.value = true;
			error.value = null;
			successMessage.value = null;

			try {
				const enabled = Array.from(enabledKeys.value);
				const updatePromises = modules.value.map((mod) =>
					sdk.config.updateModule(mod.key, {
						enabledModules: enabled,
					}),
				);
				await Promise.all(updatePromises);
				successMessage.value = "Module configuration saved successfully.";
			} catch (err: unknown) {
				error.value =
					err instanceof Error
						? err.message
						: "Failed to save module configuration.";
			} finally {
				saving.value = false;
			}
		}

		onMounted(() => {
			void fetchModules();
		});

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			if (loading.value) {
				return renderLoadingState();
			}

			if (error.value && modules.value.length === 0) {
				return renderErrorState(error.value, () => void fetchModules());
			}

			return h(
				"section",
				{ class: "modules-page", "data-testid": "platform-modules-page" },
				[
					h("header", { class: "modules-page__header" }, [
						h("h1", { class: "modules-page__title" }, "Module Configuration"),
						h(
							"button",
							{
								class: "btn btn--primary",
								type: "button",
								disabled: saving.value,
								"data-testid": "modules-save-button",
								onClick: () => void handleSave(),
							},
							saving.value ? "Saving…" : "Save Changes",
						),
					]),

					successMessage.value
						? renderSuccessBanner(successMessage.value)
						: null,

					error.value
						? h(
								"div",
								{ class: "alert alert--error", role: "alert", "data-testid": "modules-inline-error" },
								error.value,
							)
						: null,

					h(
						"div",
						{ class: "modules-page__grid", "data-testid": "modules-grid" },
						modules.value.map((mod) =>
							renderModuleToggle(
								mod,
								enabledKeys.value.has(mod.key),
								saving.value,
								handleToggle,
							),
						),
					),
				],
			);
		};
	},
});
