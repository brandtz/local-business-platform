import { Injectable } from "@nestjs/common";
import type {
	CustomerProfile,
	CustomerProfileUpdateInput,
	CustomerRegistrationInput,
	CustomerLoginInput,
	CustomerLoginResponse,
	SavedAddress,
	CreateSavedAddressInput,
	UpdateSavedAddressInput,
	SavedPaymentMethod,
	AddPaymentMethodInput,
	LoyaltyAccount,
	LoyaltyPointsHistoryResponse,
	NotificationPreferences,
	NotificationPreferenceEntry,
	CrossTenantIdentityMapping,
	CustomerOrderHistoryQuery,
	CustomerBookingHistoryQuery,
	PaginatedResult,
	TenantScopedOrderHistoryRecord,
	TenantScopedBookingHistoryRecord,
} from "@platform/types";
import { isCustomerInTenant } from "@platform/types";

import { CustomerRepository } from "./customer.repository";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class CustomerNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CustomerNotFoundError";
	}
}

export class CustomerValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CustomerValidationError";
	}
}

export class CustomerAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CustomerAuthError";
	}
}

// ---------------------------------------------------------------------------
// Customer domain service
// ---------------------------------------------------------------------------

@Injectable()
export class CustomerService {
	constructor(
		private readonly repository: CustomerRepository = new CustomerRepository()
	) {}

	// ── T1: Registration, Login & Profile ────────────────────────────────────

	register(input: CustomerRegistrationInput): CustomerProfile {
		if (!input.email || !input.email.includes("@")) {
			throw new CustomerValidationError("Invalid email address.");
		}
		if (!input.password || input.password.length < 8) {
			throw new CustomerValidationError("Password must be at least 8 characters.");
		}
		if (!input.tenantId) {
			throw new CustomerValidationError("Tenant ID is required.");
		}

		const existing = this.repository.findProfileByEmail(input.tenantId, input.email);
		if (existing) {
			throw new CustomerValidationError("An account with this email already exists for this business.");
		}

		// Create a pseudo user ID (in production, this would integrate with E2 auth)
		// The userId is derived from email only — the same person has the same userId
		// across tenants, but separate CustomerProfile records per tenant.
		const userId = `user-${input.email}`;

		return this.repository.createProfile(input.tenantId, {
			userId,
			email: input.email,
			displayName: input.displayName ?? null,
			phone: input.phone ?? null,
		});
	}

	login(input: CustomerLoginInput): CustomerLoginResponse {
		if (!input.email || !input.password) {
			throw new CustomerAuthError("Email and password are required.");
		}

		const profile = this.repository.findProfileByEmail(input.tenantId, input.email);
		if (!profile) {
			throw new CustomerAuthError("Invalid email or password.");
		}

		// In production, password verification happens via E2 auth session-lifecycle
		// For this layer, we return the profile and a session token placeholder
		return {
			profile,
			sessionToken: `session-${profile.id}-${Date.now()}`,
		};
	}

	getProfile(tenantId: string, customerId: string): CustomerProfile {
		const profile = this.repository.findProfileById(tenantId, customerId);
		if (!profile) {
			throw new CustomerNotFoundError(`Customer ${customerId} not found in tenant ${tenantId}.`);
		}
		if (!isCustomerInTenant(profile, tenantId)) {
			throw new CustomerNotFoundError(`Customer ${customerId} not found in tenant ${tenantId}.`);
		}
		return profile;
	}

	updateProfile(tenantId: string, customerId: string, input: CustomerProfileUpdateInput): CustomerProfile {
		const updated = this.repository.updateProfile(tenantId, customerId, input);
		if (!updated) {
			throw new CustomerNotFoundError(`Customer ${customerId} not found in tenant ${tenantId}.`);
		}
		return updated;
	}

	// ── T2: Account History Queries ──────────────────────────────────────────
	// These return tenant-scoped order and booking history for the authenticated customer.
	// Order/booking records are queried from their respective repositories.
	// For integration, the caller passes the order/booking data; this service
	// enforces tenant + customer scoping.

	getOrderHistory(
		query: CustomerOrderHistoryQuery,
		allOrders: readonly TenantScopedOrderHistoryRecord[]
	): PaginatedResult<TenantScopedOrderHistoryRecord> {
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;

		let filtered = allOrders.filter(
			(o) => o.tenantId === query.tenantId && o.customerId === query.customerId
		);

		if (query.status) {
			filtered = filtered.filter((o) => o.status === query.status);
		}

		const total = filtered.length;
		const start = (page - 1) * pageSize;
		const items = filtered.slice(start, start + pageSize);

		return { items, total, page, pageSize };
	}

	getBookingHistory(
		query: CustomerBookingHistoryQuery,
		allBookings: readonly TenantScopedBookingHistoryRecord[]
	): PaginatedResult<TenantScopedBookingHistoryRecord> {
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;

		let filtered = allBookings.filter(
			(b) => b.tenantId === query.tenantId && b.customerId === query.customerId
		);

		if (query.status) {
			filtered = filtered.filter((b) => b.status === query.status);
		}

		const total = filtered.length;
		const start = (page - 1) * pageSize;
		const items = filtered.slice(start, start + pageSize);

		return { items, total, page, pageSize };
	}

	// ── T3: Saved Address CRUD ───────────────────────────────────────────────

