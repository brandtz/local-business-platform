import { defineComponent, h, type PropType, type VNode } from "vue";

import type {
	PlatformAuditSummaryWidget,
	PlatformJobStatusWidget,
	PlatformOperationsWidgetSet,
	PlatformPublishSummaryWidget
} from "@platform/types";

// ── Audit Summary Widget ─────────────────────────────────────────────────────

function renderAuditSummary(data: PlatformAuditSummaryWidget): VNode {
	return h("div", { class: "widget audit-summary", "data-testid": "audit-summary-widget" }, [
		h("h3", "Audit Summary"),
		h("dl", [
			h("dt", "Transitions"),
			h("dd", String(data.totalTransitions)),
			h("dt", "Denied"),
			h("dd", String(data.totalDenied)),
			h("dt", "Last Audit"),
			h("dd", data.lastAuditAt ?? "No audits recorded")
		])
	]);
}

// ── Job Status Widget ────────────────────────────────────────────────────────

function renderJobStatus(data: PlatformJobStatusWidget): VNode {
	return h("div", { class: "widget job-status", "data-testid": "job-status-widget" }, [
		h("h3", "Job Status"),
		h("dl", [
			h("dt", "Status"),
			h("dd", { "data-testid": "job-status-value" }, data.status),
			h("dt", "Pending"),
			h("dd", String(data.pendingCount)),
			h("dt", "Failed"),
			h("dd", String(data.failedCount))
		])
	]);
}

// ── Publish Summary Widget ───────────────────────────────────────────────────

function renderPublishSummary(data: PlatformPublishSummaryWidget): VNode {
	const children: VNode[] = [
		h("h3", "Publish Summary"),
		h("dl", [
			h("dt", "Ready"),
			h("dd", String(data.readyCount)),
			h("dt", "Blocked"),
			h("dd", String(data.blockedCount))
		])
	];

	if (data.commonBlockReasons.length > 0) {
		children.push(
			h("div", { "data-testid": "block-reasons" }, [
				h("h4", "Common Block Reasons"),
				h("ul", data.commonBlockReasons.map((reason) => h("li", reason)))
			])
		);
	}

	return h("div", { class: "widget publish-summary", "data-testid": "publish-summary-widget" }, children);
}

// ── Combined Widget Panel ────────────────────────────────────────────────────

export const OperationsWidgetPanel = defineComponent({
	name: "OperationsWidgetPanel",
	props: {
		widgets: {
			type: Object as PropType<PlatformOperationsWidgetSet>,
			required: true
		}
	},
	setup(props) {
		return () =>
			h("section", { class: "operations-widgets", "data-testid": "operations-widgets" }, [
				renderAuditSummary(props.widgets.auditSummary),
				renderJobStatus(props.widgets.jobStatus),
				renderPublishSummary(props.widgets.publishSummary)
			]);
	}
});

// ── Loading / Error States ───────────────────────────────────────────────────

export type WidgetPanelViewState =
	| { kind: "loading" }
	| { kind: "ready"; widgets: PlatformOperationsWidgetSet }
	| { kind: "error"; message: string };

export function describeWidgetPanelState(state: WidgetPanelViewState): string {
	switch (state.kind) {
		case "loading":
			return "Loading operations widgets…";
		case "ready":
			return "Operations widgets loaded.";
		case "error":
			return state.message;
	}
}
