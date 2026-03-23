import { Injectable } from "@nestjs/common";
import type {
	QuoteRecord,
	QuoteLineItemRecord,
	QuoteStatus,
	AdminQuoteListQuery,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Quote Repository — in-memory store for quote data
// ---------------------------------------------------------------------------

@Injectable()
export class QuoteRepository {
	private quotes: Map<string, QuoteRecord> = new Map();
	private lineItems: QuoteLineItemRecord[] = [];
	private nextId = 1;

	private generateId(prefix: string): string {
		return `${prefix}-${this.nextId++}`;
	}

	// ── Quote CRUD ───────────────────────────────────────────────────────────

	create(quote: QuoteRecord): QuoteRecord {
		this.quotes.set(quote.id, quote);
		return quote;
	}

	findById(id: string): QuoteRecord | null {
		return this.quotes.get(id) ?? null;
	}

	findByShareToken(shareToken: string): QuoteRecord | null {
		return (
			Array.from(this.quotes.values()).find(
				(q) => q.shareToken === shareToken,
			) ?? null
		);
	}

	update(id: string, updates: Partial<QuoteRecord>): QuoteRecord | null {
		const existing = this.quotes.get(id);
		if (!existing) return null;

		const updated: QuoteRecord = { ...existing, ...updates };
		this.quotes.set(id, updated);
		return updated;
	}

	delete(id: string): boolean {
		return this.quotes.delete(id);
	}

	// ── Quote Line Items ─────────────────────────────────────────────────────

	setLineItems(quoteId: string, items: QuoteLineItemRecord[]): void {
		this.lineItems = this.lineItems.filter((li) => li.quoteId !== quoteId);
		this.lineItems.push(...items);
	}

	getLineItems(quoteId: string): QuoteLineItemRecord[] {
		return this.lineItems
			.filter((li) => li.quoteId === quoteId)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	// ── Listing & Filtering ──────────────────────────────────────────────────

	list(query: AdminQuoteListQuery): { quotes: QuoteRecord[]; total: number } {
		let filtered = Array.from(this.quotes.values()).filter(
			(q) => q.tenantId === query.tenantId,
		);

		if (query.status) {
			filtered = filtered.filter((q) => q.status === query.status);
		}

		if (query.search) {
			const term = query.search.toLowerCase();
			filtered = filtered.filter(
				(q) =>
					q.customerName.toLowerCase().includes(term) ||
					q.customerEmail.toLowerCase().includes(term) ||
					q.quoteNumber.toLowerCase().includes(term),
			);
		}

		if (query.dateFrom) {
			filtered = filtered.filter((q) => q.createdAt >= query.dateFrom!);
		}

		if (query.dateTo) {
			filtered = filtered.filter((q) => q.createdAt <= query.dateTo!);
		}

		filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

		const total = filtered.length;
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;
		const start = (page - 1) * pageSize;
		const quotes = filtered.slice(start, start + pageSize);

		return { quotes, total };
	}

	// ── Pipeline Aggregation ─────────────────────────────────────────────────

	getStatusCounts(tenantId: string): Map<QuoteStatus, number> {
		const counts = new Map<QuoteStatus, number>();
		const tenantQuotes = Array.from(this.quotes.values()).filter(
			(q) => q.tenantId === tenantId,
		);
		tenantQuotes.forEach((q) => {
			counts.set(q.status, (counts.get(q.status) ?? 0) + 1);
		});
		return counts;
	}

	// ── Expiration ───────────────────────────────────────────────────────────

	findExpirableQuotes(now: string): QuoteRecord[] {
		return Array.from(this.quotes.values()).filter(
			(q) =>
				(q.status === "sent" || q.status === "viewed") &&
				q.expiresAt <= now,
		);
	}

	// ── By Tenant ────────────────────────────────────────────────────────────

	listByTenant(tenantId: string): QuoteRecord[] {
		return Array.from(this.quotes.values()).filter(
			(q) => q.tenantId === tenantId,
		);
	}
}
