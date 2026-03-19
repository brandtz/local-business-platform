// E5-S5-T2: Settings change events and tenant-scoped cache invalidation.
// Emits events for each settings mutation category and invalidates cached
// settings on change. No-op detection prevents unnecessary invalidation.

import type { TenantModuleKey } from "@platform/types";
import type { SettingsSection } from "./settings-validation.js";

// ── Settings Event Kinds ─────────────────────────────────────────────────────

export const settingsEventKinds = [
	"profile_updated",
	"branding_updated",
	"location_created",
	"location_updated",
	"location_deleted",
	"hours_updated",
	"policies_updated",
	"fulfillment_updated",
	"module_enabled",
	"module_disabled"
] as const;

export type SettingsEventKind = (typeof settingsEventKinds)[number];

// ── Event Payloads ───────────────────────────────────────────────────────────

export type SettingsEventBase = {
	id: string;
	tenantId: string;
	actorId: string;
	timestamp: string;
	section: SettingsSection;
};

export type ProfileUpdatedEvent = SettingsEventBase & {
	kind: "profile_updated";
	changedFields: string[];
};

export type BrandingUpdatedEvent = SettingsEventBase & {
	kind: "branding_updated";
	changedFields: string[];
};

export type LocationCreatedEvent = SettingsEventBase & {
	kind: "location_created";
	locationId: string;
	locationName: string;
};

export type LocationUpdatedEvent = SettingsEventBase & {
	kind: "location_updated";
	locationId: string;
	changedFields: string[];
};

export type LocationDeletedEvent = SettingsEventBase & {
	kind: "location_deleted";
	locationId: string;
};

export type HoursUpdatedEvent = SettingsEventBase & {
	kind: "hours_updated";
	locationId: string;
};

export type PoliciesUpdatedEvent = SettingsEventBase & {
	kind: "policies_updated";
	locationId: string;
	policyTypes: string[];
};

export type FulfillmentUpdatedEvent = SettingsEventBase & {
	kind: "fulfillment_updated";
	changedFields: string[];
};

export type ModuleEnabledEvent = SettingsEventBase & {
	kind: "module_enabled";
	moduleKey: TenantModuleKey;
};

export type ModuleDisabledEvent = SettingsEventBase & {
	kind: "module_disabled";
	moduleKey: TenantModuleKey;
};

export type SettingsEvent =
	| ProfileUpdatedEvent
	| BrandingUpdatedEvent
	| LocationCreatedEvent
	| LocationUpdatedEvent
	| LocationDeletedEvent
	| HoursUpdatedEvent
	| PoliciesUpdatedEvent
	| FulfillmentUpdatedEvent
	| ModuleEnabledEvent
	| ModuleDisabledEvent;

// ── Cache Key Generation ─────────────────────────────────────────────────────

export type CacheKeyPattern =
	| `tenant:${string}:settings:${SettingsSection}`
	| `tenant:${string}:settings:all`
	| `tenant:${string}:storefront`;

/**
 * Computes the cache keys that must be invalidated for a settings event.
 */
export function getCacheKeysToInvalidate(
	tenantId: string,
	section: SettingsSection
): CacheKeyPattern[] {
	const keys: CacheKeyPattern[] = [
		`tenant:${tenantId}:settings:${section}`,
		`tenant:${tenantId}:settings:all`
	];

	// Profile and branding changes also invalidate storefront cache
	if (section === "profile" || section === "branding") {
		keys.push(`tenant:${tenantId}:storefront`);
	}

	return keys;
}

// ── No-Op Detection ──────────────────────────────────────────────────────────

/**
 * Compares before/after values (JSON-serialized) to detect actual changes.
 * Returns only the fields that actually changed.
 */
export function detectChangedFields(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	fields: string[]
): string[] {
	const changed: string[] = [];
	for (const field of fields) {
		const oldVal = JSON.stringify(before[field] ?? null);
		const newVal = JSON.stringify(after[field] ?? null);
		if (oldVal !== newVal) {
			changed.push(field);
		}
	}
	return changed;
}

/**
 * Returns true if the mutation is a no-op (nothing actually changed).
 */
export function isNoOp(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	fields: string[]
): boolean {
	return detectChangedFields(before, after, fields).length === 0;
}

// ── Event Builder ────────────────────────────────────────────────────────────

let _eventCounter = 0;

function generateId(): string {
	_eventCounter += 1;
	return `set-evt-${Date.now()}-${_eventCounter}`;
}

export function _resetEventCounter(): void {
	_eventCounter = 0;
}

