import { describe, expect, it } from "vitest";

import {
	createAnonymousAuthViewerState,
	createAuthenticatedAuthViewerState,
	type TenantSummary
} from "@platform/types";

import {
	buildTenantContextHeader,
	evaluateAdminAuthGuard,
	resolveAdminShellState,
	toShellStatePrimitive
} from "./admin-shell";

// ── Test Fixtures ────────────────────────────────────────────────────────────

const tenantViewer = createAuthenticatedAuthViewerState(
	{ actorType: "tenant", displayName: "Alice Owner", id: "user-1" },
	"tenant"
);

const anonymousViewer = createAnonymousAuthViewerState("tenant");

const platformViewer = createAuthenticatedAuthViewerState(
	{ actorType: "platform", displayName: "Operator", id: "platform-1" },
	"platform"
);

const activeTenant: TenantSummary = {
	displayName: "Alpha Fitness",
	id: "tenant-1",
	slug: "alpha-fitness",
	status: "active"
};

const suspendedTenant: TenantSummary = {
	displayName: "Alpha Fitness",
	id: "tenant-1",
	slug: "alpha-fitness",
	status: "suspended"
};

// ── evaluateAdminAuthGuard ───────────────────────────────────────────────────

describe("evaluateAdminAuthGuard", () => {
	it("allows authenticated tenant-scoped viewers", () => {
		const result = evaluateAdminAuthGuard(tenantViewer);

		expect(result.outcome).toBe("allow");
	});

	it("redirects anonymous viewers to auth-required", () => {
		const result = evaluateAdminAuthGuard(anonymousViewer);

		expect(result).toEqual({
			outcome: "redirect",
			target: "/auth-required"
		});
	});

	it("redirects wrong-scope viewers to access-denied", () => {
		const result = evaluateAdminAuthGuard(platformViewer);

		expect(result).toEqual({
			outcome: "redirect",
			target: "/access-denied"
		});
	});
});

// ── buildTenantContextHeader ─────────────────────────────────────────────────

describe("buildTenantContextHeader", () => {
	it("returns correct business name, display name, and role", () => {
		const header = buildTenantContextHeader(
			activeTenant,
			tenantViewer,
			"owner"
		);

		expect(header.businessName).toBe("Alpha Fitness");
		expect(header.userDisplayName).toBe("Alice Owner");
		expect(header.userRole).toBe("owner");
	});

	it("falls back to Unknown when display name is null", () => {
		const noNameViewer = createAuthenticatedAuthViewerState(
			{ actorType: "tenant", displayName: undefined, id: "user-2" },
			"tenant"
		);
		const header = buildTenantContextHeader(
			activeTenant,
			noNameViewer,
			"manager"
		);

		expect(header.userDisplayName).toBe("Unknown");
		expect(header.userRole).toBe("manager");
	});
});

// ── resolveAdminShellState ───────────────────────────────────────────────────

describe("resolveAdminShellState", () => {
	it("returns ready state for allowed viewer with active tenant", () => {
		const guard = evaluateAdminAuthGuard(tenantViewer);
		const state = resolveAdminShellState(guard, activeTenant, "owner");

		expect(state.kind).toBe("ready");

		if (state.kind === "ready") {
			expect(state.header.businessName).toBe("Alpha Fitness");
		}
	});

	it("returns auth-required for anonymous viewer", () => {
		const guard = evaluateAdminAuthGuard(anonymousViewer);
		const state = resolveAdminShellState(guard, null, null);

		expect(state.kind).toBe("auth-required");
	});

	it("returns access-denied for wrong-scope viewer", () => {
		const guard = evaluateAdminAuthGuard(platformViewer);
		const state = resolveAdminShellState(guard, null, null);

		expect(state.kind).toBe("access-denied");
	});

	it("returns error when tenant is null for allowed viewer", () => {
		const guard = evaluateAdminAuthGuard(tenantViewer);
		const state = resolveAdminShellState(guard, null, "owner");

		expect(state.kind).toBe("error");

		if (state.kind === "error") {
			expect(state.descriptor.title).toBe("Tenant Not Found");
		}
	});

	it("returns suspended for suspended tenant", () => {
		const guard = evaluateAdminAuthGuard(tenantViewer);
		const state = resolveAdminShellState(guard, suspendedTenant, "owner");

		expect(state.kind).toBe("suspended");

		if (state.kind === "suspended") {
			expect(state.descriptor.title).toBe("Account Suspended");
			expect(state.descriptor.message).toContain("contact support");
		}
	});

	it("returns access-denied when role is null for allowed viewer with tenant", () => {
		const guard = evaluateAdminAuthGuard(tenantViewer);
		const state = resolveAdminShellState(guard, activeTenant, null);

		expect(state.kind).toBe("access-denied");
	});
});

// ── toShellStatePrimitive ────────────────────────────────────────────────────

describe("toShellStatePrimitive", () => {
	it("maps loading to loading", () => {
		expect(toShellStatePrimitive({ kind: "loading" })).toBe("loading");
	});

	it("maps ready to ready", () => {
		const guard = evaluateAdminAuthGuard(tenantViewer);
		const state = resolveAdminShellState(guard, activeTenant, "owner");

		expect(toShellStatePrimitive(state)).toBe("ready");
	});

	it("maps suspended to suspended", () => {
		const guard = evaluateAdminAuthGuard(tenantViewer);
		const state = resolveAdminShellState(guard, suspendedTenant, "owner");

		expect(toShellStatePrimitive(state)).toBe("suspended");
	});

	it("maps auth-required to auth-required", () => {
		const guard = evaluateAdminAuthGuard(anonymousViewer);
		const state = resolveAdminShellState(guard, null, null);

		expect(toShellStatePrimitive(state)).toBe("auth-required");
	});

	it("maps access-denied to access-denied", () => {
		const guard = evaluateAdminAuthGuard(platformViewer);
		const state = resolveAdminShellState(guard, null, null);

		expect(toShellStatePrimitive(state)).toBe("access-denied");
	});
});
