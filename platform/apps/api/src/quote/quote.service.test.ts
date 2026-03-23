import { describe, it, expect } from "vitest";
import { QuoteService } from "./quote.service";
import { QuoteRepository } from "./quote.repository";
import { PricingEngineService } from "../cart/pricing-engine.service";
import type { CreateQuoteRequest } from "@platform/types";

function createService() {
	const repository = new QuoteRepository();
	const pricingEngine = new PricingEngineService();
	const service = new QuoteService(repository, pricingEngine);
	return { service, repository, pricingEngine };
}

function validCreateRequest(overrides: Partial<CreateQuoteRequest> = {}): CreateQuoteRequest {
	return {
		customerName: "Alice Smith",
		customerEmail: "alice@example.com",
		lineItems: [
			{ description: "Widget A", quantity: 2, unitPriceCents: 1500 },
			{ description: "Widget B", quantity: 1, unitPriceCents: 3000 },
		],
		...overrides,
	};
}

const TENANT = "tenant-1";

// ── createQuote ─────────────────────────────────────────────────────────────

describe("QuoteService – createQuote", () => {
	it("creates a quote with valid request", () => {
		const { service } = createService();
		const result = service.createQuote(TENANT, validCreateRequest());

		expect(result.id).toBeDefined();
		expect(result.quoteNumber).toBeDefined();
		expect(result.status).toBe("draft");
		expect(result.customerName).toBe("Alice Smith");
		expect(result.customerEmail).toBe("alice@example.com");
		expect(result.lineItems).toHaveLength(2);
		expect(result.tenantId).toBe(TENANT);
		expect(result.subtotalCents).toBeGreaterThan(0);
		expect(result.totalCents).toBeGreaterThan(0);
	});

	it("generates unique share token", () => {
		const { service } = createService();
		const q1 = service.createQuote(TENANT, validCreateRequest());
		const q2 = service.createQuote(TENANT, validCreateRequest());

		expect(q1.shareToken).toBeDefined();
		expect(q2.shareToken).toBeDefined();
		expect(q1.shareToken).not.toBe(q2.shareToken);
	});

	it("calculates line totals correctly (unitPriceCents * quantity)", () => {
		const { service } = createService();
		const result = service.createQuote(TENANT, validCreateRequest());

		expect(result.lineItems[0].lineTotalCents).toBe(1500 * 2);
		expect(result.lineItems[1].lineTotalCents).toBe(3000 * 1);
	});

	it("calculates subtotal correctly", () => {
		const { service } = createService();
		const result = service.createQuote(TENANT, validCreateRequest());

		const expectedSubtotal = 1500 * 2 + 3000 * 1;
		expect(result.subtotalCents).toBe(expectedSubtotal);
		expect(result.totalCents).toBe(expectedSubtotal);
	});

	it("sets default validity days (30)", () => {
		const { service } = createService();
		const result = service.createQuote(TENANT, validCreateRequest());

		expect(result.validityDays).toBe(30);
		expect(result.expiresAt).toBeDefined();
	});

	it("custom validity days", () => {
		const { service } = createService();
		const result = service.createQuote(
			TENANT,
			validCreateRequest({ validityDays: 60 }),
		);

		expect(result.validityDays).toBe(60);
	});
});

// ── updateQuote ─────────────────────────────────────────────────────────────

describe("QuoteService – updateQuote", () => {
	it("updates draft quote fields (customerName, notes, etc.)", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());

		const updated = service.updateQuote(TENANT, created.id, {
			customerName: "Bob Jones",
			notes: "Rush order",
		});

		expect(updated).not.toBeNull();
		expect(updated!.customerName).toBe("Bob Jones");
		expect(updated!.notes).toBe("Rush order");
	});

	it("updates line items and recalculates totals", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());

		const updated = service.updateQuote(TENANT, created.id, {
			lineItems: [
				{ description: "New Item", quantity: 3, unitPriceCents: 2000 },
			],
		});

		expect(updated).not.toBeNull();
		expect(updated!.lineItems).toHaveLength(1);
		expect(updated!.lineItems[0].lineTotalCents).toBe(6000);
		expect(updated!.subtotalCents).toBe(6000);
		expect(updated!.totalCents).toBe(6000);
	});

	it("rejects update of non-draft quote (returns null)", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);

		const result = service.updateQuote(TENANT, created.id, {
			customerName: "Should Fail",
		});
		expect(result).toBeNull();
	});

	it("returns null for non-existent quote", () => {
		const { service } = createService();
		const result = service.updateQuote(TENANT, "non-existent", {
			customerName: "Nobody",
		});
		expect(result).toBeNull();
	});
});

// ── getQuote ────────────────────────────────────────────────────────────────

