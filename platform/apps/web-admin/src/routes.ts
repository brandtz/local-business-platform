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
import { CatalogCategoriesPage } from "./pages/catalog-categories-page";
import { CatalogProductsPage } from "./pages/catalog-products-page";
import { CatalogServicesPage } from "./pages/catalog-services-page";
import { ContentLocationsPage } from "./pages/content-locations-page";
import { ContentPagesPage } from "./pages/content-pages-page";
import { ContentAnnouncementsPage } from "./pages/content-announcements-page";
import { OrdersPage } from "./pages/orders-page";
import { OrderDetailPage } from "./pages/order-detail-page";
import { BookingsCalendarPage } from "./pages/bookings-calendar-page";
import { BookingDetailPage } from "./pages/booking-detail-page";
import { CustomersPage } from "./pages/customers-page";
import { StaffPage } from "./pages/staff-page";
import { LoyaltyPage } from "./pages/loyalty-page";
import { AnalyticsPage } from "./pages/analytics-page";

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
                  authDescription: `authenticated (${authViewerState.sessionScope ?? "unknown"} scope)`,
                }
              : {
                  requiresAuth: true,
                  authDescription: `authenticated (${authViewerState.sessionScope ?? "unknown"} scope)`,
                },
            component: AdminDashboardPage,
          }
        : {
            redirect: homeRouteAccess === "auth-required" ? "/auth-required" : "/access-denied"
          })
    },

    // ── Catalog ──────────────────────────────────────────────────────────
    {
      path: "/catalog",
      redirect: "/catalog/categories",
      meta: { requiresAuth: true },
    },
    {
      path: "/catalog/categories",
      component: CatalogCategoriesPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/catalog/products",
      component: CatalogProductsPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/catalog/services",
      component: CatalogServicesPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/catalog/new",
      component: CatalogProductsPage,
      meta: { requiresAuth: true },
    },

    // ── Ordering ───────────────────────────────────────────────────────────
    {
      path: "/ordering",
      component: OrdersPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/ordering/:orderId",
      component: OrderDetailPage,
      meta: { requiresAuth: true },
    },

    // ── Bookings ────────────────────────────────────────────────────────────
    {
      path: "/bookings",
      component: BookingsCalendarPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/bookings/:bookingId",
      component: BookingDetailPage,
      meta: { requiresAuth: true },
    },

    // ── Content ──────────────────────────────────────────────────────────
    {
      path: "/content",
      redirect: "/content/pages",
      meta: { requiresAuth: true },
    },
    {
      path: "/content/pages",
      component: ContentPagesPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/content/announcements",
      component: ContentAnnouncementsPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/content/locations",
      component: ContentLocationsPage,
      meta: { requiresAuth: true },
    },

    // ── Operations ─────────────────────────────────────────────────────────
    {
      path: "/operations",
      redirect: "/analytics",
      meta: { requiresAuth: true },
    },

    // ── Users ────────────────────────────────────────────────────────────
    {
      path: "/users",
      redirect: "/users/customers",
      meta: { requiresAuth: true },
    },
    {
      path: "/users/customers",
      component: CustomersPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/users/staff",
      component: StaffPage,
      meta: { requiresAuth: true },
    },

    // ── Analytics ──────────────────────────────────────────────────────────
    {
      path: "/analytics",
      component: AnalyticsPage,
      meta: { requiresAuth: true },
    },

    // ── Loyalty ────────────────────────────────────────────────────────────
    {
      path: "/loyalty",
      component: LoyaltyPage,
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
      component: createPage(
        "Authentication Required",
        "Sign in with a tenant-admin session to continue."
      )
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
