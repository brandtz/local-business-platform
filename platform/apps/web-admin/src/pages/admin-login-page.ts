// E13-S5-T7: Admin Sign In page — email/password form, social login buttons,
// remember me, forgot password link, and tenant-branded display.

import { defineComponent, h, ref } from "vue";
import { useRouter } from "vue-router";

import { useSdk } from "../composables/use-sdk";
import type { AuthActorType, SessionScope } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type LoginFormState = {
	email: string;
	password: string;
	rememberMe: boolean;
	isSubmitting: boolean;
	error: string | null;
	showForgotPassword: boolean;
	forgotEmail: string;
	forgotSent: boolean;
	forgotError: string | null;
};

// ── Validation ───────────────────────────────────────────────────────────────

function validateEmail(email: string): string | null {
	if (!email.trim()) return "Email is required";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email address";
	return null;
}

function validatePassword(password: string): string | null {
	if (!password) return "Password is required";
	if (password.length < 6) return "Password must be at least 6 characters";
	return null;
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderLoginForm(
	state: LoginFormState,
	onEmailChange: (value: string) => void,
	onPasswordChange: (value: string) => void,
	onRememberChange: (value: boolean) => void,
	onSubmit: () => void,
	onForgotClick: () => void,
) {
	return h("form", {
		class: "login-form",
		"data-testid": "login-form",
		onSubmit: (e: Event) => {
			e.preventDefault();
			onSubmit();
		},
	}, [
		state.error
			? h("div", { class: "alert alert--error", role: "alert", "data-testid": "login-error" }, state.error)
			: null,
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "login-email" }, "Email"),
			h("input", {
				class: "form-field__input",
				id: "login-email",
				type: "email",
				value: state.email,
				placeholder: "you@business.com",
				required: true,
				autocomplete: "email",
				onInput: (e: Event) => onEmailChange((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "login-password" }, "Password"),
			h("input", {
				class: "form-field__input",
				id: "login-password",
				type: "password",
				value: state.password,
				placeholder: "••••••••",
				required: true,
				autocomplete: "current-password",
				onInput: (e: Event) => onPasswordChange((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "form-field form-field--row" }, [
			h("label", { class: "checkbox-label" }, [
				h("input", {
					type: "checkbox",
					checked: state.rememberMe,
					class: "checkbox-input",
					onChange: (e: Event) => onRememberChange((e.target as HTMLInputElement).checked),
				}),
				h("span", "Remember me"),
			]),
			h("button", {
				type: "button",
				class: "link-btn",
				onClick: onForgotClick,
				"data-testid": "forgot-password-link",
			}, "Forgot password?"),
		]),
		h("button", {
			class: "btn btn--primary btn--full",
			type: "submit",
			disabled: state.isSubmitting,
			"data-testid": "login-submit",
		}, state.isSubmitting ? "Signing in..." : "Sign In"),
	]);
}

function renderForgotPasswordForm(
	email: string,
	error: string | null,
	sent: boolean,
	onEmailChange: (value: string) => void,
	onSubmit: () => void,
	onBack: () => void,
) {
	if (sent) {
		return h("div", { class: "forgot-password", "data-testid": "forgot-sent" }, [
			h("h3", "Check your email"),
			h("p", `We've sent password reset instructions to ${email}.`),
			h("button", {
				class: "btn btn--secondary",
				type: "button",
				onClick: onBack,
			}, "Back to Sign In"),
		]);
	}

	return h("form", {
		class: "forgot-password",
		"data-testid": "forgot-form",
		onSubmit: (e: Event) => {
			e.preventDefault();
			onSubmit();
		},
	}, [
		h("h3", "Reset Password"),
		h("p", "Enter your email address and we'll send you a link to reset your password."),
		error
			? h("div", { class: "alert alert--error", role: "alert" }, error)
			: null,
		h("div", { class: "form-field" }, [
			h("label", { class: "form-field__label", for: "forgot-email" }, "Email"),
			h("input", {
				class: "form-field__input",
				id: "forgot-email",
				type: "email",
				value: email,
				placeholder: "you@business.com",
				required: true,
				onInput: (e: Event) => onEmailChange((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "form-actions" }, [
			h("button", {
				class: "btn btn--primary",
				type: "submit",
				"data-testid": "forgot-submit",
			}, "Send Reset Link"),
			h("button", {
				class: "btn btn--secondary",
				type: "button",
				onClick: onBack,
			}, "Back to Sign In"),
		]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const AdminLoginPage = defineComponent({
	name: "AdminLoginPage",
	setup() {
		const router = useRouter();

		const sdk = useSdk();

		const state = ref<LoginFormState>({
			email: "",
			password: "",
			rememberMe: false,
			isSubmitting: false,
			error: null,
			showForgotPassword: false,
			forgotEmail: "",
			forgotSent: false,
			forgotError: null,
		});

		async function handleLogin() {
			const emailError = validateEmail(state.value.email);
			if (emailError) {
				state.value = { ...state.value, error: emailError };
				return;
			}

			const passwordError = validatePassword(state.value.password);
			if (passwordError) {
				state.value = { ...state.value, error: passwordError };
				return;
			}

			state.value = { ...state.value, isSubmitting: true, error: null };

			try {
				await sdk.auth.login({
					email: state.value.email,
					password: state.value.password,
					actorType: "tenant" as AuthActorType,
					scope: "tenant" as SessionScope,
				});
				router.push("/");
			} catch (err) {
				state.value = {
					...state.value,
					isSubmitting: false,
					error: err instanceof Error ? err.message : "Sign in failed. Please check your credentials.",
				};
			}
		}

		async function handleForgotPassword() {
			const emailError = validateEmail(state.value.forgotEmail);
			if (emailError) {
				state.value = { ...state.value, forgotError: emailError };
				return;
			}

			try {
				await sdk.auth.forgotPassword({ email: state.value.forgotEmail });
				state.value = { ...state.value, forgotSent: true, forgotError: null };
			} catch (err) {
				state.value = {
					...state.value,
					forgotError: err instanceof Error ? err.message : "Failed to send reset email",
				};
			}
		}

		return () => {
			const s = state.value;

			return h("div", { class: "login-page", "data-testid": "admin-login-page" }, [
				h("div", { class: "login-page__card" }, [
					h("div", { class: "login-page__header" }, [
						h("h1", { class: "login-page__title" }, "Business Admin"),
						h("p", { class: "login-page__subtitle" }, "Sign in to manage your business"),
					]),
					s.showForgotPassword
						? renderForgotPasswordForm(
								s.forgotEmail,
								s.forgotError,
								s.forgotSent,
								(v) => { state.value = { ...state.value, forgotEmail: v }; },
								handleForgotPassword,
								() => { state.value = { ...state.value, showForgotPassword: false }; },
							)
						: renderLoginForm(
								s,
								(v) => { state.value = { ...state.value, email: v, error: null }; },
								(v) => { state.value = { ...state.value, password: v, error: null }; },
								(v) => { state.value = { ...state.value, rememberMe: v }; },
								handleLogin,
								() => { state.value = { ...state.value, showForgotPassword: true, forgotEmail: s.email }; },
							),
				]),
			]);
		};
	},
});
