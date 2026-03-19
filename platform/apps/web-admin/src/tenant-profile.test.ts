import { describe, expect, it } from "vitest";

import {
	createEmptyTenantProfile,
	createInitialProfileFormState,
	validateProfileFormState,
	validateTenantProfile,
	type TenantProfileData
} from "./tenant-profile";

// ── Test Fixtures ────────────────────────────────────────────────────────────

function createValidProfile(): TenantProfileData {
	return {
		businessName: "Alpha Fitness",
		businessDescription: "A local gym and fitness center.",
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
			instagram: "https://instagram.com/alphafitness",
			twitter: "",
			linkedIn: "",
			yelp: ""
		}
	};
}

// ── validateTenantProfile ────────────────────────────────────────────────────

describe("validateTenantProfile", () => {
	it("returns no errors for a valid profile", () => {
		const errors = validateTenantProfile(createValidProfile());

		expect(errors).toEqual([]);
	});

	it("requires business name", () => {
		const profile = createValidProfile();
		profile.businessName = "";
		const errors = validateTenantProfile(profile);

		expect(errors).toContainEqual(
			expect.objectContaining({ field: "businessName" })
		);
	});

	it("requires contact email", () => {
		const profile = createValidProfile();
		profile.contactEmail = "";
		const errors = validateTenantProfile(profile);

		expect(errors).toContainEqual(
			expect.objectContaining({ field: "contactEmail" })
		);
	});

	it("validates email format", () => {
		const profile = createValidProfile();
		profile.contactEmail = "not-an-email";
		const errors = validateTenantProfile(profile);

		expect(errors).toContainEqual(
			expect.objectContaining({
				field: "contactEmail",
				message: expect.stringContaining("format")
			})
		);
	});

	it("validates phone format when provided", () => {
		const profile = createValidProfile();
		profile.contactPhone = "abc";
		const errors = validateTenantProfile(profile);

		expect(errors).toContainEqual(
			expect.objectContaining({ field: "contactPhone" })
		);
	});

	it("allows empty phone", () => {
		const profile = createValidProfile();
		profile.contactPhone = "";
		const errors = validateTenantProfile(profile);
		const phoneError = errors.find((e) => e.field === "contactPhone");

		expect(phoneError).toBeUndefined();
	});

	it("validates website URL format when provided", () => {
		const profile = createValidProfile();
		profile.websiteUrl = "not-a-url";
		const errors = validateTenantProfile(profile);

		expect(errors).toContainEqual(
			expect.objectContaining({ field: "websiteUrl" })
		);
	});

	it("allows empty website URL", () => {
		const profile = createValidProfile();
		profile.websiteUrl = "";
		const errors = validateTenantProfile(profile);
		const urlError = errors.find((e) => e.field === "websiteUrl");

		expect(urlError).toBeUndefined();
	});

	it("enforces max length on business name", () => {
		const profile = createValidProfile();
		profile.businessName = "x".repeat(201);
		const errors = validateTenantProfile(profile);

		expect(errors).toContainEqual(
			expect.objectContaining({ field: "businessName" })
		);
	});

	it("enforces max length on business description", () => {
		const profile = createValidProfile();
		profile.businessDescription = "x".repeat(2001);
		const errors = validateTenantProfile(profile);

		expect(errors).toContainEqual(
			expect.objectContaining({ field: "businessDescription" })
		);
	});

	it("validates social link URL format", () => {
		const profile = createValidProfile();
		profile.socialLinks.facebook = "not-a-url";
		const errors = validateTenantProfile(profile);

		expect(errors).toContainEqual(
			expect.objectContaining({ field: "socialLinks.facebook" })
		);
	});

	it("enforces max length on social links", () => {
		const profile = createValidProfile();
		profile.socialLinks.instagram = "https://" + "x".repeat(500);
		const errors = validateTenantProfile(profile);

		expect(errors).toContainEqual(
			expect.objectContaining({ field: "socialLinks.instagram" })
		);
	});

	it("allows empty social links", () => {
		const profile = createValidProfile();
		profile.socialLinks = {
			facebook: "",
			instagram: "",
			twitter: "",
			linkedIn: "",
			yelp: ""
		};
		const errors = validateTenantProfile(profile);
		const socialErrors = errors.filter((e) =>
			(e.field as string).startsWith("socialLinks.")
		);

		expect(socialErrors).toEqual([]);
	});
});

// ── createEmptyTenantProfile ─────────────────────────────────────────────────

describe("createEmptyTenantProfile", () => {
	it("returns a profile with all empty strings", () => {
		const profile = createEmptyTenantProfile();

		expect(profile.businessName).toBe("");
		expect(profile.contactEmail).toBe("");
		expect(profile.socialLinks.facebook).toBe("");
	});
});

// ── Profile Form State ───────────────────────────────────────────────────────

describe("profileFormState", () => {
	it("creates initial state with idle status", () => {
		const state = createInitialProfileFormState();

		expect(state.status).toBe("idle");
		expect(state.validationErrors).toEqual([]);
		expect(state.apiError).toBeNull();
	});

	it("creates initial state with provided data", () => {
		const profile = createValidProfile();
		const state = createInitialProfileFormState(profile);

		expect(state.data.businessName).toBe("Alpha Fitness");
	});

	it("validateProfileFormState returns errors for invalid data", () => {
		const state = createInitialProfileFormState();
		const validated = validateProfileFormState(state);

		expect(validated.validationErrors.length).toBeGreaterThan(0);
		expect(validated.status).toBe("error");
	});

	it("validateProfileFormState returns no errors for valid data", () => {
		const state = createInitialProfileFormState(createValidProfile());
		const validated = validateProfileFormState(state);

		expect(validated.validationErrors).toEqual([]);
	});

	it("validateProfileFormState clears apiError", () => {
		const state: ReturnType<typeof createInitialProfileFormState> = {
			...createInitialProfileFormState(createValidProfile()),
			apiError: "Previous error"
		};

		const validated = validateProfileFormState(state);

		expect(validated.apiError).toBeNull();
	});
});
