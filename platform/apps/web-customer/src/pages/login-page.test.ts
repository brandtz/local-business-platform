import { describe, expect, it } from "vitest";

import { evaluatePasswordStrength, type PasswordStrength } from "./login-page";

describe("evaluatePasswordStrength", () => {
	it("returns weak for very short passwords", () => {
		expect(evaluatePasswordStrength("")).toBe("weak");
		expect(evaluatePasswordStrength("ab")).toBe("weak");
		expect(evaluatePasswordStrength("12345")).toBe("weak");
	});

	it("returns weak for medium-length simple passwords", () => {
		expect(evaluatePasswordStrength("abcdef")).toBe("weak");
		expect(evaluatePasswordStrength("abcdefgh")).toBe("weak");
	});

	it("returns fair for passwords with length plus one character type", () => {
		expect(evaluatePasswordStrength("Abcdefgh")).toBe("fair");
	});

	it("returns good for passwords with length and multiple character types", () => {
		expect(evaluatePasswordStrength("Abcdefgh1")).toBe("good");
	});

	it("returns strong for passwords with all character types and length", () => {
		expect(evaluatePasswordStrength("MyP@ssw0rd!")).toBe("strong");
	});

	it("increases strength with longer passwords", () => {
		const short = evaluatePasswordStrength("Abc1");
		const long = evaluatePasswordStrength("Abcdefghijklm1!");

		const strengthOrder: PasswordStrength[] = ["weak", "fair", "good", "strong"];
		expect(strengthOrder.indexOf(long)).toBeGreaterThanOrEqual(strengthOrder.indexOf(short));
	});
});
