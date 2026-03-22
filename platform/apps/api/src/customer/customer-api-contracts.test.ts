import { describe, expect, it } from "vitest";

import {
	assertCustomerRegistrationInput,
	assertCustomerLoginInput,
	assertCustomerProfileUpdateInput,
	assertCreateSavedAddressInput,
	assertUpdateSavedAddressInput,
	assertAddPaymentMethodInput,
	assertUpdateNotificationPreferencesInput,
	assertCustomerOrderHistoryQuery,
	assertCustomerBookingHistoryQuery,
} from "./customer-api-contracts";

// ── Registration Contract ────────────────────────────────────────────────────

describe("assertCustomerRegistrationInput", () => {
	it("accepts valid registration input", () => {
		expect(() =>
			assertCustomerRegistrationInput({
				tenantId: "t-1",
				email: "user@example.com",
				password: "password123",
			})
		).not.toThrow();
	});

	it("accepts registration with optional fields", () => {
		expect(() =>
			assertCustomerRegistrationInput({
				tenantId: "t-1",
				email: "user@example.com",
				password: "password123",
				displayName: "Test User",
				phone: "555-1234",
			})
		).not.toThrow();
	});

	it("rejects null input", () => {
		expect(() => assertCustomerRegistrationInput(null)).toThrow();
	});

	it("rejects missing tenantId", () => {
		expect(() =>
			assertCustomerRegistrationInput({
				email: "user@example.com",
				password: "password123",
			})
		).toThrow("tenantId");
	});

	it("rejects invalid email", () => {
		expect(() =>
			assertCustomerRegistrationInput({
				tenantId: "t-1",
				email: "notanemail",
				password: "password123",
			})
		).toThrow("email");
	});

	it("rejects short password", () => {
		expect(() =>
			assertCustomerRegistrationInput({
				tenantId: "t-1",
				email: "user@example.com",
				password: "short",
			})
		).toThrow("Password");
	});
});

// ── Login Contract ───────────────────────────────────────────────────────────

describe("assertCustomerLoginInput", () => {
	it("accepts valid login input", () => {
		expect(() =>
			assertCustomerLoginInput({
				tenantId: "t-1",
				email: "user@example.com",
				password: "password123",
			})
		).not.toThrow();
	});

	it("rejects missing email", () => {
		expect(() =>
			assertCustomerLoginInput({
				tenantId: "t-1",
				password: "password123",
			})
		).toThrow("Email");
	});

	it("rejects missing password", () => {
		expect(() =>
			assertCustomerLoginInput({
				tenantId: "t-1",
				email: "user@example.com",
			})
		).toThrow("Password");
	});
});

// ── Profile Update Contract ──────────────────────────────────────────────────

describe("assertCustomerProfileUpdateInput", () => {
	it("accepts valid update input", () => {
		expect(() =>
			assertCustomerProfileUpdateInput({ displayName: "New Name" })
		).not.toThrow();
	});

	it("accepts empty update object", () => {
		expect(() =>
			assertCustomerProfileUpdateInput({})
		).not.toThrow();
	});

	it("rejects non-string displayName", () => {
		expect(() =>
			assertCustomerProfileUpdateInput({ displayName: 123 })
		).toThrow("displayName");
	});
});

// ── Saved Address Contract ───────────────────────────────────────────────────

describe("assertCreateSavedAddressInput", () => {
	it("accepts valid address input", () => {
		expect(() =>
			assertCreateSavedAddressInput({
				label: "Home",
				line1: "123 Main St",
				city: "Anytown",
				state: "CA",
				zip: "90210",
			})
		).not.toThrow();
	});

	it("rejects missing label", () => {
		expect(() =>
			assertCreateSavedAddressInput({
				line1: "123 Main St",
				city: "Anytown",
				state: "CA",
				zip: "90210",
			})
		).toThrow("Label");
	});

	it("rejects missing line1", () => {
		expect(() =>
			assertCreateSavedAddressInput({
				label: "Home",
				city: "Anytown",
				state: "CA",
				zip: "90210",
			})
		).toThrow("line 1");
	});

	it("rejects missing city", () => {
		expect(() =>
			assertCreateSavedAddressInput({
				label: "Home",
				line1: "123 Main St",
				state: "CA",
				zip: "90210",
			})
		).toThrow("City");
	});
});

describe("assertUpdateSavedAddressInput", () => {
	it("accepts valid partial update", () => {
		expect(() =>
			assertUpdateSavedAddressInput({ label: "Work" })
		).not.toThrow();
	});

	it("accepts empty update", () => {
		expect(() =>
			assertUpdateSavedAddressInput({})
		).not.toThrow();
	});

	it("rejects non-string label", () => {
		expect(() =>
			assertUpdateSavedAddressInput({ label: 123 })
		).toThrow("label");
	});
});

// ── Payment Method Contract ──────────────────────────────────────────────────

