import type {
	AuthViewerState,
	PlatformTenantOperationalSummary
} from "@platform/types";

import {
	resolveAdminRouteAccess
} from "@platform/types";

import {
	classifyApiError,
	shouldTransitionAuthState,
	type ApiError
} from "@platform/sdk";

import {
	resolveShellStateDescriptor,
	type ShellState,
	type ShellStateDescriptor
} from "@platform/ui";

// ── View State Types ─────────────────────────────────────────────────────────

export type TenantListViewState =
	| { kind: "loading" }
	| { kind: "ready"; tenants: readonly PlatformTenantOperationalSummary[] }
	| { kind: "empty" }
	| { kind: "error"; error: ApiError }
	| { kind: "access-denied" }
	| { kind: "auth-required" };

export type TenantDetailViewState =
	| { kind: "loading" }
	| { kind: "ready"; tenant: PlatformTenantOperationalSummary }
	| { kind: "not-found"; tenantId: string }
	| { kind: "error"; error: ApiError }
	| { kind: "access-denied" }
	| { kind: "auth-required" };

// ── View State Resolution ────────────────────────────────────────────────────

export function resolveListAccessState(
	authViewerState: AuthViewerState
): TenantListViewState | null {
	const access = resolveAdminRouteAccess(authViewerState, "platform-admin");

	if (access === "auth-required") {
		return { kind: "auth-required" };
	}

	if (access === "access-denied") {
		return { kind: "access-denied" };
	}

	return null;
}

export function resolveDetailAccessState(
	authViewerState: AuthViewerState
): TenantDetailViewState | null {
	const access = resolveAdminRouteAccess(authViewerState, "platform-admin");

	if (access === "auth-required") {
		return { kind: "auth-required" };
	}

	if (access === "access-denied") {
		return { kind: "access-denied" };
	}

	return null;
}

export function createTenantListReadyState(
	tenants: readonly PlatformTenantOperationalSummary[]
): TenantListViewState {
	if (tenants.length === 0) {
		return { kind: "empty" };
	}

	return { kind: "ready", tenants };
}

export function createTenantListErrorState(
	httpStatus: number | null
): TenantListViewState {
	const apiError = classifyApiError(httpStatus);
	const authTransition = shouldTransitionAuthState(apiError);

	if (authTransition === "sign-in") {
		return { kind: "auth-required" };
	}

	if (authTransition === "access-denied") {
		return { kind: "access-denied" };
	}

	return { kind: "error", error: apiError };
}

export function createTenantDetailReadyState(
	tenant: PlatformTenantOperationalSummary | null,
	tenantId: string
): TenantDetailViewState {
	if (!tenant) {
		return { kind: "not-found", tenantId };
	}

	return { kind: "ready", tenant };
}

export function createTenantDetailErrorState(
	httpStatus: number | null
): TenantDetailViewState {
	const apiError = classifyApiError(httpStatus);
	const authTransition = shouldTransitionAuthState(apiError);

	if (authTransition === "sign-in") {
		return { kind: "auth-required" };
	}

	if (authTransition === "access-denied") {
		return { kind: "access-denied" };
	}

	return { kind: "error", error: apiError };
}

// ── Shell State Mapping ──────────────────────────────────────────────────────

function viewKindToShellState(kind: string): ShellState {
	switch (kind) {
		case "loading":
			return "loading";
		case "ready":
			return "ready";
		case "empty":
			return "empty";
		case "error":
			return "error";
		case "access-denied":
			return "access-denied";
		case "auth-required":
			return "auth-required";
		case "not-found":
			return "error";
		default:
			return "error";
	}
}

export function describeListViewShellState(
	viewState: TenantListViewState
): ShellStateDescriptor {
	const shellState = viewKindToShellState(viewState.kind);

	if (viewState.kind === "empty") {
		return resolveShellStateDescriptor(shellState, {
			title: "No Tenants",
			message: "No tenants have been provisioned yet."
		});
	}

	if (viewState.kind === "error") {
		return resolveShellStateDescriptor(shellState, {
			message: viewState.error.message
		});
	}

	return resolveShellStateDescriptor(shellState);
}

export function describeDetailViewShellState(
	viewState: TenantDetailViewState
): ShellStateDescriptor {
	const shellState = viewKindToShellState(viewState.kind);

	if (viewState.kind === "not-found") {
		return resolveShellStateDescriptor(shellState, {
			title: "Tenant Not Found",
			message: `No tenant found with ID "${viewState.tenantId}".`
		});
	}

	if (viewState.kind === "error") {
		return resolveShellStateDescriptor(shellState, {
			message: viewState.error.message
		});
	}

	return resolveShellStateDescriptor(shellState);
}
