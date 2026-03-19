import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { classifyApiError, createApiClientConfig } from "@platform/sdk";
import type { TenantResolutionTenantRecord } from "@platform/types";

import {
	createApiBootstrapDataSource,
	createBootstrapDataSource,
	executeTenantBootstrap,
	parseBootstrapResponse
} from "./tenant-context";

// ── Test Fixtures ────────────────────────────────────────────────────────────

function createTenant(
	overrides: Partial<TenantResolutionTenantRecord> = {}
): TenantResolutionTenantRecord {
	return {
		id: "t-001",
		displayName: "Joe's Diner",
		slug: "joes-diner",
		status: "active",
		previewSubdomain: "joes-diner",
		...overrides
	};
}

const validApiResponse = {
	tenants: [
		createTenant(),
		createTenant({
			id: "t-002",
			displayName: "Pizza Place",
			slug: "pizza-place",
			previewSubdomain: "pizza-place",
			customDomains: ["www.pizzaplace.com"]
		})
	],
	tenantConfig: {
		templateKey: "restaurant-core",
		enabledModules: ["catalog", "ordering"]
	}
};

const apiConfig = createApiClientConfig("web-customer", {
	baseUrl: "/api",
	timeout: 5000
});

// ── Fetch Mock ───────────────────────────────────────────────────────────────

const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.restoreAllMocks();
});

function mockFetchSuccess(body: unknown): void {
	fetchMock.mockResolvedValue(
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		})
	);
}

function mockFetchError(status: number): void {
	fetchMock.mockResolvedValue(
		new Response(null, { status })
	);
}

function mockFetchNetworkError(): void {
	fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
}

// ── createApiBootstrapDataSource — API Integration ───────────────────────────

describe("createApiBootstrapDataSource", () => {
	it("fetches from the correct endpoint", async () => {
		mockFetchSuccess(validApiResponse);

		const dataSource = createApiBootstrapDataSource(apiConfig);
		await dataSource();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, options] = fetchMock.mock.calls[0];

		expect(url).toBe("/api/tenant/bootstrap");
		expect(options).toMatchObject({
			method: "GET",
			credentials: "include",
			headers: { Accept: "application/json" }
		});
	});

	it("parses valid API response with tenants and config", async () => {
		mockFetchSuccess(validApiResponse);

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await dataSource();

		expect(result.tenants).toHaveLength(2);
		expect(result.tenants[0].id).toBe("t-001");
		expect(result.tenants[1].slug).toBe("pizza-place");
		expect(result.tenantConfig).toEqual({
			templateKey: "restaurant-core",
			enabledModules: ["catalog", "ordering"]
		});
	});

	it("returns null tenantConfig when API returns null config", async () => {
		mockFetchSuccess({ tenants: [createTenant()], tenantConfig: null });

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await dataSource();

		expect(result.tenants).toHaveLength(1);
		expect(result.tenantConfig).toBeNull();
	});

	it("uses custom baseUrl from config", async () => {
		mockFetchSuccess(validApiResponse);

		const customConfig = createApiClientConfig("web-customer", {
			baseUrl: "https://api.example.com"
		});
		const dataSource = createApiBootstrapDataSource(customConfig);
		await dataSource();

		const [url] = fetchMock.mock.calls[0];

		expect(url).toBe("https://api.example.com/tenant/bootstrap");
	});

	it("sends same-origin credentials when withCredentials is false", async () => {
		mockFetchSuccess(validApiResponse);

		const config = { ...apiConfig, withCredentials: false };
		const dataSource = createApiBootstrapDataSource(config);
		await dataSource();

		const [, options] = fetchMock.mock.calls[0];

		expect(options?.credentials).toBe("same-origin");
	});
});

// ── createApiBootstrapDataSource — Error Handling ────────────────────────────