type EventContext = {
	tenantId: string;
	actorId: string;
};

function makeBase(
	ctx: EventContext,
	section: SettingsSection
): SettingsEventBase {
	return {
		id: generateId(),
		tenantId: ctx.tenantId,
		actorId: ctx.actorId,
		timestamp: new Date().toISOString(),
		section
	};
}

export function buildProfileUpdatedEvent(
	ctx: EventContext,
	changedFields: string[]
): ProfileUpdatedEvent {
	return { ...makeBase(ctx, "profile"), kind: "profile_updated", changedFields };
}

export function buildBrandingUpdatedEvent(
	ctx: EventContext,
	changedFields: string[]
): BrandingUpdatedEvent {
	return {
		...makeBase(ctx, "branding"),
		kind: "branding_updated",
		changedFields
	};
}

export function buildLocationCreatedEvent(
	ctx: EventContext,
	locationId: string,
	locationName: string
): LocationCreatedEvent {
	return {
		...makeBase(ctx, "locations"),
		kind: "location_created",
		locationId,
		locationName
	};
}

export function buildLocationUpdatedEvent(
	ctx: EventContext,
	locationId: string,
	changedFields: string[]
): LocationUpdatedEvent {
	return {
		...makeBase(ctx, "locations"),
		kind: "location_updated",
		locationId,
		changedFields
	};
}

export function buildLocationDeletedEvent(
	ctx: EventContext,
	locationId: string
): LocationDeletedEvent {
	return {
		...makeBase(ctx, "locations"),
		kind: "location_deleted",
		locationId
	};
}

export function buildHoursUpdatedEvent(
	ctx: EventContext,
	locationId: string
): HoursUpdatedEvent {
	return { ...makeBase(ctx, "hours"), kind: "hours_updated", locationId };
}

export function buildPoliciesUpdatedEvent(
	ctx: EventContext,
	locationId: string,
	policyTypes: string[]
): PoliciesUpdatedEvent {
	return {
		...makeBase(ctx, "policies"),
		kind: "policies_updated",
		locationId,
		policyTypes
	};
}

export function buildFulfillmentUpdatedEvent(
	ctx: EventContext,
	changedFields: string[]
): FulfillmentUpdatedEvent {
	return {
		...makeBase(ctx, "fulfillment"),
		kind: "fulfillment_updated",
		changedFields
	};
}

export function buildModuleEnabledEvent(
	ctx: EventContext,
	moduleKey: TenantModuleKey
): ModuleEnabledEvent {
	return {
		...makeBase(ctx, "modules"),
		kind: "module_enabled",
		moduleKey
	};
}

export function buildModuleDisabledEvent(
	ctx: EventContext,
	moduleKey: TenantModuleKey
): ModuleDisabledEvent {
	return {
		...makeBase(ctx, "modules"),
		kind: "module_disabled",
		moduleKey
	};
}

// ── Invalidation Result ──────────────────────────────────────────────────────

export type CacheInvalidationResult = {
	invalidatedKeys: CacheKeyPattern[];
	skipped: boolean;
};

/**
 * Top-level helper: given a settings mutation, determines cache keys
 * that need invalidation. Returns skipped: true for no-op mutations.
 */
export function planCacheInvalidation(
	tenantId: string,
	section: SettingsSection,
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	fields: string[]
): CacheInvalidationResult {
	if (isNoOp(before, after, fields)) {
		return { invalidatedKeys: [], skipped: true };
	}
	return {
		invalidatedKeys: getCacheKeysToInvalidate(tenantId, section),
		skipped: false
	};
}

// ── Describe Event ───────────────────────────────────────────────────────────

export function describeSettingsEvent(event: SettingsEvent): string {
	switch (event.kind) {
		case "profile_updated":
			return `Profile updated (${event.changedFields.join(", ")})`;
		case "branding_updated":
			return `Branding updated (${event.changedFields.join(", ")})`;
		case "location_created":
			return `Location created: ${event.locationName}`;
		case "location_updated":
			return `Location updated (${event.changedFields.join(", ")})`;
		case "location_deleted":
			return `Location deleted: ${event.locationId}`;
		case "hours_updated":
			return `Hours updated for location ${event.locationId}`;
		case "policies_updated":
			return `Policies updated (${event.policyTypes.join(", ")})`;
		case "fulfillment_updated":
			return `Fulfillment updated (${event.changedFields.join(", ")})`;
		case "module_enabled":
			return `Module enabled: ${event.moduleKey}`;
		case "module_disabled":
			return `Module disabled: ${event.moduleKey}`;
	}
}
