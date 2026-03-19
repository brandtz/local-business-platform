import { describe, it, expect, beforeEach } from "vitest";
import {
	getCacheKeysToInvalidate,
	detectChangedFields,
	isNoOp,
	planCacheInvalidation,
	buildProfileUpdatedEvent,
	buildBrandingUpdatedEvent,
	buildLocationCreatedEvent,
	buildLocationUpdatedEvent,
	buildLocationDeletedEvent,
	buildHoursUpdatedEvent,
	buildPoliciesUpdatedEvent,
	buildFulfillmentUpdatedEvent,
	buildModuleEnabledEvent,
	buildModuleDisabledEvent,
	describeSettingsEvent,
	settingsEventKinds,
	_resetEventCounter
} from "./settings-events.js";

const ctx = { tenantId: "tenant-1", actorId: "user-1" };

beforeEach(() => {
	_resetEventCounter();
});

// ── Cache Key Generation ─────────────────────────────────────────────────────

describe("getCacheKeysToInvalidate", () => {
	it("returns section key and all key", () => {
		const keys = getCacheKeysToInvalidate("t1", "hours");
		expect(keys).toContain("tenant:t1:settings:hours");
		expect(keys).toContain("tenant:t1:settings:all");
		expect(keys).toHaveLength(2);
	});

	it("includes storefront key for profile changes", () => {
		const keys = getCacheKeysToInvalidate("t1", "profile");
		expect(keys).toContain("tenant:t1:storefront");
		expect(keys).toHaveLength(3);
	});

	it("includes storefront key for branding changes", () => {
		const keys = getCacheKeysToInvalidate("t1", "branding");
		expect(keys).toContain("tenant:t1:storefront");
	});

	it("does not include storefront for locations", () => {
		const keys = getCacheKeysToInvalidate("t1", "locations");
		expect(keys).not.toContain("tenant:t1:storefront");
	});
});

// ── No-Op Detection ──────────────────────────────────────────────────────────

describe("detectChangedFields", () => {
	it("returns changed fields only", () => {
		const before = { name: "A", phone: "111" };
		const after = { name: "B", phone: "111" };
		expect(detectChangedFields(before, after, ["name", "phone"])).toEqual([
			"name"
		]);
	});

	it("returns empty when nothing changed", () => {
		const obj = { a: "1" };
		expect(detectChangedFields(obj, obj, ["a"])).toEqual([]);
	});

	it("handles missing fields as null", () => {
		expect(detectChangedFields({}, { x: "val" }, ["x"])).toEqual(["x"]);
	});
});

describe("isNoOp", () => {
	it("returns true when nothing changed", () => {
		expect(isNoOp({ a: 1 }, { a: 1 }, ["a"])).toBe(true);
	});

	it("returns false when something changed", () => {
		expect(isNoOp({ a: 1 }, { a: 2 }, ["a"])).toBe(false);
	});
});

// ── Plan Cache Invalidation ──────────────────────────────────────────────────

describe("planCacheInvalidation", () => {
	it("invalidates keys when fields changed", () => {
		const result = planCacheInvalidation(
			"t1",
			"profile",
			{ name: "A" },
			{ name: "B" },
			["name"]
		);
		expect(result.skipped).toBe(false);
		expect(result.invalidatedKeys.length).toBeGreaterThan(0);
	});

	it("skips when no-op", () => {
		const result = planCacheInvalidation(
			"t1",
			"profile",
			{ name: "A" },
			{ name: "A" },
			["name"]
		);
		expect(result.skipped).toBe(true);
		expect(result.invalidatedKeys).toEqual([]);
	});
});

// ── Event Builders ───────────────────────────────────────────────────────────

describe("buildProfileUpdatedEvent", () => {
	it("creates profile event with changed fields", () => {
		const event = buildProfileUpdatedEvent(ctx, ["businessName"]);
		expect(event.kind).toBe("profile_updated");
		expect(event.changedFields).toEqual(["businessName"]);
		expect(event.section).toBe("profile");
		expect(event.tenantId).toBe("tenant-1");
	});
});

describe("buildBrandingUpdatedEvent", () => {
	it("creates branding event", () => {
		const event = buildBrandingUpdatedEvent(ctx, ["logo"]);
		expect(event.kind).toBe("branding_updated");
		expect(event.section).toBe("branding");
	});
});

