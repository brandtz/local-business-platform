import { describe, expect, it } from "vitest";

import {
	createEmptyLocationAddress,
	createEmptyLocationContact,
	isValidFulfillmentType,
	isValidTimezone,
	toLocationListItem,
	validateCreateLocationPayload,
	validateUpdateLocationPayload,
	type CreateLocationPayload,
	type LocationData,
	type UpdateLocationPayload
} from "./location-management";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function validCreatePayload(): CreateLocationPayload {
	return {
		name: "Downtown Store",
		slug: "downtown-store",
		address: {
			line1: "100 Main St",
			line2: "",
			city: "Springfield",
			state: "IL",
			postalCode: "62701",
			country: "US"
		},
		timezone: "America/Chicago",
		contact: {
			phone: "+1-555-123-4567",
			email: "downtown@example.com"
		},
		fulfillmentTypes: ["pickup", "dine_in"]
	};
}

function fullLocationData(): LocationData {
	return {
		id: "loc-1",
		tenantId: "tenant-1",
		name: "Downtown Store",
		slug: "downtown-store",
		address: {
			line1: "100 Main St",
			line2: "Suite 5",
			city: "Springfield",
			state: "IL",
			postalCode: "62701",
			country: "US"
		},
		timezone: "America/Chicago",
		contact: {
			phone: "+1-555-123-4567",
			email: "downtown@example.com"
		},
		supportsOrdering: true,
		supportsBookings: false,
		fulfillmentTypes: ["pickup", "dine_in"],
		bookingLeadTimeMins: null,
		cancellationPolicy: null,
		createdAt: "2025-01-01T00:00:00Z",
		updatedAt: "2025-01-01T00:00:00Z"
	};
}

// ── Timezone Validation ──────────────────────────────────────────────────────

describe("isValidTimezone", () => {
	it("accepts a known IANA timezone", () => {
		expect(isValidTimezone("America/New_York")).toBe(true);
		expect(isValidTimezone("Europe/London")).toBe(true);
		expect(isValidTimezone("UTC")).toBe(true);
	});

	it("rejects an invalid timezone", () => {
		expect(isValidTimezone("Moon/Crater")).toBe(false);
		expect(isValidTimezone("")).toBe(false);
	});
});

// ── Fulfillment Type Validation ──────────────────────────────────────────────

describe("isValidFulfillmentType", () => {
	it("accepts known types", () => {
		expect(isValidFulfillmentType("pickup")).toBe(true);
		expect(isValidFulfillmentType("delivery")).toBe(true);
		expect(isValidFulfillmentType("dine_in")).toBe(true);
	});

	it("rejects unknown types", () => {
		expect(isValidFulfillmentType("teleport")).toBe(false);
	});
});

// ── Create Validation ────────────────────────────────────────────────────────

