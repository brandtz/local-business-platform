import { Injectable } from "@nestjs/common";

import type {
	AutocompleteQuery,
	AutocompleteResult,
	AutocompleteSuggestion,
	EntityIndexConfig,
	EntitySearchQuery,
	FilterToolbarDefinition,
	IndexedDocument,
	IndexedEntityType,
	IndexTriggerEvent,
	RelevanceWeights,
	SearchFilterValue,
	SearchQuery,
	SearchResult,
	SearchResultItem,
	SearchSortParam,
} from "@platform/types";
import {
	AUTOCOMPLETE_DEFAULT_LIMIT,
	AUTOCOMPLETE_MAX_LIMIT,
	DEFAULT_RELEVANCE_WEIGHTS,
	indexedEntityTypes,
	SEARCH_DEFAULT_PAGE_SIZE,
	SEARCH_MAX_PAGE_SIZE,
	validateAutocompleteQuery,
	validateSearchQuery,
} from "@platform/types";

import { SearchIndexRepository } from "./search-index.repository";
import {
	ENTITY_INDEX_CONFIGS,
	FILTER_TOOLBAR_DEFINITIONS,
} from "./search-entity-configs";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class SearchError extends Error {
	constructor(
		public readonly reason:
			| "invalid-query"
			| "invalid-entity-type"
			| "tenant-required",
		message: string
	) {
		super(message);
		this.name = "SearchError";
	}
}

// ---------------------------------------------------------------------------
// Search Service (E11-S3-T1, T2, T3, T5, T6)
// ---------------------------------------------------------------------------

@Injectable()
export class SearchService {
	constructor(
		private readonly repository: SearchIndexRepository = new SearchIndexRepository()
	) {}

	// -----------------------------------------------------------------------
	// Indexing (E11-S3-T2)
	// -----------------------------------------------------------------------

	/**
	 * Index or re-index a document. Enforces tenant isolation.
	 */
	indexDocument(doc: IndexedDocument): void {
		if (!doc.tenantId) {
			throw new SearchError("tenant-required", "tenantId is required for indexing");
		}
		this.repository.upsert(doc);
	}

	/**
	 * Remove a document from the index.
	 */
	removeDocument(tenantId: string, entityType: IndexedEntityType, id: string): void {
		this.repository.remove(tenantId, entityType, id);
	}

	/**
	 * Handle an indexing trigger event (create/update/delete).
	 */
	handleIndexTrigger(
		event: IndexTriggerEvent,
		doc: IndexedDocument
	): void {
		if (event === "delete") {
			this.removeDocument(doc.tenantId, doc.entityType, doc.id);
		} else {
			this.indexDocument(doc);
		}
	}

	// -----------------------------------------------------------------------
	// Search (E11-S3-T1, T5)
	// -----------------------------------------------------------------------

	/**
	 * Execute a search query against indexed documents.
	 * All results are tenant-scoped — cross-tenant data leakage is prevented.
	 */
	search<T = Record<string, unknown>>(
		query: EntitySearchQuery
	): SearchResult<T> {
		const validation = validateSearchQuery(query);
		if (!validation.valid) {
			throw new SearchError("invalid-query", validation.errors.join("; "));
		}

		const pageSize = Math.min(
			query.pageSize ?? SEARCH_DEFAULT_PAGE_SIZE,
			SEARCH_MAX_PAGE_SIZE
		);

		// Retrieve tenant-scoped documents for the entity type
		let documents = this.repository.findByTenantAndType(
			query.tenantId,
			query.entityType
		);

		// Apply full-text search
		if (query.query && query.query.trim().length > 0) {
			const searchTerm = query.query.toLowerCase().trim();
			documents = documents.filter((doc) =>
				doc.searchableText.some((text) =>
					text.toLowerCase().includes(searchTerm)
				)
			);
		}

		// Apply faceted filters
		if (query.filters && query.filters.length > 0) {
			documents = this.applyFilters(documents, query.filters);
		}

		// Score and rank
		const config = ENTITY_INDEX_CONFIGS[query.entityType];
		const weights = config
			? this.buildWeightsForEntity(config)
			: DEFAULT_RELEVANCE_WEIGHTS;
		const scored = this.scoreDocuments(documents, query.query, weights);

		// Apply sort (user-specified sort overrides relevance)
		if (query.sort && query.sort.length > 0) {
			this.applySorting(scored, query.sort);
		} else {
			// Default: sort by relevance score descending
			scored.sort((a, b) => b.score - a.score);
		}

		// Cursor-based pagination
		const cursorIndex = query.cursor
			? this.decodeCursor(query.cursor)
			: 0;
		const page = scored.slice(cursorIndex, cursorIndex + pageSize);
		const hasMore = cursorIndex + pageSize < scored.length;
		const nextCursor = hasMore
			? this.encodeCursor(cursorIndex + pageSize)
			: null;

		return {
			items: page.map((s) => ({
				item: s.doc.facets as unknown as T,
				score: s.score,
				highlights: s.highlights,
			})),
			totalCount: scored.length,
			nextCursor,
			hasMore,
		};
	}

