// E12-S2-T1: Entitlement resolution service — consumes subscription-tier
// entitlements as the authoritative source of feature availability.
// Subscription entitlements override or merge with manual module assignments.

import { Injectable } from "@nestjs/common";
import type {
	EntitlementResolutionResult,
	PackageEntitlementMap,
	TenantSubscriptionContext,
} from "@platform/types";
import { resolveEffectiveModules } from "@platform/types";

// ─── Types ──────────────────────────────────────────────────────────

export type EntitlementResolutionInput = {
	tenantId: string;
	subscription: TenantSubscriptionContext | null;
	manualModules: readonly string[];
};

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class EntitlementResolutionService {
	/**
	 * Resolves the effective module enablement for a tenant by merging
	 * subscription entitlements (authoritative) with manual module assignments.
	 */
	resolveModules(input: EntitlementResolutionInput): EntitlementResolutionResult {
		const subscriptionEntitlements = input.subscription?.entitlements ?? null;
		return resolveEffectiveModules(subscriptionEntitlements, input.manualModules);
	}

	/**
	 * Returns the full entitlement map for a tenant's active subscription.
	 * Returns null if the tenant has no active subscription.
	 */
	getEntitlementMap(
		subscription: TenantSubscriptionContext | null,
	): PackageEntitlementMap | null {
		if (!subscription) return null;
		return subscription.entitlements;
	}

	/**
	 * Checks whether a specific module is entitled for the tenant based
	 * on their active subscription.
	 */
	isModuleEntitled(
		subscription: TenantSubscriptionContext | null,
		moduleKey: string,
	): boolean {
		if (!subscription) return false;
		return subscription.entitlements.modules[moduleKey] === true;
	}

	/**
	 * Checks whether a specific premium feature is entitled for the tenant.
	 */
	isPremiumFeatureEntitled(
		subscription: TenantSubscriptionContext | null,
		featureFlag: string,
	): boolean {
		if (!subscription) return false;
		return subscription.entitlements.premiumFeatures.includes(
			featureFlag as never,
		);
	}
}
