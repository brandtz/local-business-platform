// E11-S2: Customer Loyalty and Rewards Program
// Defines tenant-level loyalty configuration, point accumulation rules,
// redemption contracts, expiration policies, and admin-facing types.
// Customer-facing read model is defined in customer.ts; this module
// provides the engine types that drive the loyalty program.

// Customer-facing read-model types (LoyaltyTier, LoyaltyAccount, etc.)
// are defined in customer.ts and re-exported through index.ts.
// Import from "@platform/types" to access both read-model and engine types.

// ── Point Accumulation Mode ─────────────────────────────────────────────────

export const pointAccumulationModes = ["per_dollar", "per_order"] as const;

export type PointAccumulationMode = (typeof pointAccumulationModes)[number];

// ── Point Expiration Policy ─────────────────────────────────────────────────

export const pointExpirationPolicies = ["time_based", "rolling", "never"] as const;

export type PointExpirationPolicy = (typeof pointExpirationPolicies)[number];

// ── Ledger Entry Type ───────────────────────────────────────────────────────

export const ledgerEntryTypes = ["earn", "redeem", "expire", "adjust"] as const;

export type LedgerEntryType = (typeof ledgerEntryTypes)[number];

// ── E11-S2-T1: Loyalty Configuration Schema ─────────────────────────────────
// Tenant-level loyalty program configuration. Each tenant defines ONE program.

export type LoyaltyTierDefinition = {
	name: string;
	pointThreshold: number;
	benefitsDescription: string;
};

