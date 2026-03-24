// Platform Templates & Themes page (PA-08) — grid of theme cards with color
// previews, a "create theme" form, and a "set as default" action.  Uses mock
// data because the theme API is not yet implemented.

import { defineComponent, h, ref, type VNode } from "vue";

// ── Types ────────────────────────────────────────────────────────────────────

type ThemeEntry = {
	id: string;
	name: string;
	primaryColor: string;
	secondaryColor: string;
	font: string;
	isDefault: boolean;
};

// ── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_THEMES: ThemeEntry[] = [
	{
		id: "theme-default",
		name: "Platform Default",
		primaryColor: "#4f46e5",
		secondaryColor: "#10b981",
		font: "Inter",
		isDefault: true,
	},
	{
		id: "theme-dark",
		name: "Dark Mode",
		primaryColor: "#1e293b",
		secondaryColor: "#38bdf8",
		font: "IBM Plex Sans",
		isDefault: false,
	},
	{
		id: "theme-warm",
		name: "Warm Tones",
		primaryColor: "#dc2626",
		secondaryColor: "#f59e0b",
		font: "Lato",
		isDefault: false,
	},
];

const FONT_OPTIONS = [
	"Inter",
	"IBM Plex Sans",
	"Lato",
	"Roboto",
	"Open Sans",
	"Nunito",
] as const;

// ── Render helpers ───────────────────────────────────────────────────────────

function renderColorSwatch(color: string, label: string, testId: string): VNode {
	return h("div", { class: "color-swatch", "data-testid": testId }, [
		h("span", {
			class: "color-swatch__preview",
			style: { backgroundColor: color },
			"aria-hidden": "true",
		}),
		h("span", { class: "color-swatch__label" }, `${label}: ${color}`),
	]);
}

function renderThemeCard(
	theme: ThemeEntry,
	onSetDefault: (id: string) => void,
): VNode {
	return h(
		"article",
		{
			class: [
				"theme-card",
				theme.isDefault ? "theme-card--default" : "",
			],
			"data-testid": `theme-card-${theme.id}`,
		},
		[
			h("div", { class: "theme-card__header" }, [
				h(
					"h3",
					{ class: "theme-card__name", "data-testid": `theme-name-${theme.id}` },
					theme.name,
				),
				theme.isDefault
					? h(
							"span",
							{
								class: "badge badge--green",
								"data-testid": `theme-default-badge-${theme.id}`,
							},
							"Default",
						)
					: null,
			]),
			h("div", { class: "theme-card__swatches" }, [
				renderColorSwatch(theme.primaryColor, "Primary", `swatch-primary-${theme.id}`),
				renderColorSwatch(theme.secondaryColor, "Secondary", `swatch-secondary-${theme.id}`),
			]),
			h(
				"p",
				{ class: "theme-card__font", "data-testid": `theme-font-${theme.id}` },
				`Font: ${theme.font}`,
			),
			!theme.isDefault
				? h(
						"button",
						{
							class: "btn btn--secondary btn--sm",
							type: "button",
							"data-testid": `theme-set-default-${theme.id}`,
							onClick: () => onSetDefault(theme.id),
						},
						"Set as Default",
					)
				: null,
		],
	);
}

function renderIntegrationBanner(): VNode {
	return h(
		"div",
		{
			class: "alert alert--info",
			role: "status",
			"data-testid": "templates-integration-banner",
		},
		[
			h("strong", "Integration Pending"),
			h(
				"p",
				"Theme management API is not yet connected. The data shown below is placeholder content for UI preview purposes.",
			),
		],
	);
}

