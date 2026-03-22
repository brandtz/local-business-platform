// ---------------------------------------------------------------------------
// E11-S3: Search and Filter Infrastructure
// Shared search service types consumable by any domain module.
// All search operations are tenant-scoped — cross-tenant data leakage is a
// security violation.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Filter types (E11-S3-T1 / E11-S3-T4)
// ---------------------------------------------------------------------------

/**
 * Filter types supported by the search infrastructure.
 * - enum: dropdown / multi-select with predefined options
 * - range: numeric min/max
 * - date: date range with optional from/to
 * - text: free-text substring or prefix match
 * - boolean: true/false toggle
 */
export const searchFilterTypes = [
	"enum",
	"range",
	"date",
	"text",
	"boolean",
] as const;

export type SearchFilterType = (typeof searchFilterTypes)[number];

export function isValidSearchFilterType(
	value: string
): value is SearchFilterType {
	return (searchFilterTypes as readonly string[]).includes(value);
}

/** An enum filter: match one or more values from a predefined set. */
export type EnumFilterValue = {
	type: "enum";
	field: string;
	values: string[];
};

/** A numeric range filter: optional min and/or max. */
export type RangeFilterValue = {
	type: "range";
	field: string;
	min?: number;
	max?: number;
};

/** A date range filter: optional from and/or to (ISO 8601 strings). */
export type DateFilterValue = {
	type: "date";
	field: string;
	from?: string;
	to?: string;
};

/** A free-text filter on a specific field. */
export type TextFilterValue = {
	type: "text";
	field: string;
	value: string;
};

/** A boolean filter on a specific field. */
export type BooleanFilterValue = {
	type: "boolean";
	field: string;
	value: boolean;
};

/** Union of all filter value types. */
export type SearchFilterValue =
	| EnumFilterValue
	| RangeFilterValue
	| DateFilterValue
	| TextFilterValue
	| BooleanFilterValue;

// ---------------------------------------------------------------------------
// Sort parameters
// ---------------------------------------------------------------------------

export const sortDirections = ["asc", "desc"] as const;

export type SearchSortDirection = (typeof sortDirections)[number];

export function isValidSortDirection(
	value: string
): value is SearchSortDirection {
	return (sortDirections as readonly string[]).includes(value);
}

export type SearchSortParam = {
	field: string;
	direction: SearchSortDirection;
};

// ---------------------------------------------------------------------------
// Search query (E11-S3-T1)
// ---------------------------------------------------------------------------

/**
 * Generic search query contract.
 * - tenantId is mandatory for tenant isolation.
 * - query is an optional full-text search string.
 * - filters is an array of typed faceted filter values.
 * - sort controls ordering.
 * - Cursor-based pagination via cursor/pageSize.
 */
export type SearchQuery = {
	/** Tenant isolation — required on every query. */
	tenantId: string;
	/** Full-text search string (optional). */
	query?: string;
	/** Faceted filter values (optional). */
	filters?: SearchFilterValue[];
	/** Sort parameters (optional, defaults to relevance). */
	sort?: SearchSortParam[];
	/**
	 * Opaque cursor for pagination. Omit for the first page.
	 * The cursor value is returned from the previous SearchResult.
	 */
	cursor?: string;
	/** Page size (defaults to 20, max 100). */
	pageSize?: number;
};

export const SEARCH_DEFAULT_PAGE_SIZE = 20;
export const SEARCH_MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Search result (E11-S3-T1)
// ---------------------------------------------------------------------------

/**
 * A single item in a search result set, generic over the entity type.
 * Includes a relevance score for ranking.
 */
export type SearchResultItem<T> = {
	/** The matched entity. */
	item: T;
	/** Relevance score (0–1). Higher is more relevant. */
	score: number;
	/** Matched field highlights for UI display (optional). */
	highlights?: Record<string, string[]>;
};

/**
 * Generic search result set with cursor-based pagination.
 */
