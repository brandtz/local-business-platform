// E12-S2-T4: Downgrade protection service — ensures no data loss on downgrade.
// When a tenant downgrades from a higher tier, data for lost modules becomes
// read-only (never deleted). Grace period allows temporary continued access.

import { Injectable } from "@nestjs/common";
import type {
	DowngradeDataPolicy,
	DowngradeImpactAssessment,
	DowngradeModulePolicy,
	PackageEntitlementMap,
	TenantSubscriptionContext,
	UsageLimitType,
} from "@platform/types";

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_GRACE_PERIOD_DAYS = 14;

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class DowngradeProtectionService {
	/**
	 * Assesses the impact of downgrading from one package to another.
	 * Returns affected modules, features, and usage limits with their policies.
	 */
	assessDowngradeImpact(
		tenantId: string,
		fromEntitlements: PackageEntitlementMap,
		toEntitlements: PackageEntitlementMap,
		fromPackageId: string,
		toPackageId: string,
		currentUsage: Record<string, number>,
	): DowngradeImpactAssessment {
		const affectedModules = this.getAffectedModules(
			fromEntitlements,
			toEntitlements,
		);
		const affectedPremiumFeatures = this.getAffectedPremiumFeatures(
			fromEntitlements,
			toEntitlements,
		);
		const affectedUsageLimits = this.getAffectedUsageLimits(
			fromEntitlements,
			toEntitlements,
			currentUsage,
		);

		const gracePeriodEnd = new Date();
		gracePeriodEnd.setDate(
			gracePeriodEnd.getDate() + DEFAULT_GRACE_PERIOD_DAYS,
		);

		return {
			tenantId,
			fromPackageId,
			toPackageId,
			affectedModules,
			affectedPremiumFeatures,
			affectedUsageLimits,
			gracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS,
			gracePeriodEnd: gracePeriodEnd.toISOString(),
		};
	}

	/**
	 * Determines the data policy for a module after downgrade.
	 * Data is NEVER deleted — always read-only or archived.
	 */
	getModuleDowngradePolicy(moduleKey: string): DowngradeModulePolicy {
		return {
			moduleKey,
			dataPolicy: this.getDataPolicyForModule(moduleKey),
			accessLevel: "read-only",
			preserveData: true,
			description: `Data for ${moduleKey} module is preserved in read-only mode after downgrade.`,
		};
	}

	/**
	 * Checks whether a write operation should be blocked during grace period.
	 * During grace period, lost modules become read-only (reads allowed, writes blocked).
	 */
	isWriteBlockedDuringGracePeriod(
		subscription: TenantSubscriptionContext | null,
		moduleKey: string,
	): boolean {
		if (!subscription) return true;

		if (subscription.status !== "grace_period") return false;

		// During grace period, check if the module is still entitled
		return subscription.entitlements.modules[moduleKey] !== true;
	}

	/**
	 * Returns the number of grace period days remaining for a subscription.
	 * Returns 0 if not in grace period or if grace period has expired.
	 */
	getGracePeriodDaysRemaining(
		subscription: TenantSubscriptionContext | null,
	): number {
		if (!subscription || !subscription.gracePeriodEnd) return 0;
		if (subscription.status !== "grace_period") return 0;

		const now = new Date();
		const end = new Date(subscription.gracePeriodEnd);
		const diffMs = end.getTime() - now.getTime();
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		return Math.max(0, diffDays);
	}

	// ── Private helpers ─────────────────────────────────────────────

	private getAffectedModules(
		from: PackageEntitlementMap,
		to: PackageEntitlementMap,
	): DowngradeModulePolicy[] {
		const affected: DowngradeModulePolicy[] = [];

		for (const [key, wasEnabled] of Object.entries(from.modules)) {
			const isStillEnabled = to.modules[key] === true;
			if (wasEnabled && !isStillEnabled) {
				affected.push(this.getModuleDowngradePolicy(key));
			}
		}

		return affected;
	}

	private getAffectedPremiumFeatures(
		from: PackageEntitlementMap,
		to: PackageEntitlementMap,
	): string[] {
		const toFeatures = new Set(to.premiumFeatures);
		return from.premiumFeatures.filter((f) => !toFeatures.has(f));
	}

	private getAffectedUsageLimits(
		from: PackageEntitlementMap,
		to: PackageEntitlementMap,
		currentUsage: Record<string, number>,
	): DowngradeImpactAssessment["affectedUsageLimits"] {
		const affected: DowngradeImpactAssessment["affectedUsageLimits"] = [];

		for (const [lt, fromLimit] of Object.entries(from.usageLimits)) {
			if (!fromLimit) continue;
			const limitType = lt as UsageLimitType;
			const toLimit = to.usageLimits[limitType];
			const usage = currentUsage[limitType] ?? 0;

			if (toLimit && toLimit.hardLimit < fromLimit.hardLimit) {
				affected.push({
					limitType,
					currentUsage: usage,
					newHardLimit: toLimit.hardLimit,
					willExceed: usage > toLimit.hardLimit,
				});
			} else if (!toLimit) {
				// Limit removed entirely in new package — means unlimited
				// No impact
			}
		}

		return affected;
	}

	private getDataPolicyForModule(moduleKey: string): DowngradeDataPolicy {
		// Content-related modules use "archived" policy
		const archivedModules = ["content", "portfolio"];
		if (archivedModules.includes(moduleKey)) {
			return "archived";
		}

		// All other modules use "read-only" policy
		return "read-only";
	}
}
