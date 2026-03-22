// E7-S5: Customer Identity and Account History
// Defines customer profile, saved address, payment method, loyalty read model,
// notification preferences, and cross-tenant identity types.
// Security: customer data is scoped per tenant; payment methods use gateway
// tokens only — never raw card numbers.

// ── Customer Profile ─────────────────────────────────────────────────────────

export type CustomerProfile = {
	id: string;
	tenantId: string;
	userId: string;
	email: string;
	displayName: string | null;
	phone: string | null;
	avatarUrl: string | null;
	createdAt: string;
	updatedAt: string;
};

export type CustomerRegistrationInput = {
	tenantId: string;
	email: string;
	password: string;
	displayName?: string;
	phone?: string;
};

export type CustomerLoginInput = {
	tenantId: string;
	email: string;
	password: string;
};

export type CustomerLoginResponse = {
	profile: CustomerProfile;
	sessionToken: string;
};

export type CustomerProfileUpdateInput = {
	displayName?: string;
	phone?: string;
	avatarUrl?: string | null;
};

// ── Saved Addresses (E7-S5-T3) ──────────────────────────────────────────────

export type SavedAddress = {
	id: string;
	customerId: string;
	tenantId: string;
	label: string;
	line1: string;
	line2: string | null;
	city: string;
	state: string;
	zip: string;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
};

export type CreateSavedAddressInput = {
	label: string;
	line1: string;
	line2?: string;
	city: string;
	state: string;
	zip: string;
	isDefault?: boolean;
};

export type UpdateSavedAddressInput = {
	label?: string;
	line1?: string;
	line2?: string | null;
	city?: string;
	state?: string;
	zip?: string;
	isDefault?: boolean;
};

// ── Saved Payment Methods (E7-S5-T4) ────────────────────────────────────────
// SECURITY: Only gateway tokens are stored — raw card numbers are NEVER persisted.

export type SavedPaymentMethod = {
	id: string;
	customerId: string;
	tenantId: string;
	gatewayToken: string;
	cardBrand: string;
	lastFour: string;
	expiryMonth: number;
	expiryYear: number;
	isDefault: boolean;
	createdAt: string;
};

export type AddPaymentMethodInput = {
	gatewayToken: string;
	cardBrand: string;
	lastFour: string;
	expiryMonth: number;
	expiryYear: number;
	isDefault?: boolean;
};

// ── Loyalty Account Read Model (E7-S5-T5) ────────────────────────────────────
// Read model only — full loyalty engine is a separate concern.

export const loyaltyTiers = ["bronze", "silver", "gold", "platinum"] as const;

export type LoyaltyTier = (typeof loyaltyTiers)[number];

export type LoyaltyAccount = {
	customerId: string;
	tenantId: string;
	currentTier: LoyaltyTier;
	pointBalance: number;
	lifetimePoints: number;
	tierProgressionThresholds: TierProgressionThreshold[];
	memberSince: string;
};

export type TierProgressionThreshold = {
	tier: LoyaltyTier;
	requiredPoints: number;
};

export const DEFAULT_TIER_THRESHOLDS: readonly TierProgressionThreshold[] = [
	{ tier: "bronze", requiredPoints: 0 },
	{ tier: "silver", requiredPoints: 500 },
	{ tier: "gold", requiredPoints: 2000 },
	{ tier: "platinum", requiredPoints: 5000 },
];

export type LoyaltyPointsHistoryEntry = {
	id: string;
	customerId: string;
	tenantId: string;
	pointsDelta: number;
	reason: string;
	referenceType: "order" | "booking" | "promotion" | "adjustment";
	referenceId: string | null;
	createdAt: string;
};

export type LoyaltyPointsHistoryQuery = {
	customerId: string;
	tenantId: string;
	page?: number;
	pageSize?: number;
};

export type LoyaltyPointsHistoryResponse = {
	entries: LoyaltyPointsHistoryEntry[];
	total: number;
	page: number;
	pageSize: number;
};

export function computeLoyaltyTier(
	lifetimePoints: number,
	thresholds: readonly TierProgressionThreshold[] = DEFAULT_TIER_THRESHOLDS
): LoyaltyTier {
	let current: LoyaltyTier = "bronze";
	for (const threshold of thresholds) {
		if (lifetimePoints >= threshold.requiredPoints) {
			current = threshold.tier;
		}
	}
	return current;
}

