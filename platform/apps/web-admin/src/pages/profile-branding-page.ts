// E13-S5-T3: Business Profile and Branding settings page — profile form,
// branding configuration (logo, colors), and live preview panel.

import { defineComponent, h, onMounted, ref, computed } from "vue";

import { useSdk } from "../composables/use-sdk";
import {
	createEmptyTenantProfile,
	validateTenantProfile,
	type TenantProfileData,
	type ProfileValidationError,
} from "../tenant-profile";
import {
	createEmptyBrandConfig,
	validateBrandAssetUpload,
	validateThemeConfig,
	type BrandAssetReference,
	type TenantBrandConfig,
	type TenantThemeConfig,
} from "../tenant-branding";

// ── Types ────────────────────────────────────────────────────────────────────

type ProfilePageState = {
	profile: TenantProfileData;
	brandConfig: TenantBrandConfig;
	validationErrors: ProfileValidationError[];
	isLoading: boolean;
	isSaving: boolean;
	error: string | null;
	saveSuccess: boolean;
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderFormField(
	label: string,
	value: string,
	fieldPath: string,
	onChange: (val: string) => void,
	errorMessage?: string,
	type: string = "text",
) {
	return h("div", { class: "form-field", "data-field": fieldPath }, [
		h("label", { class: "form-field__label", for: fieldPath }, label),
		type === "textarea"
			? h("textarea", {
					class: `form-field__input${errorMessage ? " form-field__input--error" : ""}`,
					id: fieldPath,
					value,
					rows: 3,
					onInput: (e: Event) => onChange((e.target as HTMLTextAreaElement).value),
				})
			: h("input", {
					class: `form-field__input${errorMessage ? " form-field__input--error" : ""}`,
					id: fieldPath,
					type,
					value,
					onInput: (e: Event) => onChange((e.target as HTMLInputElement).value),
				}),
		errorMessage
			? h("p", { class: "form-field__error", role: "alert" }, errorMessage)
			: null,
	]);
}

function renderProfileForm(
	profile: TenantProfileData,
	errors: ProfileValidationError[],
	onUpdate: (field: keyof TenantProfileData, value: string) => void,
) {
	function getError(field: string): string | undefined {
		return errors.find((e) => e.field === field)?.message;
	}

	return h("section", { class: "form-section", "data-testid": "profile-form" }, [
		h("h3", { class: "form-section__title" }, "Business Profile"),
		h("div", { class: "form-section__fields" }, [
			renderFormField("Business Name", profile.businessName, "businessName",
				(v) => onUpdate("businessName", v), getError("businessName")),
			renderFormField("Description", profile.businessDescription, "businessDescription",
				(v) => onUpdate("businessDescription", v), getError("businessDescription"), "textarea"),
			renderFormField("Email", profile.contactEmail, "contactEmail",
				(v) => onUpdate("contactEmail", v), getError("contactEmail"), "email"),
			renderFormField("Phone", profile.contactPhone, "contactPhone",
				(v) => onUpdate("contactPhone", v), getError("contactPhone"), "tel"),
			renderFormField("Address", profile.addressLine1, "addressLine1",
				(v) => onUpdate("addressLine1", v), getError("addressLine1")),
			renderFormField("Address Line 2", profile.addressLine2, "addressLine2",
				(v) => onUpdate("addressLine2", v)),
			renderFormField("City", profile.city, "city",
				(v) => onUpdate("city", v), getError("city")),
			renderFormField("State / Province", profile.stateOrProvince, "stateOrProvince",
				(v) => onUpdate("stateOrProvince", v)),
			renderFormField("Postal Code", profile.postalCode, "postalCode",
				(v) => onUpdate("postalCode", v)),
			renderFormField("Country", profile.country, "country",
				(v) => onUpdate("country", v)),
			renderFormField("Website", profile.websiteUrl, "websiteUrl",
				(v) => onUpdate("websiteUrl", v), getError("websiteUrl"), "url"),
		]),
	]);
}

function renderBrandingSection(
	theme: TenantThemeConfig,
	onColorChange: (field: string, value: string) => void,
) {
	const primaryColor = theme.colorOverrides?.brandPrimary ?? "";
	const hoverColor = theme.colorOverrides?.brandPrimaryHover ?? "";

	return h("section", { class: "form-section", "data-testid": "branding-form" }, [
		h("h3", { class: "form-section__title" }, "Branding"),
		h("div", { class: "form-section__fields" }, [
			h("div", { class: "form-field" }, [
				h("label", { class: "form-field__label" }, "Logo"),
				h("div", { class: "file-upload", "data-testid": "logo-upload" }, [
					h("input", {
						type: "file",
						accept: "image/png,image/jpeg,image/svg+xml,image/webp",
						class: "file-upload__input",
					}),
					h("p", { class: "file-upload__hint" }, "PNG, JPEG, SVG, or WebP. Max 2MB."),
				]),
			]),
			h("div", { class: "form-field" }, [
				h("label", { class: "form-field__label", for: "brandPrimary" }, "Primary Color"),
				h("div", { class: "color-picker" }, [
					h("input", {
						type: "color",
						id: "brandPrimary",
						value: primaryColor,
						class: "color-picker__input",
						onInput: (e: Event) => onColorChange("brandPrimary", (e.target as HTMLInputElement).value),
					}),
					h("input", {
						type: "text",
						value: primaryColor,
						placeholder: "#000000",
						class: "color-picker__text",
						onInput: (e: Event) => onColorChange("brandPrimary", (e.target as HTMLInputElement).value),
					}),
				]),
			]),
			h("div", { class: "form-field" }, [
				h("label", { class: "form-field__label", for: "brandPrimaryHover" }, "Primary Hover Color"),
				h("div", { class: "color-picker" }, [
					h("input", {
						type: "color",
						id: "brandPrimaryHover",
						value: hoverColor,
						class: "color-picker__input",
						onInput: (e: Event) => onColorChange("brandPrimaryHover", (e.target as HTMLInputElement).value),
					}),
					h("input", {
						type: "text",
						value: hoverColor,
						placeholder: "#000000",
						class: "color-picker__text",
						onInput: (e: Event) => onColorChange("brandPrimaryHover", (e.target as HTMLInputElement).value),
					}),
				]),
			]),
		]),
	]);
}

function renderLivePreview(profile: TenantProfileData, theme: TenantThemeConfig) {
	const primaryColor = theme.colorOverrides?.brandPrimary ?? "#1a73e8";

	return h("aside", { class: "live-preview", "data-testid": "branding-preview" }, [
		h("h3", { class: "live-preview__title" }, "Preview"),
		h("div", { class: "live-preview__frame" }, [
			h("div", {
				class: "live-preview__header",
				style: { backgroundColor: primaryColor },
			}, [
				h("span", { class: "live-preview__brand-name", style: { color: "#ffffff" } },
					profile.businessName || "Your Business"),
			]),
			h("div", { class: "live-preview__body" }, [
				h("p", { class: "live-preview__description" },
					profile.businessDescription || "Your business description will appear here."),
			]),
		]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const ProfileBrandingPage = defineComponent({
	name: "ProfileBrandingPage",
	setup() {
		const state = ref<ProfilePageState>({
			profile: createEmptyTenantProfile(),
			brandConfig: createEmptyBrandConfig(),
			validationErrors: [],
			isLoading: true,
			isSaving: false,
			error: null,
			saveSuccess: false,
		});

		onMounted(async () => {
			try {
				const sdk = useSdk();
				const tenant = await sdk.tenants.get("current");
				state.value = {
					...state.value,
					profile: {
						...state.value.profile,
						businessName: tenant.displayName,
					},
					isLoading: false,
				};
			} catch {
				state.value = {
					...state.value,
					isLoading: false,
				};
			}
		});

		function updateProfile(field: keyof TenantProfileData, value: string) {
			const newProfile = { ...state.value.profile, [field]: value };
			const errors = validateTenantProfile(newProfile);
			state.value = {
				...state.value,
				profile: newProfile,
				validationErrors: errors,
				saveSuccess: false,
			};
		}

		function updateColor(field: string, value: string) {
			const currentTheme = state.value.brandConfig.themeConfig;
			state.value = {
				...state.value,
				brandConfig: {
					...state.value.brandConfig,
					themeConfig: {
						...currentTheme,
						colorOverrides: {
							...currentTheme.colorOverrides,
							[field]: value,
						},
					},
				},
				saveSuccess: false,
			};
		}

		async function handleSave() {
			const errors = validateTenantProfile(state.value.profile);
			if (errors.length > 0) {
				state.value = { ...state.value, validationErrors: errors };
				return;
			}

			state.value = { ...state.value, isSaving: true, error: null };
			try {
				const sdk = useSdk();
				await sdk.tenants.update("current", {
					displayName: state.value.profile.businessName,
				});
				state.value = { ...state.value, isSaving: false, saveSuccess: true };
			} catch (err) {
				state.value = {
					...state.value,
					isSaving: false,
					error: err instanceof Error ? err.message : "Failed to save",
				};
			}
		}

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("div", { class: "settings-page settings-page--loading", role: "status", "data-testid": "profile-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading profile..."),
				]);
			}

			return h("div", { class: "settings-page", "data-testid": "profile-branding-page" }, [
				h("h2", { class: "settings-page__title" }, "Profile & Branding"),
				s.error
					? h("div", { class: "alert alert--error", role: "alert" }, s.error)
					: null,
				s.saveSuccess
					? h("div", { class: "alert alert--success", role: "status" }, "Settings saved successfully")
					: null,
				h("div", { class: "settings-page__content" }, [
					h("div", { class: "settings-page__forms" }, [
						renderProfileForm(s.profile, s.validationErrors, updateProfile),
						renderBrandingSection(s.brandConfig.themeConfig, updateColor),
						h("div", { class: "form-actions" }, [
							h("button", {
								class: "btn btn--primary",
								type: "button",
								disabled: s.isSaving,
								onClick: handleSave,
								"data-testid": "save-btn",
							}, s.isSaving ? "Saving..." : "Save"),
						]),
					]),
					renderLivePreview(s.profile, s.brandConfig.themeConfig),
				]),
			]);
		};
	},
});