	addAddress(tenantId: string, customerId: string, input: CreateSavedAddressInput): SavedAddress {
		this.ensureCustomerExists(tenantId, customerId);
		if (!input.line1 || !input.city || !input.state || !input.zip) {
			throw new CustomerValidationError("Address line1, city, state, and zip are required.");
		}
		return this.repository.createAddress(tenantId, customerId, input);
	}

	listAddresses(tenantId: string, customerId: string): SavedAddress[] {
		this.ensureCustomerExists(tenantId, customerId);
		return this.repository.listAddresses(tenantId, customerId);
	}

	updateAddress(tenantId: string, customerId: string, addressId: string, input: UpdateSavedAddressInput): SavedAddress {
		this.ensureCustomerExists(tenantId, customerId);
		const updated = this.repository.updateAddress(tenantId, customerId, addressId, input);
		if (!updated) {
			throw new CustomerNotFoundError(`Address ${addressId} not found.`);
		}
		return updated;
	}

	deleteAddress(tenantId: string, customerId: string, addressId: string): void {
		this.ensureCustomerExists(tenantId, customerId);
		const deleted = this.repository.deleteAddress(tenantId, customerId, addressId);
		if (!deleted) {
			throw new CustomerNotFoundError(`Address ${addressId} not found.`);
		}
	}

	setDefaultAddress(tenantId: string, customerId: string, addressId: string): SavedAddress {
		this.ensureCustomerExists(tenantId, customerId);
		const updated = this.repository.setDefaultAddress(tenantId, customerId, addressId);
		if (!updated) {
			throw new CustomerNotFoundError(`Address ${addressId} not found.`);
		}
		return updated;
	}

	// ── T4: Saved Payment Method Management ──────────────────────────────────
	// SECURITY: Only gateway tokens stored; raw card numbers NEVER accepted.

	addPaymentMethod(tenantId: string, customerId: string, input: AddPaymentMethodInput): SavedPaymentMethod {
		this.ensureCustomerExists(tenantId, customerId);
		if (!input.gatewayToken) {
			throw new CustomerValidationError("Gateway token is required.");
		}
		if (!input.lastFour || input.lastFour.length !== 4) {
			throw new CustomerValidationError("Last four digits must be exactly 4 characters.");
		}
		return this.repository.addPaymentMethod(tenantId, customerId, input);
	}

	listPaymentMethods(tenantId: string, customerId: string): SavedPaymentMethod[] {
		this.ensureCustomerExists(tenantId, customerId);
		return this.repository.listPaymentMethods(tenantId, customerId);
	}

	removePaymentMethod(tenantId: string, customerId: string, paymentMethodId: string): void {
		this.ensureCustomerExists(tenantId, customerId);
		const removed = this.repository.removePaymentMethod(tenantId, customerId, paymentMethodId);
		if (!removed) {
			throw new CustomerNotFoundError(`Payment method ${paymentMethodId} not found.`);
		}
	}

	setDefaultPaymentMethod(tenantId: string, customerId: string, paymentMethodId: string): SavedPaymentMethod {
		this.ensureCustomerExists(tenantId, customerId);
		const updated = this.repository.setDefaultPaymentMethod(tenantId, customerId, paymentMethodId);
		if (!updated) {
			throw new CustomerNotFoundError(`Payment method ${paymentMethodId} not found.`);
		}
		return updated;
	}

	// ── T5: Loyalty Account Read Model ───────────────────────────────────────

	getLoyaltyAccount(tenantId: string, customerId: string): LoyaltyAccount {
		this.ensureCustomerExists(tenantId, customerId);
		return this.repository.getOrCreateLoyaltyAccount(tenantId, customerId);
	}

	getLoyaltyHistory(
		tenantId: string,
		customerId: string,
		page: number = 1,
		pageSize: number = 20
	): LoyaltyPointsHistoryResponse {
		this.ensureCustomerExists(tenantId, customerId);
		const result = this.repository.getLoyaltyHistory(tenantId, customerId, page, pageSize);
		return {
			entries: result.entries,
			total: result.total,
			page,
			pageSize,
		};
	}

	// ── T6: Notification Preferences ─────────────────────────────────────────

	getNotificationPreferences(tenantId: string, customerId: string): NotificationPreferences {
		this.ensureCustomerExists(tenantId, customerId);
		return this.repository.getOrCreateNotificationPreferences(tenantId, customerId);
	}

	updateNotificationPreferences(
		tenantId: string,
		customerId: string,
		preferences: NotificationPreferenceEntry[]
	): NotificationPreferences {
		this.ensureCustomerExists(tenantId, customerId);
		return this.repository.updateNotificationPreferences(tenantId, customerId, preferences);
	}

	// ── T8: Cross-Tenant Identity ────────────────────────────────────────────

	getCrossTenantIdentity(
		userId: string,
		tenantNameResolver: (tenantId: string) => string
	): CrossTenantIdentityMapping {
		const profiles = this.repository.findAllProfilesForUser(userId);
		return {
			userId,
			email: profiles[0]?.email ?? "",
			tenantProfiles: profiles.map((p) => ({
				tenantId: p.tenantId,
				tenantName: tenantNameResolver(p.tenantId),
				customerId: p.id,
				displayName: p.displayName,
				createdAt: p.createdAt,
			})),
		};
	}

	// ── Internal Helpers ─────────────────────────────────────────────────────

	private ensureCustomerExists(tenantId: string, customerId: string): void {
		const profile = this.repository.findProfileById(tenantId, customerId);
		if (!profile) {
			throw new CustomerNotFoundError(`Customer ${customerId} not found in tenant ${tenantId}.`);
		}
	}
}
