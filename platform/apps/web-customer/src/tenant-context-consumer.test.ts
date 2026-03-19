import { inject } from "vue";
import { describe, expect, it, vi, type Mock } from "vitest";

import type { TenantModuleKey } from "@platform/types";

import type { BootstrapResult, TenantFrontendContext } from "./tenant-bootstrap";
import {
	areAllTenantModulesEnabled,
	freezeTenantContext,
	isAnyTenantModuleEnabled,
	isTenantModuleEnabled,
	requireTenantContext,
	requireTenantModule,
	useTenantBootstrapResult,
	useTenantContext
} from "./tenant-context-consumer";

// ── Mock Vue inject ──────────────────────────────────────────────────────────
// Composables use Vue's inject(); we mock it to test without a DOM / jsdom.

vi.mock("vue", async () => {
	const actual = await vi.importActual<typeof import("vue")>("vue");
	return { ...actual, inject: vi.fn() };
});

const mockedInject = inject as Mock;

// ── Test Fixtures ────────────────────────────────────────────────────────────

function createTestContext(
	overrides: Partial<TenantFrontendContext> = {}
): TenantFrontendContext {
	return {
		tenantId: "t-001",
		displayName: "Joe's Diner",
		slug: "joes-diner",
		status: "active",
		previewSubdomain: "joes-diner",
		templateKey: "restaurant-core",
		enabledModules: ["catalog", "ordering"],
		...overrides
	};
}

function createResolvedResult(
	context: TenantFrontendContext = createTestContext()
): BootstrapResult {
	return { phase: "resolved", context };
}

function createFailedResult(): BootstrapResult {
	return { phase: "failed", reason: "tenant-not-found" };
}

// ── useTenantContext ─────────────────────────────────────────────────────────

describe("useTenantContext", () => {
	it("returns tenant context when provided", () => {
		const testContext = createTestContext();
		mockedInject.mockReturnValue(testContext);

		const result = useTenantContext();

		expect(result).toBe(testContext);
		expect(result.tenantId).toBe("t-001");
		expect(result.slug).toBe("joes-diner");
	});

	it("throws when called outside bootstrapped component tree", () => {
		mockedInject.mockReturnValue(undefined);

		expect(() => useTenantContext()).toThrow(
			"useTenantContext() was called outside a bootstrapped component tree"
		);
	});

	it("returns context with all required fields", () => {
		const testContext = createTestContext();
		mockedInject.mockReturnValue(testContext);

		const result = useTenantContext();

		expect(result).toHaveProperty("tenantId");
		expect(result).toHaveProperty("displayName");
		expect(result).toHaveProperty("slug");
		expect(result).toHaveProperty("status");
		expect(result).toHaveProperty("previewSubdomain");
		expect(result).toHaveProperty("templateKey");
		expect(result).toHaveProperty("enabledModules");
	});

	it("error message guides developer to correct usage", () => {
		mockedInject.mockReturnValue(undefined);

		expect(() => useTenantContext()).toThrow(
			"resolved app shell"
		);
	});
});

// ── useTenantBootstrapResult ─────────────────────────────────────────────────

describe("useTenantBootstrapResult", () => {
	it("returns resolved bootstrap result when provided", () => {
		const testResult = createResolvedResult();
		mockedInject.mockReturnValue(testResult);

		const result = useTenantBootstrapResult();

		expect(result).toBe(testResult);
		expect(result.phase).toBe("resolved");
	});

	it("returns failed bootstrap result when provided", () => {
		const testResult = createFailedResult();
		mockedInject.mockReturnValue(testResult);

		const result = useTenantBootstrapResult();

		expect(result).toBe(testResult);
		expect(result.phase).toBe("failed");
	});

	it("throws when called outside app component tree", () => {
		mockedInject.mockReturnValue(undefined);

		expect(() => useTenantBootstrapResult()).toThrow(
			"useTenantBootstrapResult() was called outside the app component tree"
		);
	});

	it("error message guides developer to correct usage", () => {
		mockedInject.mockReturnValue(undefined);

		expect(() => useTenantBootstrapResult()).toThrow(
			"mounted Vue application"
		);
	});
});

// ── isTenantModuleEnabled ────────────────────────────────────────────────────

describe("isTenantModuleEnabled", () => {
	const context = createTestContext({
		enabledModules: ["catalog", "ordering"]
	});

	it("returns true for an enabled module", () => {
		expect(isTenantModuleEnabled(context, "catalog")).toBe(true);
		expect(isTenantModuleEnabled(context, "ordering")).toBe(true);
	});

	it("returns false for a disabled module", () => {
		expect(isTenantModuleEnabled(context, "bookings")).toBe(false);
		expect(isTenantModuleEnabled(context, "content")).toBe(false);
		expect(isTenantModuleEnabled(context, "operations")).toBe(false);
	});

	it("returns false when no modules are enabled", () => {
		const emptyContext = createTestContext({ enabledModules: [] });

		expect(isTenantModuleEnabled(emptyContext, "catalog")).toBe(false);
	});
});

// ── areAllTenantModulesEnabled ───────────────────────────────────────────────

describe("areAllTenantModulesEnabled", () => {
	const context = createTestContext({
		enabledModules: ["catalog", "ordering", "bookings"]
	});

	it("returns true when all specified modules are enabled", () => {
		expect(
			areAllTenantModulesEnabled(context, ["catalog", "ordering"])
		).toBe(true);
	});

	it("returns false when one module is not enabled", () => {
		expect(
			areAllTenantModulesEnabled(context, ["catalog", "content"])
		).toBe(false);
	});

	it("returns true for empty module list", () => {
		expect(areAllTenantModulesEnabled(context, [])).toBe(true);
	});
});

