import type { TenantModuleKey } from "@platform/types";
import type { SettingsSection } from "./settings-validation.js";
export declare const settingsEventKinds: readonly ["profile_updated", "branding_updated", "location_created", "location_updated", "location_deleted", "hours_updated", "policies_updated", "fulfillment_updated", "module_enabled", "module_disabled"];
export type SettingsEventKind = (typeof settingsEventKinds)[number];
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
export type SettingsEvent = ProfileUpdatedEvent | BrandingUpdatedEvent | LocationCreatedEvent | LocationUpdatedEvent | LocationDeletedEvent | HoursUpdatedEvent | PoliciesUpdatedEvent | FulfillmentUpdatedEvent | ModuleEnabledEvent | ModuleDisabledEvent;
export type CacheKeyPattern = `tenant:${string}:settings:${SettingsSection}` | `tenant:${string}:settings:all` | `tenant:${string}:storefront`;
/**
 * Computes the cache keys that must be invalidated for a settings event.
 */
export declare function getCacheKeysToInvalidate(tenantId: string, section: SettingsSection): CacheKeyPattern[];
/**
 * Compares before/after values (JSON-serialized) to detect actual changes.
 * Returns only the fields that actually changed.
 */
export declare function detectChangedFields(before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]): string[];
/**
 * Returns true if the mutation is a no-op (nothing actually changed).
 */
export declare function isNoOp(before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]): boolean;
export declare function _resetEventCounter(): void;
type EventContext = {
    tenantId: string;
    actorId: string;
};
export declare function buildProfileUpdatedEvent(ctx: EventContext, changedFields: string[]): ProfileUpdatedEvent;
export declare function buildBrandingUpdatedEvent(ctx: EventContext, changedFields: string[]): BrandingUpdatedEvent;
export declare function buildLocationCreatedEvent(ctx: EventContext, locationId: string, locationName: string): LocationCreatedEvent;
export declare function buildLocationUpdatedEvent(ctx: EventContext, locationId: string, changedFields: string[]): LocationUpdatedEvent;
export declare function buildLocationDeletedEvent(ctx: EventContext, locationId: string): LocationDeletedEvent;
export declare function buildHoursUpdatedEvent(ctx: EventContext, locationId: string): HoursUpdatedEvent;
export declare function buildPoliciesUpdatedEvent(ctx: EventContext, locationId: string, policyTypes: string[]): PoliciesUpdatedEvent;
export declare function buildFulfillmentUpdatedEvent(ctx: EventContext, changedFields: string[]): FulfillmentUpdatedEvent;
export declare function buildModuleEnabledEvent(ctx: EventContext, moduleKey: TenantModuleKey): ModuleEnabledEvent;
export declare function buildModuleDisabledEvent(ctx: EventContext, moduleKey: TenantModuleKey): ModuleDisabledEvent;
export type CacheInvalidationResult = {
    invalidatedKeys: CacheKeyPattern[];
    skipped: boolean;
};
/**
 * Top-level helper: given a settings mutation, determines cache keys
 * that need invalidation. Returns skipped: true for no-op mutations.
 */
export declare function planCacheInvalidation(tenantId: string, section: SettingsSection, before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]): CacheInvalidationResult;
export declare function describeSettingsEvent(event: SettingsEvent): string;
export {};
