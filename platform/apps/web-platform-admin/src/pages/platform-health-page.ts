// Platform Health page (PA-09) — system health overview with service status
// cards, background jobs monitor, alert banners, and auto-refresh.

import { defineComponent, h, ref, onMounted, onUnmounted, type VNode } from "vue";
import { useSdk } from "../composables/use-sdk";

// ── Types ────────────────────────────────────────────────────────────────────

type HealthStatus = {
	status: "healthy" | "degraded" | "down";
	version: string;
	uptime: number;
	checks: Record<string, { status: string; message?: string }>;
};

type JobStatus = {
	id: string;
	name: string;
	status: "running" | "idle" | "failed";
	lastRunAt: string | null;
	nextRunAt: string | null;
};

// ── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 30_000;

// ── Color / label helpers ────────────────────────────────────────────────────

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

function healthLabel(status: string): string {
	switch (status) {
		case "healthy":
			return "Healthy";
		case "degraded":
			return "Degraded";
		case "down":
			return "Down";
		default:
			return status.charAt(0).toUpperCase() + status.slice(1);
	}
}

function jobColor(status: string): string {
	switch (status) {
		case "running":
			return "green";
		case "idle":
			return "yellow";
		case "failed":
			return "red";
		default:
			return "gray";
	}
}

function jobLabel(status: string): string {
	switch (status) {
		case "running":
			return "Running";
		case "idle":
			return "Idle";
		case "failed":
			return "Failed";
		default:
			return status.charAt(0).toUpperCase() + status.slice(1);
	}
}

function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86_400);
	const hours = Math.floor((seconds % 86_400) / 3_600);
	const minutes = Math.floor((seconds % 3_600) / 60);
	return `${days}d ${hours}h ${minutes}m`;
}

function formatTimestamp(value: string | null): string {
	if (!value) return "—";
	try {
		return new Date(value).toLocaleString();
	} catch {
		return value;
	}
}

// ── Render helpers ───────────────────────────────────────────────────────────

function renderAlertBanner(
	checks: Record<string, { status: string; message?: string }>,
): VNode | null {
	const degraded = Object.entries(checks).filter(
		([, c]) => c.status !== "healthy",
	);
	if (degraded.length === 0) return null;

	const messages = degraded.map(
		([name, c]) => `${name}: ${c.message ?? c.status}`,
	);

	return h(
		"div",
		{
			class: "alert alert--warning",
			role: "alert",
			"data-testid": "health-alert-banner",
		},
		[
			h("strong", "⚠ System Alert: "),
			h("span", messages.join(" · ")),
		],
	);
}

function renderOverallStatus(health: HealthStatus): VNode {
	const color = healthColor(health.status);
	return h("div", { class: "health-overview", "data-testid": "health-overview" }, [
		h("div", { class: "health-overview__status" }, [
			h("span", {
				class: `health-indicator health-indicator--${color}`,
				"data-testid": "overall-status-indicator",
			}),
			h(
				"span",
				{ class: "health-overview__label", "data-testid": "overall-status-label" },
				healthLabel(health.status),
			),
		]),
		h("div", { class: "health-overview__meta" }, [
			h("span", { class: "health-overview__version", "data-testid": "system-version" }, [
				h("strong", "Version: "),
				health.version,
			]),
			h("span", { class: "health-overview__uptime", "data-testid": "system-uptime" }, [
				h("strong", "Uptime: "),
				formatUptime(health.uptime),
			]),
		]),
	]);
}

function renderServiceCard(
	name: string,
	check: { status: string; message?: string },
): VNode {
	const color = healthColor(check.status);
	return h(
		"div",
		{
			class: `service-card service-card--${color}`,
			"data-testid": `service-card-${name.toLowerCase()}`,
		},
		[
			h("div", { class: "service-card__header" }, [
				h("span", {
					class: `health-indicator health-indicator--${color}`,
					"data-testid": `service-indicator-${name.toLowerCase()}`,
				}),
				h("h3", { class: "service-card__name" }, name),
			]),
			h(
				"span",
				{
					class: `badge badge--${color}`,
					"data-testid": `service-status-${name.toLowerCase()}`,
				},
				healthLabel(check.status),
			),
			check.message
				? h("p", { class: "service-card__message" }, check.message)
				: null,
		],
	);
}

