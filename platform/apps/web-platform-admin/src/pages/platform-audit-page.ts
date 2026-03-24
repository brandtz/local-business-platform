// Platform Audit Trail page (PA-13) — security event log with filtering,
// pagination, expandable detail panel, and error tracking placeholder.

import { defineComponent, h, ref, computed, onMounted, watch, type VNode } from "vue";
import { useSdk } from "../composables/use-sdk";
import type { SecurityEventRecord } from "@platform/types";
import type { AuditListParams } from "@platform/sdk/src/domains/audit";

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ACTION_OPTIONS = [
	{ value: "", label: "All Actions" },
	{ value: "auth.login_succeeded", label: "Login Succeeded" },
	{ value: "auth.login_failed", label: "Login Failed" },
	{ value: "auth.impersonation_started", label: "Impersonation Started" },
	{ value: "auth.impersonation_revoked", label: "Impersonation Revoked" },
	{ value: "auth.mfa_challenge_issued", label: "MFA Challenge Issued" },
	{ value: "auth.mfa_challenge_verified", label: "MFA Challenge Verified" },
	{ value: "auth.mfa_challenge_failed", label: "MFA Challenge Failed" },
	{ value: "auth.password_reset_requested", label: "Password Reset Requested" },
	{ value: "auth.password_reset_completed", label: "Password Reset Completed" },
	{ value: "auth.password_reset_failed", label: "Password Reset Failed" },
] as const;

