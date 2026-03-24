// Platform Tenant Provisioning wizard (PA-04) — multi-step form to create a
// new tenant with business info, plan selection, module config, admin user,
// domain setup, and a final review/confirm step.

import { defineComponent, h, ref, type VNode } from "vue";
import { useRouter } from "vue-router";
import { useSdk } from "../composables/use-sdk";
import type { TenantProvisioningRequest, TenantProvisioningResult } from "@platform/types";

// ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const STEP_LABELS = [
	"Business Info",
	"Plan Selection",
	"Modules",
	"Admin User",
	"Domain Setup",
	"Review & Confirm",
] as const;

const PLAN_OPTIONS = [
	{ value: "free", label: "Free", description: "Basic features, limited usage" },
	{ value: "starter", label: "Starter", description: "Essential tools for small businesses" },
	{ value: "professional", label: "Professional", description: "Advanced features and analytics" },
	{ value: "enterprise", label: "Enterprise", description: "Full platform with premium support" },
] as const;

const MODULE_OPTIONS = [
	{ key: "catalog", label: "Catalog", description: "Product and service catalog" },
	{ key: "ordering", label: "Ordering", description: "Online ordering system" },
	{ key: "bookings", label: "Bookings", description: "Appointment and reservation management" },
	{ key: "content", label: "Content", description: "Content management system" },
] as const;

const BUSINESS_TYPES = [
	"restaurant",
	"salon",
	"fitness",
	"retail",
	"services",
	"other",
] as const;

type PlanKey = (typeof PLAN_OPTIONS)[number]["value"];
type ModuleKey = (typeof MODULE_OPTIONS)[number]["key"];

// ── Form State ───────────────────────────────────────────────────────────────

type WizardFormState = {
	businessName: string;
	businessType: string;
	contactEmail: string;
	plan: PlanKey | "";
	modules: Record<ModuleKey, boolean>;
	adminEmail: string;
	adminName: string;
	subdomain: string;
	customDomain: string;
};

function createInitialFormState(): WizardFormState {
	return {
		businessName: "",
		businessType: "",
		contactEmail: "",
		plan: "",
		modules: { catalog: true, ordering: false, bookings: false, content: false },
		adminEmail: "",
		adminName: "",
		subdomain: "",
		customDomain: "",
	};
}

// ── Validation ───────────────────────────────────────────────────────────────

const MAX_SLUG_LENGTH = 48;

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, MAX_SLUG_LENGTH);
}

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type StepValidation = { valid: boolean; message: string };

function validateStep(step: number, form: WizardFormState): StepValidation {
	switch (step) {
		case 1:
			if (!form.businessName.trim()) return { valid: false, message: "Business name is required." };
			if (!form.contactEmail.trim()) return { valid: false, message: "Contact email is required." };
			if (!isValidEmail(form.contactEmail)) return { valid: false, message: "Please enter a valid email address." };
			return { valid: true, message: "" };
		case 2:
			if (!form.plan) return { valid: false, message: "Please select a plan." };
			return { valid: true, message: "" };
		case 3:
			return { valid: true, message: "" };
		case 4:
			if (!form.adminEmail.trim()) return { valid: false, message: "Admin email is required." };
			if (!isValidEmail(form.adminEmail)) return { valid: false, message: "Please enter a valid admin email." };
			if (!form.adminName.trim()) return { valid: false, message: "Admin name is required." };
			return { valid: true, message: "" };
		case 5:
			if (!form.subdomain.trim()) return { valid: false, message: "Subdomain is required." };
			return { valid: true, message: "" };
		case 6:
			return { valid: true, message: "" };
		default:
			return { valid: true, message: "" };
	}
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderStepIndicator(currentStep: number): VNode {
	return h(
		"nav",
		{ class: "wizard-steps", "data-testid": "step-indicator", "aria-label": "Wizard progress" },
		STEP_LABELS.map((label, idx) => {
			const stepNum = idx + 1;
			const isActive = stepNum === currentStep;
			const isCompleted = stepNum < currentStep;
			return h(
				"span",
				{
					class: [
						"wizard-steps__step",
						isActive ? "wizard-steps__step--active" : "",
						isCompleted ? "wizard-steps__step--completed" : "",
					],
					key: stepNum,
					"data-testid": `step-${stepNum}`,
					"aria-current": isActive ? "step" : undefined,
				},
				[
					h("span", { class: "wizard-steps__number" }, String(stepNum)),
					h("span", { class: "wizard-steps__label" }, label),
				],
			);
		}),
	);
}

function renderStep1(
	form: WizardFormState,
	onUpdate: (field: keyof WizardFormState, value: string) => void,
): VNode {
	return h("div", { class: "wizard-panel", "data-testid": "step-1-panel" }, [
		h("h2", "Business Information"),
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "business-name" }, "Business Name *"),
			h("input", {
				class: "form-field__input",
				id: "business-name",
				type: "text",
				value: form.businessName,
				required: true,
				placeholder: "Enter business name",
				"data-testid": "input-business-name",
				onInput: (e: Event) => onUpdate("businessName", (e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "business-type" }, "Business Type"),
			h(
				"select",
				{
					class: "form-field__select",
					id: "business-type",
					value: form.businessType,
					"data-testid": "select-business-type",
					onChange: (e: Event) => onUpdate("businessType", (e.target as HTMLSelectElement).value),
				},
				[
					h("option", { value: "" }, "Select a type…"),
					...BUSINESS_TYPES.map((t) =>
						h("option", { value: t, key: t }, t.charAt(0).toUpperCase() + t.slice(1)),
					),
				],
			),
		]),
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "contact-email" }, "Contact Email *"),
			h("input", {
				class: "form-field__input",
				id: "contact-email",
				type: "email",
				value: form.contactEmail,
				required: true,
				placeholder: "owner@example.com",
				"data-testid": "input-contact-email",
				onInput: (e: Event) => onUpdate("contactEmail", (e.target as HTMLInputElement).value),
			}),
		]),
	]);
}

