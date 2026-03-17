import { describe, expect, it } from "vitest";

import type { TenantResolutionTenantRecord } from "@platform/types";

import type { PreviewRouteResolutionResult } from "./preview-route-resolution.service";
import { previewRouteUnresolvedReasons } from "./preview-route-resolution.service";

import {
	PreviewFallbackPolicyService,
	type PreviewFallbackResponse
} from "./preview-fallback-policy.service";

const service = new PreviewFallbackPolicyService();

describe("preview fallback policy service", () => {
	describe("getFallbackForUnresolvedRoute", () => {
		it("returns a fallback for no-host reason", () => {
			const result = service.getFallbackForUnresolvedRoute("no-host");

			expect(result.kind).toBe("no-host");
			expect(result.httpStatus).toBe(400);
			expect(result.safeMessage).toBeTruthy();
		});

		it("returns a fallback for no-matching-domain reason", () => {
			const result = service.getFallbackForUnresolvedRoute("no-matching-domain");

			expect(result.kind).toBe("no-matching-domain");
			expect(result.httpStatus).toBe(404);
		});

		it("returns a fallback for tenant-not-found reason", () => {
			const result = service.getFallbackForUnresolvedRoute("tenant-not-found");

			expect(result.kind).toBe("tenant-not-found");
			expect(result.httpStatus).toBe(404);
		});

		it("returns a fallback for tenant-not-accessible reason", () => {
			const result = service.getFallbackForUnresolvedRoute("tenant-not-accessible");

			expect(result.kind).toBe("tenant-not-accessible");
			expect(result.httpStatus).toBe(403);
		});

		it("covers every unresolved reason", () => {
			for (const reason of previewRouteUnresolvedReasons) {
				const result = service.getFallbackForUnresolvedRoute(reason);

				expect(result).toBeDefined();
				expect(result.kind).toBe(reason);
				expect(result.httpStatus).toBeGreaterThanOrEqual(400);
				expect(result.safeMessage).toBeTruthy();
			}
		});
	});

	describe("security - no tenant data leaks", () => {
		it("no-matching-domain and tenant-not-found return identical safe messages", () => {
			const domainResult = service.getFallbackForUnresolvedRoute("no-matching-domain");
			const tenantResult = service.getFallbackForUnresolvedRoute("tenant-not-found");

			expect(domainResult.safeMessage).toBe(tenantResult.safeMessage);
		});

		it("safe messages do not contain tenant identifiers or internal details", () => {
			for (const reason of previewRouteUnresolvedReasons) {
				const result = service.getFallbackForUnresolvedRoute(reason);

				expect(result.safeMessage).not.toMatch(/tenant-\d/);
				expect(result.safeMessage).not.toMatch(/slug/i);
				expect(result.safeMessage).not.toMatch(/subdomain/i);
				expect(result.safeMessage).not.toMatch(/admin\.preview/i);
			}
		});

		it("tenant-not-accessible does not reveal tenant status details", () => {
			const result = service.getFallbackForUnresolvedRoute("tenant-not-accessible");

			expect(result.safeMessage).not.toMatch(/suspended/i);
			expect(result.safeMessage).not.toMatch(/archived/i);
			expect(result.safeMessage).not.toMatch(/draft/i);
		});
	});

	describe("getFallbackForResolution", () => {
		it("returns null for resolved results", () => {
			const resolved: PreviewRouteResolutionResult = {
				kind: "resolved",
				normalizedHost: "alpha.preview.local",
				subdomain: "alpha",
				surface: "storefront",
				tenant: {
					customDomains: [],
					displayName: "Alpha",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha",
					status: "active"
				} as TenantResolutionTenantRecord
			};

			expect(service.getFallbackForResolution(resolved)).toBeNull();
		});

		it("returns fallback for unresolved results", () => {
			const unresolved: PreviewRouteResolutionResult = {
				kind: "unresolved",
				normalizedHost: "unknown.preview.local",
				reason: "tenant-not-found"
			};

			const result = service.getFallbackForResolution(unresolved);

			expect(result).not.toBeNull();
			expect(result!.kind).toBe("tenant-not-found");
		});
	});

	describe("retryable", () => {
		it("marks all current failure reasons as not retryable", () => {
			for (const reason of previewRouteUnresolvedReasons) {
				expect(service.isRetryable(reason)).toBe(false);
			}
		});
	});

	describe("contract shape stability", () => {
		it("every fallback response has all required fields", () => {
			for (const reason of previewRouteUnresolvedReasons) {
				const result: PreviewFallbackResponse =
					service.getFallbackForUnresolvedRoute(reason);

				expect(result).toHaveProperty("kind");
				expect(result).toHaveProperty("httpStatus");
				expect(result).toHaveProperty("retryable");
				expect(result).toHaveProperty("safeMessage");
			}
		});
	});
});
