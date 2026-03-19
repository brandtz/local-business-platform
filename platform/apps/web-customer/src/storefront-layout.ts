// E4-S3-T1: Storefront layout region schema and navigation schema.
// Defines the regions available in a storefront layout and the navigation
// items driven by tenant template configuration.
// Security: schema is derived from the resolved tenant's template — no
// cross-tenant layout inheritance.

import type {
	TenantModuleKey,
	TenantVerticalTemplateKey
} from "@platform/types";

// ── Storefront Regions ───────────────────────────────────────────────────────

export const storefrontRegions = [
	"header",
	"hero",
	"sidebar",
	"main-content",
	"footer"
] as const;

export type StorefrontRegion = (typeof storefrontRegions)[number];

export type StorefrontRegionVisibility = {
	readonly region: StorefrontRegion;
	readonly visible: boolean;
};

export type StorefrontLayoutSchema = {
	readonly templateKey: TenantVerticalTemplateKey;
	readonly regions: readonly StorefrontRegionVisibility[];
	readonly sidebarPosition: "left" | "right" | "none";
	readonly heroEnabled: boolean;
};

// ── Navigation Schema ────────────────────────────────────────────────────────

export type StorefrontNavigationItem = {
	readonly key: string;
	readonly label: string;
	readonly path: string;
	readonly requiredModule?: TenantModuleKey;
	readonly order: number;
};

export type StorefrontNavigationSchema = {
	readonly templateKey: TenantVerticalTemplateKey;
	readonly items: readonly StorefrontNavigationItem[];
};

// ── Template → Layout Registry ───────────────────────────────────────────────

function allRegions(overrides: Partial<Record<StorefrontRegion, boolean>>): readonly StorefrontRegionVisibility[] {
	return storefrontRegions.map((region) => ({
		region,
		visible: overrides[region] ?? true
	}));
}

const templateLayoutRegistry: Record<TenantVerticalTemplateKey, StorefrontLayoutSchema> = {
	"restaurant-core": {
		templateKey: "restaurant-core",
		heroEnabled: true,
		sidebarPosition: "none",
		regions: allRegions({ sidebar: false })
	},
	"services-core": {
		templateKey: "services-core",
		heroEnabled: true,
		sidebarPosition: "none",
		regions: allRegions({ sidebar: false })
	},
	"hybrid-local-business": {
		templateKey: "hybrid-local-business",
		heroEnabled: true,
		sidebarPosition: "left",
		regions: allRegions({})
	}
};

// ── Template → Navigation Registry ───────────────────────────────────────────

const templateNavigationRegistry: Record<TenantVerticalTemplateKey, StorefrontNavigationSchema> = {
	"restaurant-core": {
		templateKey: "restaurant-core",
		items: [
			{ key: "home", label: "Home", path: "/", order: 0 },
			{ key: "menu", label: "Menu", path: "/menu", requiredModule: "catalog", order: 10 },
			{ key: "order", label: "Order Online", path: "/order", requiredModule: "ordering", order: 20 },
			{ key: "about", label: "About", path: "/about", requiredModule: "content", order: 90 }
		]
	},
	"services-core": {
		templateKey: "services-core",
		items: [
			{ key: "home", label: "Home", path: "/", order: 0 },
			{ key: "services", label: "Services", path: "/services", requiredModule: "catalog", order: 10 },
			{ key: "book", label: "Book Now", path: "/book", requiredModule: "bookings", order: 20 },
			{ key: "about", label: "About", path: "/about", requiredModule: "content", order: 90 }
		]
	},
	"hybrid-local-business": {
		templateKey: "hybrid-local-business",
		items: [
			{ key: "home", label: "Home", path: "/", order: 0 },
			{ key: "menu", label: "Menu", path: "/menu", requiredModule: "catalog", order: 10 },
			{ key: "services", label: "Services", path: "/services", requiredModule: "catalog", order: 15 },
			{ key: "order", label: "Order Online", path: "/order", requiredModule: "ordering", order: 20 },
			{ key: "book", label: "Book Now", path: "/book", requiredModule: "bookings", order: 25 },
			{ key: "about", label: "About", path: "/about", requiredModule: "content", order: 90 }
		]
	}
};

// ── Public API ───────────────────────────────────────────────────────────────

export function getStorefrontLayoutSchema(
	templateKey: TenantVerticalTemplateKey
): StorefrontLayoutSchema {
	return templateLayoutRegistry[templateKey];
}

export function getStorefrontNavigationSchema(
	templateKey: TenantVerticalTemplateKey
): StorefrontNavigationSchema {
	return templateNavigationRegistry[templateKey];
}

export function getVisibleRegions(
	schema: StorefrontLayoutSchema
): readonly StorefrontRegion[] {
	return schema.regions.filter((r) => r.visible).map((r) => r.region);
}

export function isRegionVisible(
	schema: StorefrontLayoutSchema,
	region: StorefrontRegion
): boolean {
	const entry = schema.regions.find((r) => r.region === region);
	return entry?.visible ?? false;
}
