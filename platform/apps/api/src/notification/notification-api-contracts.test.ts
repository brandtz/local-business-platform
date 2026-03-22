import { describe, it, expect } from "vitest";
import {
	validateAdminDeliveryLogQuery,
	validateCustomerNotificationQuery,
	sanitizeRecipientAddress,
} from "./notification-api-contracts";

// ---------------------------------------------------------------------------
// Admin delivery log query validation
// ---------------------------------------------------------------------------

describe("validateAdminDeliveryLogQuery", () => {
	it("accepts valid query with all optional filters", () => {
		const errors = validateAdminDeliveryLogQuery({
			tenantId: "t-1",
			eventType: "order.confirmed",
			channel: "email",
			status: "delivered",
			limit: 20,
			offset: 0,
		});
		expect(errors).toHaveLength(0);
	});

	it("accepts minimal valid query", () => {
		const errors = validateAdminDeliveryLogQuery({ tenantId: "t-1" });
		expect(errors).toHaveLength(0);
	});

	it("rejects missing tenantId", () => {
		const errors = validateAdminDeliveryLogQuery({ tenantId: "" });
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("tenantId");
		expect(errors[0].code).toBe("REQUIRED");
	});

	it("rejects invalid event type", () => {
		const errors = validateAdminDeliveryLogQuery({
			tenantId: "t-1",
			eventType: "invalid.type",
		});
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("eventType");
	});

	it("rejects invalid channel", () => {
		const errors = validateAdminDeliveryLogQuery({
			tenantId: "t-1",
			channel: "push",
		});
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("channel");
	});

	it("rejects invalid status", () => {
		const errors = validateAdminDeliveryLogQuery({
			tenantId: "t-1",
			status: "sent",
		});
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("status");
	});

	it("rejects limit out of range", () => {
		const errors = validateAdminDeliveryLogQuery({
			tenantId: "t-1",
			limit: 0,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("limit");

		const errors2 = validateAdminDeliveryLogQuery({
			tenantId: "t-1",
			limit: 101,
		});
		expect(errors2).toHaveLength(1);
	});

	it("rejects negative offset", () => {
		const errors = validateAdminDeliveryLogQuery({
			tenantId: "t-1",
			offset: -1,
		});
		expect(errors).toHaveLength(1);
		expect(errors[0].field).toBe("offset");
	});
});

// ---------------------------------------------------------------------------
// Customer notification query validation
// ---------------------------------------------------------------------------

describe("validateCustomerNotificationQuery", () => {
	it("accepts valid query", () => {
		const errors = validateCustomerNotificationQuery({
			tenantId: "t-1",
			recipientId: "cust-1",
		});
		expect(errors).toHaveLength(0);
	});

	it("rejects missing tenantId", () => {
		const errors = validateCustomerNotificationQuery({
			tenantId: "",
			recipientId: "cust-1",
		});
		expect(errors.some((e) => e.field === "tenantId")).toBe(true);
	});

	it("rejects missing recipientId", () => {
		const errors = validateCustomerNotificationQuery({
			tenantId: "t-1",
			recipientId: "",
		});
		expect(errors.some((e) => e.field === "recipientId")).toBe(true);
	});

	it("rejects limit out of range", () => {
		const errors = validateCustomerNotificationQuery({
			tenantId: "t-1",
			recipientId: "cust-1",
			limit: 200,
		});
		expect(errors.some((e) => e.field === "limit")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// PII sanitization
// ---------------------------------------------------------------------------

describe("sanitizeRecipientAddress", () => {
	it("masks email addresses", () => {
		const result = sanitizeRecipientAddress("alice@example.com");
		expect(result).toBe("al***@example.com");
		expect(result).not.toContain("alice");
	});

	it("masks short email local parts", () => {
		const result = sanitizeRecipientAddress("ab@example.com");
		expect(result).toBe("ab***@example.com");
	});

	it("masks phone numbers showing last 4 digits", () => {
		const result = sanitizeRecipientAddress("+15551234567");
		expect(result).toBe("***4567");
	});

	it("returns non-email/phone identifiers as-is", () => {
		const result = sanitizeRecipientAddress("cust-123");
		expect(result).toBe("cust-123");
	});
});