function renderServiceCards(
	checks: Record<string, { status: string; message?: string }>,
): VNode {
	const entries = Object.entries(checks);
	return h(
		"section",
		{ class: "health-section", "data-testid": "service-cards-section" },
		[
			h("h2", "Service Health"),
			entries.length === 0
				? h("p", { class: "empty-state" }, "No service checks available.")
				: h(
						"div",
						{ class: "service-grid", "data-testid": "service-grid" },
						entries.map(([name, check]) => renderServiceCard(name, check)),
					),
		],
	);
}

function renderJobRow(job: JobStatus): VNode {
	const color = jobColor(job.status);
	return h("tr", { class: "job-row", "data-testid": "job-row" }, [
		h("td", { "data-testid": "job-name" }, job.name),
		h("td", [
			h(
				"span",
				{ class: `badge badge--${color}`, "data-testid": "job-status-badge" },
				jobLabel(job.status),
			),
		]),
		h("td", { "data-testid": "job-last-run" }, formatTimestamp(job.lastRunAt)),
		h("td", { "data-testid": "job-next-run" }, formatTimestamp(job.nextRunAt)),
	]);
}

function renderJobsTable(jobs: JobStatus[]): VNode {
	return h(
		"section",
		{ class: "health-section", "data-testid": "jobs-section" },
		[
			h("h2", "Background Jobs"),
			jobs.length === 0
				? h("p", { class: "empty-state" }, "No background jobs found.")
				: h("table", { class: "jobs-table", "data-testid": "jobs-table" }, [
						h("thead", [
							h("tr", [
								h("th", "Job Name"),
								h("th", "Status"),
								h("th", "Last Run"),
								h("th", "Next Run"),
							]),
						]),
						h("tbody", jobs.map(renderJobRow)),
					]),
		],
	);
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

function renderLoadingState(): VNode {
	return h(
		"section",
		{
			class: "health-page health-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[h("p", "Loading system health…")],
	);
}

function renderErrorState(message: string, onRetry: () => void): VNode {
	return h(
		"section",
		{
			class: "health-page health-page--error",
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

export const PlatformHealthPage = defineComponent({
	name: "PlatformHealthPage",

	setup() {
		const sdk = useSdk();

		const loading = ref(true);
		const error = ref<string | null>(null);

		const healthData = ref<HealthStatus | null>(null);
		const jobs = ref<JobStatus[]>([]);

		const autoRefresh = ref(true);
		let intervalId: ReturnType<typeof setInterval> | null = null;

		async function fetchData(): Promise<void> {
			try {
				const [health, jobList] = await Promise.all([
					sdk.health.status(),
					sdk.health.jobs(),
				]);

				healthData.value = health as HealthStatus;
				jobs.value = jobList as JobStatus[];
				error.value = null;
			} catch (err: unknown) {
				error.value =
					err instanceof Error
						? err.message
						: "Failed to load system health data.";
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

		function handleRunHealthCheck(): void {
			loading.value = true;
			void fetchData();
		}

		onMounted(() => {
			void fetchData();
			if (autoRefresh.value) startPolling();
		});

		onUnmounted(() => {
			stopPolling();
		});

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			if (loading.value && !healthData.value) {
				return renderLoadingState();
			}

			if (error.value && !healthData.value) {
				return renderErrorState(error.value, () => void fetchData());
			}

			const health = healthData.value!;
			const checks = health.checks ?? {};

			return h(
				"section",
				{ class: "health-page", "data-testid": "platform-health-page" },
				[
					h("header", { class: "health-page__header" }, [
						h("h1", "System Health"),
						h("div", { class: "health-page__actions" }, [
							h(
								"button",
								{
									class: "btn btn--primary",
									type: "button",
									disabled: loading.value,
									"data-testid": "run-health-check-button",
									onClick: handleRunHealthCheck,
								},
								loading.value ? "Checking…" : "Run Health Check",
							),
							renderAutoRefreshToggle(autoRefresh.value, toggleAutoRefresh),
						]),
					]),

					renderAlertBanner(checks),

					error.value
						? h(
								"div",
								{ class: "alert alert--error", role: "alert", "data-testid": "inline-error" },
								error.value,
							)
						: null,

					renderOverallStatus(health),
					renderServiceCards(checks),
					renderJobsTable(jobs.value),
				],
			);
		};
	},
});
