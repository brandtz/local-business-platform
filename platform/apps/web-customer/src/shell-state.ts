// E4-S2-T2: Shell state rendering — maps bootstrap outcomes to shell states
// and provides rendering descriptors for the customer storefront shell.
// Security: error, unresolved-tenant, and suspended-tenant states must NOT
// expose tenant identifiers or configuration.

import type { ShellState, ShellStateDescriptor } from "@platform/ui";
import {
	createCustomerShellConfig,
	resolveShellStateRenderPolicy,
	type ShellStateRenderPolicy
} from "@platform/ui";

import type {
	BootstrapFailureReason,
	BootstrapResult
} from "./tenant-bootstrap";

// ── Bootstrap Shell Categories ───────────────────────────────────────────────
// Higher-level classification of bootstrap outcomes for rendering decisions.

export const bootstrapShellCategories = [
	"loading",
	"resolved",
	"error",
	"unresolved-tenant",
	"suspended-tenant"
] as const;

export type BootstrapShellCategory = (typeof bootstrapShellCategories)[number];

// ── Failure Reason → Shell State Mapping ─────────────────────────────────────

const failureReasonToShellState: Record<BootstrapFailureReason, ShellState> = {
	"no-host": "error",
	"tenant-not-found": "error",
	"tenant-suspended": "suspended",
	"tenant-archived": "suspended",
	"api-unreachable": "error"
};

const failureReasonToCategory: Record<BootstrapFailureReason, BootstrapShellCategory> = {
	"no-host": "unresolved-tenant",
	"tenant-not-found": "unresolved-tenant",
	"tenant-suspended": "suspended-tenant",
	"tenant-archived": "suspended-tenant",
	"api-unreachable": "error"
};

/**
 * Maps a bootstrap failure reason to the corresponding ShellState.
 */
export function mapBootstrapFailureToShellState(
	reason: BootstrapFailureReason
): ShellState {
	return failureReasonToShellState[reason];
}

/**
 * Maps a full bootstrap result to a ShellState.
 */
export function mapBootstrapResultToShellState(
	result: BootstrapResult
): ShellState {
	switch (result.phase) {
		case "initializing":
			return "loading";
		case "resolved":
			return "ready";
		case "failed":
			return mapBootstrapFailureToShellState(result.reason);
	}
}

/**
 * Classifies a bootstrap failure reason into a higher-level rendering category.
 */
export function classifyBootstrapFailure(
	reason: BootstrapFailureReason
): BootstrapShellCategory {
	return failureReasonToCategory[reason];
}

/**
 * Classifies a full bootstrap result into a rendering category.
 */
export function classifyBootstrapResult(
	result: BootstrapResult
): BootstrapShellCategory {
	switch (result.phase) {
		case "initializing":
			return "loading";
		case "resolved":
			return "resolved";
		case "failed":
			return classifyBootstrapFailure(result.reason);
	}
}

// ── Descriptor Overrides ─────────────────────────────────────────────────────
// Safe, tenant-free messages for unresolved-tenant and error states.

const unresolvedTenantOverrides = {
	title: "Page Not Found",
	message:
		"The store you are looking for could not be found. Please check the address and try again."
};

const apiErrorOverrides = {
	title: "Something Went Wrong",
	message:
		"We are having trouble loading this page. Please try again in a moment."
};

/**
 * Returns safe descriptor overrides for a bootstrap failure reason.
 * Unresolved-tenant and error states use generic, tenant-free messages.
 * Suspended-tenant states use the customer shell config defaults.
 */
function getDescriptorOverridesForFailure(
	reason: BootstrapFailureReason
): { title?: string; message?: string } | undefined {
	const category = classifyBootstrapFailure(reason);

	switch (category) {
		case "unresolved-tenant":
			return unresolvedTenantOverrides;
		case "error":
			return apiErrorOverrides;
		default:
			return undefined;
	}
}

// ── Render Policy Resolution ─────────────────────────────────────────────────

/**
 * Resolves a complete ShellStateRenderPolicy for a bootstrap result.
 * Uses the customer shell config for suspended states and applies
 * tenant-safe overrides for error and unresolved-tenant states.
 */
export function resolveBootstrapShellPolicy(
	result: BootstrapResult
): ShellStateRenderPolicy {
	const shellState = mapBootstrapResultToShellState(result);
	const config = createCustomerShellConfig();
	const basePolicy = config.policies[shellState];

	if (result.phase !== "failed") {
		return basePolicy;
	}

	const overrides = getDescriptorOverridesForFailure(result.reason);

	if (!overrides) {
		return basePolicy;
	}

	return resolveShellStateRenderPolicy(shellState, overrides);
}

/**
 * Resolves a ShellStateDescriptor for a bootstrap result.
 * Convenience wrapper over resolveBootstrapShellPolicy().
 */
export function describeBootstrapShellState(
	result: BootstrapResult
): ShellStateDescriptor {
	return resolveBootstrapShellPolicy(result).descriptor;
}

/**
 * Returns true when the given result represents a retryable failure
 * (api-unreachable). Used by shell rendering to show retry affordance.
 */
export function isRetryableBootstrapFailure(
	result: BootstrapResult
): boolean {
	return result.phase === "failed" && result.reason === "api-unreachable";
}
