// E4-S3-T4: Template composition interfaces for onboarding and publish workflows.
// Provides stable typed descriptors that downstream workflows (E6-S5 vertical
// template defaults, E8 publish) use to preview, validate, and apply template
// configurations to storefront regions.
// Security: composition is tenant-scoped; preview descriptors must not reference
// other tenants' configurations.

import {
	getTemplateRegistryEntry,
	isValidTemplateKey,
	tenantVerticalTemplateKeys,
	type TenantVerticalTemplateKey
} from "@platform/types";

import {
	getStorefrontLayoutSchema,
	getStorefrontNavigationSchema,
	getVisibleRegions,
	storefrontRegions,
	type StorefrontLayoutSchema,
	type StorefrontNavigationSchema,
	type StorefrontRegion
} from "./storefront-layout";

// ── Composition Descriptor ───────────────────────────────────────────────────

export type TemplateCompositionDescriptor = {
	readonly templateKey: TenantVerticalTemplateKey;
	readonly layout: StorefrontLayoutSchema;
	readonly navigation: StorefrontNavigationSchema;
	readonly visibleRegions: readonly StorefrontRegion[];
};

/**
 * Composes a full template descriptor from a template key. Returns the
 * complete layout schema, navigation schema, and visible-region summary
 * for the given template.
 */
export function composeTemplate(
	templateKey: TenantVerticalTemplateKey
): TemplateCompositionDescriptor {
	const layout = getStorefrontLayoutSchema(templateKey);
	const navigation = getStorefrontNavigationSchema(templateKey);
	const visibleRegions = getVisibleRegions(layout);

	return { templateKey, layout, navigation, visibleRegions };
}

/**
 * Composes descriptors for all registered templates.
 */
export function composeAllTemplates(): readonly TemplateCompositionDescriptor[] {
	return tenantVerticalTemplateKeys.map(composeTemplate);
}

// ── Composition Validation ───────────────────────────────────────────────────

export type CompositionValidationResult =
	| { readonly valid: true }
	| { readonly valid: false; readonly reason: string };

/**
 * Validates that a composition descriptor is complete and internally consistent.
 * Used by publish workflows to gate go-live on valid template configuration.
 */
export function validateTemplateComposition(
	descriptor: TemplateCompositionDescriptor
): CompositionValidationResult {
	if (!isValidTemplateKey(descriptor.templateKey)) {
		return { valid: false, reason: `Unknown template key: ${descriptor.templateKey}` };
	}

	if (descriptor.layout.templateKey !== descriptor.templateKey) {
		return { valid: false, reason: "Layout templateKey does not match descriptor templateKey" };
	}

	if (descriptor.navigation.templateKey !== descriptor.templateKey) {
		return { valid: false, reason: "Navigation templateKey does not match descriptor templateKey" };
	}

	// Every storefront region must be represented in the layout
	for (const region of storefrontRegions) {
		const entry = descriptor.layout.regions.find((r) => r.region === region);
		if (!entry) {
			return { valid: false, reason: `Missing region definition: ${region}` };
		}
	}

	// Must have at least header and main-content visible
	if (!descriptor.visibleRegions.includes("header")) {
		return { valid: false, reason: "Header region must be visible" };
	}

	if (!descriptor.visibleRegions.includes("main-content")) {
		return { valid: false, reason: "Main-content region must be visible" };
	}

	// Navigation must have at least one item
	if (descriptor.navigation.items.length === 0) {
		return { valid: false, reason: "Navigation must have at least one item" };
	}

	// All navigation paths must start with /
	for (const item of descriptor.navigation.items) {
		if (!item.path.startsWith("/")) {
			return { valid: false, reason: `Navigation item "${item.key}" has invalid path: ${item.path}` };
		}
	}

	return { valid: true };
}

// ── Preview Descriptor ───────────────────────────────────────────────────────

export type TemplatePreviewDescriptor = {
	readonly templateKey: TenantVerticalTemplateKey;
	readonly displayName: string;
	readonly description: string;
	readonly operatingMode: string;
	readonly visibleRegions: readonly StorefrontRegion[];
	readonly navigationItemCount: number;
	readonly hasSidebar: boolean;
	readonly hasHero: boolean;
};

/**
 * Creates a lightweight preview descriptor for template selection UI.
 * Used by onboarding wizards and template comparison views.
 */
export function createTemplatePreview(
	templateKey: TenantVerticalTemplateKey
): TemplatePreviewDescriptor {
	const registryEntry = getTemplateRegistryEntry(templateKey);
	const composition = composeTemplate(templateKey);

	return {
		templateKey,
		displayName: registryEntry.displayName,
		description: registryEntry.description,
		operatingMode: registryEntry.operatingMode,
		visibleRegions: composition.visibleRegions,
		navigationItemCount: composition.navigation.items.length,
		hasSidebar: composition.layout.sidebarPosition !== "none",
		hasHero: composition.layout.heroEnabled
	};
}

/**
 * Creates preview descriptors for all registered templates.
 */
export function createAllTemplatePreviews(): readonly TemplatePreviewDescriptor[] {
	return tenantVerticalTemplateKeys.map(createTemplatePreview);
}
