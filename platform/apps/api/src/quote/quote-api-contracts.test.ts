// Quote API contract assertion tests

import { describe, expect, it } from "vitest";
import {
	assertCreateQuoteRequest,
	assertUpdateQuoteRequest,
	assertAdminQuoteListQuery,
	assertShareToken,
	assertCustomerQuoteAcceptRequest,
	assertCustomerQuoteDeclineRequest,
	assertCustomerQuoteRevisionRequest,
	assertQuoteToOrderConversionInput,
} from "./quote-api-contracts";

// ── Helpers ─────────────────────────────────────────────────────────────────

function omit<T extends Record<string, unknown>>(obj: T, key: string): Record<string, unknown> {
	const result = { ...obj };
	delete result[key];
	return result;
}

function validLineItem(overrides: Record<string, unknown> = {}) {
	return { description: "Widget", quantity: 2, unitPriceCents: 1500, ...overrides };
}

function validCreateBody(overrides: Record<string, unknown> = {}) {
	return {
		customerName: "Jane Doe",
		customerEmail: "jane@example.com",
		lineItems: [validLineItem()],
		...overrides,
	};
}

// ── assertCreateQuoteRequest ────────────────────────────────────────────────

describe("assertCreateQuoteRequest", () => {
	it("accepts valid input", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody())).not.toThrow();
	});

	it("rejects non-object input", () => {
		expect(() => assertCreateQuoteRequest("string")).toThrow();
	});

	it("rejects null input", () => {
		expect(() => assertCreateQuoteRequest(null)).toThrow();
	});

	it("rejects missing customerName", () => {
		expect(() => assertCreateQuoteRequest(omit(validCreateBody(), "customerName"))).toThrow("customerName");
	});

	it("rejects empty customerName", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody({ customerName: "  " }))).toThrow("customerName");
	});

	it("rejects missing customerEmail", () => {
		expect(() => assertCreateQuoteRequest(omit(validCreateBody(), "customerEmail"))).toThrow("customerEmail");
	});

	it("rejects invalid customerEmail without @", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody({ customerEmail: "bad-email" }))).toThrow("customerEmail");
	});

	it("rejects missing lineItems", () => {
		expect(() => assertCreateQuoteRequest(omit(validCreateBody(), "lineItems"))).toThrow("lineItems");
	});

	it("rejects empty lineItems array", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody({ lineItems: [] }))).toThrow("lineItems");
	});

	it("rejects line item with missing description", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ description: undefined })] })),
		).toThrow("description");
	});

	it("rejects line item with empty description", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ description: "  " })] })),
		).toThrow("description");
	});

	it("rejects line item with zero quantity", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ quantity: 0 })] })),
		).toThrow("quantity");
	});

	it("rejects line item with negative quantity", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ quantity: -1 })] })),
		).toThrow("quantity");
	});

	it("rejects line item with negative unitPriceCents", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ unitPriceCents: -100 })] })),
		).toThrow("unitPriceCents");
	});

	it("accepts line item with zero unitPriceCents", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ unitPriceCents: 0 })] })),
		).not.toThrow();
	});

	it("accepts valid optional fields", () => {
		expect(() =>
			assertCreateQuoteRequest(
				validCreateBody({
					customerPhone: "555-0100",
					validityDays: 30,
					notes: "Internal note",
					customerNotes: "For the customer",
					termsAndConditions: "Net-30",
				}),
			),
		).not.toThrow();
	});

	it("rejects non-string customerPhone", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody({ customerPhone: 123 }))).toThrow("customerPhone");
	});

	it("rejects non-positive validityDays", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody({ validityDays: 0 }))).toThrow("validityDays");
	});

	it("rejects non-integer validityDays", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody({ validityDays: 1.5 }))).toThrow("validityDays");
	});

	it("rejects non-string notes", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody({ notes: 42 }))).toThrow("notes");
	});

	it("rejects non-string customerNotes", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody({ customerNotes: true }))).toThrow("customerNotes");
	});

	it("rejects non-string termsAndConditions", () => {
		expect(() => assertCreateQuoteRequest(validCreateBody({ termsAndConditions: 99 }))).toThrow("termsAndConditions");
	});

	it("accepts line item optional catalogItemId", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ catalogItemId: "cat-1" })] })),
		).not.toThrow();
	});

	it("rejects non-string catalogItemId", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ catalogItemId: 123 })] })),
		).toThrow("catalogItemId");
	});

	it("accepts line item optional serviceId", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ serviceId: "svc-1" })] })),
		).not.toThrow();
	});

	it("rejects non-string serviceId", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ serviceId: 456 })] })),
		).toThrow("serviceId");
	});

	it("accepts line item optional lineNotes", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ lineNotes: "rush" })] })),
		).not.toThrow();
	});

	it("rejects non-string lineNotes", () => {
		expect(() =>
			assertCreateQuoteRequest(validCreateBody({ lineItems: [validLineItem({ lineNotes: false })] })),
		).toThrow("lineNotes");
	});
});

