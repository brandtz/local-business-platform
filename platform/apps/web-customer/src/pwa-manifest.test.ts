import { describe, it, expect } from "vitest";

import type { TenantFrontendContext } from "./tenant-bootstrap";
import {
	generateManifest,
	validateManifest,
	assetCacheClassifications,
	classifyAssetCacheStrategy,
	isStaticAsset,
	type WebAppManifest,
	type ManifestOptions
} from "./pwa-manifest";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function createContext(
	overrides: Partial<TenantFrontendContext> = {}
): TenantFrontendContext {
	return {
		tenantId: "tenant-1",
		displayName: "Joe's Pizza",
		slug: "joes-pizza",
		status: "active",
		previewSubdomain: "joes-pizza",
		templateKey: "restaurant-core",
		enabledModules: ["catalog", "ordering"],
		...overrides
	};
}

// ── Manifest Generation ──────────────────────────────────────────────────────

describe("generateManifest", () => {
	it("generates manifest with tenant name", () => {
		const manifest = generateManifest(createContext());
		expect(manifest.name).toBe("Joe's Pizza");
	});

	it("uses short_name truncated to 12 chars for long names", () => {
		const manifest = generateManifest(
			createContext({ displayName: "The Extraordinary Pizza Palace" })
		);
		expect(manifest.short_name.length).toBeLessThanOrEqual(12);
	});

	it("uses full name as short_name when <= 12 chars", () => {
		const manifest = generateManifest(createContext({ displayName: "Joe's Pizza" }));
		expect(manifest.short_name).toBe("Joe's Pizza");
	});

	it("sets start_url to /", () => {
		const manifest = generateManifest(createContext());
		expect(manifest.start_url).toBe("/");
	});

	it("defaults to standalone display", () => {
		const manifest = generateManifest(createContext());
		expect(manifest.display).toBe("standalone");
	});

	it("allows display override", () => {
		const manifest = generateManifest(createContext(), { display: "minimal-ui" });
		expect(manifest.display).toBe("minimal-ui");
	});

	it("applies custom theme color", () => {
		const opts: ManifestOptions = { themeColor: "#ff0000" };
		const manifest = generateManifest(createContext(), opts);
		expect(manifest.theme_color).toBe("#ff0000");
	});

	it("sets tenant-scoped id", () => {
		const manifest = generateManifest(createContext({ tenantId: "abc-123" }));
		expect(manifest.id).toBe("tenant-abc-123");
	});

	it("includes default icons", () => {
		const manifest = generateManifest(createContext());
		expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
	});

	it("allows custom icons", () => {
		const customIcons = [
			{ src: "/custom/icon.png", sizes: "192x192", type: "image/png" }
		];
		const manifest = generateManifest(createContext(), { icons: customIcons });
		expect(manifest.icons).toEqual(customIcons);
	});

	it("different tenants produce different manifests", () => {
		const a = generateManifest(createContext({ tenantId: "t1", displayName: "Pizza A" }));
		const b = generateManifest(createContext({ tenantId: "t2", displayName: "Pizza B" }));
		expect(a.name).not.toBe(b.name);
		expect(a.id).not.toBe(b.id);
	});
});

// ── Manifest Validation ──────────────────────────────────────────────────────

describe("validateManifest", () => {
	it("validates a correct manifest", () => {
		const manifest = generateManifest(createContext());
		const result = validateManifest(manifest);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("detects missing name", () => {
		const manifest = { ...generateManifest(createContext()), name: "" } as WebAppManifest;
		const result = validateManifest(manifest);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("name"))).toBe(true);
	});

	it("detects missing icons", () => {
		const manifest = { ...generateManifest(createContext()), icons: [] } as unknown as WebAppManifest;
		const result = validateManifest(manifest);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("icon"))).toBe(true);
	});

	it("detects missing 192x192 icon", () => {
		const manifest = {
			...generateManifest(createContext()),
			icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }]
		} as WebAppManifest;
		const result = validateManifest(manifest);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("192x192"))).toBe(true);
	});

	it("detects missing 512x512 icon", () => {
		const manifest = {
			...generateManifest(createContext()),
			icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png" }]
		} as WebAppManifest;
		const result = validateManifest(manifest);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("512x512"))).toBe(true);
	});

	it("detects non-installable display mode", () => {
		const manifest = { ...generateManifest(createContext()), display: "browser" as const };
		const result = validateManifest(manifest);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("display"))).toBe(true);
	});
});

// ── Static Asset Caching Strategy ────────────────────────────────────────────

describe("assetCacheClassifications", () => {
	it("defines at least 5 classification rules", () => {
		expect(assetCacheClassifications.length).toBeGreaterThanOrEqual(5);
	});

	it("each classification has required fields", () => {
		for (const c of assetCacheClassifications) {
			expect(c.pattern).toBeTruthy();
			expect(c.strategy).toBeTruthy();
			expect(typeof c.maxAgeSeconds).toBe("number");
			expect(c.description).toBeTruthy();
		}
	});
});

describe("classifyAssetCacheStrategy", () => {
	it("classifies JS bundles as cache-first", () => {
		const result = classifyAssetCacheStrategy("/assets/main.abc123.js");
		expect(result.strategy).toBe("cache-first");
	});

	it("classifies CSS bundles as cache-first", () => {
		const result = classifyAssetCacheStrategy("/assets/styles.def456.css");
		expect(result.strategy).toBe("cache-first");
	});

	it("classifies font files as cache-first", () => {
		const result = classifyAssetCacheStrategy("/assets/fonts/inter.woff2");
		expect(result.strategy).toBe("cache-first");
	});

	it("classifies icons as cache-first", () => {
		const result = classifyAssetCacheStrategy("/icons/icon-192.png");
		expect(result.strategy).toBe("cache-first");
	});

	it("classifies images as stale-while-revalidate", () => {
		const result = classifyAssetCacheStrategy("/images/hero.jpg");
		expect(result.strategy).toBe("stale-while-revalidate");
	});

	it("classifies API requests as network-first", () => {
		const result = classifyAssetCacheStrategy("/api/v1/tenants/config");
		expect(result.strategy).toBe("network-first");
	});

	it("classifies root HTML as network-first", () => {
		const result = classifyAssetCacheStrategy("/");
		expect(result.strategy).toBe("network-first");
	});

	it("classifies unknown routes as network-first", () => {
		const result = classifyAssetCacheStrategy("/account/profile");
		expect(result.strategy).toBe("network-first");
	});
});

describe("isStaticAsset", () => {
	it("returns true for JS bundles", () => {
		expect(isStaticAsset("/assets/app.js")).toBe(true);
	});

	it("returns true for CSS bundles", () => {
		expect(isStaticAsset("/assets/style.css")).toBe(true);
	});

	it("returns true for icons", () => {
		expect(isStaticAsset("/icons/logo.png")).toBe(true);
	});

	it("returns false for API routes", () => {
		expect(isStaticAsset("/api/v1/orders")).toBe(false);
	});

	it("returns false for HTML pages", () => {
		expect(isStaticAsset("/")).toBe(false);
	});

	it("returns false for images (stale-while-revalidate, not cache-first)", () => {
		expect(isStaticAsset("/images/hero.jpg")).toBe(false);
	});
});