export function getNextTierThreshold(
	currentTier: LoyaltyTier,
	thresholds: readonly TierProgressionThreshold[] = DEFAULT_TIER_THRESHOLDS
): TierProgressionThreshold | null {
	const tierIndex = thresholds.findIndex((t) => t.tier === currentTier);
	if (tierIndex < 0 || tierIndex >= thresholds.length - 1) {
		return null;
	}
	return thresholds[tierIndex + 1];
}

// ── Notification Preferences (E7-S5-T6) ──────────────────────────────────────

export const notificationCategories = [
	"orders",
	"bookings",
	"promotions",
	"account",
] as const;

export type NotificationCategory = (typeof notificationCategories)[number];

export const notificationChannels = ["email", "sms", "push"] as const;

export type NotificationChannel = (typeof notificationChannels)[number];

export type NotificationPreferenceEntry = {
	category: NotificationCategory;
	email: boolean;
	sms: boolean;
	push: boolean;
};

export type NotificationPreferences = {
	customerId: string;
	tenantId: string;
	preferences: NotificationPreferenceEntry[];
	updatedAt: string;
};

export type UpdateNotificationPreferencesInput = {
	preferences: NotificationPreferenceEntry[];
};

export function createDefaultNotificationPreferences(): NotificationPreferenceEntry[] {
	return notificationCategories.map((category) => ({
		category,
		email: true,
		sms: category === "orders" || category === "bookings",
		push: true,
	}));
}

export function getPreferenceForCategory(
	preferences: readonly NotificationPreferenceEntry[],
	category: NotificationCategory
): NotificationPreferenceEntry | undefined {
	return preferences.find((p) => p.category === category);
}

export function isChannelEnabled(
	preferences: readonly NotificationPreferenceEntry[],
	category: NotificationCategory,
	channel: NotificationChannel
): boolean {
	const pref = getPreferenceForCategory(preferences, category);
	if (!pref) return false;
	return pref[channel];
}

// ── Account History Query Types (E7-S5-T2) ───────────────────────────────────

export type CustomerOrderHistoryQuery = {
	customerId: string;
	tenantId: string;
	page?: number;
	pageSize?: number;
	status?: string;
};

export type CustomerBookingHistoryQuery = {
	customerId: string;
	tenantId: string;
	page?: number;
	pageSize?: number;
	status?: string;
};

export type PaginatedResult<T> = {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
};

/**
 * Tenant-scoped order history record used for history queries.
 * Extends the customer-facing order summary with tenant/customer scoping fields.
 */
export type TenantScopedOrderHistoryRecord = {
	id: string;
	tenantId: string;
	customerId: string;
	status: string;
	totalCents: number;
	createdAt: string;
};

/**
 * Tenant-scoped booking history record used for history queries.
 * Extends the customer-facing booking summary with tenant/customer scoping fields.
 */
export type TenantScopedBookingHistoryRecord = {
	id: string;
	tenantId: string;
	customerId: string;
	status: string;
	createdAt: string;
};

// ── Cross-Tenant Identity (E7-S5-T8) ─────────────────────────────────────────
// A single user (email) may have customer profiles in multiple tenants.
// Each profile is fully isolated — history and preferences do not leak across tenants.

export type CrossTenantIdentityMapping = {
	userId: string;
	email: string;
	tenantProfiles: TenantCustomerProfileSummary[];
};

export type TenantCustomerProfileSummary = {
	tenantId: string;
	tenantName: string;
	customerId: string;
	displayName: string | null;
	createdAt: string;
};

/**
 * Validates that a customer profile belongs to the specified tenant.
 * This is the primary tenant isolation check for customer operations.
 */
export function isCustomerInTenant(
	profile: Pick<CustomerProfile, "tenantId">,
	tenantId: string
): boolean {
	return profile.tenantId === tenantId;
}

/**
 * Filters tenant profiles from a cross-tenant mapping to return only
 * the profile for the specified tenant.
 */
export function getProfileForTenant(
	mapping: CrossTenantIdentityMapping,
	tenantId: string
): TenantCustomerProfileSummary | undefined {
	return mapping.tenantProfiles.find((p) => p.tenantId === tenantId);
}
