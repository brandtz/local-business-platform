import { describe, expect, it, beforeEach } from "vitest";

import { CustomerService, CustomerNotFoundError, CustomerValidationError, CustomerAuthError } from "./customer.service";

// ── Test Helpers ─────────────────────────────────────────────────────────────

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function createService(): CustomerService {
	return new CustomerService();
}

function registerCustomer(
	service: CustomerService,
	tenantId: string = TENANT_A,
	email: string = "alice@example.com"
) {
	return service.register({
		tenantId,
		email,
		password: "password123",
		displayName: "Alice",
		phone: "555-1234",
	});
}

// ── T1: Customer Registration, Login & Profile ──────────────────────────────

describe("CustomerService — Registration", () => {
	let service: CustomerService;

	beforeEach(() => {
		service = createService();
	});

	it("registers a new customer within a tenant", () => {
		const profile = registerCustomer(service);
		expect(profile.id).toBeDefined();
		expect(profile.tenantId).toBe(TENANT_A);
		expect(profile.email).toBe("alice@example.com");
		expect(profile.displayName).toBe("Alice");
		expect(profile.phone).toBe("555-1234");
	});

	it("rejects registration with invalid email", () => {
		expect(() =>
			service.register({
				tenantId: TENANT_A,
				email: "notanemail",
				password: "password123",
			})
		).toThrow(CustomerValidationError);
	});

	it("rejects registration with short password", () => {
		expect(() =>
			service.register({
				tenantId: TENANT_A,
				email: "alice@example.com",
				password: "short",
			})
		).toThrow(CustomerValidationError);
	});

	it("rejects duplicate email within the same tenant", () => {
		registerCustomer(service);
		expect(() => registerCustomer(service)).toThrow(CustomerValidationError);
	});

	it("allows same email in different tenants (cross-tenant)", () => {
		const profileA = registerCustomer(service, TENANT_A);
		const profileB = registerCustomer(service, TENANT_B);
		expect(profileA.id).not.toBe(profileB.id);
		expect(profileA.tenantId).toBe(TENANT_A);
		expect(profileB.tenantId).toBe(TENANT_B);
	});

	it("rejects registration without tenant ID", () => {
		expect(() =>
			service.register({
				tenantId: "",
				email: "alice@example.com",
				password: "password123",
			})
		).toThrow(CustomerValidationError);
	});
});

describe("CustomerService — Login", () => {
	let service: CustomerService;

	beforeEach(() => {
		service = createService();
	});

	it("logs in an existing customer", () => {
		const profile = registerCustomer(service);
		const response = service.login({
			tenantId: TENANT_A,
			email: "alice@example.com",
			password: "password123",
		});
		expect(response.profile.id).toBe(profile.id);
		expect(response.sessionToken).toBeDefined();
	});

	it("rejects login for non-existent customer", () => {
		expect(() =>
			service.login({
				tenantId: TENANT_A,
				email: "nobody@example.com",
				password: "password123",
			})
		).toThrow(CustomerAuthError);
	});

	it("rejects login with empty credentials", () => {
		expect(() =>
			service.login({
				tenantId: TENANT_A,
				email: "",
				password: "password123",
			})
		).toThrow(CustomerAuthError);
	});
});

describe("CustomerService — Profile", () => {
	let service: CustomerService;
	let customerId: string;

	beforeEach(() => {
		service = createService();
		const profile = registerCustomer(service);
		customerId = profile.id;
	});

	it("retrieves profile for the correct tenant", () => {
		const profile = service.getProfile(TENANT_A, customerId);
		expect(profile.email).toBe("alice@example.com");
		expect(profile.tenantId).toBe(TENANT_A);
	});

	it("throws for wrong tenant", () => {
		expect(() => service.getProfile(TENANT_B, customerId)).toThrow(CustomerNotFoundError);
	});

	it("updates profile fields", () => {
		const updated = service.updateProfile(TENANT_A, customerId, {
			displayName: "Alice Updated",
			phone: "555-9999",
		});
		expect(updated.displayName).toBe("Alice Updated");
		expect(updated.phone).toBe("555-9999");
	});

	it("throws when updating non-existent customer", () => {
		expect(() =>
			service.updateProfile(TENANT_A, "nonexistent", { displayName: "Test" })
		).toThrow(CustomerNotFoundError);
	});
});

