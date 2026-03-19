import { describe, expect, it } from "vitest";

import type { ShellState } from "@platform/ui";

import {
	bootstrapShellCategories,
	classifyBootstrapFailure,
	classifyBootstrapResult,
	describeBootstrapShellState,
	isRetryableBootstrapFailure,
	mapBootstrapFailureToShellState,
	mapBootstrapResultToShellState,
	resolveBootstrapShellPolicy,
	type BootstrapShellCategory
} from "./shell-state";
import {
	bootstrapFailureReasons,
	createFailedResult,
	createInitializingResult,
	createResolvedResult,
	type BootstrapFailureReason,
	type BootstrapResult,
	type TenantFrontendContext
} from "./tenant-bootstrap";

// ── Test Fixtures ────────────────────────────────────────────────────────────

function createTestContext(): TenantFrontendContext {
	return {
		tenantId: "t-001",
		displayName: "Joe's Diner",
		slug: "joes-diner",
		status: "active",
		previewSubdomain: "joes-diner",
		templateKey: "restaurant-core",
		enabledModules: ["catalog", "ordering"]
	};
}

// ── Constants ────────────────────────────────────────────────────────────────

describe("bootstrap shell categories", () => {
	it("defines expected categories", () => {
		expect(bootstrapShellCategories).toContain("loading");
		expect(bootstrapShellCategories).toContain("resolved");
		expect(bootstrapShellCategories).toContain("error");
		expect(bootstrapShellCategories).toContain("unresolved-tenant");
		expect(bootstrapShellCategories).toContain("suspended-tenant");
	});
});

// ── mapBootstrapFailureToShellState ──────────────────────────────────────────

describe("mapBootstrapFailureToShellState", () => {
	it("maps no-host to error", () => {
		expect(mapBootstrapFailureToShellState("no-host")).toBe("error");
	});

	it("maps tenant-not-found to error", () => {
		expect(mapBootstrapFailureToShellState("tenant-not-found")).toBe("error");
	});

	it("maps tenant-suspended to suspended", () => {
		expect(mapBootstrapFailureToShellState("tenant-suspended")).toBe("suspended");
	});

	it("maps tenant-archived to suspended", () => {
		expect(mapBootstrapFailureToShellState("tenant-archived")).toBe("suspended");
	});

	it("maps api-unreachable to error", () => {
		expect(mapBootstrapFailureToShellState("api-unreachable")).toBe("error");
	});

	it("covers all failure reasons", () => {
		for (const reason of bootstrapFailureReasons) {
			const result = mapBootstrapFailureToShellState(reason);

			expect(typeof result).toBe("string");
		}
	});
});

// ── mapBootstrapResultToShellState ───────────────────────────────────────────

describe("mapBootstrapResultToShellState", () => {
	it("maps initializing to loading", () => {
		expect(mapBootstrapResultToShellState(createInitializingResult())).toBe("loading");
	});

	it("maps resolved to ready", () => {
		expect(mapBootstrapResultToShellState(createResolvedResult(createTestContext()))).toBe("ready");
	});

	it("maps failed with no-host to error", () => {
		expect(mapBootstrapResultToShellState(createFailedResult("no-host"))).toBe("error");
	});

	it("maps failed with tenant-suspended to suspended", () => {
		expect(mapBootstrapResultToShellState(createFailedResult("tenant-suspended"))).toBe("suspended");
	});

	it("maps failed with api-unreachable to error", () => {
		expect(mapBootstrapResultToShellState(createFailedResult("api-unreachable"))).toBe("error");
	});
});

// ── classifyBootstrapFailure ─────────────────────────────────────────────────

describe("classifyBootstrapFailure", () => {
	it("classifies no-host as unresolved-tenant", () => {
		expect(classifyBootstrapFailure("no-host")).toBe("unresolved-tenant");
	});

	it("classifies tenant-not-found as unresolved-tenant", () => {
		expect(classifyBootstrapFailure("tenant-not-found")).toBe("unresolved-tenant");
	});

	it("classifies tenant-suspended as suspended-tenant", () => {
		expect(classifyBootstrapFailure("tenant-suspended")).toBe("suspended-tenant");
	});

	it("classifies tenant-archived as suspended-tenant", () => {
		expect(classifyBootstrapFailure("tenant-archived")).toBe("suspended-tenant");
	});

	it("classifies api-unreachable as error", () => {
		expect(classifyBootstrapFailure("api-unreachable")).toBe("error");
	});

	it("covers all failure reasons", () => {
		for (const reason of bootstrapFailureReasons) {
			const category = classifyBootstrapFailure(reason);

			expect(bootstrapShellCategories).toContain(category);
		}
	});
});

// ── classifyBootstrapResult ──────────────────────────────────────────────────

