import { defineComponent, h, type PropType, type VNode } from "vue";

import type { PlatformTenantOperationalSummary } from "@platform/types";

import type { TenantDetailViewState } from "./tenant-dashboard";
import { describeDetailViewShellState } from "./tenant-dashboard";

function renderShellMessage(title: string, message: string): VNode {
	return h("section", { class: "tenant-detail-state", "data-testid": "tenant-detail-state" }, [
		h("h2", title),
		h("p", message)
	]);
}

function renderDetailField(label: string, value: string | number | null): VNode {
	return h("div", { class: "detail-field", "data-testid": `detail-field-${label.toLowerCase().replace(/\s+/g, "-")}` }, [
		h("dt", label),
		h("dd", String(value ?? "—"))
	]);
}

function renderTenantDetail(tenant: PlatformTenantOperationalSummary): VNode {
	return h("section", { class: "tenant-detail", "data-testid": "tenant-detail" }, [
		h("h2", tenant.tenantDisplayName),
		h("p", { class: "tenant-slug" }, tenant.tenantSlug),
		h("dl", [
			renderDetailField("Lifecycle Status", tenant.lifecycleStatus),
			renderDetailField("Publish Status", tenant.publishStatus),
			renderDetailField("Health Status", tenant.healthStatus),
			renderDetailField("Preview Status", tenant.previewStatus),
			renderDetailField("Live Routing", tenant.liveRoutingStatus),
			renderDetailField("Custom Domains", tenant.customDomainCount),
			renderDetailField("Preview Subdomain", tenant.previewSubdomain)
		]),
		tenant.healthReasons.length > 0
			? h("div", { class: "health-reasons", "data-testid": "health-reasons" }, [
					h("h3", "Health Attention Reasons"),
					h("ul", tenant.healthReasons.map((reason) => h("li", reason)))
				])
			: null,
		tenant.publishBlockedReason
			? h("div", { class: "publish-blocked", "data-testid": "publish-blocked" }, [
					h("h3", "Publish Blocked"),
					h("p", tenant.publishBlockedReason)
				])
			: null
	]);
}

export const TenantDetailPage = defineComponent({
	name: "TenantDetailPage",
	props: {
		viewState: {
			type: Object as PropType<TenantDetailViewState>,
			required: true
		}
	},
	setup(props) {
		return () => {
			const state = props.viewState;

			if (state.kind === "ready") {
				return renderTenantDetail(state.tenant);
			}

			const descriptor = describeDetailViewShellState(state);

			return renderShellMessage(descriptor.title, descriptor.message);
		};
	}
});
