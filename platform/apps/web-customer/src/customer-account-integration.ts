// E7-S5-T7: Customer account integration connecting all 7 backend module APIs.
// Provides view models for profile, orders, bookings, addresses, payment methods,
// loyalty, and notifications. Each view model supports empty, partial, and populated
// states. Security: all data scoped to the authenticated customer within the tenant.

import type {
	CustomerProfile,
	SavedAddress,
	SavedPaymentMethod,
	LoyaltyAccount,
	LoyaltyTier,
	NotificationPreferences,
	NotificationPreferenceEntry,
	TenantScopedOrderHistoryRecord,
	TenantScopedBookingHistoryRecord,
	PaginatedResult,
} from "@platform/types";

// ── Loading State ────────────────────────────────────────────────────────────

export type AccountLoadingState = "idle" | "loading" | "loaded" | "error";

// ── Profile View Model ───────────────────────────────────────────────────────

export type ProfileViewModel = {
	state: AccountLoadingState;
	profile: CustomerProfile | null;
	errorMessage: string | null;
};

export function buildProfileViewModel(
	profile: CustomerProfile | null,
	error?: string
): ProfileViewModel {
	if (error) {
		return { state: "error", profile: null, errorMessage: error };
	}
	if (!profile) {
		return { state: "idle", profile: null, errorMessage: null };
	}
	return { state: "loaded", profile, errorMessage: null };
}

// ── Orders View Model ────────────────────────────────────────────────────────

export type OrdersViewModel = {
	state: AccountLoadingState;
	orders: TenantScopedOrderHistoryRecord[];
	total: number;
	page: number;
	pageSize: number;
	isEmpty: boolean;
	errorMessage: string | null;
};

export function buildOrdersViewModel(
	result: PaginatedResult<TenantScopedOrderHistoryRecord> | null,
	error?: string
): OrdersViewModel {
	if (error) {
		return { state: "error", orders: [], total: 0, page: 1, pageSize: 20, isEmpty: true, errorMessage: error };
	}
	if (!result) {
		return { state: "idle", orders: [], total: 0, page: 1, pageSize: 20, isEmpty: true, errorMessage: null };
	}
	return {
		state: "loaded",
		orders: result.items,
		total: result.total,
		page: result.page,
		pageSize: result.pageSize,
		isEmpty: result.items.length === 0,
		errorMessage: null,
	};
}

// ── Bookings View Model ──────────────────────────────────────────────────────

export type BookingsViewModel = {
	state: AccountLoadingState;
	bookings: TenantScopedBookingHistoryRecord[];
	total: number;
	page: number;
	pageSize: number;
	isEmpty: boolean;
	errorMessage: string | null;
};

export function buildBookingsViewModel(
	result: PaginatedResult<TenantScopedBookingHistoryRecord> | null,
	error?: string
): BookingsViewModel {
	if (error) {
		return { state: "error", bookings: [], total: 0, page: 1, pageSize: 20, isEmpty: true, errorMessage: error };
	}
	if (!result) {
		return { state: "idle", bookings: [], total: 0, page: 1, pageSize: 20, isEmpty: true, errorMessage: null };
	}
	return {
		state: "loaded",
		bookings: result.items,
		total: result.total,
		page: result.page,
		pageSize: result.pageSize,
		isEmpty: result.items.length === 0,
		errorMessage: null,
	};
}

// ── Addresses View Model ─────────────────────────────────────────────────────

export type AddressesViewModel = {
	state: AccountLoadingState;
	addresses: SavedAddress[];
	defaultAddressId: string | null;
	isEmpty: boolean;
	errorMessage: string | null;
};

export function buildAddressesViewModel(
	addresses: SavedAddress[] | null,
	error?: string
): AddressesViewModel {
	if (error) {
		return { state: "error", addresses: [], defaultAddressId: null, isEmpty: true, errorMessage: error };
	}
	if (!addresses) {
		return { state: "idle", addresses: [], defaultAddressId: null, isEmpty: true, errorMessage: null };
	}
	const defaultAddr = addresses.find((a) => a.isDefault);
	return {
		state: "loaded",
		addresses,
		defaultAddressId: defaultAddr?.id ?? null,
		isEmpty: addresses.length === 0,
		errorMessage: null,
	};
}

// ── Payment Methods View Model ───────────────────────────────────────────────

export type PaymentMethodsViewModel = {
	state: AccountLoadingState;
	methods: PaymentMethodDisplayItem[];
	defaultMethodId: string | null;
	isEmpty: boolean;
	errorMessage: string | null;
};

export type PaymentMethodDisplayItem = {
	id: string;
	cardBrand: string;
	lastFour: string;
	expiryLabel: string;
	isDefault: boolean;
};

