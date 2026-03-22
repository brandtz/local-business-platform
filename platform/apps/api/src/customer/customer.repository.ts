import type {
	CustomerProfile,
	SavedAddress,
	SavedPaymentMethod,
	LoyaltyAccount,
	LoyaltyPointsHistoryEntry,
	NotificationPreferences,
	NotificationPreferenceEntry,
	CrossTenantIdentityMapping,
	TenantCustomerProfileSummary,
} from "@platform/types";
import { DEFAULT_TIER_THRESHOLDS, computeLoyaltyTier, createDefaultNotificationPreferences } from "@platform/types";

// ---------------------------------------------------------------------------
// In-memory customer repository for tenant-scoped CRUD
// ---------------------------------------------------------------------------

const counters = {
	customer: 0,
	address: 0,
	paymentMethod: 0,
	loyaltyEntry: 0,
};

function nextId(prefix: string): string {
	const key = prefix as keyof typeof counters;
	if (key in counters) {
		counters[key] += 1;
		return `${prefix}-${counters[key]}`;
	}
	return `${prefix}-${Date.now()}`;
}

function now(): string {
	return new Date().toISOString();
}

export class CustomerRepository {
	private profiles: CustomerProfile[] = [];
	private addresses: SavedAddress[] = [];
	private paymentMethods: SavedPaymentMethod[] = [];
	private loyaltyAccounts: LoyaltyAccount[] = [];
	private loyaltyHistory: LoyaltyPointsHistoryEntry[] = [];
	private notificationPrefs: NotificationPreferences[] = [];

	// ── Profile CRUD ─────────────────────────────────────────────────────────

	createProfile(
		tenantId: string,
		data: {
			userId: string;
			email: string;
			displayName: string | null;
			phone: string | null;
		}
	): CustomerProfile {
		const existing = this.profiles.find(
			(p) => p.tenantId === tenantId && p.email === data.email
		);
		if (existing) {
			throw new Error(`Customer profile already exists for email ${data.email} in tenant ${tenantId}`);
		}

		const profile: CustomerProfile = {
			id: nextId("customer"),
			tenantId,
			userId: data.userId,
			email: data.email,
			displayName: data.displayName,
			phone: data.phone,
			avatarUrl: null,
			createdAt: now(),
			updatedAt: now(),
		};
		this.profiles.push(profile);
		return profile;
	}

	findProfileById(tenantId: string, customerId: string): CustomerProfile | null {
		return this.profiles.find(
			(p) => p.tenantId === tenantId && p.id === customerId
		) ?? null;
	}

	findProfileByEmail(tenantId: string, email: string): CustomerProfile | null {
		return this.profiles.find(
			(p) => p.tenantId === tenantId && p.email === email
		) ?? null;
	}

	findProfileByUserId(tenantId: string, userId: string): CustomerProfile | null {
		return this.profiles.find(
			(p) => p.tenantId === tenantId && p.userId === userId
		) ?? null;
	}

	updateProfile(
		tenantId: string,
		customerId: string,
		data: { displayName?: string; phone?: string; avatarUrl?: string | null }
	): CustomerProfile | null {
		const profile = this.findProfileById(tenantId, customerId);
		if (!profile) return null;
		if (data.displayName !== undefined) profile.displayName = data.displayName;
		if (data.phone !== undefined) profile.phone = data.phone;
		if (data.avatarUrl !== undefined) profile.avatarUrl = data.avatarUrl;
		(profile as { updatedAt: string }).updatedAt = now();
		return profile;
	}

	/**
	 * Returns all tenant profiles for a given userId (cross-tenant identity).
	 * This is used for identity mapping, NOT for exposing data across tenants.
	 */
	findAllProfilesForUser(userId: string): CustomerProfile[] {
		return this.profiles.filter((p) => p.userId === userId);
	}

	// ── Saved Addresses ──────────────────────────────────────────────────────

