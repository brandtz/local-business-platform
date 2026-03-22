import { describe, expect, it } from "vitest";
import type {
	CustomerProfile,
	SavedAddress,
	SavedPaymentMethod,
	LoyaltyAccount,
	NotificationPreferences,
	PaginatedResult,
	TenantScopedOrderHistoryRecord,
	TenantScopedBookingHistoryRecord,
} from "@platform/types";
import { DEFAULT_TIER_THRESHOLDS, createDefaultNotificationPreferences } from "@platform/types";

import {
	buildProfileViewModel,
	buildOrdersViewModel,
	buildBookingsViewModel,
	buildAddressesViewModel,
	buildPaymentMethodsViewModel,
	buildLoyaltyViewModel,
	buildNotificationsViewModel,
	createEmptyAccountViewModel,
	formatPaymentMethodExpiry,
} from "./customer-account-integration";

// ── Test Fixtures ────────────────────────────────────────────────────────────

const sampleProfile: CustomerProfile = {
	id: "cust-1",
	tenantId: "t-1",
	userId: "u-1",
	email: "alice@example.com",
	displayName: "Alice",
	phone: "555-1234",
	avatarUrl: null,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

const sampleOrders: PaginatedResult<TenantScopedOrderHistoryRecord> = {
	items: [
		{ id: "o-1", tenantId: "t-1", customerId: "cust-1", status: "completed", totalCents: 2500, createdAt: "2026-01-10T00:00:00Z" },
		{ id: "o-2", tenantId: "t-1", customerId: "cust-1", status: "placed", totalCents: 1500, createdAt: "2026-01-11T00:00:00Z" },
	],
	total: 2,
	page: 1,
	pageSize: 20,
};

const sampleBookings: PaginatedResult<TenantScopedBookingHistoryRecord> = {
	items: [
		{ id: "b-1", tenantId: "t-1", customerId: "cust-1", status: "completed", createdAt: "2026-01-15T00:00:00Z" },
	],
	total: 1,
	page: 1,
	pageSize: 20,
};

const sampleAddresses: SavedAddress[] = [
	{
		id: "addr-1",
		customerId: "cust-1",
		tenantId: "t-1",
		label: "Home",
		line1: "123 Main St",
		line2: null,
		city: "Anytown",
		state: "CA",
		zip: "90210",
		isDefault: true,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
];

const samplePaymentMethods: SavedPaymentMethod[] = [
	{
		id: "pm-1",
		customerId: "cust-1",
		tenantId: "t-1",
		gatewayToken: "tok_123",
		cardBrand: "visa",
		lastFour: "4242",
		expiryMonth: 12,
		expiryYear: 2028,
		isDefault: true,
		createdAt: "2026-01-01T00:00:00Z",
	},
];

const sampleLoyalty: LoyaltyAccount = {
	customerId: "cust-1",
	tenantId: "t-1",
	currentTier: "silver",
	pointBalance: 750,
	lifetimePoints: 1200,
	tierProgressionThresholds: [...DEFAULT_TIER_THRESHOLDS],
	memberSince: "2026-01-01T00:00:00Z",
};

const sampleNotifications: NotificationPreferences = {
	customerId: "cust-1",
	tenantId: "t-1",
	preferences: createDefaultNotificationPreferences(),
	updatedAt: "2026-01-01T00:00:00Z",
};

// ── Profile View Model ───────────────────────────────────────────────────────

describe("buildProfileViewModel", () => {
	it("returns idle state when no profile", () => {
		const vm = buildProfileViewModel(null);
		expect(vm.state).toBe("idle");
		expect(vm.profile).toBeNull();
	});

	it("returns loaded state with profile", () => {
		const vm = buildProfileViewModel(sampleProfile);
		expect(vm.state).toBe("loaded");
		expect(vm.profile?.email).toBe("alice@example.com");
	});

	it("returns error state on error", () => {
		const vm = buildProfileViewModel(null, "Network error");
		expect(vm.state).toBe("error");
		expect(vm.errorMessage).toBe("Network error");
	});
});

// ── Orders View Model ────────────────────────────────────────────────────────

describe("buildOrdersViewModel", () => {
	it("returns idle state when no data", () => {
		const vm = buildOrdersViewModel(null);
		expect(vm.state).toBe("idle");
		expect(vm.isEmpty).toBe(true);
	});

	it("returns loaded state with orders", () => {
		const vm = buildOrdersViewModel(sampleOrders);
		expect(vm.state).toBe("loaded");
		expect(vm.orders).toHaveLength(2);
		expect(vm.isEmpty).toBe(false);
		expect(vm.total).toBe(2);
	});

	it("returns loaded empty state when no orders", () => {
		const vm = buildOrdersViewModel({ items: [], total: 0, page: 1, pageSize: 20 });
		expect(vm.state).toBe("loaded");
		expect(vm.isEmpty).toBe(true);
	});

	it("returns error state on error", () => {
		const vm = buildOrdersViewModel(null, "Failed to load");
		expect(vm.state).toBe("error");
		expect(vm.errorMessage).toBe("Failed to load");
	});
});

// ── Bookings View Model ──────────────────────────────────────────────────────

describe("buildBookingsViewModel", () => {
	it("returns idle state when no data", () => {
		const vm = buildBookingsViewModel(null);
		expect(vm.state).toBe("idle");
		expect(vm.isEmpty).toBe(true);
	});

	it("returns loaded state with bookings", () => {
		const vm = buildBookingsViewModel(sampleBookings);
		expect(vm.state).toBe("loaded");
		expect(vm.bookings).toHaveLength(1);
		expect(vm.isEmpty).toBe(false);
	});
});

// ── Addresses View Model ─────────────────────────────────────────────────────

describe("buildAddressesViewModel", () => {
	it("returns idle state when no data", () => {
		const vm = buildAddressesViewModel(null);
		expect(vm.state).toBe("idle");
		expect(vm.isEmpty).toBe(true);
	});

	it("returns loaded state with addresses", () => {
		const vm = buildAddressesViewModel(sampleAddresses);
		expect(vm.state).toBe("loaded");
		expect(vm.addresses).toHaveLength(1);
		expect(vm.defaultAddressId).toBe("addr-1");
		expect(vm.isEmpty).toBe(false);
	});

	it("returns loaded empty state when no addresses", () => {
		const vm = buildAddressesViewModel([]);
		expect(vm.state).toBe("loaded");
		expect(vm.isEmpty).toBe(true);
		expect(vm.defaultAddressId).toBeNull();
	});
});

// ── Payment Methods View Model ───────────────────────────────────────────────

describe("buildPaymentMethodsViewModel", () => {
	it("returns idle state when no data", () => {
		const vm = buildPaymentMethodsViewModel(null);
		expect(vm.state).toBe("idle");
		expect(vm.isEmpty).toBe(true);
	});

	it("returns loaded state with display items", () => {
		const vm = buildPaymentMethodsViewModel(samplePaymentMethods);
		expect(vm.state).toBe("loaded");
		expect(vm.methods).toHaveLength(1);
		expect(vm.methods[0].cardBrand).toBe("visa");
		expect(vm.methods[0].lastFour).toBe("4242");
		expect(vm.methods[0].expiryLabel).toBe("12/2028");
		expect(vm.methods[0].isDefault).toBe(true);
		expect(vm.defaultMethodId).toBe("pm-1");
	});

	it("never exposes gateway token in display items", () => {
		const vm = buildPaymentMethodsViewModel(samplePaymentMethods);
		const keys = Object.keys(vm.methods[0]);
		expect(keys).not.toContain("gatewayToken");
	});
});

describe("formatPaymentMethodExpiry", () => {
	it("formats single digit month with leading zero", () => {
		expect(formatPaymentMethodExpiry(3, 2027)).toBe("03/2027");
	});

	it("formats double digit month", () => {
		expect(formatPaymentMethodExpiry(12, 2028)).toBe("12/2028");
	});
});

// ── Loyalty View Model ───────────────────────────────────────────────────────

describe("buildLoyaltyViewModel", () => {
	it("returns idle state when no data", () => {
		const vm = buildLoyaltyViewModel(null);
		expect(vm.state).toBe("idle");
		expect(vm.currentTier).toBeNull();
		expect(vm.progressPercent).toBe(0);
	});

	it("returns loaded state with loyalty data", () => {
		const vm = buildLoyaltyViewModel(sampleLoyalty);
		expect(vm.state).toBe("loaded");
		expect(vm.currentTier).toBe("silver");
		expect(vm.pointBalance).toBe(750);
		expect(vm.lifetimePoints).toBe(1200);
		expect(vm.nextTierName).toBe("gold");
		expect(vm.nextTierPoints).toBe(2000);
		expect(vm.memberSince).toBe("2026-01-01T00:00:00Z");
	});

	it("calculates progress toward next tier", () => {
		const vm = buildLoyaltyViewModel(sampleLoyalty);
		// Silver threshold: 500, Gold threshold: 2000, range = 1500
		// Progress: 1200 - 500 = 700. 700/1500 ≈ 46%
		expect(vm.progressPercent).toBe(46);
	});

	it("returns 100% progress for top tier", () => {
		const topTierAccount: LoyaltyAccount = {
			...sampleLoyalty,
			currentTier: "platinum",
			lifetimePoints: 10000,
		};
		const vm = buildLoyaltyViewModel(topTierAccount);
		expect(vm.progressPercent).toBe(100);
		expect(vm.nextTierName).toBeNull();
	});
});

// ── Notifications View Model ─────────────────────────────────────────────────

describe("buildNotificationsViewModel", () => {
	it("returns idle state when no data", () => {
		const vm = buildNotificationsViewModel(null);
		expect(vm.state).toBe("idle");
		expect(vm.preferences).toHaveLength(0);
	});

	it("returns loaded state with preferences", () => {
		const vm = buildNotificationsViewModel(sampleNotifications);
		expect(vm.state).toBe("loaded");
		expect(vm.preferences).toHaveLength(4);
	});
});

// ── Aggregate Account View Model ─────────────────────────────────────────────

describe("createEmptyAccountViewModel", () => {
	it("creates empty account with all 7 sections in idle state", () => {
		const account = createEmptyAccountViewModel();
		expect(account.profile.state).toBe("idle");
		expect(account.orders.state).toBe("idle");
		expect(account.bookings.state).toBe("idle");
		expect(account.addresses.state).toBe("idle");
		expect(account.paymentMethods.state).toBe("idle");
		expect(account.loyalty.state).toBe("idle");
		expect(account.notifications.state).toBe("idle");
	});

	it("all sections report empty/null data", () => {
		const account = createEmptyAccountViewModel();
		expect(account.profile.profile).toBeNull();
		expect(account.orders.isEmpty).toBe(true);
		expect(account.bookings.isEmpty).toBe(true);
		expect(account.addresses.isEmpty).toBe(true);
		expect(account.paymentMethods.isEmpty).toBe(true);
		expect(account.loyalty.currentTier).toBeNull();
		expect(account.notifications.preferences).toHaveLength(0);
	});
});
