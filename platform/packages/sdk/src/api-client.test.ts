import { describe, expect, it } from "vitest";

import {
	apiErrorKinds,
	classifyApiError,
	createApiClientConfig,
	createCleanBoundary,
	createErrorBoundaryResult,
	shouldTransitionAuthState
} from "./api-client";

describe("api client config", () => {
	it("creates config with defaults", () => {
		const config = createApiClientConfig("web-customer");
		expect(config).toEqual({
			appId: "web-customer",
			baseUrl: "/api",
			timeout: 15_000,
			withCredentials: true
		});
	});

	it("allows baseUrl and timeout overrides", () => {
		const config = createApiClientConfig("web-admin", {
			baseUrl: "https://api.example.com",
			timeout: 30_000
		});
		expect(config.baseUrl).toBe("https://api.example.com");
		expect(config.timeout).toBe(30_000);
	});

	it("falls back to default baseUrl when override is blank", () => {
		const config = createApiClientConfig("web-customer", { baseUrl: "  " });
		expect(config.baseUrl).toBe("/api");
	});

	it("always sets withCredentials to true", () => {
		const config = createApiClientConfig("web-platform-admin");
		expect(config.withCredentials).toBe(true);
	});
});

describe("classifyApiError", () => {
	it("classifies null status as network error", () => {
		const error = classifyApiError(null);
		expect(error.kind).toBe("network");
		expect(error.retryable).toBe(true);
	});

	it("classifies 401 as unauthorized", () => {
		const error = classifyApiError(401);
		expect(error.kind).toBe("unauthorized");
		expect(error.retryable).toBe(false);
	});

	it("classifies 403 as forbidden", () => {
		const error = classifyApiError(403);
		expect(error.kind).toBe("forbidden");
		expect(error.retryable).toBe(false);
	});

	it("classifies 404 as not-found", () => {
		const error = classifyApiError(404);
		expect(error.kind).toBe("not-found");
		expect(error.retryable).toBe(false);
	});

	it("classifies 408 as timeout", () => {
		const error = classifyApiError(408);
		expect(error.kind).toBe("timeout");
		expect(error.retryable).toBe(true);
	});

	it("classifies 422 as validation", () => {
		const error = classifyApiError(422);
		expect(error.kind).toBe("validation");
		expect(error.retryable).toBe(false);
	});

	it("classifies 429 as rate-limited", () => {
		const error = classifyApiError(429);
		expect(error.kind).toBe("rate-limited");
		expect(error.retryable).toBe(true);
	});

	it("classifies 500+ as server-error", () => {
		for (const status of [500, 502, 503, 504]) {
			const error = classifyApiError(status);
			expect(error.kind).toBe("server-error");
			expect(error.retryable).toBe(true);
		}
	});

	it("classifies unexpected status codes as unknown", () => {
		const error = classifyApiError(418);
		expect(error.kind).toBe("unknown");
		expect(error.retryable).toBe(false);
	});

	it("enumerates all expected error kinds", () => {
		expect([...apiErrorKinds]).toEqual([
			"network",
			"timeout",
			"unauthorized",
			"forbidden",
			"not-found",
			"validation",
			"rate-limited",
			"server-error",
			"unknown"
		]);
	});
});

describe("shouldTransitionAuthState", () => {
	it("returns sign-in for unauthorized errors", () => {
		expect(shouldTransitionAuthState(classifyApiError(401))).toBe("sign-in");
	});

	it("returns access-denied for forbidden errors", () => {
		expect(shouldTransitionAuthState(classifyApiError(403))).toBe("access-denied");
	});

	it("returns null for other errors", () => {
		expect(shouldTransitionAuthState(classifyApiError(null))).toBeNull();
		expect(shouldTransitionAuthState(classifyApiError(500))).toBeNull();
		expect(shouldTransitionAuthState(classifyApiError(404))).toBeNull();
	});
});

describe("error boundary helpers", () => {
	it("creates a clean boundary state", () => {
		expect(createCleanBoundary()).toEqual({ caught: false });
	});

	it("creates an error boundary result with recoverable flag", () => {
		const error = classifyApiError(500);
		const result = createErrorBoundaryResult(error);
		expect(result).toEqual({
			caught: true,
			error,
			recoverable: true
		});
	});

	it("marks non-retryable errors as non-recoverable", () => {
		const error = classifyApiError(403);
		const result = createErrorBoundaryResult(error);
		expect(result.caught).toBe(true);
		if (result.caught) {
			expect(result.recoverable).toBe(false);
		}
	});
});
