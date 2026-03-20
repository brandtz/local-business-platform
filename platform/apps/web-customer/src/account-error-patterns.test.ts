import { describe, it, expect } from "vitest";

import type { ApiError, ApiErrorKind } from "@platform/sdk";

import {
	classifyAccountError,
	resolveAccountErrorState,
	resolveAccountErrorFromStatus,
	createAccountErrorBoundary,
	createCleanAccountBoundary,
	createAccountErrorPage,
	createAccessDeniedPage,
	createAuthRequiredPage,
	createAccountNotFoundPage,
	createAccountErrorPages,
	type AccountErrorCategory
} from "./account-error-patterns";

// ── Error Classification ─────────────────────────────────────────────────────

describe("classifyAccountError", () => {
	const cases: [ApiErrorKind, AccountErrorCategory][] = [
		["unauthorized", "auth-required"],
		["forbidden", "access-denied"],
		["not-found", "not-found"],
		["network", "network-error"],
		["timeout", "network-error"],
		["server-error", "server-error"],
		["rate-limited", "server-error"],
		["validation", "unknown"],
		["unknown", "unknown"]
	];

	for (const [kind, expected] of cases) {
		it(`maps "${kind}" to "${expected}"`, () => {
			expect(classifyAccountError(kind)).toBe(expected);
		});
	}
});

// ── Error → ShellState Mapping ───────────────────────────────────────────────

describe("resolveAccountErrorState", () => {
	it("returns auth-required state for unauthorized errors", () => {
		const error: ApiError = { kind: "unauthorized", status: 401, message: "Auth", retryable: false };
		const state = resolveAccountErrorState(error);
		expect(state.state).toBe("auth-required");
		expect(state.title).toBe("Sign In Required");
	});

	it("returns access-denied state for forbidden errors", () => {
		const error: ApiError = { kind: "forbidden", status: 403, message: "Denied", retryable: false };
		const state = resolveAccountErrorState(error);
		expect(state.state).toBe("access-denied");
		expect(state.title).toBe("Access Denied");
	});

	it("returns error state with not-found title for 404", () => {
		const error: ApiError = { kind: "not-found", status: 404, message: "Missing", retryable: false };
		const state = resolveAccountErrorState(error);
		expect(state.state).toBe("error");
		expect(state.title).toBe("Not Found");
	});

	it("returns error state for network errors", () => {
		const error: ApiError = { kind: "network", status: null, message: "Net", retryable: true };
		const state = resolveAccountErrorState(error);
		expect(state.state).toBe("error");
		expect(state.title).toBe("Connection Problem");
	});

	it("returns error state for server errors", () => {
		const error: ApiError = { kind: "server-error", status: 500, message: "Oops", retryable: true };
		const state = resolveAccountErrorState(error);
		expect(state.state).toBe("error");
		expect(state.title).toBe("Server Error");
	});

	it("returns generic error state for unknown errors", () => {
		const error: ApiError = { kind: "unknown", status: 418, message: "???", retryable: false };
		const state = resolveAccountErrorState(error);
		expect(state.state).toBe("error");
		expect(state.title).toBe("Something Went Wrong");
	});

	it("does not expose internal identifiers in messages", () => {
		const error: ApiError = { kind: "forbidden", status: 403, message: "tenant-123 denied", retryable: false };
		const state = resolveAccountErrorState(error);
		expect(state.message).not.toContain("tenant-123");
	});
});

describe("resolveAccountErrorFromStatus", () => {
	it("handles 401 status", () => {
		const state = resolveAccountErrorFromStatus(401);
		expect(state.state).toBe("auth-required");
	});

	it("handles 403 status", () => {
		const state = resolveAccountErrorFromStatus(403);
		expect(state.state).toBe("access-denied");
	});

	it("handles 404 status", () => {
		const state = resolveAccountErrorFromStatus(404);
		expect(state.state).toBe("error");
		expect(state.title).toBe("Not Found");
	});

	it("handles 500 status", () => {
		const state = resolveAccountErrorFromStatus(500);
		expect(state.state).toBe("error");
		expect(state.title).toBe("Server Error");
	});

	it("handles null status (network error)", () => {
		const state = resolveAccountErrorFromStatus(null);
		expect(state.state).toBe("error");
		expect(state.title).toBe("Connection Problem");
	});
});

