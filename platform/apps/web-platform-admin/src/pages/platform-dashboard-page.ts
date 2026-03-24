// Platform Dashboard page (PA-01) — top-level operational overview showing KPIs,
// system health, active alerts, and recent deployments with auto-refresh.

import { defineComponent, h, ref, onMounted, onUnmounted, type VNode } from "vue";
import { useRoute } from "vue-router";
import { useSdk } from "../composables/use-sdk";
import type { HealthStatus, DeploymentRecord } from "@platform/sdk";

// ── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 30_000;
const RECENT_DEPLOYMENTS_LIMIT = 5;

const HEALTH_SERVICES = ["api", "database", "redis", "queue"] as const;

type HealthServiceKey = (typeof HEALTH_SERVICES)[number];

const SERVICE_LABELS: Record<HealthServiceKey, string> = {
	api: "API",
	database: "Database",
	redis: "Redis",
	queue: "Queue",
};

// ── Color helpers ────────────────────────────────────────────────────────────

function healthColor(status: string): string {
	switch (status) {
		case "healthy":
			return "green";
		case "degraded":
			return "yellow";
		default:
			return "red";
	}
}

function deploymentColor(status: DeploymentRecord["status"]): string {
	switch (status) {
		case "succeeded":
			return "green";
		case "in-progress":
		case "pending":
			return "yellow";
		case "failed":
			return "red";
		case "rolled-back":
			return "orange";
		default:
			return "gray";
	}
}

function severityIcon(status: string): string {
	if (status === "down") return "🔴";
	if (status === "degraded") return "🟡";
	return "⚪";
}

// ── Render helpers ───────────────────────────────────────────────────────────

function renderMetricCard(label: string, value: string | number, testId: string): VNode {
	return h("div", { class: "metric-card", "data-testid": testId }, [
		h("span", { class: "metric-card__value" }, String(value)),
		h("span", { class: "metric-card__label" }, label),
	]);
}

function renderKpiRow(
	totalTenants: number,
	healthPct: number,
): VNode {
	return h("div", { class: "kpi-row", "data-testid": "kpi-row" }, [
		renderMetricCard("Total Tenants", totalTenants, "metric-total-tenants"),
		renderMetricCard("Active Tenants", "—", "metric-active-tenants"),
		renderMetricCard("Monthly GMV", "—", "metric-monthly-gmv"),
		renderMetricCard("System Health", `${healthPct}%`, "metric-system-health"),
	]);
}

function renderHealthBar(
	key: HealthServiceKey,
	check: { status: string; message?: string } | undefined,
): VNode {
	const status = check?.status ?? "unknown";
	const message = check?.message ?? "No data available";
	const color = healthColor(status);

	return h("div", { class: "health-bar", "data-testid": `health-bar-${key}` }, [
		h("div", { class: "health-bar__header" }, [
			h("span", { class: "health-bar__label" }, SERVICE_LABELS[key]),
			h(
				"span",
				{ class: `health-bar__status health-bar__status--${color}` },
				status,
			),
		]),
		h("div", { class: "health-bar__track" }, [
			h("div", {
				class: `health-bar__fill health-bar__fill--${color}`,
				style: { width: status === "healthy" ? "100%" : status === "degraded" ? "50%" : "10%" },
			}),
		]),
		h("p", { class: "health-bar__message" }, message),
	]);
}

function renderHealthSection(
	checks: Record<string, { status: string; message?: string }>,
): VNode {
	return h("div", { class: "health-section", "data-testid": "health-section" }, [
		h("h2", "System Health"),
		...HEALTH_SERVICES.map((key) => renderHealthBar(key, checks[key])),
	]);
}

type AlertEntry = {
	service: string;
	status: string;
	message: string;
	timestamp: string;
};

function deriveAlerts(
	checks: Record<string, { status: string; message?: string }>,
): AlertEntry[] {
	const now = new Date().toISOString();
	return Object.entries(checks)
		.filter(([, c]) => c.status !== "healthy")
		.map(([service, c]) => ({
			service,
			status: c.status,
			message: c.message ?? `${service} is ${c.status}`,
			timestamp: now,
		}));
}

function renderAlertItem(alert: AlertEntry): VNode {
	return h("li", { class: "alert-item", "data-testid": "alert-item" }, [
		h("span", { class: "alert-item__icon" }, severityIcon(alert.status)),
		h("span", { class: "alert-item__message" }, alert.message),
		h("span", { class: "alert-item__timestamp" }, alert.timestamp),
	]);
}

function renderAlertsSection(
	checks: Record<string, { status: string; message?: string }>,
): VNode {
	const alerts = deriveAlerts(checks);
	return h("div", { class: "alerts-section", "data-testid": "alerts-section" }, [
		h("h2", "Active Alerts"),
		alerts.length === 0
			? h("p", { class: "alerts-section__empty" }, "No active alerts — all systems healthy.")
			: h(
					"ul",
					{ class: "alerts-section__list" },
					alerts.map(renderAlertItem),
				),
	]);
}

