// Platform Analytics page (PA-12) — KPI cards, tenant growth, top tenants,
// and GMV trend sections with loading / error states.

import { defineComponent, h, ref, computed, onMounted, type VNode } from "vue";
import { useSdk } from "../composables/use-sdk";
import type { TenantSummary } from "@platform/types";

// ── Constants ────────────────────────────────────────────────────────────────

const TOP_TENANTS_COUNT = 10;

// ── Types ────────────────────────────────────────────────────────────────────

interface MetricCardDef {
	key: string;
	label: string;
	value: string;
	subtitle?: string;
	placeholder?: boolean;
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderMetricCard(card: MetricCardDef): VNode {
	return h(
		"div",
		{
			class: ["metric-card", card.placeholder ? "metric-card--placeholder" : ""],
			"data-testid": `metric-card-${card.key}`,
		},
		[
			h("span", { class: "metric-card__label", "data-testid": `metric-label-${card.key}` }, card.label),
			h("span", { class: "metric-card__value", "data-testid": `metric-value-${card.key}` }, card.value),
			card.subtitle
				? h("span", { class: "metric-card__subtitle", "data-testid": `metric-subtitle-${card.key}` }, card.subtitle)
				: null,
		],
	);
}

function renderKpiSection(cards: MetricCardDef[]): VNode {
	return h(
		"div",
		{ class: "kpi-section", "data-testid": "kpi-section" },
		cards.map((c) => renderMetricCard(c)),
	);
}

function renderTenantGrowthSection(tenantCount: number): VNode {
	return h(
		"section",
		{ class: "analytics-section", "data-testid": "tenant-growth-section" },
		[
			h("h2", { class: "analytics-section__title" }, "Tenant Growth"),
			h("div", { class: "tenant-growth", "data-testid": "tenant-growth-content" }, [
				h("p", { "data-testid": "tenant-growth-current" }, `Current tenant count: ${tenantCount}`),
				h(
					"p",
					{ class: "placeholder-text", "data-testid": "tenant-growth-placeholder" },
					"Historical growth chart — data integration pending",
				),
			]),
		],
	);
}

function renderTopTenantsTable(tenants: TenantSummary[]): VNode {
	const headerRow = h("tr", {}, [
		h("th", { "data-testid": "table-header-name" }, "Name"),
		h("th", { "data-testid": "table-header-slug" }, "Slug"),
		h("th", { "data-testid": "table-header-status" }, "Status"),
		h("th", { "data-testid": "table-header-id" }, "ID"),
	]);

	const bodyRows = tenants.map((t, idx) =>
		h("tr", { key: t.id, class: "table__row", "data-testid": `tenant-row-${idx}` }, [
			h("td", { "data-testid": `tenant-name-${idx}` }, t.displayName),
			h("td", { "data-testid": `tenant-slug-${idx}` }, t.slug),
			h(
				"td",
				{},
				[
					h(
						"span",
						{
							class: `badge badge--${statusBadgeColor(t.status)}`,
							"data-testid": `tenant-status-${idx}`,
						},
						t.status,
					),
				],
			),
			h("td", { class: "table__id-cell", "data-testid": `tenant-id-${idx}` }, t.id),
		]),
	);

	return h(
		"section",
		{ class: "analytics-section", "data-testid": "top-tenants-section" },
		[
			h("h2", { class: "analytics-section__title" }, "Top Tenants"),
			tenants.length === 0
				? h("p", { class: "empty-text", "data-testid": "top-tenants-empty" }, "No tenants available.")
				: h("div", { class: "table-wrapper", "data-testid": "top-tenants-table-wrapper" }, [
						h("table", { class: "data-table", "data-testid": "top-tenants-table" }, [
							h("thead", {}, [headerRow]),
							h("tbody", {}, bodyRows),
						]),
					]),
		],
	);
}

function renderGmvTrendSection(): VNode {
	return h(
		"section",
		{ class: "analytics-section", "data-testid": "gmv-trend-section" },
		[
			h("h2", { class: "analytics-section__title" }, "GMV Trend"),
			h(
				"div",
				{ class: "placeholder-panel", "data-testid": "gmv-trend-placeholder" },
				[
					h("p", { class: "placeholder-text" }, "Data integration pending"),
					h(
						"p",
						{ class: "placeholder-subtext" },
						"GMV trend data will be available once the analytics pipeline is connected.",
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
			class: "analytics-page analytics-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[h("p", "Loading analytics…")],
	);
}

function renderErrorState(message: string, onRetry: () => void): VNode {
	return h(
		"div",
		{
			class: "analytics-page analytics-page--error",
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

function statusBadgeColor(status: string): string {
	switch (status) {
		case "active":
			return "green";
		case "draft":
			return "blue";
		case "suspended":
			return "yellow";
		case "archived":
			return "gray";
		default:
			return "default";
	}
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformAnalyticsPage = defineComponent({
	name: "PlatformAnalyticsPage",

	setup() {
		const sdk = useSdk();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const tenants = ref<TenantSummary[]>([]);
		const totalTenants = ref(0);

		async function fetchData(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const result = await sdk.tenants.list({ page: 1, pageSize: TOP_TENANTS_COUNT });
				tenants.value = result.data;
				totalTenants.value = result.total;
			} catch (err: unknown) {
				error.value =
					err instanceof Error ? err.message : "Failed to load analytics data.";
			} finally {
				loading.value = false;
			}
		}

		onMounted(() => {
			void fetchData();
		});

		// ── KPI cards derived from loaded state ──────────────────────────

		const kpiCards = computed<MetricCardDef[]>(() => [
			{
				key: "total-revenue",
				label: "Total Revenue",
				value: "—",
				subtitle: "Data integration pending",
				placeholder: true,
			},
			{
				key: "tenant-count",
				label: "Tenant Count",
				value: String(totalTenants.value),
			},
			{
				key: "churn-rate",
				label: "Churn Rate",
				value: "—",
				subtitle: "Data integration pending",
				placeholder: true,
			},
			{
				key: "average-gmv",
				label: "Average GMV",
				value: "—",
				subtitle: "Data integration pending",
				placeholder: true,
			},
		]);

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			if (loading.value && tenants.value.length === 0) {
				return renderLoadingState();
			}

			if (error.value && tenants.value.length === 0) {
				return renderErrorState(error.value, () => void fetchData());
			}

			return h(
				"section",
				{ class: "analytics-page", "data-testid": "platform-analytics-page" },
				[
					h("header", { class: "analytics-page__header" }, [
						h("h1", { class: "analytics-page__title", "data-testid": "page-title" }, "Platform Analytics"),
					]),

					renderKpiSection(kpiCards.value),
					renderTenantGrowthSection(totalTenants.value),
					renderTopTenantsTable(tenants.value),
					renderGmvTrendSection(),
				],
			);
		};
	},
});
