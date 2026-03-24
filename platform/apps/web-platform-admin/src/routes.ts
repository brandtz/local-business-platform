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

// ── Page imports ─────────────────────────────────────────────────────────────

import { PlatformLoginPage } from "./pages/platform-login-page";
import { PlatformDashboardPage } from "./pages/platform-dashboard-page";
import { PlatformTenantsPage } from "./pages/platform-tenants-page";
import { PlatformTenantDetailPage } from "./pages/platform-tenant-detail-page";
import { PlatformTenantProvisionPage } from "./pages/platform-tenant-provision-page";
import { PlatformDomainsPage } from "./pages/platform-domains-page";
import { PlatformModulesPage } from "./pages/platform-modules-page";
import { PlatformSettingsPage } from "./pages/platform-settings-page";
import { PlatformTemplatesPage } from "./pages/platform-templates-page";
import { PlatformPaymentsConfigPage } from "./pages/platform-payments-page";
import { PlatformHealthPage } from "./pages/platform-health-page";
import { PlatformLogsPage } from "./pages/platform-logs-page";
import { PlatformAnalyticsPage } from "./pages/platform-analytics-page";
import { PlatformAuditPage } from "./pages/platform-audit-page";
import { PlatformPublishingPage } from "./pages/platform-publishing-page";

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
    // ── Login (no auth guard) ──────────────────────────────────────────────
    {
      path: "/login",
      component: PlatformLoginPage,
      meta: { requiresAuth: false },
    },

    // ── Dashboard ──────────────────────────────────────────────────────────
    {
      path: "/",
      ...(homeRouteAccess === "allow"
        ? {
            meta: impersonationIndicator
              ? {
                  securityBanner: impersonationIndicator,
                  requiresAuth: true,
                  authDescription: `authenticated (${authViewerState.sessionScope ?? "unknown"} scope)`,
                }
              : {
                  requiresAuth: true,
                  authDescription: `authenticated (${authViewerState.sessionScope ?? "unknown"} scope)`,
                },
            component: PlatformDashboardPage,
          }
        : {
            redirect: homeRouteAccess === "auth-required" ? "/auth-required" : "/access-denied"
          })
    },

    // ── Status ─────────────────────────────────────────────────────────────
    {
      path: "/status",
      component: createPage(
        "Runtime Status",
        `Application ${runtimeConfig.appId} bootstrapped successfully.`
      )
    },

    // ── Auth pages ─────────────────────────────────────────────────────────
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

    // ── Tenant management ──────────────────────────────────────────────────
    ...createTenantDashboardRoutes(authViewerState),

    // ── Domains ────────────────────────────────────────────────────────────
    {
      path: "/domains",
      component: PlatformDomainsPage,
      meta: { requiresAuth: true },
    },

    // ── Configuration ──────────────────────────────────────────────────────
    {
      path: "/config",
      redirect: "/config/modules",
      meta: { requiresAuth: true },
    },
    {
      path: "/config/modules",
      component: PlatformModulesPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/config/settings",
      component: PlatformSettingsPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/config/templates",
      component: PlatformTemplatesPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/config/payments",
      component: PlatformPaymentsConfigPage,
      meta: { requiresAuth: true },
    },

    // ── Operations ─────────────────────────────────────────────────────────
    {
      path: "/operations",
      component: PlatformHealthPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/operations/logs",
      component: PlatformLogsPage,
      meta: { requiresAuth: true },
    },

    // ── Analytics ──────────────────────────────────────────────────────────
    {
      path: "/analytics",
      component: PlatformAnalyticsPage,
      meta: { requiresAuth: true },
    },

    // ── Audit Trail ────────────────────────────────────────────────────────
    {
      path: "/audit",
      component: PlatformAuditPage,
      meta: { requiresAuth: true },
    },

    // ── Publishing ─────────────────────────────────────────────────────────
    {
      path: "/publishing",
      component: PlatformPublishingPage,
      meta: { requiresAuth: true },
    },
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
            component: PlatformTenantsPage,
            meta: { requiresAuth: true },
          })
    },
    {
      path: "/tenants/new",
      ...(listAccess
        ? {
            redirect:
              listAccess.kind === "auth-required"
                ? "/auth-required"
                : "/access-denied"
          }
        : {
            component: PlatformTenantProvisionPage,
            meta: { requiresAuth: true },
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
            component: PlatformTenantDetailPage,
            meta: { requiresAuth: true },
          })
    }
  ];
}

