// E4-S5-T1: PWA manifest configuration with tenant-aware name, icons, theme
// color, and installability settings. Also defines a static asset caching
// strategy that classifies assets for service worker consumption.
// Security: manifest must be tenant-scoped; one tenant's PWA name and icons
// must not appear for another tenant.

import type { TenantFrontendContext } from "./tenant-bootstrap";

// ── Web App Manifest Types ───────────────────────────────────────────────────
// Follows the W3C Web App Manifest specification.

export type ManifestDisplay = "standalone" | "fullscreen" | "minimal-ui" | "browser";

export type ManifestIcon = {
	readonly src: string;
	readonly sizes: string;
	readonly type: string;
	readonly purpose?: "any" | "maskable" | "monochrome";
};

export type WebAppManifest = {
	readonly name: string;
	readonly short_name: string;
	readonly description: string;
	readonly start_url: string;
	readonly display: ManifestDisplay;
	readonly background_color: string;
	readonly theme_color: string;
	readonly icons: readonly ManifestIcon[];
	readonly scope: string;
	readonly lang: string;
	readonly dir: "ltr" | "rtl" | "auto";
	readonly orientation?: "any" | "portrait" | "landscape";
	readonly id?: string;
};

// ── Manifest Defaults ────────────────────────────────────────────────────────