// ── T2: Account History Queries ─────────────────────────────────────────────

describe("CustomerService — Order History", () => {
	let service: CustomerService;
	let customerId: string;

	const sampleOrders = [
		{ id: "o-1", tenantId: TENANT_A, customerId: "", status: "completed", totalCents: 1000, createdAt: "2026-01-01T00:00:00Z" },
		{ id: "o-2", tenantId: TENANT_A, customerId: "", status: "placed", totalCents: 2000, createdAt: "2026-01-02T00:00:00Z" },
		{ id: "o-3", tenantId: TENANT_B, customerId: "", status: "completed", totalCents: 3000, createdAt: "2026-01-03T00:00:00Z" },
		{ id: "o-4", tenantId: TENANT_A, customerId: "other-customer", status: "completed", totalCents: 4000, createdAt: "2026-01-04T00:00:00Z" },
	] as const;

	beforeEach(() => {
		service = createService();
		const profile = registerCustomer(service);
		customerId = profile.id;
	});

	it("returns only the customer's orders for the current tenant", () => {
		const orders = sampleOrders.map((o) => ({
			...o,
			customerId: o.customerId || customerId,
		}));
		const result = service.getOrderHistory(
			{ customerId, tenantId: TENANT_A },
			orders
		);
		// Should include o-1 and o-2 (tenant-a, matching customer), NOT o-3 (tenant-b) or o-4 (other customer)
		expect(result.items).toHaveLength(2);
		expect(result.items.every((o) => o.tenantId === TENANT_A)).toBe(true);
		expect(result.items.every((o) => o.customerId === customerId)).toBe(true);
	});

	it("never returns orders from a different tenant", () => {
		const orders = sampleOrders.map((o) => ({
			...o,
			customerId: o.customerId || customerId,
		}));
		const result = service.getOrderHistory(
			{ customerId, tenantId: TENANT_A },
			orders
		);
		expect(result.items.some((o) => o.tenantId === TENANT_B)).toBe(false);
	});

	it("filters by status", () => {
		const orders = sampleOrders.map((o) => ({
			...o,
			customerId: o.customerId || customerId,
		}));
		const result = service.getOrderHistory(
			{ customerId, tenantId: TENANT_A, status: "completed" },
			orders
		);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].status).toBe("completed");
	});

	it("paginates results", () => {
		const orders = sampleOrders.map((o) => ({
			...o,
			customerId: o.customerId || customerId,
		}));
		const result = service.getOrderHistory(
			{ customerId, tenantId: TENANT_A, page: 1, pageSize: 1 },
			orders
		);
		expect(result.items).toHaveLength(1);
		expect(result.total).toBe(2);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(1);
	});
});

describe("CustomerService — Booking History", () => {
	let service: CustomerService;
	let customerId: string;

	const sampleBookings = [
		{ id: "b-1", tenantId: TENANT_A, customerId: "", status: "completed", createdAt: "2026-01-01T00:00:00Z" },
		{ id: "b-2", tenantId: TENANT_A, customerId: "", status: "confirmed", createdAt: "2026-01-02T00:00:00Z" },
		{ id: "b-3", tenantId: TENANT_B, customerId: "", status: "completed", createdAt: "2026-01-03T00:00:00Z" },
	] as const;

	beforeEach(() => {
		service = createService();
		const profile = registerCustomer(service);
		customerId = profile.id;
	});

	it("returns only the customer's bookings for the current tenant", () => {
		const bookings = sampleBookings.map((b) => ({
			...b,
			customerId: b.customerId || customerId,
		}));
		const result = service.getBookingHistory(
			{ customerId, tenantId: TENANT_A },
			bookings
		);
		expect(result.items).toHaveLength(2);
		expect(result.items.every((b) => b.tenantId === TENANT_A)).toBe(true);
	});

	it("never returns bookings from a different tenant", () => {
		const bookings = sampleBookings.map((b) => ({
			...b,
			customerId: b.customerId || customerId,
		}));
		const result = service.getBookingHistory(
			{ customerId, tenantId: TENANT_A },
			bookings
		);
		expect(result.items.some((b) => b.tenantId === TENANT_B)).toBe(false);
	});
});

