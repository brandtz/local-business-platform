// E12-S2-T5: Usage-limit enforcement service.
// Enforces soft and hard limits for transaction-limited packages (e.g., 100 orders/month).
// Provides warning notifications before hard cutoff.

import { Injectable } from "@nestjs/common";
import type {
	TenantSubscriptionContext,
	UsageLimitCheckResult,
	UsageLimitNotification,
	UsageLimitType,
	UsageTrackingRecord,
} from "@platform/types";
import { checkUsageLimit } from "@platform/types";

// ─── In-memory usage tracking (production would use database) ───────

const usageStore = new Map<string, UsageTrackingRecord>();

function buildUsageKey(tenantId: string, limitType: UsageLimitType): string {
	return `${tenantId}:${limitType}`;
}

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class UsageLimitEnforcementService {
	/**
	 * Checks a tenant's usage against their subscription's limits for a specific type.
	 * Returns the check result with status, current usage, and warning message.
	 */
	checkLimit(
		subscription: TenantSubscriptionContext | null,
		limitType: UsageLimitType,
		currentUsage: number,
	): UsageLimitCheckResult {
		if (!subscription) {
			return {
				limitType,
				status: "hard-limit-reached",
				currentUsage,
				softLimit: null,
				hardLimit: 0,
				remainingBeforeHard: 0,
				warningMessage: "No active subscription. Usage is blocked.",
			};
		}

		const limitConfig = subscription.entitlements.usageLimits[limitType];
		if (!limitConfig) {
			// No limit configured — unlimited
			return {
				limitType,
				status: "within-limits",
				currentUsage,
				softLimit: null,
				hardLimit: Number.MAX_SAFE_INTEGER,
				remainingBeforeHard: Number.MAX_SAFE_INTEGER - currentUsage,
				warningMessage: null,
			};
		}

		return checkUsageLimit(limitType, currentUsage, limitConfig);
	}

	/**
	 * Increments usage count and returns whether the operation is allowed.
	 * Returns the updated check result after incrementing.
	 */
	incrementAndCheck(
		subscription: TenantSubscriptionContext | null,
		limitType: UsageLimitType,
		tenantId: string,
	): { allowed: boolean; result: UsageLimitCheckResult; notification: UsageLimitNotification | null } {
		const currentUsage = this.getCurrentUsage(tenantId, limitType);
		const preCheck = this.checkLimit(subscription, limitType, currentUsage);

		if (preCheck.status === "hard-limit-reached") {
			return {
				allowed: false,
				result: preCheck,
				notification: this.buildNotification(tenantId, preCheck),
			};
		}

		// Increment usage
		const newUsage = currentUsage + 1;
		this.setCurrentUsage(tenantId, limitType, newUsage);

		const postCheck = this.checkLimit(subscription, limitType, newUsage);
		const notification =
			postCheck.status !== "within-limits"
				? this.buildNotification(tenantId, postCheck)
				: null;

		return {
			allowed: true,
			result: postCheck,
			notification,
		};
	}

	/**
	 * Returns the current usage count for a tenant and limit type.
	 */
	getCurrentUsage(tenantId: string, limitType: UsageLimitType): number {
		const key = buildUsageKey(tenantId, limitType);
		return usageStore.get(key)?.currentUsage ?? 0;
	}

	/**
	 * Sets the current usage count for a tenant and limit type.
	 */
	setCurrentUsage(
		tenantId: string,
		limitType: UsageLimitType,
		usage: number,
	): void {
		const key = buildUsageKey(tenantId, limitType);
		const now = new Date().toISOString();
		const existing = usageStore.get(key);
		usageStore.set(key, {
			tenantId,
			limitType,
			currentUsage: usage,
			periodStart: existing?.periodStart ?? now,
			periodEnd: existing?.periodEnd ?? now,
			lastUpdated: now,
		});
	}

	/**
	 * Resets usage tracking for a tenant and limit type (e.g., at period reset).
	 */
	resetUsage(tenantId: string, limitType: UsageLimitType): void {
		const key = buildUsageKey(tenantId, limitType);
		usageStore.delete(key);
	}

	/**
	 * Resets all usage tracking (for testing).
	 */
	resetAllUsage(): void {
		usageStore.clear();
	}

	// ── Private helpers ─────────────────────────────────────────────

	private buildNotification(
		tenantId: string,
		result: UsageLimitCheckResult,
	): UsageLimitNotification {
		return {
			tenantId,
			limitType: result.limitType,
			status: result.status,
			currentUsage: result.currentUsage,
			hardLimit: result.hardLimit,
			message: result.warningMessage ?? "",
			emittedAt: new Date().toISOString(),
		};
	}
}
