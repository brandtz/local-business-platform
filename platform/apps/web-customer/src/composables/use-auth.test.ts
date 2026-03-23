import { describe, expect, it } from "vitest";

import {
	createInitialAuthState,
} from "./use-auth";

import {
	evaluatePasswordStrength,
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
		expect(evaluatePasswordStrength("abc")).toBe("weak");
		expect(evaluatePasswordStrength("12345")).toBe("weak");
	});

	it("returns weak for simple 8-character passwords with no variety", () => {
		expect(evaluatePasswordStrength("abcdefgh")).toBe("weak");
	});

	it("returns fair for passwords with length and one character type", () => {
		expect(evaluatePasswordStrength("Abcdefgh")).toBe("fair");
	});

	it("returns strong for passwords meeting all criteria", () => {
		expect(evaluatePasswordStrength("Abcdefgh12!@")).toBe("strong");
	});
});