describe("createApiBootstrapDataSource — error handling", () => {
	it("throws classified error on network failure", async () => {
		mockFetchNetworkError();

		const dataSource = createApiBootstrapDataSource(apiConfig);

		await expect(dataSource()).rejects.toEqual(classifyApiError(null));
	});

	it("throws classified error on 500 server error", async () => {
		mockFetchError(500);

		const dataSource = createApiBootstrapDataSource(apiConfig);

		await expect(dataSource()).rejects.toEqual(classifyApiError(500));
	});

	it("throws classified error on 401 unauthorized", async () => {
		mockFetchError(401);

		const dataSource = createApiBootstrapDataSource(apiConfig);

		await expect(dataSource()).rejects.toEqual(classifyApiError(401));
	});

	it("throws classified error on 403 forbidden", async () => {
		mockFetchError(403);

		const dataSource = createApiBootstrapDataSource(apiConfig);

		await expect(dataSource()).rejects.toEqual(classifyApiError(403));
	});

	it("throws classified error on 404 not found", async () => {
		mockFetchError(404);

		const dataSource = createApiBootstrapDataSource(apiConfig);

		await expect(dataSource()).rejects.toEqual(classifyApiError(404));
	});

	it("throws on malformed JSON response", async () => {
		fetchMock.mockResolvedValue(
			new Response("not json", {
				status: 200,
				headers: { "Content-Type": "application/json" }
			})
		);

		const dataSource = createApiBootstrapDataSource(apiConfig);

		await expect(dataSource()).rejects.toThrow();
	});
});

// ── parseBootstrapResponse ───────────────────────────────────────────────────

describe("parseBootstrapResponse", () => {
	it("parses a valid response with tenants and config", () => {
		const result = parseBootstrapResponse(validApiResponse);

		expect(result.tenants).toHaveLength(2);
		expect(result.tenantConfig?.templateKey).toBe("restaurant-core");
		expect(result.tenantConfig?.enabledModules).toEqual(["catalog", "ordering"]);
	});

	it("extracts enabled modules from config", () => {
		const response = {
			tenants: [createTenant()],
			tenantConfig: {
				templateKey: "restaurant-core",
				enabledModules: ["catalog", "ordering", "bookings"]
			}
		};

		const result = parseBootstrapResponse(response);

		expect(result.tenantConfig?.enabledModules).toEqual([
			"catalog",
			"ordering",
			"bookings"
		]);
	});

	it("returns null tenantConfig when tenantConfig is null", () => {
		const result = parseBootstrapResponse({
			tenants: [createTenant()],
			tenantConfig: null
		});

		expect(result.tenantConfig).toBeNull();
	});

	it("returns null tenantConfig when tenantConfig is missing", () => {
		const result = parseBootstrapResponse({
			tenants: [createTenant()]
		});

		expect(result.tenantConfig).toBeNull();
	});

	it("returns null tenantConfig when config lacks templateKey", () => {
		const result = parseBootstrapResponse({
			tenants: [createTenant()],
			tenantConfig: { enabledModules: ["catalog"] }
		});

		expect(result.tenantConfig).toBeNull();
	});

	it("returns null tenantConfig when config lacks enabledModules", () => {
		const result = parseBootstrapResponse({
			tenants: [createTenant()],
			tenantConfig: { templateKey: "restaurant-core" }
		});

		expect(result.tenantConfig).toBeNull();
	});

	it("throws for non-object response", () => {
		expect(() => parseBootstrapResponse("string")).toThrow(
			"Invalid bootstrap response: expected object"
		);
	});

	it("throws for null response", () => {
		expect(() => parseBootstrapResponse(null)).toThrow(
			"Invalid bootstrap response: expected object"
		);
	});

	it("throws when tenants is missing", () => {
		expect(() =>
			parseBootstrapResponse({ tenantConfig: null })
		).toThrow("Invalid bootstrap response: tenants must be an array");
	});

	it("throws when tenants is not an array", () => {
		expect(() =>
			parseBootstrapResponse({ tenants: "not-array", tenantConfig: null })
		).toThrow("Invalid bootstrap response: tenants must be an array");
	});
});

// ── Module Payload Tests ─────────────────────────────────────────────────────

