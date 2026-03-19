// E5-S2-T2: Brand asset upload + theme configuration — logo, favicon, and semantic color overrides.
// Uploads are tenant-scoped; one tenant's brand must not appear for another.

import type { SemanticColors } from "@platform/ui";

// ── Media Asset Types ────────────────────────────────────────────────────────

export const brandAssetTypes = ["logo", "favicon"] as const;

export type BrandAssetType = (typeof brandAssetTypes)[number];

export type BrandAssetConstraints = {
	maxSizeBytes: number;
	allowedMimeTypes: readonly string[];
};

const brandAssetConstraintsByType: Record<BrandAssetType, BrandAssetConstraints> = {
	logo: {
		maxSizeBytes: 2 * 1024 * 1024, // 2 MB
		allowedMimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
	},
	favicon: {
		maxSizeBytes: 512 * 1024, // 512 KB
		allowedMimeTypes: ["image/png", "image/x-icon", "image/svg+xml"]
	}
};

export function getBrandAssetConstraints(
	assetType: BrandAssetType
): BrandAssetConstraints {
	return brandAssetConstraintsByType[assetType];
}

// ── Upload Validation ────────────────────────────────────────────────────────

export type BrandAssetValidationResult =
	| { valid: true }
	| { valid: false; reason: "file-too-large"; maxSizeBytes: number }
	| { valid: false; reason: "invalid-mime-type"; allowedMimeTypes: readonly string[] };

export function validateBrandAssetUpload(
	assetType: BrandAssetType,
	fileSize: number,
	mimeType: string
): BrandAssetValidationResult {
	const constraints = brandAssetConstraintsByType[assetType];

	if (fileSize > constraints.maxSizeBytes) {
		return {
			valid: false,
			reason: "file-too-large",
			maxSizeBytes: constraints.maxSizeBytes
		};
	}

	if (!constraints.allowedMimeTypes.includes(mimeType)) {
		return {
			valid: false,
			reason: "invalid-mime-type",
			allowedMimeTypes: constraints.allowedMimeTypes
		};
	}

	return { valid: true };
}

// ── Brand Asset Reference ────────────────────────────────────────────────────

export type BrandAssetReference = {
	assetType: BrandAssetType;
	url: string;
	mimeType: string;
	sizeBytes: number;
	uploadedAt: string;
};

// ── Theme Configuration ──────────────────────────────────────────────────────

/**
 * Allowable semantic color keys for tenant branding overrides.
 * Only brand-related colors can be customized by tenants.
 */
export const tenantBrandableColorKeys = [
	"brandPrimary",
	"brandPrimaryHover"
] as const;

export type TenantBrandableColorKey = (typeof tenantBrandableColorKeys)[number];

/**
 * Tenant theme configuration — only brand-related color overrides.
 */
export type TenantThemeConfig = {
	colorOverrides: Partial<Pick<SemanticColors, TenantBrandableColorKey>>;
};

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type ThemeValidationError = {
	field: string;
	message: string;
};

/**
 * Validates theme configuration color overrides.
 */
export function validateThemeConfig(
	config: TenantThemeConfig
): ThemeValidationError[] {
	const errors: ThemeValidationError[] = [];

	for (const [key, value] of Object.entries(config.colorOverrides)) {
		if (value && !HEX_COLOR_PATTERN.test(value)) {
			errors.push({
				field: key,
				message: `${key} must be a valid hex color (e.g. #FF5500 or #F50).`
			});
		}
	}

	return errors;
}

/**
 * Builds a Partial<SemanticColors> from validated theme config,
 * suitable for passing to resolveDesignTokens().
 */
export function buildSemanticColorOverrides(
	config: TenantThemeConfig
): Partial<SemanticColors> {
	const overrides: Partial<SemanticColors> = {};

	for (const key of tenantBrandableColorKeys) {
		const value = config.colorOverrides[key];

		if (value) {
			overrides[key] = value;
		}
	}

	return overrides;
}

// ── Brand Configuration ──────────────────────────────────────────────────────

export type TenantBrandConfig = {
	logoAsset: BrandAssetReference | null;
	faviconAsset: BrandAssetReference | null;
	themeConfig: TenantThemeConfig;
};

export function createEmptyBrandConfig(): TenantBrandConfig {
	return {
		logoAsset: null,
		faviconAsset: null,
		themeConfig: {
			colorOverrides: {}
		}
	};
}
