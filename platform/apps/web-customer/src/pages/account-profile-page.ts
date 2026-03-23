// Account Profile page — display profile, edit form, change password,
// and communication preferences toggles.
// Fetches user profile via SDK auth API.

import { defineComponent, h, ref, onMounted, computed, type VNode } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import type { AuthUserSummary } from "@platform/types";

import { useSdk } from "../composables/use-sdk";
import { renderAccountSidebar } from "./account-dashboard-page";

// ── Types ───────────────────────────────────────────────────────────────────

export type PasswordStrength = {
	score: number; // 0-4
	label: "Weak" | "Fair" | "Good" | "Strong" | "Very Strong";
};

type ProfileFormData = {
	displayName: string;
	phone: string;
};

type PasswordFormData = {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
};

type CommunicationPreferences = {
	emailPromotions: boolean;
	smsNotifications: boolean;
	orderUpdates: boolean;
};

// ── Pure Helpers ─────────────────────────────────────────────────────────────

export function validatePasswordStrength(password: string): PasswordStrength {
	let score = 0;

	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
	if (/\d/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;

	const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
	const labels: Record<0 | 1 | 2 | 3 | 4, PasswordStrength["label"]> = {
		0: "Weak",
		1: "Fair",
		2: "Good",
		3: "Strong",
		4: "Very Strong",
	};

	return { score: capped, label: labels[capped] };
}

export function validatePasswordMatch(password: string, confirm: string): boolean {
	return password.length > 0 && password === confirm;
}

// ── Render Helpers ──────────────────────────────────────────────────────────

function renderLoading(): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", "Loading profile..."),
	]);
}

function renderError(message: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Unable to load profile"),
		h("p", message),
		h(RouterLink, { to: "/account", class: "page-error__back" }, {
			default: () => "Back to Account",
		}),
	]);
}

function renderProfileDisplay(user: AuthUserSummary): VNode {
	const initials = (user.displayName ?? user.email)
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return h("section", {
		class: "account-profile__display",
		"data-testid": "profile-display",
	}, [
		h("div", {
			class: "account-profile__avatar",
			"data-testid": "profile-avatar",
			"aria-hidden": "true",
		}, initials),
		h("div", { class: "account-profile__details" }, [
			h("h2", { "data-testid": "profile-display-name" }, user.displayName ?? "Customer"),
			h("p", { "data-testid": "profile-display-email" }, user.email),
		]),
	]);
}

