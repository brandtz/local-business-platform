// E4-S6-T2: App shell integration guidance — cross-app shell state rendering conventions.
// Defines how each app shell (customer, tenant admin, platform admin) renders loading,
// empty, access-denied, auth-required, suspended, and error states using ShellStateDescriptor.
// Security: access-denied and suspended states must not expose tenant details to unauthorized actors.

import {
	shellStates,
	type ShellState,
	type ShellStateDescriptor,
	resolveShellStateDescriptor
} from "./primitives";

// ── Frontend App Identifiers ─────────────────────────────────────────────────

export const frontendAppIds = [
	"web-customer",
	"web-admin",
	"web-platform-admin"
] as const;

export type FrontendAppId = (typeof frontendAppIds)[number];

// ── Shell Chrome Policy ──────────────────────────────────────────────────────
// Controls which app shell chrome regions are visible for a given state.

export type ShellChromePolicy = {
	showNavigation: boolean;
	showFooter: boolean;
};

// ── Shell State Render Policy ────────────────────────────────────────────────
// Complete rendering instruction for a single shell state in an app.

export type ShellStateRenderPolicy = {
	state: ShellState;
	descriptor: ShellStateDescriptor;
	chrome: ShellChromePolicy;
	/** If non-null, the app should redirect to this path instead of rendering inline. */
	redirectPath: string | null;
};

// ── Default Render Policies ──────────────────────────────────────────────────
// Canonical chrome + redirect defaults shared across all three apps.

const shellStateRenderDefaults: Record<
	ShellState,
	{ chrome: ShellChromePolicy; redirectPath: string | null }
> = {
	loading: {
		chrome: { showNavigation: false, showFooter: false },
		redirectPath: null
	},
	ready: {
		chrome: { showNavigation: true, showFooter: true },
		redirectPath: null
	},
	error: {
		chrome: { showNavigation: true, showFooter: true },
		redirectPath: null
	},
	empty: {
		chrome: { showNavigation: true, showFooter: true },
		redirectPath: null
	},
	"access-denied": {
		chrome: { showNavigation: true, showFooter: false },
		redirectPath: null
	},
	"auth-required": {
		chrome: { showNavigation: false, showFooter: false },
		redirectPath: null
	},
	suspended: {
		chrome: { showNavigation: false, showFooter: false },
		redirectPath: null
	}
};

/**
 * Resolves a complete render policy for a single shell state.
 * Applies default chrome and redirect rules; descriptor text can be overridden.
 */
export function resolveShellStateRenderPolicy(
	state: ShellState,
	descriptorOverrides?: { title?: string; message?: string }
): ShellStateRenderPolicy {
	const defaults = shellStateRenderDefaults[state];

	return {
		state,
		descriptor: resolveShellStateDescriptor(state, descriptorOverrides),
		chrome: { ...defaults.chrome },
		redirectPath: defaults.redirectPath
	};
}

// ── API Error to Shell State Mapping ─────────────────────────────────────────

/**
 * Maps an HTTP status code (or null for network errors) to the appropriate shell state.
 * Used by all three apps to consistently transition from API errors to shell feedback.
 */
export function resolveShellStateFromHttpStatus(
	httpStatus: number | null
): ShellState {
	if (httpStatus === null) return "error";
	if (httpStatus === 401) return "auth-required";
	if (httpStatus === 403) return "access-denied";
	if (httpStatus >= 500) return "error";

	return "error";
}

// ── Coverage Validation ──────────────────────────────────────────────────────

/**
 * Returns any shell states not present in the provided array.
 * Apps use this to verify their state handling is exhaustive.
 */
export function getUncoveredShellStates(
	coveredStates: readonly ShellState[]
): ShellState[] {
	const covered = new Set(coveredStates);

	return shellStates.filter((s) => !covered.has(s));
}

// ── Per-App Shell Configuration ──────────────────────────────────────────────

export type AppShellConfig = {
	appId: FrontendAppId;
	policies: Record<ShellState, ShellStateRenderPolicy>;
};

type ShellStateOverride = {
	title?: string;
	message?: string;
	chrome?: Partial<ShellChromePolicy>;
	redirectPath?: string | null;
};

function buildAppShellConfig(
	appId: FrontendAppId,
	perStateOverrides?: Partial<Record<ShellState, ShellStateOverride>>
): AppShellConfig {
	const policies = {} as Record<ShellState, ShellStateRenderPolicy>;

	for (const state of shellStates) {
		const override = perStateOverrides?.[state];
		const policy = resolveShellStateRenderPolicy(state, override);

		if (override?.chrome) {
			policy.chrome = { ...policy.chrome, ...override.chrome };
		}

		if (override?.redirectPath !== undefined) {
			policy.redirectPath = override.redirectPath;
		}

		policies[state] = policy;
	}

	return { appId, policies };
}

/**
 * Customer storefront shell.
 * Suspended state uses tenant-safe generic messaging ("Store Unavailable").
 */
export function createCustomerShellConfig(): AppShellConfig {
	return buildAppShellConfig("web-customer", {
		suspended: {
			title: "Store Unavailable",
			message:
				"This store is temporarily unavailable. Please check back later."
		}
	});
}

/**
 * Tenant business admin shell.
 * Suspended state targets the business owner with contact-support guidance.
 */
export function createAdminShellConfig(): AppShellConfig {
	return buildAppShellConfig("web-admin", {
		suspended: {
			title: "Account Suspended",
			message:
				"Your business account has been suspended. Please contact support for assistance."
		}
	});
}

/**
 * Platform operator shell.
 * Uses default shell state messages; platform operators see canonical text.
 */
export function createPlatformAdminShellConfig(): AppShellConfig {
	return buildAppShellConfig("web-platform-admin");
}

/**
 * Returns all three app shell configs for cross-app consistency validation.
 */
export function getAllAppShellConfigs(): AppShellConfig[] {
	return [
		createCustomerShellConfig(),
		createAdminShellConfig(),
		createPlatformAdminShellConfig()
	];
}
