import { describe, expect, it } from "vitest";

import {
	buildStorefrontPresentationPayload,
	hasCustomBranding,
	type StoredBrandConfig,
	type StoredTenantProfile
} from "./storefront-presentation";

// ── Test Fixtures ────────────────────────────────────────────────────────────

function createTestProfile(): StoredTenantProfile {
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
		websiteUrl: "https://alphafitness.com"
	};
}

function createTestBrand(): StoredBrandConfig {
	return {
		logoUrl: "https://cdn.example.com/alpha-logo.png",
		faviconUrl: "https://cdn.example.com/alpha-favicon.png",
		colorOverrides: {
			brandPrimary: "#FF5500"
		}
	};
}

// ── Payload Generation ───────────────────────────────────────────────────────

describe("buildStorefrontPresentationPayload", () => {
	it("generates a complete payload from profile and brand", () => {
		const payload = buildStorefrontPresentationPayload(
			"tenant-1",
			createTestProfile(),
			createTestBrand()
		);

		expect(payload.tenantId).toBe("tenant-1");
		expect(payload.profile.businessName).toBe("Alpha Fitness");
		expect(payload.profile.contactEmail).toBe("info@alphafitness.com");
		expect(payload.brand.logoUrl).toBe(
			"https://cdn.example.com/alpha-logo.png"
		);
		expect(payload.brand.colorOverrides.brandPrimary).toBe("#FF5500");
	});

	it("includes address when address fields are populated", () => {
		const payload = buildStorefrontPresentationPayload(
			"tenant-1",
			createTestProfile(),
			null
		);

		expect(payload.profile.address).not.toBeNull();
		expect(payload.profile.address?.line1).toBe("123 Main St");
		expect(payload.profile.address?.city).toBe("Springfield");
	});

	it("returns null address when address fields are empty", () => {
		const profile = createTestProfile();
		profile.addressLine1 = "";
		profile.city = "";
		profile.country = "";

		const payload = buildStorefrontPresentationPayload(
			"tenant-1",
			profile,
			null
		);

		expect(payload.profile.address).toBeNull();
	});

	it("returns default values for null profile", () => {
		const payload = buildStorefrontPresentationPayload(
			"tenant-1",
			null,
			null
		);

		expect(payload.profile.businessName).toBe("");
		expect(payload.profile.address).toBeNull();
	});

	it("returns default values for null brand", () => {
		const payload = buildStorefrontPresentationPayload(
			"tenant-1",
			createTestProfile(),
			null
		);

		expect(payload.brand.logoUrl).toBeNull();
		expect(payload.brand.faviconUrl).toBeNull();
		expect(payload.brand.colorOverrides).toEqual({});
	});

	it("theme override propagation — saved SemanticColors appear in payload", () => {
		const brand: StoredBrandConfig = {
			logoUrl: null,
			faviconUrl: null,
			colorOverrides: {
				brandPrimary: "#112233",
				brandPrimaryHover: "#445566"
			}
		};

		const payload = buildStorefrontPresentationPayload(
			"tenant-1",
			null,
			brand
		);

		expect(payload.brand.colorOverrides.brandPrimary).toBe("#112233");
		expect(payload.brand.colorOverrides.brandPrimaryHover).toBe("#445566");
	});

	it("media reference — logo and favicon URLs are included", () => {
		const brand: StoredBrandConfig = {
			logoUrl: "https://cdn.example.com/logo.png",
			faviconUrl: "https://cdn.example.com/favicon.ico",
			colorOverrides: {}
		};

		const payload = buildStorefrontPresentationPayload(
			"tenant-1",
			null,
			brand
		);

		expect(payload.brand.logoUrl).toBe(
			"https://cdn.example.com/logo.png"
		);
		expect(payload.brand.faviconUrl).toBe(
			"https://cdn.example.com/favicon.ico"
		);
	});
});

// ── hasCustomBranding ────────────────────────────────────────────────────────

describe("hasCustomBranding", () => {
	it("returns true when logo is set", () => {
		const payload = buildStorefrontPresentationPayload(
			"t1",
			null,
			{ logoUrl: "https://cdn/logo.png", faviconUrl: null, colorOverrides: {} }
		);

		expect(hasCustomBranding(payload)).toBe(true);
	});

	it("returns true when color overrides exist", () => {
		const payload = buildStorefrontPresentationPayload(
			"t1",
			null,
			{ logoUrl: null, faviconUrl: null, colorOverrides: { brandPrimary: "#000" } }
		);

		expect(hasCustomBranding(payload)).toBe(true);
	});

	it("returns false for default brand", () => {
		const payload = buildStorefrontPresentationPayload("t1", null, null);

		expect(hasCustomBranding(payload)).toBe(false);
	});
});
