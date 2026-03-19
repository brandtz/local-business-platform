import { describe, expect, it } from "vitest";

import {
	brandAssetTypes,
	buildSemanticColorOverrides,
	createEmptyBrandConfig,
	getBrandAssetConstraints,
	tenantBrandableColorKeys,
	validateBrandAssetUpload,
	validateThemeConfig,
	type TenantThemeConfig
} from "./tenant-branding";

// ── Brand Asset Validation ───────────────────────────────────────────────────

describe("validateBrandAssetUpload", () => {
	it("accepts valid logo upload", () => {
		const result = validateBrandAssetUpload("logo", 500_000, "image/png");

		expect(result).toEqual({ valid: true });
	});

	it("accepts valid favicon upload", () => {
		const result = validateBrandAssetUpload("favicon", 100_000, "image/png");

		expect(result).toEqual({ valid: true });
	});

	it("rejects logo exceeding 2 MB", () => {
		const result = validateBrandAssetUpload(
			"logo",
			3 * 1024 * 1024,
			"image/png"
		);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.reason).toBe("file-too-large");
		}
	});

	it("rejects favicon exceeding 512 KB", () => {
		const result = validateBrandAssetUpload(
			"favicon",
			600 * 1024,
			"image/png"
		);

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.reason).toBe("file-too-large");
		}
	});

	it("rejects unsupported MIME type for logo", () => {
		const result = validateBrandAssetUpload("logo", 100_000, "image/gif");

		expect(result.valid).toBe(false);

		if (!result.valid) {
			expect(result.reason).toBe("invalid-mime-type");
		}
	});

	it("accepts SVG for both logo and favicon", () => {
		expect(
			validateBrandAssetUpload("logo", 50_000, "image/svg+xml").valid
		).toBe(true);

		expect(
			validateBrandAssetUpload("favicon", 50_000, "image/svg+xml").valid
		).toBe(true);
	});
});

// ── getBrandAssetConstraints ─────────────────────────────────────────────────

describe("getBrandAssetConstraints", () => {
	it("returns constraints for all asset types", () => {
		for (const assetType of brandAssetTypes) {
			const constraints = getBrandAssetConstraints(assetType);

			expect(constraints.maxSizeBytes).toBeGreaterThan(0);
			expect(constraints.allowedMimeTypes.length).toBeGreaterThan(0);
		}
	});
});

// ── Theme Validation ─────────────────────────────────────────────────────────

describe("validateThemeConfig", () => {
	it("accepts valid hex colors", () => {
		const config: TenantThemeConfig = {
			colorOverrides: {
				brandPrimary: "#FF5500",
				brandPrimaryHover: "#E64D00"
			}
		};

		expect(validateThemeConfig(config)).toEqual([]);
	});

	it("accepts short hex colors", () => {
		const config: TenantThemeConfig = {
			colorOverrides: {
				brandPrimary: "#F50"
			}
		};

		expect(validateThemeConfig(config)).toEqual([]);
	});

	it("accepts empty overrides", () => {
		const config: TenantThemeConfig = {
			colorOverrides: {}
		};

		expect(validateThemeConfig(config)).toEqual([]);
	});

	it("rejects invalid color format", () => {
		const config: TenantThemeConfig = {
			colorOverrides: {
				brandPrimary: "red"
			}
		};

		const errors = validateThemeConfig(config);

		expect(errors.length).toBe(1);
		expect(errors[0].field).toBe("brandPrimary");
	});

	it("rejects color without hash prefix", () => {
		const config: TenantThemeConfig = {
			colorOverrides: {
				brandPrimary: "FF5500"
			}
		};

		const errors = validateThemeConfig(config);

		expect(errors.length).toBe(1);
	});
});

// ── buildSemanticColorOverrides ──────────────────────────────────────────────

describe("buildSemanticColorOverrides", () => {
	it("produces valid SemanticColors partial from config", () => {
		const config: TenantThemeConfig = {
			colorOverrides: {
				brandPrimary: "#FF5500"
			}
		};

		const overrides = buildSemanticColorOverrides(config);

		expect(overrides.brandPrimary).toBe("#FF5500");
		expect(overrides.brandPrimaryHover).toBeUndefined();
	});

	it("returns empty object for empty overrides", () => {
		const overrides = buildSemanticColorOverrides({
			colorOverrides: {}
		});

		expect(Object.keys(overrides)).toEqual([]);
	});

	it("only includes brandable color keys", () => {
		const config: TenantThemeConfig = {
			colorOverrides: {
				brandPrimary: "#111111",
				brandPrimaryHover: "#222222"
			}
		};

		const overrides = buildSemanticColorOverrides(config);
		const keys = Object.keys(overrides);

		for (const key of keys) {
			expect(
				(tenantBrandableColorKeys as readonly string[]).includes(key)
			).toBe(true);
		}
	});
});

// ── createEmptyBrandConfig ───────────────────────────────────────────────────

describe("createEmptyBrandConfig", () => {
	it("returns null assets and empty theme", () => {
		const config = createEmptyBrandConfig();

		expect(config.logoAsset).toBeNull();
		expect(config.faviconAsset).toBeNull();
		expect(config.themeConfig.colorOverrides).toEqual({});
	});
});