// ── T3: Saved Address CRUD ──────────────────────────────────────────────────

describe("CustomerService — Saved Addresses", () => {
	let service: CustomerService;
	let customerId: string;

	beforeEach(() => {
		service = createService();
		const profile = registerCustomer(service);
		customerId = profile.id;
	});

	it("adds a new address", () => {
		const addr = service.addAddress(TENANT_A, customerId, {
			label: "Home",
			line1: "123 Main St",
			city: "Anytown",
			state: "CA",
			zip: "90210",
		});
		expect(addr.id).toBeDefined();
		expect(addr.label).toBe("Home");
		expect(addr.isDefault).toBe(false);
	});

	it("lists addresses for the customer", () => {
		service.addAddress(TENANT_A, customerId, {
			label: "Home",
			line1: "123 Main St",
			city: "Anytown",
			state: "CA",
			zip: "90210",
		});
		service.addAddress(TENANT_A, customerId, {
			label: "Work",
			line1: "456 Office Ave",
			city: "Workville",
			state: "NY",
			zip: "10001",
		});
		const addresses = service.listAddresses(TENANT_A, customerId);
		expect(addresses).toHaveLength(2);
	});

	it("updates an address", () => {
		const addr = service.addAddress(TENANT_A, customerId, {
			label: "Home",
			line1: "123 Main St",
			city: "Anytown",
			state: "CA",
			zip: "90210",
		});
		const updated = service.updateAddress(TENANT_A, customerId, addr.id, {
			label: "Updated Home",
		});
		expect(updated.label).toBe("Updated Home");
	});

	it("deletes an address", () => {
		const addr = service.addAddress(TENANT_A, customerId, {
			label: "Home",
			line1: "123 Main St",
			city: "Anytown",
			state: "CA",
			zip: "90210",
		});
		service.deleteAddress(TENANT_A, customerId, addr.id);
		expect(service.listAddresses(TENANT_A, customerId)).toHaveLength(0);
	});

	it("sets a default address and clears the previous default", () => {
		const addr1 = service.addAddress(TENANT_A, customerId, {
			label: "Home",
			line1: "123 Main St",
			city: "Anytown",
			state: "CA",
			zip: "90210",
			isDefault: true,
		});
		expect(addr1.isDefault).toBe(true);

		const addr2 = service.addAddress(TENANT_A, customerId, {
			label: "Work",
			line1: "456 Office Ave",
			city: "Workville",
			state: "NY",
			zip: "10001",
		});
		service.setDefaultAddress(TENANT_A, customerId, addr2.id);

		const addresses = service.listAddresses(TENANT_A, customerId);
		const home = addresses.find((a) => a.id === addr1.id);
		const work = addresses.find((a) => a.id === addr2.id);
		expect(home?.isDefault).toBe(false);
		expect(work?.isDefault).toBe(true);
	});

	it("rejects address with missing required fields", () => {
		expect(() =>
			service.addAddress(TENANT_A, customerId, {
				label: "Home",
				line1: "",
				city: "Anytown",
				state: "CA",
				zip: "90210",
			})
		).toThrow(CustomerValidationError);
	});

	it("throws for non-existent customer", () => {
		expect(() =>
			service.addAddress(TENANT_A, "nonexistent", {
				label: "Home",
				line1: "123 Main St",
				city: "Anytown",
				state: "CA",
				zip: "90210",
			})
		).toThrow(CustomerNotFoundError);
	});
});

// ── T4: Saved Payment Method Management ─────────────────────────────────────

