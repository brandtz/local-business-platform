// E4-S4-T4: Standardized account-level error and access-denied patterns.
// Uses ShellStateDescriptor and ApiErrorKind types from shared packages.
// Security: error pages must not expose tenant configuration or internal
// identifiers in error messages.

import { defineComponent, h, type Component, type VNode } from "vue";

import type {
	ShellStateDescriptor
} from "@platform/ui";
import { resolveShellStateDescriptor } from "@platform/ui";
import {
	type ApiError,
	type ApiErrorKind,
	type ErrorBoundaryResult,
	classifyApiError,
	createErrorBoundaryResult,
	createCleanBoundary
} from "@platform/sdk";

// ── Account Error Classification ─────────────────────────────────────────────

export type AccountErrorCategory =
	| "auth-required"
	| "access-denied"
	| "not-found"
	| "server-error"
	| "network-error"
	| "unknown";

/**
 * Maps an ApiErrorKind to an AccountErrorCategory for account page display.
 */
export function classifyAccountError(kind: ApiErrorKind): AccountErrorCategory {
	switch (kind) {
		case "unauthorized":
			return "auth-required";
		case "forbidden":
			return "access-denied";
		case "not-found":
			return "not-found";
		case "network":
		case "timeout":
			return "network-error";
		case "server-error":
		case "rate-limited":
			return "server-error";
		case "validation":
		case "unknown":
		default:
			return "unknown";
	}
}

// ── Error → ShellState Mapping ───────────────────────────────────────────────

/**
 * Resolves an ApiError into the canonical ShellStateDescriptor for rendering.
 */
export function resolveAccountErrorState(error: ApiError): ShellStateDescriptor {
	const category = classifyAccountError(error.kind);

	switch (category) {
		case "auth-required":
			return resolveShellStateDescriptor("auth-required", {
				title: "Sign In Required",
				message: "Please sign in to access your account."
			});
		case "access-denied":
			return resolveShellStateDescriptor("access-denied", {
				title: "Access Denied",
				message: "You do not have permission to view this content."
			});
		case "not-found":
			return resolveShellStateDescriptor("error", {
				title: "Not Found",
				message: "The requested resource could not be found."
			});
		case "network-error":
			return resolveShellStateDescriptor("error", {
				title: "Connection Problem",
				message: "Unable to reach the server. Please check your connection."
			});
		case "server-error":
			return resolveShellStateDescriptor("error", {
				title: "Server Error",
				message: "Something went wrong on our end. Please try again later."
			});
		case "unknown":
		default:
			return resolveShellStateDescriptor("error");
	}
}

/**
 * Converts an HTTP status code into an account-level ShellStateDescriptor.
 * Convenience wrapper that classifies the status first.
 */
export function resolveAccountErrorFromStatus(status: number | null): ShellStateDescriptor {
	const apiError = classifyApiError(status);
	return resolveAccountErrorState(apiError);
}

// ── Error Boundary for Account Routes ────────────────────────────────────────

export type AccountErrorBoundary = {
	readonly result: ErrorBoundaryResult;
	readonly shellState: ShellStateDescriptor | null;
};

/**
 * Creates an error boundary result for an account page and resolves the
 * corresponding shell state for rendering.
 */
export function createAccountErrorBoundary(error: ApiError): AccountErrorBoundary {
	return {
		result: createErrorBoundaryResult(error),
		shellState: resolveAccountErrorState(error)
	};
}

/**
 * Creates a clean (no-error) account boundary.
 */
export function createCleanAccountBoundary(): AccountErrorBoundary {
	return {
		result: createCleanBoundary(),
		shellState: null
	};
}

// ── Error Page Components ────────────────────────────────────────────────────

function renderShellStatePage(descriptor: ShellStateDescriptor, attrs?: Record<string, string>): VNode {
	return h("section", {
		class: `account-${descriptor.state}-page`,
		role: "alert",
		"aria-live": "polite",
		...attrs
	}, [
		h("h2", { tabindex: "-1" }, descriptor.title),
		h("p", descriptor.message)
	]);
}

/**
 * Creates a Vue component that renders the error state page from a ShellStateDescriptor.
 */
export function createAccountErrorPage(descriptor: ShellStateDescriptor): Component {
	return defineComponent({
		name: `AccountError${descriptor.state.replace(/(^|-)(\w)/g, (_, _p, c: string) => c.toUpperCase())}Page`,
		setup() {
			return () => renderShellStatePage(descriptor, {
				"data-error-state": descriptor.state
			});
		}
	});
}

/**
 * Creates the access-denied page component.
 */
export function createAccessDeniedPage(): Component {
	const descriptor = resolveShellStateDescriptor("access-denied");
	return createAccountErrorPage(descriptor);
}

/**
 * Creates the auth-required page component.
 */
export function createAuthRequiredPage(): Component {
	const descriptor = resolveShellStateDescriptor("auth-required");
	return createAccountErrorPage(descriptor);
}

/**
 * Creates the not-found page component for missing account resources.
 */
export function createAccountNotFoundPage(): Component {
	const descriptor = resolveShellStateDescriptor("error", {
		title: "Not Found",
		message: "The requested resource could not be found."
	});
	return createAccountErrorPage(descriptor);
}

// ── Canonical Error Pages Registry ───────────────────────────────────────────

export type AccountErrorPageSet = {
	readonly accessDenied: Component;
	readonly authRequired: Component;
	readonly notFound: Component;
	readonly serverError: Component;
	readonly networkError: Component;
};

/**
 * Creates the full set of account error pages using canonical ShellState descriptors.
 */
export function createAccountErrorPages(): AccountErrorPageSet {
	return {
		accessDenied: createAccessDeniedPage(),
		authRequired: createAuthRequiredPage(),
		notFound: createAccountNotFoundPage(),
		serverError: createAccountErrorPage(
			resolveShellStateDescriptor("error", {
				title: "Server Error",
				message: "Something went wrong on our end. Please try again later."
			})
		),
		networkError: createAccountErrorPage(
			resolveShellStateDescriptor("error", {
				title: "Connection Problem",
				message: "Unable to reach the server. Please check your connection."
			})
		)
	};
}
