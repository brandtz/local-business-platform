import { describe, it, expect, vi } from "vitest";

import type { TenantFrontendContext } from "./tenant-bootstrap";
import {
	isServiceWorkerSupported,
	registerServiceWorker,
	buildCacheKey,
	createCacheVersionConfig,
	getStaleCache,
	applyUpdate,
	createServiceWorkerLifecycle,
	type CacheVersionConfig,
	type ServiceWorkerOptions
} from "./service-worker-registration";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function createContext(
	overrides: Partial<TenantFrontendContext> = {}
): TenantFrontendContext {
	return {
		tenantId: "tenant-1",
		displayName: "Test Biz",
		slug: "test-biz",
		status: "active",
		previewSubdomain: "test-biz",
		templateKey: "restaurant-core",
		enabledModules: ["catalog", "ordering"],
		...overrides
	};
}

// ── Support Detection ────────────────────────────────────────────────────────

describe("isServiceWorkerSupported", () => {
	it("returns a boolean", () => {
		expect(typeof isServiceWorkerSupported()).toBe("boolean");
	});
});

// ── Registration ─────────────────────────────────────────────────────────────

describe("registerServiceWorker", () => {
	it("returns unsupported when service workers not available", async () => {
		// In vitest (node) environment, navigator.serviceWorker is not available
		const result = await registerServiceWorker();
		// Either unsupported or error — depends on environment
		expect(["unsupported", "error"]).toContain(result.state);
	});

	it("accepts custom script URL and scope", async () => {
		const opts: ServiceWorkerOptions = { scriptUrl: "/custom-sw.js", scope: "/app/" };
		const result = await registerServiceWorker(opts);
		expect(["unsupported", "error"]).toContain(result.state);
	});
});

// ── Cache Versioning ─────────────────────────────────────────────────────────

describe("buildCacheKey", () => {
	it("builds tenant-scoped cache key", () => {
		const config: CacheVersionConfig = {
			cachePrefix: "web-customer",
			version: "1.2.3",
			tenantId: "tenant-abc"
		};
		const key = buildCacheKey(config);
		expect(key).toBe("web-customer-tenant-abc-v1.2.3");
	});

	it("different tenants produce different keys", () => {
		const a = buildCacheKey({ cachePrefix: "wc", version: "1.0", tenantId: "t1" });
		const b = buildCacheKey({ cachePrefix: "wc", version: "1.0", tenantId: "t2" });
		expect(a).not.toBe(b);
	});

	it("different versions produce different keys", () => {
		const a = buildCacheKey({ cachePrefix: "wc", version: "1.0", tenantId: "t1" });
		const b = buildCacheKey({ cachePrefix: "wc", version: "2.0", tenantId: "t1" });
		expect(a).not.toBe(b);
	});
});

describe("createCacheVersionConfig", () => {
	it("creates config from tenant context", () => {
		const config = createCacheVersionConfig(createContext({ tenantId: "xyz" }), "3.0.0");
		expect(config.cachePrefix).toBe("web-customer");
		expect(config.version).toBe("3.0.0");
		expect(config.tenantId).toBe("xyz");
	});

	it("allows custom cache prefix", () => {
		const config = createCacheVersionConfig(createContext(), "1.0", "my-app");
		expect(config.cachePrefix).toBe("my-app");
	});
});

describe("getStaleCache", () => {
	it("identifies stale caches with matching prefix", () => {
		const allKeys = [
			"web-customer-t1-v1.0",
			"web-customer-t1-v2.0",
			"other-cache"
		];
		const stale = getStaleCache(allKeys, "web-customer-t1-v2.0", "web-customer");
		expect(stale).toEqual(["web-customer-t1-v1.0"]);
	});

	it("returns empty when no stale caches", () => {
		const stale = getStaleCache(
			["web-customer-t1-v1.0"],
			"web-customer-t1-v1.0",
			"web-customer"
		);
		expect(stale).toHaveLength(0);
	});

	it("ignores caches from other prefixes", () => {
		const stale = getStaleCache(
			["other-t1-v1.0", "web-customer-t1-v2.0"],
			"web-customer-t1-v2.0",
			"web-customer"
		);
		expect(stale).toHaveLength(0);
	});
});

// ── Skip-Waiting ─────────────────────────────────────────────────────────────

describe("applyUpdate", () => {
	it("sends SKIP_WAITING message to waiting worker", () => {
		const mockWorker = { postMessage: vi.fn() } as unknown as ServiceWorker;
		applyUpdate(mockWorker);
		expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
	});
});

// ── Lifecycle ────────────────────────────────────────────────────────────────

describe("createServiceWorkerLifecycle", () => {
	it("creates lifecycle with register and teardown", () => {
		const lifecycle = createServiceWorkerLifecycle();
		expect(typeof lifecycle.register).toBe("function");
		expect(typeof lifecycle.teardown).toBe("function");
	});

	it("register returns a result", async () => {
		const lifecycle = createServiceWorkerLifecycle();
		const result = await lifecycle.register();
		expect(["unsupported", "error", "registered"]).toContain(result.state);
	});

	it("teardown does not throw", () => {
		const lifecycle = createServiceWorkerLifecycle();
		expect(() => lifecycle.teardown()).not.toThrow();
	});

	it("teardown after registration does not throw", async () => {
		const lifecycle = createServiceWorkerLifecycle();
		await lifecycle.register();
		expect(() => lifecycle.teardown()).not.toThrow();
	});
});