// ── assertUpdateQuoteRequest ────────────────────────────────────────────────

describe("assertUpdateQuoteRequest", () => {
	it("accepts empty object (all optional)", () => {
		expect(() => assertUpdateQuoteRequest({})).not.toThrow();
	});

	it("rejects non-object input", () => {
		expect(() => assertUpdateQuoteRequest("string")).toThrow();
	});

	it("rejects null input", () => {
		expect(() => assertUpdateQuoteRequest(null)).toThrow();
	});

	it("accepts valid customerName", () => {
		expect(() => assertUpdateQuoteRequest({ customerName: "Updated" })).not.toThrow();
	});

	it("rejects empty customerName", () => {
		expect(() => assertUpdateQuoteRequest({ customerName: "  " })).toThrow("customerName");
	});

	it("rejects invalid customerEmail without @", () => {
		expect(() => assertUpdateQuoteRequest({ customerEmail: "bad" })).toThrow("customerEmail");
	});

	it("accepts valid customerEmail", () => {
		expect(() => assertUpdateQuoteRequest({ customerEmail: "a@b.com" })).not.toThrow();
	});

	it("rejects empty lineItems array", () => {
		expect(() => assertUpdateQuoteRequest({ lineItems: [] })).toThrow("lineItems");
	});

	it("rejects invalid lineItems entry", () => {
		expect(() =>
			assertUpdateQuoteRequest({ lineItems: [validLineItem({ quantity: 0 })] }),
		).toThrow("quantity");
	});

	it("accepts valid lineItems", () => {
		expect(() => assertUpdateQuoteRequest({ lineItems: [validLineItem()] })).not.toThrow();
	});

	it("rejects non-string customerPhone", () => {
		expect(() => assertUpdateQuoteRequest({ customerPhone: 123 })).toThrow("customerPhone");
	});

	it("rejects non-positive validityDays", () => {
		expect(() => assertUpdateQuoteRequest({ validityDays: 0 })).toThrow("validityDays");
	});

	it("rejects non-string notes", () => {
		expect(() => assertUpdateQuoteRequest({ notes: 42 })).toThrow("notes");
	});

	it("rejects non-string customerNotes", () => {
		expect(() => assertUpdateQuoteRequest({ customerNotes: true })).toThrow("customerNotes");
	});

	it("rejects non-string termsAndConditions", () => {
		expect(() => assertUpdateQuoteRequest({ termsAndConditions: 99 })).toThrow("termsAndConditions");
	});
});

// ── assertAdminQuoteListQuery ───────────────────────────────────────────────

describe("assertAdminQuoteListQuery", () => {
	it("accepts valid query with just tenantId", () => {
		expect(() => assertAdminQuoteListQuery({ tenantId: "t-1" })).not.toThrow();
	});

	it("rejects non-object input", () => {
		expect(() => assertAdminQuoteListQuery("string")).toThrow();
	});

	it("rejects null input", () => {
		expect(() => assertAdminQuoteListQuery(null)).toThrow();
	});

	it("rejects missing tenantId", () => {
		expect(() => assertAdminQuoteListQuery({})).toThrow("tenantId");
	});

	it("rejects empty tenantId", () => {
		expect(() => assertAdminQuoteListQuery({ tenantId: "" })).toThrow("tenantId");
	});

	it("rejects invalid status", () => {
		expect(() => assertAdminQuoteListQuery({ tenantId: "t-1", status: "bogus" })).toThrow("status");
	});

	it("accepts valid status", () => {
		expect(() => assertAdminQuoteListQuery({ tenantId: "t-1", status: "draft" })).not.toThrow();
	});

	it("rejects non-string search", () => {
		expect(() => assertAdminQuoteListQuery({ tenantId: "t-1", search: 123 })).toThrow("search");
	});

	it("rejects non-string dateFrom", () => {
		expect(() => assertAdminQuoteListQuery({ tenantId: "t-1", dateFrom: 123 })).toThrow("dateFrom");
	});

	it("rejects non-string dateTo", () => {
		expect(() => assertAdminQuoteListQuery({ tenantId: "t-1", dateTo: 123 })).toThrow("dateTo");
	});

	it("rejects invalid page", () => {
		expect(() => assertAdminQuoteListQuery({ tenantId: "t-1", page: 0 })).toThrow("page");
	});

	it("rejects invalid pageSize", () => {
		expect(() => assertAdminQuoteListQuery({ tenantId: "t-1", pageSize: 200 })).toThrow("pageSize");
	});

	it("accepts all valid optional fields", () => {
		expect(() =>
			assertAdminQuoteListQuery({
				tenantId: "t-1",
				status: "draft",
				search: "acme",
				dateFrom: "2024-01-01",
				dateTo: "2024-12-31",
				page: 1,
				pageSize: 25,
			}),
		).not.toThrow();
	});
});

