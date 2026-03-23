import { Injectable } from "@nestjs/common";
import type {
	LoyaltyProgramConfig,
	CreateLoyaltyProgramInput,
	UpdateLoyaltyProgramInput,
	PointAccumulationInput,
	PointAccumulationResult,
	PointRedemptionInput,
	PointRedemptionResult,
	PointExpirationResult,
	PointExpirationBatchResult,
	PointLedgerEntry,
	PointLedgerResponse,
	ManualPointAdjustmentInput,
	ManualPointAdjustmentResult,
	LoyaltyTabData,
	AdminCustomerLoyaltySummary,
} from "@platform/types";
import {
	calculatePointsForOrder,
	computeLoyaltyTier,
	computeRedemptionDiscount,
	validateLoyaltyProgramConfig,
	buildLoyaltyTabData,
	deriveCustomerTags,
} from "@platform/types";

import { LoyaltyRepository } from "./loyalty.repository";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class LoyaltyConfigNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LoyaltyConfigNotFoundError";
	}
}

export class LoyaltyValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LoyaltyValidationError";
	}
}

export class InsufficientPointsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InsufficientPointsError";
	}
}

export class LoyaltyProgramDisabledError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LoyaltyProgramDisabledError";
	}
}

// ---------------------------------------------------------------------------
// E11-S2: Loyalty Service — orchestrates loyalty program operations
// ---------------------------------------------------------------------------

@Injectable()
export class LoyaltyService {
	constructor(
		private readonly repository: LoyaltyRepository = new LoyaltyRepository(),
	) {}

	// ── T1: Loyalty Configuration CRUD ──────────────────────────────────────

	getConfig(tenantId: string): LoyaltyProgramConfig {
		return this.repository.getOrCreateConfig(tenantId);
	}

	createConfig(input: CreateLoyaltyProgramInput): LoyaltyProgramConfig {
		const existing = this.repository.getConfig(input.tenantId);
		if (existing) {
			throw new LoyaltyValidationError("Loyalty program already configured for this tenant.");
		}

		const toValidate = {
			tiers: input.tiers ?? [],
			pointsPerDollar: input.pointsPerDollar ?? 1,
			pointsPerOrder: input.pointsPerOrder ?? 10,
			pointRedemptionRate: input.pointRedemptionRate ?? 100,
			minimumRedemptionPoints: input.minimumRedemptionPoints ?? 100,
			expirationDays: input.expirationDays ?? 365,
		};

		if (input.tiers) {
			const errors = validateLoyaltyProgramConfig(toValidate);
			if (errors.length > 0) {
				throw new LoyaltyValidationError(errors.join(" "));
			}
		}

		return this.repository.createConfig(input);
	}

	updateConfig(tenantId: string, input: UpdateLoyaltyProgramInput): LoyaltyProgramConfig {
		const existing = this.repository.getConfig(tenantId);
		if (!existing) {
			throw new LoyaltyConfigNotFoundError(`No loyalty config for tenant ${tenantId}.`);
		}

		if (input.tiers) {
			const merged = {
				tiers: input.tiers,
				pointsPerDollar: input.pointsPerDollar ?? existing.pointsPerDollar,
				pointsPerOrder: input.pointsPerOrder ?? existing.pointsPerOrder,
				pointRedemptionRate: input.pointRedemptionRate ?? existing.pointRedemptionRate,
				minimumRedemptionPoints: input.minimumRedemptionPoints ?? existing.minimumRedemptionPoints,
				expirationDays: input.expirationDays ?? existing.expirationDays,
			};
			const errors = validateLoyaltyProgramConfig(merged);
			if (errors.length > 0) {
				throw new LoyaltyValidationError(errors.join(" "));
			}
		}

		const updated = this.repository.updateConfig(tenantId, input);
		if (!updated) {
			throw new LoyaltyConfigNotFoundError(`No loyalty config for tenant ${tenantId}.`);
		}
		return updated;
	}

	// ── T3: Point Accumulation ──────────────────────────────────────────────

