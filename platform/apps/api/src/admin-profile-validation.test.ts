import { describe, expect, it } from "vitest";

import {
	validateProfileUpdatePayload,
	validateThemeUpdatePayload
} from "./admin-profile-validation";

// ── Valid Profile Fixture ────────────────────────────────────────────────────

function validProfilePayload(): Record<string, unknown> {
	return {
		businessName: "Alpha Fitness",
		businessDescription: "A local gym.",
		contactEmail: "info@alphafitness.com",
		contactPhone: "+1-555-123-4567",
		addressLine1: "123 Main St",
		addressLine2: "Suite 100",
		city: "Springfield",
		stateOrProvince: "IL",
		postalCode: "62701",
		country: "US",
		websiteUrl: "https://alphafitness.com",
		socialLinks: {
			facebook: "https://facebook.com/alphafitness",
			instagram: "",
			twitter: "",
			linkedIn: "",
			yelp: ""
		}
	};
}

// ── Profile Field Validation ─────────────────────────────────────────────────

describe("validateProfileUpdatePayload", () => {
	it("accepts a valid profile", () => {
		const result = validateProfileUpdatePayload(validProfilePayload());

		expect(result).toEqual({ valid: true });
	});

	it("requires business name", () => {
		const payload = validProfilePayload();
		payload.businessName = "";
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({ field: "businessName", code: "required" })
			);
		}
	});

	it("requires contact email", () => {
		const payload = validProfilePayload();
		payload.contactEmail = "";
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({ field: "contactEmail", code: "required" })
			);
		}
	});

	it("validates email format", () => {
		const payload = validProfilePayload();
		payload.contactEmail = "not-an-email";
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({ field: "contactEmail", code: "format" })
			);
		}
	});

	it("validates phone format", () => {
		const payload = validProfilePayload();
		payload.contactPhone = "abc";
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({ field: "contactPhone", code: "format" })
			);
		}
	});

	it("validates URL format for website", () => {
		const payload = validProfilePayload();
		payload.websiteUrl = "not-a-url";
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({ field: "websiteUrl", code: "format" })
			);
		}
	});

	it("enforces max length on business name", () => {
		const payload = validProfilePayload();
		payload.businessName = "x".repeat(201);
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					field: "businessName",
					code: "max-length"
				})
			);
		}
	});

	it("rejects script injection in text fields", () => {
		const payload = validProfilePayload();
		payload.businessDescription = '<script>alert("xss")</script>';
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					field: "businessDescription",
					code: "injection"
				})
			);
		}
	});

	it("rejects event handler injection", () => {
		const payload = validProfilePayload();
		payload.businessName = 'Test onload=alert(1)';
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({ code: "injection" })
			);
		}
	});

	it("rejects javascript: protocol in URLs", () => {
		const payload = validProfilePayload();
		payload.websiteUrl = "javascript:alert(1)";
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);
	});

	it("validates social link URL format", () => {
		const payload = validProfilePayload();
		(payload.socialLinks as Record<string, string>).facebook = "not-a-url";
		const result = validateProfileUpdatePayload(payload);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					field: "socialLinks.facebook",
					code: "format"
				})
			);
		}
	});

	it("returns structured error shape", () => {
		const result = validateProfileUpdatePayload({});

		expect(result.valid).toBe(false);

		if (!result.valid) {
			for (const error of result.errors) {
				expect(typeof error.field).toBe("string");
				expect(typeof error.message).toBe("string");
				expect(typeof error.code).toBe("string");
			}
		}
	});
});

// ── Theme Validation ─────────────────────────────────────────────────────────

describe("validateThemeUpdatePayload", () => {
	it("accepts valid hex colors", () => {
		const result = validateThemeUpdatePayload({
			colorOverrides: {
				brandPrimary: "#FF5500",
				brandPrimaryHover: "#E64D00"
			}
		});

		expect(result).toEqual({ valid: true });
	});

	it("accepts empty overrides", () => {
		const result = validateThemeUpdatePayload({
			colorOverrides: {}
		});

		expect(result).toEqual({ valid: true });
	});

	it("accepts missing colorOverrides", () => {
		const result = validateThemeUpdatePayload({});

		expect(result).toEqual({ valid: true });
	});

	it("rejects invalid hex color", () => {
		const result = validateThemeUpdatePayload({
			colorOverrides: {
				brandPrimary: "red"
			}
		});

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({ field: "brandPrimary", code: "format" })
			);
		}
	});

	it("rejects unknown color keys", () => {
		const result = validateThemeUpdatePayload({
			colorOverrides: {
				textPrimary: "#000000"
			}
		});

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					field: "textPrimary",
					code: "invalid-value"
				})
			);
		}
	});
});
