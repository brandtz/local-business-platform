import { describe, expect, it } from "vitest";

import {
	alertVariants,
	bannerIntents,
	createAlertDescriptor,
	createEmptyStateDescriptor,
	createPageLayoutDescriptor,
	createStackDescriptor,
	createStatusBannerDescriptor,
	getDefaultShellStateMessage,
	layoutRegions,
	resolveShellStateDescriptor,
	shellStates,
	stackDirections
} from "./primitives";

describe("alert descriptors", () => {
	it("creates an info alert with defaults", () => {
		const alert = createAlertDescriptor("info", "Info title");
		expect(alert).toEqual({
			variant: "info",
			title: "Info title",
			message: undefined,
			dismissible: false
		});
	});

	it("creates a dismissible error alert with message", () => {
		const alert = createAlertDescriptor("error", "Error", {
			message: "Something failed",
			dismissible: true
		});
		expect(alert.variant).toBe("error");
		expect(alert.message).toBe("Something failed");
		expect(alert.dismissible).toBe(true);
	});

	it("defines all four alert variants", () => {
		expect([...alertVariants]).toEqual(["info", "success", "warning", "error"]);
	});
});

describe("empty state descriptors", () => {
	it("creates a basic empty state", () => {
		const state = createEmptyStateDescriptor("No items", "Nothing to show");
		expect(state).toEqual({
			title: "No items",
			message: "Nothing to show",
			actionLabel: undefined
		});
	});

	it("creates an empty state with an action label", () => {
		const state = createEmptyStateDescriptor("No orders", "You have no orders yet", "Browse catalog");
		expect(state.actionLabel).toBe("Browse catalog");
	});
});

describe("status banner descriptors", () => {
	it("creates a non-persistent info banner", () => {
		const banner = createStatusBannerDescriptor("info", "System update available");
		expect(banner).toEqual({
			intent: "info",
			message: "System update available",
			persistent: false
		});
	});

	it("creates a persistent security banner", () => {
		const banner = createStatusBannerDescriptor("security", "Impersonation active", true);
		expect(banner.intent).toBe("security");
		expect(banner.persistent).toBe(true);
	});

	it("defines all banner intents", () => {
		expect([...bannerIntents]).toEqual(["info", "warning", "error", "security"]);
	});
});

describe("page layout descriptors", () => {
	it("creates a layout with default regions", () => {
		const layout = createPageLayoutDescriptor("Dashboard");
		expect(layout).toEqual({
			title: "Dashboard",
			regions: ["header", "main", "footer"],
			fullWidth: false
		});
	});

	it("creates a full-width layout with custom regions", () => {
		const layout = createPageLayoutDescriptor("Settings", {
			regions: ["header", "sidebar", "main"],
			fullWidth: true
		});
		expect(layout.regions).toEqual(["header", "sidebar", "main"]);
		expect(layout.fullWidth).toBe(true);
	});

	it("defines all layout regions", () => {
		expect([...layoutRegions]).toEqual(["header", "sidebar", "main", "footer"]);
	});
});

describe("stack descriptors", () => {
	it("creates a default vertical stack", () => {
		const stack = createStackDescriptor();
		expect(stack).toEqual({
			direction: "vertical",
			gap: "1rem"
		});
	});

	it("creates a horizontal stack with custom gap", () => {
		const stack = createStackDescriptor("horizontal", "0.5rem");
		expect(stack.direction).toBe("horizontal");
		expect(stack.gap).toBe("0.5rem");
	});

	it("defines all stack directions", () => {
		expect([...stackDirections]).toEqual(["vertical", "horizontal"]);
	});
});

describe("shell state descriptors", () => {
	it("defines all shell states", () => {
		expect([...shellStates]).toEqual([
			"loading",
			"ready",
			"error",
			"empty",
			"access-denied",
			"auth-required",
			"suspended"
		]);
	});

	it("resolves a shell state with default messages", () => {
		const descriptor = resolveShellStateDescriptor("loading");
		expect(descriptor).toEqual({
			state: "loading",
			title: "Loading",
			message: "Please wait while we prepare your experience."
		});
	});

	it("resolves a shell state with overridden title", () => {
		const descriptor = resolveShellStateDescriptor("error", { title: "Custom Error" });
		expect(descriptor.title).toBe("Custom Error");
		expect(descriptor.message).toBe("An unexpected error occurred. Please try again.");
	});

	it("resolves a shell state with overridden message", () => {
		const descriptor = resolveShellStateDescriptor("auth-required", {
			message: "Please log in with your business account."
		});
		expect(descriptor.title).toBe("Authentication Required");
		expect(descriptor.message).toBe("Please log in with your business account.");
	});

	it("returns default messages for every shell state", () => {
		for (const state of shellStates) {
			const defaults = getDefaultShellStateMessage(state);
			expect(typeof defaults.title).toBe("string");
			expect(typeof defaults.message).toBe("string");
			expect(defaults.title.length).toBeGreaterThan(0);
			expect(defaults.message.length).toBeGreaterThan(0);
		}
	});

	it("returns a copy from getDefaultShellStateMessage (not a mutable reference)", () => {
		const a = getDefaultShellStateMessage("loading");
		const b = getDefaultShellStateMessage("loading");
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
	});
});