	// -----------------------------------------------------------------------
	// Autocomplete (E11-S3-T3)
	// -----------------------------------------------------------------------

	/**
	 * Return typeahead suggestions for admin and storefront search bars.
	 */
	autocomplete(query: AutocompleteQuery): AutocompleteResult {
		const validation = validateAutocompleteQuery(query);
		if (!validation.valid) {
			throw new SearchError("invalid-query", validation.errors.join("; "));
		}

		const limit = Math.min(
			query.limit ?? AUTOCOMPLETE_DEFAULT_LIMIT,
			AUTOCOMPLETE_MAX_LIMIT
		);
		const prefix = query.prefix.toLowerCase().trim();

		const entityTypes = query.entityTypes ?? [...indexedEntityTypes];

		const suggestions: AutocompleteSuggestion[] = [];

		for (const entityType of entityTypes) {
			const docs = this.repository.findByTenantAndType(
				query.tenantId,
				entityType
			);

			for (const doc of docs) {
				for (const text of doc.searchableText) {
					if (text.toLowerCase().startsWith(prefix)) {
						suggestions.push({
							text,
							entityType: doc.entityType,
							entityId: doc.id,
							score: this.computePrefixScore(text, prefix),
						});
					}
				}
			}
		}

		// Sort by score descending, then alphabetically
		suggestions.sort(
			(a, b) => b.score - a.score || a.text.localeCompare(b.text)
		);

		return { suggestions: suggestions.slice(0, limit) };
	}

	// -----------------------------------------------------------------------
	// Filter toolbar metadata (E11-S3-T4)
	// -----------------------------------------------------------------------

	/**
	 * Return filter toolbar definition for a given entity type.
	 */
	getFilterToolbarDefinition(
		entityType: IndexedEntityType
	): FilterToolbarDefinition | null {
		return FILTER_TOOLBAR_DEFINITIONS[entityType] ?? null;
	}

	/**
	 * Return the index configuration for an entity type.
	 */
	getEntityIndexConfig(
		entityType: IndexedEntityType
	): EntityIndexConfig | null {
		return ENTITY_INDEX_CONFIGS[entityType] ?? null;
	}

	// -----------------------------------------------------------------------
	// Private helpers
	// -----------------------------------------------------------------------

	private applyFilters(
		documents: IndexedDocument[],
		filters: SearchFilterValue[]
	): IndexedDocument[] {
		let result = documents;

		for (const filter of filters) {
			switch (filter.type) {
				case "enum":
					result = result.filter((doc) => {
						const val = doc.facets[filter.field];
						return (
							val !== null &&
							val !== undefined &&
							filter.values.includes(String(val))
						);
					});
					break;

				case "range":
					result = result.filter((doc) => {
						const val = doc.facets[filter.field];
						if (typeof val !== "number") return false;
						if (filter.min !== undefined && val < filter.min)
							return false;
						if (filter.max !== undefined && val > filter.max)
							return false;
						return true;
					});
					break;

				case "date":
					result = result.filter((doc) => {
						const val = doc.facets[filter.field];
						if (typeof val !== "string") return false;
						if (filter.from && val < filter.from) return false;
						if (filter.to && val > filter.to) return false;
						return true;
					});
					break;

				case "text":
					result = result.filter((doc) => {
						const val = doc.facets[filter.field];
						return (
							typeof val === "string" &&
							val
								.toLowerCase()
								.includes(filter.value.toLowerCase())
						);
					});
					break;

				case "boolean":
					result = result.filter((doc) => {
						return doc.facets[filter.field] === filter.value;
					});
					break;
			}
		}

		return result;
	}

