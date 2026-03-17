import { defineComponent, h, type Component } from "vue";
import type { RouteRecordRaw } from "vue-router";

import type { AuthViewerState } from "@platform/types";

import { getAuthViewerState } from "./auth-state";
import type { WebCustomerRuntimeConfig } from "./runtime-config";

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
  runtimeConfig: WebCustomerRuntimeConfig
): RouteRecordRaw[] {
  const authViewerState = getAuthViewerState();

  return [
    {
      path: "/",
      component: createPage(
        "Storefront Shell",
        `${runtimeConfig.appTitle} is ready for tenant-aware customer experiences. Auth state: ${describeAuthViewerState(authViewerState)}.`
      )
    },
    {
      path: "/status",
      component: createPage(
        "Runtime Status",
        `Application ${runtimeConfig.appId} bootstrapped successfully.`
      )
    }
  ];
}

function describeAuthViewerState(authViewerState: AuthViewerState): string {
  return `${authViewerState.status} (${authViewerState.sessionScope ?? "unknown"} scope)`;
}