export function formatPaymentMethodExpiry(month: number, year: number): string {
	return `${String(month).padStart(2, "0")}/${year}`;
}

export function buildPaymentMethodsViewModel(
	methods: SavedPaymentMethod[] | null,
	error?: string
): PaymentMethodsViewModel {
	if (error) {
		return { state: "error", methods: [], defaultMethodId: null, isEmpty: true, errorMessage: error };
	}
	if (!methods) {
		return { state: "idle", methods: [], defaultMethodId: null, isEmpty: true, errorMessage: null };
	}
	const displayItems: PaymentMethodDisplayItem[] = methods.map((pm) => ({
		id: pm.id,
		cardBrand: pm.cardBrand,
		lastFour: pm.lastFour,
		expiryLabel: formatPaymentMethodExpiry(pm.expiryMonth, pm.expiryYear),
		isDefault: pm.isDefault,
	}));
	const defaultMethod = methods.find((m) => m.isDefault);
	return {
		state: "loaded",
		methods: displayItems,
		defaultMethodId: defaultMethod?.id ?? null,
		isEmpty: methods.length === 0,
		errorMessage: null,
	};
}

// ── Loyalty View Model ───────────────────────────────────────────────────────

export type LoyaltyViewModel = {
	state: AccountLoadingState;
	currentTier: LoyaltyTier | null;
	pointBalance: number;
	lifetimePoints: number;
	nextTierName: string | null;
	nextTierPoints: number | null;
	progressPercent: number;
	memberSince: string | null;
	errorMessage: string | null;
};

export function buildLoyaltyViewModel(
	account: LoyaltyAccount | null,
	error?: string
): LoyaltyViewModel {
	if (error) {
		return {
			state: "error",
			currentTier: null,
			pointBalance: 0,
			lifetimePoints: 0,
			nextTierName: null,
			nextTierPoints: null,
			progressPercent: 0,
			memberSince: null,
			errorMessage: error,
		};
	}
	if (!account) {
		return {
			state: "idle",
			currentTier: null,
			pointBalance: 0,
			lifetimePoints: 0,
			nextTierName: null,
			nextTierPoints: null,
			progressPercent: 0,
			memberSince: null,
			errorMessage: null,
		};
	}

	const currentThresholdIndex = account.tierProgressionThresholds.findIndex(
		(t) => t.tier === account.currentTier
	);
	const nextThreshold =
		currentThresholdIndex >= 0 &&
		currentThresholdIndex < account.tierProgressionThresholds.length - 1
			? account.tierProgressionThresholds[currentThresholdIndex + 1]
			: null;

	let progressPercent = 100;
	if (nextThreshold) {
		const currentRequired =
			account.tierProgressionThresholds[currentThresholdIndex]?.requiredPoints ?? 0;
		const range = nextThreshold.requiredPoints - currentRequired;
		const progress = account.lifetimePoints - currentRequired;
		progressPercent = range > 0 ? Math.min(100, Math.floor((progress / range) * 100)) : 100;
	}

	return {
		state: "loaded",
		currentTier: account.currentTier,
		pointBalance: account.pointBalance,
		lifetimePoints: account.lifetimePoints,
		nextTierName: nextThreshold?.tier ?? null,
		nextTierPoints: nextThreshold?.requiredPoints ?? null,
		progressPercent,
		memberSince: account.memberSince,
		errorMessage: null,
	};
}

// ── Notifications View Model ─────────────────────────────────────────────────

export type NotificationsViewModel = {
	state: AccountLoadingState;
	preferences: NotificationPreferenceEntry[];
	errorMessage: string | null;
};

export function buildNotificationsViewModel(
	prefs: NotificationPreferences | null,
	error?: string
): NotificationsViewModel {
	if (error) {
		return { state: "error", preferences: [], errorMessage: error };
	}
	if (!prefs) {
		return { state: "idle", preferences: [], errorMessage: null };
	}
	return {
		state: "loaded",
		preferences: prefs.preferences,
		errorMessage: null,
	};
}

// ── Aggregate Account View Model ─────────────────────────────────────────────

export type AccountViewModel = {
	profile: ProfileViewModel;
	orders: OrdersViewModel;
	bookings: BookingsViewModel;
	addresses: AddressesViewModel;
	paymentMethods: PaymentMethodsViewModel;
	loyalty: LoyaltyViewModel;
	notifications: NotificationsViewModel;
};

export function createEmptyAccountViewModel(): AccountViewModel {
	return {
		profile: buildProfileViewModel(null),
		orders: buildOrdersViewModel(null),
		bookings: buildBookingsViewModel(null),
		addresses: buildAddressesViewModel(null),
		paymentMethods: buildPaymentMethodsViewModel(null),
		loyalty: buildLoyaltyViewModel(null),
		notifications: buildNotificationsViewModel(null),
	};
}