function renderStep2(
	form: WizardFormState,
	onUpdate: (field: keyof WizardFormState, value: string) => void,
): VNode {
	return h("div", { class: "wizard-panel", "data-testid": "step-2-panel" }, [
		h("h2", "Plan Selection"),
		h(
			"div",
			{ class: "plan-grid" },
			PLAN_OPTIONS.map((plan) =>
				h(
					"label",
					{
						class: [
							"plan-card",
							form.plan === plan.value ? "plan-card--selected" : "",
						],
						key: plan.value,
						"data-testid": `plan-option-${plan.value}`,
					},
					[
						h("input", {
							type: "radio",
							name: "plan",
							value: plan.value,
							checked: form.plan === plan.value,
							"data-testid": `plan-radio-${plan.value}`,
							onChange: () => onUpdate("plan", plan.value),
						}),
						h("span", { class: "plan-card__name" }, plan.label),
						h("span", { class: "plan-card__desc" }, plan.description),
					],
				),
			),
		),
	]);
}

function renderStep3(
	form: WizardFormState,
	onToggleModule: (key: ModuleKey) => void,
): VNode {
	return h("div", { class: "wizard-panel", "data-testid": "step-3-panel" }, [
		h("h2", "Module Configuration"),
		h("p", { class: "wizard-panel__hint" }, "Select the modules to enable for this tenant."),
		h(
			"div",
			{ class: "module-grid" },
			MODULE_OPTIONS.map((mod) =>
				h(
					"label",
					{
						class: [
							"module-card",
							form.modules[mod.key] ? "module-card--selected" : "",
						],
						key: mod.key,
						"data-testid": `module-option-${mod.key}`,
					},
					[
						h("input", {
							type: "checkbox",
							checked: form.modules[mod.key],
							"data-testid": `module-checkbox-${mod.key}`,
							onChange: () => onToggleModule(mod.key),
						}),
						h("span", { class: "module-card__name" }, mod.label),
						h("span", { class: "module-card__desc" }, mod.description),
					],
				),
			),
		),
	]);
}

function renderStep4(
	form: WizardFormState,
	onUpdate: (field: keyof WizardFormState, value: string) => void,
): VNode {
	return h("div", { class: "wizard-panel", "data-testid": "step-4-panel" }, [
		h("h2", "Admin User"),
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "admin-email" }, "Admin Email *"),
			h("input", {
				class: "form-field__input",
				id: "admin-email",
				type: "email",
				value: form.adminEmail,
				required: true,
				placeholder: "admin@example.com",
				"data-testid": "input-admin-email",
				onInput: (e: Event) => onUpdate("adminEmail", (e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "admin-name" }, "Admin Name *"),
			h("input", {
				class: "form-field__input",
				id: "admin-name",
				type: "text",
				value: form.adminName,
				required: true,
				placeholder: "Full name",
				"data-testid": "input-admin-name",
				onInput: (e: Event) => onUpdate("adminName", (e.target as HTMLInputElement).value),
			}),
		]),
	]);
}

