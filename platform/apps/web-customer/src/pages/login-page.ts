// E13-S2-T5: Login / Register / Forgot Password pages — split layout with
// branding panel and form. Uses auth composable for API calls.

import { defineComponent, h, ref, type VNode } from "vue";
import { RouterLink, useRouter, useRoute } from "vue-router";

import type { AuthApi, RegisterParams } from "@platform/sdk";

import { useSdk } from "../composables/use-sdk";
import { useAuth, type UseAuthReturn } from "../composables/use-auth";
import { useTenantContext } from "../tenant-context-consumer";

// ── Shared Render Helpers ────────────────────────────────────────────────────

function renderBrandPanel(displayName: string): VNode {
	return h("div", { class: "auth-brand-panel" }, [
		h("div", { class: "auth-brand-panel__content" }, [
			h("h1", { class: "auth-brand-panel__name" }, displayName),
			h("p", { class: "auth-brand-panel__tagline" }, "Welcome back! Sign in to access your account."),
		]),
	]);
}

function renderFormError(error: string | null): VNode | null {
	if (!error) return null;
	return h("div", { class: "auth-form__error", role: "alert", "data-testid": "auth-error" }, error);
}

function renderFormField(
	id: string,
	label: string,
	type: string,
	value: string,
	onInput: (val: string) => void,
	options?: { placeholder?: string; required?: boolean; autocomplete?: string },
): VNode {
	return h("div", { class: "auth-form__field" }, [
		h("label", { class: "auth-form__label", for: id }, label),
		h("input", {
			class: "auth-form__input",
			id,
			type,
			value,
			placeholder: options?.placeholder ?? "",
			required: options?.required ?? true,
			autocomplete: options?.autocomplete ?? "off",
			onInput: (e: Event) => onInput((e.target as HTMLInputElement).value),
		}),
	]);
}

