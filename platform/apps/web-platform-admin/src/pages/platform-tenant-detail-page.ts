// Platform Tenant Detail page (PA-03) — single-tenant view with overview,
// configuration placeholders, usage metrics, and administrative actions.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSdk } from "../composables/use-sdk";
import type { TenantSummary } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type ImpersonationResult = {
	token: string;
	tenantId: string;
	expiresAt: string;
};

type ActionState = {
	inProgress: string | null;
	error: string | null;
	success: string | null;
};

// ── Constants ────────────────────────────────────────────────────────────────

const PLACEHOLDER_MODULES = ["catalog", "ordering", "bookings", "content"] as const;

const PLAN_CHANGE_PLACEHOLDER_DELAY_MS = 500;

const PLACEHOLDER_METRICS = [
	{ label: "Monthly Active Users", value: "—" },
	{ label: "API Calls (30d)", value: "—" },
	{ label: "Storage Used", value: "—" },
	{ label: "Bandwidth (30d)", value: "—" },
] as const;

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

function renderOverviewSection(tenant: TenantSummary): VNode {
	return h("section", { class: "detail-section", "data-testid": "overview-section" }, [
		h("h2", { class: "detail-section__title" }, "Overview"),
		h("dl", { class: "detail-grid" }, [
			h("dt", "Name"),
			h("dd", { "data-testid": "overview-name" }, tenant.displayName),
			h("dt", "Status"),
			h("dd", { "data-testid": "overview-status" }, [
				h(
					"span",
					{ class: `badge ${statusBadgeClass(tenant.status)}` },
					statusLabel(tenant.status),
				),
			]),
			h("dt", "Slug"),
			h("dd", { "data-testid": "overview-slug" }, tenant.slug),
			h("dt", "ID"),
			h("dd", { "data-testid": "overview-id" }, tenant.id),
		]),
	]);
}

function renderConfigurationSection(): VNode {
	return h("section", { class: "detail-section", "data-testid": "configuration-section" }, [
		h("h2", { class: "detail-section__title" }, "Configuration"),
		h(
			"div",
			{ class: "config-toggles" },
			PLACEHOLDER_MODULES.map((mod) =>
				h("label", { class: "config-toggle", key: mod, "data-testid": `config-toggle-${mod}` }, [
					h("input", {
						type: "checkbox",
						checked: true,
						disabled: true,
						"data-testid": `config-checkbox-${mod}`,
					}),
					h("span", { class: "config-toggle__label" }, mod.charAt(0).toUpperCase() + mod.slice(1)),
				]),
			),
		),
		h(
			"p",
			{ class: "detail-section__placeholder" },
			"Module configuration management coming soon.",
		),
	]);
}

function renderUsageMetricsSection(): VNode {
	return h("section", { class: "detail-section", "data-testid": "usage-section" }, [
		h("h2", { class: "detail-section__title" }, "Usage Metrics"),
		h(
			"div",
			{ class: "metrics-grid" },
			PLACEHOLDER_METRICS.map((m) =>
				h("div", { class: "metric-card", key: m.label, "data-testid": "usage-metric" }, [
					h("span", { class: "metric-card__value" }, m.value),
					h("span", { class: "metric-card__label" }, m.label),
				]),
			),
		),
		h(
			"p",
			{ class: "detail-section__placeholder" },
			"Real-time usage metrics coming soon.",
		),
	]);
}

function renderActionsSection(
	tenant: TenantSummary,
	actionState: ActionState,
	handlers: {
		onImpersonate: () => void;
		onSuspend: () => void;
		onArchive: () => void;
		onChangePlan: () => void;
	},
): VNode {
	const { inProgress } = actionState;

	return h("section", { class: "detail-section", "data-testid": "actions-section" }, [
		h("h2", { class: "detail-section__title" }, "Actions"),

		actionState.error
			? h(
					"div",
					{ class: "alert alert--error", role: "alert", "data-testid": "action-error" },
					actionState.error,
				)
			: null,

		actionState.success
			? h(
					"div",
					{ class: "alert alert--success", role: "status", "data-testid": "action-success" },
					actionState.success,
				)
			: null,

		h("div", { class: "actions-bar" }, [
			h(
				"button",
				{
					class: "btn btn--primary",
					type: "button",
					disabled: !!inProgress,
					"data-testid": "action-impersonate",
					onClick: handlers.onImpersonate,
				},
				inProgress === "impersonate" ? "Opening…" : "Impersonate Admin",
			),
			h(
				"button",
				{
					class: "btn btn--warning",
					type: "button",
					disabled: !!inProgress || tenant.status === "suspended",
					"data-testid": "action-suspend",
					onClick: handlers.onSuspend,
				},
				inProgress === "suspend" ? "Suspending…" : "Suspend",
			),
			h(
				"button",
				{
					class: "btn btn--danger",
					type: "button",
					disabled: !!inProgress || tenant.status === "archived",
					"data-testid": "action-archive",
					onClick: handlers.onArchive,
				},
				inProgress === "archive" ? "Archiving…" : "Archive",
			),
			h(
				"button",
				{
					class: "btn btn--secondary",
					type: "button",
					disabled: !!inProgress,
					"data-testid": "action-change-plan",
					onClick: handlers.onChangePlan,
				},
				inProgress === "change-plan" ? "Updating…" : "Change Plan",
			),
		]),
	]);
}