function renderStep5(
	form: WizardFormState,
	onUpdate: (field: keyof WizardFormState, value: string) => void,
): VNode {
	return h("div", { class: "wizard-panel", "data-testid": "step-5-panel" }, [
		h("h2", "Domain Setup"),
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "subdomain" }, "Subdomain *"),
			h("div", { class: "form-field__inline" }, [
				h("input", {
					class: "form-field__input",
					id: "subdomain",
					type: "text",
					value: form.subdomain,
					required: true,
					placeholder: "my-business",
					"data-testid": "input-subdomain",
					onInput: (e: Event) => onUpdate("subdomain", (e.target as HTMLInputElement).value),
				}),
				h("span", { class: "form-field__suffix" }, ".platform.local"),
			]),
		]),
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "custom-domain" }, "Custom Domain (optional)"),
			h("input", {
				class: "form-field__input",
				id: "custom-domain",
				type: "text",
				value: form.customDomain,
				placeholder: "www.mybusiness.com",
				"data-testid": "input-custom-domain",
				onInput: (e: Event) => onUpdate("customDomain", (e.target as HTMLInputElement).value),
			}),
		]),
	]);
}

function renderStep6(form: WizardFormState): VNode {
	const enabledModules = MODULE_OPTIONS.filter((m) => form.modules[m.key]).map((m) => m.label);

	return h("div", { class: "wizard-panel", "data-testid": "step-6-panel" }, [
		h("h2", "Review & Confirm"),
		h("p", { class: "wizard-panel__hint" }, "Please review the information below before provisioning."),
		h("dl", { class: "review-grid", "data-testid": "review-summary" }, [
			h("dt", "Business Name"),
			h("dd", { "data-testid": "review-business-name" }, form.businessName || "—"),
			h("dt", "Business Type"),
			h("dd", { "data-testid": "review-business-type" }, form.businessType || "—"),
			h("dt", "Contact Email"),
			h("dd", { "data-testid": "review-contact-email" }, form.contactEmail || "—"),
			h("dt", "Plan"),
			h("dd", { "data-testid": "review-plan" }, form.plan || "—"),
			h("dt", "Modules"),
			h("dd", { "data-testid": "review-modules" }, enabledModules.join(", ") || "None"),
			h("dt", "Admin Email"),
			h("dd", { "data-testid": "review-admin-email" }, form.adminEmail || "—"),
			h("dt", "Admin Name"),
			h("dd", { "data-testid": "review-admin-name" }, form.adminName || "—"),
			h("dt", "Subdomain"),
			h("dd", { "data-testid": "review-subdomain" }, form.subdomain ? `${form.subdomain}.platform.local` : "—"),
			h("dt", "Custom Domain"),
			h("dd", { "data-testid": "review-custom-domain" }, form.customDomain || "None"),
		]),
	]);
}

function renderNavigation(
	currentStep: number,
	isSubmitting: boolean,
	onPrev: () => void,
	onNext: () => void,
	onSubmit: () => void,
): VNode {
	const isLastStep = currentStep === TOTAL_STEPS;

	return h("div", { class: "wizard-nav", "data-testid": "wizard-navigation" }, [
		h(
			"button",
			{
				class: "btn btn--secondary",
				type: "button",
				disabled: currentStep <= 1 || isSubmitting,
				"data-testid": "wizard-prev",
				onClick: onPrev,
			},
			"← Previous",
		),
		isLastStep
			? h(
					"button",
					{
						class: "btn btn--primary",
						type: "button",
						disabled: isSubmitting,
						"data-testid": "wizard-submit",
						onClick: onSubmit,
					},
					isSubmitting ? "Provisioning…" : "Provision Tenant",
				)
			: h(
					"button",
					{
						class: "btn btn--primary",
						type: "button",
						disabled: isSubmitting,
						"data-testid": "wizard-next",
						onClick: onNext,
					},
					"Next →",
				),
	]);
}

function renderSuccessState(onViewTenants: () => void): VNode {
	return h(
		"div",
		{
			class: "provision-page provision-page--success",
			role: "status",
			"data-testid": "success-state",
		},
		[
			h("span", { class: "provision-page__icon", "aria-hidden": "true" }, "✓"),
			h("h2", "Tenant Provisioned Successfully"),
			h("p", "The new tenant has been created and is being initialized."),
			h(
				"button",
				{
					class: "btn btn--primary",
					type: "button",
					"data-testid": "view-tenants-button",
					onClick: onViewTenants,
				},
				"View Tenants",
			),
		],
	);
}

