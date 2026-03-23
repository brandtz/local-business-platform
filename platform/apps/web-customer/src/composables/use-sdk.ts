// E13-S2-T7: SDK client composable — provides typed access to all API domains
// via Vue injection. The client is created once during app mount and shared
// across all components.

import { inject, type InjectionKey } from "vue";
import { createApiClient, createApiClientConfig, type ApiClient } from "@platform/sdk";

export const SDK_CLIENT_KEY: InjectionKey<ApiClient> = Symbol("sdk-client");

/**
 * Creates an ApiClient for the customer portal.
 * Uses the VITE_API_BASE_URL environment variable for the base URL.
 */
export function createCustomerSdkClient(baseUrl?: string): ApiClient {
	const config = createApiClientConfig("web-customer", {
		baseUrl: baseUrl || "/api",
	});
	return createApiClient(config);
}

/**
 * Injects the SDK client. Must be called inside a component tree where
 * SDK_CLIENT_KEY has been provided.
 */
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