describe("classifyBootstrapResult", () => {
	it("classifies initializing as loading", () => {
		expect(classifyBootstrapResult(createInitializingResult())).toBe("loading");
	});

	it("classifies resolved as resolved", () => {
		expect(classifyBootstrapResult(createResolvedResult(createTestContext()))).toBe("resolved");
	});

	it("classifies failed with no-host as unresolved-tenant", () => {
		expect(classifyBootstrapResult(createFailedResult("no-host"))).toBe("unresolved-tenant");
	});

	it("classifies failed with tenant-suspended as suspended-tenant", () => {
		expect(classifyBootstrapResult(createFailedResult("tenant-suspended"))).toBe("suspended-tenant");
	});

	it("classifies failed with api-unreachable as error", () => {
		expect(classifyBootstrapResult(createFailedResult("api-unreachable"))).toBe("error");
	});
});

// ── resolveBootstrapShellPolicy ──────────────────────────────────────────────

describe("resolveBootstrapShellPolicy", () => {
	it("returns loading policy for initializing result", () => {
		const policy = resolveBootstrapShellPolicy(createInitializingResult());

		expect(policy.state).toBe("loading");
		expect(policy.descriptor.state).toBe("loading");
		expect(policy.chrome.showNavigation).toBe(false);
		expect(policy.chrome.showFooter).toBe(false);
	});

	it("returns ready policy for resolved result", () => {
		const policy = resolveBootstrapShellPolicy(createResolvedResult(createTestContext()));

		expect(policy.state).toBe("ready");
		expect(policy.descriptor.state).toBe("ready");
		expect(policy.chrome.showNavigation).toBe(true);
		expect(policy.chrome.showFooter).toBe(true);
	});

	it("returns error policy for api-unreachable failure", () => {
		const policy = resolveBootstrapShellPolicy(createFailedResult("api-unreachable"));

		expect(policy.state).toBe("error");
		expect(policy.descriptor.title).toBe("Something Went Wrong");
	});

	it("returns error policy for no-host failure with safe message", () => {
		const policy = resolveBootstrapShellPolicy(createFailedResult("no-host"));

		expect(policy.state).toBe("error");
		expect(policy.descriptor.title).toBe("Page Not Found");
	});

	it("returns error policy for tenant-not-found failure with safe message", () => {
		const policy = resolveBootstrapShellPolicy(createFailedResult("tenant-not-found"));

		expect(policy.state).toBe("error");
		expect(policy.descriptor.title).toBe("Page Not Found");
	});

	it("returns suspended policy for tenant-suspended failure", () => {
		const policy = resolveBootstrapShellPolicy(createFailedResult("tenant-suspended"));

		expect(policy.state).toBe("suspended");
		expect(policy.descriptor.title).toBe("Store Unavailable");
	});

	it("returns suspended policy for tenant-archived failure", () => {
		const policy = resolveBootstrapShellPolicy(createFailedResult("tenant-archived"));

		expect(policy.state).toBe("suspended");
		expect(policy.descriptor.title).toBe("Store Unavailable");
	});

	it("hides navigation and footer for suspended state", () => {
		const policy = resolveBootstrapShellPolicy(createFailedResult("tenant-suspended"));

		expect(policy.chrome.showNavigation).toBe(false);
		expect(policy.chrome.showFooter).toBe(false);
	});

	it("returns a policy for every failure reason", () => {
		for (const reason of bootstrapFailureReasons) {
			const policy = resolveBootstrapShellPolicy(createFailedResult(reason));

			expect(policy.state).toBeDefined();
			expect(policy.descriptor.title).toBeDefined();
			expect(policy.descriptor.message).toBeDefined();
		}
	});
});

// ── describeBootstrapShellState ──────────────────────────────────────────────

describe("describeBootstrapShellState", () => {
	it("returns loading descriptor for initializing", () => {
		const descriptor = describeBootstrapShellState(createInitializingResult());

		expect(descriptor).toMatchObject({ state: "loading", title: "Loading" });
	});

	it("returns ready descriptor for resolved", () => {
		const descriptor = describeBootstrapShellState(createResolvedResult(createTestContext()));

		expect(descriptor).toMatchObject({ state: "ready", title: "Ready" });
	});

	it("returns error descriptor for api-unreachable", () => {
		const descriptor = describeBootstrapShellState(createFailedResult("api-unreachable"));

		expect(descriptor).toMatchObject({
			state: "error",
			title: "Something Went Wrong"
		});
	});

	it("returns safe descriptor for no-host", () => {
		const descriptor = describeBootstrapShellState(createFailedResult("no-host"));

		expect(descriptor).toMatchObject({
			state: "error",
			title: "Page Not Found"
		});
	});

	it("returns suspended descriptor for tenant-suspended", () => {
		const descriptor = describeBootstrapShellState(createFailedResult("tenant-suspended"));

		expect(descriptor).toMatchObject({
			state: "suspended",
			title: "Store Unavailable"
		});
	});

	it("returns suspended descriptor for tenant-archived", () => {
		const descriptor = describeBootstrapShellState(createFailedResult("tenant-archived"));

		expect(descriptor).toMatchObject({
			state: "suspended",
			title: "Store Unavailable"
		});
	});
});

// ── isRetryableBootstrapFailure ──────────────────────────────────────────────

