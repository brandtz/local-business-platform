// E13-S5-T6: Activity and Audit Log page — filter bar, activity table
// with pagination, expandable event details.

import { defineComponent, h, onMounted, ref } from "vue";

import { useSdk } from "../composables/use-sdk";
import type { SecurityEventRecord } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type ActivityLogState = {
	entries: SecurityEventRecord[];
	isLoading: boolean;
	hasMore: boolean;
	currentPage: number;
	expandedId: string | null;
	filters: {
		dateFrom: string;
		dateTo: string;
		searchQuery: string;
	};
};

type EntryDisplay = {
	id: string;
	kind: string;
	severity: string;
	actorType: string;
	timestamp: string;
	relativeTime: string;
	isExpanded: boolean;
	context: Record<string, string | null>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toRelativeTime(isoDate: string): string {
	const diffMs = Date.now() - new Date(isoDate).getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHrs = Math.floor(diffMin / 60);
	if (diffHrs < 24) return `${diffHrs}h ago`;
	const diffDays = Math.floor(diffHrs / 24);
	return `${diffDays}d ago`;
}

function toEntryDisplay(entry: SecurityEventRecord, expandedId: string | null): EntryDisplay {
	return {
		id: entry.id,
		kind: entry.kind,
		severity: entry.severity,
		actorType: entry.actorType ?? "system",
		timestamp: entry.occurredAt,
		relativeTime: toRelativeTime(entry.occurredAt),
		isExpanded: entry.id === expandedId,
		context: entry.context,
	};
}

function getSeverityBadgeClass(severity: string): string {
	switch (severity) {
		case "critical": return "status-badge--error";
		case "warning": return "status-badge--warning";
		default: return "status-badge--info";
	}
}

function hasActiveFilters(filters: ActivityLogState["filters"]): boolean {
	return !!(filters.dateFrom || filters.dateTo || filters.searchQuery);
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderFilterBar(
	filters: ActivityLogState["filters"],
	onFilterChange: (partial: Partial<ActivityLogState["filters"]>) => void,
	onClear: () => void,
	isActive: boolean,
) {
	return h("div", { class: "filter-bar", "data-testid": "activity-filters" }, [
		h("div", { class: "filter-bar__fields" }, [
			h("div", { class: "form-field form-field--inline" }, [
				h("label", { class: "form-field__label", for: "filter-date-from" }, "From"),
				h("input", {
					class: "form-field__input",
					id: "filter-date-from",
					type: "date",
					value: filters.dateFrom,
					onInput: (e: Event) =>
						onFilterChange({ dateFrom: (e.target as HTMLInputElement).value }),
				}),
			]),
			h("div", { class: "form-field form-field--inline" }, [
				h("label", { class: "form-field__label", for: "filter-date-to" }, "To"),
				h("input", {
					class: "form-field__input",
					id: "filter-date-to",
					type: "date",
					value: filters.dateTo,
					onInput: (e: Event) =>
						onFilterChange({ dateTo: (e.target as HTMLInputElement).value }),
				}),
			]),
			h("div", { class: "form-field form-field--inline" }, [
				h("label", { class: "form-field__label", for: "filter-search" }, "Search"),
				h("input", {
					class: "form-field__input",
					id: "filter-search",
					type: "text",
					placeholder: "Search events...",
					value: filters.searchQuery,
					onInput: (e: Event) =>
						onFilterChange({ searchQuery: (e.target as HTMLInputElement).value }),
				}),
			]),
		]),
		isActive
			? h("button", {
					class: "btn btn--secondary btn--sm",
					type: "button",
					onClick: onClear,
					"data-testid": "clear-filters",
				}, "Clear Filters")
			: null,
	]);
}

function renderActivityTable(
	entries: EntryDisplay[],
	onToggle: (id: string) => void,
) {
	if (entries.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "activity-empty" }, [
			h("p", "No activity events found"),
		]);
	}

	return h("table", { class: "data-table", "data-testid": "activity-table" }, [
		h("thead", [
			h("tr", [
				h("th", "Time"),
				h("th", "Actor"),
				h("th", "Event"),
				h("th", "Severity"),
				h("th", "Details"),
			]),
		]),
		h("tbody",
			entries.flatMap((entry) => {
				const rows = [
					h("tr", {
						key: entry.id,
						class: `activity-row${entry.isExpanded ? " activity-row--expanded" : ""}`,
						onClick: () => onToggle(entry.id),
						"data-testid": `activity-row-${entry.id}`,
					}, [
						h("td", [h("time", { class: "activity-row__time" }, entry.relativeTime)]),
						h("td", entry.actorType),
						h("td", entry.kind),
						h("td", [
							h("span", {
								class: `status-badge ${getSeverityBadgeClass(entry.severity)}`,
							}, entry.severity),
						]),
						h("td", [
							h("button", {
								class: "btn btn--ghost btn--sm",
								type: "button",
								"aria-expanded": entry.isExpanded ? "true" : "false",
							}, entry.isExpanded ? "Hide" : "View"),
						]),
					]),
				];

				if (entry.isExpanded) {
					const contextEntries = Object.entries(entry.context);
					rows.push(
						h("tr", { key: `${entry.id}-details`, class: "activity-row__detail" }, [
							h("td", { colspan: 5 }, [
								h("div", { class: "activity-detail", "data-testid": `activity-detail-${entry.id}` }, [
									h("dl", { class: "activity-detail__list" }, [
										h("dt", "Event ID"),
										h("dd", entry.id),
										h("dt", "Timestamp"),
										h("dd", entry.timestamp),
										...contextEntries.flatMap(([key, val]) => [
											h("dt", key),
											h("dd", val ?? "—"),
										]),
									]),
								]),
							]),
						]),
					);
				}

				return rows;
			}),
		),
	]);
}

