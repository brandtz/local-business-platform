// E5-S6-T1: Tenant-visible audit event categories and filtering rules.
// Maps event kinds to tenant-visible categories and excludes platform-internal events.
// Categories: settings_changes, team_changes, location_changes, order_events.
// Excluded: provisioning internals, platform-admin actions, system health, infrastructure.

import type { TeamAuditEventKind } from "./membership-audit-events.js";
import type { SettingsEventKind } from "./settings-events.js";

// ── Tenant-Visible Categories ────────────────────────────────────────────────

export const auditCategories = [
	"settings_changes",
	"team_changes",
	"location_changes",
	"order_events"
] as const;

export type AuditCategory = (typeof auditCategories)[number];

// ── Platform-Internal Event Kinds (never visible to tenants) ─────────────────

export const platformInternalEventKinds = [
	"tenant_provisioned",
	"tenant_suspended",
	"tenant_deleted",
	"platform_admin_login",
	"platform_admin_impersonation",
	"system_health_check",
	"infrastructure_scaling",
	"database_migration",
	"billing_sync",
	"feature_flag_changed"
] as const;

export type PlatformInternalEventKind =
	(typeof platformInternalEventKinds)[number];

// ── Tenant-Visible Event Kind ────────────────────────────────────────────────

export type TenantVisibleEventKind = TeamAuditEventKind | SettingsEventKind;

// ── Category Mapping ─────────────────────────────────────────────────────────

const teamEventKinds: readonly string[] = [
	"invitation_created",
	"invitation_accepted",
	"invitation_revoked",
	"invitation_expired",
	"role_changed",
	"user_deactivated",
	"user_reactivated",
	"staff_created",
	"staff_updated",
	"staff_deleted"
];

const settingsEventKinds: readonly string[] = [
	"profile_updated",
	"branding_updated",
	"fulfillment_updated",
	"module_enabled",
	"module_disabled",
	"policies_updated"
];

const locationEventKinds: readonly string[] = [
	"location_created",
	"location_updated",
	"location_deleted",
	"hours_updated"
];

// Order events will be populated by later epics (E7/E8)
const orderEventKinds: readonly string[] = [];

const categoryMap: Record<AuditCategory, readonly string[]> = {
	team_changes: teamEventKinds,
	settings_changes: settingsEventKinds,
	location_changes: locationEventKinds,
	order_events: orderEventKinds
};

/**
 * Returns the tenant-visible category for an event kind.
 * Returns null if the event is excluded (platform-internal or unknown).
 */
export function classifyEventKind(eventKind: string): AuditCategory | null {
	// Check if it's platform-internal
	if (
		(platformInternalEventKinds as readonly string[]).includes(eventKind)
	) {
		return null;
	}

	for (const [category, kinds] of Object.entries(categoryMap)) {
		if (kinds.includes(eventKind)) {
			return category as AuditCategory;
		}
	}

	return null;
}

/**
 * Returns all event kinds belonging to a category.
 */
export function getEventKindsForCategory(
	category: AuditCategory
): readonly string[] {
	return categoryMap[category] ?? [];
}

/**
 * Returns all tenant-visible event kinds across all categories.
 */
export function getAllVisibleEventKinds(): string[] {
	const kinds: string[] = [];
	for (const catKinds of Object.values(categoryMap)) {
		kinds.push(...catKinds);
	}
	return kinds;
}

/**
 * Returns true if the event kind is tenant-visible.
 */
export function isTenantVisible(eventKind: string): boolean {
	return classifyEventKind(eventKind) !== null;
}

/**
 * Returns true if the event kind is platform-internal.
 */
export function isPlatformInternal(eventKind: string): boolean {
	return (platformInternalEventKinds as readonly string[]).includes(
		eventKind
	);
}

// ── Filter Types ─────────────────────────────────────────────────────────────

export type AuditFilterCriteria = {
	categories: AuditCategory[];
	eventKinds: string[];
	actorId: string | null;
	entityId: string | null;
	dateFrom: string | null;
	dateTo: string | null;
};

export function createEmptyFilter(): AuditFilterCriteria {
	return {
		categories: [],
		eventKinds: [],
		actorId: null,
		entityId: null,
		dateFrom: null,
		dateTo: null
	};
}

/**
 * Resolves the effective event kinds from filter criteria.
 * If categories are specified, expands them to their event kinds.
 * If specific event kinds are also specified, intersects with category kinds.
 */
export function resolveFilterEventKinds(
	filter: AuditFilterCriteria
): string[] {
	let categoryKinds: string[] | null = null;

	if (filter.categories.length > 0) {
		categoryKinds = [];
		for (const cat of filter.categories) {
			categoryKinds.push(...getEventKindsForCategory(cat));
		}
	}

	if (filter.eventKinds.length > 0) {
		if (categoryKinds !== null) {
			// Intersect with category kinds
			const catSet = new Set(categoryKinds);
			return filter.eventKinds.filter((k) => catSet.has(k));
		}
		return [...filter.eventKinds];
	}

	if (categoryKinds !== null) {
		return categoryKinds;
	}

	// No filter — return all visible kinds
	return getAllVisibleEventKinds();
}

// ── Category Labels ──────────────────────────────────────────────────────────

export function getCategoryLabel(category: AuditCategory): string {
	const labels: Record<AuditCategory, string> = {
		settings_changes: "Settings Changes",
		team_changes: "Team Changes",
		location_changes: "Location Changes",
		order_events: "Order Events"
	};
	return labels[category];
}
