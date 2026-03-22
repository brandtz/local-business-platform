// E12-S1-T3 / E12-S1-T4: API contract tests for subscription package endpoints.
// Validates platform admin response shape and comparison model completeness.

import { describe, expect, it } from "vitest";
import type {
	PremiumFeatureRecord,
	SubscriptionPackageWithEntitlements,
} from "@platform/types";
import {
	buildPlatformAdminPackageResponse,
} from "./subscription-package-api-contracts";
import type {
	PlatformAdminPackageResponse,
} from "./subscription-package-api-contracts";

// ─── Helpers ────────────────────────────────────────────────────────

function samplePackageData(): SubscriptionPackageWithEntitlements {
	return {
		package: {
			id: "pkg-1",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-15T00:00:00.000Z",
			name: "Professional",
			description: "For growing businesses",
			billingInterval: "monthly",
			basePriceCents: 7900,
			trialDurationDays: 30,
			status: "active",
			deprecatedAt: null,
			displayOrder: 2,
		},
		entitlements: [
			{
				id: "ent-1",
				createdAt: "2026-01-01T00:00:00.000Z",
				packageId: "pkg-1",
				moduleKey: "catalog",
				enabled: true,
			},
			{
				id: "ent-2",
				createdAt: "2026-01-01T00:00:00.000Z",
				packageId: "pkg-1",
				moduleKey: "ordering",
				enabled: true,
			},
			{
				id: "ent-3",
				createdAt: "2026-01-01T00:00:00.000Z",
				packageId: "pkg-1",
				moduleKey: "bookings",
				enabled: true,
			},
		],
		usageLimits: [
			{
				id: "lim-1",
				createdAt: "2026-01-01T00:00:00.000Z",
				packageId: "pkg-1",
				limitType: "orders_per_month",
				softLimit: 1000,
				hardLimit: 1500,
				resetPeriod: "monthly",
			},
			{
				id: "lim-2",
				createdAt: "2026-01-01T00:00:00.000Z",
				packageId: "pkg-1",
				limitType: "storage_gb",
				softLimit: null,
				hardLimit: 50,
				resetPeriod: "none",
			},
		],
		premiumFeatures: [
			{
				id: "pf-1",
				createdAt: "2026-01-01T00:00:00.000Z",
				packageId: "pkg-1",
				featureFlag: "advanced-analytics",
			},
			{
				id: "pf-2",
				createdAt: "2026-01-01T00:00:00.000Z",
				packageId: "pkg-1",
				featureFlag: "api-access",
			},
		] as PremiumFeatureRecord[],
	};
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("buildPlatformAdminPackageResponse", () => {
	it("builds a complete response with all required fields", () => {
		const data = samplePackageData();
		const response = buildPlatformAdminPackageResponse(data, 3);

		expect(response.id).toBe("pkg-1");
		expect(response.name).toBe("Professional");
		expect(response.description).toBe("For growing businesses");
		expect(response.billingInterval).toBe("monthly");
		expect(response.basePriceCents).toBe(7900);
		expect(response.trialDurationDays).toBe(30);
		expect(response.status).toBe("active");
		expect(response.deprecatedAt).toBeNull();
		expect(response.displayOrder).toBe(2);
		expect(response.currentVersionNumber).toBe(3);
		expect(response.createdAt).toBe("2026-01-01T00:00:00.000Z");
		expect(response.updatedAt).toBe("2026-01-15T00:00:00.000Z");
	});

	it("includes module entitlements as a record", () => {
		const data = samplePackageData();
		const response = buildPlatformAdminPackageResponse(data, 1);

		expect(response.modules).toEqual({
			catalog: true,
			ordering: true,
			bookings: true,
		});
	});

	it("includes premium features as an array", () => {
		const data = samplePackageData();
		const response = buildPlatformAdminPackageResponse(data, 1);

		expect(response.premiumFeatures).toEqual([
			"advanced-analytics",
			"api-access",
		]);
	});

	it("includes usage limits with soft and hard limits", () => {
		const data = samplePackageData();
		const response = buildPlatformAdminPackageResponse(data, 1);

		expect(response.usageLimits).toEqual([
			{ limitType: "orders_per_month", softLimit: 1000, hardLimit: 1500 },
			{ limitType: "storage_gb", softLimit: null, hardLimit: 50 },
		]);
	});

	it("validates required fields are present", () => {
		const data = samplePackageData();
		const response = buildPlatformAdminPackageResponse(data, 1);

		// All PlatformAdminPackageResponse fields must be defined
		const requiredFields: (keyof PlatformAdminPackageResponse)[] = [
			"id",
			"name",
			"billingInterval",
			"basePriceCents",
			"status",
			"displayOrder",
			"modules",
			"premiumFeatures",
			"usageLimits",
			"createdAt",
			"updatedAt",
		];

		for (const field of requiredFields) {
			expect(response[field]).toBeDefined();
		}
	});
});