function renderPagination(
	hasMore: boolean,
	isLoading: boolean,
	onLoadMore: () => void,
) {
	if (!hasMore) return null;

	return h("div", { class: "pagination", "data-testid": "activity-pagination" }, [
		h("button", {
			class: "btn btn--secondary",
			type: "button",
			disabled: isLoading,
			onClick: onLoadMore,
		}, isLoading ? "Loading..." : "Load More"),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const ActivityLogPage = defineComponent({
	name: "ActivityLogPage",
	setup() {
		const state = ref<ActivityLogState>({
			entries: [],
			isLoading: true,
			hasMore: false,
			currentPage: 1,
			expandedId: null,
			filters: {
				dateFrom: "",
				dateTo: "",
				searchQuery: "",
			},
		});

		const displayEntries = ref<EntryDisplay[]>([]);

		async function loadEntries(page: number = 1) {
			state.value = { ...state.value, isLoading: true };
			try {
				const sdk = useSdk();
				const result = await sdk.audit.list({
					page,
					pageSize: 20,
					startDate: state.value.filters.dateFrom || undefined,
					endDate: state.value.filters.dateTo || undefined,
				});

				const entries = page === 1
					? result.data
					: [...state.value.entries, ...result.data];

				state.value = {
					...state.value,
					entries,
					isLoading: false,
					hasMore: result.hasMore,
					currentPage: page,
				};
				displayEntries.value = entries.map((e) => toEntryDisplay(e, state.value.expandedId));
			} catch {
				state.value = { ...state.value, isLoading: false };
			}
		}

		onMounted(() => {
			loadEntries();
		});

		function loadMore() {
			loadEntries(state.value.currentPage + 1);
		}

		function handleFilterChange(partial: Partial<ActivityLogState["filters"]>) {
			state.value = {
				...state.value,
				filters: { ...state.value.filters, ...partial },
				entries: [],
				currentPage: 1,
			};
			loadEntries(1);
		}

		function handleClearFilters() {
			state.value = {
				...state.value,
				filters: { dateFrom: "", dateTo: "", searchQuery: "" },
				entries: [],
				currentPage: 1,
			};
			loadEntries(1);
		}

		function handleToggle(id: string) {
			const expandedId = state.value.expandedId === id ? null : id;
			state.value = { ...state.value, expandedId };
			displayEntries.value = state.value.entries.map((e) => toEntryDisplay(e, expandedId));
		}

		return () => {
			const s = state.value;

			if (s.isLoading && s.entries.length === 0) {
				return h("div", { class: "settings-page settings-page--loading", role: "status", "data-testid": "activity-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading activity log..."),
				]);
			}

			return h("div", { class: "settings-page", "data-testid": "activity-log-page" }, [
				h("h2", { class: "settings-page__title" }, "Activity Log"),
				renderFilterBar(
					s.filters,
					handleFilterChange,
					handleClearFilters,
					hasActiveFilters(s.filters),
				),
				renderActivityTable(displayEntries.value, handleToggle),
				renderPagination(s.hasMore, s.isLoading, loadMore),
			]);
		};
	},
});
