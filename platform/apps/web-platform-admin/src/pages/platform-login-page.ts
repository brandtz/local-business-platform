// Platform Admin login page — SSO-only sign-in (Microsoft Entra ID / Google
// Workspace) with mandatory MFA verification step.  Self-contained pre-auth
// page that does not depend on the SDK.

import { defineComponent, h, ref, type VNode } from "vue";

// ── Constants ────────────────────────────────────────────────────────────────

const MFA_CODE_LENGTH = 6;
const MFA_CODE_PATTERN = `\\d{${MFA_CODE_LENGTH}}`;
const SSO_SIMULATION_DELAY_MS = 800;
const MFA_SIMULATION_DELAY_MS = 600;

// ── Types ────────────────────────────────────────────────────────────────────

type SsoProvider = "microsoft" | "google";

type LoginStep = "sso-selection" | "mfa-verification";

type LoginState = {
	step: LoginStep;
	provider: SsoProvider | null;
	mfaCode: string;
	isLoading: boolean;
	error: string | null;
	success: boolean;
};

// ── Validation ───────────────────────────────────────────────────────────────

function isValidMfaCode(code: string): boolean {
	return new RegExp(`^${MFA_CODE_PATTERN}$`).test(code);
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderSecurityBanner(): VNode {
	return h(
		"div",
		{
			class: "security-banner",
			role: "alert",
			"data-testid": "security-banner",
		},
		[
			h("span", { class: "security-banner__icon", "aria-hidden": "true" }, "🔒"),
			h(
				"span",
				{ class: "security-banner__text" },
				"You are signing in to a sensitive platform administration area. All activity is logged and monitored.",
			),
		],
	);
}

function renderError(error: string | null): VNode | null {
	if (!error) return null;
	return h(
		"div",
		{
			class: "alert alert--error",
			role: "alert",
			"data-testid": "login-error",
		},
		error,
	);
}

function renderLoadingOverlay(): VNode {
	return h(
		"div",
		{
			class: "login-page__loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[
			h("div", { class: "login-page__spinner" }),
			h("p", "Authenticating… please wait."),
		],
	);
}

function renderSsoSelection(
	isLoading: boolean,
	onSsoClick: (provider: SsoProvider) => void,
): VNode {
	return h("div", { class: "sso-selection", "data-testid": "sso-selection" }, [
		h("p", { class: "sso-selection__prompt" }, "Choose your identity provider to continue."),
		h(
			"button",
			{
				class: "btn btn--sso btn--microsoft",
				type: "button",
				disabled: isLoading,
				"data-testid": "sso-microsoft",
				onClick: () => onSsoClick("microsoft"),
			},
			[
				h("span", { class: "btn__icon", "aria-hidden": "true" }, "🪟"),
				h("span", "Sign in with Microsoft"),
			],
		),
		h(
			"button",
			{
				class: "btn btn--sso btn--google",
				type: "button",
				disabled: isLoading,
				"data-testid": "sso-google",
				onClick: () => onSsoClick("google"),
			},
			[
				h("span", { class: "btn__icon", "aria-hidden": "true" }, "🌐"),
				h("span", "Sign in with Google"),
			],
		),
	]);
}

function renderMfaVerification(
	mfaCode: string,
	isLoading: boolean,
	onCodeChange: (value: string) => void,
	onSubmit: () => void,
	onBack: () => void,
): VNode {
	return h(
		"form",
		{
			class: "mfa-verification",
			"data-testid": "mfa-verification",
			onSubmit: (e: Event) => {
				e.preventDefault();
				onSubmit();
			},
		},
		[
			h("p", { class: "mfa-verification__prompt" }, "Enter the 6-digit code from your authenticator app."),
			h("div", { class: "form-field" }, [
				h("label", { class: "form-field__label", for: "mfa-code" }, "Verification Code"),
				h("input", {
					class: "form-field__input form-field__input--mfa",
					id: "mfa-code",
					type: "text",
					inputmode: "numeric",
					pattern: MFA_CODE_PATTERN,
					maxlength: MFA_CODE_LENGTH,
					autocomplete: "one-time-code",
					placeholder: "000000",
					value: mfaCode,
					required: true,
					"data-testid": "mfa-code-input",
					onInput: (e: Event) => {
						const raw = (e.target as HTMLInputElement).value;
						const sanitized = raw.replace(/\D/g, "").slice(0, MFA_CODE_LENGTH);
						onCodeChange(sanitized);
					},
				}),
			]),
			h("div", { class: "mfa-verification__actions" }, [
				h(
					"button",
					{
						class: "btn btn--primary btn--full",
						type: "submit",
						disabled: isLoading || !isValidMfaCode(mfaCode),
						"data-testid": "mfa-submit",
					},
					isLoading ? "Verifying…" : "Verify & Sign In",
				),
				h(
					"button",
					{
						class: "btn btn--secondary",
						type: "button",
						disabled: isLoading,
						"data-testid": "mfa-back",
						onClick: onBack,
					},
					"Back to Sign In",
				),
			]),
		],
	);
}

function renderSuccess(): VNode {
	return h(
		"div",
		{
			class: "login-page__success",
			role: "status",
			"data-testid": "login-success",
		},
		[
			h("span", { class: "login-page__success-icon", "aria-hidden": "true" }, "✓"),
			h("p", "Authentication successful. Redirecting…"),
		],
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformLoginPage = defineComponent({
	name: "PlatformLoginPage",

	setup() {
		const state = ref<LoginState>({
			step: "sso-selection",
			provider: null,
			mfaCode: "",
			isLoading: false,
			error: null,
			success: false,
		});

		// Simulates the SSO redirect / callback flow.
		async function handleSsoLogin(provider: SsoProvider): Promise<void> {
			state.value = {
				...state.value,
				provider,
				isLoading: true,
				error: null,
			};

			try {
				// In production this would redirect to the IdP and handle the
				// OAuth callback.  For now we simulate a short delay and then
				// advance to the MFA step.
				await new Promise<void>((resolve) => setTimeout(resolve, SSO_SIMULATION_DELAY_MS));

				state.value = {
					...state.value,
					step: "mfa-verification",
					isLoading: false,
				};
			} catch (err: unknown) {
				state.value = {
					...state.value,
					isLoading: false,
					error:
						err instanceof Error
							? err.message
							: "SSO authentication failed. Please try again.",
				};
			}
		}

		async function handleMfaSubmit(): Promise<void> {
			if (!isValidMfaCode(state.value.mfaCode)) {
				state.value = {
					...state.value,
					error: "Please enter a valid 6-digit code.",
				};
				return;
			}

			state.value = { ...state.value, isLoading: true, error: null };

			try {
				// Simulate MFA verification call
				await new Promise<void>((resolve) => setTimeout(resolve, MFA_SIMULATION_DELAY_MS));

				state.value = {
					...state.value,
					isLoading: false,
					success: true,
				};
			} catch (err: unknown) {
				state.value = {
					...state.value,
					isLoading: false,
					error:
						err instanceof Error
							? err.message
							: "MFA verification failed. Please check your code and try again.",
				};
			}
		}

		function handleBack(): void {
			state.value = {
				step: "sso-selection",
				provider: null,
				mfaCode: "",
				isLoading: false,
				error: null,
				success: false,
			};
		}

		return () => {
			const s = state.value;

			return h(
				"div",
				{ class: "login-page", "data-testid": "platform-login-page" },
				[
					h("div", { class: "login-page__card" }, [
						renderSecurityBanner(),

						h("div", { class: "login-page__header" }, [
							h("h1", { class: "login-page__title" }, "Platform Admin"),
							h(
								"p",
								{ class: "login-page__subtitle" },
								s.step === "mfa-verification"
									? "Multi-factor authentication required"
									: "Sign in to the administration console",
							),
						]),

						s.success
							? renderSuccess()
							: h("div", { class: "login-page__body" }, [
									s.isLoading ? renderLoadingOverlay() : null,

									renderError(s.error),

									s.step === "sso-selection"
										? renderSsoSelection(s.isLoading, handleSsoLogin)
										: renderMfaVerification(
												s.mfaCode,
												s.isLoading,
												(v) => {
													state.value = {
														...state.value,
														mfaCode: v,
														error: null,
													};
												},
												handleMfaSubmit,
												handleBack,
											),
								]),
					]),
				],
			);
		};
	},
});
