import { describe, expect, it } from "vitest";

import {
	createCustomerSdkClient,
	SDK_CLIENT_KEY,
} from "./use-sdk";

describe("createCustomerSdkClient", () => {
	it("creates an API client with default base URL", () => {
		const client = createCustomerSdkClient();
		expect(client).toBeDefined();
		expect(client.catalog).toBeDefined();
		expect(client.services).toBeDefined();
		expect(client.auth).toBeDefined();
		expect(client.content).toBeDefined();
		expect(client.transport).toBeDefined();
	});

	it("creates an API client with custom base URL", () => {
		const client = createCustomerSdkClient("https://api.example.com");
		expect(client).toBeDefined();
		expect(client.catalog).toBeDefined();
	});

	it("exposes all required domain APIs", () => {
		const client = createCustomerSdkClient();
		expect(typeof client.catalog.listCategories).toBe("function");
		expect(typeof client.catalog.listItems).toBe("function");
		expect(typeof client.catalog.getItem).toBe("function");
		expect(typeof client.services.list).toBe("function");
		expect(typeof client.services.get).toBe("function");
		expect(typeof client.auth.login).toBe("function");
		expect(typeof client.auth.register).toBe("function");
		expect(typeof client.auth.forgotPassword).toBe("function");
		expect(typeof client.content.getPage).toBe("function");
	});
});

describe("SDK_CLIENT_KEY", () => {
	it("is a unique Symbol injection key", () => {
		expect(typeof SDK_CLIENT_KEY).toBe("symbol");
	});
});
