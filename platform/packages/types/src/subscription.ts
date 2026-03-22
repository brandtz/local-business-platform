// ─── E12-S1: Subscription Package and Tier Model ──────────────────────
// Platform-level subscription packages, feature entitlements, comparison
// read model, and versioning contracts. Packages are tenant-agnostic —
// they define what a tier includes; actual subscriptions are per-tenant
// (deferred to E12-S4).

import { isValidModuleKey, validateModuleEnablementSet } from "./auth";

// ─── E12-S1-T1: Billing interval and package status ──────────────────

export const billingIntervals = ["monthly", "annual"] as const;
export type BillingInterval = (typeof billingIntervals)[number];

export function isValidBillingInterval(
	value: string,
): value is BillingInterval {
	return (billingIntervals as readonly string[]).includes(value);
}

export const packageStatuses = ["active", "deprecated"] as const;
export type PackageStatus = (typeof packageStatuses)[number];

export function isValidPackageStatus(
	value: string,
): value is PackageStatus {
	return (packageStatuses as readonly string[]).includes(value);
}

// ─── E12-S1-T2: Usage limit types ───────────────────────────────────

export const usageLimitTypes = [
	"orders_per_month",
	"storage_gb",
	"staff_seats",
] as const;
export type UsageLimitType = (typeof usageLimitTypes)[number];

export function isValidUsageLimitType(
	value: string,
): value is UsageLimitType {
	return (usageLimitTypes as readonly string[]).includes(value);
}

export const usageLimitResetPeriods = ["monthly", "annual", "none"] as const;
export type UsageLimitResetPeriod = (typeof usageLimitResetPeriods)[number];

// ─── E12-S1-T2: Premium feature flags ───────────────────────────────

export const premiumFeatureFlags = [
	"advanced-analytics",
	"api-access",
	"custom-branding",
	"dedicated-support",
	"sso",
	"custom-integrations",
	"white-label",
	"priority-support",
] as const;
export type PremiumFeatureFlag = (typeof premiumFeatureFlags)[number];

export function isValidPremiumFeatureFlag(
	value: string,
): value is PremiumFeatureFlag {
	return (premiumFeatureFlags as readonly string[]).includes(value);
}

// ─── E12-S1-T1: Subscription package record (database read model) ───

export type SubscriptionPackageRecord = {
	id: string;
	createdAt: string;
	updatedAt: string;
	name: string;
	description: string | null;
	billingInterval: BillingInterval;
	basePriceCents: number;
	trialDurationDays: number | null;
	status: PackageStatus;
	deprecatedAt: string | null;
	displayOrder: number;
};

// ─── E12-S1-T2: Feature entitlement record ──────────────────────────

export type PackageEntitlementRecord = {
	id: string;
	createdAt: string;
	packageId: string;
	moduleKey: string;
	enabled: boolean;
};

export type UsageLimitRecord = {
	id: string;
	createdAt: string;
	packageId: string;
	limitType: UsageLimitType;
	softLimit: number | null;
	hardLimit: number;
	resetPeriod: UsageLimitResetPeriod;
};

export type PremiumFeatureRecord = {
	id: string;
	createdAt: string;
	packageId: string;
	featureFlag: PremiumFeatureFlag;
};

// ─── E12-S1-T2: Entitlement map (derived from records) ─────────────

export type PackageEntitlementMap = {
	modules: Record<string, boolean>;
	premiumFeatures: PremiumFeatureFlag[];
	usageLimits: PackageUsageLimitMap;
};

export type PackageUsageLimitMap = {
	[K in UsageLimitType]?: {
		softLimit: number | null;
		hardLimit: number;
		resetPeriod: UsageLimitResetPeriod;
	};
};

// ─── E12-S1-T1 + T2: Full package with entitlements ────────────────

export type SubscriptionPackageWithEntitlements = {
	package: SubscriptionPackageRecord;
	entitlements: PackageEntitlementRecord[];
	usageLimits: UsageLimitRecord[];
	premiumFeatures: PremiumFeatureRecord[];
};

// ─── E12-S1-T3: Create / Update inputs ─────────────────────────────

export type CreateSubscriptionPackageInput = {
	name: string;
	description?: string;
	billingInterval: BillingInterval;
	basePriceCents: number;
	trialDurationDays?: number;
	displayOrder: number;
	modules: Record<string, boolean>;
	premiumFeatures?: string[];
	usageLimits?: {
		limitType: UsageLimitType;
		softLimit?: number;
		hardLimit: number;
		resetPeriod?: UsageLimitResetPeriod;
	}[];
};

