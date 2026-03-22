// E12-S1-T3: In-memory repository for subscription package CRUD.
// Production persistence (Prisma) will be wired in E12-S3/S4. This
// follows the same in-memory pattern used by PaymentConnectionRepository.

import type {
	BillingInterval,
	PackageEntitlementMap,
	PackageEntitlementRecord,
	PackageStatus,
	PackageVersionRecord,
	PremiumFeatureFlag,
	PremiumFeatureRecord,
	SubscriptionPackageRecord,
	UsageLimitRecord,
	UsageLimitResetPeriod,
	UsageLimitType,
} from "@platform/types";

// ─── ID generation ──────────────────────────────────────────────────

const idCounters: Record<string, number> = {
	package: 0,
	entitlement: 0,
	usageLimit: 0,
	premiumFeature: 0,
	version: 0,
};

function nextId(prefix: string): string {
	idCounters[prefix] = (idCounters[prefix] ?? 0) + 1;
	return `${prefix}-${idCounters[prefix]}`;
}

function now(): string {
	return new Date().toISOString();
}

// ─── Storage ────────────────────────────────────────────────────────

export class SubscriptionPackageRepository {
	private packages: SubscriptionPackageRecord[] = [];
	private entitlements: PackageEntitlementRecord[] = [];
	private usageLimits: UsageLimitRecord[] = [];
	private premiumFeatures: PremiumFeatureRecord[] = [];
	private versions: PackageVersionRecord[] = [];

	// ── Package CRUD ────────────────────────────────────────────────

	createPackage(data: {
		name: string;
		description: string | null;
		billingInterval: BillingInterval;
		basePriceCents: number;
		trialDurationDays: number | null;
		displayOrder: number;
	}): SubscriptionPackageRecord {
		const existing = this.packages.find(
			(p) => p.name === data.name,
		);
		if (existing) {
			throw new Error(`Package with name '${data.name}' already exists.`);
		}

		const timestamp = now();
		const record: SubscriptionPackageRecord = {
			id: nextId("package"),
			createdAt: timestamp,
			updatedAt: timestamp,
			name: data.name,
			description: data.description,
			billingInterval: data.billingInterval,
			basePriceCents: data.basePriceCents,
			trialDurationDays: data.trialDurationDays,
			status: "active",
			deprecatedAt: null,
			displayOrder: data.displayOrder,
		};
		this.packages.push(record);
		return record;
	}

	getPackageById(packageId: string): SubscriptionPackageRecord | null {
		return this.packages.find((p) => p.id === packageId) ?? null;
	}

	getPackageByName(name: string): SubscriptionPackageRecord | null {
		return this.packages.find((p) => p.name === name) ?? null;
	}

	listPackages(filter?: { status?: PackageStatus }): SubscriptionPackageRecord[] {
		let results = [...this.packages];
		if (filter?.status) {
			results = results.filter((p) => p.status === filter.status);
		}
		return results.sort((a, b) => a.displayOrder - b.displayOrder);
	}

	updatePackage(
		packageId: string,
		data: Partial<{
			name: string;
			description: string | null;
			billingInterval: BillingInterval;
			basePriceCents: number;
			trialDurationDays: number | null;
			displayOrder: number;
		}>,
	): SubscriptionPackageRecord | null {
		const pkg = this.packages.find((p) => p.id === packageId);
		if (!pkg) return null;

		if (data.name !== undefined) {
			const conflict = this.packages.find(
				(p) => p.name === data.name && p.id !== packageId,
			);
			if (conflict) {
				throw new Error(`Package with name '${data.name}' already exists.`);
			}
			pkg.name = data.name;
		}
		if (data.description !== undefined) pkg.description = data.description;
		if (data.billingInterval !== undefined) pkg.billingInterval = data.billingInterval;
		if (data.basePriceCents !== undefined) pkg.basePriceCents = data.basePriceCents;
		if (data.trialDurationDays !== undefined) pkg.trialDurationDays = data.trialDurationDays;
		if (data.displayOrder !== undefined) pkg.displayOrder = data.displayOrder;
		pkg.updatedAt = now();
		return pkg;
	}

	deprecatePackage(packageId: string): SubscriptionPackageRecord | null {
		const pkg = this.packages.find((p) => p.id === packageId);
		if (!pkg) return null;
		pkg.status = "deprecated";
		pkg.deprecatedAt = now();
		pkg.updatedAt = now();
		return pkg;
	}

