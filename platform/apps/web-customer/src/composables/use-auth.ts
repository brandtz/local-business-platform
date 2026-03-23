// E13-S2-T7: Reactive auth state composable for the customer portal.
// Manages login/logout state and provides composable access to the current
// auth status. Wraps the SDK auth API and session storage.

import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { AuthApi, RegisterParams, RegisterResponse } from "@platform/sdk";
import type { AuthUserSummary, PasswordLoginRequest, PasswordLoginResponse } from "@platform/types";

import { getAuthViewerState } from "../auth-state";

export type AuthState = {
	isAuthenticated: boolean;
	user: AuthUserSummary | null;
	token: string | null;
	isLoading: boolean;
	error: string | null;
};

export type UseAuthReturn = {
	state: Ref<AuthState>;
	isAuthenticated: ComputedRef<boolean>;
	user: ComputedRef<AuthUserSummary | null>;
	isLoading: ComputedRef<boolean>;
	error: ComputedRef<string | null>;
	login: (params: PasswordLoginRequest) => Promise<boolean>;
	register: (params: RegisterParams) => Promise<boolean>;
	forgotPassword: (email: string) => Promise<boolean>;
	logout: () => void;
	clearError: () => void;
};

const AUTH_TOKEN_KEY = "__platform_customer_auth_token__";

function readStoredToken(): string | null {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

function storeToken(token: string): void {
	if (typeof window !== "undefined") {
		window.localStorage.setItem(AUTH_TOKEN_KEY, token);
	}
}

function clearStoredToken(): void {
	if (typeof window !== "undefined") {
		window.localStorage.removeItem(AUTH_TOKEN_KEY);
	}
}

export function createInitialAuthState(): AuthState {
	// Check the auth viewer state override (used in e2e tests and preview modes)
	const viewerState = getAuthViewerState();
	if (viewerState.isAuthenticated) {
		return {
			isAuthenticated: true,
			user: null,
			token: null,
			isLoading: false,
			error: null,
		};
	}

	// Fall back to persisted token from localStorage
	const token = readStoredToken();
	return {
		isAuthenticated: token !== null,
		user: null,
		token,
		isLoading: false,
		error: null,
	};
}

/**
 * Creates the reactive auth state composable. Accepts an AuthApi instance
 * from the SDK client and provides login/register/logout operations.
 */
export function useAuth(authApi: AuthApi): UseAuthReturn {
	const state = ref<AuthState>(createInitialAuthState());

	const isAuthenticated = computed(() => state.value.isAuthenticated);
	const user = computed(() => state.value.user);
	const isLoading = computed(() => state.value.isLoading);
	const error = computed(() => state.value.error);

	async function login(params: PasswordLoginRequest): Promise<boolean> {
		state.value = { ...state.value, isLoading: true, error: null };
		try {
			const response: PasswordLoginResponse = await authApi.login(params);
			const sessionToken = response.session?.id ?? null;
			if (sessionToken) {
				storeToken(sessionToken);
			}
			state.value = {
				isAuthenticated: true,
				user: response.user,
				token: sessionToken,
				isLoading: false,
				error: null,
			};
			return true;
		} catch {
			state.value = {
				...state.value,
				isLoading: false,
				error: "Invalid email or password. Please try again.",
			};
			return false;
		}
	}

	async function register(params: RegisterParams): Promise<boolean> {
		state.value = { ...state.value, isLoading: true, error: null };
		try {
			const response: RegisterResponse = await authApi.register(params);
			storeToken(response.token);
			state.value = {
				isAuthenticated: true,
				user: response.user,
				token: response.token,
				isLoading: false,
				error: null,
			};
			return true;
		} catch {
			state.value = {
				...state.value,
				isLoading: false,
				error: "Registration failed. Please check your details and try again.",
			};
			return false;
		}
	}

	async function forgotPassword(email: string): Promise<boolean> {
		state.value = { ...state.value, isLoading: true, error: null };
		try {
			await authApi.forgotPassword({ email });
			state.value = { ...state.value, isLoading: false, error: null };
			return true;
		} catch {
			state.value = {
				...state.value,
				isLoading: false,
				error: "Failed to send reset email. Please try again.",
			};
			return false;
		}
	}

	function logout(): void {
		clearStoredToken();
		state.value = {
			isAuthenticated: false,
			user: null,
			token: null,
			isLoading: false,
			error: null,
		};
	}

	function clearError(): void {
		state.value = { ...state.value, error: null };
	}

	return {
		state,
		isAuthenticated,
		user,
		isLoading,
		error,
		login,
		register,
		forgotPassword,
		logout,
		clearError,
	};
}