describe("module payload extraction", () => {
	it("correctly passes enabled modules through to bootstrap context", async () => {
		const modules = ["catalog", "ordering", "bookings"] as const;
		mockFetchSuccess({
			tenants: [createTenant()],
			tenantConfig: {
				templateKey: "restaurant-core",
				enabledModules: modules
			}
		});

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: dataSource
		});

		expect(result.phase).toBe("resolved");

		if (result.phase === "resolved") {
			expect(result.context.enabledModules).toEqual([
				"catalog",
				"ordering",
				"bookings"
			]);
		}
	});

	it("handles empty module list", async () => {
		mockFetchSuccess({
			tenants: [createTenant()],
			tenantConfig: {
				templateKey: "restaurant-core",
				enabledModules: []
			}
		});

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: dataSource
		});

		expect(result.phase).toBe("resolved");

		if (result.phase === "resolved") {
			expect(result.context.enabledModules).toEqual([]);
		}
	});

	it("resolves template key from API config", async () => {
		mockFetchSuccess({
			tenants: [createTenant()],
			tenantConfig: {
				templateKey: "salon-core",
				enabledModules: ["bookings"]
			}
		});

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: dataSource
		});

		expect(result.phase).toBe("resolved");

		if (result.phase === "resolved") {
			expect(result.context.templateKey).toBe("salon-core");
		}
	});
});

// ── Failure Handling — Bootstrap Integration ─────────────────────────────────

describe("failure handling — API errors to shell error state", () => {
	it("returns api-unreachable when API returns 500", async () => {
		mockFetchError(500);

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: dataSource
		});

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "api-unreachable");
	});

	it("returns api-unreachable on network failure", async () => {
		mockFetchNetworkError();

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: dataSource
		});

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "api-unreachable");
	});

	it("returns api-unreachable when response has malformed config", async () => {
		mockFetchSuccess({
			tenants: [createTenant()],
			tenantConfig: { invalid: true }
		});

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: dataSource
		});

		// Malformed config → tenantConfig parsed as null → "api-unreachable"
		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "api-unreachable");
	});

	it("returns api-unreachable when response body is not valid JSON", async () => {
		fetchMock.mockResolvedValue(
			new Response("not-json", {
				status: 200,
				headers: { "Content-Type": "application/json" }
			})
		);

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: dataSource
		});

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "api-unreachable");
	});

	it("returns api-unreachable when response is missing tenants array", async () => {
		mockFetchSuccess({ tenantConfig: null });

		const dataSource = createApiBootstrapDataSource(apiConfig);
		const result = await executeTenantBootstrap({
			host: "joes-diner.preview.localhost",
			managedPreviewDomains: ["preview.localhost"],
			fetchData: dataSource
		});

		expect(result.phase).toBe("failed");
		expect(result).toHaveProperty("reason", "api-unreachable");
	});
});

// ── createBootstrapDataSource — sessionStorage Fallback ──────────────────────

describe("createBootstrapDataSource — sessionStorage override", () => {
	const OVERRIDE_KEY = "__platform_test_web_customer_tenant_bootstrap__";

	let storage: Record<string, string>;

	beforeEach(() => {
		storage = {};
		vi.stubGlobal("window", {
			sessionStorage: {
				getItem: (key: string) => storage[key] ?? null,
				setItem: (key: string, value: string) => {
					storage[key] = value;
				},
				removeItem: (key: string) => {
					delete storage[key];
				}
			}
		});
	});

	it("uses sessionStorage override when present", async () => {
		const overrideData = {
			tenants: [createTenant({ id: "override-tenant" })],
			tenantConfig: {
				templateKey: "restaurant-core",
				enabledModules: ["catalog"]
			}
		};
		storage[OVERRIDE_KEY] = JSON.stringify(overrideData);

		const dataSource = createBootstrapDataSource(apiConfig);
		const result = await dataSource();

		expect(result.tenants[0].id).toBe("override-tenant");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("falls back to API when sessionStorage is empty", async () => {
		mockFetchSuccess(validApiResponse);

		const dataSource = createBootstrapDataSource(apiConfig);
		const result = await dataSource();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.tenants).toHaveLength(2);
	});
});
