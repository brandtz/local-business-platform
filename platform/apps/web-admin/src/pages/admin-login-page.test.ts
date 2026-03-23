// Tests for admin login page validation logic

import { describe, expect, it } from "vitest";

describe("admin login validation", () => {
	function validateEmail(email: string): string | null {
		if (!email.trim()) return "Email is required";
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email address";
		return null;
	}

	function validatePassword(password: string): string | null {
		if (!password) return "Password is required";
		if (password.length < 6) return "Password must be at least 6 characters";
		return null;
	}

	it("rejects empty email", () => {
		expect(validateEmail("")).toBe("Email is required");
		expect(validateEmail("  ")).toBe("Email is required");
	});

	it("rejects invalid email format", () => {
		expect(validateEmail("notanemail")).toBe("Invalid email address");
		expect(validateEmail("missing@")).toBe("Invalid email address");
		expect(validateEmail("@domain.com")).toBe("Invalid email address");
	});

	it("accepts valid email", () => {
		expect(validateEmail("user@example.com")).toBeNull();
		expect(validateEmail("admin@business.co")).toBeNull();
	});

	it("rejects empty password", () => {
		expect(validatePassword("")).toBe("Password is required");
	});

	it("rejects short password", () => {
		expect(validatePassword("abc")).toBe("Password must be at least 6 characters");
		expect(validatePassword("12345")).toBe("Password must be at least 6 characters");
	});

	it("accepts valid password", () => {
		expect(validatePassword("123456")).toBeNull();
		expect(validatePassword("securepassword")).toBeNull();
	});
});
