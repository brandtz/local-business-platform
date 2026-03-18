import { describe, expect, it } from "vitest";

import { shellStates, type ShellState } from "./primitives";
import {
	createAdminShellConfig,
	createCustomerShellConfig,
	createPlatformAdminShellConfig,
	frontendAppIds,
	getAllAppShellConfigs,
	getUncoveredShellStates,
	resolveShellStateFromHttpStatus,
	resolveShellStateRenderPolicy
} from "./app-shell";

// ── resolveShellStateRenderPolicy ────────────────────────────────────────────

describe("resolveShellStateRenderPolicy", () => {
	it.each(shellStates)("returns a complete policy for '%s'", (state) => {
		const policy = resolveShellStateRenderPolicy(state);

		expect(policy.state).toBe(state);
		expect(policy.descriptor.state).toBe(state);
		expect(typeof policy.descriptor.title).toBe("string");
		expect(typeof policy.descriptor.message).toBe("string");
		expect(typeof policy.chrome.showNavigation).toBe("boolean");
		expect(typeof policy.chrome.showFooter).toBe("boolean");
	});

	it("applies descriptor title override", () => {
		const policy = resolveShellStateRenderPolicy("error", {
			title: "Custom Error"
		});

		expect(policy.descriptor.title).toBe("Custom Error");
	});

	it("applies descriptor message override", () => {
		const policy = resolveShellStateRenderPolicy("suspended", {
			message: "Custom message"
		});

		expect(policy.descriptor.message).toBe("Custom message");
	});

	it("hides navigation and footer for loading state", () => {
		const policy = resolveShellStateRenderPolicy("loading");

		expect(policy.chrome.showNavigation).toBe(false);
		expect(policy.chrome.showFooter).toBe(false);
	});

	it("shows navigation and footer for ready state", () => {
		const policy = resolveShellStateRenderPolicy("ready");

		expect(policy.chrome.showNavigation).toBe(true);
		expect(policy.chrome.showFooter).toBe(true);
	});

	it("hides navigation and footer for auth-required state", () => {
		const policy = resolveShellStateRenderPolicy("auth-required");

		expect(policy.chrome.showNavigation).toBe(false);
		expect(policy.chrome.showFooter).toBe(false);
	});

	it("hides navigation and footer for suspended state", () => {
		const policy = resolveShellStateRenderPolicy("suspended");

		expect(policy.chrome.showNavigation).toBe(false);
		expect(policy.chrome.showFooter).toBe(false);
	});

	it("shows navigation but hides footer for access-denied state", () => {
		const policy = resolveShellStateRenderPolicy("access-denied");

		expect(policy.chrome.showNavigation).toBe(true);
		expect(policy.chrome.showFooter).toBe(false);
	});
});

// ── resolveShellStateFromHttpStatus ──────────────────────────────────────────

describe("resolveShellStateFromHttpStatus", () => {
	it("maps null (network error) to error", () => {
		expect(resolveShellStateFromHttpStatus(null)).toBe("error");
	});

	it("maps 401 to auth-required", () => {
		expect(resolveShellStateFromHttpStatus(401)).toBe("auth-required");
	});

	it("maps 403 to access-denied", () => {
		expect(resolveShellStateFromHttpStatus(403)).toBe("access-denied");
	});

	it("maps 500 to error", () => {
		expect(resolveShellStateFromHttpStatus(500)).toBe("error");
	});

	it("maps 503 to error", () => {
		expect(resolveShellStateFromHttpStatus(503)).toBe("error");
	});

	it("maps unknown status to error", () => {
		expect(resolveShellStateFromHttpStatus(418)).toBe("error");
	});
});

// ── getUncoveredShellStates ──────────────────────────────────────────────────

describe("getUncoveredShellStates", () => {
	it("returns empty array when all states are covered", () => {
		expect(getUncoveredShellStates(shellStates)).toEqual([]);
	});

	it("returns missing states when coverage is incomplete", () => {
		const partial: ShellState[] = ["loading", "ready"];
		const uncovered = getUncoveredShellStates(partial);

		expect(uncovered).toContain("error");
		expect(uncovered).toContain("empty");
		expect(uncovered).toContain("access-denied");
		expect(uncovered).toContain("auth-required");
		expect(uncovered).toContain("suspended");
		expect(uncovered).toHaveLength(5);
	});

	it("returns all states when none are covered", () => {
		expect(getUncoveredShellStates([])).toEqual([...shellStates]);
	});
});