function renderDeploymentRow(dep: DeploymentRecord): VNode {
	const color = deploymentColor(dep.status);
	return h("tr", { class: "deployment-row", "data-testid": "deployment-row" }, [
		h("td", dep.version),
		h("td", dep.triggeredAt),
		h("td", [
			h(
				"span",
				{ class: `badge badge--${color}`, "data-testid": "deployment-status-badge" },
				dep.status,
			),
		]),
		h("td", dep.environment),
	]);
}

function renderDeploymentsSection(deployments: DeploymentRecord[]): VNode {
	return h("div", { class: "deployments-section", "data-testid": "deployments-section" }, [
		h("h2", "Recent Deployments"),
		deployments.length === 0
			? h("p", { class: "deployments-section__empty" }, "No recent deployments.")
			: h("table", { class: "deployments-table" }, [
					h("thead", [
						h("tr", [
							h("th", "Version"),
							h("th", "Date"),
							h("th", "Status"),
							h("th", "Environment"),
						]),
					]),
					h(
						"tbody",
						deployments.map(renderDeploymentRow),
					),
				]),
	]);
}

function renderAutoRefreshToggle(
	enabled: boolean,
	onToggle: () => void,
): VNode {
	return h("div", { class: "auto-refresh", "data-testid": "auto-refresh-toggle" }, [
		h("label", { class: "auto-refresh__label" }, [
			h("input", {
				type: "checkbox",
				checked: enabled,
				onChange: onToggle,
				"data-testid": "auto-refresh-checkbox",
			}),
			h("span", ` Auto-refresh (${REFRESH_INTERVAL_MS / 1_000}s)`),
		]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformDashboardPage = defineComponent({
	name: "PlatformDashboardPage",

	setup() {
		const sdk = useSdk();
		const route = useRoute();

		const loading = ref(true);
		const error = ref<string | null>(null);

		const healthData = ref<HealthStatus | null>(null);
		const deployments = ref<DeploymentRecord[]>([]);
		const totalTenants = ref(0);

		const autoRefresh = ref(true);
		let intervalId: ReturnType<typeof setInterval> | null = null;

		async function fetchData(): Promise<void> {
			try {
				const [health, deploys, tenants] = await Promise.all([
					sdk.health.status(),
					sdk.deployments.list({ pageSize: RECENT_DEPLOYMENTS_LIMIT }),
					sdk.tenants.list(),
				]);

				healthData.value = health;
				deployments.value = deploys.data;
				totalTenants.value = tenants.total;
				error.value = null;
			} catch (err: unknown) {
				error.value =
					err instanceof Error
						? err.message
						: "Failed to load dashboard data.";
			} finally {
				loading.value = false;
			}
		}

		function startPolling(): void {
			stopPolling();
			intervalId = setInterval(() => void fetchData(), REFRESH_INTERVAL_MS);
		}

		function stopPolling(): void {
			if (intervalId !== null) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}

		function toggleAutoRefresh(): void {
			autoRefresh.value = !autoRefresh.value;
			if (autoRefresh.value) {
				startPolling();
			} else {
				stopPolling();
			}
		}

		onMounted(() => {
			void fetchData();
			if (autoRefresh.value) startPolling();
		});

		onUnmounted(() => {
			stopPolling();
		});

		// ── Render ───────────────────────────────────────────────────────

		function computeHealthPct(checks: Record<string, { status: string; message?: string }>): number {
			const entries = Object.values(checks);
			if (entries.length === 0) return 0;
			const healthy = entries.filter((c) => c.status === "healthy").length;
			return Math.round((healthy / entries.length) * 100);
		}

		return () => {
			if (loading.value) {
				return h(
					"section",
					{ class: "platform-dashboard platform-dashboard--loading", "data-testid": "platform-dashboard-loading" },
					[h("p", "Loading dashboard…")],
				);
			}

			if (error.value) {
				return h(
					"section",
					{ class: "platform-dashboard platform-dashboard--error", "data-testid": "platform-dashboard-error" },
					[h("p", { class: "error" }, error.value)],
				);
			}

			const checks = healthData.value?.checks ?? {};
			const healthPct = computeHealthPct(checks);

			return h(
				"section",
				{ class: "platform-dashboard", "data-testid": "platform-dashboard" },
				[
					h("header", { class: "platform-dashboard__header" }, [
						h("h1", "Platform Shell"),
						h("p", { class: "auth-description" }, String(route.meta.authDescription ?? "")),
						renderAutoRefreshToggle(autoRefresh.value, toggleAutoRefresh),
					]),
					renderKpiRow(totalTenants.value, healthPct),
					renderHealthSection(checks),
					renderAlertsSection(checks),
					renderDeploymentsSection(deployments.value),
				],
			);
		};
	},
});
