import { defineComponent, h, type Component } from "vue";
import type { RouteRecordRaw } from "vue-router";

import {
	describeImpersonationIndicator,
  resolveAdminRouteAccess,
  type AuthViewerState
} from "@platform/types";

import { getAuthViewerState } from "./auth-state";
import type { WebPlatformAdminRuntimeConfig } from "./runtime-config";
import { TenantListPage } from "./tenant-list-page";
import { TenantDetailPage } from "./tenant-detail-page";
import {
  resolveListAccessState,
  resolveDetailAccessState
} from "./tenant-dashboard";

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
    },
    ...createTenantDashboardRoutes(authViewerState)
  ];
}

function createTenantDashboardRoutes(
  authViewerState: AuthViewerState
): RouteRecordRaw[] {
  const listAccess = resolveListAccessState(authViewerState);
  const detailAccess = resolveDetailAccessState(authViewerState);

  return [
    {
      path: "/tenants",
      ...(listAccess
        ? {
            redirect:
              listAccess.kind === "auth-required"
                ? "/auth-required"
                : "/access-denied"
          }
        : {
            component: defineComponent({
              name: "TenantListRoute",
              setup() {
                return () =>
                  h(TenantListPage, {
                    viewState: { kind: "loading" }
                  });
              }
            })
          })
    },
    {
      path: "/tenants/:tenantId",
      ...(detailAccess
        ? {
            redirect:
              detailAccess.kind === "auth-required"
                ? "/auth-required"
                : "/access-denied"
          }
        : {
            component: defineComponent({
              name: "TenantDetailRoute",
              setup() {
                return () =>
                  h(TenantDetailPage, {
                    viewState: { kind: "loading" }
                  });
              }
            })
          })
    }
  ];
}

function describeAuthViewerState(authViewerState: AuthViewerState): string {
  return `${authViewerState.status} (${authViewerState.sessionScope ?? "unknown"} scope)`;
}