function renderLoadingState(): VNode {
	return h(
		"div",
		{
			class: "tenant-detail tenant-detail--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[h("p", "Loading tenant details…")],
	);
}

function renderErrorState(message: string, onRetry: () => void): VNode {
	return h(
		"div",
		{
			class: "tenant-detail tenant-detail--error",
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

function renderNotFoundState(): VNode {
	return h(
		"div",
		{
			class: "tenant-detail tenant-detail--not-found",
			role: "alert",
			"data-testid": "not-found-state",
		},
		[h("p", "Tenant not found. It may have been deleted or you may not have access.")],
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformTenantDetailPage = defineComponent({
	name: "PlatformTenantDetailPage",

	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const notFound = ref(false);
		const tenant = ref<TenantSummary | null>(null);

		const actionState = ref<ActionState>({
			inProgress: null,
			error: null,
			success: null,
		});

		function getTenantId(): string {
			return String(route.params.tenantId ?? "");
		}

		async function fetchTenant(): Promise<void> {
			const tenantId = getTenantId();
			if (!tenantId) {
				notFound.value = true;
				loading.value = false;
				return;
			}

			loading.value = true;
			error.value = null;
			notFound.value = false;

			try {
				tenant.value = await sdk.tenants.get(tenantId);
			} catch (err: unknown) {
				if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
					notFound.value = true;
				} else {
					error.value =
						err instanceof Error
							? err.message
							: "Failed to load tenant details.";
				}
			} finally {
				loading.value = false;
			}
		}

		function clearActionState(): void {
			actionState.value = { inProgress: null, error: null, success: null };
		}

		async function handleImpersonate(): Promise<void> {
			clearActionState();
			actionState.value.inProgress = "impersonate";

			try {
				const result: ImpersonationResult = await sdk.tenants.impersonate(getTenantId());
				const url = `/impersonate?token=${encodeURIComponent(result.token)}&tenantId=${encodeURIComponent(result.tenantId)}`;
				window.open(url, "_blank", "noopener,noreferrer");
				actionState.value = {
					inProgress: null,
					error: null,
					success: `Impersonation session opened. Expires at ${result.expiresAt}.`,
				};
			} catch (err: unknown) {
				actionState.value = {
					inProgress: null,
					error: err instanceof Error ? err.message : "Failed to start impersonation session.",
					success: null,
				};
			}
		}

		async function handleSuspend(): Promise<void> {
			clearActionState();
			actionState.value.inProgress = "suspend";

			try {
				tenant.value = await sdk.tenants.update(getTenantId(), { status: "suspended" });
				actionState.value = {
					inProgress: null,
					error: null,
					success: "Tenant has been suspended.",
				};
			} catch (err: unknown) {
				actionState.value = {
					inProgress: null,
					error: err instanceof Error ? err.message : "Failed to suspend tenant.",
					success: null,
				};
			}
		}

		async function handleArchive(): Promise<void> {
			clearActionState();
			actionState.value.inProgress = "archive";

			try {
				tenant.value = await sdk.tenants.update(getTenantId(), { status: "archived" });
				actionState.value = {
					inProgress: null,
					error: null,
					success: "Tenant has been archived.",
				};
			} catch (err: unknown) {
				actionState.value = {
					inProgress: null,
					error: err instanceof Error ? err.message : "Failed to archive tenant.",
					success: null,
				};
			}
		}

		async function handleChangePlan(): Promise<void> {
			clearActionState();
			actionState.value.inProgress = "change-plan";

			try {
				// Placeholder — plan change UI will be implemented later
				await new Promise<void>((resolve) => setTimeout(resolve, PLAN_CHANGE_PLACEHOLDER_DELAY_MS));
				actionState.value = {
					inProgress: null,
					error: null,
					success: "Plan change feature coming soon.",
				};
			} catch (err: unknown) {
				actionState.value = {
					inProgress: null,
					error: err instanceof Error ? err.message : "Failed to change plan.",
					success: null,
				};
			}
		}

		onMounted(() => {
			void fetchTenant();
		});

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			if (loading.value) {
				return renderLoadingState();
			}

			if (notFound.value) {
				return renderNotFoundState();
			}

			if (error.value) {
				return renderErrorState(error.value, () => void fetchTenant());
			}

			const t = tenant.value;
			if (!t) {
				return renderNotFoundState();
			}

			return h(
				"section",
				{ class: "tenant-detail", "data-testid": "platform-tenant-detail-page" },
				[
					h("header", { class: "tenant-detail__header" }, [
						h(
							"button",
							{
								class: "btn btn--ghost",
								type: "button",
								"data-testid": "back-button",
								onClick: () => void router.push("/tenants"),
							},
							"← Back to Tenants",
						),
						h("h1", { class: "tenant-detail__title", "data-testid": "tenant-title" }, t.displayName),
					]),

					renderOverviewSection(t),
					renderConfigurationSection(),
					renderUsageMetricsSection(),
					renderActionsSection(t, actionState.value, {
						onImpersonate: () => void handleImpersonate(),
						onSuspend: () => void handleSuspend(),
						onArchive: () => void handleArchive(),
						onChangePlan: () => void handleChangePlan(),
					}),
				],
			);
		};
	},
});