const defaultIcons: readonly ManifestIcon[] = [
	{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
	{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
	{ src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
	{ src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
];

const defaultThemeColor = "#ffffff";
const defaultBackgroundColor = "#ffffff";

// ── Manifest Configuration ───────────────────────────────────────────────────

export type ManifestOptions = {
	readonly themeColor?: string;
	readonly backgroundColor?: string;
	readonly icons?: readonly ManifestIcon[];
	readonly display?: ManifestDisplay;
	readonly orientation?: "any" | "portrait" | "landscape";
	readonly lang?: string;
	readonly dir?: "ltr" | "rtl" | "auto";
};

/**
 * Generates a tenant-aware PWA manifest. The manifest name, short_name,
 * and start_url are derived from the tenant context.
 */
export function generateManifest(
	context: TenantFrontendContext,
	options: ManifestOptions = {}
): WebAppManifest {
	return {
		name: context.displayName,
		short_name: context.displayName.length > 12
			? context.displayName.slice(0, 12).trim()
			: context.displayName,
		description: `${context.displayName} — Order, book, and more.`,
		start_url: "/",
		display: options.display ?? "standalone",
		background_color: options.backgroundColor ?? defaultBackgroundColor,
		theme_color: options.themeColor ?? defaultThemeColor,
		icons: options.icons ?? defaultIcons,
		scope: "/",
		lang: options.lang ?? "en",
		dir: options.dir ?? "ltr",
		orientation: options.orientation ?? "any",
		id: `tenant-${context.tenantId}`
	};
}

// ── Manifest Validation ──────────────────────────────────────────────────────

export type ManifestValidationResult = {
	readonly valid: boolean;
	readonly errors: readonly string[];
};

const requiredManifestFields: (keyof WebAppManifest)[] = [
	"name",
	"short_name",
	"start_url",
	"display",
	"icons",
	"theme_color",
	"background_color"
];

/**
 * Validates that a manifest has all required fields for installability.
 */
export function validateManifest(manifest: WebAppManifest): ManifestValidationResult {
	const errors: string[] = [];

	for (const field of requiredManifestFields) {
		const value = manifest[field];
		if (value === undefined || value === null || value === "") {
			errors.push(`Missing required field: ${field}`);
		}
	}

	if (!manifest.name || manifest.name.trim().length === 0) {
		errors.push("name must be a non-empty string");
	}

	if (!manifest.icons || manifest.icons.length === 0) {
		errors.push("At least one icon is required for installability");
	} else {
		const has192 = manifest.icons.some((i) => i.sizes.includes("192x192"));
		const has512 = manifest.icons.some((i) => i.sizes.includes("512x512"));
		if (!has192) errors.push("A 192x192 icon is required for installability");
		if (!has512) errors.push("A 512x512 icon is required for installability");
	}

	if (manifest.display !== "standalone" && manifest.display !== "fullscreen" && manifest.display !== "minimal-ui") {
		errors.push("display must be 'standalone', 'fullscreen', or 'minimal-ui' for installability");
	}

	return { valid: errors.length === 0, errors };
}

// ── Static Asset Caching Strategy ────────────────────────────────────────────

export type CacheStrategy = "cache-first" | "network-first" | "stale-while-revalidate" | "network-only";

export type AssetCacheClassification = {
	readonly pattern: string;
	readonly strategy: CacheStrategy;
	readonly maxAgeSeconds: number;
	readonly description: string;
};

/**
 * Defines the static asset caching strategy for the service worker.
 * Each entry classifies a URL pattern with a caching strategy and TTL.
 */
export const assetCacheClassifications: readonly AssetCacheClassification[] = [
	{
		pattern: "/assets/**/*.{js,css}",
		strategy: "cache-first",
		maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year (content-hashed)
		description: "Hashed JS/CSS bundles — immutable, cache indefinitely"
	},
	{
		pattern: "/assets/**/*.{woff,woff2,ttf,otf}",
		strategy: "cache-first",
		maxAgeSeconds: 365 * 24 * 60 * 60,
		description: "Font files — immutable, cache indefinitely"
	},
	{
		pattern: "/icons/**",
		strategy: "cache-first",
		maxAgeSeconds: 30 * 24 * 60 * 60,
		description: "App icons — long-lived, refresh monthly"
	},
	{
		pattern: "/images/**",
		strategy: "stale-while-revalidate",
		maxAgeSeconds: 7 * 24 * 60 * 60,
		description: "Tenant images — serve cached, revalidate in background"
	},
	{
		pattern: "/api/**",
		strategy: "network-first",
		maxAgeSeconds: 0,
		description: "API requests — always prefer fresh data"
	},
	{
		pattern: "/",
		strategy: "network-first",
		maxAgeSeconds: 60 * 60,
		description: "HTML shell — prefer fresh, fall back to cache"
	}
];

/**
 * Returns the caching strategy for a given URL path.
 * Falls back to network-first for unclassified assets.
 */
export function classifyAssetCacheStrategy(urlPath: string): AssetCacheClassification {
	// Check API routes first
	if (urlPath.startsWith("/api/")) {
		return assetCacheClassifications.find((c) => c.pattern === "/api/**")!;
	}

	// Check hashed assets
	if (urlPath.startsWith("/assets/")) {
		if (/\.(js|css)$/.test(urlPath)) {
			return assetCacheClassifications.find((c) => c.pattern.includes("*.{js,css}"))!;
		}
		if (/\.(woff2?|ttf|otf)$/.test(urlPath)) {
			return assetCacheClassifications.find((c) => c.pattern.includes("*.{woff"))!;
		}
	}

	if (urlPath.startsWith("/icons/")) {
		return assetCacheClassifications.find((c) => c.pattern === "/icons/**")!;
	}

	if (urlPath.startsWith("/images/")) {
		return assetCacheClassifications.find((c) => c.pattern === "/images/**")!;
	}

	if (urlPath === "/" || urlPath === "/index.html") {
		return assetCacheClassifications.find((c) => c.pattern === "/")!;
	}

	// Fallback: network-first for unclassified routes (HTML pages)
	return {
		pattern: "*",
		strategy: "network-first",
		maxAgeSeconds: 0,
		description: "Unclassified — default to network-first"
	};
}

/**
 * Returns whether an asset is considered static and safe to cache long-term.
 */
export function isStaticAsset(urlPath: string): boolean {
	const classification = classifyAssetCacheStrategy(urlPath);
	return classification.strategy === "cache-first";
}
