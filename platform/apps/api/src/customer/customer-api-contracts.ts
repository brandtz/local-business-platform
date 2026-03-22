// E7-S5: Customer account API contract assertions.
// Validates request payloads for customer registration, login, profile,
// saved addresses, payment methods, loyalty, and notification endpoints.
// Security: payment method inputs must use gateway tokens only.

import type {
	CustomerRegistrationInput,
	CustomerLoginInput,
	CustomerProfileUpdateInput,
	CreateSavedAddressInput,
	UpdateSavedAddressInput,
	AddPaymentMethodInput,
	UpdateNotificationPreferencesInput,
	NotificationPreferenceEntry,
	CustomerOrderHistoryQuery,
	CustomerBookingHistoryQuery,
} from "@platform/types";

// ── Registration ─────────────────────────────────────────────────────────────

export function assertCustomerRegistrationInput(
	input: unknown
): asserts input is CustomerRegistrationInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Registration input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("tenantId is required.");
	}
	if (typeof obj.email !== "string" || !obj.email.includes("@")) {
		throw new Error("Valid email is required.");
	}
	if (typeof obj.password !== "string" || (obj.password as string).length < 8) {
		throw new Error("Password must be at least 8 characters.");
	}
}

// ── Login ────────────────────────────────────────────────────────────────────

export function assertCustomerLoginInput(
	input: unknown
): asserts input is CustomerLoginInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Login input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("tenantId is required.");
	}
	if (typeof obj.email !== "string" || !obj.email) {
		throw new Error("Email is required.");
	}
	if (typeof obj.password !== "string" || !obj.password) {
		throw new Error("Password is required.");
	}
}

// ── Profile Update ───────────────────────────────────────────────────────────

export function assertCustomerProfileUpdateInput(
	input: unknown
): asserts input is CustomerProfileUpdateInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Profile update input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (obj.displayName !== undefined && typeof obj.displayName !== "string") {
		throw new Error("displayName must be a string.");
	}
	if (obj.phone !== undefined && typeof obj.phone !== "string") {
		throw new Error("phone must be a string.");
	}
}

// ── Saved Address ────────────────────────────────────────────────────────────

export function assertCreateSavedAddressInput(
	input: unknown
): asserts input is CreateSavedAddressInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Address input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.label !== "string" || !obj.label) {
		throw new Error("Label is required.");
	}
	if (typeof obj.line1 !== "string" || !obj.line1) {
		throw new Error("Address line 1 is required.");
	}
	if (typeof obj.city !== "string" || !obj.city) {
		throw new Error("City is required.");
	}
	if (typeof obj.state !== "string" || !obj.state) {
		throw new Error("State is required.");
	}
	if (typeof obj.zip !== "string" || !obj.zip) {
		throw new Error("ZIP code is required.");
	}
}

export function assertUpdateSavedAddressInput(
	input: unknown
): asserts input is UpdateSavedAddressInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Address update input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (obj.label !== undefined && typeof obj.label !== "string") {
		throw new Error("label must be a string.");
	}
	if (obj.line1 !== undefined && typeof obj.line1 !== "string") {
		throw new Error("line1 must be a string.");
	}
	if (obj.city !== undefined && typeof obj.city !== "string") {
		throw new Error("city must be a string.");
	}
	if (obj.state !== undefined && typeof obj.state !== "string") {
		throw new Error("state must be a string.");
	}
	if (obj.zip !== undefined && typeof obj.zip !== "string") {
		throw new Error("zip must be a string.");
	}
}

// ── Payment Method ───────────────────────────────────────────────────────────
// SECURITY: Only gateway tokens accepted; raw card numbers rejected.

export function assertAddPaymentMethodInput(
	input: unknown
): asserts input is AddPaymentMethodInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Payment method input must be an object.");
	}
	const obj = input as Record<string, unknown>;

	// Security: reject any raw card number field
	if ("cardNumber" in obj || "rawCardNumber" in obj || "number" in obj || "pan" in obj) {
		throw new Error("Raw card numbers are not accepted. Use a gateway token.");
	}

	if (typeof obj.gatewayToken !== "string" || !obj.gatewayToken) {
		throw new Error("Gateway token is required.");
	}
	if (typeof obj.cardBrand !== "string" || !obj.cardBrand) {
		throw new Error("Card brand is required.");
	}
	if (typeof obj.lastFour !== "string" || (obj.lastFour as string).length !== 4) {
		throw new Error("lastFour must be exactly 4 characters.");
	}
	if (typeof obj.expiryMonth !== "number" || obj.expiryMonth < 1 || obj.expiryMonth > 12) {
		throw new Error("expiryMonth must be between 1 and 12.");
	}
	if (typeof obj.expiryYear !== "number" || obj.expiryYear < 2020) {
		throw new Error("expiryYear must be a valid year.");
	}
}

// ── Notification Preferences ─────────────────────────────────────────────────

export function assertUpdateNotificationPreferencesInput(
	input: unknown
): asserts input is UpdateNotificationPreferencesInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Notification preferences input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (!Array.isArray(obj.preferences)) {
		throw new Error("preferences must be an array.");
	}
	for (const pref of obj.preferences as unknown[]) {
		assertNotificationPreferenceEntry(pref);
	}
}

function assertNotificationPreferenceEntry(
	input: unknown
): asserts input is NotificationPreferenceEntry {
	if (typeof input !== "object" || input === null) {
		throw new Error("Preference entry must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.category !== "string") {
		throw new Error("category must be a string.");
	}
	if (typeof obj.email !== "boolean") {
		throw new Error("email must be a boolean.");
	}
	if (typeof obj.sms !== "boolean") {
		throw new Error("sms must be a boolean.");
	}
	if (typeof obj.push !== "boolean") {
		throw new Error("push must be a boolean.");
	}
}

// ── History Queries ──────────────────────────────────────────────────────────

export function assertCustomerOrderHistoryQuery(
	input: unknown
): asserts input is CustomerOrderHistoryQuery {
	if (typeof input !== "object" || input === null) {
		throw new Error("Order history query must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.customerId !== "string" || !obj.customerId) {
		throw new Error("customerId is required.");
	}
	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("tenantId is required.");
	}
	if (obj.page !== undefined && (typeof obj.page !== "number" || obj.page < 1)) {
		throw new Error("page must be a positive number.");
	}
	if (obj.pageSize !== undefined && (typeof obj.pageSize !== "number" || obj.pageSize < 1 || obj.pageSize > 100)) {
		throw new Error("pageSize must be between 1 and 100.");
	}
}

export function assertCustomerBookingHistoryQuery(
	input: unknown
): asserts input is CustomerBookingHistoryQuery {
	if (typeof input !== "object" || input === null) {
		throw new Error("Booking history query must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.customerId !== "string" || !obj.customerId) {
		throw new Error("customerId is required.");
	}
	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("tenantId is required.");
	}
	if (obj.page !== undefined && (typeof obj.page !== "number" || obj.page < 1)) {
		throw new Error("page must be a positive number.");
	}
	if (obj.pageSize !== undefined && (typeof obj.pageSize !== "number" || obj.pageSize < 1 || obj.pageSize > 100)) {
		throw new Error("pageSize must be between 1 and 100.");
	}
}