describe("isRetryableBootstrapFailure", () => {
	it("returns true for api-unreachable", () => {
		expect(isRetryableBootstrapFailure(createFailedResult("api-unreachable"))).toBe(true);
	});

	it("returns false for no-host", () => {
		expect(isRetryableBootstrapFailure(createFailedResult("no-host"))).toBe(false);
	});

	it("returns false for tenant-not-found", () => {
		expect(isRetryableBootstrapFailure(createFailedResult("tenant-not-found"))).toBe(false);
	});

	it("returns false for tenant-suspended", () => {
		expect(isRetryableBootstrapFailure(createFailedResult("tenant-suspended"))).toBe(false);
	});

	it("returns false for tenant-archived", () => {
		expect(isRetryableBootstrapFailure(createFailedResult("tenant-archived"))).toBe(false);
	});

	it("returns false for initializing", () => {
		expect(isRetryableBootstrapFailure(createInitializingResult())).toBe(false);
	});

	it("returns false for resolved", () => {
		expect(isRetryableBootstrapFailure(createResolvedResult(createTestContext()))).toBe(false);
	});
});

// ── Safe Fallback Tests ──────────────────────────────────────────────────────
// Verify that error, unresolved-tenant, and suspended-tenant states do NOT
// expose tenant identifiers, slugs, or configuration.

describe("safe fallback — no tenant data exposure", () => {
	const sensitiveTerms = [
		"joes-diner",
		"Joe's Diner",
		"t-001",
		"restaurant-core",
		"catalog",
		"ordering"
	];

	function assertNoTenantDataInDescriptor(
		descriptor: { title: string; message: string },
		reason: string
	): void {
		for (const term of sensitiveTerms) {
			expect(descriptor.title).not.toContain(term);
			expect(descriptor.message).not.toContain(term);
		}
	}

	it("no-host descriptor does not expose tenant data", () => {
		const descriptor = describeBootstrapShellState(createFailedResult("no-host"));

		assertNoTenantDataInDescriptor(descriptor, "no-host");
	});

	it("tenant-not-found descriptor does not expose tenant data", () => {
		const descriptor = describeBootstrapShellState(createFailedResult("tenant-not-found"));

		assertNoTenantDataInDescriptor(descriptor, "tenant-not-found");
	});

	it("tenant-suspended descriptor does not expose tenant data", () => {
		const descriptor = describeBootstrapShellState(createFailedResult("tenant-suspended"));

		assertNoTenantDataInDescriptor(descriptor, "tenant-suspended");
	});

	it("tenant-archived descriptor does not expose tenant data", () => {
		const descriptor = describeBootstrapShellState(createFailedResult("tenant-archived"));

		assertNoTenantDataInDescriptor(descriptor, "tenant-archived");
	});

	it("api-unreachable descriptor does not expose tenant data", () => {
		const descriptor = describeBootstrapShellState(createFailedResult("api-unreachable"));

		assertNoTenantDataInDescriptor(descriptor, "api-unreachable");
	});

	it("no failure descriptor contains the word 'tenant'", () => {
		for (const reason of bootstrapFailureReasons) {
			const descriptor = describeBootstrapShellState(createFailedResult(reason));
			const combinedText = `${descriptor.title} ${descriptor.message}`.toLowerCase();

			expect(combinedText).not.toContain("tenant");
		}
	});

	it("no failure policy exposes tenant identifiers", () => {
		for (const reason of bootstrapFailureReasons) {
			const policy = resolveBootstrapShellPolicy(createFailedResult(reason));
			const combinedText =
				`${policy.descriptor.title} ${policy.descriptor.message}`.toLowerCase();

			expect(combinedText).not.toContain("tenant");
			expect(combinedText).not.toContain("t-001");
			expect(combinedText).not.toContain("joes-diner");
		}
	});
});

// ── Transition Tests ─────────────────────────────────────────────────────────
// Verify that all bootstrap failure reasons map to the correct shell state
// and category combination.

describe("transition mapping — failure reasons to shell states", () => {
	const expectedMappings: Array<{
		reason: BootstrapFailureReason;
		shellState: ShellState;
		category: BootstrapShellCategory;
	}> = [
		{ reason: "no-host", shellState: "error", category: "unresolved-tenant" },
		{ reason: "tenant-not-found", shellState: "error", category: "unresolved-tenant" },
		{ reason: "tenant-suspended", shellState: "suspended", category: "suspended-tenant" },
		{ reason: "tenant-archived", shellState: "suspended", category: "suspended-tenant" },
		{ reason: "api-unreachable", shellState: "error", category: "error" }
	];

	it.each(expectedMappings)(
		"maps $reason → shellState=$shellState, category=$category",
		({ reason, shellState, category }) => {
			expect(mapBootstrapFailureToShellState(reason)).toBe(shellState);
			expect(classifyBootstrapFailure(reason)).toBe(category);
		}
	);

	it("covers all known failure reasons", () => {
		const coveredReasons = new Set(expectedMappings.map((m) => m.reason));

		for (const reason of bootstrapFailureReasons) {
			expect(coveredReasons.has(reason)).toBe(true);
		}
	});
});
