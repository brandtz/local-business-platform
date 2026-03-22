import type {
	IndexedDocument,
	IndexedEntityType,
} from "@platform/types";

// ---------------------------------------------------------------------------
// In-memory search index repository (E11-S3-T2)
// Database-level search backing store. The abstraction allows future swap
// to an external search engine (Elasticsearch, etc.) without changing
// the SearchService interface.
// ---------------------------------------------------------------------------

export class SearchIndexRepository {
	/** Tenant → EntityType → doc ID → document */
	private readonly index = new Map<
		string,
		Map<string, Map<string, IndexedDocument>>
	>();

	/**
	 * Insert or update a document. Tenant-scoped.
	 */
	upsert(doc: IndexedDocument): void {
		let tenantMap = this.index.get(doc.tenantId);
		if (!tenantMap) {
			tenantMap = new Map();
			this.index.set(doc.tenantId, tenantMap);
		}
		let typeMap = tenantMap.get(doc.entityType);
		if (!typeMap) {
			typeMap = new Map();
			tenantMap.set(doc.entityType, typeMap);
		}
		typeMap.set(doc.id, doc);
	}

	/**
	 * Remove a document from the index.
	 */
	remove(
		tenantId: string,
		entityType: IndexedEntityType,
		id: string
	): boolean {
		const typeMap = this.index
			.get(tenantId)
			?.get(entityType);
		if (!typeMap) return false;
		return typeMap.delete(id);
	}

	/**
	 * Find all documents for a tenant and entity type.
	 * This is the primary query path — always tenant-scoped.
	 */
	findByTenantAndType(
		tenantId: string,
		entityType: IndexedEntityType
	): IndexedDocument[] {
		const typeMap = this.index
			.get(tenantId)
			?.get(entityType);
		if (!typeMap) return [];
		return Array.from(typeMap.values());
	}

	/**
	 * Get a specific document by ID (tenant-scoped).
	 */
	findById(
		tenantId: string,
		entityType: IndexedEntityType,
		id: string
	): IndexedDocument | undefined {
		return this.index
			.get(tenantId)
			?.get(entityType)
			?.get(id);
	}

	/**
	 * Count documents for a tenant and entity type.
	 */
	count(
		tenantId: string,
		entityType: IndexedEntityType
	): number {
		return this.index
			.get(tenantId)
			?.get(entityType)
			?.size ?? 0;
	}

	/**
	 * Remove all documents for a tenant (for cleanup/testing).
	 */
	clearTenant(tenantId: string): void {
		this.index.delete(tenantId);
	}

	/**
	 * Remove all documents (for testing).
	 */
	clearAll(): void {
		this.index.clear();
	}
}
