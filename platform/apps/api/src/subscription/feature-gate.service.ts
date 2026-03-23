// E12-S2-T2: Backend feature-gate middleware service.
// Checks tenant's active subscription entitlements before processing API
// requests. Returns structured denial (HTTP 403 with upgrade-prompt payload)
// for unentitled features. Feature gating cannot be bypassed by direct API calls.

import { Injectable } from "@nestjs/common";
import type {
	FeatureGateDenial,
	FeatureGateDenialReason,
	TenantSubscriptionContext,
	UpgradePromptPayload,
	UsageLimitType,
} from "@platform/types";
import { checkUsageLimit } from "@platform/types";

// ─── Error class ────────────────────────────────────────────────────

export class FeatureGateError extends Error {
	readonly denial: FeatureGateDenial;
	readonly statusCode = 403;

	constructor(denial: FeatureGateDenial) {
		super(`Feature gate denied: ${denial.reason} — ${denial.requiredFeature}`);
		this.name = "FeatureGateError";
		this.denial = denial;
	}
}

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class FeatureGateService {
	/**
	 * Checks whether the tenant's subscription entitles access to a module.
	 * Returns a FeatureGateDenial if not entitled, or null if access is allowed.
	 */
	checkModuleAccess(
		subscription: TenantSubscriptionContext | null,
		moduleKey: string,
	): FeatureGateDenial | null {
		if (!subscription) {
			return this.buildDenial(
				"subscription-expired",
				moduleKey,
				null,
			);
		}

		if (
			subscription.status === "canceled" ||
			subscription.status === "expired"
		) {
			return this.buildDenial(
				"subscription-canceled",
				moduleKey,
				subscription.packageName,
			);
		}

		if (subscription.status === "grace_period") {
			return this.buildDenial(
				"grace-period-read-only",
				moduleKey,
				subscription.packageName,
			);
		}

		if (subscription.entitlements.modules[moduleKey] !== true) {
			return this.buildDenial(
				"module-not-entitled",
				moduleKey,
				subscription.packageName,
			);
		}

		return null;
	}

	/**
	 * Checks whether the tenant's subscription entitles access to a premium feature.
	 */
	checkPremiumFeatureAccess(
		subscription: TenantSubscriptionContext | null,
		featureFlag: string,
	): FeatureGateDenial | null {
		if (!subscription) {
			return this.buildDenial(
				"subscription-expired",
				featureFlag,
				null,
			);
		}

		if (
			subscription.status === "canceled" ||
			subscription.status === "expired"
		) {
			return this.buildDenial(
				"subscription-canceled",
				featureFlag,
				subscription.packageName,
			);
		}

		if (
			!subscription.entitlements.premiumFeatures.includes(
				featureFlag as never,
			)
		) {
			return this.buildDenial(
				"premium-feature-not-entitled",
				featureFlag,
				subscription.packageName,
			);
		}

		return null;
	}

	/**
	 * Checks whether a usage limit allows the operation to proceed.
	 * Returns a denial if the hard limit has been reached.
	 */
	checkUsageLimitAccess(
		subscription: TenantSubscriptionContext | null,
		limitType: UsageLimitType,
		currentUsage: number,
	): FeatureGateDenial | null {
		if (!subscription) {
			return this.buildDenial(
				"subscription-expired",
				limitType,
				null,
			);
		}

		const limitConfig = subscription.entitlements.usageLimits[limitType];
		if (!limitConfig) {
			// No limit configured means unlimited
			return null;
		}

		const result = checkUsageLimit(limitType, currentUsage, limitConfig);
		if (result.status === "hard-limit-reached") {
			return this.buildDenial(
				"usage-limit-exceeded",
				limitType,
				subscription.packageName,
			);
		}

		return null;
	}

	/**
	 * Throws a FeatureGateError if module access is not entitled.
	 * Use this in service methods that should be blocked for unentitled features.
	 */
	requireModuleAccess(
		subscription: TenantSubscriptionContext | null,
		moduleKey: string,
	): void {
		const denial = this.checkModuleAccess(subscription, moduleKey);
		if (denial) {
			throw new FeatureGateError(denial);
		}
	}

	/**
	 * Throws a FeatureGateError if premium feature access is not entitled.
	 */
	requirePremiumFeatureAccess(
		subscription: TenantSubscriptionContext | null,
		featureFlag: string,
	): void {
		const denial = this.checkPremiumFeatureAccess(subscription, featureFlag);
		if (denial) {
			throw new FeatureGateError(denial);
		}
	}

	/**
	 * Throws a FeatureGateError if usage limit has been reached.
	 */
	requireUsageLimitAccess(
		subscription: TenantSubscriptionContext | null,
		limitType: UsageLimitType,
		currentUsage: number,
	): void {
		const denial = this.checkUsageLimitAccess(
			subscription,
			limitType,
			currentUsage,
		);
		if (denial) {
			throw new FeatureGateError(denial);
		}
	}

	// ── Private helpers ─────────────────────────────────────────────

	private buildDenial(
		reason: FeatureGateDenialReason,
		requiredFeature: string,
		currentPackage: string | null,
	): FeatureGateDenial {
		return {
			denied: true,
			reason,
			requiredFeature,
			currentPackage,
			upgradePrompt: this.buildUpgradePrompt(reason, requiredFeature),
		};
	}

	private buildUpgradePrompt(
		reason: FeatureGateDenialReason,
		requiredFeature: string,
	): UpgradePromptPayload {
		const messages: Record<FeatureGateDenialReason, string> = {
			"module-not-entitled": `Upgrade your plan to access the ${requiredFeature} module.`,
			"premium-feature-not-entitled": `Upgrade your plan to unlock ${requiredFeature}.`,
			"usage-limit-exceeded": `You have reached your ${requiredFeature} limit. Upgrade to increase your allowance.`,
			"subscription-expired":
				"Your subscription has expired. Renew or upgrade to continue.",
			"subscription-canceled":
				"Your subscription has been canceled. Subscribe to a plan to continue.",
			"grace-period-read-only":
				"Your subscription is in a grace period. Data is read-only. Renew to regain full access.",
		};

		return {
			message: messages[reason],
			suggestedPackageId: null,
			suggestedPackageName: null,
			ctaLabel: reason === "subscription-expired" || reason === "subscription-canceled"
				? "Subscribe Now"
				: "Upgrade Plan",
			ctaUrl: "/settings/billing/upgrade",
		};
	}
}