describe("assertAddPaymentMethodInput", () => {
	it("accepts valid payment method input", () => {
		expect(() =>
			assertAddPaymentMethodInput({
				gatewayToken: "tok_1234567890",
				cardBrand: "visa",
				lastFour: "4242",
				expiryMonth: 12,
				expiryYear: 2028,
			})
		).not.toThrow();
	});

	it("rejects raw card number field", () => {
		expect(() =>
			assertAddPaymentMethodInput({
				cardNumber: "4242424242424242",
				gatewayToken: "tok_1234567890",
				cardBrand: "visa",
				lastFour: "4242",
				expiryMonth: 12,
				expiryYear: 2028,
			})
		).toThrow("Raw card numbers");
	});

	it("rejects rawCardNumber field", () => {
		expect(() =>
			assertAddPaymentMethodInput({
				rawCardNumber: "4242424242424242",
				gatewayToken: "tok_1234567890",
				cardBrand: "visa",
				lastFour: "4242",
				expiryMonth: 12,
				expiryYear: 2028,
			})
		).toThrow("Raw card numbers");
	});

	it("rejects pan field", () => {
		expect(() =>
			assertAddPaymentMethodInput({
				pan: "4242424242424242",
				gatewayToken: "tok_1234567890",
				cardBrand: "visa",
				lastFour: "4242",
				expiryMonth: 12,
				expiryYear: 2028,
			})
		).toThrow("Raw card numbers");
	});

	it("rejects missing gateway token", () => {
		expect(() =>
			assertAddPaymentMethodInput({
				cardBrand: "visa",
				lastFour: "4242",
				expiryMonth: 12,
				expiryYear: 2028,
			})
		).toThrow("Gateway token");
	});

	it("rejects invalid lastFour", () => {
		expect(() =>
			assertAddPaymentMethodInput({
				gatewayToken: "tok_1234567890",
				cardBrand: "visa",
				lastFour: "42",
				expiryMonth: 12,
				expiryYear: 2028,
			})
		).toThrow("lastFour");
	});

	it("rejects invalid expiryMonth", () => {
		expect(() =>
			assertAddPaymentMethodInput({
				gatewayToken: "tok_1234567890",
				cardBrand: "visa",
				lastFour: "4242",
				expiryMonth: 13,
				expiryYear: 2028,
			})
		).toThrow("expiryMonth");
	});
});

// ── Notification Preferences Contract ────────────────────────────────────────

describe("assertUpdateNotificationPreferencesInput", () => {
	it("accepts valid preferences input", () => {
		expect(() =>
			assertUpdateNotificationPreferencesInput({
				preferences: [
					{ category: "orders", email: true, sms: true, push: true },
					{ category: "bookings", email: true, sms: false, push: true },
				],
			})
		).not.toThrow();
	});

	it("rejects non-array preferences", () => {
		expect(() =>
			assertUpdateNotificationPreferencesInput({ preferences: "invalid" })
		).toThrow("array");
	});

	it("rejects entry with non-boolean email", () => {
		expect(() =>
			assertUpdateNotificationPreferencesInput({
				preferences: [
					{ category: "orders", email: "yes", sms: true, push: true },
				],
			})
		).toThrow("email");
	});
});

// ── History Query Contracts ──────────────────────────────────────────────────

describe("assertCustomerOrderHistoryQuery", () => {
	it("accepts valid query", () => {
		expect(() =>
			assertCustomerOrderHistoryQuery({
				customerId: "cust-1",
				tenantId: "t-1",
			})
		).not.toThrow();
	});

	it("accepts query with pagination", () => {
		expect(() =>
			assertCustomerOrderHistoryQuery({
				customerId: "cust-1",
				tenantId: "t-1",
				page: 2,
				pageSize: 50,
			})
		).not.toThrow();
	});

	it("rejects missing customerId", () => {
		expect(() =>
			assertCustomerOrderHistoryQuery({
				tenantId: "t-1",
			})
		).toThrow("customerId");
	});

	it("rejects invalid page", () => {
		expect(() =>
			assertCustomerOrderHistoryQuery({
				customerId: "cust-1",
				tenantId: "t-1",
				page: 0,
			})
		).toThrow("page");
	});

	it("rejects oversized pageSize", () => {
		expect(() =>
			assertCustomerOrderHistoryQuery({
				customerId: "cust-1",
				tenantId: "t-1",
				pageSize: 200,
			})
		).toThrow("pageSize");
	});
});

describe("assertCustomerBookingHistoryQuery", () => {
	it("accepts valid query", () => {
		expect(() =>
			assertCustomerBookingHistoryQuery({
				customerId: "cust-1",
				tenantId: "t-1",
			})
		).not.toThrow();
	});

	it("rejects missing tenantId", () => {
		expect(() =>
			assertCustomerBookingHistoryQuery({
				customerId: "cust-1",
			})
		).toThrow("tenantId");
	});
});