	private scoreDocuments(
		documents: IndexedDocument[],
		queryText: string | undefined,
		weights: RelevanceWeights
	): ScoredDocument[] {
		if (!queryText || queryText.trim().length === 0) {
			// No search query — assign neutral scores
			return documents.map((doc) => ({
				doc,
				score: 0.5,
				highlights: undefined,
			}));
		}

		const term = queryText.toLowerCase().trim();

		return documents.map((doc) => {
			let score = 0;
			const highlights: Record<string, string[]> = {};

			for (const text of doc.searchableText) {
				const textLower = text.toLowerCase();
				const fieldName = this.inferFieldName(doc, text);
				const fieldWeight =
					weights.fieldWeights[fieldName] ?? 0.5;

				if (textLower === term) {
					// Exact match
					score += fieldWeight * (1.0 + weights.exactMatchBoost);
					highlights[fieldName] = [text];
				} else if (textLower.startsWith(term)) {
					// Prefix match
					score +=
						fieldWeight * (0.8 + weights.prefixMatchBoost);
					highlights[fieldName] = [text];
				} else if (textLower.includes(term)) {
					// Substring match
					score += fieldWeight * 0.5;
					highlights[fieldName] = [text];
				}
			}

			// Freshness bonus
			if (doc.indexedAt && weights.freshnessWeight > 0) {
				const indexedTime = new Date(doc.indexedAt).getTime();
				if (!isNaN(indexedTime)) {
					const age = Date.now() - indexedTime;
					const dayAge = age / (1000 * 60 * 60 * 24);
					const freshness = Math.max(0, 1 - dayAge / 365);
					score += freshness * weights.freshnessWeight;
				}
			}

			// Normalize score to 0–1. maxPossible accounts for the highest
			// achievable raw score: ~1.3 from field match (1.0 × 1.3 exact) +
			// 0.1 freshness + headroom, capped at 2.0 for safety.
			const maxPossible = 2.0;
			score = Math.min(score / maxPossible, 1.0);

			return { doc, score, highlights };
		});
	}

	private applySorting(
		scored: ScoredDocument[],
		sort: SearchSortParam[]
	): void {
		scored.sort((a, b) => {
			for (const s of sort) {
				const aVal = a.doc.sortFields[s.field] ?? "";
				const bVal = b.doc.sortFields[s.field] ?? "";

				let cmp: number;
				if (typeof aVal === "number" && typeof bVal === "number") {
					cmp = aVal - bVal;
				} else {
					cmp = String(aVal).localeCompare(String(bVal));
				}

				if (s.direction === "desc") cmp = -cmp;
				if (cmp !== 0) return cmp;
			}
			return 0;
		});
	}

	private computePrefixScore(text: string, prefix: string): number {
		const textLower = text.toLowerCase();
		if (textLower.length === 0) return 0;
		if (textLower === prefix) return 1.0;
		// Shorter completions score higher
		const ratio = prefix.length / textLower.length;
		return 0.5 + ratio * 0.4;
	}

	private inferFieldName(doc: IndexedDocument, text: string): string {
		// Check if the text matches a known facet value to infer field name
		for (const [field, val] of Object.entries(doc.facets)) {
			if (String(val) === text) return field;
		}
		return "name"; // Default field
	}

	private encodeCursor(offset: number): string {
		return Buffer.from(String(offset)).toString("base64");
	}

	private decodeCursor(cursor: string): number {
		const decoded = Buffer.from(cursor, "base64").toString("utf-8");
		const num = parseInt(decoded, 10);
		return isNaN(num) ? 0 : Math.max(0, num);
	}

	// -----------------------------------------------------------------------
	// Relevance weights per entity (E11-S3-T6)
	// -----------------------------------------------------------------------

	private buildWeightsForEntity(
		config: EntityIndexConfig
	): RelevanceWeights {
		const fieldWeights: Record<string, number> = {};

		// Primary searchable fields get higher weight
		for (let i = 0; i < config.searchableFields.length; i++) {
			fieldWeights[config.searchableFields[i]] =
				i === 0 ? 1.0 : 0.5;
		}

		return {
			...DEFAULT_RELEVANCE_WEIGHTS,
			fieldWeights,
		};
	}
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type ScoredDocument = {
	doc: IndexedDocument;
	score: number;
	highlights?: Record<string, string[]>;
};