function renderLoadingState(): VNode {
	return h(
		"div",
		{
			class: "provision-page provision-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[
			h("div", { class: "provision-page__spinner" }),
			h("p", "Provisioning tenant… this may take a moment."),
		],
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformTenantProvisionPage = defineComponent({
	name: "PlatformTenantProvisionPage",

	setup() {
		const sdk = useSdk();
		const router = useRouter();

		const currentStep = ref(1);
		const form = ref<WizardFormState>(createInitialFormState());
		const validationError = ref<string | null>(null);
		const submitting = ref(false);
		const submitError = ref<string | null>(null);
		const success = ref(false);
		const provisionResult = ref<TenantProvisioningResult | null>(null);

		function updateField(field: keyof WizardFormState, value: string): void {
			(form.value as Record<string, unknown>)[field] = value;

			// Auto-generate subdomain from business name
			if (field === "businessName") {
				form.value.subdomain = slugify(value);
			}

			validationError.value = null;
		}

		function toggleModule(key: ModuleKey): void {
			form.value.modules[key] = !form.value.modules[key];
		}

		function goNext(): void {
			const result = validateStep(currentStep.value, form.value);
			if (!result.valid) {
				validationError.value = result.message;
				return;
			}
			validationError.value = null;
			if (currentStep.value < TOTAL_STEPS) {
				currentStep.value++;
			}
		}

		function goPrev(): void {
			validationError.value = null;
			if (currentStep.value > 1) {
				currentStep.value--;
			}
		}

		async function handleSubmit(): Promise<void> {
			const result = validateStep(currentStep.value, form.value);
			if (!result.valid) {
				validationError.value = result.message;
				return;
			}

			submitting.value = true;
			submitError.value = null;

			try {
				const slug = slugify(form.value.businessName);
				const request: TenantProvisioningRequest = {
					displayName: form.value.businessName,
					slug,
					previewSubdomain: form.value.subdomain || slug,
					verticalTemplate: mapBusinessTypeToTemplate(form.value.businessType),
					owner: {
						actorType: "tenant",
						email: form.value.adminEmail,
						displayName: form.value.adminName,
						// id is assigned by the backend during provisioning
					id: "",
						status: "invited",
					},
				};

				provisionResult.value = await sdk.tenants.create(request);
				success.value = true;
			} catch (err: unknown) {
				submitError.value =
					err instanceof Error
						? err.message
						: "Failed to provision tenant. Please try again.";
			} finally {
				submitting.value = false;
			}
		}

		function mapBusinessTypeToTemplate(
			businessType: string,
		): TenantProvisioningRequest["verticalTemplate"] {
			switch (businessType) {
				case "restaurant":
					return "restaurant-core";
				case "salon":
				case "fitness":
				case "retail":
				case "services":
					return "services-core";
				default:
					return "hybrid-local-business";
			}
		}

		function renderCurrentStep(): VNode {
			switch (currentStep.value) {
				case 1:
					return renderStep1(form.value, updateField);
				case 2:
					return renderStep2(form.value, updateField);
				case 3:
					return renderStep3(form.value, toggleModule);
				case 4:
					return renderStep4(form.value, updateField);
				case 5:
					return renderStep5(form.value, updateField);
				case 6:
					return renderStep6(form.value);
				default:
					return renderStep1(form.value, updateField);
			}
		}

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			if (success.value) {
				return renderSuccessState(() => void router.push("/tenants"));
			}

			if (submitting.value) {
				return renderLoadingState();
			}

			return h(
				"section",
				{ class: "provision-page", "data-testid": "platform-tenant-provision-page" },
				[
					h("header", { class: "provision-page__header" }, [
						h(
							"button",
							{
								class: "btn btn--ghost",
								type: "button",
								"data-testid": "back-button",
								onClick: () => void router.push("/tenants"),
							},
							"← Back to Tenants",
						),
						h("h1", { class: "provision-page__title" }, "Provision New Tenant"),
					]),

					renderStepIndicator(currentStep.value),

					validationError.value
						? h(
								"div",
								{
									class: "alert alert--warning",
									role: "alert",
									"data-testid": "validation-error",
								},
								validationError.value,
							)
						: null,

					submitError.value
						? h(
								"div",
								{
									class: "alert alert--error",
									role: "alert",
									"data-testid": "submit-error",
								},
								submitError.value,
							)
						: null,

					renderCurrentStep(),

					renderNavigation(
						currentStep.value,
						submitting.value,
						goPrev,
						goNext,
						() => void handleSubmit(),
					),
				],
			);
		};
	},
});
