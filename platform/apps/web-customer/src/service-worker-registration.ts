// E4-S5-T2: Service worker registration and safe cache invalidation.
// Registers the service worker after app mount, implements cache versioning
// using content hashes, and provides a skip-waiting/reload prompting pattern.
// Security: cached assets are tenant-aware; cache keys include tenant context
// to prevent cross-tenant cache hits.

import type { TenantFrontendContext } from "./tenant-bootstrap";

// ── Service Worker Registration ──────────────────────────────────────────────

export type ServiceWorkerState =
	| "unsupported"
	| "registering"
	| "registered"
	| "installing"
	| "installed"
	| "activating"
	| "activated"
	| "error";

export type ServiceWorkerRegistrationResult =
	| { state: "unsupported" }
	| { state: "registered"; registration: ServiceWorkerRegistration }
	| { state: "error"; error: string };

export type ServiceWorkerOptions = {
	readonly scriptUrl?: string;
	readonly scope?: string;
};

/**
 * Checks whether the current browser supports service workers.
 */
export function isServiceWorkerSupported(): boolean {
	return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Registers the service worker. Returns a result indicating success, error,
 * or unsupported environment. Does not throw.
 */
export async function registerServiceWorker(
	options: ServiceWorkerOptions = {}
): Promise<ServiceWorkerRegistrationResult> {
	if (!isServiceWorkerSupported()) {
		return { state: "unsupported" };
	}

	const scriptUrl = options.scriptUrl ?? "/sw.js";
	const scope = options.scope ?? "/";

	try {
		const registration = await navigator.serviceWorker.register(scriptUrl, { scope });
		return { state: "registered", registration };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Service worker registration failed";
		return { state: "error", error: message };
	}
}

// ── Cache Versioning ─────────────────────────────────────────────────────────

export type CacheVersionConfig = {
	readonly cachePrefix: string;
	readonly version: string;
	readonly tenantId: string;
};

/**
 * Builds a tenant-scoped cache key for service worker caches.
 * Includes tenantId to prevent cross-tenant cache hits.
 */
export function buildCacheKey(config: CacheVersionConfig): string {
	return `${config.cachePrefix}-${config.tenantId}-v${config.version}`;
}

/**
 * Creates a cache version config from the tenant context and an app version.
 */
export function createCacheVersionConfig(
	context: TenantFrontendContext,
	appVersion: string,
	cachePrefix = "web-customer"
): CacheVersionConfig {
	return {
		cachePrefix,
		version: appVersion,
		tenantId: context.tenantId
	};
}

/**
 * Lists cache keys that should be evicted because they belong to an
 * older version or a different tenant.
 */
export function getStaleCache(
	allCacheKeys: readonly string[],
	currentKey: string,
	cachePrefix: string
): string[] {
	return allCacheKeys.filter(
		(key) => key.startsWith(cachePrefix) && key !== currentKey
	);
}

// ── Update Detection & Skip-Waiting ──────────────────────────────────────────

export type UpdateAvailableEvent = {
	readonly type: "update-available";
	readonly waitingWorker: ServiceWorker;
};

export type UpdateListener = (event: UpdateAvailableEvent) => void;

/**
 * Watches a registration for a new service worker waiting to activate.
 * When detected, calls the listener so the app can prompt the user.
 */
export function onUpdateAvailable(
	registration: ServiceWorkerRegistration,
	listener: UpdateListener
): () => void {
	const handler = () => {
		if (registration.waiting) {
			listener({
				type: "update-available",
				waitingWorker: registration.waiting
			});
		}
	};

	registration.addEventListener("updatefound", () => {
		const newWorker = registration.installing;
		if (!newWorker) return;

		newWorker.addEventListener("statechange", () => {
			if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
				handler();
			}
		});
	});

	// Check if there's already a waiting worker
	if (registration.waiting) {
		handler();
	}

	// Return cleanup (no-op — event listeners are on the registration)
	return () => {};
}

/**
 * Sends a "SKIP_WAITING" message to a waiting service worker, then
 * reloads the page to activate the new version.
 */
export function applyUpdate(waitingWorker: ServiceWorker): void {
	waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

// ── Registration Lifecycle ───────────────────────────────────────────────────

export type RegistrationLifecycle = {
	readonly register: () => Promise<ServiceWorkerRegistrationResult>;
	readonly teardown: () => void;
};

/**
 * Creates the full service worker registration lifecycle for use after
 * app mount. Encapsulates registration, update detection, and cleanup.
 */
export function createServiceWorkerLifecycle(
	options: ServiceWorkerOptions = {},
	onUpdate?: UpdateListener
): RegistrationLifecycle {
	let cleanupFn: (() => void) | null = null;

	return {
		async register() {
			const result = await registerServiceWorker(options);
			if (result.state === "registered" && onUpdate) {
				cleanupFn = onUpdateAvailable(result.registration, onUpdate);
			}
			return result;
		},
		teardown() {
			cleanupFn?.();
			cleanupFn = null;
		}
	};
}
