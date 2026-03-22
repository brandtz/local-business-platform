// E12-S1-T3: Unit tests for SubscriptionPackageService CRUD operations.
// E12-S1-T5: Tests for package versioning and grandfathering.

import { describe, expect, it, beforeEach } from "vitest";
import type {
	CreateSubscriptionPackageInput,
} from "@platform/types";
import {
	SubscriptionPackageService,
	SubscriptionPackageNotFoundError,
	SubscriptionPackageValidationError,
	SubscriptionPackageDuplicateError,
	SubscriptionPackageDeprecatedError,
} from "./subscription-package.service";

// ─── Helpers ────────────────────────────────────────────────────────

const ACTOR_ID = "platform-admin-1";

function sampleStarterInput(
	overrides?: Partial<CreateSubscriptionPackageInput>,
): CreateSubscriptionPackageInput {
	return {
		name: "Starter",
		description: "Basic plan for small businesses",
		billingInterval: "monthly",
		basePriceCents: 2900,
		trialDurationDays: 14,
		displayOrder: 1,
		modules: { catalog: true, ordering: true, content: true, operations: true },
		premiumFeatures: [],
		usageLimits: [
			{ limitType: "orders_per_month", softLimit: 100, hardLimit: 150 },
			{ limitType: "storage_gb", hardLimit: 5 },
			{ limitType: "staff_seats", hardLimit: 3 },
		],
		...overrides,
	};
}

function sampleProInput(
	overrides?: Partial<CreateSubscriptionPackageInput>,
): CreateSubscriptionPackageInput {
	return {
		name: "Professional",
		description: "For growing businesses",
		billingInterval: "monthly",
		basePriceCents: 7900,
		trialDurationDays: 30,
		displayOrder: 2,
		modules: {
			catalog: true,
			ordering: true,
			bookings: true,
			content: true,
			operations: true,
		},
		premiumFeatures: ["advanced-analytics", "api-access"],
		usageLimits: [
			{ limitType: "orders_per_month", softLimit: 1000, hardLimit: 1500 },
			{ limitType: "storage_gb", hardLimit: 50 },
			{ limitType: "staff_seats", hardLimit: 20 },
		],
		...overrides,
	};
}

// ─── E12-S1-T3: Create package tests ───────────────────────────────

