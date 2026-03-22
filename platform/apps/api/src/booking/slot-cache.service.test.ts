import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { SlotComputationResult } from "@platform/types";
import { buildSlotCacheKey } from "@platform/types";

import { SlotCacheService } from "./slot-cache.service";

// ─── Shared Test Data ────────────────────────────────────────────────────────

const tenantId = "tenant-1";
const locationId = "loc-1";
const serviceId = "svc-1";
const date = "2025-04-07";

const cacheKey = { tenantId, locationId, serviceId, date };

const sampleResult: SlotComputationResult = {
	tenantId,
	locationId,
	serviceId,
	date,
	slots: [
		{
			startTime: "2025-04-07T09:00:00",
			endTime: "2025-04-07T09:30:00",
			staffId: "staff-a",
			staffName: "Alice",
			serviceId,
		},
	],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("slot cache service", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("buildSlotCacheKey", () => {
		it("builds a cache key from components", () => {
			const key = buildSlotCacheKey(cacheKey);
			expect(key).toBe("slots:tenant-1:loc-1:svc-1:2025-04-07");
		});

		it("includes staffId when provided", () => {
			const key = buildSlotCacheKey({ ...cacheKey, staffId: "staff-a" });
			expect(key).toBe("slots:tenant-1:loc-1:svc-1:2025-04-07:staff-a");
		});
	});

	describe("get and set", () => {
		it("returns null for cache miss", () => {
			const cache = new SlotCacheService(60);
			expect(cache.get(cacheKey)).toBeNull();
		});

		it("returns cached result within TTL", () => {
			const cache = new SlotCacheService(60);
			cache.set(cacheKey, sampleResult);

			const result = cache.get(cacheKey);
			expect(result).toEqual(sampleResult);
		});

		it("returns null after TTL expires", () => {
			const cache = new SlotCacheService(60);
			cache.set(cacheKey, sampleResult);

			// Advance time past TTL
			vi.advanceTimersByTime(61 * 1000);

			expect(cache.get(cacheKey)).toBeNull();
		});

		it("returns cached result just before TTL", () => {
			const cache = new SlotCacheService(60);
			cache.set(cacheKey, sampleResult);

			vi.advanceTimersByTime(59 * 1000);

			expect(cache.get(cacheKey)).toEqual(sampleResult);
		});
	});

	describe("invalidation", () => {
		it("invalidates entries on booking-created for specific date", () => {
			const cache = new SlotCacheService(300);
			cache.set(cacheKey, sampleResult);
			cache.set({ ...cacheKey, date: "2025-04-08" }, sampleResult);

			const invalidated = cache.invalidate("booking-created", {
				tenantId,
				locationId,
				date: "2025-04-07",
			});

			expect(invalidated).toBe(1);
			expect(cache.get(cacheKey)).toBeNull();
			expect(cache.get({ ...cacheKey, date: "2025-04-08" })).toEqual(sampleResult);
		});

		it("invalidates all entries on schedule-changed", () => {
			const cache = new SlotCacheService(300);
			cache.set(cacheKey, sampleResult);
			cache.set({ ...cacheKey, date: "2025-04-08" }, sampleResult);

			const invalidated = cache.invalidate("schedule-changed", {
				tenantId,
				locationId,
			});

			expect(invalidated).toBe(2);
			expect(cache.get(cacheKey)).toBeNull();
			expect(cache.get({ ...cacheKey, date: "2025-04-08" })).toBeNull();
		});

		it("invalidates all entries on blackout-updated", () => {
			const cache = new SlotCacheService(300);
			cache.set(cacheKey, sampleResult);

			const invalidated = cache.invalidate("blackout-updated", {
				tenantId,
				locationId,
			});

			expect(invalidated).toBe(1);
			expect(cache.get(cacheKey)).toBeNull();
		});

		it("invalidates all entries on hours-changed", () => {
			const cache = new SlotCacheService(300);
			cache.set(cacheKey, sampleResult);
			cache.set({ ...cacheKey, serviceId: "svc-2" }, sampleResult);

			const invalidated = cache.invalidate("hours-changed", {
				tenantId,
				locationId,
			});

			expect(invalidated).toBe(2);
		});

		it("invalidates on booking-cancelled for specific date", () => {
			const cache = new SlotCacheService(300);
			cache.set(cacheKey, sampleResult);

			const invalidated = cache.invalidate("booking-cancelled", {
				tenantId,
				locationId,
				date,
			});

			expect(invalidated).toBe(1);
			expect(cache.get(cacheKey)).toBeNull();
		});

		it("does not invalidate entries for other tenants", () => {
			const cache = new SlotCacheService(300);
			cache.set(cacheKey, sampleResult);
			cache.set(
				{ ...cacheKey, tenantId: "tenant-2" },
				{ ...sampleResult, tenantId: "tenant-2" }
			);

			cache.invalidate("schedule-changed", {
				tenantId: "tenant-2",
				locationId,
			});

			// Tenant-1 cache should still be valid
			expect(cache.get(cacheKey)).toEqual(sampleResult);
		});
	});

	describe("freshness after mutation", () => {
		it("does not serve stale slots after booking creation invalidation", () => {
			const cache = new SlotCacheService(300);

			// Populate cache
			cache.set(cacheKey, sampleResult);
			expect(cache.get(cacheKey)).toEqual(sampleResult);

			// Simulate booking creation → invalidate
			cache.invalidate("booking-created", { tenantId, locationId, date });

			// Cache should return null (stale data cleared)
			expect(cache.get(cacheKey)).toBeNull();
		});
	});

	describe("size and clear", () => {
		it("tracks cache size", () => {
			const cache = new SlotCacheService(300);
			expect(cache.size()).toBe(0);

			cache.set(cacheKey, sampleResult);
			expect(cache.size()).toBe(1);

			cache.set({ ...cacheKey, date: "2025-04-08" }, sampleResult);
			expect(cache.size()).toBe(2);
		});

		it("clears all entries", () => {
			const cache = new SlotCacheService(300);
			cache.set(cacheKey, sampleResult);
			cache.set({ ...cacheKey, date: "2025-04-08" }, sampleResult);

			cache.clear();
			expect(cache.size()).toBe(0);
		});
	});

	describe("evictExpired", () => {
		it("removes expired entries", () => {
			const cache = new SlotCacheService(60);
			cache.set(cacheKey, sampleResult);

			vi.advanceTimersByTime(61 * 1000);

			cache.set({ ...cacheKey, date: "2025-04-08" }, sampleResult);

			const evicted = cache.evictExpired();
			expect(evicted).toBe(1);
			expect(cache.size()).toBe(1);
		});
	});

	describe("tenant isolation", () => {
		it("cache keys include tenant scope", () => {
			const key1 = buildSlotCacheKey({ tenantId: "t1", locationId, serviceId, date });
			const key2 = buildSlotCacheKey({ tenantId: "t2", locationId, serviceId, date });
			expect(key1).not.toBe(key2);
		});

		it("different tenants get independent cache entries", () => {
			const cache = new SlotCacheService(300);

			const result1 = { ...sampleResult, tenantId: "tenant-1" };
			const result2 = { ...sampleResult, tenantId: "tenant-2" };

			cache.set({ tenantId: "tenant-1", locationId, serviceId, date }, result1);
			cache.set({ tenantId: "tenant-2", locationId, serviceId, date }, result2);

			expect(cache.get({ tenantId: "tenant-1", locationId, serviceId, date })).toEqual(result1);
			expect(cache.get({ tenantId: "tenant-2", locationId, serviceId, date })).toEqual(result2);
		});
	});
});
