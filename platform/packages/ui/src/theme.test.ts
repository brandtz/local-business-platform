import { describe, expect, it } from "vitest";

import { defaultSemanticColors } from "./tokens";
import {
	createDefaultThemeContext,
	resolveTenantThemeContext,
	validateThemeOverride,
	type TenantThemeOverride
} from "./theme";

describe("theme override mechanism", () => {
	describe("validateThemeOverride", () => {
		it("accepts a valid override with hex color overrides", () => {
			const result = validateThemeOverride({
				colorOverrides: {
					brandPrimary: "#ff6600",
					brandPrimaryHover: "#cc5200"
				},
				tenantId: "tenant-1"
			});

			expect(result).toEqual({ valid: true });
		});

		it("accepts a valid override with no color overrides", () => {
			const result = validateThemeOverride({ tenantId: "tenant-1" });

			expect(result).toEqual({ valid: true });
		});

		it("accepts short hex colors (#rgb)", () => {
			const result = validateThemeOverride({
				colorOverrides: { brandPrimary: "#f60" },
				tenantId: "tenant-1"
			});

			expect(result).toEqual({ valid: true });
		});

		it("rejects missing tenantId", () => {
			const result = validateThemeOverride({
				tenantId: ""
			});

			expect(result.valid).toBe(false);

			if (!result.valid) {
				expect(result.reasons).toContain("tenantId is required");
			}
		});

		it("rejects invalid hex color values", () => {
			const result = validateThemeOverride({
				colorOverrides: { brandPrimary: "not-a-color" },
				tenantId: "tenant-1"
			});

			expect(result.valid).toBe(false);

			if (!result.valid) {
				expect(result.reasons[0]).toContain("Invalid color value for brandPrimary");
			}
		});

		it("rejects unknown color keys", () => {
			const override = {
				colorOverrides: { unknownKey: "#ff6600" } as Record<string, string>,
				tenantId: "tenant-1"
			} as TenantThemeOverride;
			const result = validateThemeOverride(override);

			expect(result.valid).toBe(false);

			if (!result.valid) {
				expect(result.reasons[0]).toContain("Unknown color key: unknownKey");
			}
		});

		it("rejects empty customFontFamily", () => {
			const result = validateThemeOverride({
				customFontFamily: "  ",
				tenantId: "tenant-1"
			});

			expect(result.valid).toBe(false);

			if (!result.valid) {
				expect(result.reasons[0]).toContain("customFontFamily");
			}
		});

		it("rejects empty logoUrl", () => {
			const result = validateThemeOverride({
				logoUrl: "",
				tenantId: "tenant-1"
			});

			expect(result.valid).toBe(false);

			if (!result.valid) {
				expect(result.reasons[0]).toContain("logoUrl");
			}
		});

		it("accepts null customFontFamily and logoUrl", () => {
			const result = validateThemeOverride({
				customFontFamily: null,
				logoUrl: null,
				tenantId: "tenant-1"
			});

			expect(result).toEqual({ valid: true });
		});

		it("collects multiple validation errors", () => {
			const override = {
				colorOverrides: { unknownKey: "bad" } as Record<string, string>,
				tenantId: ""
			} as TenantThemeOverride;
			const result = validateThemeOverride(override);

			expect(result.valid).toBe(false);

			if (!result.valid) {
				expect(result.reasons.length).toBeGreaterThanOrEqual(2);
			}
		});
	});

	describe("createDefaultThemeContext", () => {
		it("returns default theme context with platform defaults", () => {
			const context = createDefaultThemeContext();

			expect(context.isDefault).toBe(true);
			expect(context.tenantId).toBeNull();
			expect(context.overrideSource).toBe("platform-defaults");
			expect(context.resolvedTokens.colors).toEqual(defaultSemanticColors);
		});
	});

	describe("resolveTenantThemeContext", () => {
		it("resolves theme with color overrides applied", () => {
			const context = resolveTenantThemeContext({
				colorOverrides: { brandPrimary: "#ff6600" },
				tenantId: "tenant-1"
			});

			expect(context.isDefault).toBe(false);
			expect(context.tenantId).toBe("tenant-1");
			expect(context.overrideSource).toBe("tenant:tenant-1");
			expect(context.resolvedTokens.colors.brandPrimary).toBe("#ff6600");
			expect(context.resolvedTokens.colors.textPrimary).toBe(defaultSemanticColors.textPrimary);
		});

		it("marks as default when no overrides are provided", () => {
			const context = resolveTenantThemeContext({
				tenantId: "tenant-2"
			});

			expect(context.isDefault).toBe(true);
			expect(context.resolvedTokens.colors).toEqual(defaultSemanticColors);
		});

		it("marks as non-default when customFontFamily is provided", () => {
			const context = resolveTenantThemeContext({
				customFontFamily: "Roboto, sans-serif",
				tenantId: "tenant-3"
			});

			expect(context.isDefault).toBe(false);
		});

		it("preserves all non-color tokens", () => {
			const context = resolveTenantThemeContext({
				colorOverrides: { brandPrimary: "#123456" },
				tenantId: "tenant-4"
			});

			expect(context.resolvedTokens.fontFamilies).toBeDefined();
			expect(context.resolvedTokens.spacing).toBeDefined();
			expect(context.resolvedTokens.elevations).toBeDefined();
		});
	});
});
