// E4-S1-T1: Shared visual tokens for typography, spacing, color, elevation, and interaction states.

// ── Typography ────────────────────────────────────────────────────────────────

export const fontFamilies = {
	sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
	mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
} as const;

export type FontFamily = keyof typeof fontFamilies;

export const fontSizes = {
	xs: "0.75rem",
	sm: "0.875rem",
	base: "1rem",
	lg: "1.125rem",
	xl: "1.25rem",
	"2xl": "1.5rem",
	"3xl": "1.875rem",
	"4xl": "2.25rem"
} as const;

export type FontSize = keyof typeof fontSizes;

export const fontWeights = {
	normal: "400",
	medium: "500",
	semibold: "600",
	bold: "700"
} as const;

export type FontWeight = keyof typeof fontWeights;

export const lineHeights = {
	tight: "1.25",
	normal: "1.5",
	relaxed: "1.75"
} as const;

export type LineHeight = keyof typeof lineHeights;

// ── Spacing ───────────────────────────────────────────────────────────────────

export const spacingScale = {
	0: "0",
	1: "0.25rem",
	2: "0.5rem",
	3: "0.75rem",
	4: "1rem",
	5: "1.25rem",
	6: "1.5rem",
	8: "2rem",
	10: "2.5rem",
	12: "3rem",
	16: "4rem",
	20: "5rem"
} as const;

export type SpacingKey = keyof typeof spacingScale;

// ── Colors ────────────────────────────────────────────────────────────────────

export const colorPrimitives = {
	white: "#ffffff",
	black: "#000000",
	gray50: "#f9fafb",
	gray100: "#f3f4f6",
	gray200: "#e5e7eb",
	gray300: "#d1d5db",
	gray400: "#9ca3af",
	gray500: "#6b7280",
	gray600: "#4b5563",
	gray700: "#374151",
	gray800: "#1f2937",
	gray900: "#111827",
	blue50: "#eff6ff",
	blue500: "#3b82f6",
	blue600: "#2563eb",
	blue700: "#1d4ed8",
	green50: "#f0fdf4",
	green500: "#22c55e",
	green700: "#15803d",
	red50: "#fef2f2",
	red500: "#ef4444",
	red700: "#b91c1c",
	amber50: "#fffbeb",
	amber500: "#f59e0b",
	amber700: "#b45309"
} as const;

export type ColorPrimitive = keyof typeof colorPrimitives;

export type SemanticColors = {
	textPrimary: string;
	textSecondary: string;
	textMuted: string;
	textInverse: string;
	bgPrimary: string;
	bgSecondary: string;
	bgMuted: string;
	borderDefault: string;
	borderFocus: string;
	brandPrimary: string;
	brandPrimaryHover: string;
	successBg: string;
	successText: string;
	errorBg: string;
	errorText: string;
	warningBg: string;
	warningText: string;
	infoBg: string;
	infoText: string;
};

export const defaultSemanticColors: SemanticColors = {
	textPrimary: colorPrimitives.gray900,
	textSecondary: colorPrimitives.gray600,
	textMuted: colorPrimitives.gray400,
	textInverse: colorPrimitives.white,
	bgPrimary: colorPrimitives.white,
	bgSecondary: colorPrimitives.gray50,
	bgMuted: colorPrimitives.gray100,
	borderDefault: colorPrimitives.gray200,
	borderFocus: colorPrimitives.blue500,
	brandPrimary: colorPrimitives.blue600,
	brandPrimaryHover: colorPrimitives.blue700,
	successBg: colorPrimitives.green50,
	successText: colorPrimitives.green700,
	errorBg: colorPrimitives.red50,
	errorText: colorPrimitives.red700,
	warningBg: colorPrimitives.amber50,
	warningText: colorPrimitives.amber700,
	infoBg: colorPrimitives.blue50,
	infoText: colorPrimitives.blue700
};

// ── Elevation ─────────────────────────────────────────────────────────────────

export const elevations = {
	none: "none",
	sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
	md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
	lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
	xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
} as const;

export type Elevation = keyof typeof elevations;

// ── Borders ───────────────────────────────────────────────────────────────────

export const borderRadii = {
	none: "0",
	sm: "0.125rem",
	base: "0.25rem",
	md: "0.375rem",
	lg: "0.5rem",
	xl: "0.75rem",
	full: "9999px"
} as const;

export type BorderRadius = keyof typeof borderRadii;

// ── Interaction States ────────────────────────────────────────────────────────

export const focusRing = {
	width: "2px",
	style: "solid",
	offset: "2px",
	color: colorPrimitives.blue500
} as const;

export const transitions = {
	fast: "150ms ease-in-out",
	normal: "200ms ease-in-out",
	slow: "300ms ease-in-out"
} as const;

export type TransitionSpeed = keyof typeof transitions;

export const interactionStates = {
	hoverOpacity: "0.85",
	disabledOpacity: "0.5",
	activeScale: "0.98"
} as const;

// ── Consolidated Token Map ────────────────────────────────────────────────────

export type DesignTokens = {
	fontFamilies: typeof fontFamilies;
	fontSizes: typeof fontSizes;
	fontWeights: typeof fontWeights;
	lineHeights: typeof lineHeights;
	spacing: typeof spacingScale;
	colors: SemanticColors;
	colorPrimitives: typeof colorPrimitives;
	elevations: typeof elevations;
	borderRadii: typeof borderRadii;
	focusRing: typeof focusRing;
	transitions: typeof transitions;
	interactionStates: typeof interactionStates;
};

export const defaultDesignTokens: DesignTokens = {
	fontFamilies,
	fontSizes,
	fontWeights,
	lineHeights,
	spacing: spacingScale,
	colors: defaultSemanticColors,
	colorPrimitives,
	elevations,
	borderRadii,
	focusRing,
	transitions,
	interactionStates
};

/**
 * Resolve a complete token set from optional overrides.
 * Tenant-level branding overrides only the semantic color layer,
 * leaving primitives, spacing, and typography unchanged.
 */
export function resolveDesignTokens(
	colorOverrides?: Partial<SemanticColors>
): DesignTokens {
	if (!colorOverrides) {
		return defaultDesignTokens;
	}

	return {
		...defaultDesignTokens,
		colors: {
			...defaultSemanticColors,
			...colorOverrides
		}
	};
}
