import { describe, expect, it } from "vitest";

import {
  attachImpersonationToAuthViewerState,
	createAnonymousAuthViewerState,
	createAuthenticatedAuthViewerState
} from "@platform/types";

import { createRoutes } from "./routes";
import { resolveRuntimeConfig } from "./runtime-config";

describe("web admin routes", () => {
  it("defines the shell routes including login and admin pages", () => {
    const routes = createRoutes(resolveRuntimeConfig({}));

    const paths = routes.map((route) => route.path);
    expect(paths).toContain("/login");
    expect(paths).toContain("/");
    expect(paths).toContain("/settings/profile");
    expect(paths).toContain("/settings/payments");
    expect(paths).toContain("/settings/users");
    expect(paths).toContain("/settings/activity");
    expect(paths).toContain("/status");
    expect(paths).toContain("/access-denied");
  });

  it("redirects anonymous viewers to login", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      createAnonymousAuthViewerState("tenant")
    );

    const homeRoute = routes.find((r) => r.path === "/");
    expect(homeRoute).toMatchObject({
      path: "/",
      redirect: "/login"
    });
  });

  it("redirects wrong-scope viewers to access denied", () => {
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

    const homeRoute = routes.find((r) => r.path === "/");
    expect(homeRoute).toMatchObject({
      path: "/",
      redirect: "/access-denied"
    });
  });

  it("allows tenant-admin viewers into the protected root route", () => {
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
    expect(homeRoute).toBeDefined();
    expect(homeRoute!.path).toBe("/");
    expect("redirect" in homeRoute!).toBe(false);
  });

  it("exposes a visible impersonation indicator when a tenant-admin session is impersonated", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      attachImpersonationToAuthViewerState(
        createAuthenticatedAuthViewerState(
          {
            actorType: "tenant",
            displayName: "Tenant Admin",
            id: "tenant-user-1"
          },
          "tenant"
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
        securityBanner: "Impersonation active for Alpha Fitness until 2026-03-16T21:30:00.000Z.",
        requiresAuth: true,
      },
      path: "/"
    });
  });

  it("provides a login route that does not require auth", () => {
    const routes = createRoutes(resolveRuntimeConfig({}));
    const loginRoute = routes.find((r) => r.path === "/login");
    expect(loginRoute).toBeDefined();
    expect(loginRoute!.meta).toMatchObject({ requiresAuth: false });
  });
});
