// E5-S6-T3: Tenant-admin activity log views for the admin UI.
// Paginated list, filter controls, event detail expansion.
// Accessible from the audit section of admin navigation.

import type { TenantActorRole } from "@platform/types";
import type { AuditCategory } from "./../../api/src/audit-categories.js";
import type { AuditLogEntry, PaginationCursor } from "./../../api/src/audit-query.js";

// ── Activity Log View State ──────────────────────────────────────────────────

export type ActivityLogViewState = {
	entries: AuditLogEntry[];
	isLoading: boolean;
	hasMore: boolean;
	cursor: PaginationCursor | null;
	expandedEntryId: string | null;
	filters: ActivityLogFilters;
};

export type ActivityLogFilters = {
	selectedCategories: AuditCategory[];
	actorId: string | null;
	dateFrom: string;
	dateTo: string;
	searchQuery: string;
};

export function createInitialLogState(): ActivityLogViewState {
	return {
		entries: [],
		isLoading: false,
		hasMore: false,
		cursor: null,
		expandedEntryId: null,
		filters: createDefaultFilters()
	};
}

export function createDefaultFilters(): ActivityLogFilters {
	return {
		selectedCategories: [],
		actorId: null,
		dateFrom: "",
		dateTo: "",
		searchQuery: ""
	};
}

// ── Entry Display ────────────────────────────────────────────────────────────

export type ActivityEntryDisplay = {
	id: string;
	summary: string;
	actorName: string;
	category: AuditCategory;
	categoryLabel: string;
	relativeTime: string;
	timestamp: string;
	isExpanded: boolean;
};

const CATEGORY_LABELS: Record<AuditCategory, string> = {
	settings_changes: "Settings",
	team_changes: "Team",
	location_changes: "Location",
	order_events: "Orders"
};

export function toEntryDisplay(
	entry: AuditLogEntry,
	expandedId: string | null,
	now: Date = new Date()
): ActivityEntryDisplay {
	return {
		id: entry.id,
		summary: entry.summary,
		actorName: entry.actorDisplayName,
		category: entry.category,
		categoryLabel: CATEGORY_LABELS[entry.category] ?? entry.category,
		relativeTime: formatRelativeTime(entry.timestamp, now),
		timestamp: entry.timestamp,
		isExpanded: entry.id === expandedId
	};
}

// ── Relative Time Formatting ─────────────────────────────────────────────────

export function formatRelativeTime(
	timestamp: string,
	now: Date = new Date()
): string {
	const then = new Date(timestamp);
	const diffMs = now.getTime() - then.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHr = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHr / 24);

	if (diffSec < 60) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHr < 24) return `${diffHr}h ago`;
	if (diffDay < 7) return `${diffDay}d ago`;
	return then.toLocaleDateString();
}

// ── Event Detail ─────────────────────────────────────────────────────────────

export type EventDetailField = {
	label: string;
	value: string;
};

export function buildEventDetails(entry: AuditLogEntry): EventDetailField[] {
	const fields: EventDetailField[] = [
		{ label: "Event ID", value: entry.id },
		{ label: "Event Type", value: entry.eventKind },
		{ label: "Actor", value: entry.actorDisplayName },
		{ label: "Timestamp", value: entry.timestamp }
	];

	if (entry.entityId) {
		fields.push({ label: "Entity ID", value: entry.entityId });
	}
	if (entry.entityType) {
		fields.push({ label: "Entity Type", value: entry.entityType });
	}

	// Add metadata entries
	for (const [key, value] of Object.entries(entry.metadata)) {
		if (value !== null && value !== undefined) {
			fields.push({
				label: key,
				value: typeof value === "string" ? value : JSON.stringify(value)
			});
		}
	}

	return fields;
}

// ── Category Badge ───────────────────────────────────────────────────────────

export type CategoryBadge = {
	label: string;
	variant: "info" | "success" | "warning" | "neutral";
};

export function getCategoryBadge(category: AuditCategory): CategoryBadge {
	const badges: Record<AuditCategory, CategoryBadge> = {
		settings_changes: { label: "Settings", variant: "info" },
		team_changes: { label: "Team", variant: "success" },
		location_changes: { label: "Location", variant: "warning" },
		order_events: { label: "Orders", variant: "neutral" }
	};
	return badges[category];
}

// ── Filter Helpers ───────────────────────────────────────────────────────────

export function hasActiveFilters(filters: ActivityLogFilters): boolean {
	return (
		filters.selectedCategories.length > 0 ||
		filters.actorId !== null ||
		filters.dateFrom !== "" ||
		filters.dateTo !== "" ||
		filters.searchQuery !== ""
	);
}

export function clearFilters(
	state: ActivityLogViewState
): ActivityLogViewState {
	return {
		...state,
		filters: createDefaultFilters(),
		entries: [],
		cursor: null,
		hasMore: false
	};
}

// ── Expand/Collapse ──────────────────────────────────────────────────────────

export function toggleEntryExpansion(
	state: ActivityLogViewState,
	entryId: string
): ActivityLogViewState {
	return {
		...state,
		expandedEntryId:
			state.expandedEntryId === entryId ? null : entryId
	};
}

// ── Load More ────────────────────────────────────────────────────────────────

export function appendEntries(
	state: ActivityLogViewState,
	newEntries: AuditLogEntry[],
	nextCursor: PaginationCursor | null,
	hasMore: boolean
): ActivityLogViewState {
	return {
		...state,
		entries: [...state.entries, ...newEntries],
		cursor: nextCursor,
		hasMore,
		isLoading: false
	};
}

// ── Access Check ─────────────────────────────────────────────────────────────

export function canViewActivityLog(role: TenantActorRole): boolean {
	return role === "owner" || role === "admin";
}
