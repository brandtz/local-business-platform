// Tests for SDK composable

import { describe, expect, it } from "vitest";

import { SDK_CLIENT_KEY, createAdminSdkClient } from "../composables/use-sdk";

describe("admin SDK composable", () => {
	it("exports an injection key", () => {
		expect(SDK_CLIENT_KEY).toBeDefined();
		expect(typeof SDK_CLIENT_KEY).toBe("symbol");
	});

	it("creates an API client with default base URL", () => {
		const client = createAdminSdkClient();

		expect(client).toBeDefined();
		expect(client.auth).toBeDefined();
		expect(client.analytics).toBeDefined();
		expect(client.orders).toBeDefined();
		expect(client.payments).toBeDefined();
		expect(client.tenants).toBeDefined();
		expect(client.config).toBeDefined();
		expect(client.audit).toBeDefined();
		expect(client.catalog).toBeDefined();
		expect(client.staff).toBeDefined();
		expect(client.transport).toBeDefined();
	});

	it("creates an API client with custom base URL", () => {
		const client = createAdminSdkClient("https://api.example.com");

		expect(client).toBeDefined();
		expect(client.auth).toBeDefined();
	});
});
