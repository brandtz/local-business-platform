// Platform Publishing & Deployments page (PA-14) — deployment stats,
// pipeline visualization, release history, rollback & trigger actions.

import { defineComponent, h, ref, computed, onMounted, type VNode } from "vue";
import { useSdk } from "../composables/use-sdk";
import type { DeploymentRecord } from "@platform/sdk";

// ── Types ────────────────────────────────────────────────────────────────────

interface MetricCardDef {
	key: string;
	label: string;
	value: string;
	subtitle?: string;
	placeholder?: boolean;
}

interface PipelineStage {
	key: string;
	label: string;
	status: "idle" | "active" | "succeeded" | "failed";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeColor(status: DeploymentRecord["status"]): string {
	switch (status) {
		case "succeeded":
			return "green";
		case "pending":
		case "in-progress":
			return "blue";
		case "failed":
			return "red";
		case "rolled-back":
			return "yellow";
		default:
			return "default";
	}
}

function pipelineStageColor(status: PipelineStage["status"]): string {
	switch (status) {
		case "succeeded":
			return "green";
		case "active":
			return "blue";
		case "failed":
			return "red";
		default:
			return "gray";
	}
}

function formatDuration(triggeredAt: string, completedAt: string | null): string {
	if (!completedAt) return "—";
	const ms = new Date(completedAt).getTime() - new Date(triggeredAt).getTime();
	if (ms < 0) return "—";
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatRelativeTime(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
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

function renderPipelineStage(stage: PipelineStage, isLast: boolean): VNode[] {
	const nodes: VNode[] = [
		h(
			"div",
			{
				class: `pipeline-stage pipeline-stage--${pipelineStageColor(stage.status)}`,
				"data-testid": `pipeline-stage-${stage.key}`,
			},
			[
				h("span", { class: "pipeline-stage__label" }, stage.label),
				h(
					"span",
					{
						class: `pipeline-stage__status pipeline-stage__status--${pipelineStageColor(stage.status)}`,
						"data-testid": `pipeline-stage-status-${stage.key}`,
					},
					stage.status,
				),
			],
		),
	];

	if (!isLast) {
		nodes.push(
			h("span", { class: "pipeline-connector", "data-testid": "pipeline-connector" }, "→"),
		);
	}

	return nodes;
}

function renderPipelineSection(stages: PipelineStage[]): VNode {
	return h(
		"section",
		{ class: "publishing-section", "data-testid": "pipeline-section" },
		[
			h("h2", { class: "publishing-section__title" }, "Deployment Pipeline"),
			h(
				"div",
				{ class: "pipeline", "data-testid": "pipeline-visualization" },
				stages.flatMap((stage, idx) => renderPipelineStage(stage, idx === stages.length - 1)),
			),
		],
	);
}

function renderReleaseTable(
	deployments: DeploymentRecord[],
	onRollback: (deployment: DeploymentRecord) => void,
): VNode {
	const headerRow = h("tr", {}, [
		h("th", { "data-testid": "table-header-version" }, "Version"),
		h("th", { "data-testid": "table-header-date" }, "Date"),
		h("th", { "data-testid": "table-header-environment" }, "Environment"),
		h("th", { "data-testid": "table-header-status" }, "Status"),
		h("th", { "data-testid": "table-header-deployer" }, "Deployer"),
		h("th", { "data-testid": "table-header-duration" }, "Duration"),
		h("th", { "data-testid": "table-header-actions" }, "Actions"),
	]);

	const bodyRows = deployments.map((d, idx) =>
		h("tr", { key: d.id, class: "table__row", "data-testid": `deployment-row-${idx}` }, [
			h("td", { "data-testid": `deployment-version-${idx}` }, d.version),
			h("td", { "data-testid": `deployment-date-${idx}` }, new Date(d.triggeredAt).toLocaleString()),
			h("td", { "data-testid": `deployment-environment-${idx}` }, d.environment),
			h("td", {}, [
				h(
					"span",
					{
						class: `badge badge--${statusBadgeColor(d.status)}`,
						"data-testid": `deployment-status-${idx}`,
					},
					d.status,
				),
			]),
			h("td", { "data-testid": `deployment-deployer-${idx}` }, d.triggeredBy),
			h("td", { "data-testid": `deployment-duration-${idx}` }, formatDuration(d.triggeredAt, d.completedAt)),
			h("td", {}, [
				d.status === "succeeded"
					? h(
							"button",
							{
								class: "btn btn--danger btn--small",
								type: "button",
								"data-testid": `rollback-button-${idx}`,
								onClick: () => onRollback(d),
							},
							"Rollback",
						)
					: null,
			]),
		]),
	);

	return h(
		"section",
		{ class: "publishing-section", "data-testid": "release-history-section" },
		[
			h("h2", { class: "publishing-section__title" }, "Release History"),
			deployments.length === 0
				? h("p", { class: "empty-text", "data-testid": "release-history-empty" }, "No deployments found.")
				: h("div", { class: "table-wrapper", "data-testid": "release-history-table-wrapper" }, [
						h("table", { class: "data-table", "data-testid": "release-history-table" }, [
							h("thead", {}, [headerRow]),
							h("tbody", {}, bodyRows),
						]),
					]),
		],
	);
}

function renderRollbackDialog(
	deployment: DeploymentRecord,
	rolling: boolean,
	onConfirm: () => void,
	onCancel: () => void,
): VNode {
	return h(
		"div",
		{ class: "dialog-overlay", "data-testid": "rollback-dialog" },
		[
			h("div", { class: "dialog", "data-testid": "rollback-dialog-content" }, [
				h("h3", { class: "dialog__title" }, "Confirm Rollback"),
				h("p", { class: "dialog__text", "data-testid": "rollback-dialog-version" }, [
					`Are you sure you want to rollback deployment `,
					h("strong", {}, deployment.version),
					` (${deployment.environment})?`,
				]),
				h(
					"p",
					{ class: "dialog__warning", "data-testid": "rollback-dialog-warning" },
					"⚠ This action will revert the environment to the previous deployment. This cannot be undone.",
				),
				h("div", { class: "dialog__actions" }, [
					h(
						"button",
						{
							class: "btn btn--secondary",
							type: "button",
							disabled: rolling,
							"data-testid": "rollback-cancel-button",
							onClick: onCancel,
						},
						"Cancel",
					),
					h(
						"button",
						{
							class: "btn btn--danger",
							type: "button",
							disabled: rolling,
							"data-testid": "rollback-confirm-button",
							onClick: onConfirm,
						},
						rolling ? "Rolling back…" : "Confirm Rollback",
					),
				]),
			]),
		],
	);
}

function renderTriggerDialog(
	form: { version: string; environment: string; changelog: string },
	triggering: boolean,
	onSubmit: () => void,
	onCancel: () => void,
	onUpdate: (field: string, value: string) => void,
): VNode {
	return h(
		"div",
		{ class: "dialog-overlay", "data-testid": "trigger-dialog" },
		[
			h("div", { class: "dialog", "data-testid": "trigger-dialog-content" }, [
				h("h3", { class: "dialog__title" }, "Trigger Deployment"),
				h("div", { class: "form-group" }, [
					h("label", { class: "form-label", for: "deploy-version" }, "Version"),
					h("input", {
						id: "deploy-version",
						class: "form-input",
						type: "text",
						placeholder: "e.g. 1.2.3",
						value: form.version,
						disabled: triggering,
						"data-testid": "trigger-version-input",
						onInput: (e: Event) => onUpdate("version", (e.target as HTMLInputElement).value),
					}),
				]),
				h("div", { class: "form-group" }, [
					h("label", { class: "form-label", for: "deploy-environment" }, "Environment"),
					h(
						"select",
						{
							id: "deploy-environment",
							class: "form-select",
							value: form.environment,
							disabled: triggering,
							"data-testid": "trigger-environment-select",
							onChange: (e: Event) => onUpdate("environment", (e.target as HTMLSelectElement).value),
						},
						[
							h("option", { value: "staging" }, "Staging"),
							h("option", { value: "production" }, "Production"),
						],
					),
				]),
				h("div", { class: "form-group" }, [
					h("label", { class: "form-label", for: "deploy-changelog" }, "Changelog"),
					h("textarea", {
						id: "deploy-changelog",
						class: "form-textarea",
						placeholder: "Describe the changes in this release…",
						value: form.changelog,
						disabled: triggering,
						"data-testid": "trigger-changelog-textarea",
						onInput: (e: Event) => onUpdate("changelog", (e.target as HTMLTextAreaElement).value),
					}),
				]),
				h("div", { class: "dialog__actions" }, [
					h(
						"button",
						{
							class: "btn btn--secondary",
							type: "button",
							disabled: triggering,
							"data-testid": "trigger-cancel-button",
							onClick: onCancel,
						},
						"Cancel",
					),
					h(
						"button",
						{
							class: "btn btn--primary",
							type: "button",
							disabled: triggering || !form.version,
							"data-testid": "trigger-confirm-button",
							onClick: onSubmit,
						},
						triggering ? "Deploying…" : "Deploy",
					),
				]),
			]),
		],
	);
}

function renderLoadingState(): VNode {
	return h(
		"div",
		{
			class: "publishing-page publishing-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[h("p", "Loading deployments…")],
	);
}

function renderErrorState(message: string, onRetry: () => void): VNode {
	return h(
		"div",
		{
			class: "publishing-page publishing-page--error",
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

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformPublishingPage = defineComponent({
	name: "PlatformPublishingPage",

	setup() {
		const sdk = useSdk();

		// ── State ────────────────────────────────────────────────────────

		const loading = ref(true);
		const error = ref<string | null>(null);
		const deployments = ref<DeploymentRecord[]>([]);
		const totalDeployments = ref(0);

		// Rollback dialog state
		const rollbackTarget = ref<DeploymentRecord | null>(null);
		const rollingBack = ref(false);

		// Trigger dialog state
		const showTriggerDialog = ref(false);
		const triggering = ref(false);
		const triggerForm = ref({ version: "", environment: "staging", changelog: "" });

		// ── Data fetching ────────────────────────────────────────────────

		async function fetchData(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const result = await sdk.deployments.list({ page: 1, pageSize: 50 });
				deployments.value = result.data;
				totalDeployments.value = result.total;
			} catch (err: unknown) {
				error.value =
					err instanceof Error ? err.message : "Failed to load deployment data.";
			} finally {
				loading.value = false;
			}
		}

		onMounted(() => {
			void fetchData();
		});

		// ── Actions ──────────────────────────────────────────────────────

		async function handleRollback(): Promise<void> {
			if (!rollbackTarget.value) return;
			rollingBack.value = true;
			try {
				await sdk.deployments.rollback(rollbackTarget.value.id);
				rollbackTarget.value = null;
				await fetchData();
			} catch (err: unknown) {
				error.value =
					err instanceof Error ? err.message : "Rollback failed.";
			} finally {
				rollingBack.value = false;
			}
		}

		async function handleTrigger(): Promise<void> {
			triggering.value = true;
			try {
				await sdk.deployments.trigger({
					version: triggerForm.value.version,
					environment: triggerForm.value.environment,
					changelog: triggerForm.value.changelog || undefined,
				});
				showTriggerDialog.value = false;
				triggerForm.value = { version: "", environment: "staging", changelog: "" };
				await fetchData();
			} catch (err: unknown) {
				error.value =
					err instanceof Error ? err.message : "Deployment trigger failed.";
			} finally {
				triggering.value = false;
			}
		}

		// ── Computed ─────────────────────────────────────────────────────

		const successRate = computed(() => {
			if (deployments.value.length === 0) return "—";
			const succeeded = deployments.value.filter((d) => d.status === "succeeded").length;
			return `${Math.round((succeeded / deployments.value.length) * 100)}%`;
		});

		const lastDeployTime = computed(() => {
			if (deployments.value.length === 0) return "—";
			const sorted = [...deployments.value].sort(
				(a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
			);
			return formatRelativeTime(sorted[0].triggeredAt);
		});

		const kpiCards = computed<MetricCardDef[]>(() => [
			{
				key: "total-deployments",
				label: "Total Deployments",
				value: String(totalDeployments.value),
			},
			{
				key: "success-rate",
				label: "Success Rate",
				value: successRate.value,
			},
			{
				key: "avg-duration",
				label: "Average Duration",
				value: "—",
				subtitle: "Data integration pending",
				placeholder: true,
			},
			{
				key: "last-deploy",
				label: "Last Deploy",
				value: lastDeployTime.value,
			},
		]);

		const pipelineStages = computed<PipelineStage[]>(() => {
			const latest = deployments.value.length > 0
				? [...deployments.value].sort(
						(a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
					)[0]
				: null;

			if (!latest) {
				return [
					{ key: "build", label: "Build", status: "idle" },
					{ key: "test", label: "Test", status: "idle" },
					{ key: "staging", label: "Staging", status: "idle" },
					{ key: "production", label: "Production", status: "idle" },
				];
			}

			const mapStatus = (
				env: string,
				phase: "build" | "test" | "staging" | "production",
			): PipelineStage["status"] => {
				if (latest.status === "failed") return "failed";
				if (latest.status === "succeeded") return "succeeded";
				if (latest.status === "in-progress") {
					if (phase === "production" && env !== "production") return "idle";
					if (phase === "staging" || phase === "production") return "active";
					return "succeeded";
				}
				if (phase === "build") return latest.status === "pending" ? "active" : "idle";
				return "idle";
			};

			return [
				{ key: "build", label: "Build", status: mapStatus(latest.environment, "build") },
				{ key: "test", label: "Test", status: mapStatus(latest.environment, "test") },
				{ key: "staging", label: "Staging", status: mapStatus(latest.environment, "staging") },
				{ key: "production", label: "Production", status: mapStatus(latest.environment, "production") },
			];
		});

		// ── Render ───────────────────────────────────────────────────────

		return () => {
			if (loading.value && deployments.value.length === 0) {
				return renderLoadingState();
			}

			if (error.value && deployments.value.length === 0) {
				return renderErrorState(error.value, () => void fetchData());
			}

			return h(
				"section",
				{ class: "publishing-page", "data-testid": "platform-publishing-page" },
				[
					h("header", { class: "publishing-page__header" }, [
						h("h1", { class: "publishing-page__title", "data-testid": "page-title" }, "Publishing & Deployments"),
						h(
							"button",
							{
								class: "btn btn--primary",
								type: "button",
								"data-testid": "trigger-deploy-button",
								onClick: () => {
									showTriggerDialog.value = true;
								},
							},
							"Trigger Deploy",
						),
					]),

					// Error banner (when data already loaded but action failed)
					error.value
						? h(
								"div",
								{ class: "error-banner", role: "alert", "data-testid": "error-banner" },
								[
									h("p", { "data-testid": "error-banner-message" }, error.value),
									h(
										"button",
										{
											class: "btn btn--small btn--secondary",
											type: "button",
											"data-testid": "error-banner-dismiss",
											onClick: () => {
												error.value = null;
											},
										},
										"Dismiss",
									),
								],
							)
						: null,

					renderKpiSection(kpiCards.value),
					renderPipelineSection(pipelineStages.value),
					renderReleaseTable(deployments.value, (d) => {
						rollbackTarget.value = d;
					}),

					// Rollback confirmation dialog
					rollbackTarget.value
						? renderRollbackDialog(
								rollbackTarget.value,
								rollingBack.value,
								() => void handleRollback(),
								() => {
									rollbackTarget.value = null;
								},
							)
						: null,

					// Trigger deploy dialog
					showTriggerDialog.value
						? renderTriggerDialog(
								triggerForm.value,
								triggering.value,
								() => void handleTrigger(),
								() => {
									showTriggerDialog.value = false;
									triggerForm.value = { version: "", environment: "staging", changelog: "" };
								},
								(field, value) => {
									triggerForm.value = { ...triggerForm.value, [field]: value };
								},
							)
						: null,
				],
			);
		};
	},
});
