// E12-S1-T3 / E12-S1-T4: API contract types for subscription package
// endpoints. Used by platform admin (create, update, deprecate, list)
// and by tenant admin / onboarding wizard (comparison read model).

import type {
	BillingInterval,
	CreateSubscriptionPackageInput,
	PackageComparisonModel,
	PackageStatus,
	PremiumFeatureFlag,
	SubscriptionPackageWithEntitlements,
	UpdateSubscriptionPackageInput,
	UsageLimitType,
} from "@platform/types";

// ─── Platform Admin: Package Management ─────────────────────────────

export type PlatformAdminCreatePackageRequest = CreateSubscriptionPackageInput;

export type PlatformAdminUpdatePackageRequest = UpdateSubscriptionPackageInput;

export type PlatformAdminPackageResponse = {
	id: string;
	name: string;
	description: string | null;
	billingInterval: BillingInterval;
	basePriceCents: number;
	trialDurationDays: number | null;
	status: PackageStatus;
	deprecatedAt: string | null;
	displayOrder: number;
	modules: Record<string, boolean>;
	premiumFeatures: PremiumFeatureFlag[];
	usageLimits: {
		limitType: UsageLimitType;
		softLimit: number | null;
		hardLimit: number;
	}[];
	currentVersionNumber: number | null;
	createdAt: string;
	updatedAt: string;
};

export type PlatformAdminPackageListResponse = {
	packages: PlatformAdminPackageResponse[];
	total: number;
};

// ─── Public / Tenant Admin: Plan Comparison ─────────────────────────

export type PackageComparisonResponse = PackageComparisonModel;

// ─── Response builders ──────────────────────────────────────────────

export function buildPlatformAdminPackageResponse(
	data: SubscriptionPackageWithEntitlements,
	currentVersionNumber: number | null,
): PlatformAdminPackageResponse {
	const modules: Record<string, boolean> = {};
	for (const ent of data.entitlements) {
		modules[ent.moduleKey] = ent.enabled;
	}

	return {
		id: data.package.id,
		name: data.package.name,
		description: data.package.description,
		billingInterval: data.package.billingInterval,
		basePriceCents: data.package.basePriceCents,
		trialDurationDays: data.package.trialDurationDays,
		status: data.package.status,
		deprecatedAt: data.package.deprecatedAt,
		displayOrder: data.package.displayOrder,
		modules,
		premiumFeatures: data.premiumFeatures.map((pf) => pf.featureFlag),
		usageLimits: data.usageLimits.map((ul) => ({
			limitType: ul.limitType,
			softLimit: ul.softLimit,
			hardLimit: ul.hardLimit,
		})),
		currentVersionNumber,
		createdAt: data.package.createdAt,
		updatedAt: data.package.updatedAt,
	};
}
