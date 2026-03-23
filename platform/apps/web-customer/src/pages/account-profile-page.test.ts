import { describe, it, expect } from "vitest";
import {
	validatePasswordStrength,
	validatePasswordMatch,
} from "./account-profile-page";

describe("account-profile-page helpers", () => {
	describe("validatePasswordStrength", () => {
		it("returns Weak for empty password", () => {
			const result = validatePasswordStrength("");
			expect(result.score).toBe(0);
			expect(result.label).toBe("Weak");
		});

		it("returns Weak for short password", () => {
			const result = validatePasswordStrength("abc");
			expect(result.score).toBe(0);
			expect(result.label).toBe("Weak");
		});

		it("returns Fair for password with 8+ chars only", () => {
			const result = validatePasswordStrength("abcdefgh");
			expect(result.score).toBe(1);
			expect(result.label).toBe("Fair");
		});

		it("returns Good for password with length and mixed case", () => {
			const result = validatePasswordStrength("Abcdefgh");
			expect(result.score).toBe(2);
			expect(result.label).toBe("Good");
		});

		it("returns Strong for password with length, mixed case, and digits", () => {
			const result = validatePasswordStrength("Abcdefgh1");
			expect(result.score).toBe(3);
			expect(result.label).toBe("Strong");
		});

		it("returns Very Strong for password with all criteria", () => {
			const result = validatePasswordStrength("Abcdefgh1!");
			expect(result.score).toBe(4);
			expect(result.label).toBe("Very Strong");
		});

		it("returns Very Strong for 12+ char password with all criteria", () => {
			const result = validatePasswordStrength("Abcdefghijkl1!");
			expect(result.score).toBe(4);
			expect(result.label).toBe("Very Strong");
		});

		it("caps score at 4 even with all criteria met", () => {
			const result = validatePasswordStrength("AbCdEfGhIjKl123!@#");
			expect(result.score).toBeLessThanOrEqual(4);
		});
	});

	describe("validatePasswordMatch", () => {
		it("returns true when passwords match", () => {
			expect(validatePasswordMatch("password123", "password123")).toBe(true);
		});

		it("returns false when passwords differ", () => {
			expect(validatePasswordMatch("password123", "password456")).toBe(false);
		});

		it("returns false when password is empty", () => {
			expect(validatePasswordMatch("", "")).toBe(false);
		});

		it("returns false when password is empty but confirm has value", () => {
			expect(validatePasswordMatch("", "password123")).toBe(false);
		});
	});
});