// ── assertShareToken ────────────────────────────────────────────────────────

describe("assertShareToken", () => {
	it("accepts valid long string", () => {
		expect(() => assertShareToken("abcdefghij1234567890")).not.toThrow();
	});

	it("rejects empty string", () => {
		expect(() => assertShareToken("")).toThrow();
	});

	it("rejects too short string", () => {
		expect(() => assertShareToken("short")).toThrow();
	});

	it("rejects non-string input", () => {
		expect(() => assertShareToken(12345)).toThrow();
	});

	it("rejects whitespace-only string", () => {
		expect(() => assertShareToken("                    ")).toThrow();
	});
});

// ── assertCustomerQuoteAcceptRequest ────────────────────────────────────────

describe("assertCustomerQuoteAcceptRequest", () => {
	it("accepts valid input with email", () => {
		expect(() => assertCustomerQuoteAcceptRequest({ respondentEmail: "a@b.com" })).not.toThrow();
	});

	it("rejects non-object input", () => {
		expect(() => assertCustomerQuoteAcceptRequest("string")).toThrow();
	});

	it("rejects null input", () => {
		expect(() => assertCustomerQuoteAcceptRequest(null)).toThrow();
	});

	it("rejects missing respondentEmail", () => {
		expect(() => assertCustomerQuoteAcceptRequest({})).toThrow("respondentEmail");
	});

	it("rejects invalid respondentEmail without @", () => {
		expect(() => assertCustomerQuoteAcceptRequest({ respondentEmail: "bad" })).toThrow("respondentEmail");
	});

	it("rejects empty respondentEmail", () => {
		expect(() => assertCustomerQuoteAcceptRequest({ respondentEmail: "  " })).toThrow("respondentEmail");
	});

	it("accepts optional respondentName", () => {
		expect(() =>
			assertCustomerQuoteAcceptRequest({ respondentEmail: "a@b.com", respondentName: "Alice" }),
		).not.toThrow();
	});

	it("rejects non-string respondentName", () => {
		expect(() =>
			assertCustomerQuoteAcceptRequest({ respondentEmail: "a@b.com", respondentName: 123 }),
		).toThrow("respondentName");
	});
});

// ── assertCustomerQuoteDeclineRequest ───────────────────────────────────────

describe("assertCustomerQuoteDeclineRequest", () => {
	it("accepts valid input with email", () => {
		expect(() => assertCustomerQuoteDeclineRequest({ respondentEmail: "a@b.com" })).not.toThrow();
	});

	it("rejects non-object input", () => {
		expect(() => assertCustomerQuoteDeclineRequest("string")).toThrow();
	});

	it("rejects null input", () => {
		expect(() => assertCustomerQuoteDeclineRequest(null)).toThrow();
	});

	it("rejects missing respondentEmail", () => {
		expect(() => assertCustomerQuoteDeclineRequest({})).toThrow("respondentEmail");
	});

	it("rejects invalid respondentEmail without @", () => {
		expect(() => assertCustomerQuoteDeclineRequest({ respondentEmail: "bad" })).toThrow("respondentEmail");
	});

	it("accepts optional respondentName", () => {
		expect(() =>
			assertCustomerQuoteDeclineRequest({ respondentEmail: "a@b.com", respondentName: "Bob" }),
		).not.toThrow();
	});

	it("rejects non-string respondentName", () => {
		expect(() =>
			assertCustomerQuoteDeclineRequest({ respondentEmail: "a@b.com", respondentName: 42 }),
		).toThrow("respondentName");
	});

	it("accepts optional reason", () => {
		expect(() =>
			assertCustomerQuoteDeclineRequest({ respondentEmail: "a@b.com", reason: "Too expensive" }),
		).not.toThrow();
	});

	it("rejects non-string reason", () => {
		expect(() =>
			assertCustomerQuoteDeclineRequest({ respondentEmail: "a@b.com", reason: 42 }),
		).toThrow("reason");
	});
});