	// ── Entitlements CRUD ───────────────────────────────────────────

	setEntitlements(
		packageId: string,
		modules: Record<string, boolean>,
	): PackageEntitlementRecord[] {
		// Remove existing entitlements for this package
		this.entitlements = this.entitlements.filter(
			(e) => e.packageId !== packageId,
		);

		const timestamp = now();
		const records: PackageEntitlementRecord[] = [];
		for (const [moduleKey, enabled] of Object.entries(modules)) {
			const record: PackageEntitlementRecord = {
				id: nextId("entitlement"),
				createdAt: timestamp,
				packageId,
				moduleKey,
				enabled,
			};
			this.entitlements.push(record);
			records.push(record);
		}
		return records;
	}

	getEntitlements(packageId: string): PackageEntitlementRecord[] {
		return this.entitlements.filter((e) => e.packageId === packageId);
	}

	// ── Usage Limits CRUD ───────────────────────────────────────────

	setUsageLimits(
		packageId: string,
		limits: {
			limitType: UsageLimitType;
			softLimit: number | null;
			hardLimit: number;
			resetPeriod: UsageLimitResetPeriod;
		}[],
	): UsageLimitRecord[] {
		// Remove existing limits for this package
		this.usageLimits = this.usageLimits.filter(
			(l) => l.packageId !== packageId,
		);

		const timestamp = now();
		const records: UsageLimitRecord[] = [];
		for (const limit of limits) {
			const record: UsageLimitRecord = {
				id: nextId("usageLimit"),
				createdAt: timestamp,
				packageId,
				limitType: limit.limitType,
				softLimit: limit.softLimit,
				hardLimit: limit.hardLimit,
				resetPeriod: limit.resetPeriod,
			};
			this.usageLimits.push(record);
			records.push(record);
		}
		return records;
	}

	getUsageLimits(packageId: string): UsageLimitRecord[] {
		return this.usageLimits.filter((l) => l.packageId === packageId);
	}

	// ── Premium Features CRUD ───────────────────────────────────────

	setPremiumFeatures(
		packageId: string,
		features: string[],
	): PremiumFeatureRecord[] {
		// Remove existing features for this package
		this.premiumFeatures = this.premiumFeatures.filter(
			(f) => f.packageId !== packageId,
		);

		const timestamp = now();
		const records: PremiumFeatureRecord[] = [];
		for (const flag of features) {
			const record: PremiumFeatureRecord = {
				id: nextId("premiumFeature"),
				createdAt: timestamp,
				packageId,
				featureFlag: flag as PremiumFeatureFlag,
			};
			this.premiumFeatures.push(record);
			records.push(record);
		}
		return records;
	}

	getPremiumFeatures(packageId: string): PremiumFeatureRecord[] {
		return this.premiumFeatures.filter((f) => f.packageId === packageId);
	}

	// ── Versions ────────────────────────────────────────────────────

	createVersion(data: {
		packageId: string;
		versionNumber: number;
		changeReason: string | null;
		changedBy: string;
		entitlementsSnapshot: PackageEntitlementMap;
	}): PackageVersionRecord {
		const timestamp = now();
		const record: PackageVersionRecord = {
			id: nextId("version"),
			createdAt: timestamp,
			packageId: data.packageId,
			versionNumber: data.versionNumber,
			changeReason: data.changeReason,
			changedBy: data.changedBy,
			changedAt: timestamp,
			entitlementsSnapshot: data.entitlementsSnapshot,
		};
		this.versions.push(record);
		return record;
	}

	getLatestVersion(packageId: string): PackageVersionRecord | null {
		const versions = this.versions
			.filter((v) => v.packageId === packageId)
			.sort((a, b) => b.versionNumber - a.versionNumber);
		return versions[0] ?? null;
	}

	getVersionByNumber(
		packageId: string,
		versionNumber: number,
	): PackageVersionRecord | null {
		return (
			this.versions.find(
				(v) =>
					v.packageId === packageId &&
					v.versionNumber === versionNumber,
			) ?? null
		);
	}

	listVersions(packageId: string): PackageVersionRecord[] {
		return this.versions
			.filter((v) => v.packageId === packageId)
			.sort((a, b) => a.versionNumber - b.versionNumber);
	}
}