// ── Per-App Shell Configuration ──────────────────────────────────────────────

describe("createCustomerShellConfig", () => {
	it("uses web-customer appId", () => {
		expect(createCustomerShellConfig().appId).toBe("web-customer");
	});

	it("covers all shell states", () => {
		const config = createCustomerShellConfig();
		const covered = Object.keys(config.policies) as ShellState[];

		expect(getUncoveredShellStates(covered)).toEqual([]);
	});

	it("uses tenant-safe messaging for suspended state", () => {
		const config = createCustomerShellConfig();

		expect(config.policies.suspended.descriptor.title).toBe(
			"Store Unavailable"
		);
		expect(config.policies.suspended.descriptor.message).not.toContain(
			"suspended"
		);
	});
});

describe("createAdminShellConfig", () => {
	it("uses web-admin appId", () => {
		expect(createAdminShellConfig().appId).toBe("web-admin");
	});

	it("covers all shell states", () => {
		const config = createAdminShellConfig();
		const covered = Object.keys(config.policies) as ShellState[];

		expect(getUncoveredShellStates(covered)).toEqual([]);
	});

	it("uses business-owner messaging for suspended state", () => {
		const config = createAdminShellConfig();

		expect(config.policies.suspended.descriptor.title).toBe(
			"Account Suspended"
		);
		expect(config.policies.suspended.descriptor.message).toContain(
			"contact support"
		);
	});
});

describe("createPlatformAdminShellConfig", () => {
	it("uses web-platform-admin appId", () => {
		expect(createPlatformAdminShellConfig().appId).toBe(
			"web-platform-admin"
		);
	});

	it("covers all shell states", () => {
		const config = createPlatformAdminShellConfig();
		const covered = Object.keys(config.policies) as ShellState[];

		expect(getUncoveredShellStates(covered)).toEqual([]);
	});
});

// ── Cross-App Consistency ────────────────────────────────────────────────────

describe("cross-app consistency", () => {
	it("all three apps have configs", () => {
		const configs = getAllAppShellConfigs();

		expect(configs).toHaveLength(frontendAppIds.length);
		expect(configs.map((c) => c.appId).sort()).toEqual(
			[...frontendAppIds].sort()
		);
	});

	it("all three apps handle exactly the same set of shell states", () => {
		const configs = getAllAppShellConfigs();

		for (const config of configs) {
			const states = Object.keys(config.policies).sort();

			expect(states).toEqual([...shellStates].sort());
		}
	});

	it("all apps agree on chrome policy for loading state", () => {
		const configs = getAllAppShellConfigs();

		for (const config of configs) {
			expect(config.policies.loading.chrome.showNavigation).toBe(false);
			expect(config.policies.loading.chrome.showFooter).toBe(false);
		}
	});

	it("all apps agree on chrome policy for ready state", () => {
		const configs = getAllAppShellConfigs();

		for (const config of configs) {
			expect(config.policies.ready.chrome.showNavigation).toBe(true);
			expect(config.policies.ready.chrome.showFooter).toBe(true);
		}
	});

	it("no app exposes tenant details in access-denied descriptor", () => {
		const configs = getAllAppShellConfigs();

		for (const config of configs) {
			const desc = config.policies["access-denied"].descriptor;

			expect(desc.title.toLowerCase()).not.toContain("tenant");
			expect(desc.message.toLowerCase()).not.toContain("tenant");
		}
	});

	it("no app exposes tenant details in suspended descriptor", () => {
		const configs = getAllAppShellConfigs();

		for (const config of configs) {
			const desc = config.policies.suspended.descriptor;

			expect(desc.title.toLowerCase()).not.toContain("tenant");
			expect(desc.message.toLowerCase()).not.toContain("tenant");
		}
	});
});