export type UpdateSubscriptionPackageInput = {
	name?: string;
	description?: string;
	billingInterval?: BillingInterval;
	basePriceCents?: number;
	trialDurationDays?: number | null;
	displayOrder?: number;
	modules?: Record<string, boolean>;
	premiumFeatures?: string[];
	usageLimits?: {
		limitType: UsageLimitType;
		softLimit?: number;
		hardLimit: number;
		resetPeriod?: UsageLimitResetPeriod;
	}[];
};

// ─── E12-S1-T4: Package comparison read model ──────────────────────

export type FeatureComparisonValue = {
	included: boolean;
	limit?: string;
	note?: string;
};

export type PackageComparisonRow = {
	featureName: string;
	featureCategory: "module" | "usage-limit" | "premium-feature";
	values: Record<string, FeatureComparisonValue>;
};

export type PackageComparisonSummary = {
	id: string;
	name: string;
	description: string | null;
	basePriceCents: number;
	billingInterval: BillingInterval;
	trialDurationDays: number | null;
	displayOrder: number;
	featuredBadge?: string;
	ctaLabel: string;
};

export type PackageComparisonModel = {
	packages: PackageComparisonSummary[];
	features: PackageComparisonRow[];
};

// ─── E12-S1-T5: Package version snapshot ────────────────────────────

export type PackageVersionRecord = {
	id: string;
	createdAt: string;
	packageId: string;
	versionNumber: number;
	changeReason: string | null;
	changedBy: string;
	changedAt: string;
	entitlementsSnapshot: PackageEntitlementMap;
};

export type SubscriptionEntitlementSnapshot = {
	packageId: string;
	packageVersionNumber: number;
	contractedAt: string;
	modules: Record<string, boolean>;
	premiumFeatures: PremiumFeatureFlag[];
	usageLimits: PackageUsageLimitMap;
};

// ─── E12-S1-T3: Validation helpers ─────────────────────────────────

export type PackageValidationResult =
	| { valid: true }
	| { valid: false; reason: "missing-name" }
	| { valid: false; reason: "invalid-billing-interval"; value: string }
	| { valid: false; reason: "invalid-price"; value: number }
	| { valid: false; reason: "invalid-trial-duration"; value: number }
	| { valid: false; reason: "invalid-display-order"; value: number }
	| { valid: false; reason: "no-modules" }
	| { valid: false; reason: "invalid-module-key"; invalidKey: string }
	| { valid: false; reason: "module-dependency-violation"; module: string; missingDependency: string }
	| { valid: false; reason: "invalid-premium-feature"; invalidFlag: string }
	| { valid: false; reason: "invalid-usage-limit-type"; invalidType: string }
	| { valid: false; reason: "invalid-usage-limit-value"; limitType: string; field: string; value: number }
	| { valid: false; reason: "duplicate-name"; name: string }
	| { valid: false; reason: "package-deprecated"; packageId: string };

