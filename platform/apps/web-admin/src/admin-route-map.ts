// E5-S1-T1: Tenant-admin route map — navigation sections, role gating, and module dependencies.
// Defines the information architecture for the tenant admin portal with role-aware visibility.

import type { TenantActorRole, TenantModuleKey } from "@platform/types";

// ── Admin Navigation Sections ────────────────────────────────────────────────

export const adminNavigationSectionIds = [
	"dashboard",
	"catalog",
	"ordering",
	"bookings",
	"content",
	"operations",
	"users",
	"settings",
	"audit"
] as const;

export type AdminNavigationSectionId =
	(typeof adminNavigationSectionIds)[number];

// ── Role Requirement ─────────────────────────────────────────────────────────

export type AdminSectionRoleRequirement = {
	/** Minimum roles allowed to see this section. Empty means all roles. */
	allowedRoles: readonly TenantActorRole[];
};

// ── Admin Route Entry ────────────────────────────────────────────────────────

export type AdminRouteEntry = {
	/** Route path relative to admin root. */
	path: string;
	/** Human-readable label for navigation rendering. */
	label: string;
	/** Navigation section this route belongs to. */
	section: AdminNavigationSectionId;
	/** Module keys required for this route to be accessible. Empty = always accessible. */
	requiredModules: readonly TenantModuleKey[];
	/** Role requirements for accessing this route. */
	roleRequirement: AdminSectionRoleRequirement;
	/** Whether this is the primary route for its section (shown in sidebar). */
	isPrimary: boolean;
};

// ── Route Map ────────────────────────────────────────────────────────────────

const ownerAdminOnly: AdminSectionRoleRequirement = {
	allowedRoles: ["owner", "admin"]
};

const ownerOnly: AdminSectionRoleRequirement = {
	allowedRoles: ["owner"]
};

const allRoles: AdminSectionRoleRequirement = {
	allowedRoles: []
};

export const adminRouteMap: readonly AdminRouteEntry[] = [
	// Dashboard
	{
		path: "/",
		label: "Dashboard",
		section: "dashboard",
		requiredModules: [],
		roleRequirement: allRoles,
		isPrimary: true
	},

	// Catalog
	{
		path: "/catalog",
		label: "Catalog",
		section: "catalog",
		requiredModules: ["catalog"],
		roleRequirement: allRoles,
		isPrimary: true
	},

	// Ordering
	{
		path: "/ordering",
		label: "Ordering",
		section: "ordering",
		requiredModules: ["ordering"],
		roleRequirement: allRoles,
		isPrimary: true
	},

	// Bookings
	{
		path: "/bookings",
		label: "Bookings",
		section: "bookings",
		requiredModules: ["bookings"],
		roleRequirement: allRoles,
		isPrimary: true
	},

	// Content
	{
		path: "/content",
		label: "Content",
		section: "content",
		requiredModules: ["content"],
		roleRequirement: allRoles,
		isPrimary: true
	},

	// Operations
	{
		path: "/operations",
		label: "Operations",
		section: "operations",
		requiredModules: ["operations"],
		roleRequirement: allRoles,
		isPrimary: true
	},

	// Users (owner/admin only)
	{
		path: "/users",
		label: "Users",
		section: "users",
		requiredModules: [],
		roleRequirement: ownerAdminOnly,
		isPrimary: true
	},

	// Settings (owner only)
	{
		path: "/settings",
		label: "Settings",
		section: "settings",
		requiredModules: [],
		roleRequirement: ownerOnly,
		isPrimary: true
	},
	{
		path: "/settings/profile",
		label: "Business Profile",
		section: "settings",
		requiredModules: [],
		roleRequirement: ownerOnly,
		isPrimary: false
	},
	{
		path: "/settings/branding",
		label: "Branding",
		section: "settings",
		requiredModules: [],
		roleRequirement: ownerOnly,
		isPrimary: false
	},
	{
		path: "/settings/locations",
		label: "Locations",
		section: "settings",
		requiredModules: ["operations"],
		roleRequirement: ownerOnly,
		isPrimary: false
	},

	// Audit (owner/admin only)
	{
		path: "/audit",
		label: "Activity Log",
		section: "audit",
		requiredModules: [],
		roleRequirement: ownerAdminOnly,
		isPrimary: true
	}
];

// ── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the primary navigation entries (sidebar-level items).
 */
export function getPrimaryNavigationEntries(): readonly AdminRouteEntry[] {
	return adminRouteMap.filter((entry) => entry.isPrimary);
}

/**
 * Returns all route entries for a given navigation section.
 */
export function getRoutesForSection(
	section: AdminNavigationSectionId
): readonly AdminRouteEntry[] {
	return adminRouteMap.filter((entry) => entry.section === section);
}

/**
 * Checks whether a role is allowed to access a route entry.
 */
export function isRoleAllowedForRoute(
	entry: AdminRouteEntry,
	role: TenantActorRole
): boolean {
	if (entry.roleRequirement.allowedRoles.length === 0) {
		return true;
	}

	return (entry.roleRequirement.allowedRoles as readonly string[]).includes(
		role
	);
}

/**
 * Checks whether a route entry is accessible given the enabled module set.
 */
export function isRouteAccessibleForModules(
	entry: AdminRouteEntry,
	enabledModules: readonly TenantModuleKey[]
): boolean {
	if (entry.requiredModules.length === 0) {
		return true;
	}

	const enabledSet = new Set(enabledModules);

	return entry.requiredModules.every((m) => enabledSet.has(m));
}

/**
 * Returns the visible primary navigation entries for a given role and module set.
 */
export function getVisibleNavigationEntries(
	role: TenantActorRole,
	enabledModules: readonly TenantModuleKey[]
): readonly AdminRouteEntry[] {
	return getPrimaryNavigationEntries().filter(
		(entry) =>
			isRoleAllowedForRoute(entry, role) &&
			isRouteAccessibleForModules(entry, enabledModules)
	);
}
