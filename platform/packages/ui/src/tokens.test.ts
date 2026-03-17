import { describe, expect, it } from "vitest";

import {
	borderRadii,
	colorPrimitives,
	defaultDesignTokens,
	defaultSemanticColors,
	elevations,
	focusRing,
	fontFamilies,
	fontSizes,
	fontWeights,
	interactionStates,
	lineHeights,
	resolveDesignTokens,
	spacingScale,
	transitions
} from "./tokens";

describe("design tokens", () => {
	it("exposes a complete default token set", () => {
		expect(defaultDesignTokens).toMatchObject({
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
		});
	});

	it("provides every expected typography token key", () => {
		expect(Object.keys(fontSizes)).toEqual(
			expect.arrayContaining(["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"])
		);
		expect(Object.keys(fontWeights)).toEqual(
			expect.arrayContaining(["normal", "medium", "semibold", "bold"])
		);
		expect(Object.keys(lineHeights)).toEqual(
			expect.arrayContaining(["tight", "normal", "relaxed"])
		);
		expect(Object.keys(fontFamilies)).toEqual(
			expect.arrayContaining(["sans", "mono"])
		);
	});

	it("provides every expected spacing key", () => {
		expect(Object.keys(spacingScale).map(Number)).toEqual(
			expect.arrayContaining([0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20])
		);
	});

	it("provides semantic colors mapped to color primitives", () => {
		expect(defaultSemanticColors.textPrimary).toBe(colorPrimitives.gray900);
		expect(defaultSemanticColors.brandPrimary).toBe(colorPrimitives.blue600);
		expect(defaultSemanticColors.errorText).toBe(colorPrimitives.red700);
		expect(defaultSemanticColors.successText).toBe(colorPrimitives.green700);
	});

	it("provides elevation tokens from none through xl", () => {
		expect(elevations.none).toBe("none");
		expect(typeof elevations.sm).toBe("string");
		expect(typeof elevations.base).toBe("string");
		expect(typeof elevations.md).toBe("string");
		expect(typeof elevations.lg).toBe("string");
		expect(typeof elevations.xl).toBe("string");
	});

	it("provides border radius tokens", () => {
		expect(borderRadii.none).toBe("0");
		expect(borderRadii.full).toBe("9999px");
		expect(typeof borderRadii.base).toBe("string");
	});

	it("defines focus ring properties for accessibility", () => {
		expect(focusRing.width).toBe("2px");
		expect(focusRing.style).toBe("solid");
		expect(focusRing.offset).toBe("2px");
		expect(focusRing.color).toBe(colorPrimitives.blue500);
	});

	it("defines transition speed tokens", () => {
		expect(typeof transitions.fast).toBe("string");
		expect(typeof transitions.normal).toBe("string");
		expect(typeof transitions.slow).toBe("string");
	});

	it("defines interaction state tokens", () => {
		expect(interactionStates.hoverOpacity).toBe("0.85");
		expect(interactionStates.disabledOpacity).toBe("0.5");
		expect(interactionStates.activeScale).toBe("0.98");
	});
});

describe("resolveDesignTokens", () => {
	it("returns default tokens when no overrides are provided", () => {
		expect(resolveDesignTokens()).toBe(defaultDesignTokens);
	});

	it("returns default tokens when overrides is undefined", () => {
		expect(resolveDesignTokens(undefined)).toBe(defaultDesignTokens);
	});

	it("merges partial color overrides with defaults", () => {
		const customBrand = "#1a73e8";
		const result = resolveDesignTokens({ brandPrimary: customBrand });

		expect(result.colors.brandPrimary).toBe(customBrand);
		expect(result.colors.textPrimary).toBe(defaultSemanticColors.textPrimary);
		expect(result.colors.errorText).toBe(defaultSemanticColors.errorText);
	});

	it("preserves non-color tokens when overriding colors", () => {
		const result = resolveDesignTokens({ brandPrimary: "#000" });

		expect(result.fontFamilies).toBe(defaultDesignTokens.fontFamilies);
		expect(result.fontSizes).toBe(defaultDesignTokens.fontSizes);
		expect(result.spacing).toBe(defaultDesignTokens.spacing);
		expect(result.elevations).toBe(defaultDesignTokens.elevations);
		expect(result.borderRadii).toBe(defaultDesignTokens.borderRadii);
		expect(result.focusRing).toBe(defaultDesignTokens.focusRing);
		expect(result.transitions).toBe(defaultDesignTokens.transitions);
	});
});
