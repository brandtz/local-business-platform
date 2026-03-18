import { describe, expect, it } from "vitest";

import {
	createAnonymousAuthViewerState,
	createAuthenticatedAuthViewerState,
	type PlatformTenantOperationalSummary
} from "@platform/types";

import {
	createTenantDetailErrorState,
	createTenantDetailReadyState,
	createTenantListErrorState,
	createTenantListReadyState,
	describeDetailViewShellState,
	describeListViewShellState,
	resolveDetailAccessState,
	resolveListAccessState
} from "./tenant-dashboard";

function buildSampleSummary(
	overrides: Partial<PlatformTenantOperationalSummary> = {}
): PlatformTenantOperationalSummary {
	return {
		customDomainCount: 0,
		healthReasons: [],
		healthStatus: "healthy",
		lastLifecycleAuditAt: null,
		lifecycleStatus: "active",
		liveRoutingStatus: "managed-subdomain-only",
		previewStatus: "configured",
		previewSubdomain: "alpha.preview.example.com",
		publishBlockedReason: null,
		publishStatus: "ready",
		tenantDisplayName: "Alpha Restaurant",
		tenantId: "tenant-1",
		tenantSlug: "alpha-restaurant",
		...overrides
	};
}

describe("tenant dashboard access resolution", () => {
	describe("resolveListAccessState", () => {
		it("returns auth-required for anonymous viewers", () => {
			const result = resolveListAccessState(
				createAnonymousAuthViewerState("platform")
			);

			expect(result).toEqual({ kind: "auth-required" });
		});

		it("returns access-denied for non-platform viewers", () => {
			const result = resolveListAccessState(
				createAuthenticatedAuthViewerState(
					{ actorType: "tenant", displayName: "Tenant User", id: "user-1" },
					"tenant"
				)
			);

			expect(result).toEqual({ kind: "access-denied" });
		});

		it("returns null for authorized platform-admin viewers", () => {
			const result = resolveListAccessState(
				createAuthenticatedAuthViewerState(
					{ actorType: "platform", displayName: "Operator", id: "user-1" },
					"platform"
				)
			);

			expect(result).toBeNull();
		});
	});

	describe("resolveDetailAccessState", () => {
		it("returns auth-required for anonymous viewers", () => {
			const result = resolveDetailAccessState(
				createAnonymousAuthViewerState("platform")
			);

			expect(result).toEqual({ kind: "auth-required" });
		});

		it("returns access-denied for non-platform viewers", () => {
			const result = resolveDetailAccessState(
				createAuthenticatedAuthViewerState(
					{ actorType: "tenant", displayName: "Tenant User", id: "user-1" },
					"tenant"
				)
			);

			expect(result).toEqual({ kind: "access-denied" });
		});

		it("returns null for authorized platform-admin viewers", () => {
			const result = resolveDetailAccessState(
				createAuthenticatedAuthViewerState(
					{ actorType: "platform", displayName: "Operator", id: "user-1" },
					"platform"
				)
			);

			expect(result).toBeNull();
		});
	});
});

describe("tenant list view state creation", () => {
	it("returns empty state when tenants list is empty", () => {
		const result = createTenantListReadyState([]);

		expect(result).toEqual({ kind: "empty" });
	});

	it("returns ready state with tenants when list is non-empty", () => {
		const tenants = [buildSampleSummary(), buildSampleSummary({ tenantId: "tenant-2" })];
		const result = createTenantListReadyState(tenants);

		expect(result).toEqual({ kind: "ready", tenants });
	});

	it("returns auth-required on 401 error", () => {
		const result = createTenantListErrorState(401);

		expect(result).toEqual({ kind: "auth-required" });
	});

	it("returns access-denied on 403 error", () => {
		const result = createTenantListErrorState(403);

		expect(result).toEqual({ kind: "access-denied" });
	});

	it("returns error state on 500 error", () => {
		const result = createTenantListErrorState(500);

		expect(result).toEqual({
			kind: "error",
			error: { kind: "server-error", status: 500, message: "Server error", retryable: true }
		});
	});

	it("returns error state on network error", () => {
		const result = createTenantListErrorState(null);

		expect(result).toEqual({
			kind: "error",
			error: { kind: "network", status: null, message: "Network error", retryable: true }
		});
	});
});

describe("tenant detail view state creation", () => {
	it("returns not-found when tenant is null", () => {
		const result = createTenantDetailReadyState(null, "tenant-99");

		expect(result).toEqual({ kind: "not-found", tenantId: "tenant-99" });
	});

	it("returns ready state when tenant is present", () => {
		const tenant = buildSampleSummary();
		const result = createTenantDetailReadyState(tenant, "tenant-1");

		expect(result).toEqual({ kind: "ready", tenant });
	});

	it("returns auth-required on 401 error", () => {
		const result = createTenantDetailErrorState(401);

		expect(result).toEqual({ kind: "auth-required" });
	});

	it("returns access-denied on 403 error", () => {
		const result = createTenantDetailErrorState(403);

		expect(result).toEqual({ kind: "access-denied" });
	});

	it("returns error state on 500 error", () => {
		const result = createTenantDetailErrorState(500);

		expect(result).toEqual({
			kind: "error",
			error: { kind: "server-error", status: 500, message: "Server error", retryable: true }
		});
	});
});

describe("shell state descriptor mapping", () => {
	describe("describeListViewShellState", () => {
		it("returns loading descriptor for loading state", () => {
			const descriptor = describeListViewShellState({ kind: "loading" });

			expect(descriptor).toMatchObject({ state: "loading", title: "Loading" });
		});

		it("returns custom empty descriptor for empty state", () => {
			const descriptor = describeListViewShellState({ kind: "empty" });

			expect(descriptor).toMatchObject({
				state: "empty",
				title: "No Tenants",
				message: "No tenants have been provisioned yet."
			});
		});

		it("returns error descriptor with error message for error state", () => {
			const descriptor = describeListViewShellState({
				kind: "error",
				error: { kind: "server-error", status: 500, message: "Server error", retryable: true }
			});

			expect(descriptor).toMatchObject({
				state: "error",
				message: "Server error"
			});
		});

		it("returns access-denied descriptor", () => {
			const descriptor = describeListViewShellState({ kind: "access-denied" });

			expect(descriptor).toMatchObject({ state: "access-denied" });
		});

		it("returns auth-required descriptor", () => {
			const descriptor = describeListViewShellState({ kind: "auth-required" });

			expect(descriptor).toMatchObject({ state: "auth-required" });
		});
	});

	describe("describeDetailViewShellState", () => {
		it("returns loading descriptor for loading state", () => {
			const descriptor = describeDetailViewShellState({ kind: "loading" });

			expect(descriptor).toMatchObject({ state: "loading", title: "Loading" });
		});

		it("returns custom not-found descriptor", () => {
			const descriptor = describeDetailViewShellState({ kind: "not-found", tenantId: "tenant-99" });

			expect(descriptor).toMatchObject({
				state: "error",
				title: "Tenant Not Found",
				message: 'No tenant found with ID "tenant-99".'
			});
		});

		it("returns error descriptor with error message", () => {
			const descriptor = describeDetailViewShellState({
				kind: "error",
				error: { kind: "network", status: null, message: "Network error", retryable: true }
			});

			expect(descriptor).toMatchObject({
				state: "error",
				message: "Network error"
			});
		});
	});
});