describe("validateCreateLocationPayload", () => {
	it("returns no errors for a valid payload", () => {
		expect(validateCreateLocationPayload(validCreatePayload())).toEqual([]);
	});

	it("requires name", () => {
		const payload = validCreatePayload();
		payload.name = "";
		const errors = validateCreateLocationPayload(payload);
		expect(errors.some((e) => e.field === "name" && e.code === "required")).toBe(
			true
		);
	});

	it("requires slug", () => {
		const payload = validCreatePayload();
		payload.slug = "";
		const errors = validateCreateLocationPayload(payload);
		expect(errors.some((e) => e.field === "slug" && e.code === "required")).toBe(
			true
		);
	});

	it("rejects invalid slug format", () => {
		const payload = validCreatePayload();
		payload.slug = "NOT_VALID Slug!";
		const errors = validateCreateLocationPayload(payload);
		expect(errors.some((e) => e.field === "slug" && e.code === "format")).toBe(
			true
		);
	});

	it("requires timezone", () => {
		const payload = validCreatePayload();
		payload.timezone = "";
		const errors = validateCreateLocationPayload(payload);
		expect(
			errors.some((e) => e.field === "timezone" && e.code === "required")
		).toBe(true);
	});

	it("rejects invalid timezone", () => {
		const payload = validCreatePayload();
		payload.timezone = "Fake/Zone";
		const errors = validateCreateLocationPayload(payload);
		expect(
			errors.some(
				(e) => e.field === "timezone" && e.code === "invalid-value"
			)
		).toBe(true);
	});

	it("requires address.line1, city, and country", () => {
		const payload = validCreatePayload();
		payload.address.line1 = "";
		payload.address.city = "";
		payload.address.country = "";
		const errors = validateCreateLocationPayload(payload);
		expect(errors.filter((e) => e.code === "required").map((e) => e.field)).toEqual(
			expect.arrayContaining(["address.line1", "address.city", "address.country"])
		);
	});

	it("enforces max length on name", () => {
		const payload = validCreatePayload();
		payload.name = "A".repeat(201);
		const errors = validateCreateLocationPayload(payload);
		expect(
			errors.some((e) => e.field === "name" && e.code === "max-length")
		).toBe(true);
	});

	it("rejects invalid contact email format", () => {
		const payload = validCreatePayload();
		payload.contact.email = "not-an-email";
		const errors = validateCreateLocationPayload(payload);
		expect(
			errors.some(
				(e) => e.field === "contact.email" && e.code === "format"
			)
		).toBe(true);
	});

	it("allows empty contact email", () => {
		const payload = validCreatePayload();
		payload.contact.email = "";
		const errors = validateCreateLocationPayload(payload);
		expect(
			errors.some((e) => e.field === "contact.email")
		).toBe(false);
	});

	it("rejects unknown fulfillment types", () => {
		const payload = validCreatePayload();
		payload.fulfillmentTypes = ["pickup", "teleport" as never];
		const errors = validateCreateLocationPayload(payload);
		expect(
			errors.some(
				(e) =>
					e.field === "fulfillmentTypes" &&
					e.code === "invalid-value"
			)
		).toBe(true);
	});
});

// ── Update Validation ────────────────────────────────────────────────────────

describe("validateUpdateLocationPayload", () => {
	it("returns no errors for a valid partial update", () => {
		const payload: UpdateLocationPayload = { name: "New Name" };
		expect(validateUpdateLocationPayload(payload)).toEqual([]);
	});

	it("rejects empty name when provided", () => {
		const payload: UpdateLocationPayload = { name: "   " };
		const errors = validateUpdateLocationPayload(payload);
		expect(errors.some((e) => e.field === "name" && e.code === "required")).toBe(
			true
		);
	});

	it("rejects invalid slug format when provided", () => {
		const payload: UpdateLocationPayload = { slug: "INVALID!" };
		const errors = validateUpdateLocationPayload(payload);
		expect(errors.some((e) => e.field === "slug" && e.code === "format")).toBe(
			true
		);
	});

	it("rejects invalid timezone when provided", () => {
		const payload: UpdateLocationPayload = { timezone: "Nope/Zone" };
		const errors = validateUpdateLocationPayload(payload);
		expect(
			errors.some(
				(e) => e.field === "timezone" && e.code === "invalid-value"
			)
		).toBe(true);
	});

	it("validates contact email format when provided", () => {
		const payload: UpdateLocationPayload = {
			contact: { email: "bad-email" }
		};
		const errors = validateUpdateLocationPayload(payload);
		expect(
			errors.some(
				(e) => e.field === "contact.email" && e.code === "format"
			)
		).toBe(true);
	});

	it("returns no errors for empty payload", () => {
		expect(validateUpdateLocationPayload({})).toEqual([]);
	});
});

// ── Location List ────────────────────────────────────────────────────────────

describe("toLocationListItem", () => {
	it("maps a full location to a list item", () => {
		const item = toLocationListItem(fullLocationData());
		expect(item.id).toBe("loc-1");
		expect(item.name).toBe("Downtown Store");
		expect(item.city).toBe("Springfield");
		expect(item.timezone).toBe("America/Chicago");
	});
});

// ── Empty Factories ──────────────────────────────────────────────────────────

describe("createEmptyLocationAddress", () => {
	it("returns an address with all empty strings", () => {
		const addr = createEmptyLocationAddress();
		expect(addr.line1).toBe("");
		expect(addr.city).toBe("");
		expect(addr.country).toBe("");
	});
});

describe("createEmptyLocationContact", () => {
	it("returns a contact with empty phone and email", () => {
		const contact = createEmptyLocationContact();
		expect(contact.phone).toBe("");
		expect(contact.email).toBe("");
	});
});
