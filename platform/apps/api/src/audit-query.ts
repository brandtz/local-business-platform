// E5-S6-T2: Backend query surfaces for tenant activity — paginated, filtered.
// Cursor-based pagination, category/date/actor/entity filters, tenant-scoped.

import type { AuditCategory, AuditFilterCriteria } from "./audit-categories.js";

// ── Audit Log Entry (stored/queryable shape) ─────────────────────────────────

export type AuditLogEntry = {
	id: string;
	tenantId: string;
	eventKind: string;
	category: AuditCategory;
	actorId: string;
	actorDisplayName: string;
	entityId: string | null;
	entityType: string | null;
	summary: string;
	metadata: Record<string, unknown>;
	timestamp: string;
};

// ── Cursor-Based Pagination ──────────────────────────────────────────────────

export type PaginationCursor = {
	/** The ID of the last item in the previous page. */
	afterId: string;
	/** The timestamp of the last item (for efficient seeks). */
	afterTimestamp: string;
};

export type PaginatedRequest = {
	tenantId: string;
	filter: AuditFilterCriteria;
	cursor: PaginationCursor | null;
	limit: number;
};

export type PaginatedResponse = {
	items: AuditLogEntry[];
	nextCursor: PaginationCursor | null;
	hasMore: boolean;
	totalEstimate: number | null;
};

// ── Request Defaults ─────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function clampPageSize(requested: number): number {
	if (requested < 1) return DEFAULT_PAGE_SIZE;
	if (requested > MAX_PAGE_SIZE) return MAX_PAGE_SIZE;
	return requested;
}

// ── Query Builder Types ──────────────────────────────────────────────────────

export type AuditQueryClauses = {
	tenantId: string;
	eventKinds: string[] | null;
	actorId: string | null;
	entityId: string | null;
	dateFrom: string | null;
	dateTo: string | null;
	cursor: PaginationCursor | null;
	limit: number;
};

/**
 * Builds query clauses from a paginated request. This is the
 * translation layer between the API shape and the data layer query.
 */
export function buildQueryClauses(
	request: PaginatedRequest,
	resolvedEventKinds: string[]
): AuditQueryClauses {
	return {
		tenantId: request.tenantId,
		eventKinds:
			resolvedEventKinds.length > 0 ? resolvedEventKinds : null,
		actorId: request.filter.actorId,
		entityId: request.filter.entityId,
		dateFrom: request.filter.dateFrom,
		dateTo: request.filter.dateTo,
		cursor: request.cursor,
		limit: clampPageSize(request.limit)
	};
}

// ── Response Builder ─────────────────────────────────────────────────────────

/**
 * Builds a paginated response from a set of fetched items.
 * Assumes items is sorted newest-first and has limit+1 items
 * if there are more pages.
 */
export function buildPaginatedResponse(
	items: AuditLogEntry[],
	limit: number,
	totalEstimate: number | null
): PaginatedResponse {
	const hasMore = items.length > limit;
	const pageItems = hasMore ? items.slice(0, limit) : items;
	const lastItem = pageItems[pageItems.length - 1];

	return {
		items: pageItems,
		nextCursor: hasMore && lastItem
			? {
					afterId: lastItem.id,
					afterTimestamp: lastItem.timestamp
				}
			: null,
		hasMore,
		totalEstimate
	};
}

// ── Tenant Scoping Enforcement ───────────────────────────────────────────────

/**
 * Validates that the query is properly tenant-scoped.
 * This is a guard to prevent cross-tenant data access.
 */
export function validateTenantScope(
	queriedTenantId: string,
	authenticatedTenantId: string
): boolean {
	return queriedTenantId === authenticatedTenantId;
}

// ── Date Range Validation ────────────────────────────────────────────────────

export type DateRangeValidation =
	| { valid: true }
	| { valid: false; message: string };

export function validateDateRange(
	dateFrom: string | null,
	dateTo: string | null
): DateRangeValidation {
	if (dateFrom === null || dateTo === null) {
		return { valid: true };
	}

	const from = new Date(dateFrom);
	const to = new Date(dateTo);

	if (isNaN(from.getTime())) {
		return { valid: false, message: "Invalid dateFrom format." };
	}
	if (isNaN(to.getTime())) {
		return { valid: false, message: "Invalid dateTo format." };
	}
	if (from > to) {
		return {
			valid: false,
			message: "dateFrom must be before dateTo."
		};
	}

	return { valid: true };
}

// ── Query Validation ─────────────────────────────────────────────────────────

export type QueryValidationResult =
	| { valid: true }
	| { valid: false; messages: string[] };

export function validateAuditQuery(
	request: PaginatedRequest,
	authenticatedTenantId: string
): QueryValidationResult {
	const messages: string[] = [];

	if (!validateTenantScope(request.tenantId, authenticatedTenantId)) {
		messages.push("Tenant mismatch: cannot query another tenant's audit log.");
	}

	const dateResult = validateDateRange(
		request.filter.dateFrom,
		request.filter.dateTo
	);
	if (!dateResult.valid) {
		messages.push(dateResult.message);
	}

	if (request.limit < 1) {
		messages.push("Limit must be at least 1.");
	}

	return messages.length === 0
		? { valid: true }
		: { valid: false, messages };
}
