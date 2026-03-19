// E5-S1-T4: Admin dashboard placeholders — mount point interfaces and section summary types
// for future E5-S2 through E5-S6 and E6/E7 domain module implementations.

import type { TenantModuleKey } from "@platform/types";

import type { AdminNavigationSectionId } from "./admin-route-map";

// ── Dashboard Widget Interface ───────────────────────────────────────────────

export type DashboardWidgetStatus = "ready" | "loading" | "error" | "empty";

export type DashboardWidgetDescriptor = {
	/** Unique identifier for routing widget updates. */
	widgetId: string;
	/** Human-readable title for the widget header. */
	title: string;
	/** Section that owns this widget. */
	section: AdminNavigationSectionId;
	/** Current widget status. */
	status: DashboardWidgetStatus;
	/** Module required for this widget (null = always shown). */
	requiredModule: TenantModuleKey | null;
};

// ── Dashboard Section Descriptors ────────────────────────────────────────────

export type DashboardSectionDescriptor = {
	section: AdminNavigationSectionId;
	title: string;
	description: string;
	widgets: readonly DashboardWidgetDescriptor[];
};

// ── Placeholder Widget Factory ───────────────────────────────────────────────

function createPlaceholderWidget(
	widgetId: string,
	title: string,
	section: AdminNavigationSectionId,
	requiredModule: TenantModuleKey | null = null
): DashboardWidgetDescriptor {
	return {
		widgetId,
		title,
		section,
		status: "empty",
		requiredModule
	};
}

// ── Dashboard Section Definitions ────────────────────────────────────────────

export const dashboardSections: readonly DashboardSectionDescriptor[] = [
	{
		section: "dashboard",
		title: "Overview",
		description: "Business summary and key metrics at a glance.",
		widgets: [
			createPlaceholderWidget("overview-summary", "Business Summary", "dashboard"),
			createPlaceholderWidget("overview-activity", "Recent Activity", "dashboard")
		]
	},
	{
		section: "catalog",
		title: "Catalog",
		description: "Manage products and services offered by your business.",
		widgets: [
			createPlaceholderWidget("catalog-summary", "Catalog Summary", "catalog", "catalog")
		]
	},
	{
		section: "ordering",
		title: "Ordering",
		description: "Track and manage customer orders.",
		widgets: [
			createPlaceholderWidget("ordering-summary", "Order Summary", "ordering", "ordering")
		]
	},
	{
		section: "bookings",
		title: "Bookings",
		description: "View and manage appointments and reservations.",
		widgets: [
			createPlaceholderWidget("bookings-summary", "Booking Summary", "bookings", "bookings")
		]
	},
	{
		section: "content",
		title: "Content",
		description: "Manage storefront pages, media, and messaging.",
		widgets: [
			createPlaceholderWidget("content-summary", "Content Summary", "content", "content")
		]
	},
	{
		section: "operations",
		title: "Operations",
		description: "Configure hours, locations, fulfillment, and operating rules.",
		widgets: [
			createPlaceholderWidget("operations-summary", "Operations Summary", "operations", "operations")
		]
	},
	{
		section: "users",
		title: "Users",
		description: "Manage team members, roles, and invitations.",
		widgets: [
			createPlaceholderWidget("users-summary", "Team Overview", "users")
		]
	},
	{
		section: "settings",
		title: "Settings",
		description: "Business profile, branding, and configuration.",
		widgets: [
			createPlaceholderWidget("settings-summary", "Configuration Status", "settings")
		]
	},
	{
		section: "audit",
		title: "Activity Log",
		description: "Review recent changes and operational events.",
		widgets: [
			createPlaceholderWidget("audit-summary", "Recent Events", "audit")
		]
	}
];

// ── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the dashboard section descriptor for a given section ID.
 */
export function getDashboardSection(
	sectionId: AdminNavigationSectionId
): DashboardSectionDescriptor | undefined {
	return dashboardSections.find((s) => s.section === sectionId);
}

/**
 * Returns dashboard sections visible to the given enabled module set.
 */
export function getVisibleDashboardSections(
	enabledModules: readonly TenantModuleKey[]
): readonly DashboardSectionDescriptor[] {
	const enabledSet = new Set(enabledModules);

	return dashboardSections.map((section) => ({
		...section,
		widgets: section.widgets.filter(
			(w) => w.requiredModule === null || enabledSet.has(w.requiredModule)
		)
	}));
}

/**
 * Returns all widget descriptors across all sections.
 */
export function getAllWidgetDescriptors(): readonly DashboardWidgetDescriptor[] {
	return dashboardSections.flatMap((s) => s.widgets);
}
