// E4-S2-T1: Frontend bootstrap flow — resolves tenant context from the current
// request host before Vue router renders any routes.
// Security: tenant context is resolved from the host and must never serve one
// tenant's context on another tenant's domain.

import type {
	TenantModuleKey,
	TenantResolutionTenantRecord,
	TenantStatus,
	TenantVerticalTemplateKey
} from "@platform/types";

// ── Bootstrap State Machine ──────────────────────────────────────────────────

export const bootstrapPhases = [
	"initializing",
	"resolved",
	"failed"
] as const;

export type BootstrapPhase = (typeof bootstrapPhases)[number];

// ── Tenant Frontend Context ──────────────────────────────────────────────────
// The resolved context available to all downstream routes and components.

export type TenantFrontendContext = {
	tenantId: string;
	displayName: string;
	slug: string;
	status: TenantStatus;
	previewSubdomain: string;
	templateKey: TenantVerticalTemplateKey;
	enabledModules: readonly TenantModuleKey[];
};

// ── Bootstrap Failure Reasons ────────────────────────────────────────────────

export const bootstrapFailureReasons = [
	"no-host",
	"tenant-not-found",
	"tenant-suspended",
	"tenant-archived",
	"api-unreachable"
] as const;

export type BootstrapFailureReason = (typeof bootstrapFailureReasons)[number];

// ── Bootstrap Result ─────────────────────────────────────────────────────────

export type BootstrapResult =
	| {
			phase: "initializing";
	  }
	| {
			phase: "resolved";
			context: TenantFrontendContext;
	  }
	| {
			phase: "failed";
			reason: BootstrapFailureReason;
	  };

// ── Bootstrap Input ──────────────────────────────────────────────────────────
// Configuration needed to resolve tenant context from a host.

export type TenantBootstrapConfig = {
	managedPreviewDomains: readonly string[];
};

export type TenantConfigPayload = {
	templateKey: TenantVerticalTemplateKey;
	enabledModules: readonly TenantModuleKey[];
};

// ── Host Resolution ──────────────────────────────────────────────────────────

function normalizeHost(host: string | null | undefined): string | null {
	if (!host) return null;

	const trimmed = host.trim().toLowerCase();

	if (!trimmed) return null;

	// Strip port if present
	const colonIndex = trimmed.indexOf(":");

	return colonIndex >= 0 ? trimmed.slice(0, colonIndex) : trimmed;
}

function extractSubdomainFromManagedDomain(
	host: string,
	managedDomains: readonly string[]
): string | null {
	for (const domain of managedDomains) {
		const normalizedDomain = domain.toLowerCase();
		const suffix = `.${normalizedDomain}`;

		if (host.endsWith(suffix)) {
			const subdomain = host.slice(0, host.length - suffix.length);

			if (subdomain.length > 0 && !subdomain.includes(".")) {
				return subdomain;
			}
		}
	}

	return null;
}

// ── Bootstrap Resolution ─────────────────────────────────────────────────────

export function createInitializingResult(): BootstrapResult {
	return { phase: "initializing" };
}

export function createFailedResult(reason: BootstrapFailureReason): BootstrapResult {
	return { phase: "failed", reason };
}

export function createResolvedResult(context: TenantFrontendContext): BootstrapResult {
	return { phase: "resolved", context };
}

/**
 * Resolves tenant context from a request host against a set of known tenants.
 * Returns a `BootstrapResult` with phase "resolved" on success, or "failed"
 * with a specific reason on failure.
 *
 * @param host - The current `window.location.hostname` (or equivalent)
 * @param tenants - Known tenant records (would come from API in production)
 * @param config - Bootstrap configuration (managed preview domains)
 * @param tenantConfig - Tenant configuration payload (template + modules)
 */
export function resolveBootstrap(
	host: string | null | undefined,
	tenants: readonly TenantResolutionTenantRecord[],
	config: TenantBootstrapConfig,
	tenantConfig: TenantConfigPayload | null
): BootstrapResult {
	const normalizedHost = normalizeHost(host);

	if (!normalizedHost) {
		return createFailedResult("no-host");
	}

	const tenant = resolveTenantFromHost(
		normalizedHost,
		tenants,
		config.managedPreviewDomains
	);

	if (!tenant) {
		return createFailedResult("tenant-not-found");
	}

	if (tenant.status === "suspended") {
		return createFailedResult("tenant-suspended");
	}

	if (tenant.status === "archived") {
		return createFailedResult("tenant-archived");
	}

	if (!tenantConfig) {
		return createFailedResult("api-unreachable");
	}

	return createResolvedResult({
		tenantId: tenant.id,
		displayName: tenant.displayName,
		slug: tenant.slug,
		status: tenant.status,
		previewSubdomain: tenant.previewSubdomain,
		templateKey: tenantConfig.templateKey,
		enabledModules: tenantConfig.enabledModules
	});
}

function resolveTenantFromHost(
	host: string,
	tenants: readonly TenantResolutionTenantRecord[],
	managedDomains: readonly string[]
): TenantResolutionTenantRecord | null {
	// First: try custom domain match
	const customDomainMatch = tenants.find(
		(t) =>
			t.customDomains?.some(
				(d) => normalizeHost(d) === host
			) ?? false
	);

	if (customDomainMatch) return customDomainMatch;

	// Second: try managed subdomain match
	const subdomain = extractSubdomainFromManagedDomain(host, managedDomains);

	if (subdomain) {
		return (
			tenants.find(
				(t) => t.previewSubdomain.toLowerCase() === subdomain
			) ?? null
		);
	}

	return null;
}

// ── Bootstrap Phase Inspection ───────────────────────────────────────────────

export function isBootstrapResolved(
	result: BootstrapResult
): result is Extract<BootstrapResult, { phase: "resolved" }> {
	return result.phase === "resolved";
}

export function isBootstrapFailed(
	result: BootstrapResult
): result is Extract<BootstrapResult, { phase: "failed" }> {
	return result.phase === "failed";
}

export function describeBootstrapResult(result: BootstrapResult): string {
	if (result.phase === "initializing") return "Bootstrap in progress";
	if (result.phase === "resolved") return `Resolved tenant: ${result.context.slug}`;

	return `Bootstrap failed: ${result.reason}`;
}
