import { describe, expect, it } from "vitest";

import {
  attachImpersonationToAuthViewerState,
	createAnonymousAuthViewerState,
	createAuthenticatedAuthViewerState
} from "@platform/types";

import { createRoutes } from "./routes";
import { resolveRuntimeConfig } from "./runtime-config";

describe("web platform admin routes", () => {
  it("defines the shell routes", () => {
    const routes = createRoutes(resolveRuntimeConfig({}));

    expect(routes.map((route) => route.path)).toEqual([
      "/login",
      "/",
      "/status",
      "/auth-required",
      "/access-denied",
      "/tenants",
      "/tenants/new",
      "/tenants/:tenantId",
      "/domains",
      "/config",
      "/config/modules",
      "/config/settings",
      "/config/templates",
      "/config/payments",
      "/operations",
      "/operations/logs",
      "/analytics",
      "/audit",
      "/publishing"
    ]);
  });

  it("redirects anonymous viewers to authentication-required state", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      createAnonymousAuthViewerState("platform")
    );

    const homeRoute = routes.find((r) => r.path === "/");

    expect(homeRoute).toMatchObject({
      path: "/",
      redirect: "/auth-required"
    });
  });

  it("redirects wrong-scope viewers to access denied", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      createAuthenticatedAuthViewerState(
        {
          actorType: "tenant",
          displayName: "Tenant Admin",
          id: "tenant-user-1"
        },
        "tenant"
      )
    );

    const homeRoute = routes.find((r) => r.path === "/");

    expect(homeRoute).toMatchObject({
      path: "/",
      redirect: "/access-denied"
    });
  });

  it("allows platform-admin viewers into the protected root route", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      createAuthenticatedAuthViewerState(
        {
          actorType: "platform",
          displayName: "Operator",
          id: "platform-user-1"
        },
        "platform"
      )
    );

    const homeRoute = routes.find((r) => r.path === "/")!;

    expect(homeRoute).toMatchObject({ path: "/" });
    expect("redirect" in homeRoute).toBe(false);
  });

  it("exposes a visible impersonation indicator when platform shell carries impersonation context", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      attachImpersonationToAuthViewerState(
        createAuthenticatedAuthViewerState(
          {
            actorType: "platform",
            displayName: "Operator",
            id: "platform-user-1"
          },
          "platform"
        ),
        {
          expiresAt: "2026-03-16T21:30:00.000Z",
          impersonatorUserId: "platform-user-1",
          platformRole: "support",
          sessionId: "impersonation-1",
          startedAt: "2026-03-16T21:00:00.000Z",
          targetTenantId: "tenant-1",
          targetTenantName: "Alpha Fitness"
        }
      )
    );

    const homeRoute = routes.find((r) => r.path === "/");

    expect(homeRoute).toMatchObject({
      meta: {
        securityBanner: "Impersonation active for Alpha Fitness until 2026-03-16T21:30:00.000Z."
      },
      path: "/"
    });
  });

  describe("tenant dashboard routes", () => {
    it("redirects anonymous viewers from tenant list to auth-required", () => {
      const routes = createRoutes(
        resolveRuntimeConfig({}),
        createAnonymousAuthViewerState("platform")
      );

      const tenantListRoute = routes.find((r) => r.path === "/tenants");

      expect(tenantListRoute).toMatchObject({
        redirect: "/auth-required"
      });
    });

    it("redirects non-platform viewers from tenant list to access-denied", () => {
      const routes = createRoutes(
        resolveRuntimeConfig({}),
        createAuthenticatedAuthViewerState(
          { actorType: "tenant", displayName: "Tenant Admin", id: "t-user-1" },
          "tenant"
        )
      );

      const tenantListRoute = routes.find((r) => r.path === "/tenants");

      expect(tenantListRoute).toMatchObject({
        redirect: "/access-denied"
      });
    });

    it("allows platform-admin viewers into the tenant list route", () => {
      const routes = createRoutes(
        resolveRuntimeConfig({}),
        createAuthenticatedAuthViewerState(
          { actorType: "platform", displayName: "Operator", id: "p-user-1" },
          "platform"
        )
      );

      const tenantListRoute = routes.find((r) => r.path === "/tenants");

      expect(tenantListRoute).toBeDefined();
      expect("redirect" in tenantListRoute!).toBe(false);
      expect("component" in tenantListRoute!).toBe(true);
    });

    it("redirects anonymous viewers from tenant detail to auth-required", () => {
      const routes = createRoutes(
        resolveRuntimeConfig({}),
        createAnonymousAuthViewerState("platform")
      );

      const tenantDetailRoute = routes.find((r) => r.path === "/tenants/:tenantId");

      expect(tenantDetailRoute).toMatchObject({
        redirect: "/auth-required"
      });
    });

    it("allows platform-admin viewers into the tenant detail route", () => {
      const routes = createRoutes(
        resolveRuntimeConfig({}),
        createAuthenticatedAuthViewerState(
          { actorType: "platform", displayName: "Operator", id: "p-user-1" },
          "platform"
        )
      );

      const tenantDetailRoute = routes.find((r) => r.path === "/tenants/:tenantId");

      expect(tenantDetailRoute).toBeDefined();
      expect("redirect" in tenantDetailRoute!).toBe(false);
      expect("component" in tenantDetailRoute!).toBe(true);
    });
  });
});
