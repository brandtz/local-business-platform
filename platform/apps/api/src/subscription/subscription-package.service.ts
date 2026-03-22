// E12-S1-T3: Subscription package CRUD service for platform admin.
// Handles create, update, deprecate, list with full entitlement details,
// and package versioning. Packages are platform-level (not per-tenant).
//
// E12-S1-T5: When entitlements change on update, a new version snapshot
// is created so existing subscribers retain their contracted entitlements
// until they explicitly upgrade or renew.

import { Injectable } from "@nestjs/common";
import type {
	CreateSubscriptionPackageInput,
	PackageComparisonModel,
	PackageEntitlementMap,
	PackageVersionRecord,
	SubscriptionPackageWithEntitlements,
	UpdateSubscriptionPackageInput,
	UsageLimitResetPeriod,
} from "@platform/types";
import {
	buildPackageComparisonModel,
	extractEntitlementMap,
	hasEntitlementChanges,
	validateSubscriptionPackageInput,
} from "@platform/types";
import { SubscriptionPackageRepository } from "./subscription-package.repository";

// ─── Error classes ──────────────────────────────────────────────────

export class SubscriptionPackageNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SubscriptionPackageNotFoundError";
	}
}

export class SubscriptionPackageValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SubscriptionPackageValidationError";
	}
}

export class SubscriptionPackageDuplicateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SubscriptionPackageDuplicateError";
	}
}

export class SubscriptionPackageDeprecatedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SubscriptionPackageDeprecatedError";
	}
}

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class SubscriptionPackageService {
	constructor(
		private readonly repository: SubscriptionPackageRepository = new SubscriptionPackageRepository(),
	) {}

	// ── E12-S1-T3: Create package ─────────────────────────────────

	createPackage(
		input: CreateSubscriptionPackageInput,
		actorId: string,
	): SubscriptionPackageWithEntitlements {
		// Validate input
		const validation = validateSubscriptionPackageInput(input);
		if (!validation.valid) {
			throw new SubscriptionPackageValidationError(
				`Invalid package input: ${validation.reason}`,
			);
		}

		// Check for duplicate name
		const existing = this.repository.getPackageByName(input.name);
		if (existing) {
			throw new SubscriptionPackageDuplicateError(
				`Package with name '${input.name}' already exists.`,
			);
		}

		// Create package record
		const pkg = this.repository.createPackage({
			name: input.name,
			description: input.description ?? null,
			billingInterval: input.billingInterval,
			basePriceCents: input.basePriceCents,
			trialDurationDays: input.trialDurationDays ?? null,
			displayOrder: input.displayOrder,
		});

		// Set entitlements
		const entitlements = this.repository.setEntitlements(
			pkg.id,
			input.modules,
		);

		// Set usage limits
		const usageLimits = this.repository.setUsageLimits(
			pkg.id,
			(input.usageLimits ?? []).map((l) => ({
				limitType: l.limitType,
				softLimit: l.softLimit ?? null,
				hardLimit: l.hardLimit,
				resetPeriod: l.resetPeriod ?? ("monthly" as UsageLimitResetPeriod),
			})),
		);

		// Set premium features
		const premiumFeatures = this.repository.setPremiumFeatures(
			pkg.id,
			input.premiumFeatures ?? [],
		);

		const result: SubscriptionPackageWithEntitlements = {
			package: pkg,
			entitlements,
			usageLimits,
			premiumFeatures,
		};

		// Create initial version (E12-S1-T5)
		this.repository.createVersion({
			packageId: pkg.id,
			versionNumber: 1,
			changeReason: "Initial package creation",
			changedBy: actorId,
			entitlementsSnapshot: extractEntitlementMap(result),
		});

		return result;
	}

	// ── E12-S1-T3: Update package ─────────────────────────────────

	updatePackage(
		packageId: string,
		input: UpdateSubscriptionPackageInput,
		actorId: string,
	): SubscriptionPackageWithEntitlements {
		const pkg = this.repository.getPackageById(packageId);
		if (!pkg) {
			throw new SubscriptionPackageNotFoundError(
				`Package '${packageId}' not found.`,
			);
		}

		if (pkg.status === "deprecated") {
			throw new SubscriptionPackageDeprecatedError(
				`Cannot update deprecated package '${packageId}'.`,
			);
		}

		// Capture current entitlements for version comparison
		const beforeEntitlements = extractEntitlementMap(
			this.getPackageWithEntitlements(packageId),
		);

		// Update core package fields
		const packageFieldKeys = [
			"name", "description", "billingInterval",
			"basePriceCents", "trialDurationDays", "displayOrder",
		] as const;
		const updateData: Record<string, unknown> = {};
		for (const key of packageFieldKeys) {
			if (input[key] !== undefined) {
				updateData[key] = input[key];
			}
		}
		if (Object.keys(updateData).length > 0) {
			this.repository.updatePackage(packageId, updateData);
		}

		// Update entitlements if provided
		if (input.modules !== undefined) {
			this.repository.setEntitlements(packageId, input.modules);
		}

		// Update usage limits if provided
		if (input.usageLimits !== undefined) {
			this.repository.setUsageLimits(
				packageId,
				input.usageLimits.map((l) => ({
					limitType: l.limitType,
					softLimit: l.softLimit ?? null,
					hardLimit: l.hardLimit,
					resetPeriod: l.resetPeriod ?? ("monthly" as UsageLimitResetPeriod),
				})),
			);
		}

		// Update premium features if provided
		if (input.premiumFeatures !== undefined) {
			this.repository.setPremiumFeatures(packageId, input.premiumFeatures);
		}

		const result = this.getPackageWithEntitlements(packageId);

		// E12-S1-T5: Create new version if entitlements changed
		const afterEntitlements = extractEntitlementMap(result);
		if (hasEntitlementChanges(beforeEntitlements, afterEntitlements)) {
			const latestVersion = this.repository.getLatestVersion(packageId);
			const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;
			this.repository.createVersion({
				packageId,
				versionNumber: nextVersionNumber,
				changeReason: "Package entitlements updated",
				changedBy: actorId,
				entitlementsSnapshot: afterEntitlements,
			});
		}

		return result;
	}

	// ── E12-S1-T3: Deprecate package ──────────────────────────────

	deprecatePackage(packageId: string): SubscriptionPackageWithEntitlements {
		const pkg = this.repository.getPackageById(packageId);
		if (!pkg) {
			throw new SubscriptionPackageNotFoundError(
				`Package '${packageId}' not found.`,
			);
		}

		if (pkg.status === "deprecated") {
			throw new SubscriptionPackageDeprecatedError(
				`Package '${packageId}' is already deprecated.`,
			);
		}

		this.repository.deprecatePackage(packageId);
		return this.getPackageWithEntitlements(packageId);
	}

	// ── E12-S1-T3: Get single package ─────────────────────────────

	getPackage(packageId: string): SubscriptionPackageWithEntitlements {
		const result = this.getPackageWithEntitlements(packageId);
		return result;
	}

	// ── E12-S1-T3: List packages ──────────────────────────────────

	listPackages(filter?: {
		status?: "active" | "deprecated";
	}): SubscriptionPackageWithEntitlements[] {
		const packages = this.repository.listPackages(filter);
		return packages.map((pkg) => ({
			package: pkg,
			entitlements: this.repository.getEntitlements(pkg.id),
			usageLimits: this.repository.getUsageLimits(pkg.id),
			premiumFeatures: this.repository.getPremiumFeatures(pkg.id),
		}));
	}

	// ── E12-S1-T3: List active packages (for new subscriptions) ───

	listActivePackages(): SubscriptionPackageWithEntitlements[] {
		return this.listPackages({ status: "active" });
	}

	// ── E12-S1-T4: Package comparison model ───────────────────────

	getPackageComparisonModel(): PackageComparisonModel {
		const activePackages = this.listActivePackages();
		return buildPackageComparisonModel(activePackages);
	}

	// ── E12-S1-T5: Get contracted entitlements for a version ──────

	getEntitlementsForVersion(
		packageId: string,
		versionNumber: number,
	): PackageEntitlementMap | null {
		const version = this.repository.getVersionByNumber(
			packageId,
			versionNumber,
		);
		if (!version) return null;
		return version.entitlementsSnapshot;
	}

	// ── E12-S1-T5: Get latest version ─────────────────────────────

	getLatestVersion(packageId: string): PackageVersionRecord | null {
		return this.repository.getLatestVersion(packageId);
	}

	// ── E12-S1-T5: List versions ──────────────────────────────────

	listVersions(packageId: string): PackageVersionRecord[] {
		return this.repository.listVersions(packageId);
	}

	// ── Private helpers ─────────────────────────────────────────────

	private getPackageWithEntitlements(
		packageId: string,
	): SubscriptionPackageWithEntitlements {
		const pkg = this.repository.getPackageById(packageId);
		if (!pkg) {
			throw new SubscriptionPackageNotFoundError(
				`Package '${packageId}' not found.`,
			);
		}
		return {
			package: pkg,
			entitlements: this.repository.getEntitlements(packageId),
			usageLimits: this.repository.getUsageLimits(packageId),
			premiumFeatures: this.repository.getPremiumFeatures(packageId),
		};
	}
}