	createAddress(tenantId: string, customerId: string, data: {
		label: string;
		line1: string;
		line2?: string;
		city: string;
		state: string;
		zip: string;
		isDefault?: boolean;
	}): SavedAddress {
		if (data.isDefault) {
			this.clearDefaultAddress(tenantId, customerId);
		}
		const address: SavedAddress = {
			id: nextId("address"),
			customerId,
			tenantId,
			label: data.label,
			line1: data.line1,
			line2: data.line2 ?? null,
			city: data.city,
			state: data.state,
			zip: data.zip,
			isDefault: data.isDefault ?? false,
			createdAt: now(),
			updatedAt: now(),
		};
		this.addresses.push(address);
		return address;
	}

	findAddressById(tenantId: string, customerId: string, addressId: string): SavedAddress | null {
		return this.addresses.find(
			(a) => a.tenantId === tenantId && a.customerId === customerId && a.id === addressId
		) ?? null;
	}

	listAddresses(tenantId: string, customerId: string): SavedAddress[] {
		return this.addresses.filter(
			(a) => a.tenantId === tenantId && a.customerId === customerId
		);
	}

	updateAddress(tenantId: string, customerId: string, addressId: string, data: {
		label?: string;
		line1?: string;
		line2?: string | null;
		city?: string;
		state?: string;
		zip?: string;
		isDefault?: boolean;
	}): SavedAddress | null {
		const address = this.findAddressById(tenantId, customerId, addressId);
		if (!address) return null;
		if (data.isDefault) {
			this.clearDefaultAddress(tenantId, customerId);
		}
		if (data.label !== undefined) address.label = data.label;
		if (data.line1 !== undefined) address.line1 = data.line1;
		if (data.line2 !== undefined) address.line2 = data.line2;
		if (data.city !== undefined) address.city = data.city;
		if (data.state !== undefined) address.state = data.state;
		if (data.zip !== undefined) address.zip = data.zip;
		if (data.isDefault !== undefined) address.isDefault = data.isDefault;
		(address as { updatedAt: string }).updatedAt = now();
		return address;
	}

	deleteAddress(tenantId: string, customerId: string, addressId: string): boolean {
		const index = this.addresses.findIndex(
			(a) => a.tenantId === tenantId && a.customerId === customerId && a.id === addressId
		);
		if (index < 0) return false;
		this.addresses.splice(index, 1);
		return true;
	}

	setDefaultAddress(tenantId: string, customerId: string, addressId: string): SavedAddress | null {
		this.clearDefaultAddress(tenantId, customerId);
		const address = this.findAddressById(tenantId, customerId, addressId);
		if (!address) return null;
		address.isDefault = true;
		(address as { updatedAt: string }).updatedAt = now();
		return address;
	}

	private clearDefaultAddress(tenantId: string, customerId: string): void {
		for (const addr of this.addresses) {
			if (addr.tenantId === tenantId && addr.customerId === customerId && addr.isDefault) {
				addr.isDefault = false;
			}
		}
	}

	// ── Saved Payment Methods ────────────────────────────────────────────────

	addPaymentMethod(tenantId: string, customerId: string, data: {
		gatewayToken: string;
		cardBrand: string;
		lastFour: string;
		expiryMonth: number;
		expiryYear: number;
		isDefault?: boolean;
	}): SavedPaymentMethod {
		if (data.isDefault) {
			this.clearDefaultPaymentMethod(tenantId, customerId);
		}
		const pm: SavedPaymentMethod = {
			id: nextId("paymentMethod"),
			customerId,
			tenantId,
			gatewayToken: data.gatewayToken,
			cardBrand: data.cardBrand,
			lastFour: data.lastFour,
			expiryMonth: data.expiryMonth,
			expiryYear: data.expiryYear,
			isDefault: data.isDefault ?? false,
			createdAt: now(),
		};
		this.paymentMethods.push(pm);
		return pm;
	}

	listPaymentMethods(tenantId: string, customerId: string): SavedPaymentMethod[] {
		return this.paymentMethods.filter(
			(pm) => pm.tenantId === tenantId && pm.customerId === customerId
		);
	}