// ── Password Strength ────────────────────────────────────────────────────────

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export function evaluatePasswordStrength(password: string): PasswordStrength {
	if (password.length < 6) return "weak";

	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (/[A-Z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;

	if (score <= 1) return "weak";
	if (score <= 2) return "fair";
	if (score <= 3) return "good";
	return "strong";
}

function renderPasswordStrength(password: string): VNode | null {
	if (!password) return null;

	const strength = evaluatePasswordStrength(password);

	return h("div", { class: `auth-form__password-strength auth-form__password-strength--${strength}`, "data-testid": "password-strength" }, [
		h("span", { class: "auth-form__password-strength-label" }, `Password strength: ${strength}`),
	]);
}

// ── Login Page ───────────────────────────────────────────────────────────────

export const LoginPage = defineComponent({
	name: "LoginPage",
	setup() {
		const sdk = useSdk();
		const router = useRouter();
		const route = useRoute();
		const tenantContext = useTenantContext();
		const auth = useAuth(sdk.auth);

		const email = ref("");
		const password = ref("");
		const rememberMe = ref(false);

		async function onSubmit(e: Event): Promise<void> {
			e.preventDefault();
			const success = await auth.login({
				email: email.value,
				password: password.value,
				actorType: "customer",
				scope: "customer",
			});

			if (success) {
				const redirect = (route.query.redirect as string) || "/";
				router.push(redirect);
			}
		}

		return () =>
			h("div", { class: "auth-page", "data-testid": "login-page" }, [
				renderBrandPanel(tenantContext.displayName),
				h("div", { class: "auth-form-panel" }, [
					h("div", { class: "auth-form__tabs" }, [
						h("span", { class: "auth-form__tab auth-form__tab--active" }, "Sign In"),
						h(RouterLink, { to: "/register", class: "auth-form__tab" }, {
							default: () => "Register",
						}),
					]),
					h("form", { class: "auth-form", onSubmit, "data-testid": "login-form" }, [
						renderFormError(auth.error.value),
						renderFormField("login-email", "Email", "email", email.value,
							(v) => { email.value = v; },
							{ placeholder: "Enter your email", autocomplete: "email" }
						),
						renderFormField("login-password", "Password", "password", password.value,
							(v) => { password.value = v; },
							{ placeholder: "Enter your password", autocomplete: "current-password" }
						),
						h("div", { class: "auth-form__options" }, [
							h("label", { class: "auth-form__remember" }, [
								h("input", {
									type: "checkbox",
									checked: rememberMe.value,
									onChange: (e: Event) => { rememberMe.value = (e.target as HTMLInputElement).checked; },
								}),
								h("span", "Remember me"),
							]),
							h(RouterLink, { to: "/forgot-password", class: "auth-form__forgot-link" }, {
								default: () => "Forgot password?",
							}),
						]),
						h("button", {
							class: "auth-form__submit",
							type: "submit",
							disabled: auth.isLoading.value,
							"data-testid": "login-submit",
						}, auth.isLoading.value ? "Signing in..." : "Sign In"),
					]),
				]),
			]);
	},
});

// ── Register Page ────────────────────────────────────────────────────────────

export const RegisterPage = defineComponent({
	name: "RegisterPage",
	setup() {
		const sdk = useSdk();
		const router = useRouter();
		const tenantContext = useTenantContext();
		const auth = useAuth(sdk.auth);

		const name = ref("");
		const email = ref("");
		const password = ref("");
		const confirmPassword = ref("");
		const localError = ref<string | null>(null);

		async function onSubmit(e: Event): Promise<void> {
			e.preventDefault();
			localError.value = null;

			if (password.value !== confirmPassword.value) {
				localError.value = "Passwords do not match.";
				return;
			}

			if (password.value.length < 8) {
				localError.value = "Password must be at least 8 characters.";
				return;
			}

			const success = await auth.register({
				name: name.value,
				email: email.value,
				password: password.value,
			});

			if (success) {
				router.push("/");
			}
		}

		return () =>
			h("div", { class: "auth-page", "data-testid": "register-page" }, [
				renderBrandPanel(tenantContext.displayName),
				h("div", { class: "auth-form-panel" }, [
					h("div", { class: "auth-form__tabs" }, [
						h(RouterLink, { to: "/login", class: "auth-form__tab" }, {
							default: () => "Sign In",
						}),
						h("span", { class: "auth-form__tab auth-form__tab--active" }, "Register"),
					]),
					h("form", { class: "auth-form", onSubmit, "data-testid": "register-form" }, [
						renderFormError(localError.value || auth.error.value),
						renderFormField("register-name", "Full Name", "text", name.value,
							(v) => { name.value = v; },
							{ placeholder: "Enter your full name", autocomplete: "name" }
						),
						renderFormField("register-email", "Email", "email", email.value,
							(v) => { email.value = v; },
							{ placeholder: "Enter your email", autocomplete: "email" }
						),
						renderFormField("register-password", "Password", "password", password.value,
							(v) => { password.value = v; },
							{ placeholder: "Create a password", autocomplete: "new-password" }
						),
						renderPasswordStrength(password.value),
						renderFormField("register-confirm", "Confirm Password", "password", confirmPassword.value,
							(v) => { confirmPassword.value = v; },
							{ placeholder: "Confirm your password", autocomplete: "new-password" }
						),
						h("button", {
							class: "auth-form__submit",
							type: "submit",
							disabled: auth.isLoading.value,
							"data-testid": "register-submit",
						}, auth.isLoading.value ? "Creating account..." : "Create Account"),
					]),
				]),
			]);
	},
});

// ── Forgot Password Page ─────────────────────────────────────────────────────

export const ForgotPasswordPage = defineComponent({
	name: "ForgotPasswordPage",
	setup() {
		const sdk = useSdk();
		const tenantContext = useTenantContext();
		const auth = useAuth(sdk.auth);

		const email = ref("");
		const submitted = ref(false);

		async function onSubmit(e: Event): Promise<void> {
			e.preventDefault();
			const success = await auth.forgotPassword(email.value);
			if (success) {
				submitted.value = true;
			}
		}

		return () =>
			h("div", { class: "auth-page", "data-testid": "forgot-password-page" }, [
				renderBrandPanel(tenantContext.displayName),
				h("div", { class: "auth-form-panel" }, [
					submitted.value
						? h("div", { class: "auth-form__success", "data-testid": "forgot-success" }, [
							h("h2", "Check your email"),
							h("p", "We've sent a password reset link to your email address."),
							h(RouterLink, { to: "/login", class: "auth-form__back-link" }, {
								default: () => "Back to Sign In",
							}),
						])
						: h("form", { class: "auth-form", onSubmit, "data-testid": "forgot-form" }, [
							h("h2", { class: "auth-form__title" }, "Reset Password"),
							h("p", { class: "auth-form__subtitle" }, "Enter your email to receive a password reset link."),
							renderFormError(auth.error.value),
							renderFormField("forgot-email", "Email", "email", email.value,
								(v) => { email.value = v; },
								{ placeholder: "Enter your email", autocomplete: "email" }
							),
							h("button", {
								class: "auth-form__submit",
								type: "submit",
								disabled: auth.isLoading.value,
								"data-testid": "forgot-submit",
							}, auth.isLoading.value ? "Sending..." : "Send Reset Link"),
							h(RouterLink, { to: "/login", class: "auth-form__back-link" }, {
								default: () => "Back to Sign In",
							}),
						]),
				]),
			]);
	},
});
