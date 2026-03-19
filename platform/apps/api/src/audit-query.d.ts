import type { AuditCategory, AuditFilterCriteria } from "./audit-categories.js";
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
export declare const DEFAULT_PAGE_SIZE = 25;
export declare const MAX_PAGE_SIZE = 100;
export declare function clampPageSize(requested: number): number;
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
export declare function buildQueryClauses(request: PaginatedRequest, resolvedEventKinds: string[]): AuditQueryClauses;
/**
 * Builds a paginated response from a set of fetched items.
 * Assumes items is sorted newest-first and has limit+1 items
 * if there are more pages.
 */
export declare function buildPaginatedResponse(items: AuditLogEntry[], limit: number, totalEstimate: number | null): PaginatedResponse;
/**
 * Validates that the query is properly tenant-scoped.
 * This is a guard to prevent cross-tenant data access.
 */
export declare function validateTenantScope(queriedTenantId: string, authenticatedTenantId: string): boolean;
export type DateRangeValidation = {
    valid: true;
} | {
    valid: false;
    message: string;
};
export declare function validateDateRange(dateFrom: string | null, dateTo: string | null): DateRangeValidation;
export type QueryValidationResult = {
    valid: true;
} | {
    valid: false;
    messages: string[];
};
export declare function validateAuditQuery(request: PaginatedRequest, authenticatedTenantId: string): QueryValidationResult;