export function validateSubscriptionPackageInput(
	input: CreateSubscriptionPackageInput,
): PackageValidationResult {
	if (!input.name || input.name.trim().length === 0) {
		return { valid: false, reason: "missing-name" };
	}

	if (!isValidBillingInterval(input.billingInterval)) {
		return { valid: false, reason: "invalid-billing-interval", value: input.billingInterval };
	}

	if (typeof input.basePriceCents !== "number" || input.basePriceCents < 0 || !Number.isInteger(input.basePriceCents)) {
		return { valid: false, reason: "invalid-price", value: input.basePriceCents };
	}

	if (input.trialDurationDays !== undefined && input.trialDurationDays !== null) {
		if (typeof input.trialDurationDays !== "number" || input.trialDurationDays < 0 || !Number.isInteger(input.trialDurationDays)) {
			return { valid: false, reason: "invalid-trial-duration", value: input.trialDurationDays };
		}
	}

	if (typeof input.displayOrder !== "number" || !Number.isInteger(input.displayOrder)) {
		return { valid: false, reason: "invalid-display-order", value: input.displayOrder };
	}

	// Validate modules
	const moduleKeys = Object.keys(input.modules);
	if (moduleKeys.length === 0) {
		return { valid: false, reason: "no-modules" };
	}

	for (const key of moduleKeys) {
		if (!isValidModuleKey(key)) {
			return { valid: false, reason: "invalid-module-key", invalidKey: key };
		}
	}

	const enabledModules = moduleKeys.filter((k) => input.modules[k]);
	if (enabledModules.length > 0) {
		const moduleValidation = validateModuleEnablementSet(enabledModules);
		if (!moduleValidation.valid) {
			if (moduleValidation.reason === "missing-dependency") {
				return {
					valid: false,
					reason: "module-dependency-violation",
					module: moduleValidation.module,
					missingDependency: moduleValidation.missingDependency,
				};
			}
		}
	}

	// Validate premium features
	if (input.premiumFeatures) {
		for (const flag of input.premiumFeatures) {
			if (!isValidPremiumFeatureFlag(flag)) {
				return { valid: false, reason: "invalid-premium-feature", invalidFlag: flag };
			}
		}
	}

	// Validate usage limits
	if (input.usageLimits) {
		for (const limit of input.usageLimits) {
			if (!isValidUsageLimitType(limit.limitType)) {
				return { valid: false, reason: "invalid-usage-limit-type", invalidType: limit.limitType };
			}
			if (typeof limit.hardLimit !== "number" || limit.hardLimit < 0 || !Number.isInteger(limit.hardLimit)) {
				return {
					valid: false,
					reason: "invalid-usage-limit-value",
					limitType: limit.limitType,
					field: "hardLimit",
					value: limit.hardLimit,
				};
			}
			if (limit.softLimit !== undefined && limit.softLimit !== null) {
				if (typeof limit.softLimit !== "number" || limit.softLimit < 0 || !Number.isInteger(limit.softLimit)) {
					return {
						valid: false,
						reason: "invalid-usage-limit-value",
						limitType: limit.limitType,
						field: "softLimit",
						value: limit.softLimit,
					};
				}
				if (limit.softLimit > limit.hardLimit) {
					return {
						valid: false,
						reason: "invalid-usage-limit-value",
						limitType: limit.limitType,
						field: "softLimit",
						value: limit.softLimit,
					};
				}
			}
		}
	}

	return { valid: true };
}

// ─── E12-S1-T2: Entitlement extraction ─────────────────────────────

export function extractEntitlementMap(
	pkg: SubscriptionPackageWithEntitlements,
): PackageEntitlementMap {
	const modules: Record<string, boolean> = {};
	for (const ent of pkg.entitlements) {
		modules[ent.moduleKey] = ent.enabled;
	}

	const premiumFeatures: PremiumFeatureFlag[] = pkg.premiumFeatures.map(
		(pf) => pf.featureFlag,
	);

	const usageLimits: PackageUsageLimitMap = {};
	for (const ul of pkg.usageLimits) {
		usageLimits[ul.limitType] = {
			softLimit: ul.softLimit,
			hardLimit: ul.hardLimit,
			resetPeriod: ul.resetPeriod,
		};
	}

	return { modules, premiumFeatures, usageLimits };
}

// ─── E12-S1-T4: Comparison model builder ────────────────────────────

