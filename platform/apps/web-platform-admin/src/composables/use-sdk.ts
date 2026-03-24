import { inject, type InjectionKey } from "vue";
import { createApiClient, createApiClientConfig, type ApiClient } from "@platform/sdk";

export const SDK_CLIENT_KEY: InjectionKey<ApiClient> = Symbol("platform-sdk-client");

export function createPlatformSdkClient(baseUrl?: string): ApiClient {
	const config = createApiClientConfig("web-platform-admin", {
		baseUrl: baseUrl || "/api",
	});
	return createApiClient(config);
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
