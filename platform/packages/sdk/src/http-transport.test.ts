import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
	createHttpTransport,
	HttpTransportError,
	type HttpTransportConfig,
	type HttpTransport,
} from "./http-transport";

function makeConfig(overrides?: Partial<HttpTransportConfig>): HttpTransportConfig {
	return {
		baseUrl: "https://api.example.com",
		timeout: 5000,
		defaultHeaders: { Accept: "application/json" },
		requestInterceptors: [],
		responseInterceptors: [],
		...overrides,
	};
}

function mockFetchResponse(data: unknown, status = 200, headers?: Record<string, string>) {
	const responseHeaders = new Headers({
		"content-type": "application/json",
		...headers,
	});
	return vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		headers: responseHeaders,
		json: () => Promise.resolve(data),
		text: () => Promise.resolve(JSON.stringify(data)),
	});
}

describe("http transport", () => {
	let transport: HttpTransport;
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		transport = createHttpTransport(makeConfig());
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	describe("request construction", () => {
		it("makes GET requests with correct URL", async () => {
			const fetchMock = mockFetchResponse({ ok: true });
			globalThis.fetch = fetchMock;

			await transport.get("/users");

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe("https://api.example.com/users");
			expect(init.method).toBe("GET");
		});

		it("appends query params to GET requests", async () => {
			const fetchMock = mockFetchResponse({ ok: true });
			globalThis.fetch = fetchMock;

			await transport.get("/users", { page: "1", limit: "10" });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("?");
			expect(url).toContain("page=1");
			expect(url).toContain("limit=10");
		});

		it("makes POST requests with JSON body", async () => {
			const fetchMock = mockFetchResponse({ id: 1 });
			globalThis.fetch = fetchMock;

			await transport.post("/users", { name: "Alice" });

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe("https://api.example.com/users");
			expect(init.method).toBe("POST");
			expect(init.body).toBe(JSON.stringify({ name: "Alice" }));
			expect(init.headers["Content-Type"]).toBe("application/json");
		});

		it("makes PUT requests", async () => {
			const fetchMock = mockFetchResponse({ id: 1 });
			globalThis.fetch = fetchMock;

			await transport.put("/users/1", { name: "Bob" });

			const [, init] = fetchMock.mock.calls[0];
			expect(init.method).toBe("PUT");
		});

		it("makes PATCH requests", async () => {
			const fetchMock = mockFetchResponse({ id: 1 });
			globalThis.fetch = fetchMock;

			await transport.patch("/users/1", { name: "Bob" });

			const [, init] = fetchMock.mock.calls[0];
			expect(init.method).toBe("PATCH");
		});

		it("makes DELETE requests", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			await transport.delete("/users/1");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.method).toBe("DELETE");
		});

		it("includes default headers", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			await transport.get("/test");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers["Accept"]).toBe("application/json");
		});
	});

	describe("auth token injection", () => {
		it("does not include Authorization header by default", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			await transport.get("/test");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers["Authorization"]).toBeUndefined();
		});

		it("includes Bearer token after setAuthToken", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			transport.setAuthToken("my-token-123");
			await transport.get("/test");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers["Authorization"]).toBe("Bearer my-token-123");
		});

		it("removes Authorization header after clearAuthToken", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			transport.setAuthToken("my-token-123");
			transport.clearAuthToken();
			await transport.get("/test");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers["Authorization"]).toBeUndefined();
		});
	});

	describe("tenant ID header injection", () => {
		it("does not include X-Tenant-Id header by default", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			await transport.get("/test");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers["X-Tenant-Id"]).toBeUndefined();
		});

		it("includes X-Tenant-Id after setTenantId", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			transport.setTenantId("tenant-abc");
			await transport.get("/test");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers["X-Tenant-Id"]).toBe("tenant-abc");
		});

		it("removes X-Tenant-Id after clearTenantId", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			transport.setTenantId("tenant-abc");
			transport.clearTenantId();
			await transport.get("/test");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers["X-Tenant-Id"]).toBeUndefined();
		});
	});

	describe("error classification", () => {
		it("throws HttpTransportError with classified error for 401", async () => {
			globalThis.fetch = mockFetchResponse({}, 401);

			await expect(transport.get("/test")).rejects.toThrow(HttpTransportError);

			try {
				await transport.get("/test");
			} catch (e) {
				expect(e).toBeInstanceOf(HttpTransportError);
				expect((e as HttpTransportError).apiError.kind).toBe("unauthorized");
			}
		});

		it("throws HttpTransportError with classified error for 404", async () => {
			globalThis.fetch = mockFetchResponse({}, 404);

			try {
				await transport.get("/test");
			} catch (e) {
				expect((e as HttpTransportError).apiError.kind).toBe("not-found");
			}
		});

		it("throws HttpTransportError with classified error for 500", async () => {
			globalThis.fetch = mockFetchResponse({}, 500);

			try {
				await transport.get("/test");
			} catch (e) {
				expect((e as HttpTransportError).apiError.kind).toBe("server-error");
				expect((e as HttpTransportError).apiError.retryable).toBe(true);
			}
		});

		it("classifies network errors (fetch rejection) as network error", async () => {
			globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

			try {
				await transport.get("/test");
			} catch (e) {
				expect((e as HttpTransportError).apiError.kind).toBe("network");
				expect((e as HttpTransportError).apiError.retryable).toBe(true);
			}
		});
	});

	describe("timeout handling", () => {
		it("throws timeout error when request exceeds timeout", async () => {
			const shortTimeoutTransport = createHttpTransport(makeConfig({ timeout: 1 }));

			globalThis.fetch = vi.fn().mockImplementation(
				(_url: string, init: RequestInit) =>
					new Promise((_resolve, reject) => {
						init.signal?.addEventListener("abort", () => {
							reject(new DOMException("The operation was aborted.", "AbortError"));
						});
					}),
			);

			try {
				await shortTimeoutTransport.get("/slow");
				expect.fail("Should have thrown");
			} catch (e) {
				expect((e as HttpTransportError).apiError.kind).toBe("timeout");
			}
		});
	});

	describe("request interceptors", () => {
		it("applies request interceptors before sending", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			const interceptedTransport = createHttpTransport(
				makeConfig({
					requestInterceptors: [
						(config) => ({
							...config,
							headers: { ...config.headers, "X-Custom": "intercepted" },
						}),
					],
				}),
			);

			await interceptedTransport.get("/test");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers["X-Custom"]).toBe("intercepted");
		});

		it("chains multiple request interceptors", async () => {
			const fetchMock = mockFetchResponse({});
			globalThis.fetch = fetchMock;

			const interceptedTransport = createHttpTransport(
				makeConfig({
					requestInterceptors: [
						(config) => ({
							...config,
							headers: { ...config.headers, "X-First": "1" },
						}),
						(config) => ({
							...config,
							headers: { ...config.headers, "X-Second": "2" },
						}),
					],
				}),
			);

			await interceptedTransport.get("/test");

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers["X-First"]).toBe("1");
			expect(init.headers["X-Second"]).toBe("2");
		});
	});

	describe("response interceptors", () => {
		it("applies response interceptors to successful responses", async () => {
			globalThis.fetch = mockFetchResponse({ value: 1 });

			const interceptedTransport = createHttpTransport(
				makeConfig({
					responseInterceptors: [
						(response) => ({
							...response,
							data: { ...(response.data as Record<string, unknown>), extra: true },
						}),
					],
				}),
			);

			const result = await interceptedTransport.get<{ value: number; extra: boolean }>("/test");
			expect(result.extra).toBe(true);
			expect(result.value).toBe(1);
		});
	});

	describe("loading state tracking", () => {
		it("starts with zero active requests", () => {
			expect(transport.getActiveRequestCount()).toBe(0);
		});

		it("tracks active requests during fetch", async () => {
			let capturedCount = 0;

			globalThis.fetch = vi.fn().mockImplementation(() => {
				capturedCount = transport.getActiveRequestCount();
				return Promise.resolve({
					ok: true,
					status: 200,
					headers: new Headers({ "content-type": "application/json" }),
					json: () => Promise.resolve({}),
				});
			});

			await transport.get("/test");
			expect(capturedCount).toBe(1);
			expect(transport.getActiveRequestCount()).toBe(0);
		});

		it("decrements count after failed requests", async () => {
			globalThis.fetch = mockFetchResponse({}, 500);

			try {
				await transport.get("/test");
			} catch {
				// expected
			}

			expect(transport.getActiveRequestCount()).toBe(0);
		});
	});
});