const SEVERITY_OPTIONS = [
	{ value: "", label: "All Severities" },
	{ value: "info", label: "Info" },
	{ value: "warning", label: "Warning" },
	{ value: "critical", label: "Critical" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function severityBadgeClass(severity: string): string {
	switch (severity) {
		case "critical":
			return "badge--red";
		case "warning":
			return "badge--yellow";
		case "info":
			return "badge--blue";
		default:
			return "badge--default";
	}
}

function formatTimestamp(iso: string): string {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

function formatAction(kind: string): string {
	return kind
		.replace(/^auth\./, "")
		.replace(/_/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderFilterBar(
	filters: {
		startDate: string;
		endDate: string;
		actorId: string;
		action: string;
		severity: string;
	},
	handlers: {
		onStartDate: (v: string) => void;
		onEndDate: (v: string) => void;
		onActorId: (v: string) => void;
		onAction: (v: string) => void;
		onSeverity: (v: string) => void;
		onApply: () => void;
		onClear: () => void;
	},
): VNode {
	return h("div", { class: "filter-bar", "data-testid": "filter-bar" }, [
		h("div", { class: "filter-bar__group" }, [
			h("label", { class: "filter-bar__label", for: "filter-start-date" }, "Start Date"),
			h("input", {
				id: "filter-start-date",
				class: "filter-bar__input",
				type: "date",
				value: filters.startDate,
				"data-testid": "filter-start-date",
				onInput: (e: Event) => handlers.onStartDate((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "filter-bar__group" }, [
			h("label", { class: "filter-bar__label", for: "filter-end-date" }, "End Date"),
			h("input", {
				id: "filter-end-date",
				class: "filter-bar__input",
				type: "date",
				value: filters.endDate,
				"data-testid": "filter-end-date",
				onInput: (e: Event) => handlers.onEndDate((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "filter-bar__group" }, [
			h("label", { class: "filter-bar__label", for: "filter-actor-id" }, "Actor ID"),
			h("input", {
				id: "filter-actor-id",
				class: "filter-bar__input",
				type: "text",
				placeholder: "Search by actor ID…",
				value: filters.actorId,
				"data-testid": "filter-actor-id",
				onInput: (e: Event) => handlers.onActorId((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "filter-bar__group" }, [
			h("label", { class: "filter-bar__label", for: "filter-action" }, "Action"),
			h(
				"select",
				{
					id: "filter-action",
					class: "filter-bar__select",
					value: filters.action,
					"data-testid": "filter-action",
					onChange: (e: Event) => handlers.onAction((e.target as HTMLSelectElement).value),
				},
				ACTION_OPTIONS.map((opt) =>
					h("option", { value: opt.value, key: opt.value }, opt.label),
				),
			),
		]),
		h("div", { class: "filter-bar__group" }, [
			h("label", { class: "filter-bar__label", for: "filter-severity" }, "Severity"),
			h(
				"select",
				{
					id: "filter-severity",
					class: "filter-bar__select",
					value: filters.severity,
					"data-testid": "filter-severity",
					onChange: (e: Event) => handlers.onSeverity((e.target as HTMLSelectElement).value),
				},
				SEVERITY_OPTIONS.map((opt) =>
					h("option", { value: opt.value, key: opt.value }, opt.label),
				),
			),
		]),
		h("div", { class: "filter-bar__actions" }, [
			h(
				"button",
				{
					class: "btn btn--primary",
					type: "button",
					"data-testid": "filter-apply-button",
					onClick: handlers.onApply,
				},
				"Apply",
			),
			h(
				"button",
				{
					class: "btn btn--secondary",
					type: "button",
					"data-testid": "filter-clear-button",
					onClick: handlers.onClear,
				},
				"Clear",
			),
		]),
	]);
}

function renderEventRow(
	event: SecurityEventRecord,
	index: number,
	isExpanded: boolean,
	onToggle: () => void,
): VNode[] {
	const actorDisplay = event.userId ?? event.tenantId ?? "—";

	const row = h(
		"tr",
		{
			key: event.id,
			class: ["table__row", isExpanded ? "table__row--expanded" : ""],
			tabindex: 0,
			role: "button",
			"aria-expanded": isExpanded,
			"data-testid": `event-row-${index}`,
			onClick: onToggle,
			onKeydown: (e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onToggle();
				}
			},
		},
		[
			h("td", { "data-testid": `event-timestamp-${index}` }, formatTimestamp(event.occurredAt)),
			h("td", { "data-testid": `event-actor-${index}` }, actorDisplay),
			h("td", { "data-testid": `event-action-${index}` }, formatAction(event.kind)),
			h("td", {}, [
				h(
					"span",
					{
						class: `badge ${severityBadgeClass(event.severity)}`,
						"data-testid": `event-severity-${index}`,
					},
					event.severity,
				),
			]),
		],
	);

	const nodes: VNode[] = [row];

	if (isExpanded) {
		const detailRow = h(
			"tr",
			{ key: `${event.id}-detail`, class: "table__detail-row", "data-testid": `event-detail-${index}` },
			[
				h("td", { colspan: 4 }, [
					h("div", { class: "event-detail", "data-testid": `event-detail-panel-${index}` }, [
						h("dl", { class: "event-detail__list" }, [
							h("dt", {}, "Event ID"),
							h("dd", { "data-testid": `detail-id-${index}` }, event.id),
							h("dt", {}, "Kind"),
							h("dd", { "data-testid": `detail-kind-${index}` }, event.kind),
							h("dt", {}, "Severity"),
							h("dd", { "data-testid": `detail-severity-${index}` }, event.severity),
							h("dt", {}, "Actor Type"),
							h("dd", { "data-testid": `detail-actor-type-${index}` }, event.actorType ?? "—"),
							h("dt", {}, "User ID"),
							h("dd", { "data-testid": `detail-user-id-${index}` }, event.userId ?? "—"),
							h("dt", {}, "Tenant ID"),
							h("dd", { "data-testid": `detail-tenant-id-${index}` }, event.tenantId ?? "—"),
							h("dt", {}, "Occurred At"),
							h("dd", { "data-testid": `detail-occurred-at-${index}` }, formatTimestamp(event.occurredAt)),
							h("dt", {}, "Context"),
							h(
								"dd",
								{ "data-testid": `detail-context-${index}` },
								h("pre", { class: "event-detail__json" }, JSON.stringify(event.context, null, 2)),
							),
						]),
					]),
				]),
			],
		);
		nodes.push(detailRow);
	}

	return nodes;
}

function renderEventTable(
	events: SecurityEventRecord[],
	expandedId: string | null,
	onToggle: (id: string) => void,
): VNode {
	const headerRow = h("tr", {}, [
		h("th", { "data-testid": "table-header-timestamp" }, "Timestamp"),
		h("th", { "data-testid": "table-header-actor" }, "Actor"),
		h("th", { "data-testid": "table-header-action" }, "Action"),
		h("th", { "data-testid": "table-header-severity" }, "Severity"),
	]);

	const bodyRows = events.flatMap((evt, idx) =>
		renderEventRow(evt, idx, expandedId === evt.id, () => onToggle(evt.id)),
	);

	return h("div", { class: "table-wrapper", "data-testid": "event-table-wrapper" }, [
		h("table", { class: "data-table", "data-testid": "event-table" }, [
			h("thead", {}, [headerRow]),
			h("tbody", {}, bodyRows),
		]),
	]);
}

function renderPagination(
	currentPage: number,
	totalPages: number,
	total: number,
	onPageChange: (page: number) => void,
): VNode {
	return h("nav", { class: "pagination", "data-testid": "pagination", "aria-label": "Pagination" }, [
		h(
			"button",
			{
				class: "pagination__btn",
				type: "button",
				disabled: currentPage <= 1,
				"data-testid": "pagination-prev",
				onClick: () => onPageChange(currentPage - 1),
			},
			"← Previous",
		),
		h(
			"span",
			{ class: "pagination__info", "data-testid": "pagination-info" },
			`Page ${currentPage} of ${totalPages} (${total} events)`,
		),
		h(
			"button",
			{
				class: "pagination__btn",
				type: "button",
				disabled: currentPage >= totalPages,
				"data-testid": "pagination-next",
				onClick: () => onPageChange(currentPage + 1),
			},
			"Next →",
		),
	]);
}

function renderErrorTrackingSection(): VNode {
	return h(
		"section",
		{ class: "audit-section", "data-testid": "error-tracking-section" },
		[
			h("h2", { class: "audit-section__title" }, "Error Tracking"),
			h(
				"div",
				{ class: "placeholder-panel", "data-testid": "error-tracking-placeholder" },
				[
					h("p", { class: "placeholder-text" }, "Error tracking integration pending"),
					h(
						"p",
						{ class: "placeholder-subtext" },
						"Error aggregation and alerting will be available once the monitoring pipeline is connected.",
					),
				],
			),
		],
	);
}

function renderLoadingState(): VNode {
	return h(
		"div",
		{
			class: "audit-page audit-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[h("p", "Loading audit events…")],
	);
}

function renderErrorState(message: string, onRetry: () => void): VNode {
	return h(
		"div",
		{
			class: "audit-page audit-page--error",
			role: "alert",
			"data-testid": "error-state",
		},
		[
			h("p", { class: "error", "data-testid": "error-message" }, message),
			h(
				"button",
				{
					class: "btn btn--secondary",
					type: "button",
					"data-testid": "retry-button",
					onClick: onRetry,
				},
				"Retry",
			),
		],
	);
}

function renderEmptyState(): VNode {
	return h(
		"div",
		{ class: "empty-state", "data-testid": "empty-state" },
		[h("p", { class: "empty-state__text" }, "No audit events found matching your criteria.")],
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformAuditPage = defineComponent({
	name: "PlatformAuditPage",

	setup() {
		const sdk = useSdk();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const events = ref<SecurityEventRecord[]>([]);
		const total = ref(0);
		const currentPage = ref(1);
		const hasMore = ref(false);
		const expandedEventId = ref<string | null>(null);

		// Filter state
		const filterStartDate = ref("");
		const filterEndDate = ref("");
		const filterActorId = ref("");
		const filterAction = ref("");
		const filterSeverity = ref("");

		const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

		function buildParams(): AuditListParams {
			const params: AuditListParams = {
				page: currentPage.value,
				pageSize: PAGE_SIZE,
			};
			if (filterActorId.value.trim()) params.actorId = filterActorId.value.trim();
			if (filterAction.value) params.action = filterAction.value;
			if (filterStartDate.value) params.startDate = filterStartDate.value;
			if (filterEndDate.value) params.endDate = filterEndDate.value;
			return params;
		}

		async function fetchEvents(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const result = await sdk.audit.list(buildParams());
				events.value = result.data;
				total.value = result.total;
				hasMore.value = result.hasMore;
			} catch (err: unknown) {
				error.value =
					err instanceof Error ? err.message : "Failed to load audit events.";
			} finally {
				loading.value = false;
			}
		}

		function handleApplyFilters(): void {
			currentPage.value = 1;
			void fetchEvents();
		}

		function handleClearFilters(): void {
			filterStartDate.value = "";
			filterEndDate.value = "";
			filterActorId.value = "";
			filterAction.value = "";
			filterSeverity.value = "";
			currentPage.value = 1;
			void fetchEvents();
		}

		function handlePageChange(page: number): void {
			currentPage.value = page;
			void fetchEvents();
		}

		function toggleExpandedRow(id: string): void {
			expandedEventId.value = expandedEventId.value === id ? null : id;
		}

		// Client-side severity filter (API may not support severity param)
		const filteredEvents = computed(() => {
			if (!filterSeverity.value) return events.value;
			return events.value.filter((evt) => evt.severity === filterSeverity.value);
		});

		onMounted(() => {
			void fetchEvents();
		});

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			if (loading.value && events.value.length === 0) {
				return renderLoadingState();
			}

			if (error.value && events.value.length === 0) {
				return renderErrorState(error.value, () => void fetchEvents());
			}

			return h(
				"section",
				{ class: "audit-page", "data-testid": "platform-audit-page" },
				[
					h("header", { class: "audit-page__header" }, [
						h("h1", { class: "audit-page__title", "data-testid": "page-title" }, "Audit Trail"),
					]),

					renderFilterBar(
						{
							startDate: filterStartDate.value,
							endDate: filterEndDate.value,
							actorId: filterActorId.value,
							action: filterAction.value,
							severity: filterSeverity.value,
						},
						{
							onStartDate: (v) => { filterStartDate.value = v; },
							onEndDate: (v) => { filterEndDate.value = v; },
							onActorId: (v) => { filterActorId.value = v; },
							onAction: (v) => { filterAction.value = v; },
							onSeverity: (v) => { filterSeverity.value = v; },
							onApply: handleApplyFilters,
							onClear: handleClearFilters,
						},
					),

					error.value
						? h(
								"div",
								{ class: "alert alert--error", role: "alert", "data-testid": "inline-error" },
								error.value,
							)
						: null,

					loading.value
						? h("div", { class: "loading-overlay", "data-testid": "loading-overlay" }, [
								h("p", "Refreshing…"),
							])
						: null,

					filteredEvents.value.length === 0 && !loading.value
						? renderEmptyState()
						: renderEventTable(
								filteredEvents.value,
								expandedEventId.value,
								toggleExpandedRow,
							),

					totalPages.value > 1
						? renderPagination(
								currentPage.value,
								totalPages.value,
								total.value,
								handlePageChange,
							)
						: null,

					renderErrorTrackingSection(),
				],
			);
		};
	},
});