describe("QuoteService – getQuote", () => {
	it("returns quote with line items", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());

		const result = service.getQuote(TENANT, created.id);
		expect(result).not.toBeNull();
		expect(result!.id).toBe(created.id);
		expect(result!.lineItems).toHaveLength(2);
	});

	it("returns null for non-existent quote", () => {
		const { service } = createService();
		const result = service.getQuote(TENANT, "non-existent");
		expect(result).toBeNull();
	});

	it("returns null for wrong tenant", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());

		const result = service.getQuote("other-tenant", created.id);
		expect(result).toBeNull();
	});
});

// ── listQuotes ──────────────────────────────────────────────────────────────

describe("QuoteService – listQuotes", () => {
	it("returns quotes for tenant", () => {
		const { service } = createService();
		service.createQuote(TENANT, validCreateRequest());
		service.createQuote(TENANT, validCreateRequest());
		service.createQuote("other-tenant", validCreateRequest());

		const result = service.listQuotes({ tenantId: TENANT });
		expect(result.total).toBe(2);
		expect(result.quotes).toHaveLength(2);
	});

	it("filters by status", () => {
		const { service } = createService();
		const q1 = service.createQuote(TENANT, validCreateRequest());
		service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, q1.id);

		const result = service.listQuotes({ tenantId: TENANT, status: "sent" });
		expect(result.total).toBe(1);
		expect(result.quotes[0].status).toBe("sent");
	});

	it("paginates results", () => {
		const { service } = createService();
		for (let i = 0; i < 5; i++) {
			service.createQuote(TENANT, validCreateRequest());
		}

		const page1 = service.listQuotes({ tenantId: TENANT, page: 1, pageSize: 2 });
		expect(page1.quotes).toHaveLength(2);
		expect(page1.total).toBe(5);
		expect(page1.page).toBe(1);
		expect(page1.pageSize).toBe(2);

		const page2 = service.listQuotes({ tenantId: TENANT, page: 2, pageSize: 2 });
		expect(page2.quotes).toHaveLength(2);
		expect(page2.page).toBe(2);
	});
});

// ── getPipelineCounts ───────────────────────────────────────────────────────

describe("QuoteService – getPipelineCounts", () => {
	it("returns counts for all statuses", () => {
		const { service } = createService();
		const q1 = service.createQuote(TENANT, validCreateRequest());
		service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, q1.id);

		const counts = service.getPipelineCounts(TENANT);
		expect(counts.total).toBe(2);

		const draftCount = counts.counts.find((c) => c.status === "draft");
		const sentCount = counts.counts.find((c) => c.status === "sent");
		expect(draftCount!.count).toBe(1);
		expect(sentCount!.count).toBe(1);
	});

	it("returns 0 for statuses with no quotes", () => {
		const { service } = createService();
		const counts = service.getPipelineCounts(TENANT);

		expect(counts.total).toBe(0);
		for (const entry of counts.counts) {
			expect(entry.count).toBe(0);
		}
	});
});

// ── sendQuote ───────────────────────────────────────────────────────────────

describe("QuoteService – sendQuote", () => {
	it("transitions draft to sent", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());

		const result = service.sendQuote(TENANT, created.id);
		expect(result).not.toBeNull();
		expect(result!.status).toBe("sent");
	});

	it("sets sentAt timestamp", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());

		const result = service.sendQuote(TENANT, created.id);
		expect(result!.sentAt).not.toBeNull();
	});

	it("cannot send non-draft quote", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);

		const result = service.sendQuote(TENANT, created.id);
		expect(result).toBeNull();
	});
});

// ── recordViewEvent ─────────────────────────────────────────────────────────

describe("QuoteService – recordViewEvent", () => {
	it("transitions sent to viewed", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);

		const result = service.recordViewEvent(created.shareToken);
		expect(result).not.toBeNull();
		expect(result!.quoteId).toBe(created.id);

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.status).toBe("viewed");
	});

	it("sets viewedAt timestamp", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);

		service.recordViewEvent(created.shareToken);

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.viewedAt).not.toBeNull();
	});

	it("does not re-transition already viewed quote", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);

		service.recordViewEvent(created.shareToken);
		const quoteAfterFirstView = service.getQuote(TENANT, created.id);
		const firstViewedAt = quoteAfterFirstView!.viewedAt;

		service.recordViewEvent(created.shareToken);
		const quoteAfterSecondView = service.getQuote(TENANT, created.id);
		expect(quoteAfterSecondView!.status).toBe("viewed");
		expect(quoteAfterSecondView!.viewedAt).toBe(firstViewedAt);
	});
});

// ── acceptQuote ─────────────────────────────────────────────────────────────

