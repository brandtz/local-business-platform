import { defineComponent, h, type PropType, type VNode } from "vue";

import type { PlatformTenantOperationalSummary } from "@platform/types";

import type { TenantListViewState } from "./tenant-dashboard";
import { describeListViewShellState } from "./tenant-dashboard";

function renderShellMessage(title: string, message: string): VNode {
	return h("section", { class: "tenant-list-state", "data-testid": "tenant-list-state" }, [
		h("h2", title),
		h("p", message)
	]);
}

function renderTenantRow(tenant: PlatformTenantOperationalSummary): VNode {
	return h("tr", { key: tenant.tenantId, "data-testid": `tenant-row-${tenant.tenantId}` }, [
		h("td", tenant.tenantDisplayName),
		h("td", tenant.tenantSlug),
		h("td", tenant.lifecycleStatus),
		h("td", tenant.publishStatus),
		h("td", tenant.healthStatus)
	]);
}

function renderTenantTable(tenants: readonly PlatformTenantOperationalSummary[]): VNode {
	return h("section", { class: "tenant-list", "data-testid": "tenant-list" }, [
		h("h2", "Tenants"),
		h("table", [
			h("thead", [
				h("tr", [
					h("th", "Name"),
					h("th", "Slug"),
					h("th", "Lifecycle"),
					h("th", "Publish"),
					h("th", "Health")
				])
			]),
			h("tbody", tenants.map(renderTenantRow))
		])
	]);
}

export const TenantListPage = defineComponent({
	name: "TenantListPage",
	props: {
		viewState: {
			type: Object as PropType<TenantListViewState>,
			required: true
		}
	},
	setup(props) {
		return () => {
			const state = props.viewState;

			if (state.kind === "ready") {
				return renderTenantTable(state.tenants);
			}

			const descriptor = describeListViewShellState(state);

			return renderShellMessage(descriptor.title, descriptor.message);
		};
	}
});