function renderCreateForm(
	form: { name: string; primaryColor: string; secondaryColor: string; font: string },
	onUpdate: (field: string, value: string) => void,
	onSubmit: () => void,
): VNode {
	return h(
		"form",
		{
			class: "theme-form",
			"data-testid": "theme-create-form",
			onSubmit: (e: Event) => {
				e.preventDefault();
				onSubmit();
			},
		},
		[
			h("h2", { class: "theme-form__title" }, "Create New Theme"),

			h("div", { class: "form-field", "data-testid": "field-theme-name" }, [
				h("label", { class: "form-field__label", for: "theme-name" }, "Theme Name"),
				h("input", {
					class: "form-field__input",
					id: "theme-name",
					type: "text",
					value: form.name,
					placeholder: "My Custom Theme",
					"data-testid": "theme-name-input",
					onInput: (e: Event) =>
						onUpdate("name", (e.target as HTMLInputElement).value),
				}),
			]),

			h("div", { class: "theme-form__colors" }, [
				h("div", { class: "form-field", "data-testid": "field-primary-color" }, [
					h("label", { class: "form-field__label", for: "primary-color" }, "Primary Color"),
					h("input", {
						class: "form-field__input",
						id: "primary-color",
						type: "color",
						value: form.primaryColor,
						"data-testid": "primary-color-input",
						onInput: (e: Event) =>
							onUpdate("primaryColor", (e.target as HTMLInputElement).value),
					}),
				]),

				h("div", { class: "form-field", "data-testid": "field-secondary-color" }, [
					h("label", { class: "form-field__label", for: "secondary-color" }, "Secondary Color"),
					h("input", {
						class: "form-field__input",
						id: "secondary-color",
						type: "color",
						value: form.secondaryColor,
						"data-testid": "secondary-color-input",
						onInput: (e: Event) =>
							onUpdate("secondaryColor", (e.target as HTMLInputElement).value),
					}),
				]),
			]),

			h("div", { class: "form-field", "data-testid": "field-theme-font" }, [
				h("label", { class: "form-field__label", for: "theme-font" }, "Font Family"),
				h(
					"select",
					{
						class: "form-field__select",
						id: "theme-font",
						value: form.font,
						"data-testid": "theme-font-select",
						onChange: (e: Event) =>
							onUpdate("font", (e.target as HTMLSelectElement).value),
					},
					FONT_OPTIONS.map((f) => h("option", { value: f }, f)),
				),
			]),

			h(
				"button",
				{
					class: "btn btn--primary",
					type: "submit",
					"data-testid": "theme-create-button",
				},
				"Create Theme",
			),
		],
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformTemplatesPage = defineComponent({
	name: "PlatformTemplatesPage",

	setup() {
		const themes = ref<ThemeEntry[]>([...INITIAL_THEMES]);
		const showForm = ref(false);

		const formName = ref("");
		const formPrimaryColor = ref("#4f46e5");
		const formSecondaryColor = ref("#10b981");
		const formFont = ref("Inter");

		let nextId = 4;

		function handleSetDefault(id: string): void {
			themes.value = themes.value.map((t) => ({
				...t,
				isDefault: t.id === id,
			}));
		}

		function handleFormUpdate(field: string, value: string): void {
			switch (field) {
				case "name":
					formName.value = value;
					break;
				case "primaryColor":
					formPrimaryColor.value = value;
					break;
				case "secondaryColor":
					formSecondaryColor.value = value;
					break;
				case "font":
					formFont.value = value;
					break;
			}
		}

		function handleCreate(): void {
			if (!formName.value.trim()) return;

			const newTheme: ThemeEntry = {
				id: `theme-custom-${nextId++}`,
				name: formName.value.trim(),
				primaryColor: formPrimaryColor.value,
				secondaryColor: formSecondaryColor.value,
				font: formFont.value,
				isDefault: false,
			};

			themes.value = [...themes.value, newTheme];
			formName.value = "";
			formPrimaryColor.value = "#4f46e5";
			formSecondaryColor.value = "#10b981";
			formFont.value = "Inter";
			showForm.value = false;
		}

		// ── Render ───────────────────────────────────────────────────────

		return () =>
			h(
				"section",
				{ class: "templates-page", "data-testid": "platform-templates-page" },
				[
					h("header", { class: "templates-page__header" }, [
						h("h1", { class: "templates-page__title" }, "Templates & Themes"),
						h(
							"button",
							{
								class: "btn btn--primary",
								type: "button",
								"data-testid": "templates-new-button",
								onClick: () => { showForm.value = !showForm.value; },
							},
							showForm.value ? "Cancel" : "+ New Theme",
						),
					]),

					renderIntegrationBanner(),

					showForm.value
						? renderCreateForm(
								{
									name: formName.value,
									primaryColor: formPrimaryColor.value,
									secondaryColor: formSecondaryColor.value,
									font: formFont.value,
								},
								handleFormUpdate,
								handleCreate,
							)
						: null,

					h(
						"div",
						{ class: "templates-page__grid", "data-testid": "theme-grid" },
						themes.value.map((theme) =>
							renderThemeCard(theme, handleSetDefault),
						),
					),
				],
			);
	},
});
