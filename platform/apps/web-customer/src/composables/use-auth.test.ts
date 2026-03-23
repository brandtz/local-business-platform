import { describe, expect, it, vi } from "vitest";

import {
	createInitialAuthState,
	evaluatePasswordStrength,
} from "./use-auth";

import {
	evaluatePasswordStrength as evaluatePasswordStrengthFromPages,
} from "../pages/login-page";

describe("createInitialAuthState", () => {
	it("returns unauthenticated state by default", () => {
		const state = createInitialAuthState();
		expect(state.isAuthenticated).toBe(false);
		expect(state.user).toBeNull();
		expect(state.isLoading).toBe(false);
		expect(state.error).toBeNull();
	});
});

describe("evaluatePasswordStrength (from login-page)", () => {
	it("returns weak for short passwords", () => {
		expect(evaluatePasswordStrengthFromPages("abc")).toBe("weak");
		expect(evaluatePasswordStrengthFromPages("12345")).toBe("weak");
	});

	it("returns weak for simple 8-character passwords with no variety", () => {
		expect(evaluatePasswordStrengthFromPages("abcdefgh")).toBe("weak");
	});

	it("returns fair for passwords with length and one character type", () => {
		expect(evaluatePasswordStrengthFromPages("Abcdefgh")).toBe("fair");
	});

	it("returns strong for passwords meeting all criteria", () => {
		expect(evaluatePasswordStrengthFromPages("Abcdefgh12!@")).toBe("strong");
	});
});
