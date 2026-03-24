// Platform Tenants list page (PA-02) — filterable, searchable tenant grid with
// status tabs, pagination, and navigation to detail / provisioning views.

import { defineComponent, h, ref, computed, onMounted, watch, type VNode } from "vue";
import { useRouter } from "vue-router";
import { useSdk } from "../composables/use-sdk";
import type { TenantSummary } from "@platform/types";

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

const STATUS_TABS = [
	{ key: "all", label: "All" },
	{ key: "active", label: "Active" },
	{ key: "draft", label: "Trial" },
	{ key: "suspended", label: "Suspended" },
	{ key: "archived", label: "Archived" },
] as const;

type StatusTabKey = (typeof STATUS_TABS)[number]["key"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
	switch (status) {
		case "active":
			return "badge--green";
		case "draft":
			return "badge--blue";
		case "suspended":
			return "badge--yellow";
		case "archived":
			return "badge--gray";
		default:
			return "badge--default";
	}
}

function statusLabel(status: string): string {
	switch (status) {
		case "draft":
			return "Trial";
		default:
			return status.charAt(0).toUpperCase() + status.slice(1);
	}
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderStatusTabs(
	activeTab: StatusTabKey,
	onSelect: (tab: StatusTabKey) => void,
): VNode {
	return h(
		"nav",
		{ class: "status-tabs", role: "tablist", "data-testid": "status-tabs" },
		STATUS_TABS.map((tab) =>
			h(
				"button",
				{
					class: [
						"status-tabs__tab",
						activeTab === tab.key ? "status-tabs__tab--active" : "",
					],
					type: "button",
					role: "tab",
					"aria-selected": activeTab === tab.key,
					"data-testid": `status-tab-${tab.key}`,
					onClick: () => onSelect(tab.key),
				},
				tab.label,
			),
		),
	);
}

function renderSearchInput(
	value: string,
	onInput: (value: string) => void,
): VNode {
	return h("div", { class: "search-bar", "data-testid": "search-bar" }, [
		h("input", {
			class: "search-bar__input",
			type: "search",
			placeholder: "Search tenants by name…",
			value,
			"data-testid": "search-input",
			onInput: (e: Event) => onInput((e.target as HTMLInputElement).value),
		}),
	]);
}

function renderTenantCard(
	tenant: TenantSummary,
	onClick: () => void,
): VNode {
	return h(
		"article",
		{
			class: "tenant-card",
			tabindex: 0,
			role: "button",
			"data-testid": "tenant-card",
			onClick,
			onKeydown: (e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			},
		},
		[
			h("div", { class: "tenant-card__header" }, [
				h(
					"h3",
					{ class: "tenant-card__name", "data-testid": "tenant-card-name" },
					tenant.displayName,
				),
				h(
					"span",
					{
						class: `badge ${statusBadgeClass(tenant.status)}`,
						"data-testid": "tenant-card-status",
					},
					statusLabel(tenant.status),
				),
			]),
			h("div", { class: "tenant-card__body" }, [
				h("p", { class: "tenant-card__slug", "data-testid": "tenant-card-slug" }, tenant.slug),
				h(
					"p",
					{ class: "tenant-card__id", "data-testid": "tenant-card-id" },
					`ID: ${tenant.id}`,
				),
			]),
		],
	);
}

function renderCardGrid(
	tenants: TenantSummary[],
	onCardClick: (id: string) => void,
): VNode {
	return h(
		"div",
		{ class: "tenant-grid", "data-testid": "tenant-grid" },
		tenants.map((t) =>
			renderTenantCard(t, () => onCardClick(t.id)),
		),
	);
}

function renderPagination(
	currentPage: number,
	totalPages: number,
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
			`Page ${currentPage} of ${totalPages}`,
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

function renderEmptyState(): VNode {
	return h(
		"div",
		{ class: "empty-state", "data-testid": "empty-state" },
		[
			h("p", { class: "empty-state__text" }, "No tenants found matching your criteria."),
		],
	);
}

function renderLoadingState(): VNode {
	return h(
		"div",
		{
			class: "tenants-page tenants-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[h("p", "Loading tenants…")],
	);
}

function renderErrorState(message: string, onRetry: () => void): VNode {
	return h(
		"div",
		{
			class: "tenants-page tenants-page--error",
			role: "alert",
			"data-testid": "error-state",
		},
		[
			h("p", { class: "error" }, message),
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

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformTenantsPage = defineComponent({
	name: "PlatformTenantsPage",

	setup() {
		const sdk = useSdk();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const tenants = ref<TenantSummary[]>([]);
		const total = ref(0);
		const currentPage = ref(1);
		const activeTab = ref<StatusTabKey>("all");
		const searchQuery = ref("");

		const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

		async function fetchTenants(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const params: Record<string, unknown> = {
					page: currentPage.value,
					pageSize: PAGE_SIZE,
				};

				if (activeTab.value !== "all") {
					params.status = activeTab.value;
				}

				if (searchQuery.value.trim()) {
					params.search = searchQuery.value.trim();
				}

				const result = await sdk.tenants.list(params);
				tenants.value = result.data;
				total.value = result.total;
			} catch (err: unknown) {
				error.value =
					err instanceof Error
						? err.message
						: "Failed to load tenants.";
			} finally {
				loading.value = false;
			}
		}

		function handleTabChange(tab: StatusTabKey): void {
			activeTab.value = tab;
			currentPage.value = 1;
		}

		function handleSearch(value: string): void {
			searchQuery.value = value;
			currentPage.value = 1;
		}

		function handlePageChange(page: number): void {
			currentPage.value = page;
		}

		function navigateToDetail(tenantId: string): void {
			void router.push(`/tenants/${tenantId}`);
		}

		function navigateToNew(): void {
			void router.push("/tenants/new");
		}

		watch([activeTab, searchQuery, currentPage], () => {
			void fetchTenants();
		});

		onMounted(() => {
			void fetchTenants();
		});

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			if (loading.value && tenants.value.length === 0) {
				return renderLoadingState();
			}

			if (error.value && tenants.value.length === 0) {
				return renderErrorState(error.value, () => void fetchTenants());
			}

			return h(
				"section",
				{ class: "tenants-page", "data-testid": "platform-tenants-page" },
				[
					h("header", { class: "tenants-page__header" }, [
						h("h1", { class: "tenants-page__title" }, "Tenants"),
						h(
							"button",
							{
								class: "btn btn--primary",
								type: "button",
								"data-testid": "new-tenant-button",
								onClick: navigateToNew,
							},
							"+ New Tenant",
						),
					]),

					h("div", { class: "tenants-page__toolbar" }, [
						renderStatusTabs(activeTab.value, handleTabChange),
						renderSearchInput(searchQuery.value, handleSearch),
					]),

					error.value
						? h(
								"div",
								{ class: "alert alert--error", role: "alert", "data-testid": "inline-error" },
								error.value,
							)
						: null,

					tenants.value.length === 0
						? renderEmptyState()
						: renderCardGrid(tenants.value, navigateToDetail),

					totalPages.value > 1
						? renderPagination(currentPage.value, totalPages.value, handlePageChange)
						: null,
				],
			);
		};
	},
});
