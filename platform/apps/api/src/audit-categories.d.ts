import type { TeamAuditEventKind } from "./membership-audit-events.js";
import type { SettingsEventKind } from "./settings-events.js";
export declare const auditCategories: readonly ["settings_changes", "team_changes", "location_changes", "order_events"];
export type AuditCategory = (typeof auditCategories)[number];
export declare const platformInternalEventKinds: readonly ["tenant_provisioned", "tenant_suspended", "tenant_deleted", "platform_admin_login", "platform_admin_impersonation", "system_health_check", "infrastructure_scaling", "database_migration", "billing_sync", "feature_flag_changed"];
export type PlatformInternalEventKind = (typeof platformInternalEventKinds)[number];
export type TenantVisibleEventKind = TeamAuditEventKind | SettingsEventKind;
/**
 * Returns the tenant-visible category for an event kind.
 * Returns null if the event is excluded (platform-internal or unknown).
 */
export declare function classifyEventKind(eventKind: string): AuditCategory | null;
/**
 * Returns all event kinds belonging to a category.
 */
export declare function getEventKindsForCategory(category: AuditCategory): readonly string[];
/**
 * Returns all tenant-visible event kinds across all categories.
 */
export declare function getAllVisibleEventKinds(): string[];
/**
 * Returns true if the event kind is tenant-visible.
 */
export declare function isTenantVisible(eventKind: string): boolean;
/**
 * Returns true if the event kind is platform-internal.
 */
export declare function isPlatformInternal(eventKind: string): boolean;
export type AuditFilterCriteria = {
    categories: AuditCategory[];
    eventKinds: string[];
    actorId: string | null;
    entityId: string | null;
    dateFrom: string | null;
    dateTo: string | null;
};
export declare function createEmptyFilter(): AuditFilterCriteria;
/**
 * Resolves the effective event kinds from filter criteria.
 * If categories are specified, expands them to their event kinds.
 * If specific event kinds are also specified, intersects with category kinds.
 */
export declare function resolveFilterEventKinds(filter: AuditFilterCriteria): string[];
export declare function getCategoryLabel(category: AuditCategory): string;
