import {
	defaultSemanticColors,
	resolveDesignTokens,
	type DesignTokens,
	type SemanticColors
} from "./tokens";

// ── Tenant Theme Override Types ──────────────────────────────────────────────

export type TenantThemeOverride = {
	colorOverrides?: Partial<SemanticColors>;
	customFontFamily?: string | null;
	logoUrl?: string | null;
	tenantId: string;
};

export type TenantThemeContext = {
	isDefault: boolean;
	overrideSource: string;
	resolvedTokens: DesignTokens;
	tenantId: string | null;
};

// ── Validation ───────────────────────────────────────────────────────────────

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const validSemanticColorKeys = new Set<string>(
	Object.keys(defaultSemanticColors)
);

export type ThemeOverrideValidationResult =
	| { valid: true }
	| { valid: false; reasons: string[] };

export function validateThemeOverride(
	override: TenantThemeOverride
): ThemeOverrideValidationResult {
	const reasons: string[] = [];

	if (!override.tenantId || override.tenantId.trim().length === 0) {
		reasons.push("tenantId is required");
	}

	if (override.colorOverrides) {
		for (const [key, value] of Object.entries(override.colorOverrides)) {
			if (!validSemanticColorKeys.has(key)) {
				reasons.push(`Unknown color key: ${key}`);
				continue;
			}

			if (typeof value !== "string" || !HEX_COLOR_PATTERN.test(value)) {
				reasons.push(`Invalid color value for ${key}: must be a hex color (#rgb or #rrggbb)`);
			}
		}
	}

	if (override.customFontFamily !== undefined && override.customFontFamily !== null) {
		if (typeof override.customFontFamily !== "string" || override.customFontFamily.trim().length === 0) {
			reasons.push("customFontFamily must be a non-empty string when provided");
		}
	}

	if (override.logoUrl !== undefined && override.logoUrl !== null) {
		if (typeof override.logoUrl !== "string" || override.logoUrl.trim().length === 0) {
			reasons.push("logoUrl must be a non-empty string when provided");
		}
	}

	if (reasons.length > 0) {
		return { valid: false, reasons };
	}

	return { valid: true };
}

// ── Theme Context Resolution ─────────────────────────────────────────────────

export function createDefaultThemeContext(): TenantThemeContext {
	return {
		isDefault: true,
		overrideSource: "platform-defaults",
		resolvedTokens: resolveDesignTokens(),
		tenantId: null
	};
}

export function resolveTenantThemeContext(
	override: TenantThemeOverride
): TenantThemeContext {
	const resolvedTokens = resolveDesignTokens(override.colorOverrides);

	return {
		isDefault: !override.colorOverrides && !override.customFontFamily,
		overrideSource: `tenant:${override.tenantId}`,
		resolvedTokens,
		tenantId: override.tenantId
	};
}