	accumulatePoints(input: PointAccumulationInput): PointAccumulationResult {
		const config = this.repository.getOrCreateConfig(input.tenantId);
		if (!config.enabled) {
			throw new LoyaltyProgramDisabledError("Loyalty program is not enabled for this tenant.");
		}

		const pointsEarned = calculatePointsForOrder(input.orderTotalCents, config);
		if (pointsEarned <= 0) {
			return {
				pointsEarned: 0,
				newBalance: 0,
				newLifetimePoints: 0,
				previousTier: "bronze",
				newTier: "bronze",
				tierChanged: false,
			};
		}

		const account = this.repository.getOrCreateAccount(input.tenantId, input.customerId);
		const previousTier = account.currentTier;
		const newBalance = account.pointBalance + pointsEarned;
		const newLifetimePoints = account.lifetimePoints + pointsEarned;

		const newTier = computeLoyaltyTier(newLifetimePoints, config.tiers.map((t) => ({
			tier: t.name.toLowerCase() as "bronze" | "silver" | "gold" | "platinum",
			requiredPoints: t.pointThreshold,
		})));

		this.repository.updateAccount(input.tenantId, input.customerId, {
			pointBalance: newBalance,
			lifetimePoints: newLifetimePoints,
			currentTier: newTier,
		});

		// Calculate expiration date based on policy
		let expiresAt: string | null = null;
		if (config.expirationPolicy !== "never") {
			const expDate = new Date();
			expDate.setDate(expDate.getDate() + config.expirationDays);
			expiresAt = expDate.toISOString();
		}

		this.repository.addLedgerEntry(
			input.tenantId,
			input.customerId,
			"earn",
			pointsEarned,
			newBalance,
			`Earned ${pointsEarned} points for order ${input.orderId}`,
			"order",
			input.orderId,
			expiresAt,
		);

		return {
			pointsEarned,
			newBalance,
			newLifetimePoints,
			previousTier,
			newTier,
			tierChanged: previousTier !== newTier,
		};
	}

	// ── T4: Point Redemption ────────────────────────────────────────────────

	redeemPoints(input: PointRedemptionInput): PointRedemptionResult {
		const config = this.repository.getOrCreateConfig(input.tenantId);
		if (!config.enabled) {
			throw new LoyaltyProgramDisabledError("Loyalty program is not enabled for this tenant.");
		}

		if (input.pointsToRedeem <= 0) {
			throw new LoyaltyValidationError("Points to redeem must be positive.");
		}

		if (input.pointsToRedeem < config.minimumRedemptionPoints) {
			throw new LoyaltyValidationError(
				`Minimum redemption is ${config.minimumRedemptionPoints} points.`,
			);
		}

		const account = this.repository.getOrCreateAccount(input.tenantId, input.customerId);

		if (account.pointBalance < input.pointsToRedeem) {
			throw new InsufficientPointsError(
				`Insufficient points. Balance: ${account.pointBalance}, requested: ${input.pointsToRedeem}.`,
			);
		}

		const discountCents = computeRedemptionDiscount(input.pointsToRedeem, config.pointRedemptionRate);
		const newBalance = account.pointBalance - input.pointsToRedeem;

		this.repository.updateAccount(input.tenantId, input.customerId, {
			pointBalance: newBalance,
		});

		this.repository.addLedgerEntry(
			input.tenantId,
			input.customerId,
			"redeem",
			-input.pointsToRedeem,
			newBalance,
			`Redeemed ${input.pointsToRedeem} points for $${(discountCents / 100).toFixed(2)} discount`,
			"redemption",
			null,
			null,
		);

		return {
			pointsRedeemed: input.pointsToRedeem,
			discountCents,
			newBalance,
		};
	}

	// ── T5: Point Expiration ────────────────────────────────────────────────

	expirePointsForCustomer(tenantId: string, customerId: string): PointExpirationResult {
		const now = new Date().toISOString();
		const expirableEntries = this.repository.getExpirableEntries(tenantId, now)
			.filter((e) => e.customerId === customerId);

		if (expirableEntries.length === 0) {
			const account = this.repository.getAccount(tenantId, customerId);
			return {
				tenantId,
				customerId,
				pointsExpired: 0,
				entriesExpired: 0,
				newBalance: account?.pointBalance ?? 0,
			};
		}

		const totalExpiring = expirableEntries.reduce((sum, e) => sum + e.points, 0);
		const pointsToExpire = Math.max(totalExpiring, 0);

		const account = this.repository.getOrCreateAccount(tenantId, customerId);
		const newBalance = Math.max(account.pointBalance - pointsToExpire, 0);

		this.repository.updateAccount(tenantId, customerId, {
			pointBalance: newBalance,
		});

		if (pointsToExpire > 0) {
			this.repository.addLedgerEntry(
				tenantId,
				customerId,
				"expire",
				-pointsToExpire,
				newBalance,
				`${pointsToExpire} points expired`,
				"expiration",
				null,
				null,
			);
		}

		return {
			tenantId,
			customerId,
			pointsExpired: pointsToExpire,
			entriesExpired: expirableEntries.length,
			newBalance,
		};
	}

	runExpirationBatch(): PointExpirationBatchResult {
		const now = new Date().toISOString();
		const allExpirable = this.repository.getExpirableEntriesAllTenants(now);

		// Group by tenant+customer
		const grouped = new Map<string, { tenantId: string; customerId: string; entries: PointLedgerEntry[] }>();
		for (const entry of allExpirable) {
			const key = `${entry.tenantId}:${entry.customerId}`;
			if (!grouped.has(key)) {
				grouped.set(key, { tenantId: entry.tenantId, customerId: entry.customerId, entries: [] });
			}
			grouped.get(key)!.entries.push(entry);
		}

		const results: PointExpirationResult[] = [];
		const tenantSet = new Set<string>();

		for (const group of grouped.values()) {
			tenantSet.add(group.tenantId);
			const result = this.expirePointsForCustomer(group.tenantId, group.customerId);
			if (result.pointsExpired > 0) {
				results.push(result);
			}
		}

		return {
			tenantsProcessed: tenantSet.size,
			customersAffected: results.length,
			totalPointsExpired: results.reduce((sum, r) => sum + r.pointsExpired, 0),
			results,
		};
	}