// ── Error Boundary ───────────────────────────────────────────────────────────

describe("createAccountErrorBoundary", () => {
	it("creates caught boundary with shell state for errors", () => {
		const error: ApiError = { kind: "unauthorized", status: 401, message: "Auth", retryable: false };
		const boundary = createAccountErrorBoundary(error);
		expect(boundary.result.caught).toBe(true);
		expect(boundary.shellState).not.toBeNull();
		expect(boundary.shellState!.state).toBe("auth-required");
	});

	it("marks recoverable for retryable errors", () => {
		const error: ApiError = { kind: "network", status: null, message: "Net", retryable: true };
		const boundary = createAccountErrorBoundary(error);
		expect(boundary.result.caught).toBe(true);
		if (boundary.result.caught) {
			expect(boundary.result.recoverable).toBe(true);
		}
	});

	it("marks not recoverable for non-retryable errors", () => {
		const error: ApiError = { kind: "forbidden", status: 403, message: "No", retryable: false };
		const boundary = createAccountErrorBoundary(error);
		expect(boundary.result.caught).toBe(true);
		if (boundary.result.caught) {
			expect(boundary.result.recoverable).toBe(false);
		}
	});
});

describe("createCleanAccountBoundary", () => {
	it("creates a clean boundary with no error", () => {
		const boundary = createCleanAccountBoundary();
		expect(boundary.result.caught).toBe(false);
		expect(boundary.shellState).toBeNull();
	});
});

// ── Error Page Components ────────────────────────────────────────────────────

describe("createAccountErrorPage", () => {
	it("creates a component from a ShellStateDescriptor", () => {
		const descriptor = {
			state: "error" as const,
			title: "Test Error",
			message: "Something broke."
		};
		const page = createAccountErrorPage(descriptor);
		expect(page).toBeDefined();
		expect(typeof page).toBe("object");
	});
});

describe("createAccessDeniedPage", () => {
	it("creates a component", () => {
		const page = createAccessDeniedPage();
		expect(page).toBeDefined();
	});
});

describe("createAuthRequiredPage", () => {
	it("creates a component", () => {
		const page = createAuthRequiredPage();
		expect(page).toBeDefined();
	});
});

describe("createAccountNotFoundPage", () => {
	it("creates a component", () => {
		const page = createAccountNotFoundPage();
		expect(page).toBeDefined();
	});
});

describe("createAccountErrorPages", () => {
	it("returns all 5 error page types", () => {
		const pages = createAccountErrorPages();
		expect(pages.accessDenied).toBeDefined();
		expect(pages.authRequired).toBeDefined();
		expect(pages.notFound).toBeDefined();
		expect(pages.serverError).toBeDefined();
		expect(pages.networkError).toBeDefined();
	});

	it("each page is a component object", () => {
		const pages = createAccountErrorPages();
		for (const page of Object.values(pages)) {
			expect(page).toBeDefined();
			expect(typeof page).toBe("object");
		}
	});
});

// ── Accessibility: Error Pages ───────────────────────────────────────────────

describe("error page accessibility", () => {
	it("error descriptors have title and message for screen readers", () => {
		const error: ApiError = { kind: "forbidden", status: 403, message: "No", retryable: false };
		const state = resolveAccountErrorState(error);
		expect(state.title).toBeTruthy();
		expect(state.message).toBeTruthy();
	});

	it("all error categories produce non-empty descriptors", () => {
		const kinds: ApiErrorKind[] = [
			"unauthorized",
			"forbidden",
			"not-found",
			"network",
			"timeout",
			"server-error",
			"rate-limited",
			"validation",
			"unknown"
		];
		for (const kind of kinds) {
			const error: ApiError = { kind, status: 0, message: "test", retryable: false };
			const state = resolveAccountErrorState(error);
			expect(state.title.length).toBeGreaterThan(0);
			expect(state.message.length).toBeGreaterThan(0);
		}
	});
});
