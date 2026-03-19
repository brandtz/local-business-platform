// E5-S1-T2: Tenant-admin shell — session-aware guards, tenant context header, and shell state rendering.
// Security: guards redirect unauthorized users; tenant context is resolved before rendering.

import type {
	AdminRouteAccessResult,
	AuthViewerState,
	TenantActorRole,
	TenantSummary
} from "@platform/types";
import {
	resolveAdminRouteAccess
} from "@platform/types";

import type { ShellState } from "@platform/ui";
import {
	resolveShellStateDescriptor,
	type ShellStateDescriptor
} from "@platform/ui";

// ── Admin Auth Guard ─────────────────────────────────────────────────────────

export type AdminAuthGuardResult =
	| { outcome: "allow"; viewer: AuthViewerState }
	| { outcome: "redirect"; target: "/auth-required" | "/access-denied" };

/**
 * Evaluates whether the current viewer can access the tenant-admin shell.
 * Returns a redirect target when access is denied or auth is required.
 */
export function evaluateAdminAuthGuard(
	viewer: AuthViewerState
): AdminAuthGuardResult {
	const access: AdminRouteAccessResult = resolveAdminRouteAccess(
		viewer,
		"tenant-admin"
	);

	if (access === "allow") {
		return { outcome: "allow", viewer };
	}

	return {
		outcome: "redirect",
		target: access === "auth-required" ? "/auth-required" : "/access-denied"
	};
}

// ── Tenant Context Header ────────────────────────────────────────────────────

export type TenantContextHeaderData = {
	businessName: string;
	userDisplayName: string;
	userRole: TenantActorRole;
};

/**
 * Builds the tenant context header data from the resolved tenant and viewer state.
 * Falls back to "Unknown" for missing display name.
 */
export function buildTenantContextHeader(
	tenant: TenantSummary,
	viewer: AuthViewerState,
	role: TenantActorRole
): TenantContextHeaderData {
	return {
		businessName: tenant.displayName,
		userDisplayName: viewer.displayName ?? "Unknown",
		userRole: role
	};
}

// ── Shell State Resolution ───────────────────────────────────────────────────

export type AdminShellState =
	| { kind: "loading" }
	| { kind: "ready"; header: TenantContextHeaderData }
	| { kind: "error"; descriptor: ShellStateDescriptor }
	| { kind: "suspended"; descriptor: ShellStateDescriptor }
	| { kind: "auth-required"; descriptor: ShellStateDescriptor }
	| { kind: "access-denied"; descriptor: ShellStateDescriptor };

/**
 * Resolves the admin shell state from auth, tenant, and guard evaluation.
 */
export function resolveAdminShellState(
	guardResult: AdminAuthGuardResult,
	tenant: TenantSummary | null,
	role: TenantActorRole | null
): AdminShellState {
	if (guardResult.outcome === "redirect") {
		const shellState: ShellState =
			guardResult.target === "/auth-required"
				? "auth-required"
				: "access-denied";

		return {
			kind: shellState,
			descriptor: resolveShellStateDescriptor(shellState)
		};
	}

	if (!tenant) {
		return {
			kind: "error",
			descriptor: resolveShellStateDescriptor("error", {
				title: "Tenant Not Found",
				message:
					"Unable to resolve your business context. Please try again."
			})
		};
	}

	if (tenant.status === "suspended") {
		return {
			kind: "suspended",
			descriptor: resolveShellStateDescriptor("suspended", {
				title: "Account Suspended",
				message:
					"Your business account has been suspended. Please contact support for assistance."
			})
		};
	}

	if (!role) {
		return {
			kind: "access-denied",
			descriptor: resolveShellStateDescriptor("access-denied")
		};
	}

	return {
		kind: "ready",
		header: buildTenantContextHeader(tenant, guardResult.viewer, role)
	};
}

/**
 * Maps an admin shell state kind to the underlying ShellState primitive.
 */
export function toShellStatePrimitive(
	adminState: AdminShellState
): ShellState {
	switch (adminState.kind) {
		case "loading":
			return "loading";
		case "ready":
			return "ready";
		case "error":
			return "error";
		case "suspended":
			return "suspended";
		case "auth-required":
			return "auth-required";
		case "access-denied":
			return "access-denied";
	}
}
