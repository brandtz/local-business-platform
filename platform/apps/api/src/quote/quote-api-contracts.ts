// Quote API contract assertions
// Validates request payloads for quote creation, update, listing,
// customer-facing actions, and quote-to-order conversion endpoints.

import type {
	CreateQuoteRequest,
	UpdateQuoteRequest,
	AdminQuoteListQuery,
	CustomerQuoteAcceptRequest,
	CustomerQuoteDeclineRequest,
	CustomerQuoteRevisionRequest,
	QuoteToOrderConversionInput,
} from "@platform/types";
import { isValidQuoteStatus } from "@platform/types";

// ── Admin Quote API Contracts ───────────────────────────────────────────────

function assertLineItems(lineItems: unknown[]): void {
	for (let i = 0; i < lineItems.length; i++) {
		const item = lineItems[i];
		if (typeof item !== "object" || item === null) {
			throw new Error(`lineItems[${i}] must be an object.`);
		}
		const li = item as Record<string, unknown>;
		if (typeof li.description !== "string" || !li.description.trim()) {
			throw new Error(`lineItems[${i}].description must be a non-empty string.`);
		}
		if (typeof li.quantity !== "number" || !Number.isInteger(li.quantity) || li.quantity < 1) {
			throw new Error(`lineItems[${i}].quantity must be a positive integer.`);
		}
		if (typeof li.unitPriceCents !== "number" || !Number.isInteger(li.unitPriceCents) || li.unitPriceCents < 0) {
			throw new Error(`lineItems[${i}].unitPriceCents must be a non-negative integer.`);
		}
		if (li.catalogItemId !== undefined && typeof li.catalogItemId !== "string") {
			throw new Error(`lineItems[${i}].catalogItemId must be a string.`);
		}
		if (li.serviceId !== undefined && typeof li.serviceId !== "string") {
			throw new Error(`lineItems[${i}].serviceId must be a string.`);
		}
		if (li.lineNotes !== undefined && typeof li.lineNotes !== "string") {
			throw new Error(`lineItems[${i}].lineNotes must be a string.`);
		}
	}
}

/** Validates CreateQuoteRequest body */
export function assertCreateQuoteRequest(
	body: unknown,
): asserts body is CreateQuoteRequest {
	if (typeof body !== "object" || body === null) {
		throw new Error("CreateQuoteRequest body must be an object.");
	}
	const obj = body as Record<string, unknown>;

	if (typeof obj.customerName !== "string" || !obj.customerName.trim()) {
		throw new Error("CreateQuoteRequest requires customerName as a non-empty string.");
	}
	if (typeof obj.customerEmail !== "string" || !obj.customerEmail.trim() || !obj.customerEmail.includes("@")) {
		throw new Error("CreateQuoteRequest requires customerEmail as a non-empty string containing '@'.");
	}
	if (!Array.isArray(obj.lineItems) || obj.lineItems.length === 0) {
		throw new Error("CreateQuoteRequest requires lineItems as a non-empty array.");
	}
	assertLineItems(obj.lineItems);

	if (obj.customerPhone !== undefined && typeof obj.customerPhone !== "string") {
		throw new Error("CreateQuoteRequest customerPhone must be a string.");
	}
	if (obj.validityDays !== undefined) {
		if (typeof obj.validityDays !== "number" || !Number.isInteger(obj.validityDays) || obj.validityDays < 1) {
			throw new Error("CreateQuoteRequest validityDays must be a positive integer.");
		}
	}
	if (obj.notes !== undefined && typeof obj.notes !== "string") {
		throw new Error("CreateQuoteRequest notes must be a string.");
	}
	if (obj.customerNotes !== undefined && typeof obj.customerNotes !== "string") {
		throw new Error("CreateQuoteRequest customerNotes must be a string.");
	}
	if (obj.termsAndConditions !== undefined && typeof obj.termsAndConditions !== "string") {
		throw new Error("CreateQuoteRequest termsAndConditions must be a string.");
	}
}

/** Validates UpdateQuoteRequest body */
export function assertUpdateQuoteRequest(
	body: unknown,
): asserts body is UpdateQuoteRequest {
	if (typeof body !== "object" || body === null) {
		throw new Error("UpdateQuoteRequest body must be an object.");
	}
	const obj = body as Record<string, unknown>;

	if (obj.customerName !== undefined) {
		if (typeof obj.customerName !== "string" || !obj.customerName.trim()) {
			throw new Error("UpdateQuoteRequest customerName must be a non-empty string.");
		}
	}
	if (obj.customerEmail !== undefined) {
		if (typeof obj.customerEmail !== "string" || !obj.customerEmail.includes("@")) {
			throw new Error("UpdateQuoteRequest customerEmail must be a string containing '@'.");
		}
	}
	if (obj.lineItems !== undefined) {
		if (!Array.isArray(obj.lineItems) || obj.lineItems.length === 0) {
			throw new Error("UpdateQuoteRequest lineItems must be a non-empty array.");
		}
		assertLineItems(obj.lineItems);
	}
	if (obj.customerPhone !== undefined && typeof obj.customerPhone !== "string") {
		throw new Error("UpdateQuoteRequest customerPhone must be a string.");
	}
	if (obj.validityDays !== undefined) {
		if (typeof obj.validityDays !== "number" || !Number.isInteger(obj.validityDays) || obj.validityDays < 1) {
			throw new Error("UpdateQuoteRequest validityDays must be a positive integer.");
		}
	}
	if (obj.notes !== undefined && typeof obj.notes !== "string") {
		throw new Error("UpdateQuoteRequest notes must be a string.");
	}
	if (obj.customerNotes !== undefined && typeof obj.customerNotes !== "string") {
		throw new Error("UpdateQuoteRequest customerNotes must be a string.");
	}
	if (obj.termsAndConditions !== undefined && typeof obj.termsAndConditions !== "string") {
		throw new Error("UpdateQuoteRequest termsAndConditions must be a string.");
	}
}