export type SearchResult<T> = {
	/** Matched items with scores. */
	items: SearchResultItem<T>[];
	/** Total count of matching items (for UI "N results found"). */
	totalCount: number;
	/**
	 * Opaque cursor for the next page. Null when there are no more results.
	 */
	nextCursor: string | null;
	/** Whether more results are available beyond this page. */
	hasMore: boolean;
};

// ---------------------------------------------------------------------------
// Indexed entity types (E11-S3-T2)
// ---------------------------------------------------------------------------

/**
 * Domain entity types that are indexed for search.
 */
export const indexedEntityTypes = [
	"catalog-item",
	"service",
	"order",
	"booking",
	"customer",
	"staff",
	"content-page",
] as const;

export type IndexedEntityType = (typeof indexedEntityTypes)[number];

export function isValidIndexedEntityType(
	value: string
): value is IndexedEntityType {
	return (indexedEntityTypes as readonly string[]).includes(value);
}

/**
 * Indexing trigger events.
 */
export const indexTriggerEvents = ["create", "update", "delete"] as const;

export type IndexTriggerEvent = (typeof indexTriggerEvents)[number];

/**
 * A document in the search index.
 * Generic over the entity type to allow domain-specific fields.
 */
export type IndexedDocument = {
	/** Unique document ID (typically the entity primary key). */
	id: string;
	/** Tenant isolation key. */
	tenantId: string;
	/** The entity type this document represents. */
	entityType: IndexedEntityType;
	/** Searchable text fields (used for full-text search). */
	searchableText: string[];
	/** Filterable facet fields (used for faceted filtering). */
	facets: Record<string, string | number | boolean | null>;
	/** Sortable field values. */
	sortFields: Record<string, string | number>;
	/** Timestamp for freshness scoring. */
	indexedAt: string;
};

/**
 * Configuration for how a domain entity is indexed.
 */
export type EntityIndexConfig = {
	entityType: IndexedEntityType;
	/** Fields that contribute to full-text search. */
	searchableFields: string[];
	/** Fields that can be used as faceted filters. */
	filterableFields: string[];
	/** Fields that can be used for sorting. */
	sortableFields: string[];
};

// ---------------------------------------------------------------------------
// Autocomplete (E11-S3-T3)
// ---------------------------------------------------------------------------

/**
 * Autocomplete query — returns typeahead suggestions.
 */
export type AutocompleteQuery = {
	/** Tenant isolation — required. */
	tenantId: string;
	/** Partial text input from the user. */
	prefix: string;
	/** Limit entity types to search (optional — all if omitted). */
	entityTypes?: IndexedEntityType[];
	/** Maximum number of suggestions (defaults to 5). */
	limit?: number;
};

export const AUTOCOMPLETE_DEFAULT_LIMIT = 5;
export const AUTOCOMPLETE_MAX_LIMIT = 20;
export const AUTOCOMPLETE_MIN_PREFIX_LENGTH = 1;

/**
 * A single autocomplete suggestion.
 */
export type AutocompleteSuggestion = {
	/** The suggested text value. */
	text: string;
	/** Entity type (e.g. "catalog-item", "customer"). */
	entityType: IndexedEntityType;
	/** Entity ID for navigation. */
	entityId: string;
	/** Relevance score (0–1). */
	score: number;
};

/**
 * Autocomplete response.
 */
export type AutocompleteResult = {
	suggestions: AutocompleteSuggestion[];
};

// ---------------------------------------------------------------------------
// Filter-toolbar data contract (E11-S3-T4)
// ---------------------------------------------------------------------------

/**
 * An option for an enum filter (dropdown, checkbox set, etc.).
 */
export type FilterOptionDefinition = {
	/** Value sent to the server. */
	value: string;
	/** Human-readable label for display. */
	label: string;
};

/**
 * Structured filter definition that the server provides to drive frontend
 * filter toolbar rendering. Each definition describes one filter field.
 */
export type FilterFieldDefinition = {
	/** Unique field identifier (must match the field in SearchFilterValue). */
	field: string;
	/** Display label for the filter. */
	label: string;
	/** Filter type (determines rendering component). */
	type: SearchFilterType;
	/** Available options (for enum type). */
	options?: FilterOptionDefinition[];
	/** Placeholder text for text inputs. */
	placeholder?: string;
	/** Default value (for pre-selection). */
	defaultValue?: string | number | boolean;
	/** Range constraints for range filters. */
	rangeMin?: number;
	rangeMax?: number;
};

