import { defineComponent, h, type Component } from "vue";
import type { RouteRecordRaw } from "vue-router";

import {
	describeImpersonationIndicator,
  resolveAdminRouteAccess,
  type AuthViewerState
} from "@platform/types";

import { getAuthViewerState } from "./auth-state";
import type { WebPlatformAdminRuntimeConfig } from "./runtime-config";

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
  runtimeConfig: WebPlatformAdminRuntimeConfig,
  authViewerState: AuthViewerState = getAuthViewerState()
): RouteRecordRaw[] {
  const homeRouteAccess = resolveAdminRouteAccess(
    authViewerState,
    "platform-admin"
  );
  const impersonationIndicator = describeImpersonationIndicator(authViewerState);

  return [
    {
      path: "/",
      ...(homeRouteAccess === "allow"
        ? {
            meta: impersonationIndicator
              ? {
                  securityBanner: impersonationIndicator
                }
              : undefined,
            component: createPage(
              "Platform Shell",
              `${runtimeConfig.appTitle} is ready for cross-tenant operator workflows. Auth state: ${describeAuthViewerState(authViewerState)}.${impersonationIndicator ? ` ${impersonationIndicator}` : ""}`
            )
          }
        : {
            redirect: homeRouteAccess === "auth-required" ? "/auth-required" : "/access-denied"
          })
    },
    {
      path: "/status",
      component: createPage(
        "Runtime Status",
        `Application ${runtimeConfig.appId} bootstrapped successfully.`
      )
    },
    {
      path: "/auth-required",
      component: createPage(
        "Authentication Required",
        "Sign in with a platform-admin session to continue."
      )
    },
    {
      path: "/access-denied",
      component: createPage(
        "Access Denied",
        "This route requires a platform-admin session."
      )
    }
  ];
}

function describeAuthViewerState(authViewerState: AuthViewerState): string {
  return `${authViewerState.status} (${authViewerState.sessionScope ?? "unknown"} scope)`;
}