/** Validates AdminQuoteListQuery */
export function assertAdminQuoteListQuery(
	body: unknown,
): asserts body is AdminQuoteListQuery {
	if (typeof body !== "object" || body === null) {
		throw new Error("AdminQuoteListQuery must be an object.");
	}
	const obj = body as Record<string, unknown>;

	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("AdminQuoteListQuery requires tenantId as a non-empty string.");
	}
	if (obj.status !== undefined) {
		if (typeof obj.status !== "string" || !isValidQuoteStatus(obj.status)) {
			throw new Error("AdminQuoteListQuery status must be a valid QuoteStatus.");
		}
	}
	if (obj.search !== undefined && typeof obj.search !== "string") {
		throw new Error("AdminQuoteListQuery search must be a string.");
	}
	if (obj.dateFrom !== undefined && typeof obj.dateFrom !== "string") {
		throw new Error("AdminQuoteListQuery dateFrom must be a string.");
	}
	if (obj.dateTo !== undefined && typeof obj.dateTo !== "string") {
		throw new Error("AdminQuoteListQuery dateTo must be a string.");
	}
	if (obj.page !== undefined && (typeof obj.page !== "number" || !Number.isInteger(obj.page) || obj.page < 1)) {
		throw new Error("AdminQuoteListQuery page must be a positive integer.");
	}
	if (obj.pageSize !== undefined && (typeof obj.pageSize !== "number" || !Number.isInteger(obj.pageSize) || obj.pageSize < 1 || obj.pageSize > 100)) {
		throw new Error("AdminQuoteListQuery pageSize must be a positive integer (max 100).");
	}
}

// ── Customer-Facing API Contracts ───────────────────────────────────────────

/** Validates share token parameter */
export function assertShareToken(
	token: unknown,
): asserts token is string {
	if (typeof token !== "string" || !token.trim() || token.length < 20) {
		throw new Error("Share token must be a non-empty string of at least 20 characters.");
	}
}

/** Validates CustomerQuoteAcceptRequest */
export function assertCustomerQuoteAcceptRequest(
	body: unknown,
): asserts body is CustomerQuoteAcceptRequest {
	if (typeof body !== "object" || body === null) {
		throw new Error("CustomerQuoteAcceptRequest body must be an object.");
	}
	const obj = body as Record<string, unknown>;

	if (typeof obj.respondentEmail !== "string" || !obj.respondentEmail.trim() || !obj.respondentEmail.includes("@")) {
		throw new Error("CustomerQuoteAcceptRequest requires respondentEmail as a non-empty string containing '@'.");
	}
	if (obj.respondentName !== undefined && typeof obj.respondentName !== "string") {
		throw new Error("CustomerQuoteAcceptRequest respondentName must be a string.");
	}
}

/** Validates CustomerQuoteDeclineRequest */
export function assertCustomerQuoteDeclineRequest(
	body: unknown,
): asserts body is CustomerQuoteDeclineRequest {
	if (typeof body !== "object" || body === null) {
		throw new Error("CustomerQuoteDeclineRequest body must be an object.");
	}
	const obj = body as Record<string, unknown>;

	if (typeof obj.respondentEmail !== "string" || !obj.respondentEmail.trim() || !obj.respondentEmail.includes("@")) {
		throw new Error("CustomerQuoteDeclineRequest requires respondentEmail as a non-empty string containing '@'.");
	}
	if (obj.respondentName !== undefined && typeof obj.respondentName !== "string") {
		throw new Error("CustomerQuoteDeclineRequest respondentName must be a string.");
	}
	if (obj.reason !== undefined && typeof obj.reason !== "string") {
		throw new Error("CustomerQuoteDeclineRequest reason must be a string.");
	}
}

/** Validates CustomerQuoteRevisionRequest */
export function assertCustomerQuoteRevisionRequest(
	body: unknown,
): asserts body is CustomerQuoteRevisionRequest {
	if (typeof body !== "object" || body === null) {
		throw new Error("CustomerQuoteRevisionRequest body must be an object.");
	}
	const obj = body as Record<string, unknown>;

	if (typeof obj.respondentEmail !== "string" || !obj.respondentEmail.trim() || !obj.respondentEmail.includes("@")) {
		throw new Error("CustomerQuoteRevisionRequest requires respondentEmail as a non-empty string containing '@'.");
	}
	if (typeof obj.revisionNotes !== "string" || !obj.revisionNotes.trim()) {
		throw new Error("CustomerQuoteRevisionRequest requires revisionNotes as a non-empty string.");
	}
	if (obj.respondentName !== undefined && typeof obj.respondentName !== "string") {
		throw new Error("CustomerQuoteRevisionRequest respondentName must be a string.");
	}
}

// ── Quote-to-Order Conversion ───────────────────────────────────────────────

/** Validates QuoteToOrderConversionInput */
export function assertQuoteToOrderConversionInput(
	body: unknown,
): asserts body is QuoteToOrderConversionInput {
	if (typeof body !== "object" || body === null) {
		throw new Error("QuoteToOrderConversionInput body must be an object.");
	}
	const obj = body as Record<string, unknown>;

	if (typeof obj.quoteId !== "string" || !obj.quoteId) {
		throw new Error("QuoteToOrderConversionInput requires quoteId as a non-empty string.");
	}
	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("QuoteToOrderConversionInput requires tenantId as a non-empty string.");
	}
	if (typeof obj.preserveQuotedPrices !== "boolean") {
		throw new Error("QuoteToOrderConversionInput requires preserveQuotedPrices as a boolean.");
	}
}
