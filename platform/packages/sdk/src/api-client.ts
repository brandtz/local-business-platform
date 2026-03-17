// E4-S6-T1: Shared frontend patterns for API client usage, error boundaries,
// and auth-state transitions.

import type { AppShellId } from "@platform/types";

// ── API Client Configuration ─────────────────────────────────────────────────

export type ApiClientConfig = {
	appId: AppShellId;
	baseUrl: string;
	timeout: number;
	withCredentials: boolean;
};

const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_BASE_URL = "/api";

export function createApiClientConfig(
	appId: AppShellId,
	overrides?: { baseUrl?: string; timeout?: number }
): ApiClientConfig {
	return {
		appId,
		baseUrl: overrides?.baseUrl?.trim() || DEFAULT_BASE_URL,
		timeout: overrides?.timeout ?? DEFAULT_TIMEOUT,
		withCredentials: true
	};
}

// ── Error Classification ─────────────────────────────────────────────────────

export const apiErrorKinds = [
	"network",
	"timeout",
	"unauthorized",
	"forbidden",
	"not-found",
	"validation",
	"rate-limited",
	"server-error",
	"unknown"
] as const;

export type ApiErrorKind = (typeof apiErrorKinds)[number];

export type ApiError = {
	kind: ApiErrorKind;
	status: number | null;
	message: string;
	retryable: boolean;
};

export function classifyApiError(status: number | null): ApiError {
	if (status === null) {
		return { kind: "network", status: null, message: "Network error", retryable: true };
	}
	if (status === 401) {
		return { kind: "unauthorized", status, message: "Authentication required", retryable: false };
	}
	if (status === 403) {
		return { kind: "forbidden", status, message: "Access denied", retryable: false };
	}
	if (status === 404) {
		return { kind: "not-found", status, message: "Resource not found", retryable: false };
	}
	if (status === 408) {
		return { kind: "timeout", status, message: "Request timed out", retryable: true };
	}
	if (status === 422) {
		return { kind: "validation", status, message: "Validation error", retryable: false };
	}
	if (status === 429) {
		return { kind: "rate-limited", status, message: "Too many requests", retryable: true };
	}
	if (status >= 500) {
		return { kind: "server-error", status, message: "Server error", retryable: true };
	}

	return { kind: "unknown", status, message: "Unexpected error", retryable: false };
}

/**
 * Determines whether a classified API error should trigger an auth-state
 * transition. The frontend should use this to decide when to redirect to
 * sign-in or show an access-denied state.
 */
export function shouldTransitionAuthState(error: ApiError): "sign-in" | "access-denied" | null {
	if (error.kind === "unauthorized") {
		return "sign-in";
	}
	if (error.kind === "forbidden") {
		return "access-denied";
	}
	return null;
}

// ── Error Boundary Convention ────────────────────────────────────────────────

export type ErrorBoundaryResult =
	| { caught: false }
	| { caught: true; error: ApiError; recoverable: boolean };

export function createErrorBoundaryResult(error: ApiError): ErrorBoundaryResult {
	return {
		caught: true,
		error,
		recoverable: error.retryable
	};
}

export function createCleanBoundary(): ErrorBoundaryResult {
	return { caught: false };
}