// ── isAnyTenantModuleEnabled ─────────────────────────────────────────────────

describe("isAnyTenantModuleEnabled", () => {
	const context = createTestContext({
		enabledModules: ["catalog", "ordering"]
	});

	it("returns true when at least one module is enabled", () => {
		expect(
			isAnyTenantModuleEnabled(context, ["catalog", "content"])
		).toBe(true);
	});

	it("returns false when no specified modules are enabled", () => {
		expect(
			isAnyTenantModuleEnabled(context, ["bookings", "content"])
		).toBe(false);
	});

	it("returns false for empty module list", () => {
		expect(isAnyTenantModuleEnabled(context, [])).toBe(false);
	});
});

// ── requireTenantContext (route guard) ────────────────────────────────────────

describe("requireTenantContext", () => {
	it("allows navigation when tenant context is present", () => {
		const context = createTestContext();
		const guard = requireTenantContext(context);
		const result = (guard as Function)();

		expect(result).toBe(true);
	});

	it("redirects to '/' when tenant context is missing", () => {
		const guard = requireTenantContext(undefined);
		const result = (guard as Function)();

		expect(result).toBe("/");
	});

	it("redirects to custom path when context is missing", () => {
		const guard = requireTenantContext(undefined, {
			redirectTo: "/error"
		});
		const result = (guard as Function)();

		expect(result).toBe("/error");
	});
});

// ── requireTenantModule (route guard) ────────────────────────────────────────

describe("requireTenantModule", () => {
	const context = createTestContext({
		enabledModules: ["catalog", "ordering"]
	});

	it("allows navigation when module is enabled", () => {
		const guard = requireTenantModule(context, "catalog");
		const result = (guard as Function)();

		expect(result).toBe(true);
	});

	it("redirects when module is not enabled", () => {
		const guard = requireTenantModule(context, "bookings");
		const result = (guard as Function)();

		expect(result).toBe("/");
	});

	it("redirects to custom path when module is not enabled", () => {
		const guard = requireTenantModule(context, "bookings", {
			redirectTo: "/not-available"
		});
		const result = (guard as Function)();

		expect(result).toBe("/not-available");
	});

	it("redirects when context is undefined", () => {
		const guard = requireTenantModule(undefined, "catalog");
		const result = (guard as Function)();

		expect(result).toBe("/");
	});
});

// ── freezeTenantContext ──────────────────────────────────────────────────────

describe("freezeTenantContext", () => {
	it("returns the same reference after freezing", () => {
		const context = createTestContext();
		const frozen = freezeTenantContext(context);

		expect(frozen).toBe(context);
	});

	it("prevents mutation of top-level properties", () => {
		const context = createTestContext();
		const frozen = freezeTenantContext(context);

		expect(() => {
			(frozen as Record<string, unknown>).tenantId = "mutated";
		}).toThrow();
	});

	it("prevents mutation of enabledModules array", () => {
		const context = createTestContext({
			enabledModules: ["catalog", "ordering"]
		});
		const frozen = freezeTenantContext(context);

		expect(() => {
			(frozen.enabledModules as TenantModuleKey[]).push("bookings");
		}).toThrow();
	});

	it("preserves all original values after freezing", () => {
		const context = createTestContext();
		const frozen = freezeTenantContext(context);

		expect(frozen.tenantId).toBe("t-001");
		expect(frozen.displayName).toBe("Joe's Diner");
		expect(frozen.slug).toBe("joes-diner");
		expect(frozen.status).toBe("active");
		expect(frozen.previewSubdomain).toBe("joes-diner");
		expect(frozen.templateKey).toBe("restaurant-core");
		expect(frozen.enabledModules).toEqual(["catalog", "ordering"]);
	});
});

// ── Type Safety ──────────────────────────────────────────────────────────────
// These tests verify that the tenant context shape is enforced at the provider
// boundary — the frozen context has all required fields and correct types.

describe("type safety: tenant context shape", () => {
	it("enforces required fields on TenantFrontendContext", () => {
		const context = createTestContext();
		const frozen = freezeTenantContext(context);

		// Verify each field exists and has the expected type
		expect(typeof frozen.tenantId).toBe("string");
		expect(typeof frozen.displayName).toBe("string");
		expect(typeof frozen.slug).toBe("string");
		expect(typeof frozen.status).toBe("string");
		expect(typeof frozen.previewSubdomain).toBe("string");
		expect(typeof frozen.templateKey).toBe("string");
		expect(Array.isArray(frozen.enabledModules)).toBe(true);
	});

	it("enabledModules contains only valid module keys", () => {
		const validKeys: readonly TenantModuleKey[] = [
			"catalog",
			"ordering",
			"bookings",
			"content",
			"operations"
		];

		const context = createTestContext({
			enabledModules: ["catalog", "ordering", "bookings"]
		});

		for (const mod of context.enabledModules) {
			expect(validKeys).toContain(mod);
		}
	});

	it("templateKey is a valid vertical template key", () => {
		const validKeys = [
			"restaurant-core",
			"services-core",
			"hybrid-local-business"
		];

		const context = createTestContext();

		expect(validKeys).toContain(context.templateKey);
	});

	it("status is a valid tenant status", () => {
		const validStatuses = ["draft", "active", "suspended", "archived"];

		const context = createTestContext();

		expect(validStatuses).toContain(context.status);
	});
});
