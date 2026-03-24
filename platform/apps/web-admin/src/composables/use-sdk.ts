import { inject, type InjectionKey } from "vue";
import { createApiClient, createApiClientConfig, type ApiClient } from "@platform/sdk";

export const SDK_CLIENT_KEY: InjectionKey<ApiClient> = Symbol("sdk-client");

/**
 * In dev mode without a running API backend, wrap every SDK sub-API method
 * so that network / 404 errors resolve to empty data instead of surfacing
 * "Resource not found" in the UI.
 */
function wrapWithDevFallback(client: ApiClient): ApiClient {
	if (!import.meta.env.DEV) return client;

	return new Proxy(client, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);
			if (typeof value !== "object" || value === null) return value;

			return new Proxy(value as Record<string, unknown>, {
				get(apiTarget, methodName, apiReceiver) {
					const method = Reflect.get(apiTarget, methodName, apiReceiver);
					if (typeof method !== "function") return method;

					return async (...args: unknown[]) => {
						try {
							return await (method as Function).apply(apiTarget, args);
						} catch {
							const path = `${String(prop)}.${String(methodName)}`;
							console.warn(`[dev] ${path} failed — no API backend running, returning empty data`);

							const m = String(methodName);
							if (m === "list")   return { data: [], total: 0, orders: [] };
							if (m === "dashboard") return { kpis: [], revenue: [], recentOrders: [] };
							if (m === "getModules") return [];
							// For singular gets / mutations, re-throw with a friendlier message
							throw new Error(`No API backend running — ${path} is unavailable in dev mode`);
						}
					};
				},
			});
		},
	});
}

export function createAdminSdkClient(baseUrl?: string): ApiClient {
	const config = createApiClientConfig("web-admin", {
		baseUrl: baseUrl || "/api",
	});
	return wrapWithDevFallback(createApiClient(config));
}

export function useSdk(): ApiClient {
	const client = inject(SDK_CLIENT_KEY);
	if (!client) {
		throw new Error(
			"useSdk() was called outside a component tree with SDK client provided. " +
				"Ensure SDK_CLIENT_KEY is provided during app mount."
		);
	}
	return client;
}