/**
 * Complete filter-toolbar metadata provided by the server.
 * The frontend consumes this to render filter controls generically.
 */
export type FilterToolbarDefinition = {
	/** Entity type this toolbar applies to. */
	entityType: IndexedEntityType;
	/** Ordered list of filter field definitions. */
	filters: FilterFieldDefinition[];
	/** Default sort field and direction. */
	defaultSort: SearchSortParam;
	/** Available sort options. */
	sortOptions: { field: string; label: string }[];
};

// ---------------------------------------------------------------------------
// Consumer integration contracts (E11-S3-T5)
// ---------------------------------------------------------------------------

/**
 * Entity-specific search query that extends the base SearchQuery
 * with an entity type discriminator.
 */
export type EntitySearchQuery = SearchQuery & {
	entityType: IndexedEntityType;
};

// ---------------------------------------------------------------------------
// Relevance scoring (E11-S3-T6)
// ---------------------------------------------------------------------------

/**
 * Weight configuration for relevance scoring.
 * Allows per-field boosting when computing search scores.
 */
export type RelevanceWeights = {
	/** Weights per searchable field (field name → boost factor). */
	fieldWeights: Record<string, number>;
	/** Bonus for exact match vs. partial match (0–1). */
	exactMatchBoost: number;
	/** Bonus for prefix match (0–1). */
	prefixMatchBoost: number;
	/** Freshness decay factor (0–1, higher = more weight to recent). */
	freshnessWeight: number;
};

export const DEFAULT_RELEVANCE_WEIGHTS: RelevanceWeights = {
	fieldWeights: { name: 1.0, description: 0.5 },
	exactMatchBoost: 0.3,
	prefixMatchBoost: 0.15,
	freshnessWeight: 0.1,
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function validateSearchQuery(query: SearchQuery): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!query.tenantId || query.tenantId.trim().length === 0) {
		errors.push("tenantId is required");
	}

	const pageSize = query.pageSize ?? SEARCH_DEFAULT_PAGE_SIZE;
	if (pageSize < 1 || pageSize > SEARCH_MAX_PAGE_SIZE) {
		errors.push(
			`pageSize must be between 1 and ${SEARCH_MAX_PAGE_SIZE}`
		);
	}

	if (query.filters) {
		for (const filter of query.filters) {
			if (!isValidSearchFilterType(filter.type)) {
				errors.push(`Invalid filter type: ${filter.type}`);
			}
			if (!filter.field || filter.field.trim().length === 0) {
				errors.push("Filter field is required");
			}
		}
	}

	if (query.sort) {
		for (const s of query.sort) {
			if (!s.field || s.field.trim().length === 0) {
				errors.push("Sort field is required");
			}
			if (!isValidSortDirection(s.direction)) {
				errors.push(`Invalid sort direction: ${s.direction}`);
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

export function validateAutocompleteQuery(query: AutocompleteQuery): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!query.tenantId || query.tenantId.trim().length === 0) {
		errors.push("tenantId is required");
	}

	if (
		!query.prefix ||
		query.prefix.trim().length < AUTOCOMPLETE_MIN_PREFIX_LENGTH
	) {
		errors.push(
			`prefix must be at least ${AUTOCOMPLETE_MIN_PREFIX_LENGTH} character(s)`
		);
	}

	const limit = query.limit ?? AUTOCOMPLETE_DEFAULT_LIMIT;
	if (limit < 1 || limit > AUTOCOMPLETE_MAX_LIMIT) {
		errors.push(
			`limit must be between 1 and ${AUTOCOMPLETE_MAX_LIMIT}`
		);
	}

	if (query.entityTypes) {
		for (const et of query.entityTypes) {
			if (!isValidIndexedEntityType(et)) {
				errors.push(`Invalid entity type: ${et}`);
			}
		}
	}

	return { valid: errors.length === 0, errors };
}