function renderEditForm(
	form: ProfileFormData,
	saving: boolean,
	successMsg: string | null,
	errorMsg: string | null,
	onUpdate: (field: keyof ProfileFormData, value: string) => void,
	onSubmit: () => void,
): VNode {
	return h("section", {
		class: "account-profile__edit-form",
		"data-testid": "profile-edit-form",
	}, [
		h("h3", { class: "account-profile__section-title" }, "Edit Profile"),
		successMsg
			? h("div", {
				class: "account-profile__success",
				role: "status",
				"data-testid": "profile-success-msg",
			}, successMsg)
			: null,
		errorMsg
			? h("div", {
				class: "account-profile__form-error",
				role: "alert",
				"data-testid": "profile-error-msg",
			}, errorMsg)
			: null,
		h("div", { class: "account-profile__field" }, [
			h("label", { for: "profile-name" }, "Display Name"),
			h("input", {
				id: "profile-name",
				type: "text",
				value: form.displayName,
				"data-testid": "input-display-name",
				onInput: (e: Event) => onUpdate("displayName", (e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "account-profile__field" }, [
			h("label", { for: "profile-phone" }, "Phone"),
			h("input", {
				id: "profile-phone",
				type: "tel",
				value: form.phone,
				"data-testid": "input-phone",
				onInput: (e: Event) => onUpdate("phone", (e.target as HTMLInputElement).value),
			}),
		]),
		h("button", {
			class: "account-profile__save-btn",
			"data-testid": "btn-save-profile",
			disabled: saving,
			onClick: onSubmit,
		}, saving ? "Saving..." : "Save Changes"),
	]);
}

function renderPasswordForm(
	form: PasswordFormData,
	strength: PasswordStrength,
	passwordsMatch: boolean,
	saving: boolean,
	successMsg: string | null,
	errorMsg: string | null,
	onUpdate: (field: keyof PasswordFormData, value: string) => void,
	onSubmit: () => void,
): VNode {
	const strengthClass = `account-profile__strength--${strength.label.toLowerCase().replace(/\s+/g, "-")}`;

	return h("section", {
		class: "account-profile__password-form",
		"data-testid": "password-form",
	}, [
		h("h3", { class: "account-profile__section-title" }, "Change Password"),
		successMsg
			? h("div", {
				class: "account-profile__success",
				role: "status",
				"data-testid": "password-success-msg",
			}, successMsg)
			: null,
		errorMsg
			? h("div", {
				class: "account-profile__form-error",
				role: "alert",
				"data-testid": "password-error-msg",
			}, errorMsg)
			: null,
		h("div", { class: "account-profile__field" }, [
			h("label", { for: "current-password" }, "Current Password"),
			h("input", {
				id: "current-password",
				type: "password",
				value: form.currentPassword,
				"data-testid": "input-current-password",
				onInput: (e: Event) => onUpdate("currentPassword", (e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "account-profile__field" }, [
			h("label", { for: "new-password" }, "New Password"),
			h("input", {
				id: "new-password",
				type: "password",
				value: form.newPassword,
				"data-testid": "input-new-password",
				onInput: (e: Event) => onUpdate("newPassword", (e.target as HTMLInputElement).value),
			}),
			form.newPassword.length > 0
				? h("div", {
					class: ["account-profile__strength-indicator", strengthClass],
					"data-testid": "password-strength",
					"data-score": strength.score,
				}, [
					h("div", {
						class: "account-profile__strength-bar",
						style: { width: `${(strength.score / 4) * 100}%` },
					}),
					h("span", { class: "account-profile__strength-label" }, strength.label),
				])
				: null,
		]),
		h("div", { class: "account-profile__field" }, [
			h("label", { for: "confirm-password" }, "Confirm New Password"),
			h("input", {
				id: "confirm-password",
				type: "password",
				value: form.confirmPassword,
				"data-testid": "input-confirm-password",
				onInput: (e: Event) => onUpdate("confirmPassword", (e.target as HTMLInputElement).value),
			}),
			form.confirmPassword.length > 0 && !passwordsMatch
				? h("p", {
					class: "account-profile__field-error",
					"data-testid": "password-mismatch",
				}, "Passwords do not match")
				: null,
		]),
		h("button", {
			class: "account-profile__save-btn",
			"data-testid": "btn-change-password",
			disabled: saving || !passwordsMatch || strength.score < 1 || form.currentPassword.length === 0,
			onClick: onSubmit,
		}, saving ? "Updating..." : "Update Password"),
	]);
}

function renderCommunicationPreferences(
	prefs: CommunicationPreferences,
	onToggle: (key: keyof CommunicationPreferences) => void,
): VNode {
	const entries: { key: keyof CommunicationPreferences; label: string; description: string }[] = [
		{ key: "emailPromotions", label: "Email Promotions", description: "Receive promotional emails and offers" },
		{ key: "smsNotifications", label: "SMS Notifications", description: "Get text message updates" },
		{ key: "orderUpdates", label: "Order Updates", description: "Receive order status notifications" },
	];

	return h("section", {
		class: "account-profile__preferences",
		"data-testid": "communication-preferences",
	}, [
		h("h3", { class: "account-profile__section-title" }, "Communication Preferences"),
		...entries.map((entry) =>
			h("div", {
				key: entry.key,
				class: "account-profile__pref-row",
				"data-testid": `pref-${entry.key}`,
			}, [
				h("div", { class: "account-profile__pref-info" }, [
					h("span", { class: "account-profile__pref-label" }, entry.label),
					h("span", { class: "account-profile__pref-desc" }, entry.description),
				]),
				h("button", {
					class: [
						"account-profile__toggle",
						prefs[entry.key] ? "account-profile__toggle--on" : "account-profile__toggle--off",
					],
					role: "switch",
					"aria-checked": String(prefs[entry.key]),
					"data-testid": `toggle-${entry.key}`,
					onClick: () => onToggle(entry.key),
				}, prefs[entry.key] ? "On" : "Off"),
			])
		),
	]);
}

// ── Page Component ──────────────────────────────────────────────────────────

export const AccountProfilePage = defineComponent({
	name: "AccountProfilePage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const user = ref<AuthUserSummary | null>(null);

		// Edit profile form
		const profileForm = ref<ProfileFormData>({ displayName: "", phone: "" });
		const profileSaving = ref(false);
		const profileSuccess = ref<string | null>(null);
		const profileError = ref<string | null>(null);

		// Password form
		const passwordForm = ref<PasswordFormData>({
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		});
		const passwordSaving = ref(false);
		const passwordSuccess = ref<string | null>(null);
		const passwordError = ref<string | null>(null);

		const passwordStrength = computed(() => validatePasswordStrength(passwordForm.value.newPassword));
		const passwordsMatch = computed(() =>
			passwordForm.value.newPassword.length === 0 ||
			validatePasswordMatch(passwordForm.value.newPassword, passwordForm.value.confirmPassword)
		);

		// Communication prefs
		const commPrefs = ref<CommunicationPreferences>({
			emailPromotions: true,
			smsNotifications: true,
			orderUpdates: true,
		});

		async function fetchProfile(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const profile = await sdk.auth.me();
				user.value = profile;
				profileForm.value = {
					displayName: profile.displayName ?? "",
					phone: "",
				};
			} catch {
				error.value = "Unable to load your profile. Please try again later.";
			} finally {
				loading.value = false;
			}
		}

		function updateProfileField(field: keyof ProfileFormData, value: string): void {
			profileForm.value = { ...profileForm.value, [field]: value };
		}

		async function saveProfile(): Promise<void> {
			profileSaving.value = true;
			profileSuccess.value = null;
			profileError.value = null;

			try {
				// Use the SDK transport layer to PUT profile updates
				await sdk.transport.put(`/customers/${user.value!.id}`, {
					displayName: profileForm.value.displayName || undefined,
					phone: profileForm.value.phone || undefined,
				});
				profileSuccess.value = "Profile updated successfully.";
			} catch {
				profileError.value = "Unable to save profile changes. Please try again.";
			} finally {
				profileSaving.value = false;
			}
		}

		function updatePasswordField(field: keyof PasswordFormData, value: string): void {
			passwordForm.value = { ...passwordForm.value, [field]: value };
		}

		async function changePassword(): Promise<void> {
			if (!validatePasswordMatch(passwordForm.value.newPassword, passwordForm.value.confirmPassword)) return;

			passwordSaving.value = true;
			passwordSuccess.value = null;
			passwordError.value = null;

			try {
				// Post to the change-password endpoint with current + new password.
				// This differs from resetPassword which uses an email-based token flow.
				await sdk.transport.post("/auth/change-password", {
					currentPassword: passwordForm.value.currentPassword,
					newPassword: passwordForm.value.newPassword,
				});
				passwordSuccess.value = "Password updated successfully.";
				passwordForm.value = { currentPassword: "", newPassword: "", confirmPassword: "" };
			} catch {
				passwordError.value = "Unable to update password. Please check your current password and try again.";
			} finally {
				passwordSaving.value = false;
			}
		}

		function togglePref(key: keyof CommunicationPreferences): void {
			commPrefs.value = { ...commPrefs.value, [key]: !commPrefs.value[key] };
		}

		onMounted(fetchProfile);

		return () => {
			if (loading.value) return renderLoading();
			if (error.value || !user.value) return renderError(error.value ?? "Profile not found");

			return h("div", {
				class: "account-profile-page",
				"data-testid": "account-profile-page",
			}, [
				renderAccountSidebar(route.path, (path) => router.push(path)),
				h("div", { class: "account-profile__content" }, [
					h("h1", { class: "account-profile__heading" }, "Profile Settings"),
					renderProfileDisplay(user.value),
					renderEditForm(
						profileForm.value,
						profileSaving.value,
						profileSuccess.value,
						profileError.value,
						updateProfileField,
						saveProfile,
					),
					renderPasswordForm(
						passwordForm.value,
						passwordStrength.value,
						passwordsMatch.value,
						passwordSaving.value,
						passwordSuccess.value,
						passwordError.value,
						updatePasswordField,
						changePassword,
					),
					renderCommunicationPreferences(commPrefs.value, togglePref),
				]),
			]);
		};
	},
});