	// ── T6: Manual Adjustment ───────────────────────────────────────────────

	adjustPoints(input: ManualPointAdjustmentInput): ManualPointAdjustmentResult {
		if (!input.reason || input.reason.trim().length === 0) {
			throw new LoyaltyValidationError("Adjustment reason is required.");
		}
		if (input.points === 0) {
			throw new LoyaltyValidationError("Adjustment points must be non-zero.");
		}

		const account = this.repository.getOrCreateAccount(input.tenantId, input.customerId);
		const previousTier = account.currentTier;

		const newBalance = account.pointBalance + input.points;
		if (newBalance < 0) {
			throw new InsufficientPointsError(
				`Adjustment would result in negative balance. Current: ${account.pointBalance}, adjustment: ${input.points}.`,
			);
		}

		const newLifetimePoints = input.points > 0
			? account.lifetimePoints + input.points
			: account.lifetimePoints;

		const config = this.repository.getOrCreateConfig(input.tenantId);
		const newTier = computeLoyaltyTier(newLifetimePoints, config.tiers.map((t) => ({
			tier: t.name.toLowerCase() as "bronze" | "silver" | "gold" | "platinum",
			requiredPoints: t.pointThreshold,
		})));

		this.repository.updateAccount(input.tenantId, input.customerId, {
			pointBalance: newBalance,
			lifetimePoints: newLifetimePoints,
			currentTier: newTier,
		});

		const entry = this.repository.addLedgerEntry(
			input.tenantId,
			input.customerId,
			"adjust",
			input.points,
			newBalance,
			`Manual adjustment by ${input.actorId}: ${input.reason}`,
			"manual",
			null,
			null,
		);

		return {
			ledgerEntryId: entry.id,
			newBalance,
			newLifetimePoints,
			previousTier,
			newTier,
			tierChanged: previousTier !== newTier,
		};
	}

	// ── T6: Ledger Query ────────────────────────────────────────────────────

	getLedger(
		tenantId: string,
		customerId: string,
		type?: string,
		page: number = 1,
		pageSize: number = 20,
	): PointLedgerResponse {
		const ledgerType = type as PointLedgerEntry["type"] | undefined;
		const result = this.repository.getLedgerEntries(tenantId, customerId, ledgerType, page, pageSize);
		return {
			entries: result.entries,
			total: result.total,
			page,
			pageSize,
		};
	}

	// ── T7: Loyalty Tab Data ────────────────────────────────────────────────

	getLoyaltyTabData(tenantId: string, customerId: string): LoyaltyTabData {
		const config = this.repository.getOrCreateConfig(tenantId);
		const account = this.repository.getOrCreateAccount(tenantId, customerId);
		const recentLedger = this.repository.getLedgerEntries(tenantId, customerId, undefined, 1, 5);

		return buildLoyaltyTabData(account, config, recentLedger.entries);
	}

	// ── T7: Admin Customer Loyalty Summary ──────────────────────────────────

	getAdminCustomerLoyaltySummary(tenantId: string, customerId: string): AdminCustomerLoyaltySummary {
		const account = this.repository.getOrCreateAccount(tenantId, customerId);
		const memberSinceDate = new Date(account.memberSince);
		const now = new Date();
		const memberSinceDays = Math.floor((now.getTime() - memberSinceDate.getTime()) / (1000 * 60 * 60 * 24));

		const tags = deriveCustomerTags(account.lifetimePoints, account.currentTier, memberSinceDays);

		return {
			customerId: account.customerId,
			tenantId: account.tenantId,
			currentTier: account.currentTier,
			pointBalance: account.pointBalance,
			lifetimePoints: account.lifetimePoints,
			tags,
		};
	}

	getAdminCustomerLoyaltyList(tenantId: string): AdminCustomerLoyaltySummary[] {
		const accounts = this.repository.listAccountsForTenant(tenantId);
		return accounts.map((account) => {
			const memberSinceDate = new Date(account.memberSince);
			const now = new Date();
			const memberSinceDays = Math.floor((now.getTime() - memberSinceDate.getTime()) / (1000 * 60 * 60 * 24));
			const tags = deriveCustomerTags(account.lifetimePoints, account.currentTier, memberSinceDays);

			return {
				customerId: account.customerId,
				tenantId: account.tenantId,
				currentTier: account.currentTier,
				pointBalance: account.pointBalance,
				lifetimePoints: account.lifetimePoints,
				tags,
			};
		});
	}
}