describe("SubscriptionPackageService", () => {
	let service: SubscriptionPackageService;

	beforeEach(() => {
		service = new SubscriptionPackageService();
	});

	describe("createPackage", () => {
		it("creates a package with all entitlements", () => {
			const result = service.createPackage(sampleStarterInput(), ACTOR_ID);

			expect(result.package.name).toBe("Starter");
			expect(result.package.billingInterval).toBe("monthly");
			expect(result.package.basePriceCents).toBe(2900);
			expect(result.package.trialDurationDays).toBe(14);
			expect(result.package.status).toBe("active");
			expect(result.package.displayOrder).toBe(1);
			expect(result.entitlements.length).toBe(4);
			expect(result.usageLimits.length).toBe(3);
			expect(result.premiumFeatures.length).toBe(0);
		});

		it("creates initial version on package creation", () => {
			const result = service.createPackage(sampleStarterInput(), ACTOR_ID);
			const version = service.getLatestVersion(result.package.id);

			expect(version).not.toBeNull();
			expect(version!.versionNumber).toBe(1);
			expect(version!.changedBy).toBe(ACTOR_ID);
			expect(version!.changeReason).toBe("Initial package creation");
			expect(version!.entitlementsSnapshot.modules).toHaveProperty("catalog", true);
		});

		it("rejects invalid input", () => {
			expect(() =>
				service.createPackage(
					sampleStarterInput({ name: "" }),
					ACTOR_ID,
				),
			).toThrow(SubscriptionPackageValidationError);
		});

		it("rejects duplicate package name", () => {
			service.createPackage(sampleStarterInput(), ACTOR_ID);
			expect(() =>
				service.createPackage(sampleStarterInput(), ACTOR_ID),
			).toThrow(SubscriptionPackageDuplicateError);
		});

		it("rejects invalid price", () => {
			expect(() =>
				service.createPackage(
					sampleStarterInput({ basePriceCents: -100 }),
					ACTOR_ID,
				),
			).toThrow(SubscriptionPackageValidationError);
		});

		it("rejects module dependency violation", () => {
			expect(() =>
				service.createPackage(
					sampleStarterInput({
						modules: { ordering: true },
					}),
					ACTOR_ID,
				),
			).toThrow(SubscriptionPackageValidationError);
		});

		it("creates package with premium features", () => {
			const result = service.createPackage(sampleProInput(), ACTOR_ID);

			expect(result.premiumFeatures.length).toBe(2);
			expect(result.premiumFeatures[0].featureFlag).toBe("advanced-analytics");
			expect(result.premiumFeatures[1].featureFlag).toBe("api-access");
		});
	});

	// ── E12-S1-T3: Get package tests ──────────────────────────────

	describe("getPackage", () => {
		it("returns package with full entitlements", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			const result = service.getPackage(created.package.id);

			expect(result.package.id).toBe(created.package.id);
			expect(result.entitlements.length).toBe(4);
			expect(result.usageLimits.length).toBe(3);
		});

		it("throws for non-existent package", () => {
			expect(() => service.getPackage("non-existent")).toThrow(
				SubscriptionPackageNotFoundError,
			);
		});
	});

	// ── E12-S1-T3: List packages tests ────────────────────────────

	describe("listPackages", () => {
		it("returns packages sorted by displayOrder", () => {
			service.createPackage(sampleProInput(), ACTOR_ID);
			service.createPackage(sampleStarterInput(), ACTOR_ID);

			const result = service.listPackages();

			expect(result.length).toBe(2);
			expect(result[0].package.name).toBe("Starter");
			expect(result[1].package.name).toBe("Professional");
		});

		it("filters by status", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.createPackage(sampleProInput(), ACTOR_ID);
			service.deprecatePackage(created.package.id);

			const active = service.listPackages({ status: "active" });
			const deprecated = service.listPackages({ status: "deprecated" });

			expect(active.length).toBe(1);
			expect(active[0].package.name).toBe("Professional");
			expect(deprecated.length).toBe(1);
			expect(deprecated[0].package.name).toBe("Starter");
		});
	});

	// ── E12-S1-T3: List active packages ───────────────────────────

	describe("listActivePackages", () => {
		it("only returns active packages", () => {
			const starter = service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.createPackage(sampleProInput(), ACTOR_ID);
			service.deprecatePackage(starter.package.id);

			const result = service.listActivePackages();

			expect(result.length).toBe(1);
			expect(result[0].package.name).toBe("Professional");
		});
	});

	// ── E12-S1-T3: Update package tests ───────────────────────────

	describe("updatePackage", () => {
		it("updates package name and description", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);

			const result = service.updatePackage(
				created.package.id,
				{
					name: "Starter Plus",
					description: "Updated description",
				},
				ACTOR_ID,
			);

			expect(result.package.name).toBe("Starter Plus");
			expect(result.package.description).toBe("Updated description");
		});

		it("updates pricing", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);

			const result = service.updatePackage(
				created.package.id,
				{ basePriceCents: 3900 },
				ACTOR_ID,
			);

			expect(result.package.basePriceCents).toBe(3900);
		});

		it("updates modules and creates new version", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);

			service.updatePackage(
				created.package.id,
				{
					modules: {
						catalog: true,
						ordering: true,
						bookings: true,
						content: true,
						operations: true,
					},
				},
				ACTOR_ID,
			);

			const versions = service.listVersions(created.package.id);
			expect(versions.length).toBe(2);
			expect(versions[1].versionNumber).toBe(2);
		});

		it("does not create new version when only price changes", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);

			service.updatePackage(
				created.package.id,
				{ basePriceCents: 3900 },
				ACTOR_ID,
			);

			const versions = service.listVersions(created.package.id);
			expect(versions.length).toBe(1);
		});

		it("throws for non-existent package", () => {
			expect(() =>
				service.updatePackage("non-existent", { name: "X" }, ACTOR_ID),
			).toThrow(SubscriptionPackageNotFoundError);
		});

		it("throws for deprecated package", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.deprecatePackage(created.package.id);

			expect(() =>
				service.updatePackage(
					created.package.id,
					{ name: "X" },
					ACTOR_ID,
				),
			).toThrow(SubscriptionPackageDeprecatedError);
		});
	});

	// ── E12-S1-T3: Deprecate package tests ────────────────────────

	describe("deprecatePackage", () => {
		it("deprecates a package", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);

			const result = service.deprecatePackage(created.package.id);

			expect(result.package.status).toBe("deprecated");
			expect(result.package.deprecatedAt).not.toBeNull();
		});

		it("deprecated package excluded from active list", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.deprecatePackage(created.package.id);

			const active = service.listActivePackages();
			expect(active.length).toBe(0);
		});

		it("deprecated package still retrievable by ID", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.deprecatePackage(created.package.id);

			const result = service.getPackage(created.package.id);
			expect(result.package.status).toBe("deprecated");
		});

		it("throws for non-existent package", () => {
			expect(() => service.deprecatePackage("non-existent")).toThrow(
				SubscriptionPackageNotFoundError,
			);
		});

		it("throws for already deprecated package", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.deprecatePackage(created.package.id);

			expect(() =>
				service.deprecatePackage(created.package.id),
			).toThrow(SubscriptionPackageDeprecatedError);
		});
	});

	// ── E12-S1-T4: Package comparison model ───────────────────────

	describe("getPackageComparisonModel", () => {
		it("returns comparison model for active packages", () => {
			service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.createPackage(sampleProInput(), ACTOR_ID);

			const model = service.getPackageComparisonModel();

			expect(model.packages.length).toBe(2);
			expect(model.packages[0].name).toBe("Starter");
			expect(model.packages[1].name).toBe("Professional");
			expect(model.features.length).toBeGreaterThan(0);

			// Verify feature categories exist
			const categories = new Set(model.features.map((f) => f.featureCategory));
			expect(categories.has("module")).toBe(true);
			expect(categories.has("usage-limit")).toBe(true);
			expect(categories.has("premium-feature")).toBe(true);
		});

		it("excludes deprecated packages from comparison", () => {
			const starter = service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.createPackage(sampleProInput(), ACTOR_ID);
			service.deprecatePackage(starter.package.id);

			const model = service.getPackageComparisonModel();
			expect(model.packages.length).toBe(1);
			expect(model.packages[0].name).toBe("Professional");
		});

		it("provides CTA labels based on trial availability", () => {
			service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.createPackage(
				sampleProInput({ trialDurationDays: undefined }),
				ACTOR_ID,
			);

			const model = service.getPackageComparisonModel();
			expect(model.packages[0].ctaLabel).toBe("Start Free Trial");
			expect(model.packages[1].ctaLabel).toBe("Choose Plan");
		});

		it("provides all data needed for plan-picker UI", () => {
			service.createPackage(sampleStarterInput(), ACTOR_ID);
			service.createPackage(sampleProInput(), ACTOR_ID);

			const model = service.getPackageComparisonModel();

			// Each package summary has required fields
			for (const pkg of model.packages) {
				expect(pkg.id).toBeDefined();
				expect(pkg.name).toBeDefined();
				expect(pkg.basePriceCents).toBeDefined();
				expect(pkg.billingInterval).toBeDefined();
				expect(pkg.ctaLabel).toBeDefined();
			}

			// Feature rows have values for all packages
			for (const feature of model.features) {
				for (const pkg of model.packages) {
					expect(feature.values[pkg.id]).toBeDefined();
					expect(typeof feature.values[pkg.id].included).toBe("boolean");
				}
			}
		});
	});

	// ── E12-S1-T5: Versioning tests ──────────────────────────────

	describe("versioning", () => {
		it("creates version 1 on package creation", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			const version = service.getLatestVersion(created.package.id);

			expect(version).not.toBeNull();
			expect(version!.versionNumber).toBe(1);
		});

		it("increments version on entitlement changes", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);

			// Add bookings module
			service.updatePackage(
				created.package.id,
				{
					modules: {
						catalog: true,
						ordering: true,
						bookings: true,
						content: true,
						operations: true,
					},
				},
				ACTOR_ID,
			);

			const version = service.getLatestVersion(created.package.id);
			expect(version!.versionNumber).toBe(2);
			expect(version!.entitlementsSnapshot.modules).toHaveProperty(
				"bookings",
				true,
			);
		});

		it("can retrieve contracted entitlements by version", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			const packageId = created.package.id;

			// Update entitlements
			service.updatePackage(
				packageId,
				{
					premiumFeatures: ["advanced-analytics"],
				},
				ACTOR_ID,
			);

			// Get version 1 (original)
			const v1 = service.getEntitlementsForVersion(packageId, 1);
			expect(v1).not.toBeNull();
			expect(v1!.premiumFeatures).toEqual([]);

			// Get version 2 (updated)
			const v2 = service.getEntitlementsForVersion(packageId, 2);
			expect(v2).not.toBeNull();
			expect(v2!.premiumFeatures).toEqual(["advanced-analytics"]);
		});

		it("lists all versions for a package", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			const packageId = created.package.id;

			// Make two entitlement changes
			service.updatePackage(
				packageId,
				{
					premiumFeatures: ["advanced-analytics"],
				},
				ACTOR_ID,
			);
			service.updatePackage(
				packageId,
				{
					premiumFeatures: ["advanced-analytics", "api-access"],
				},
				ACTOR_ID,
			);

			const versions = service.listVersions(packageId);
			expect(versions.length).toBe(3);
			expect(versions[0].versionNumber).toBe(1);
			expect(versions[1].versionNumber).toBe(2);
			expect(versions[2].versionNumber).toBe(3);
		});

		it("returns null for non-existent version", () => {
			const created = service.createPackage(sampleStarterInput(), ACTOR_ID);
			const result = service.getEntitlementsForVersion(
				created.package.id,
				99,
			);
			expect(result).toBeNull();
		});
	});
});