// ── assertCustomerQuoteRevisionRequest ──────────────────────────────────────

describe("assertCustomerQuoteRevisionRequest", () => {
	it("accepts valid input with email and revisionNotes", () => {
		expect(() =>
			assertCustomerQuoteRevisionRequest({ respondentEmail: "a@b.com", revisionNotes: "Please adjust qty" }),
		).not.toThrow();
	});

	it("rejects non-object input", () => {
		expect(() => assertCustomerQuoteRevisionRequest("string")).toThrow();
	});

	it("rejects null input", () => {
		expect(() => assertCustomerQuoteRevisionRequest(null)).toThrow();
	});

	it("rejects missing respondentEmail", () => {
		expect(() =>
			assertCustomerQuoteRevisionRequest({ revisionNotes: "Please adjust qty" }),
		).toThrow("respondentEmail");
	});

	it("rejects invalid respondentEmail without @", () => {
		expect(() =>
			assertCustomerQuoteRevisionRequest({ respondentEmail: "bad", revisionNotes: "notes" }),
		).toThrow("respondentEmail");
	});

	it("rejects missing revisionNotes", () => {
		expect(() =>
			assertCustomerQuoteRevisionRequest({ respondentEmail: "a@b.com" }),
		).toThrow("revisionNotes");
	});

	it("rejects empty revisionNotes", () => {
		expect(() =>
			assertCustomerQuoteRevisionRequest({ respondentEmail: "a@b.com", revisionNotes: "  " }),
		).toThrow("revisionNotes");
	});

	it("accepts optional respondentName", () => {
		expect(() =>
			assertCustomerQuoteRevisionRequest({
				respondentEmail: "a@b.com",
				revisionNotes: "Update line 2",
				respondentName: "Carol",
			}),
		).not.toThrow();
	});

	it("rejects non-string respondentName", () => {
		expect(() =>
			assertCustomerQuoteRevisionRequest({
				respondentEmail: "a@b.com",
				revisionNotes: "Update line 2",
				respondentName: 99,
			}),
		).toThrow("respondentName");
	});
});

// ── assertQuoteToOrderConversionInput ───────────────────────────────────────

describe("assertQuoteToOrderConversionInput", () => {
	const validConversion = {
		quoteId: "q-1",
		tenantId: "t-1",
		preserveQuotedPrices: true,
	};

	it("accepts valid input", () => {
		expect(() => assertQuoteToOrderConversionInput(validConversion)).not.toThrow();
	});

	it("rejects non-object input", () => {
		expect(() => assertQuoteToOrderConversionInput("string")).toThrow();
	});

	it("rejects null input", () => {
		expect(() => assertQuoteToOrderConversionInput(null)).toThrow();
	});

	it("rejects missing quoteId", () => {
		expect(() => assertQuoteToOrderConversionInput(omit(validConversion, "quoteId"))).toThrow("quoteId");
	});

	it("rejects empty quoteId", () => {
		expect(() => assertQuoteToOrderConversionInput({ ...validConversion, quoteId: "" })).toThrow("quoteId");
	});

	it("rejects missing tenantId", () => {
		expect(() => assertQuoteToOrderConversionInput(omit(validConversion, "tenantId"))).toThrow("tenantId");
	});

	it("rejects empty tenantId", () => {
		expect(() => assertQuoteToOrderConversionInput({ ...validConversion, tenantId: "" })).toThrow("tenantId");
	});

	it("rejects missing preserveQuotedPrices", () => {
		expect(() => assertQuoteToOrderConversionInput(omit(validConversion, "preserveQuotedPrices"))).toThrow("preserveQuotedPrices");
	});

	it("rejects non-boolean preserveQuotedPrices", () => {
		expect(() =>
			assertQuoteToOrderConversionInput({ ...validConversion, preserveQuotedPrices: "yes" }),
		).toThrow("preserveQuotedPrices");
	});

	it("accepts preserveQuotedPrices false", () => {
		expect(() =>
			assertQuoteToOrderConversionInput({ ...validConversion, preserveQuotedPrices: false }),
		).not.toThrow();
	});
});