describe("QuoteService – acceptQuote", () => {
	it("accepts viewed quote", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);

		const result = service.acceptQuote(created.shareToken, {
			respondentEmail: "alice@example.com",
		});
		expect(result).toBe(true);

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.status).toBe("accepted");
	});

	it("sets acceptedAt, respondedAt, respondentEmail", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);

		service.acceptQuote(created.shareToken, {
			respondentEmail: "alice@example.com",
			respondentName: "Alice",
		});

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.acceptedAt).not.toBeNull();
		expect(quote!.respondedAt).not.toBeNull();
		expect(quote!.respondentEmail).toBe("alice@example.com");
		expect(quote!.respondentName).toBe("Alice");
	});

	it("cannot accept already accepted quote", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);
		service.acceptQuote(created.shareToken, {
			respondentEmail: "alice@example.com",
		});

		const result = service.acceptQuote(created.shareToken, {
			respondentEmail: "bob@example.com",
		});
		expect(result).toBe(false);
	});
});

// ── declineQuote ────────────────────────────────────────────────────────────

describe("QuoteService – declineQuote", () => {
	it("declines viewed quote", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);

		const result = service.declineQuote(created.shareToken, {
			respondentEmail: "alice@example.com",
		});
		expect(result).toBe(true);

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.status).toBe("declined");
	});

	it("sets declinedAt, respondedAt, respondentEmail", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);

		service.declineQuote(created.shareToken, {
			respondentEmail: "alice@example.com",
			respondentName: "Alice",
			reason: "Too expensive",
		});

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.declinedAt).not.toBeNull();
		expect(quote!.respondedAt).not.toBeNull();
		expect(quote!.respondentEmail).toBe("alice@example.com");
		expect(quote!.revisionNotes).toBe("Too expensive");
	});
});

// ── requestRevision ─────────────────────────────────────────────────────────

describe("QuoteService – requestRevision", () => {
	it("requests revision on viewed quote", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);

		const result = service.requestRevision(created.shareToken, {
			respondentEmail: "alice@example.com",
			revisionNotes: "Please adjust pricing",
		});
		expect(result).toBe(true);

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.status).toBe("revision_requested");
	});

	it("sets revisionRequestedAt, revisionNotes", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);

		service.requestRevision(created.shareToken, {
			respondentEmail: "alice@example.com",
			revisionNotes: "Need lower prices",
		});

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.revisionRequestedAt).not.toBeNull();
		expect(quote!.revisionNotes).toBe("Need lower prices");
		expect(quote!.respondentEmail).toBe("alice@example.com");
	});
});

// ── convertToOrder ──────────────────────────────────────────────────────────

describe("QuoteService – convertToOrder", () => {
	it("converts accepted quote using pricing engine", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);
		service.acceptQuote(created.shareToken, {
			respondentEmail: "alice@example.com",
		});

		const result = service.convertToOrder({
			quoteId: created.id,
			tenantId: TENANT,
			preserveQuotedPrices: true,
		});

		expect(result.success).toBe(true);
		expect(result.orderId).toBeDefined();
		expect(result.error).toBeNull();
	});

	it("returns error for non-accepted quote", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());

		const result = service.convertToOrder({
			quoteId: created.id,
			tenantId: TENANT,
			preserveQuotedPrices: true,
		});

		expect(result.success).toBe(false);
		expect(result.orderId).toBeNull();
		expect(result.error).toBeDefined();
	});

	it("returns orderId on success", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);
		service.acceptQuote(created.shareToken, {
			respondentEmail: "alice@example.com",
		});

		const result = service.convertToOrder({
			quoteId: created.id,
			tenantId: TENANT,
			preserveQuotedPrices: true,
		});

		expect(result.orderId).not.toBeNull();
		expect(typeof result.orderId).toBe("string");
	});

	it("sets convertedOrderId on quote", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);
		service.acceptQuote(created.shareToken, {
			respondentEmail: "alice@example.com",
		});

		const result = service.convertToOrder({
			quoteId: created.id,
			tenantId: TENANT,
			preserveQuotedPrices: true,
		});

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.convertedOrderId).toBe(result.orderId);
	});
});

// ── expireQuotes ────────────────────────────────────────────────────────────

