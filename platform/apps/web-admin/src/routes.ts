import { defineComponent, h, type Component } from "vue";
import type { RouteRecordRaw } from "vue-router";

import {
	describeImpersonationIndicator,
  resolveAdminRouteAccess,
  type AuthViewerState
} from "@platform/types";

import { getAuthViewerState } from "./auth-state";
import type { WebAdminRuntimeConfig } from "./runtime-config";

// ── Page imports ─────────────────────────────────────────────────────────────

import { AdminDashboardPage } from "./pages/admin-dashboard-page";
import { ProfileBrandingPage } from "./pages/profile-branding-page";
import { PaymentSettingsPage } from "./pages/payment-settings-page";
import { UserManagementPage } from "./pages/user-management-page";
import { ActivityLogPage } from "./pages/activity-log-page";
import { AdminLoginPage } from "./pages/admin-login-page";

// ── Placeholder page factory ─────────────────────────────────────────────────

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
  runtimeConfig: WebAdminRuntimeConfig,
  authViewerState: AuthViewerState = getAuthViewerState()
): RouteRecordRaw[] {
  const homeRouteAccess = resolveAdminRouteAccess(authViewerState, "tenant-admin");
  const impersonationIndicator = describeImpersonationIndicator(authViewerState);

  return [
    // ── Login (no auth guard) ──────────────────────────────────────────────
    {
      path: "/login",
      component: AdminLoginPage,
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
                }
              : { requiresAuth: true },
            component: AdminDashboardPage,
          }
        : {
            redirect: homeRouteAccess === "auth-required" ? "/login" : "/access-denied"
          })
    },

    // ── Catalog (placeholder) ──────────────────────────────────────────────
    {
      path: "/catalog",
      component: createPage("Catalog", "Manage your products, services, and categories."),
      meta: { requiresAuth: true },
    },
    {
      path: "/catalog/categories",
      component: createPage("Categories", "Organize your catalog with categories."),
      meta: { requiresAuth: true },
    },
    {
      path: "/catalog/products",
      component: createPage("Products", "Manage your product listings."),
      meta: { requiresAuth: true },
    },
    {
      path: "/catalog/services",
      component: createPage("Services", "Manage your service offerings."),
      meta: { requiresAuth: true },
    },
    {
      path: "/catalog/new",
      component: createPage("New Product", "Create a new product."),
      meta: { requiresAuth: true },
    },

    // ── Ordering (placeholder) ─────────────────────────────────────────────
    {
      path: "/ordering",
      component: createPage("Orders", "Track and manage customer orders."),
      meta: { requiresAuth: true },
    },
    {
      path: "/ordering/new",
      component: createPage("New Order", "Create a new order."),
      meta: { requiresAuth: true },
    },

    // ── Bookings (placeholder) ─────────────────────────────────────────────
    {
      path: "/bookings",
      component: createPage("Bookings", "View and manage appointments."),
      meta: { requiresAuth: true },
    },

    // ── Content (placeholder) ──────────────────────────────────────────────
    {
      path: "/content",
      component: createPage("Content", "Manage storefront pages and media."),
      meta: { requiresAuth: true },
    },
    {
      path: "/content/pages",
      component: createPage("Pages", "Manage content pages."),
      meta: { requiresAuth: true },
    },
    {
      path: "/content/announcements",
      component: createPage("Announcements", "Create and manage announcements."),
      meta: { requiresAuth: true },
    },
    {
      path: "/content/locations",
      component: createPage("Locations", "Manage business locations."),
      meta: { requiresAuth: true },
    },

    // ── Operations (placeholder) ───────────────────────────────────────────
    {
      path: "/operations",
      component: createPage("Operations", "Configure hours, locations, and fulfillment."),
      meta: { requiresAuth: true },
    },

    // ── Users (placeholder) ────────────────────────────────────────────────
    {
      path: "/users",
      component: createPage("Users", "Manage customers and staff."),
      meta: { requiresAuth: true },
    },
    {
      path: "/users/customers",
      component: createPage("Customers", "Manage your customers."),
      meta: { requiresAuth: true },
    },
    {
      path: "/users/staff",
      component: createPage("Staff", "Manage your team."),
      meta: { requiresAuth: true },
    },

    // ── Analytics (placeholder) ────────────────────────────────────────────
    {
      path: "/analytics",
      component: createPage("Analytics", "Business analytics and reports."),
      meta: { requiresAuth: true },
    },

    // ── Loyalty (placeholder) ──────────────────────────────────────────────
    {
      path: "/loyalty",
      component: createPage("Loyalty", "Manage loyalty programs."),
      meta: { requiresAuth: true },
    },

    // ── Settings ───────────────────────────────────────────────────────────
    {
      path: "/settings",
      redirect: "/settings/profile",
      meta: { requiresAuth: true },
    },
    {
      path: "/settings/profile",
      component: ProfileBrandingPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/settings/payments",
      component: PaymentSettingsPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/settings/users",
      component: UserManagementPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/settings/activity",
      component: ActivityLogPage,
      meta: { requiresAuth: true },
    },

    // ── Audit ──────────────────────────────────────────────────────────────
    {
      path: "/audit",
      component: ActivityLogPage,
      meta: { requiresAuth: true },
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
      redirect: "/login",
    },
    {
      path: "/access-denied",
      component: createPage(
        "Access Denied",
        "This route requires a tenant-admin session."
      )
    }
  ];
}

function describeAuthViewerState(authViewerState: AuthViewerState): string {
  return `${authViewerState.status} (${authViewerState.sessionScope ?? "unknown"} scope)`;
}