describe("CustomerService — Payment Methods", () => {
	let service: CustomerService;
	let customerId: string;

	beforeEach(() => {
		service = createService();
		const profile = registerCustomer(service);
		customerId = profile.id;
	});

	it("adds a payment method with gateway token", () => {
		const pm = service.addPaymentMethod(TENANT_A, customerId, {
			gatewayToken: "tok_1234567890",
			cardBrand: "visa",
			lastFour: "4242",
			expiryMonth: 12,
			expiryYear: 2028,
		});
		expect(pm.id).toBeDefined();
		expect(pm.gatewayToken).toBe("tok_1234567890");
		expect(pm.lastFour).toBe("4242");
	});

	it("lists payment methods for the customer", () => {
		service.addPaymentMethod(TENANT_A, customerId, {
			gatewayToken: "tok_1",
			cardBrand: "visa",
			lastFour: "4242",
			expiryMonth: 12,
			expiryYear: 2028,
		});
		service.addPaymentMethod(TENANT_A, customerId, {
			gatewayToken: "tok_2",
			cardBrand: "mastercard",
			lastFour: "5555",
			expiryMonth: 6,
			expiryYear: 2027,
		});
		const methods = service.listPaymentMethods(TENANT_A, customerId);
		expect(methods).toHaveLength(2);
	});

	it("removes a payment method", () => {
		const pm = service.addPaymentMethod(TENANT_A, customerId, {
			gatewayToken: "tok_1",
			cardBrand: "visa",
			lastFour: "4242",
			expiryMonth: 12,
			expiryYear: 2028,
		});
		service.removePaymentMethod(TENANT_A, customerId, pm.id);
		expect(service.listPaymentMethods(TENANT_A, customerId)).toHaveLength(0);
	});

	it("sets a default payment method", () => {
		const pm1 = service.addPaymentMethod(TENANT_A, customerId, {
			gatewayToken: "tok_1",
			cardBrand: "visa",
			lastFour: "4242",
			expiryMonth: 12,
			expiryYear: 2028,
			isDefault: true,
		});
		const pm2 = service.addPaymentMethod(TENANT_A, customerId, {
			gatewayToken: "tok_2",
			cardBrand: "mastercard",
			lastFour: "5555",
			expiryMonth: 6,
			expiryYear: 2027,
		});
		service.setDefaultPaymentMethod(TENANT_A, customerId, pm2.id);

		const methods = service.listPaymentMethods(TENANT_A, customerId);
		expect(methods.find((m) => m.id === pm1.id)?.isDefault).toBe(false);
		expect(methods.find((m) => m.id === pm2.id)?.isDefault).toBe(true);
	});

	it("rejects payment method without gateway token", () => {
		expect(() =>
			service.addPaymentMethod(TENANT_A, customerId, {
				gatewayToken: "",
				cardBrand: "visa",
				lastFour: "4242",
				expiryMonth: 12,
				expiryYear: 2028,
			})
		).toThrow(CustomerValidationError);
	});

	it("rejects payment method with invalid lastFour", () => {
		expect(() =>
			service.addPaymentMethod(TENANT_A, customerId, {
				gatewayToken: "tok_1",
				cardBrand: "visa",
				lastFour: "42",
				expiryMonth: 12,
				expiryYear: 2028,
			})
		).toThrow(CustomerValidationError);
	});

	it("never exposes raw card numbers in stored data", () => {
		const pm = service.addPaymentMethod(TENANT_A, customerId, {
			gatewayToken: "tok_1234567890",
			cardBrand: "visa",
			lastFour: "4242",
			expiryMonth: 12,
			expiryYear: 2028,
		});
		const keys = Object.keys(pm);
		expect(keys).not.toContain("cardNumber");
		expect(keys).not.toContain("rawCardNumber");
		expect(keys).not.toContain("number");
		expect(keys).not.toContain("pan");
	});
});

// ── T5: Loyalty Account Read Model ──────────────────────────────────────────