	removePaymentMethod(tenantId: string, customerId: string, paymentMethodId: string): boolean {
		const index = this.paymentMethods.findIndex(
			(pm) => pm.tenantId === tenantId && pm.customerId === customerId && pm.id === paymentMethodId
		);
		if (index < 0) return false;
		this.paymentMethods.splice(index, 1);
		return true;
	}

	setDefaultPaymentMethod(tenantId: string, customerId: string, paymentMethodId: string): SavedPaymentMethod | null {
		this.clearDefaultPaymentMethod(tenantId, customerId);
		const pm = this.paymentMethods.find(
			(p) => p.tenantId === tenantId && p.customerId === customerId && p.id === paymentMethodId
		);
		if (!pm) return null;
		(pm as { isDefault: boolean }).isDefault = true;
		return pm;
	}

	private clearDefaultPaymentMethod(tenantId: string, customerId: string): void {
		for (const pm of this.paymentMethods) {
			if (pm.tenantId === tenantId && pm.customerId === customerId && pm.isDefault) {
				(pm as { isDefault: boolean }).isDefault = false;
			}
		}
	}

	// ── Loyalty Account ──────────────────────────────────────────────────────

	getOrCreateLoyaltyAccount(tenantId: string, customerId: string): LoyaltyAccount {
		let account = this.loyaltyAccounts.find(
			(a) => a.tenantId === tenantId && a.customerId === customerId
		);
		if (!account) {
			account = {
				customerId,
				tenantId,
				currentTier: "bronze",
				pointBalance: 0,
				lifetimePoints: 0,
				tierProgressionThresholds: [...DEFAULT_TIER_THRESHOLDS],
				memberSince: now(),
			};
			this.loyaltyAccounts.push(account);
		}
		return account;
	}

	getLoyaltyHistory(
		tenantId: string,
		customerId: string,
		page: number,
		pageSize: number
	): { entries: LoyaltyPointsHistoryEntry[]; total: number } {
		const all = this.loyaltyHistory.filter(
			(e) => e.tenantId === tenantId && e.customerId === customerId
		);
		const start = (page - 1) * pageSize;
		return {
			entries: all.slice(start, start + pageSize),
			total: all.length,
		};
	}

	addLoyaltyPoints(
		tenantId: string,
		customerId: string,
		pointsDelta: number,
		reason: string,
		referenceType: "order" | "booking" | "promotion" | "adjustment",
		referenceId: string | null
	): LoyaltyPointsHistoryEntry {
		const account = this.getOrCreateLoyaltyAccount(tenantId, customerId);
		account.pointBalance += pointsDelta;
		if (pointsDelta > 0) {
			account.lifetimePoints += pointsDelta;
		}
		account.currentTier = computeLoyaltyTier(account.lifetimePoints);

		const entry: LoyaltyPointsHistoryEntry = {
			id: nextId("loyaltyEntry"),
			customerId,
			tenantId,
			pointsDelta,
			reason,
			referenceType,
			referenceId,
			createdAt: now(),
		};
		this.loyaltyHistory.push(entry);
		return entry;
	}

	// ── Notification Preferences ─────────────────────────────────────────────

	getOrCreateNotificationPreferences(tenantId: string, customerId: string): NotificationPreferences {
		let prefs = this.notificationPrefs.find(
			(np) => np.tenantId === tenantId && np.customerId === customerId
		);
		if (!prefs) {
			prefs = {
				customerId,
				tenantId,
				preferences: createDefaultNotificationPreferences(),
				updatedAt: now(),
			};
			this.notificationPrefs.push(prefs);
		}
		return prefs;
	}

	updateNotificationPreferences(
		tenantId: string,
		customerId: string,
		preferences: NotificationPreferenceEntry[]
	): NotificationPreferences {
		const np = this.getOrCreateNotificationPreferences(tenantId, customerId);
		np.preferences = preferences;
		(np as { updatedAt: string }).updatedAt = now();
		return np;
	}
}
