import { Injectable } from "@nestjs/common";
import type {
	QuoteRecord,
	QuoteLineItemRecord,
	CreateQuoteRequest,
	UpdateQuoteRequest,
	AdminQuoteListQuery,
	AdminQuoteListResponse,
	AdminQuoteSummary,
	AdminQuoteDetail,
	QuotePipelineCounts,
	QuoteStatusCount,
	CustomerQuoteView,
	CustomerQuoteLineItemView,
	CustomerQuoteAcceptRequest,
	CustomerQuoteDeclineRequest,
	CustomerQuoteRevisionRequest,
	QuoteToOrderConversionInput,
	QuoteToOrderConversionResult,
	PricingInput,
} from "@platform/types";
import {
	generateShareToken,
	formatQuoteNumber,
	computeQuoteExpiresAt,
	isQuoteExpired,
	isValidQuoteTransition,
	getNextQuoteStatuses,
	quoteStatuses,
} from "@platform/types";
import { QuoteRepository } from "./quote.repository";
import { PricingEngineService } from "../cart/pricing-engine.service";

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let idCounter = 0;

function generateId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${Date.now()}-${idCounter}`;
}

// ---------------------------------------------------------------------------
// Quote Service — orchestrates quote domain operations
// ---------------------------------------------------------------------------

@Injectable()
export class QuoteService {
	constructor(
		private readonly repository: QuoteRepository = new QuoteRepository(),
		private readonly pricingEngine: PricingEngineService = new PricingEngineService(),
	) {}

	// ── T3: Create Quote ────────────────────────────────────────────────────

	createQuote(tenantId: string, request: CreateQuoteRequest): AdminQuoteDetail {
		const id = generateId("qt");
		const quoteNumber = formatQuoteNumber(id);
		const shareToken = generateShareToken();
		const now = new Date().toISOString();
		const validityDays = request.validityDays ?? 30;
		const expiresAt = computeQuoteExpiresAt(now, validityDays);

		const lineItems: QuoteLineItemRecord[] = request.lineItems.map((li, idx) => ({
			id: generateId("qli"),
			quoteId: id,
			sortOrder: idx,
			catalogItemId: li.catalogItemId ?? null,
			serviceId: li.serviceId ?? null,
			description: li.description,
			quantity: li.quantity,
			unitPriceCents: li.unitPriceCents,
			lineTotalCents: li.unitPriceCents * li.quantity,
			lineNotes: li.lineNotes ?? null,
		}));

		const { subtotalCents, taxEstimateCents, totalCents } = this.calculateTotals(lineItems);

		const quote: QuoteRecord = {
			id,
			tenantId,
			quoteNumber,
			customerName: request.customerName,
			customerEmail: request.customerEmail,
			customerPhone: request.customerPhone ?? null,
			status: "draft",
			validityDays,
			expiresAt,
			notes: request.notes ?? null,
			customerNotes: request.customerNotes ?? null,
			termsAndConditions: request.termsAndConditions ?? null,
			subtotalCents,
			taxEstimateCents,
			totalCents,
			shareToken,
			shareTokenExpiresAt: expiresAt,
			createdAt: now,
			updatedAt: now,
			sentAt: null,
			viewedAt: null,
			respondedAt: null,
			acceptedAt: null,
			declinedAt: null,
			revisionRequestedAt: null,
			expiredAt: null,
			convertedOrderId: null,
			respondentEmail: null,
			respondentName: null,
			revisionNotes: null,
		};

		this.repository.create(quote);
		this.repository.setLineItems(id, lineItems);

		return this.toAdminDetail(quote, lineItems);
	}

	// ── T3: Update Quote ────────────────────────────────────────────────────

	updateQuote(
		tenantId: string,
		quoteId: string,
		request: UpdateQuoteRequest,
	): AdminQuoteDetail | null {
		const quote = this.repository.findById(quoteId);
		if (!quote || quote.tenantId !== tenantId) return null;
		if (quote.status !== "draft") return null;

		const now = new Date().toISOString();
		const updates: Partial<QuoteRecord> = { updatedAt: now };

		if (request.customerName !== undefined) updates.customerName = request.customerName;
		if (request.customerEmail !== undefined) updates.customerEmail = request.customerEmail;
		if (request.customerPhone !== undefined) updates.customerPhone = request.customerPhone ?? null;
		if (request.notes !== undefined) updates.notes = request.notes ?? null;
		if (request.customerNotes !== undefined) updates.customerNotes = request.customerNotes ?? null;
		if (request.termsAndConditions !== undefined) {
			updates.termsAndConditions = request.termsAndConditions ?? null;
		}

		if (request.validityDays !== undefined) {
			updates.validityDays = request.validityDays;
			updates.expiresAt = computeQuoteExpiresAt(quote.createdAt, request.validityDays);
			updates.shareTokenExpiresAt = updates.expiresAt;
		}

		let lineItems = this.repository.getLineItems(quoteId);

		if (request.lineItems) {
			lineItems = request.lineItems.map((li, idx) => ({
				id: generateId("qli"),
				quoteId,
				sortOrder: idx,
				catalogItemId: li.catalogItemId ?? null,
				serviceId: li.serviceId ?? null,
				description: li.description,
				quantity: li.quantity,
				unitPriceCents: li.unitPriceCents,
				lineTotalCents: li.unitPriceCents * li.quantity,
				lineNotes: li.lineNotes ?? null,
			}));

			const { subtotalCents, taxEstimateCents, totalCents } = this.calculateTotals(lineItems);
			updates.subtotalCents = subtotalCents;
			updates.taxEstimateCents = taxEstimateCents;
			updates.totalCents = totalCents;

			this.repository.setLineItems(quoteId, lineItems);
		}

		const updated = this.repository.update(quoteId, updates);
		if (!updated) return null;

		return this.toAdminDetail(updated, lineItems);
	}

	// ── T3: Get Quote ───────────────────────────────────────────────────────

	getQuote(tenantId: string, quoteId: string): AdminQuoteDetail | null {
		const quote = this.repository.findById(quoteId);
		if (!quote || quote.tenantId !== tenantId) return null;

		const lineItems = this.repository.getLineItems(quoteId);
		return this.toAdminDetail(quote, lineItems);
	}

	// ── T3: List Quotes ─────────────────────────────────────────────────────

	listQuotes(query: AdminQuoteListQuery): AdminQuoteListResponse {
		const { quotes, total } = this.repository.list(query);
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;

		return {
			quotes: quotes.map((q) => this.toAdminSummary(q)),
			total,
			page,
			pageSize,
		};
	}

	// ── T3: Pipeline Counts ─────────────────────────────────────────────────

	getPipelineCounts(tenantId: string): QuotePipelineCounts {
		const statusMap = this.repository.getStatusCounts(tenantId);
		let total = 0;

		const counts: QuoteStatusCount[] = quoteStatuses.map((status) => {
			const count = statusMap.get(status) ?? 0;
			total += count;
			return { status, count };
		});

		return { counts, total };
	}

	// ── T3: Send Quote ──────────────────────────────────────────────────────

	sendQuote(tenantId: string, quoteId: string): AdminQuoteDetail | null {
		const quote = this.repository.findById(quoteId);
		if (!quote || quote.tenantId !== tenantId) return null;
		if (!isValidQuoteTransition(quote.status, "sent")) return null;

		const now = new Date().toISOString();
		const updated = this.repository.update(quoteId, {
			status: "sent",
			sentAt: now,
			updatedAt: now,
		});
		if (!updated) return null;

		const lineItems = this.repository.getLineItems(quoteId);
		return this.toAdminDetail(updated, lineItems);
	}

	// ── T3: Record View Event ───────────────────────────────────────────────

	recordViewEvent(shareToken: string): { quoteId: string; tenantId: string } | null {
		const quote = this.repository.findByShareToken(shareToken);
		if (!quote) return null;

		if (quote.status === "sent") {
			const now = new Date().toISOString();
			this.repository.update(quote.id, {
				status: "viewed",
				viewedAt: now,
				updatedAt: now,
			});
		}

		return { quoteId: quote.id, tenantId: quote.tenantId };
	}

	// ── T6: Get Quote by Share Token (Customer-Facing) ──────────────────────

	getQuoteByShareToken(shareToken: string): CustomerQuoteView | null {
		const quote = this.repository.findByShareToken(shareToken);
		if (!quote) return null;

		// Auto-expire if past expiration and in an expirable status
		if (
			(quote.status === "sent" || quote.status === "viewed") &&
			isQuoteExpired(quote.expiresAt)
		) {
			const now = new Date().toISOString();
			this.repository.update(quote.id, {
				status: "expired",
				expiredAt: now,
				updatedAt: now,
			});
			return null;
		}

		const lineItems = this.repository.getLineItems(quote.id);
		return this.toCustomerView(quote, lineItems);
	}

	// ── T6: Accept Quote ────────────────────────────────────────────────────

	acceptQuote(shareToken: string, request: CustomerQuoteAcceptRequest): boolean {
		const quote = this.repository.findByShareToken(shareToken);
		if (!quote) return false;

		// Auto-record view if still in "sent" status
		if (quote.status === "sent") {
			this.repository.update(quote.id, {
				status: "viewed",
				viewedAt: new Date().toISOString(),
			});
		}

		const current = this.repository.findById(quote.id);
		if (!current) return false;
		if (!isValidQuoteTransition(current.status, "accepted")) return false;

		const now = new Date().toISOString();
		this.repository.update(quote.id, {
			status: "accepted",
			respondedAt: now,
			acceptedAt: now,
			respondentEmail: request.respondentEmail,
			respondentName: request.respondentName ?? null,
			updatedAt: now,
		});

		return true;
	}

	// ── T6: Decline Quote ───────────────────────────────────────────────────

	declineQuote(shareToken: string, request: CustomerQuoteDeclineRequest): boolean {
		const quote = this.repository.findByShareToken(shareToken);
		if (!quote) return false;

		// Auto-record view if still in "sent" status
		if (quote.status === "sent") {
			this.repository.update(quote.id, {
				status: "viewed",
				viewedAt: new Date().toISOString(),
			});
		}

		const current = this.repository.findById(quote.id);
		if (!current) return false;
		if (!isValidQuoteTransition(current.status, "declined")) return false;

		const now = new Date().toISOString();
		this.repository.update(quote.id, {
			status: "declined",
			respondedAt: now,
			declinedAt: now,
			respondentEmail: request.respondentEmail,
			respondentName: request.respondentName ?? null,
			revisionNotes: request.reason ?? null,
			updatedAt: now,
		});

		return true;
	}

	// ── T6: Request Revision ────────────────────────────────────────────────

	requestRevision(shareToken: string, request: CustomerQuoteRevisionRequest): boolean {
		const quote = this.repository.findByShareToken(shareToken);
		if (!quote) return false;

		// Auto-record view if still in "sent" status
		if (quote.status === "sent") {
			this.repository.update(quote.id, {
				status: "viewed",
				viewedAt: new Date().toISOString(),
			});
		}

		const current = this.repository.findById(quote.id);
		if (!current) return false;
		if (!isValidQuoteTransition(current.status, "revision_requested")) return false;

		const now = new Date().toISOString();
		this.repository.update(quote.id, {
			status: "revision_requested",
			respondedAt: now,
			revisionRequestedAt: now,
			respondentEmail: request.respondentEmail,
			respondentName: request.respondentName ?? null,
			revisionNotes: request.revisionNotes,
			updatedAt: now,
		});

		return true;
	}

	// ── T4: Convert Quote to Order ──────────────────────────────────────────

	convertToOrder(input: QuoteToOrderConversionInput): QuoteToOrderConversionResult {
		const quote = this.repository.findById(input.quoteId);
		if (!quote || quote.tenantId !== input.tenantId) {
			return { success: false, orderId: null, error: "Quote not found" };
		}

		if (quote.status !== "accepted") {
			return { success: false, orderId: null, error: "Quote must be accepted before conversion" };
		}

		const lineItems = this.repository.getLineItems(quote.id);

		// Build PricingInput from quote line items
		const pricingInput: PricingInput = {
			lineItems: lineItems.map((li) => ({
				cartItemId: li.id,
				catalogItemId: li.catalogItemId ?? li.id,
				quantity: li.quantity,
				currentPriceCents: li.unitPriceCents,
				addedPriceCents: li.unitPriceCents,
				modifiers: [],
			})),
			discount: null,
			taxPolicy: { rateBasisPoints: 0 },
			tip: null,
			deliveryFee: null,
		};

		this.pricingEngine.computeQuote(pricingInput);

		// NOTE: Actual order creation would require OrderService integration;
		// for now, generate orderId and record it on the quote.
		const orderId = generateId("ord");
		const now = new Date().toISOString();

		this.repository.update(quote.id, {
			convertedOrderId: orderId,
			updatedAt: now,
		});

		return { success: true, orderId, error: null };
	}

	// ── T7: Expire Quotes (Scheduled Job) ───────────────────────────────────

	expireQuotes(): number {
		const now = new Date().toISOString();
		const expirable = this.repository.findExpirableQuotes(now);

		for (const quote of expirable) {
			this.repository.update(quote.id, {
				status: "expired",
				expiredAt: now,
				updatedAt: now,
			});
		}

		return expirable.length;
	}

	// ── T3: Clone Quote ─────────────────────────────────────────────────────

	cloneQuote(tenantId: string, quoteId: string): AdminQuoteDetail | null {
		const original = this.repository.findById(quoteId);
		if (!original || original.tenantId !== tenantId) return null;

		const originalLineItems = this.repository.getLineItems(quoteId);

		return this.createQuote(tenantId, {
			customerName: original.customerName,
			customerEmail: original.customerEmail,
			customerPhone: original.customerPhone ?? undefined,
			validityDays: original.validityDays,
			notes: original.notes ?? undefined,
			customerNotes: original.customerNotes ?? undefined,
			termsAndConditions: original.termsAndConditions ?? undefined,
			lineItems: originalLineItems.map((li) => ({
				catalogItemId: li.catalogItemId ?? undefined,
				serviceId: li.serviceId ?? undefined,
				description: li.description,
				quantity: li.quantity,
				unitPriceCents: li.unitPriceCents,
				lineNotes: li.lineNotes ?? undefined,
			})),
		});
	}

	// ── Private Helpers ─────────────────────────────────────────────────────

	private toAdminDetail(
		quote: QuoteRecord,
		lineItems: QuoteLineItemRecord[],
	): AdminQuoteDetail {
		return {
			id: quote.id,
			tenantId: quote.tenantId,
			quoteNumber: quote.quoteNumber,
			customerName: quote.customerName,
			customerEmail: quote.customerEmail,
			customerPhone: quote.customerPhone,
			status: quote.status,
			validityDays: quote.validityDays,
			expiresAt: quote.expiresAt,
			notes: quote.notes,
			customerNotes: quote.customerNotes,
			termsAndConditions: quote.termsAndConditions,
			subtotalCents: quote.subtotalCents,
			taxEstimateCents: quote.taxEstimateCents,
			totalCents: quote.totalCents,
			shareToken: quote.shareToken,
			shareTokenExpiresAt: quote.shareTokenExpiresAt,
			createdAt: quote.createdAt,
			updatedAt: quote.updatedAt,
			sentAt: quote.sentAt,
			viewedAt: quote.viewedAt,
			respondedAt: quote.respondedAt,
			acceptedAt: quote.acceptedAt,
			declinedAt: quote.declinedAt,
			revisionRequestedAt: quote.revisionRequestedAt,
			expiredAt: quote.expiredAt,
			convertedOrderId: quote.convertedOrderId,
			respondentEmail: quote.respondentEmail,
			respondentName: quote.respondentName,
			revisionNotes: quote.revisionNotes,
			lineItems,
			allowedTransitions: getNextQuoteStatuses(quote.status),
		};
	}

	private toAdminSummary(quote: QuoteRecord): AdminQuoteSummary {
		const lineItems = this.repository.getLineItems(quote.id);
		return {
			id: quote.id,
			quoteNumber: quote.quoteNumber,
			createdAt: quote.createdAt,
			status: quote.status,
			customerName: quote.customerName,
			customerEmail: quote.customerEmail,
			totalCents: quote.totalCents,
			lineItemCount: lineItems.length,
			expiresAt: quote.expiresAt,
			sentAt: quote.sentAt,
			viewedAt: quote.viewedAt,
			respondedAt: quote.respondedAt,
		};
	}

	private toCustomerView(
		quote: QuoteRecord,
		lineItems: QuoteLineItemRecord[],
	): CustomerQuoteView {
		return {
			quoteNumber: quote.quoteNumber,
			businessName: "Business",
			customerName: quote.customerName,
			customerEmail: quote.customerEmail,
			status: quote.status,
			validityDays: quote.validityDays,
			expiresAt: quote.expiresAt,
			customerNotes: quote.customerNotes,
			termsAndConditions: quote.termsAndConditions,
			lineItems: lineItems.map(
				(li): CustomerQuoteLineItemView => ({
					description: li.description,
					quantity: li.quantity,
					unitPriceCents: li.unitPriceCents,
					lineTotalCents: li.lineTotalCents,
					lineNotes: li.lineNotes,
				}),
			),
			subtotalCents: quote.subtotalCents,
			taxEstimateCents: quote.taxEstimateCents,
			totalCents: quote.totalCents,
			createdAt: quote.createdAt,
			sentAt: quote.sentAt,
		};
	}

	private calculateTotals(
		lineItems: { unitPriceCents: number; quantity: number }[],
	): { subtotalCents: number; taxEstimateCents: number; totalCents: number } {
		const subtotalCents = lineItems.reduce(
			(sum, li) => sum + li.unitPriceCents * li.quantity,
			0,
		);
		const taxEstimateCents = 0;
		const totalCents = subtotalCents + taxEstimateCents;
		return { subtotalCents, taxEstimateCents, totalCents };
	}
}