describe("QuoteService – expireQuotes", () => {
	it("expires quotes past their expiresAt", () => {
		const { service, repository } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);

		// Manually set expiresAt to the past
		repository.update(created.id, {
			expiresAt: "2000-01-01T00:00:00.000Z",
		});

		const count = service.expireQuotes();
		expect(count).toBe(1);

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.status).toBe("expired");
		expect(quote!.expiredAt).not.toBeNull();
	});

	it("doesn't expire draft/accepted/declined quotes", () => {
		const { service, repository } = createService();
		// Draft quote
		const draft = service.createQuote(TENANT, validCreateRequest());
		repository.update(draft.id, {
			expiresAt: "2000-01-01T00:00:00.000Z",
		});

		// Accepted quote
		const accepted = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, accepted.id);
		service.recordViewEvent(accepted.shareToken);
		service.acceptQuote(accepted.shareToken, {
			respondentEmail: "alice@example.com",
		});
		repository.update(accepted.id, {
			expiresAt: "2000-01-01T00:00:00.000Z",
		});

		// Declined quote
		const declined = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, declined.id);
		service.recordViewEvent(declined.shareToken);
		service.declineQuote(declined.shareToken, {
			respondentEmail: "alice@example.com",
		});
		repository.update(declined.id, {
			expiresAt: "2000-01-01T00:00:00.000Z",
		});

		const count = service.expireQuotes();
		expect(count).toBe(0);
	});

	it("returns count of expired quotes", () => {
		const { service, repository } = createService();
		const q1 = service.createQuote(TENANT, validCreateRequest());
		const q2 = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, q1.id);
		service.sendQuote(TENANT, q2.id);

		repository.update(q1.id, { expiresAt: "2000-01-01T00:00:00.000Z" });
		repository.update(q2.id, { expiresAt: "2000-01-01T00:00:00.000Z" });

		const count = service.expireQuotes();
		expect(count).toBe(2);
	});
});

// ── cloneQuote ──────────────────────────────────────────────────────────────

describe("QuoteService – cloneQuote", () => {
	it("creates new draft from existing quote", () => {
		const { service } = createService();
		const original = service.createQuote(TENANT, validCreateRequest());

		const cloned = service.cloneQuote(TENANT, original.id);
		expect(cloned).not.toBeNull();
		expect(cloned!.status).toBe("draft");
		expect(cloned!.customerName).toBe(original.customerName);
		expect(cloned!.customerEmail).toBe(original.customerEmail);
	});

	it("new quote has different ID and share token", () => {
		const { service } = createService();
		const original = service.createQuote(TENANT, validCreateRequest());

		const cloned = service.cloneQuote(TENANT, original.id);
		expect(cloned).not.toBeNull();
		expect(cloned!.id).not.toBe(original.id);
		expect(cloned!.shareToken).not.toBe(original.shareToken);
	});

	it("preserves line items and customer info", () => {
		const { service } = createService();
		const original = service.createQuote(
			TENANT,
			validCreateRequest({
				customerName: "Clone Test",
				customerPhone: "555-1234",
				notes: "Important note",
			}),
		);

		const cloned = service.cloneQuote(TENANT, original.id);
		expect(cloned).not.toBeNull();
		expect(cloned!.lineItems).toHaveLength(original.lineItems.length);
		expect(cloned!.lineItems[0].description).toBe(original.lineItems[0].description);
		expect(cloned!.lineItems[0].quantity).toBe(original.lineItems[0].quantity);
		expect(cloned!.lineItems[0].unitPriceCents).toBe(original.lineItems[0].unitPriceCents);
		expect(cloned!.customerName).toBe("Clone Test");
		expect(cloned!.customerPhone).toBe("555-1234");
		expect(cloned!.notes).toBe("Important note");
		expect(cloned!.subtotalCents).toBe(original.subtotalCents);
	});
});

// ── getQuoteByShareToken ────────────────────────────────────────────────────

describe("QuoteService – getQuoteByShareToken", () => {
	it("returns CustomerQuoteView for valid token", () => {
		const { service } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);
		service.recordViewEvent(created.shareToken);

		const result = service.getQuoteByShareToken(created.shareToken);
		expect(result).not.toBeNull();
		expect(result!.quoteNumber).toBe(created.quoteNumber);
		expect(result!.customerName).toBe("Alice Smith");
		expect(result!.lineItems).toHaveLength(2);
		expect(result!.subtotalCents).toBe(created.subtotalCents);
		expect(result!.totalCents).toBe(created.totalCents);
	});

	it("returns null for invalid token", () => {
		const { service } = createService();
		const result = service.getQuoteByShareToken("invalid-token");
		expect(result).toBeNull();
	});

	it("auto-expires quote if past expiresAt", () => {
		const { service, repository } = createService();
		const created = service.createQuote(TENANT, validCreateRequest());
		service.sendQuote(TENANT, created.id);

		// Set expiresAt to the past
		repository.update(created.id, {
			expiresAt: "2000-01-01T00:00:00.000Z",
		});

		const result = service.getQuoteByShareToken(created.shareToken);
		expect(result).toBeNull();

		const quote = service.getQuote(TENANT, created.id);
		expect(quote!.status).toBe("expired");
		expect(quote!.expiredAt).not.toBeNull();
	});
});
