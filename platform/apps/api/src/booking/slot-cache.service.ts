import { Injectable } from "@nestjs/common";

import type {
	SlotCacheInvalidationTrigger,
	SlotCacheKey,
	SlotComputationResult,
} from "@platform/types";
import { buildSlotCacheKey } from "@platform/types";

// ─── Cache Configuration ─────────────────────────────────────────────────────

/**
 * Default TTL for slot cache entries in seconds.
 * 5 minutes balances freshness with query performance under load.
 */
const DEFAULT_TTL_SECONDS = 300;

/**
 * Maximum number of cache entries per tenant to prevent memory bloat.
 * Each entry covers one tenant+location+service+date combination.
 */
const MAX_ENTRIES_PER_TENANT = 1000;

// ─── Cache Entry ─────────────────────────────────────────────────────────────

type SlotCacheEntry = {
	result: SlotComputationResult;
	expiresAt: number; // epoch ms
	createdAt: number; // epoch ms
};

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * In-memory slot cache with TTL-based expiry and event-driven invalidation.
 *
 * Cache Key Structure:
 *   slots:{tenantId}:{locationId}:{serviceId}:{date}[:{staffId}]
 *
 * TTL Policy:
 *   - Default: 5 minutes (300 seconds)
 *   - Configurable per instantiation for testing
 *
 * Invalidation Triggers:
 *   - booking-created: invalidate all entries for that tenant+location+date
 *   - booking-cancelled: invalidate all entries for that tenant+location+date
 *   - schedule-changed: invalidate all entries for that tenant+location
 *   - blackout-updated: invalidate all entries for that tenant+location
 *   - hours-changed: invalidate all entries for that tenant+location
 *
 * Production Note:
 *   This in-memory implementation is suitable for single-instance deployments
 *   and development. For multi-instance production, replace with Redis-backed
 *   cache using the same key structure and invalidation triggers. The
 *   buildSlotCacheKey() function produces Redis-compatible key strings.
 */
@Injectable()
export class SlotCacheService {
	private readonly cache = new Map<string, SlotCacheEntry>();
	private readonly ttlSeconds: number;

	constructor(ttlSeconds?: number) {
		this.ttlSeconds = ttlSeconds ?? DEFAULT_TTL_SECONDS;
	}

	/**
	 * Gets a cached slot computation result if it exists and hasn't expired.
	 */
	get(key: SlotCacheKey): SlotComputationResult | null {
		const cacheKey = buildSlotCacheKey(key);
		const entry = this.cache.get(cacheKey);

		if (!entry) return null;

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(cacheKey);
			return null;
		}

		return entry.result;
	}

	/**
	 * Stores a slot computation result in the cache.
	 */
	set(key: SlotCacheKey, result: SlotComputationResult): void {
		this.enforceMaxEntries(key.tenantId);

		const cacheKey = buildSlotCacheKey(key);
		const now = Date.now();

		this.cache.set(cacheKey, {
			result,
			expiresAt: now + this.ttlSeconds * 1000,
			createdAt: now,
		});
	}

	/**
	 * Invalidates cache entries based on a trigger event.
	 * Different triggers have different invalidation scopes:
	 * - booking-created/cancelled: tenant + location + specific date
	 * - schedule/blackout/hours: tenant + location (all dates)
	 */
	invalidate(
		trigger: SlotCacheInvalidationTrigger,
		scope: {
			tenantId: string;
			locationId: string;
			date?: string;
			serviceId?: string;
		}
	): number {
		const prefix = `slots:${scope.tenantId}:${scope.locationId}`;
		let invalidated = 0;

		switch (trigger) {
			case "booking-created":
			case "booking-cancelled": {
				// Invalidate entries for the specific date (or all if no date)
				for (const key of this.cache.keys()) {
					if (key.startsWith(prefix)) {
						if (!scope.date || key.includes(`:${scope.date}`)) {
							this.cache.delete(key);
							invalidated++;
						}
					}
				}
				break;
			}

			case "schedule-changed":
			case "blackout-updated":
			case "hours-changed": {
				// Invalidate all entries for the tenant + location
				for (const key of this.cache.keys()) {
					if (key.startsWith(prefix)) {
						this.cache.delete(key);
						invalidated++;
					}
				}
				break;
			}
		}

		return invalidated;
	}

	/**
	 * Returns the number of entries currently in the cache.
	 */
	size(): number {
		return this.cache.size;
	}

	/**
	 * Clears all entries from the cache.
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Removes all expired entries from the cache.
	 */
	evictExpired(): number {
		const now = Date.now();
		let evicted = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiresAt) {
				this.cache.delete(key);
				evicted++;
			}
		}

		return evicted;
	}

	// ─── Private ─────────────────────────────────────────────────────────────

	private enforceMaxEntries(tenantId: string): void {
		const prefix = `slots:${tenantId}:`;
		let tenantEntries = 0;

		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				tenantEntries++;
			}
		}

		if (tenantEntries >= MAX_ENTRIES_PER_TENANT) {
			// Evict oldest entries for this tenant
			const tenantKeys: { key: string; createdAt: number }[] = [];
			for (const [key, entry] of this.cache.entries()) {
				if (key.startsWith(prefix)) {
					tenantKeys.push({ key, createdAt: entry.createdAt });
				}
			}
			tenantKeys.sort((a, b) => a.createdAt - b.createdAt);

			// Remove oldest 10% to avoid frequent eviction
			const toRemove = Math.max(1, Math.floor(tenantKeys.length * 0.1));
			for (let i = 0; i < toRemove; i++) {
				this.cache.delete(tenantKeys[i].key);
			}
		}
	}
}
