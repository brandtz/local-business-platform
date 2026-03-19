// E5-S2-T4: Storefront presentation payload — connects saved tenant profile and brand
// configuration to the customer app bootstrap payload.
// Security: only the requesting tenant's brand data is included.

import type { SemanticColors } from "@platform/ui";

// ── Storefront Presentation Payload ──────────────────────────────────────────

export type StorefrontBrandPayload = {
	logoUrl: string | null;
	faviconUrl: string | null;
	colorOverrides: Partial<SemanticColors>;
};

export type StorefrontProfilePayload = {
	businessName: string;
	businessDescription: string;
	contactEmail: string;
	contactPhone: string;
	websiteUrl: string;
	address: StorefrontAddressPayload | null;
};

export type StorefrontAddressPayload = {
	line1: string;
	line2: string;
	city: string;
	stateOrProvince: string;
	postalCode: string;
	country: string;
};

export type StorefrontPresentationPayload = {
	tenantId: string;
	profile: StorefrontProfilePayload;
	brand: StorefrontBrandPayload;
};

// ── Stored Configuration Types ───────────────────────────────────────────────

export type StoredTenantProfile = {
	businessName: string;
	businessDescription: string;
	contactEmail: string;
	contactPhone: string;
	addressLine1: string;
	addressLine2: string;
	city: string;
	stateOrProvince: string;
	postalCode: string;
	country: string;
	websiteUrl: string;
};

export type StoredBrandConfig = {
	logoUrl: string | null;
	faviconUrl: string | null;
	colorOverrides: Partial<SemanticColors>;
};

// ── Default Configuration ────────────────────────────────────────────────────

const DEFAULT_PROFILE: StoredTenantProfile = {
	businessName: "",
	businessDescription: "",
	contactEmail: "",
	contactPhone: "",
	addressLine1: "",
	addressLine2: "",
	city: "",
	stateOrProvince: "",
	postalCode: "",
	country: "",
	websiteUrl: ""
};

const DEFAULT_BRAND: StoredBrandConfig = {
	logoUrl: null,
	faviconUrl: null,
	colorOverrides: {}
};

// ── Payload Generation ───────────────────────────────────────────────────────

function buildAddressPayload(
	profile: StoredTenantProfile
): StorefrontAddressPayload | null {
	if (
		!profile.addressLine1.trim() &&
		!profile.city.trim() &&
		!profile.country.trim()
	) {
		return null;
	}

	return {
		line1: profile.addressLine1,
		line2: profile.addressLine2,
		city: profile.city,
		stateOrProvince: profile.stateOrProvince,
		postalCode: profile.postalCode,
		country: profile.country
	};
}

/**
 * Generates the storefront presentation payload from stored tenant configuration.
 * Tenants without custom branding receive default values.
 */
export function buildStorefrontPresentationPayload(
	tenantId: string,
	profile: StoredTenantProfile | null,
	brand: StoredBrandConfig | null
): StorefrontPresentationPayload {
	const resolvedProfile = profile ?? DEFAULT_PROFILE;
	const resolvedBrand = brand ?? DEFAULT_BRAND;

	return {
		tenantId,
		profile: {
			businessName: resolvedProfile.businessName,
			businessDescription: resolvedProfile.businessDescription,
			contactEmail: resolvedProfile.contactEmail,
			contactPhone: resolvedProfile.contactPhone,
			websiteUrl: resolvedProfile.websiteUrl,
			address: buildAddressPayload(resolvedProfile)
		},
		brand: {
			logoUrl: resolvedBrand.logoUrl,
			faviconUrl: resolvedBrand.faviconUrl,
			colorOverrides: { ...resolvedBrand.colorOverrides }
		}
	};
}

/**
 * Checks whether a presentation payload has any custom branding applied.
 */
export function hasCustomBranding(
	payload: StorefrontPresentationPayload
): boolean {
	return (
		payload.brand.logoUrl !== null ||
		payload.brand.faviconUrl !== null ||
		Object.keys(payload.brand.colorOverrides).length > 0
	);
}