export type LoyaltyProgramConfig = {
	id: string;
	tenantId: string;
	enabled: boolean;
	tiers: LoyaltyTierDefinition[];
	accumulationMode: PointAccumulationMode;
	/** Points earned per dollar spent (when mode is per_dollar) */
	pointsPerDollar: number;
	/** Points earned per completed order (when mode is per_order) */
	pointsPerOrder: number;
	/** Points-to-cents conversion rate: how many points = 1 cent of discount */
	pointRedemptionRate: number;
	/** Minimum points required to redeem */
	minimumRedemptionPoints: number;
	expirationPolicy: PointExpirationPolicy;
	/** Expiration window in days (ignored when policy is "never") */
	expirationDays: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateLoyaltyProgramInput = {
	tenantId: string;
	enabled?: boolean;
	tiers?: LoyaltyTierDefinition[];
	accumulationMode?: PointAccumulationMode;
	pointsPerDollar?: number;
	pointsPerOrder?: number;
	pointRedemptionRate?: number;
	minimumRedemptionPoints?: number;
	expirationPolicy?: PointExpirationPolicy;
	expirationDays?: number;
};

export type UpdateLoyaltyProgramInput = {
	enabled?: boolean;
	tiers?: LoyaltyTierDefinition[];
	accumulationMode?: PointAccumulationMode;
	pointsPerDollar?: number;
	pointsPerOrder?: number;
	pointRedemptionRate?: number;
	minimumRedemptionPoints?: number;
	expirationPolicy?: PointExpirationPolicy;
	expirationDays?: number;
};

// ── Default loyalty program configuration ───────────────────────────────────

export const DEFAULT_LOYALTY_PROGRAM_CONFIG: Omit<LoyaltyProgramConfig, "id" | "tenantId" | "createdAt" | "updatedAt"> = {
	enabled: false,
	tiers: [
		{ name: "Bronze", pointThreshold: 0, benefitsDescription: "Basic member benefits" },
		{ name: "Silver", pointThreshold: 500, benefitsDescription: "5% bonus points on orders" },
		{ name: "Gold", pointThreshold: 2000, benefitsDescription: "10% bonus points, priority support" },
		{ name: "Platinum", pointThreshold: 5000, benefitsDescription: "15% bonus points, VIP access, priority support" },
	],
	accumulationMode: "per_dollar",
	pointsPerDollar: 1,
	pointsPerOrder: 10,
	pointRedemptionRate: 100,
	minimumRedemptionPoints: 100,
	expirationPolicy: "rolling",
	expirationDays: 365,
};

// ── E11-S2-T2: Point Transaction Ledger ─────────────────────────────────────

export type PointLedgerEntry = {
	id: string;
	tenantId: string;
	customerId: string;
	type: LedgerEntryType;
	points: number;
	balanceAfter: number;
	description: string;
	referenceType: "order" | "redemption" | "expiration" | "manual" | null;
	referenceId: string | null;
	expiresAt: string | null;
	createdAt: string;
};

export type PointLedgerQuery = {
	tenantId: string;
	customerId: string;
	type?: LedgerEntryType;
	page?: number;
	pageSize?: number;
};

export type PointLedgerResponse = {
	entries: PointLedgerEntry[];
	total: number;
	page: number;
	pageSize: number;
};

// ── E11-S2-T3: Point Accumulation Types ─────────────────────────────────────

export type PointAccumulationInput = {
	tenantId: string;
	customerId: string;
	orderId: string;
	orderTotalCents: number;
};

export type PointAccumulationResult = {
	pointsEarned: number;
	newBalance: number;
	newLifetimePoints: number;
	previousTier: string;
	newTier: string;
	tierChanged: boolean;
};

// ── E11-S2-T4: Point Redemption Types ───────────────────────────────────────

export type PointRedemptionInput = {
	tenantId: string;
	customerId: string;
	pointsToRedeem: number;
};

export type PointRedemptionResult = {
	pointsRedeemed: number;
	discountCents: number;
	newBalance: number;
};

// ── E11-S2-T5: Point Expiration Types ───────────────────────────────────────

export type PointExpirationResult = {
	tenantId: string;
	customerId: string;
	pointsExpired: number;
	entriesExpired: number;
	newBalance: number;
};

export type PointExpirationBatchResult = {
	tenantsProcessed: number;
	customersAffected: number;
	totalPointsExpired: number;
	results: PointExpirationResult[];
};

// ── E11-S2-T6: Admin Manual Adjustment ──────────────────────────────────────

export type ManualPointAdjustmentInput = {
	tenantId: string;
	customerId: string;
	points: number;
	reason: string;
	actorId: string;
};

export type ManualPointAdjustmentResult = {
	ledgerEntryId: string;
	newBalance: number;
	newLifetimePoints: number;
	previousTier: string;
	newTier: string;
	tierChanged: boolean;
};

// ── E11-S2-T7: Loyalty Tab Data Contract ────────────────────────────────────

export type LoyaltyTabData = {
	tierName: string;
	pointBalance: number;
	lifetimePoints: number;
	nextTierName: string | null;
	nextTierThreshold: number | null;
	progressPercent: number;
	pointsToNextTier: number | null;
	memberSince: string;
	canRedeem: boolean;
	minimumRedemptionPoints: number;
	recentActivity: PointLedgerEntry[];
};

// ── E11-S2-T7: Admin Customer Loyalty Tag ───────────────────────────────────

export const customerTagTypes = ["vip", "loyalty", "new"] as const;

export type CustomerTagType = (typeof customerTagTypes)[number];

export type CustomerTag = {
	type: CustomerTagType;
	label: string;
};

export type AdminCustomerLoyaltySummary = {
	customerId: string;
	tenantId: string;
	currentTier: string;
	pointBalance: number;
	lifetimePoints: number;
	tags: CustomerTag[];
};

// ── Helper Functions ────────────────────────────────────────────────────────

/**
 * Calculate points earned for an order based on program config.
 */
export function calculatePointsForOrder(
	orderTotalCents: number,
	config: Pick<LoyaltyProgramConfig, "accumulationMode" | "pointsPerDollar" | "pointsPerOrder">,
): number {
	if (orderTotalCents <= 0) return 0;
	if (config.accumulationMode === "per_dollar") {
		const dollars = Math.floor(orderTotalCents / 100);
		return dollars * config.pointsPerDollar;
	}
	return config.pointsPerOrder;
}

/**
 * Convert points to discount cents using the redemption rate.
 */
export function pointsToDiscountCents(
	points: number,
	redemptionRate: number,
): number {
	if (points <= 0 || redemptionRate <= 0) return 0;
	return Math.floor(points / redemptionRate) * 100;
}

/**
 * Compute the discount cents for a given number of points (granular).
 * Each point is worth (100 / redemptionRate) cents.
 */
export function computeRedemptionDiscount(
	points: number,
	redemptionRate: number,
): number {
	if (points <= 0 || redemptionRate <= 0) return 0;
	return Math.floor((points * 100) / redemptionRate);
}

/**
 * Determine customer tags for admin display.
 */
export function deriveCustomerTags(
	lifetimePoints: number,
	currentTier: string,
	memberSinceDays: number,
): CustomerTag[] {
	const tags: CustomerTag[] = [];

	const normalizedTier = currentTier.toLowerCase();

	if (normalizedTier === "platinum" || normalizedTier === "gold") {
		tags.push({ type: "vip", label: "VIP" });
	}

	if (lifetimePoints > 0) {
		tags.push({ type: "loyalty", label: "Loyalty" });
	}

	if (memberSinceDays <= 30) {
		tags.push({ type: "new", label: "New" });
	}

	return tags;
}

/**
 * Compute loyalty tab data from account + config.
 */
export function buildLoyaltyTabData(
	account: {
		currentTier: string;
		pointBalance: number;
		lifetimePoints: number;
		memberSince: string;
	},
	config: Pick<LoyaltyProgramConfig, "tiers" | "minimumRedemptionPoints">,
	recentActivity: PointLedgerEntry[],
): LoyaltyTabData {
	const currentTierDef = config.tiers.find(
		(t) => t.name.toLowerCase() === account.currentTier.toLowerCase(),
	);
	const currentTierIndex = config.tiers.findIndex(
		(t) => t.name.toLowerCase() === account.currentTier.toLowerCase(),
	);
	const nextTierDef =
		currentTierIndex >= 0 && currentTierIndex < config.tiers.length - 1
			? config.tiers[currentTierIndex + 1]
			: null;

	let progressPercent = 100;
	let pointsToNextTier: number | null = null;

	if (nextTierDef) {
		const currentThreshold = currentTierDef?.pointThreshold ?? 0;
		const range = nextTierDef.pointThreshold - currentThreshold;
		const progress = account.lifetimePoints - currentThreshold;
		progressPercent = range > 0 ? Math.min(Math.floor((progress / range) * 100), 100) : 100;
		pointsToNextTier = Math.max(nextTierDef.pointThreshold - account.lifetimePoints, 0);
	}

	return {
		tierName: currentTierDef?.name ?? account.currentTier,
		pointBalance: account.pointBalance,
		lifetimePoints: account.lifetimePoints,
		nextTierName: nextTierDef?.name ?? null,
		nextTierThreshold: nextTierDef?.pointThreshold ?? null,
		progressPercent,
		pointsToNextTier,
		memberSince: account.memberSince,
		canRedeem: account.pointBalance >= config.minimumRedemptionPoints,
		minimumRedemptionPoints: config.minimumRedemptionPoints,
		recentActivity,
	};
}

/**
 * Validate a loyalty program config for correctness.
 */
export function validateLoyaltyProgramConfig(
	config: Pick<LoyaltyProgramConfig, "tiers" | "pointsPerDollar" | "pointsPerOrder" | "pointRedemptionRate" | "minimumRedemptionPoints" | "expirationDays">,
): string[] {
	const errors: string[] = [];

	if (config.tiers.length === 0) {
		errors.push("At least one tier is required.");
	}

	for (let i = 1; i < config.tiers.length; i++) {
		if (config.tiers[i].pointThreshold <= config.tiers[i - 1].pointThreshold) {
			errors.push("Tier thresholds must be in ascending order.");
			break;
		}
	}

	if (config.tiers[0] && config.tiers[0].pointThreshold !== 0) {
		errors.push("First tier must have a threshold of 0.");
	}

	if (config.pointsPerDollar < 0) {
		errors.push("pointsPerDollar must be non-negative.");
	}

	if (config.pointsPerOrder < 0) {
		errors.push("pointsPerOrder must be non-negative.");
	}

	if (config.pointRedemptionRate <= 0) {
		errors.push("pointRedemptionRate must be positive.");
	}

	if (config.minimumRedemptionPoints < 0) {
		errors.push("minimumRedemptionPoints must be non-negative.");
	}

	if (config.expirationDays < 0) {
		errors.push("expirationDays must be non-negative.");
	}

	return errors;
}

/**
 * Check if a point accumulation mode is valid.
 */
export function isValidAccumulationMode(mode: string): mode is PointAccumulationMode {
	return (pointAccumulationModes as readonly string[]).includes(mode);
}

/**
 * Check if a point expiration policy is valid.
 */
export function isValidExpirationPolicy(policy: string): policy is PointExpirationPolicy {
	return (pointExpirationPolicies as readonly string[]).includes(policy);
}

/**
 * Check if a ledger entry type is valid.
 */
export function isValidLedgerEntryType(type: string): type is LedgerEntryType {
	return (ledgerEntryTypes as readonly string[]).includes(type);
}
