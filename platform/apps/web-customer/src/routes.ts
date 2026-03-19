import { defineComponent, h, type Component } from "vue";
import type { RouteRecordRaw } from "vue-router";

import type { AuthViewerState } from "@platform/types";

import { getAuthViewerState } from "./auth-state";
import type { WebCustomerRuntimeConfig } from "./runtime-config";
import type { TenantFrontendContext } from "./tenant-bootstrap";

function createPage(title: string, description: string): Component {
  return defineComponent({
    name: `${title.replace(/\s+/g, "")}Page`,
    setup() {
      return () =>
        h("section", [h("h2", title), h("p", description)]);
    }
  });
}

export function createRoutes(
  runtimeConfig: WebCustomerRuntimeConfig,
  tenantContext?: TenantFrontendContext
): RouteRecordRaw[] {
  const authViewerState = getAuthViewerState();

  const tenantLabel = tenantContext
    ? `${tenantContext.displayName} (${tenantContext.slug})`
    : "no tenant context";

  const modulesLabel = tenantContext
    ? tenantContext.enabledModules.join(", ") || "none"
    : "unknown";

  return [
    {
      path: "/",
      component: createPage(
        "Storefront Shell",
        `${runtimeConfig.appTitle} — Tenant: ${tenantLabel}. Modules: ${modulesLabel}. Auth: ${describeAuthViewerState(authViewerState)}.`
      )
    },
    {
      path: "/status",
      component: createPage(
        "Runtime Status",
        `App: ${runtimeConfig.appId}. Tenant: ${tenantLabel}. Template: ${tenantContext?.templateKey ?? "none"}.`
      )
    }
  ];
}

function describeAuthViewerState(authViewerState: AuthViewerState): string {
  return `${authViewerState.status} (${authViewerState.sessionScope ?? "unknown"} scope)`;
}