describe("CustomerService — Loyalty", () => {
	let service: CustomerService;
	let customerId: string;

	beforeEach(() => {
		service = createService();
		const profile = registerCustomer(service);
		customerId = profile.id;
	});

	it("returns a default loyalty account", () => {
		const account = service.getLoyaltyAccount(TENANT_A, customerId);
		expect(account.currentTier).toBe("bronze");
		expect(account.pointBalance).toBe(0);
		expect(account.lifetimePoints).toBe(0);
		expect(account.tierProgressionThresholds).toHaveLength(4);
	});

	it("returns empty loyalty history initially", () => {
		const history = service.getLoyaltyHistory(TENANT_A, customerId);
		expect(history.entries).toHaveLength(0);
		expect(history.total).toBe(0);
	});

	it("is scoped to the tenant", () => {
		const accountA = service.getLoyaltyAccount(TENANT_A, customerId);
		expect(accountA.tenantId).toBe(TENANT_A);
		expect(accountA.customerId).toBe(customerId);
	});
});

// ── T6: Notification Preferences ────────────────────────────────────────────

describe("CustomerService — Notification Preferences", () => {
	let service: CustomerService;
	let customerId: string;

	beforeEach(() => {
		service = createService();
		const profile = registerCustomer(service);
		customerId = profile.id;
	});

	it("returns default notification preferences", () => {
		const prefs = service.getNotificationPreferences(TENANT_A, customerId);
		expect(prefs.preferences).toHaveLength(4);
		expect(prefs.tenantId).toBe(TENANT_A);
		expect(prefs.customerId).toBe(customerId);
	});

	it("updates notification preferences", () => {
		const updated = service.updateNotificationPreferences(TENANT_A, customerId, [
			{ category: "orders", email: true, sms: false, push: false },
			{ category: "bookings", email: false, sms: false, push: false },
			{ category: "promotions", email: false, sms: false, push: false },
			{ category: "account", email: true, sms: false, push: false },
		]);
		const ordersPref = updated.preferences.find((p) => p.category === "orders");
		expect(ordersPref?.sms).toBe(false);
		expect(ordersPref?.push).toBe(false);
	});
});

// ── T8: Cross-Tenant Identity ───────────────────────────────────────────────

describe("CustomerService — Cross-Tenant Identity", () => {
	let service: CustomerService;

	beforeEach(() => {
		service = createService();
	});

	it("maps one person's identity to per-tenant profiles", () => {
		const profileA = registerCustomer(service, TENANT_A, "alice@example.com");
		const profileB = registerCustomer(service, TENANT_B, "alice@example.com");

		const mapping = service.getCrossTenantIdentity(
			profileA.userId,
			(tid) => tid === TENANT_A ? "Business A" : "Business B"
		);

		expect(mapping.tenantProfiles).toHaveLength(2);
		expect(mapping.tenantProfiles[0].tenantId).toBe(TENANT_A);
		expect(mapping.tenantProfiles[1].tenantId).toBe(TENANT_B);
		expect(mapping.tenantProfiles[0].customerId).not.toBe(mapping.tenantProfiles[1].customerId);
	});

	it("ensures tenant A orders never appear in tenant B profile", () => {
		const profileA = registerCustomer(service, TENANT_A, "alice@example.com");
		registerCustomer(service, TENANT_B, "alice@example.com");

		// Query orders for tenant B — should find nothing for tenant A customer ID
		const result = service.getOrderHistory(
			{ customerId: profileA.id, tenantId: TENANT_B },
			[
				{ id: "o-1", tenantId: TENANT_A, customerId: profileA.id, status: "completed", totalCents: 1000, createdAt: "2026-01-01T00:00:00Z" },
			]
		);
		expect(result.items).toHaveLength(0);
	});

	it("tenant B customer has separate profile and history", () => {
		registerCustomer(service, TENANT_A, "alice@example.com");
		const profileB = registerCustomer(service, TENANT_B, "alice@example.com");

		// Loyalty for tenant B is separate
		const loyaltyB = service.getLoyaltyAccount(TENANT_B, profileB.id);
		expect(loyaltyB.tenantId).toBe(TENANT_B);
		expect(loyaltyB.customerId).toBe(profileB.id);

		// Notification prefs for tenant B are separate
		const prefsB = service.getNotificationPreferences(TENANT_B, profileB.id);
		expect(prefsB.tenantId).toBe(TENANT_B);
	});
});