export function buildPackageComparisonModel(
	packages: SubscriptionPackageWithEntitlements[],
): PackageComparisonModel {
	const sorted = [...packages].sort(
		(a, b) => a.package.displayOrder - b.package.displayOrder,
	);

	const packageSummaries: PackageComparisonSummary[] = sorted.map((pkg) => ({
		id: pkg.package.id,
		name: pkg.package.name,
		description: pkg.package.description,
		basePriceCents: pkg.package.basePriceCents,
		billingInterval: pkg.package.billingInterval,
		trialDurationDays: pkg.package.trialDurationDays,
		displayOrder: pkg.package.displayOrder,
		ctaLabel: pkg.package.trialDurationDays
			? "Start Free Trial"
			: pkg.package.basePriceCents > 0
				? "Choose Plan"
				: "Contact Sales",
	}));

	const features: PackageComparisonRow[] = [];

	// Module rows
	const allModuleKeys = new Set<string>();
	for (const pkg of sorted) {
		for (const ent of pkg.entitlements) {
			allModuleKeys.add(ent.moduleKey);
		}
	}
	for (const moduleKey of allModuleKeys) {
		const values: Record<string, FeatureComparisonValue> = {};
		for (const pkg of sorted) {
			const ent = pkg.entitlements.find((e) => e.moduleKey === moduleKey);
			values[pkg.package.id] = {
				included: ent?.enabled ?? false,
			};
		}
		features.push({
			featureName: moduleKey,
			featureCategory: "module",
			values,
		});
	}

	// Usage limit rows
	const allLimitTypes = new Set<UsageLimitType>();
	for (const pkg of sorted) {
		for (const ul of pkg.usageLimits) {
			allLimitTypes.add(ul.limitType);
		}
	}
	for (const limitType of allLimitTypes) {
		const values: Record<string, FeatureComparisonValue> = {};
		for (const pkg of sorted) {
			const ul = pkg.usageLimits.find((l) => l.limitType === limitType);
			if (ul) {
				values[pkg.package.id] = {
					included: true,
					limit: formatUsageLimit(ul),
				};
			} else {
				values[pkg.package.id] = {
					included: true,
					limit: "Unlimited",
				};
			}
		}
		features.push({
			featureName: formatLimitTypeName(limitType),
			featureCategory: "usage-limit",
			values,
		});
	}

	// Premium feature rows
	const allPremiumFeatures = new Set<string>();
	for (const pkg of sorted) {
		for (const pf of pkg.premiumFeatures) {
			allPremiumFeatures.add(pf.featureFlag);
		}
	}
	for (const flag of allPremiumFeatures) {
		const values: Record<string, FeatureComparisonValue> = {};
		for (const pkg of sorted) {
			const has = pkg.premiumFeatures.some((pf) => pf.featureFlag === flag);
			values[pkg.package.id] = { included: has };
		}
		features.push({
			featureName: formatPremiumFeatureName(flag),
			featureCategory: "premium-feature",
			values,
		});
	}

	return { packages: packageSummaries, features };
}

function formatUsageLimit(limit: UsageLimitRecord): string {
	if (limit.softLimit !== null) {
		return `${limit.softLimit}–${limit.hardLimit}`;
	}
	return `${limit.hardLimit}`;
}

function formatLimitTypeName(limitType: UsageLimitType): string {
	const names: Record<UsageLimitType, string> = {
		orders_per_month: "Orders per Month",
		storage_gb: "Storage (GB)",
		staff_seats: "Staff Seats",
	};
	return names[limitType];
}

function formatPremiumFeatureName(flag: string): string {
	return flag
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

// ─── E12-S1-T5: Entitlement snapshot builder ───────────────────────

export function buildEntitlementSnapshot(
	pkg: SubscriptionPackageWithEntitlements,
	version: PackageVersionRecord,
): SubscriptionEntitlementSnapshot {
	return {
		packageId: pkg.package.id,
		packageVersionNumber: version.versionNumber,
		contractedAt: version.changedAt,
		modules: version.entitlementsSnapshot.modules,
		premiumFeatures: version.entitlementsSnapshot.premiumFeatures,
		usageLimits: version.entitlementsSnapshot.usageLimits,
	};
}

// ─── E12-S1-T5: Version comparison helpers ──────────────────────────

export function hasEntitlementChanges(
	before: PackageEntitlementMap,
	after: PackageEntitlementMap,
): boolean {
	// Compare modules
	const allModuleKeys = new Set([
		...Object.keys(before.modules),
		...Object.keys(after.modules),
	]);
	for (const key of allModuleKeys) {
		if ((before.modules[key] ?? false) !== (after.modules[key] ?? false)) {
			return true;
		}
	}

	// Compare premium features
	const beforeFeatures = new Set(before.premiumFeatures);
	const afterFeatures = new Set(after.premiumFeatures);
	if (beforeFeatures.size !== afterFeatures.size) return true;
	for (const f of beforeFeatures) {
		if (!afterFeatures.has(f)) return true;
	}

	// Compare usage limits
	const allLimitTypes = new Set([
		...Object.keys(before.usageLimits),
		...Object.keys(after.usageLimits),
	]);
	for (const lt of allLimitTypes) {
		const bLimit = before.usageLimits[lt as UsageLimitType];
		const aLimit = after.usageLimits[lt as UsageLimitType];
		if (!bLimit && !aLimit) continue;
		if (!bLimit || !aLimit) return true;
		if (
			bLimit.softLimit !== aLimit.softLimit ||
			bLimit.hardLimit !== aLimit.hardLimit ||
			bLimit.resetPeriod !== aLimit.resetPeriod
		) {
			return true;
		}
	}

	return false;
}
