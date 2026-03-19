// E4-S2-T1/T3: Tenant bootstrap orchestration — resolves tenant context from the
// current host before Vue router renders. Provides injection keys for all
// downstream components to access the resolved tenant context.
// Security: tenant context must match the host — never cross-contaminate.
// Never cache configuration across tenant boundaries.

import { type InjectionKey } from "vue";
import type { TenantResolutionTenantRecord } from "@platform/types";
import { classifyApiError, type ApiClientConfig } from "@platform/sdk";

import {
	createFailedResult,
	resolveBootstrap,
	type BootstrapResult,
	type TenantBootstrapConfig,
	type TenantConfigPayload,
	type TenantFrontendContext
} from "./tenant-bootstrap";

// ── Injection Keys ───────────────────────────────────────────────────────────

/** Available when bootstrap resolved — tenant context for all components. */
export const TENANT_CONTEXT_KEY: InjectionKey<TenantFrontendContext> =
	Symbol("tenant-context");

/** Always available — full bootstrap result including failure reasons. */
export const TENANT_BOOTSTRAP_RESULT_KEY: InjectionKey<BootstrapResult> =
	Symbol("tenant-bootstrap-result");

// ── Data Source Contract ─────────────────────────────────────────────────────

export type TenantBootstrapData = {
	tenants: readonly TenantResolutionTenantRecord[];
	tenantConfig: TenantConfigPayload | null;
};

/** Pluggable data source. */
export type TenantBootstrapDataSource = () => Promise<TenantBootstrapData>;

// ── Bootstrap Options ────────────────────────────────────────────────────────

export type TenantBootstrapOptions = {
	host: string | null;
	managedPreviewDomains: readonly string[];
	fetchData: TenantBootstrapDataSource;
};

// ── Bootstrap Orchestrator ───────────────────────────────────────────────────

/**
 * Executes the full tenant bootstrap flow:
 * 1. Fetches tenant resolution data from the provided data source
 * 2. Resolves the current host to a specific tenant
 * 3. Returns the bootstrap result for app-mount gating
 *
 * If the data source throws, returns an "api-unreachable" failure.
 */
export async function executeTenantBootstrap(
	options: TenantBootstrapOptions
): Promise<BootstrapResult> {
	const config: TenantBootstrapConfig = {
		managedPreviewDomains: options.managedPreviewDomains
	};

	let data: TenantBootstrapData;

	try {
		data = await options.fetchData();
	} catch {
		return createFailedResult("api-unreachable");
	}

	return resolveBootstrap(
		options.host,
		data.tenants,
		config,
		data.tenantConfig
	);
}

// ── API-Backed Data Source (E4-S2-T3) ────────────────────────────────────────

const BOOTSTRAP_ENDPOINT = "/tenant/bootstrap";

/**
 * Creates a data source that fetches tenant resolution data and configuration
 * from the backend API. Uses classifyApiError() for error classification.
 * Never caches across tenant boundaries — every call is a fresh fetch.
 */
export function createApiBootstrapDataSource(
	config: ApiClientConfig
): TenantBootstrapDataSource {
	return async () => {
		const url = `${config.baseUrl}${BOOTSTRAP_ENDPOINT}`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), config.timeout);

		let response: Response;

		try {
			response = await fetch(url, {
				method: "GET",
				credentials: config.withCredentials ? "include" : "same-origin",
				headers: { Accept: "application/json" },
				signal: controller.signal
			});
		} catch {
			throw classifyApiError(null);
		} finally {
			clearTimeout(timeoutId);
		}

		if (!response.ok) {
			throw classifyApiError(response.status);
		}

		const body: unknown = await response.json();

		return parseBootstrapResponse(body);
	};
}

/**
 * Validates and parses the raw API response into TenantBootstrapData.
 * Throws if the response shape is invalid.
 */
export function parseBootstrapResponse(body: unknown): TenantBootstrapData {
	if (typeof body !== "object" || body === null) {
		throw new Error("Invalid bootstrap response: expected object");
	}

	const record = body as Record<string, unknown>;

	if (!Array.isArray(record.tenants)) {
		throw new Error("Invalid bootstrap response: tenants must be an array");
	}

	const tenantConfig =
		record.tenantConfig != null &&
		typeof record.tenantConfig === "object" &&
		"templateKey" in (record.tenantConfig as Record<string, unknown>) &&
		"enabledModules" in (record.tenantConfig as Record<string, unknown>)
			? (record.tenantConfig as TenantConfigPayload)
			: null;

	return {
		tenants: record.tenants as TenantResolutionTenantRecord[],
		tenantConfig
	};
}

// ── Dev / Test Data Source ────────────────────────────────────────────────────

const BOOTSTRAP_OVERRIDE_KEY =
	"__platform_test_web_customer_tenant_bootstrap__";

/**
 * Creates a data source that checks sessionStorage for an override (dev/test),
 * then falls back to the real API-backed data source.
 */
export function createBootstrapDataSource(
	config: ApiClientConfig
): TenantBootstrapDataSource {
	const apiFetch = createApiBootstrapDataSource(config);

	return async () => {
		const override = readBootstrapOverride();

		if (override) return override;

		return apiFetch();
	};
}

/**
 * Creates a data source that reads only from sessionStorage (for dev/test) or
 * returns an empty tenant list, which causes "tenant-not-found".
 */
export function createDevBootstrapDataSource(): TenantBootstrapDataSource {
	return async () => {
		const override = readBootstrapOverride();

		if (override) return override;

		return { tenants: [], tenantConfig: null };
	};
}

export function readBootstrapOverride(
	rawValue: string | null = readSessionStorageValue()
): TenantBootstrapData | null {
	if (!rawValue) return null;

	try {
		const parsed = JSON.parse(rawValue) as unknown;

		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("tenants" in parsed) ||
			!Array.isArray((parsed as { tenants: unknown }).tenants)
		) {
			return null;
		}

		return parsed as TenantBootstrapData;
	} catch {
		return null;
	}
}

function readSessionStorageValue(): string | null {
	if (typeof window === "undefined") return null;

	return window.sessionStorage.getItem(BOOTSTRAP_OVERRIDE_KEY);
}

// ── Environment Helpers ──────────────────────────────────────────────────────

export function readManagedPreviewDomains(
	raw: string | undefined = undefined
): readonly string[] {
	if (typeof raw === "string" && raw.trim()) {
		return raw
			.split(",")
			.map((d) => d.trim())
			.filter(Boolean);
	}

	return ["preview.localhost"];
}