describe("buildLocationCreatedEvent", () => {
	it("captures location name and id", () => {
		const event = buildLocationCreatedEvent(ctx, "loc-1", "Main");
		expect(event.kind).toBe("location_created");
		expect(event.locationId).toBe("loc-1");
		expect(event.locationName).toBe("Main");
	});
});

describe("buildLocationUpdatedEvent", () => {
	it("captures changed fields", () => {
		const event = buildLocationUpdatedEvent(ctx, "loc-1", ["name", "phone"]);
		expect(event.kind).toBe("location_updated");
		expect(event.changedFields).toEqual(["name", "phone"]);
	});
});

describe("buildLocationDeletedEvent", () => {
	it("creates delete event", () => {
		const event = buildLocationDeletedEvent(ctx, "loc-1");
		expect(event.kind).toBe("location_deleted");
	});
});

describe("buildHoursUpdatedEvent", () => {
	it("creates hours event for location", () => {
		const event = buildHoursUpdatedEvent(ctx, "loc-1");
		expect(event.kind).toBe("hours_updated");
		expect(event.locationId).toBe("loc-1");
	});
});

describe("buildPoliciesUpdatedEvent", () => {
	it("captures policy types", () => {
		const event = buildPoliciesUpdatedEvent(ctx, "loc-1", ["tax", "tipping"]);
		expect(event.kind).toBe("policies_updated");
		expect(event.policyTypes).toEqual(["tax", "tipping"]);
	});
});

describe("buildFulfillmentUpdatedEvent", () => {
	it("creates fulfillment event", () => {
		const event = buildFulfillmentUpdatedEvent(ctx, ["enabledModes"]);
		expect(event.kind).toBe("fulfillment_updated");
		expect(event.section).toBe("fulfillment");
	});
});

describe("buildModuleEnabledEvent", () => {
	it("captures module key", () => {
		const event = buildModuleEnabledEvent(ctx, "ordering");
		expect(event.kind).toBe("module_enabled");
		expect(event.moduleKey).toBe("ordering");
	});
});

describe("buildModuleDisabledEvent", () => {
	it("captures module key", () => {
		const event = buildModuleDisabledEvent(ctx, "bookings");
		expect(event.kind).toBe("module_disabled");
		expect(event.moduleKey).toBe("bookings");
	});
});

// ── Event Kind Registry ──────────────────────────────────────────────────────

describe("settingsEventKinds", () => {
	it("contains all 10 event kinds", () => {
		expect(settingsEventKinds).toHaveLength(10);
	});
});

// ── Describe Event ───────────────────────────────────────────────────────────

describe("describeSettingsEvent", () => {
	it("describes profile update", () => {
		const event = buildProfileUpdatedEvent(ctx, ["businessName"]);
		expect(describeSettingsEvent(event)).toContain("businessName");
	});

	it("describes location created", () => {
		const event = buildLocationCreatedEvent(ctx, "loc-1", "Main");
		expect(describeSettingsEvent(event)).toContain("Main");
	});

	it("describes module enabled", () => {
		const event = buildModuleEnabledEvent(ctx, "ordering");
		expect(describeSettingsEvent(event)).toContain("ordering");
	});

	it("describes all event kinds without throwing", () => {
		const events = [
			buildProfileUpdatedEvent(ctx, ["a"]),
			buildBrandingUpdatedEvent(ctx, ["b"]),
			buildLocationCreatedEvent(ctx, "l1", "X"),
			buildLocationUpdatedEvent(ctx, "l1", ["c"]),
			buildLocationDeletedEvent(ctx, "l1"),
			buildHoursUpdatedEvent(ctx, "l1"),
			buildPoliciesUpdatedEvent(ctx, "l1", ["tax"]),
			buildFulfillmentUpdatedEvent(ctx, ["d"]),
			buildModuleEnabledEvent(ctx, "ordering"),
			buildModuleDisabledEvent(ctx, "bookings")
		];
		for (const event of events) {
			expect(() => describeSettingsEvent(event)).not.toThrow();
			expect(describeSettingsEvent(event)).toBeTruthy();
		}
	});
});

// ── Unique IDs ───────────────────────────────────────────────────────────────

describe("event ID generation", () => {
	it("generates unique IDs", () => {
		const e1 = buildProfileUpdatedEvent(ctx, []);
		const e2 = buildBrandingUpdatedEvent(ctx, []);
		expect(e1.id).not.toBe(e2.id);
	});
});
